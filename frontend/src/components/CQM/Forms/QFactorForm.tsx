import React, { useMemo, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, UploadFile as UploadIcon } from '@mui/icons-material';
import * as pdfjsLib from 'pdfjs-dist';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';
import { parseSmartQcPdf, storePdfPages, SmartQcResult, ProfileCardsListResult } from '../../../services/cqm/testEntryService';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/** Q-Factor pass threshold (≥ 5 = PASS) */
const MIN_Q_FACTOR = 5;

interface QFactorFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
  sessionId?: number;
}

interface SmartQcExtra {
  pdfPages?: string[];
  profileName?: string | null;
}

/** Decode notes JSON — gracefully fall back to {} on parse failure */
function decodeNotes(notes: string | undefined): { readingPowerV?: number; chipAnswer?: string } {
  if (!notes) return {};
  try {
    return JSON.parse(notes);
  } catch {
    return {};
  }
}

function encodeNotes(readingPowerV: number | undefined, chipAnswer: string | null | undefined): string {
  return JSON.stringify({ readingPowerV, chipAnswer });
}

async function renderPdfPages(buffer: ArrayBuffer, scale = 1.8): Promise<string[]> {
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdfDoc = await loadingTask.promise;
  const urls: string[] = [];
  for (let p = 1; p <= pdfDoc.numPages; p++) {
    const page = await pdfDoc.getPage(p);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    urls.push(canvas.toDataURL('image/png'));
  }
  return urls;
}

const QFactorForm: React.FC<QFactorFormProps> = ({
  def,
  entry,
  onUpdateEntry,
  onUpdateCardEntry,
  sessionId,
}) => {
  const cardEntries = entry.cardEntries ?? [];
  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
  const extra = (meta.extraData ?? {}) as SmartQcExtra;

  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfPages = extra.pdfPages ?? [];
  const [graphsOpen, setGraphsOpen] = useState(pdfPages.length > 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateMeta = (patch: Partial<TestEntryMetadata>) => {
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });
  };

  /** Apply a single-card SmartQC report — adds/updates one card entry */
  const applySingleCard = (result: SmartQcResult, pages: string[]) => {
    const piccNumber = result.piccNumber ?? (cardEntries.length + 1);
    const qFactor = result.qFactor ?? undefined;
    const passStatus = qFactor !== undefined ? qFactor >= MIN_Q_FACTOR : undefined;

    const newCard: CardEntryData = {
      sampleCardId: 0,
      cardNumber: piccNumber,
      measurementValue: qFactor,
      secondaryMeasurementValue: result.resonanceFrequencyMHz ?? null,
      notes: encodeNotes(result.readingPowerV ?? undefined, result.chipAnswer),
      passStatus,
      isValid: passStatus !== undefined,
    };

    const existing = entry.cardEntries ?? [];
    const idx = existing.findIndex(ce => ce.cardNumber === piccNumber);
    const updatedCards = idx >= 0
      ? existing.map((ce, i) => i === idx ? newCard : ce)
      : [...existing, newCard].sort((a, b) => a.cardNumber - b.cardNumber);

    onUpdateEntry(def.id, {
      sampleCount: updatedCards.length,
      cardEntries: updatedCards,
      specializedMetadata: {
        ...meta,
        extraData: { ...extra, pdfPages: [...(extra.pdfPages ?? []), ...pages] },
      },
    });

    if (pages.length > 0) setGraphsOpen(true);
  };

  /** Apply a "Profile Cards List" batch report — merges cards so multiple PDFs accumulate */
  const applyProfileCardsList = (result: ProfileCardsListResult, pages: string[]) => {
    const newCards: CardEntryData[] = result.cards.map(c => ({
      sampleCardId: 0,
      cardNumber: c.cardNumber,
      measurementValue: c.qFactor,
      secondaryMeasurementValue: c.resonanceFrequencyMHz,
      notes: encodeNotes(c.readingPowerV, null),
      passStatus: c.qFactor >= MIN_Q_FACTOR,
      isValid: true,
    }));

    // Merge: update existing card if same cardNumber, append if new
    let merged = [...(entry.cardEntries ?? [])];
    for (const nc of newCards) {
      const idx = merged.findIndex(c => c.cardNumber === nc.cardNumber);
      if (idx >= 0) merged[idx] = nc;
      else merged.push(nc);
    }
    merged = merged.sort((a, b) => a.cardNumber - b.cardNumber);

    const updatedCards = merged;

    onUpdateEntry(def.id, {
      sampleCount: updatedCards.length,
      cardEntries: updatedCards,
      specializedMetadata: {
        ...meta,
        extraData: {
          ...extra,
          profileName: result.profileName,
          pdfPages: [...(extra.pdfPages ?? []), ...pages],
        },
      },
    });

    if (pages.length > 0) setGraphsOpen(true);
  };

  const handlePdfImport = async (file: File) => {
    setPdfLoading(true);
    setPdfError(null);
    try {
      const response = await parseSmartQcPdf(file);
      const buffer = await file.arrayBuffer();
      const pages = await renderPdfPages(buffer);

      if (response.format === 'profile-cards-list') {
        applyProfileCardsList(response.data, pages);
      } else {
        applySingleCard(response.data, pages);
      }

      if (sessionId) {
        const allPages = [...(extra.pdfPages ?? []), ...pages];
        storePdfPages(sessionId, def.id, allPages).catch(() => {});
      }
    } catch {
      setPdfError('Failed to parse PDF. Make sure this is a SmartQC report.');
    } finally {
      setPdfLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Q-Factor stats ─────────────────────────────────────────────────────────
  const qValues = useMemo(() =>
    cardEntries
      .map(ce => {
        const v = typeof ce.measurementValue === 'string' ? parseFloat(ce.measurementValue) : ce.measurementValue;
        return v !== undefined && v !== null && !isNaN(v as number) ? (v as number) : null;
      })
      .filter((v): v is number => v !== null),
    [cardEntries]
  );

  const stats = useMemo(() => {
    if (qValues.length === 0) return null;
    const min = Math.min(...qValues);
    const max = Math.max(...qValues);
    const avg = qValues.reduce((a, b) => a + b, 0) / qValues.length;
    return { min: min.toFixed(1), max: max.toFixed(1), avg: avg.toFixed(1) };
  }, [qValues]);

  return (
    <Box>
      {/* ── Title + Import button ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight="bold">
            Q-Factor & Resonance Frequency — SmartQC Measurement (Unit: dimensionless / MHz)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Pass criteria: Q-Factor ≥ {MIN_Q_FACTOR}. Import one PDF per card.
          </Typography>
        </Box>
        <Box>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handlePdfImport(file);
            }}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={pdfLoading ? <CircularProgress size={14} /> : <UploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={pdfLoading}
          >
            {pdfLoading ? 'Importing…' : 'Import PDF'}
          </Button>
        </Box>
      </Box>

      {pdfError && (
        <Alert severity="error" onClose={() => setPdfError(null)} sx={{ mb: 1.5 }}>
          {pdfError}
        </Alert>
      )}

      {/* ── Profile name + card count banner ── */}
      {extra.profileName && (
        <Alert severity="success" icon={false} sx={{ mb: 1.5, py: 0.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" fontWeight="bold">Batch import — Profile: {extra.profileName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {cardEntries.length} card{cardEntries.length !== 1 ? 's' : ''} imported
            </Typography>
          </Box>
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Sampled By"
            size="small"
            fullWidth
            value={meta.sampledBy ?? ''}
            onChange={e => updateMeta({ sampledBy: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Technician"
            size="small"
            fullWidth
            value={meta.technician ?? ''}
            onChange={e => updateMeta({ technician: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Temperature (°C)"
            size="small"
            fullWidth
            type="number"
            value={meta.temperatureC ?? ''}
            onChange={e => updateMeta({ temperatureC: e.target.value })}
          />
        </Grid>
      </Grid>

      {/* ── Per-card results table ── */}
      {cardEntries.length > 0 ? (
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'error.lighter' }}>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Card #</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  Q-Factor
                  <br />
                  <Typography variant="caption" color="text.secondary">(≥ {MIN_Q_FACTOR})</Typography>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  Resonance Freq
                  <br />
                  <Typography variant="caption" color="text.secondary">MHz</Typography>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  Reading Power
                  <br />
                  <Typography variant="caption" color="text.secondary">V</Typography>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Chip Answer</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Pass / Fail</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cardEntries.map(ce => {
                const { readingPowerV, chipAnswer } = decodeNotes(ce.notes);
                const qVal = typeof ce.measurementValue === 'string' ? parseFloat(ce.measurementValue) : ce.measurementValue;
                const freqVal = typeof ce.secondaryMeasurementValue === 'string'
                  ? parseFloat(ce.secondaryMeasurementValue)
                  : ce.secondaryMeasurementValue;

                const handleQChange = (raw: string) => {
                  const v = raw === '' ? undefined : parseFloat(raw);
                  const pass = v !== undefined ? v >= MIN_Q_FACTOR : undefined;
                  onUpdateCardEntry(def.id, ce.cardNumber, {
                    measurementValue: v,
                    passStatus: pass,
                    isValid: pass !== undefined,
                  });
                };

                const handleFreqChange = (raw: string) => {
                  const v = raw === '' ? null : parseFloat(raw);
                  onUpdateCardEntry(def.id, ce.cardNumber, { secondaryMeasurementValue: v });
                };

                const handleReadingPowerChange = (raw: string) => {
                  const v = raw === '' ? undefined : parseFloat(raw);
                  onUpdateCardEntry(def.id, ce.cardNumber, {
                    notes: encodeNotes(v, chipAnswer),
                  });
                };

                const truncatedChip = chipAnswer
                  ? (chipAnswer.length > 22 ? chipAnswer.slice(0, 22) + '…' : chipAnswer)
                  : '—';

                return (
                  <TableRow key={ce.cardNumber} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="medium">
                        {ce.cardNumber}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        type="number"
                        size="small"
                        value={qVal ?? ''}
                        onChange={e => handleQChange(e.target.value)}
                        inputProps={{ step: 0.1, min: 0, style: { textAlign: 'center', width: 60 } }}
                        sx={{ width: 85 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        type="number"
                        size="small"
                        value={freqVal ?? ''}
                        onChange={e => handleFreqChange(e.target.value)}
                        inputProps={{ step: 0.001, min: 0, style: { textAlign: 'center', width: 70 } }}
                        sx={{ width: 95 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        type="number"
                        size="small"
                        value={readingPowerV ?? ''}
                        onChange={e => handleReadingPowerChange(e.target.value)}
                        inputProps={{ step: 0.001, min: 0, style: { textAlign: 'center', width: 60 } }}
                        sx={{ width: 85 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={chipAnswer ?? ''} placement="top">
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                          {truncatedChip}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      {ce.passStatus === undefined ? (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      ) : ce.passStatus ? (
                        <Chip label="PASS" color="success" size="small" sx={{ fontWeight: 'bold', minWidth: 60 }} />
                      ) : (
                        <Chip label="FAIL" color="error" size="small" sx={{ fontWeight: 'bold', minWidth: 60 }} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="info" sx={{ mb: 2 }}>
          No cards imported yet. Click "Import PDF" to load a SmartQC report for each card.
        </Alert>
      )}

      {/* ── Stats ── */}
      {stats && (
        <Box sx={{ display: 'flex', gap: 3, mb: 2, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">Q-Factor summary:</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={`Min: ${stats.min}`} size="small" variant="outlined" color={parseFloat(stats.min) >= MIN_Q_FACTOR ? 'success' : 'error'} />
            <Chip label={`Max: ${stats.max}`} size="small" variant="outlined" />
            <Chip label={`Avg: ${stats.avg}`} size="small" variant="outlined" />
          </Box>
        </Box>
      )}

      {/* ── PDF Graphs ── */}
      {pdfPages.length > 0 && (
        <Accordion
          expanded={graphsOpen}
          onChange={(_, open) => setGraphsOpen(open)}
          variant="outlined"
          sx={{ mt: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2" fontWeight="bold">
              PDF Graphs ({pdfPages.length} page{pdfPages.length !== 1 ? 's' : ''})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 1 }}>
            {pdfPages.map((url, i) => (
              <Box key={i} sx={{ mb: i < pdfPages.length - 1 ? 3 : 0 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}
                >
                  Card {i + 1}
                </Typography>
                <Box
                  component="img"
                  src={url}
                  alt={`Card ${i + 1}`}
                  sx={{
                    width: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    display: 'block',
                  }}
                />
              </Box>
            ))}
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};

export default QFactorForm;
