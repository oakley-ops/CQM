import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, UploadFile as UploadIcon } from '@mui/icons-material';
import * as pdfjsLib from 'pdfjs-dist';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';
import { launchQCardForceGauge, storePdfPages } from '../../../services/cqm/testEntryService';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface ICMAdhesionFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
  sessionId?: number;
}

// Force threshold per spec #B220#
function calcThreshold(areaMm2: number | undefined): number | null {
  if (areaMm2 === undefined || isNaN(areaMm2) || areaMm2 <= 0) return null;
  if (areaMm2 <= 100) return 50;           // ≥ 50 N for area ≤ 100 mm²
  if (areaMm2 > 200) return 100;           // ≥ 100 N for area > 200 mm²
  return parseFloat((areaMm2 * 0.5).toFixed(2)); // ≥ 0.5 N/mm² for 100–200 mm²
}

function calcPass(forceN: number | undefined, threshold: number | null): boolean | undefined {
  if (forceN === undefined || isNaN(forceN) || threshold === null) return undefined;
  return forceN >= threshold;
}

interface ICMAdhesionExtra {
  icmAreaMm2?: number;
  numCenters?: number;
  stampId?: string;
  pdfPages?: string[];
}

// notes: sampleId|center
function encodeNotes(sampleId: string, center = ''): string {
  return [sampleId, center].join('|');
}
function decodeNotes(notes?: string): { sampleId: string; center: string } {
  const [sampleId = '', center = ''] = (notes ?? '').split('|');
  return { sampleId, center };
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

const ICMAdhesionForm: React.FC<ICMAdhesionFormProps> = ({ def, entry, onUpdateEntry, onUpdateCardEntry, sessionId }) => {
  const cardEntries = entry.cardEntries ?? [];
  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
  const extra = (meta.extraData ?? {}) as ICMAdhesionExtra;

  const updateMeta = (patch: Partial<TestEntryMetadata>) =>
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });

  const updateExtra = (patch: Partial<ICMAdhesionExtra>) =>
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, extraData: { ...extra, ...patch } } });

  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfPages = extra.pdfPages ?? [];
  const [graphsOpen, setGraphsOpen] = useState(pdfPages.length > 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const threshold = calcThreshold(extra.icmAreaMm2);

  const recomputeAll = (newArea: number | undefined) => {
    const t = calcThreshold(newArea);
    const updated = cardEntries.map(ce => {
      const v = typeof ce.measurementValue === 'string' ? parseFloat(ce.measurementValue) : ce.measurementValue as number | undefined;
      const pass = calcPass(v, t);
      return { ...ce, passStatus: pass, isValid: pass !== undefined };
    });
    onUpdateEntry(def.id, { cardEntries: updated });
  };

  const handleAreaChange = (raw: string) => {
    const v = raw === '' ? undefined : parseFloat(raw);
    updateExtra({ icmAreaMm2: v });
    recomputeAll(v);
  };

  const handleCountChange = (raw: string) => {
    const n = Math.max(1, parseInt(raw) || 1);
    const existing = entry.cardEntries ?? [];
    let next: CardEntryData[];
    if (n > existing.length) {
      next = [
        ...existing,
        ...Array.from({ length: n - existing.length }, (_, i) => ({
          sampleCardId: 0,
          cardNumber: existing.length + i + 1,
          passStatus: undefined,
          measurementValue: undefined,
          secondaryMeasurementValue: null,
          notes: encodeNotes(`S_${existing.length + i + 1}`, extra.numCenters && extra.numCenters > 1 ? 'C1' : ''),
          isValid: false,
        })),
      ];
    } else {
      next = existing.slice(0, n);
    }
    onUpdateEntry(def.id, { sampleCount: n, cardEntries: next });
  };

  const handleForceChange = (cardNumber: number, raw: string) => {
    const v = raw === '' ? undefined : parseFloat(raw);
    const pass = calcPass(v, threshold);
    onUpdateCardEntry(def.id, cardNumber, { measurementValue: v, passStatus: pass, isValid: pass !== undefined });
  };

  const handleSampleIdChange = (cardNumber: number, sampleId: string) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const { center } = decodeNotes(ce?.notes);
    onUpdateCardEntry(def.id, cardNumber, { notes: encodeNotes(sampleId, center) });
  };

  const handleCenterChange = (cardNumber: number, center: string) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const { sampleId } = decodeNotes(ce?.notes);
    onUpdateCardEntry(def.id, cardNumber, { notes: encodeNotes(sampleId, center) });
  };

  const handlePdfImport = async (file: File) => {
    setPdfLoading(true);
    setPdfError(null);
    try {
      const buffer = await file.arrayBuffer();
      const pages = await renderPdfPages(buffer);
      updateExtra({ pdfPages: pages });
      setGraphsOpen(true);
      if (sessionId) {
        storePdfPages(sessionId, def.id, pages).catch(() => {});
      }
    } catch {
      setPdfError('Failed to render PDF pages.');
    } finally {
      setPdfLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const forceValues = useMemo(() =>
    cardEntries
      .map(c => {
        const v = typeof c.measurementValue === 'string' ? parseFloat(c.measurementValue) : c.measurementValue;
        return v !== undefined && !isNaN(v as number) ? (v as number) : null;
      })
      .filter((v): v is number => v !== null),
    [cardEntries]
  );

  const stats = useMemo(() => {
    if (forceValues.length === 0) return null;
    const min = Math.min(...forceValues);
    const max = Math.max(...forceValues);
    const avg = forceValues.reduce((a, b) => a + b, 0) / forceValues.length;
    return { min: min.toFixed(1), max: max.toFixed(1), avg: avg.toFixed(1) };
  }, [forceValues]);

  const thresholdLabel = (): string => {
    const a = extra.icmAreaMm2;
    if (!a) return '—';
    if (a <= 100) return `50 N (area ≤ 100 mm²)`;
    if (a > 200) return `100 N (area > 200 mm²)`;
    return `${threshold} N (0.5 N/mm² × ${a} mm²)`;
  };

  const showCenterCol = (extra.numCenters ?? 1) > 1;

  return (
    <Box>
      {/* ── Title + buttons ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight="bold">
            Solidity — Adhesion of ICM to Card — Test Method #8230# Back of Card Spot Pressure (Unit: N)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ≤100 mm²: ≥50 N &nbsp;|&nbsp; 100–200 mm²: ≥0.5 N/mm² &nbsp;|&nbsp; &gt;200 mm²: ≥100 N &nbsp;|&nbsp; Q=8 / M=1 per setup
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfImport(f); }}
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
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box component="img" src="/qcardforce-icon.png" alt="QCard" sx={{ width: 120, height: 48, objectFit: 'contain', mb: 0.5 }} />
            <Button variant="outlined" size="small" onClick={() => launchQCardForceGauge()}>
              Launch QCardForceGauge
            </Button>
          </Box>
        </Box>
      </Box>

      {pdfError && (
        <Alert severity="error" onClose={() => setPdfError(null)} sx={{ mb: 1.5 }}>
          {pdfError}
        </Alert>
      )}

      {/* ── ICM Configuration ── */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: '#f3e5f5' }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
          ICM Configuration
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              label="ICM Area (mm²)" size="small" fullWidth type="number"
              value={extra.icmAreaMm2 ?? ''}
              onChange={e => handleAreaChange(e.target.value)}
              inputProps={{ step: 0.1, min: 0 }}
              helperText="Determines the required force threshold"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Number of ICM Centers" size="small" fullWidth type="number"
              value={extra.numCenters ?? 1}
              onChange={e => updateExtra({ numCenters: Math.max(1, parseInt(e.target.value) || 1) })}
              inputProps={{ min: 1, max: 10 }}
              helperText="Test each center separately"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Required Force Threshold
              </Typography>
              <Typography variant="h6" fontWeight="bold" color={threshold !== null ? 'success.main' : 'text.disabled'}>
                {threshold !== null ? `≥ ${threshold} N` : '— enter ICM area'}
              </Typography>
              {threshold !== null && (
                <Typography variant="caption" color="text.secondary">
                  {thresholdLabel()}
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {(extra.numCenters ?? 1) > 1 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Multi-center ICM detected: test each center separately using separate card samples per center. Record the ICM center in each row below.
        </Alert>
      )}

      {/* ── Header metadata ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Sampled By" size="small" fullWidth
            value={meta.sampledBy ?? ''}
            onChange={e => updateMeta({ sampledBy: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Technician" size="small" fullWidth
            value={meta.technician ?? ''}
            onChange={e => updateMeta({ technician: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Test Date" size="small" fullWidth type="date"
            value={meta.testDate ?? ''}
            onChange={e => updateMeta({ testDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Temperature (°C)" size="small" fullWidth type="number"
            value={meta.temperatureC ?? ''}
            onChange={e => updateMeta({ temperatureC: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Relative Humidity (%)" size="small" fullWidth type="number"
            value={meta.humidityPct ?? ''}
            onChange={e => updateMeta({ humidityPct: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Stamp / Equipment ID" size="small" fullWidth
            value={extra.stampId ?? ''}
            onChange={e => updateExtra({ stampId: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="# of Samples" size="small" fullWidth type="number"
            value={entry.sampleCount ?? 1}
            onChange={e => handleCountChange(e.target.value)}
            inputProps={{ min: 1, max: 100 }}
          />
        </Grid>
      </Grid>

      {!extra.icmAreaMm2 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Enter the ICM area above to enable pass/fail calculation.
        </Alert>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* ── Per-sample results table ── */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f3e5f5' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Sample ID</TableCell>
              {showCenterCol && (
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>ICM Center</TableCell>
              )}
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                Applied Force<br />
                <Typography variant="caption" color="text.secondary">N</Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                Pass/Fail
                {threshold !== null && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    (≥ {threshold} N)
                  </Typography>
                )}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cardEntries.map(ce => {
              const { sampleId, center } = decodeNotes(ce.notes);
              return (
                <TableRow key={ce.cardNumber} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                  <TableCell>
                    <TextField
                      size="small"
                      placeholder={`S_${ce.cardNumber}`}
                      value={sampleId}
                      onChange={e => handleSampleIdChange(ce.cardNumber, e.target.value)}
                      sx={{ width: 90 }}
                    />
                  </TableCell>
                  {showCenterCol && (
                    <TableCell align="center">
                      <TextField
                        size="small"
                        placeholder="C1"
                        value={center}
                        onChange={e => handleCenterChange(ce.cardNumber, e.target.value)}
                        sx={{ width: 80 }}
                      />
                    </TableCell>
                  )}
                  <TableCell align="center">
                    <TextField
                      type="number" size="small"
                      value={ce.measurementValue ?? ''}
                      onChange={e => handleForceChange(ce.cardNumber, e.target.value)}
                      inputProps={{ step: 0.1, min: 0, style: { textAlign: 'center', width: 70 } }}
                      sx={{ width: 95 }}
                    />
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

      {/* ── Stats ── */}
      {stats && (
        <Box sx={{ display: 'flex', gap: 3, mb: 2, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">Force summary:</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={`Min: ${stats.min} N`} size="small" variant="outlined" />
            <Chip label={`Max: ${stats.max} N`} size="small" variant="outlined" />
            <Chip label={`Avg: ${stats.avg} N`} size="small" variant="outlined" />
          </Box>
        </Box>
      )}

      <TextField
        label="Job Notes" size="small" fullWidth multiline rows={2}
        value={meta.jobNotes ?? ''}
        onChange={e => updateMeta({ jobNotes: e.target.value })}
        sx={{ mb: pdfPages.length > 0 ? 2 : 0, mt: 1 }}
      />

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
                <Box
                  component="img"
                  src={url}
                  alt={`Page ${i + 1}`}
                  sx={{ width: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 1, display: 'block' }}
                />
              </Box>
            ))}
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};

export default ICMAdhesionForm;
