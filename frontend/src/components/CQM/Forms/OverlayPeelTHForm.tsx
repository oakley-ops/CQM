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
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, UploadFile as UploadIcon } from '@mui/icons-material';
import * as pdfjsLib from 'pdfjs-dist';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';
import { launchQCardForceGauge, storePdfPages } from '../../../services/cqm/testEntryService';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface OverlayPeelTHFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
  sessionId?: number;
}

// Threshold = min(ref3015 × 80%, ABSOLUTE_MAX)
const ABSOLUTE_MAX_THRESHOLD = 5;   // N/cm — upper cap
const REFERENCE_PCT = 0.8;          // 80%

// Exposure conditions per spec
const SPEC_TEMP_C = 50;
const SPEC_HUMIDITY_PCT = 93;
const SPEC_DURATION_H = 168;

interface THPeelExtra {
  ref3015Peel?: number;   // actual measured value from #3015# test (N/cm)
  exposureTempC?: number;
  exposureHumidityPct?: number;
  exposureDurationH?: number;
  pdfPages?: string[];
}

function calcThreshold(ref?: number): number | null {
  if (ref === undefined || isNaN(ref) || ref <= 0) return null;
  return Math.min(ref * REFERENCE_PCT, ABSOLUTE_MAX_THRESHOLD);
}

function calcPass(minPeel: number | undefined, threshold: number | null): boolean | undefined {
  if (minPeel === undefined || isNaN(minPeel) || threshold === null) return undefined;
  return minPeel >= threshold;
}

// notes: sectionId|frontBack
function encodeNotes(sectionId: string, frontBack = ''): string {
  return [sectionId, frontBack].join('|');
}
function decodeNotes(notes?: string): { sectionId: string; frontBack: string } {
  const [sectionId = '', frontBack = ''] = (notes ?? '').split('|');
  return { sectionId, frontBack };
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

const OverlayPeelTHForm: React.FC<OverlayPeelTHFormProps> = ({ def, entry, onUpdateEntry, onUpdateCardEntry, sessionId }) => {
  const cardEntries = entry.cardEntries ?? [];
  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
  const extra = (meta.extraData ?? {}) as THPeelExtra;

  const updateMeta = (patch: Partial<TestEntryMetadata>) =>
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });

  const updateExtra = (patch: Partial<THPeelExtra>) =>
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, extraData: { ...extra, ...patch } } });

  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfPages = extra.pdfPages ?? [];
  const [graphsOpen, setGraphsOpen] = useState(pdfPages.length > 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const threshold = calcThreshold(extra.ref3015Peel);

  const recomputePassForAll = (newRef: number | undefined) => {
    const newThreshold = calcThreshold(newRef);
    const updated = cardEntries.map(ce => {
      const v = typeof ce.measurementValue === 'string' ? parseFloat(ce.measurementValue) : ce.measurementValue as number | undefined;
      const pass = calcPass(v, newThreshold);
      return { ...ce, passStatus: pass, isValid: pass !== undefined };
    });
    onUpdateEntry(def.id, { cardEntries: updated });
  };

  const handleRef3015Change = (raw: string) => {
    const v = raw === '' ? undefined : parseFloat(raw);
    updateExtra({ ref3015Peel: v });
    recomputePassForAll(v);
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
          notes: encodeNotes(`S_${existing.length + i + 1}`),
          isValid: false,
        })),
      ];
    } else {
      next = existing.slice(0, n);
    }
    onUpdateEntry(def.id, { sampleCount: n, cardEntries: next });
  };

  const handleMinPeelChange = (cardNumber: number, raw: string) => {
    const v = raw === '' ? undefined : parseFloat(raw);
    const pass = calcPass(v, threshold);
    onUpdateCardEntry(def.id, cardNumber, { measurementValue: v, passStatus: pass, isValid: pass !== undefined });
  };

  const handleMaxPeelChange = (cardNumber: number, raw: string) => {
    const v = raw === '' ? null : parseFloat(raw);
    onUpdateCardEntry(def.id, cardNumber, { secondaryMeasurementValue: v });
  };

  const handleSectionIdChange = (cardNumber: number, sectionId: string) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const { frontBack } = decodeNotes(ce?.notes);
    onUpdateCardEntry(def.id, cardNumber, { notes: encodeNotes(sectionId, frontBack) });
  };

  const handleFrontBackChange = (cardNumber: number, frontBack: string) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const { sectionId } = decodeNotes(ce?.notes);
    onUpdateCardEntry(def.id, cardNumber, { notes: encodeNotes(sectionId, frontBack) });
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

  const minPeelValues = useMemo(() =>
    cardEntries
      .map(c => {
        const v = typeof c.measurementValue === 'string' ? parseFloat(c.measurementValue) : c.measurementValue;
        return v !== undefined && !isNaN(v as number) ? (v as number) : null;
      })
      .filter((v): v is number => v !== null),
    [cardEntries]
  );

  const stats = useMemo(() => {
    if (minPeelValues.length === 0) return null;
    const min = Math.min(...minPeelValues);
    const max = Math.max(...minPeelValues);
    const avg = minPeelValues.reduce((a, b) => a + b, 0) / minPeelValues.length;
    return { min: min.toFixed(3), max: max.toFixed(3), avg: avg.toFixed(3) };
  }, [minPeelValues]);

  return (
    <Box>
      {/* ── Title + buttons ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight="bold">
            Solidity — Peel Strength of the Overlay after T&amp;H Exposure (Unit: N/cm)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Test methods: #8092# (T&amp;H Exposure) + #8240# (Advanced Peel Strength) &nbsp;|&nbsp;
            Pass ≥ min({REFERENCE_PCT * 100}% of #3015# ref, {ABSOLUTE_MAX_THRESHOLD} N/cm)
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

      <Alert severity="warning" sx={{ mb: 2 }}>
        This test applies to cards with <strong>final artwork only</strong>. Results from blank white cards are not representative and must not be used.
      </Alert>

      {pdfError && (
        <Alert severity="error" onClose={() => setPdfError(null)} sx={{ mb: 1.5 }}>
          {pdfError}
        </Alert>
      )}

      {/* ── Reference value + threshold ── */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: '#e3f2fd' }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
          Reference from #3015# Test
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              label="Measured peel value from #3015# (N/cm)"
              size="small"
              fullWidth
              type="number"
              value={extra.ref3015Peel ?? ''}
              onChange={e => handleRef3015Change(e.target.value)}
              inputProps={{ step: 0.01, min: 0 }}
              helperText="Enter the actual result from the #3015# conformity test"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Calculated Pass Threshold
              </Typography>
              <Typography variant="h6" fontWeight="bold" color={threshold !== null ? 'success.main' : 'text.disabled'}>
                {threshold !== null ? `≥ ${threshold.toFixed(2)} N/cm` : '— enter ref value'}
              </Typography>
              {threshold !== null && (
                <Typography variant="caption" color="text.secondary">
                  min({REFERENCE_PCT * 100}% × {extra.ref3015Peel} N/cm, {ABSOLUTE_MAX_THRESHOLD} N/cm)
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* ── Exposure conditions ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
        Exposure Conditions
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Temperature (°C)" size="small" fullWidth type="number"
            value={extra.exposureTempC ?? SPEC_TEMP_C}
            onChange={e => updateExtra({ exposureTempC: e.target.value === '' ? undefined : Number(e.target.value) })}
            helperText={`Spec: ${SPEC_TEMP_C} °C`}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Relative Humidity (%)" size="small" fullWidth type="number"
            value={extra.exposureHumidityPct ?? SPEC_HUMIDITY_PCT}
            onChange={e => updateExtra({ exposureHumidityPct: e.target.value === '' ? undefined : Number(e.target.value) })}
            helperText={`Spec: ${SPEC_HUMIDITY_PCT}% r.H.`}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Duration (hours)" size="small" fullWidth type="number"
            value={extra.exposureDurationH ?? SPEC_DURATION_H}
            onChange={e => updateExtra({ exposureDurationH: e.target.value === '' ? undefined : Number(e.target.value) })}
            helperText={`Spec: ${SPEC_DURATION_H} h`}
          />
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2 }} />

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
            label="Ambient Temperature (°C)" size="small" fullWidth type="number"
            value={meta.temperatureC ?? ''}
            onChange={e => updateMeta({ temperatureC: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Ambient Humidity (%)" size="small" fullWidth type="number"
            value={meta.humidityPct ?? ''}
            onChange={e => updateMeta({ humidityPct: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="# of Sections" size="small" fullWidth type="number"
            value={entry.sampleCount ?? 1}
            onChange={e => handleCountChange(e.target.value)}
            inputProps={{ min: 1, max: 50 }}
          />
        </Grid>
      </Grid>

      {!extra.ref3015Peel && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Enter the reference value from the #3015# test above to enable pass/fail calculation.
        </Alert>
      )}

      {/* ── Per-section results table ── */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Section ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Front / Back</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                Min Peel<br />
                <Typography variant="caption" color="text.secondary">N/cm</Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                Max Peel<br />
                <Typography variant="caption" color="text.secondary">N/cm</Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                Pass/Fail
                {threshold !== null && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    (≥ {threshold.toFixed(2)} N/cm)
                  </Typography>
                )}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cardEntries.map(ce => {
              const { sectionId, frontBack } = decodeNotes(ce.notes);
              return (
                <TableRow key={ce.cardNumber} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                  <TableCell>
                    <TextField
                      size="small"
                      placeholder={`S_${ce.cardNumber}`}
                      value={sectionId}
                      onChange={e => handleSectionIdChange(ce.cardNumber, e.target.value)}
                      sx={{ width: 90 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      placeholder="Front / Back"
                      value={frontBack}
                      onChange={e => handleFrontBackChange(ce.cardNumber, e.target.value)}
                      sx={{ width: 110 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number" size="small"
                      value={ce.measurementValue ?? ''}
                      onChange={e => handleMinPeelChange(ce.cardNumber, e.target.value)}
                      inputProps={{ step: 0.01, min: 0, style: { textAlign: 'center', width: 70 } }}
                      sx={{ width: 95 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number" size="small"
                      value={ce.secondaryMeasurementValue ?? ''}
                      onChange={e => handleMaxPeelChange(ce.cardNumber, e.target.value)}
                      inputProps={{ step: 0.01, min: 0, style: { textAlign: 'center', width: 70 } }}
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
          <Typography variant="body2" color="text.secondary">Min Peel summary:</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={`Min: ${stats.min}`} size="small" variant="outlined" />
            <Chip label={`Max: ${stats.max}`} size="small" variant="outlined" />
            <Chip label={`Avg: ${stats.avg}`} size="small" variant="outlined" />
          </Box>
        </Box>
      )}

      <TextField
        label="Job Notes" size="small" fullWidth multiline rows={2}
        value={meta.jobNotes ?? ''}
        onChange={e => updateMeta({ jobNotes: e.target.value })}
        sx={{ mb: pdfPages.length > 0 ? 2 : 0, mt: 2 }}
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

export default OverlayPeelTHForm;
