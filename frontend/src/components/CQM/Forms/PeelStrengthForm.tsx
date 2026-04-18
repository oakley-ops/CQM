import React, { useMemo, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
  TextField,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControlLabel,
  Radio,
  RadioGroup,
  Divider,
  Paper,
  MenuItem,
  Select,
  FormControl,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, UploadFile as UploadIcon } from '@mui/icons-material';
import * as pdfjsLib from 'pdfjs-dist';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';
import { parseLaminatePeelPdf, storePdfPages } from '../../../services/cqm/testEntryService';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

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

interface PeelStrengthFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
  sessionId?: number;
}

interface PeelStrengthExtra {
  qCardTestProcedure: string;
  imadaTestStandId: string;
  imadaTestStandCalUntil: string;
  imadaForceGaugeId: string;
  imadaForceGaugeCalUntil: string;
  forceGaugeSoftwareVersion: string;
  highResImages: 'Y' | 'N' | 'NA' | '';
  // Laminator parameters
  hotTempC?: number;
  hotTempF?: number;
  hotPressureBar?: number;
  hotDwellTime?: string;
  coldTempC?: number;
  coldTempF?: number;
  coldPressureBar?: number;
  coldDwellTime?: string;
  laminatorId?: string;
  numCycles?: number;
  overlayMaterial?: string;
  laminatorNotes?: string;
  // PDF graphs
  pdfPages?: string[];
}


function formatDwellTime(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  return digits;
}

const MIN_PEEL_FORCE = 0.35; // N/mm

const SIDE_OPTIONS = [
  'Front/Back',
  'Front Right',
  'Front Left',
  'Back Right',
  'Back Left',
];

function calcPassFail(p1: number | string | undefined, p2: number | null | undefined): boolean | undefined {
  const v1 = typeof p1 === 'string' ? parseFloat(p1) : p1;
  const v2 = typeof p2 === 'string' ? parseFloat(p2 as string) : p2;
  if (v1 === undefined || isNaN(v1 as number)) return undefined;
  if (v2 === undefined || v2 === null || isNaN(v2 as number)) return undefined;
  return (v1 as number) >= MIN_PEEL_FORCE && (v2 as number) >= MIN_PEEL_FORCE;
}

const PeelStrengthForm: React.FC<PeelStrengthFormProps> = ({ def, entry, onUpdateEntry, onUpdateCardEntry, sessionId }) => {
  const cardEntries = entry.cardEntries ?? [];
  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
  const extra = (meta.extraData ?? {}) as unknown as PeelStrengthExtra;

  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfPages = extra.pdfPages ?? [];
  const [graphsOpen, setGraphsOpen] = useState(pdfPages.length > 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateMeta = (patch: Partial<TestEntryMetadata>) => {
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });
  };

  const updateExtra = (patch: Partial<PeelStrengthExtra>) => {
    updateMeta({ extraData: { ...extra, ...patch } });
  };

  const handlePdfImport = async (file: File) => {
    setPdfLoading(true);
    setPdfError(null);
    try {
      // Parse P1/P2 values from backend
      const rows = await parseLaminatePeelPdf(file);

      // Render PDF pages client-side
      const buffer = await file.arrayBuffer();
      const pages = await renderPdfPages(buffer);

      if (rows.length === 0) {
        setPdfError('No peel strength rows detected. Check this is an Imada peel report.');
        return;
      }

      // Build card entries from parsed rows
      const newCards: CardEntryData[] = rows.map(r => ({
        sampleCardId: 0,
        cardNumber: r.cardNumber,
        measurementValue: r.p1,
        secondaryMeasurementValue: r.p2,
        notes: '',
        passStatus: r.pass,
        isValid: true,
      }));

      // Merge with existing (replace by card number, append new)
      const existing = entry.cardEntries ?? [];
      let merged = [...existing];
      for (const nc of newCards) {
        const idx = merged.findIndex(c => c.cardNumber === nc.cardNumber);
        if (idx >= 0) merged[idx] = nc;
        else merged.push(nc);
      }
      merged = merged.sort((a, b) => a.cardNumber - b.cardNumber);

      const allPages = [...pdfPages, ...pages];

      onUpdateEntry(def.id, {
        sampleCount: merged.length,
        cardEntries: merged,
        specializedMetadata: {
          ...meta,
          extraData: { ...extra, pdfPages: allPages },
        },
      });

      if (pages.length > 0) setGraphsOpen(true);

      // Persist pages to backend (non-critical)
      if (sessionId) storePdfPages(sessionId, def.id, allPages).catch(() => {});
    } catch {
      setPdfError('Failed to parse PDF. Make sure this is an Imada peel strength report.');
    } finally {
      setPdfLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
          notes: '',
          isValid: false,
        })),
      ];
    } else {
      next = existing.slice(0, n);
    }
    onUpdateEntry(def.id, { sampleCount: n, cardEntries: next });
  };

  const handleP1Change = (cardNumber: number, raw: string) => {
    const v = raw === '' ? undefined : parseFloat(raw);
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const p2 = ce?.secondaryMeasurementValue;
    const pass = calcPassFail(v, p2);
    onUpdateCardEntry(def.id, cardNumber, {
      measurementValue: v,
      passStatus: pass,
      isValid: pass !== undefined,
    });
  };

  const handleP2Change = (cardNumber: number, raw: string) => {
    const v = raw === '' ? null : parseFloat(raw);
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const p1 = ce?.measurementValue;
    const pass = calcPassFail(p1, v);
    onUpdateCardEntry(def.id, cardNumber, {
      secondaryMeasurementValue: v,
      passStatus: pass,
      isValid: pass !== undefined,
    });
  };

  const handleSideChange = (cardNumber: number, side: string) => {
    onUpdateCardEntry(def.id, cardNumber, { notes: side });
  };

  // Stats for P1 values
  const p1Values = useMemo(() => {
    return cardEntries
      .map(c => {
        const v = typeof c.measurementValue === 'string' ? parseFloat(c.measurementValue) : c.measurementValue;
        return v !== undefined && !isNaN(v) ? v : null;
      })
      .filter((v): v is number => v !== null);
  }, [cardEntries]);

  const stats = useMemo(() => {
    if (p1Values.length === 0) return null;
    const min = Math.min(...p1Values);
    const max = Math.max(...p1Values);
    const avg = p1Values.reduce((a, b) => a + b, 0) / p1Values.length;
    return { min: min.toFixed(3), max: max.toFixed(3), avg: avg.toFixed(3) };
  }, [p1Values]);

  return (
    <Box>
      {/* ── Title + Import button ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight="bold">
          Card Testing for Peel Strength — ISO 7810:2003, Section 8.8 (Unit: N/mm)
        </Typography>
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
            {pdfLoading ? 'Importing…' : 'Import Imada PDF'}
          </Button>
        </Box>
      </Box>

      {pdfError && (
        <Alert severity="error" onClose={() => setPdfError(null)} sx={{ mb: 1.5 }}>
          {pdfError}
        </Alert>
      )}

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
            label="# of Samples Tested" size="small" fullWidth
            type="number"
            value={entry.sampleCount ?? 1}
            onChange={e => handleCountChange(e.target.value)}
            inputProps={{ min: 1, max: 50 }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Q-Card Test Procedure" size="small" fullWidth
            value={extra.qCardTestProcedure ?? ''}
            onChange={e => updateExtra({ qCardTestProcedure: e.target.value })}
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
            label="Time" size="small" fullWidth type="time"
            value={meta.testTime ?? ''}
            onChange={e => updateMeta({ testTime: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Temperature (°C)" size="small" fullWidth type="number"
            value={meta.temperatureC ?? ''}
            onChange={e => updateMeta({ temperatureC: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Relative Humidity (%)" size="small" fullWidth type="number"
            value={meta.humidityPct ?? ''}
            onChange={e => updateMeta({ humidityPct: e.target.value })}
          />
        </Grid>

        {/* Imada Test Stand */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Imada Test Stand ID#" size="small" fullWidth
            value={extra.imadaTestStandId ?? ''}
            onChange={e => updateExtra({ imadaTestStandId: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Test Stand Cal. Valid Until" size="small" fullWidth type="date"
            value={extra.imadaTestStandCalUntil ?? ''}
            onChange={e => updateExtra({ imadaTestStandCalUntil: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        {/* Imada Force Gauge */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Imada Force Gauge ID#" size="small" fullWidth
            value={extra.imadaForceGaugeId ?? ''}
            onChange={e => updateExtra({ imadaForceGaugeId: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Force Gauge Cal. Valid Until" size="small" fullWidth type="date"
            value={extra.imadaForceGaugeCalUntil ?? ''}
            onChange={e => updateExtra({ imadaForceGaugeCalUntil: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Force Gauge Software Version" size="small" fullWidth
            value={extra.forceGaugeSoftwareVersion ?? ''}
            onChange={e => updateExtra({ forceGaugeSoftwareVersion: e.target.value })}
          />
        </Grid>

        {/* Checkboxes */}
        <Grid item xs={12} sm={6} md={4}>
          <Box>
            <Typography variant="caption" color="text.secondary">Samples Preconditioned</Typography>
            <RadioGroup row
              value={meta.samplePreconditioned === undefined ? '' : meta.samplePreconditioned ? 'Y' : 'N'}
              onChange={e => updateMeta({ samplePreconditioned: e.target.value === 'Y' })}
            >
              <FormControlLabel value="Y" control={<Radio size="small" />} label="Y" />
              <FormControlLabel value="N" control={<Radio size="small" />} label="N" />
            </RadioGroup>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Box>
            <Typography variant="caption" color="text.secondary">High-Resolution Images</Typography>
            <RadioGroup row
              value={extra.highResImages ?? ''}
              onChange={e => updateExtra({ highResImages: e.target.value as 'Y' | 'N' | 'NA' })}
            >
              <FormControlLabel value="Y" control={<Radio size="small" />} label="Y" />
              <FormControlLabel value="N" control={<Radio size="small" />} label="N" />
              <FormControlLabel value="NA" control={<Radio size="small" />} label="N/A" />
            </RadioGroup>
          </Box>
        </Grid>

        {/* Environmental Logger */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Environmental Logger ID#" size="small" fullWidth
            value={meta.envLoggerId ?? ''}
            onChange={e => updateMeta({ envLoggerId: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Logger Cal. Valid Until" size="small" fullWidth type="date"
            value={meta.calValidUntil ?? ''}
            onChange={e => updateMeta({ calValidUntil: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* ── Section B: Laminator Parameters ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
        Laminator Parameters
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Hot Press */}
        <Grid item xs={12} sm={4}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
            Hot Press
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12}>
              <TextField
                label="Temperature (°C)" size="small" fullWidth type="number"
                value={extra.hotTempC ?? ''}
                onChange={e => {
                  const c = e.target.value === '' ? undefined : Number(e.target.value);
                  const f = c !== undefined ? parseFloat(((c * 9) / 5 + 32).toFixed(1)) : undefined;
                  updateExtra({ hotTempC: c, hotTempF: f });
                }}
                InputProps={{
                  endAdornment: extra.hotTempF !== undefined ? (
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 0.5 }}>
                      {extra.hotTempF} °F
                    </Typography>
                  ) : null,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Pressure (bar)" size="small" fullWidth type="number"
                value={extra.hotPressureBar ?? ''}
                onChange={e => updateExtra({ hotPressureBar: e.target.value === '' ? undefined : Number(e.target.value) })}
                inputProps={{ step: 0.1, min: 0 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Dwell Time (mm:ss)" size="small" fullWidth
                placeholder="e.g. 03:30"
                value={extra.hotDwellTime ?? ''}
                onChange={e => updateExtra({ hotDwellTime: formatDwellTime(e.target.value) })}
              />
            </Grid>
          </Grid>
        </Grid>

        {/* Cold Press */}
        <Grid item xs={12} sm={4}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
            Cold Press
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12}>
              <TextField
                label="Temperature (°C)" size="small" fullWidth type="number"
                value={extra.coldTempC ?? ''}
                onChange={e => {
                  const c = e.target.value === '' ? undefined : Number(e.target.value);
                  const f = c !== undefined ? parseFloat(((c * 9) / 5 + 32).toFixed(1)) : undefined;
                  updateExtra({ coldTempC: c, coldTempF: f });
                }}
                InputProps={{
                  endAdornment: extra.coldTempF !== undefined ? (
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 0.5 }}>
                      {extra.coldTempF} °F
                    </Typography>
                  ) : null,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Pressure (bar)" size="small" fullWidth type="number"
                value={extra.coldPressureBar ?? ''}
                onChange={e => updateExtra({ coldPressureBar: e.target.value === '' ? undefined : Number(e.target.value) })}
                inputProps={{ step: 0.1, min: 0 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Dwell Time (mm:ss)" size="small" fullWidth
                placeholder="e.g. 03:30"
                value={extra.coldDwellTime ?? ''}
                onChange={e => updateExtra({ coldDwellTime: formatDwellTime(e.target.value) })}
              />
            </Grid>
          </Grid>
        </Grid>

        {/* General */}
        <Grid item xs={12} sm={4}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
            General
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12}>
              <TextField
                label="Laminator Name" size="small" fullWidth
                value={extra.laminatorId ?? ''}
                onChange={e => updateExtra({ laminatorId: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Number of Cycles" size="small" fullWidth type="number"
                value={extra.numCycles ?? ''}
                onChange={e => updateExtra({ numCycles: e.target.value === '' ? undefined : Number(e.target.value) })}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Overlay / Adhesive Material" size="small" fullWidth
                value={extra.overlayMaterial ?? ''}
                onChange={e => updateExtra({ overlayMaterial: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes" size="small" fullWidth multiline rows={2}
                value={extra.laminatorNotes ?? ''}
                onChange={e => updateExtra({ laminatorNotes: e.target.value })}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* ── Section C: Per-card measurement table ── */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'info.lighter' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Card ID#</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                P1 — Min Peel Force<br />
                <Typography variant="caption" color="text.secondary">min {MIN_PEEL_FORCE} N/mm</Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                P2 — Min Peel Force<br />
                <Typography variant="caption" color="text.secondary">min {MIN_PEEL_FORCE} N/mm</Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Side</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Pass/Fail</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cardEntries.map(ce => {
              const pass = ce.passStatus;
              return (
                <TableRow key={ce.cardNumber} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                  <TableCell sx={{ fontWeight: 'medium', whiteSpace: 'nowrap' }}>
                    Card {String(ce.cardNumber).padStart(2, '0')}
                  </TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      size="small"
                      value={ce.measurementValue ?? ''}
                      onChange={e => handleP1Change(ce.cardNumber, e.target.value)}
                      inputProps={{ step: 0.01, min: 0, style: { textAlign: 'center', width: 80 } }}
                      sx={{ width: 100 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      size="small"
                      value={ce.secondaryMeasurementValue ?? ''}
                      onChange={e => handleP2Change(ce.cardNumber, e.target.value)}
                      inputProps={{ step: 0.01, min: 0, style: { textAlign: 'center', width: 80 } }}
                      sx={{ width: 100 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={ce.notes ?? ''}
                        onChange={e => handleSideChange(ce.cardNumber, e.target.value)}
                        displayEmpty
                      >
                        <MenuItem value=""><em>Select</em></MenuItem>
                        {SIDE_OPTIONS.map(opt => (
                          <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell align="center">
                    {pass === undefined ? (
                      <Typography variant="caption" color="text.secondary">—</Typography>
                    ) : pass ? (
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

      {/* ── Section D: Summary stats (P1) ── */}
      {stats && (
        <Box sx={{ display: 'flex', gap: 3, mb: 2, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">P1 summary:</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={`Min: ${stats.min}`} size="small" variant="outlined" />
            <Chip label={`Max: ${stats.max}`} size="small" variant="outlined" />
            <Chip label={`Avg: ${stats.avg}`} size="small" variant="outlined" />
          </Box>
        </Box>
      )}

      {/* ── Section E: Footer note ── */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Expanded Uncertainty: ± 0.01 N &nbsp;(coverage factor k=2, approximate 95% confidence level)
      </Typography>

      <TextField
        label="Job Notes"
        size="small"
        fullWidth
        multiline
        rows={3}
        value={meta.jobNotes ?? ''}
        onChange={e => updateMeta({ jobNotes: e.target.value })}
      />

      {/* ── PDF Graphs ── */}
      {pdfPages.length > 0 && (
        <Accordion
          expanded={graphsOpen}
          onChange={(_, open) => setGraphsOpen(open)}
          variant="outlined"
          sx={{ mt: 2 }}
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

export default PeelStrengthForm;
