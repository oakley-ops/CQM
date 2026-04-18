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
  FormControlLabel,
  Grid,
  Paper,
  Radio,
  RadioGroup,
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

interface ReadingDistanceFormProps {
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

function decodeNotes(notes: string | undefined): { chipAnswer?: string; resonanceFrequencyMHz?: number } {
  if (!notes) return {};
  try {
    return JSON.parse(notes);
  } catch {
    return {};
  }
}

function encodeNotes(chipAnswer: string | null | undefined, resonanceFrequencyMHz: number | null | undefined): string {
  return JSON.stringify({ chipAnswer, resonanceFrequencyMHz });
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

const ReadingDistanceForm: React.FC<ReadingDistanceFormProps> = ({
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

  /** Single-card report → add/update one card */
  const applySingleCard = (result: SmartQcResult, pages: string[]) => {
    const piccNumber = result.piccNumber ?? (cardEntries.length + 1);
    const newCard: CardEntryData = {
      sampleCardId: 0,
      cardNumber: piccNumber,
      measurementValue: result.readingPowerV ?? undefined,
      secondaryMeasurementValue: null,
      notes: encodeNotes(result.chipAnswer, result.resonanceFrequencyMHz),
      passStatus: undefined,
      isValid: false,
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

  /** Profile Cards List → merges cards so multiple PDFs accumulate */
  const applyProfileCardsList = (result: ProfileCardsListResult, pages: string[]) => {
    const newCards: CardEntryData[] = result.cards.map(c => ({
      sampleCardId: 0,
      cardNumber: c.cardNumber,
      measurementValue: c.readingPowerV,
      secondaryMeasurementValue: null,
      notes: encodeNotes(null, c.resonanceFrequencyMHz),
      passStatus: undefined,
      isValid: false,
    }));

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

  // ── Reading Power stats ────────────────────────────────────────────────────
  const powerValues = useMemo(() =>
    cardEntries
      .map(ce => {
        const v = typeof ce.measurementValue === 'string' ? parseFloat(ce.measurementValue) : ce.measurementValue;
        return v !== undefined && v !== null && !isNaN(v as number) ? (v as number) : null;
      })
      .filter((v): v is number => v !== null),
    [cardEntries]
  );

  const stats = useMemo(() => {
    if (powerValues.length === 0) return null;
    const min = Math.min(...powerValues);
    const max = Math.max(...powerValues);
    const avg = powerValues.reduce((a, b) => a + b, 0) / powerValues.length;
    return { min: min.toFixed(3), max: max.toFixed(3), avg: avg.toFixed(3) };
  }, [powerValues]);

  return (
    <Box>
      {/* ── Title + Import button ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight="bold">
            Reading Distance — SmartQC Measurement (Unit: V)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Main measurement: Reading Power (V). Import one PDF per card tested.
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

      {/* ── Profile name banner ── */}
      {extra.profileName && (
        <Alert severity="success" icon={false} sx={{ mb: 1.5, py: 0.5 }}>
          <Typography variant="caption" fontWeight="bold">Batch import — Profile: {extra.profileName}</Typography>
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
              <TableRow sx={{ backgroundColor: 'primary.lighter' }}>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Card #</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  Reading Power
                  <br />
                  <Typography variant="caption" color="text.secondary">V</Typography>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  Resonance Freq
                  <br />
                  <Typography variant="caption" color="text.secondary">MHz</Typography>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Chip Answer</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Pass / Fail</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cardEntries.map(ce => {
                const { chipAnswer, resonanceFrequencyMHz } = decodeNotes(ce.notes);
                const powerVal = typeof ce.measurementValue === 'string' ? parseFloat(ce.measurementValue) : ce.measurementValue;

                const handlePowerChange = (raw: string) => {
                  const v = raw === '' ? undefined : parseFloat(raw);
                  onUpdateCardEntry(def.id, ce.cardNumber, { measurementValue: v });
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
                        value={powerVal ?? ''}
                        onChange={e => handlePowerChange(e.target.value)}
                        inputProps={{ step: 0.001, min: 0, style: { textAlign: 'center', width: 65 } }}
                        sx={{ width: 90 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {resonanceFrequencyMHz != null ? resonanceFrequencyMHz.toFixed(3) : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={chipAnswer ?? ''} placement="top">
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                          {truncatedChip}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <RadioGroup
                        row
                        value={ce.passStatus === undefined ? '' : ce.passStatus ? 'pass' : 'fail'}
                        onChange={e => {
                          const pass = e.target.value === 'pass';
                          onUpdateCardEntry(def.id, ce.cardNumber, { passStatus: pass, isValid: true });
                        }}
                      >
                        <FormControlLabel
                          value="pass"
                          control={<Radio color="success" size="small" />}
                          label={<Typography variant="body2" color="success.main">Pass</Typography>}
                        />
                        <FormControlLabel
                          value="fail"
                          control={<Radio color="error" size="small" />}
                          label={<Typography variant="body2" color="error.main">Fail</Typography>}
                        />
                      </RadioGroup>
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
          <Typography variant="body2" color="text.secondary">Reading Power summary:</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={`Min: ${stats.min} V`} size="small" variant="outlined" />
            <Chip label={`Max: ${stats.max} V`} size="small" variant="outlined" />
            <Chip label={`Avg: ${stats.avg} V`} size="small" variant="outlined" />
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

export default ReadingDistanceForm;
