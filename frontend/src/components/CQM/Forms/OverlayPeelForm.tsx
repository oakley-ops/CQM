import React, { useMemo, useRef, useState } from 'react';
import {
  Box,
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
  Divider,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
} from '@mui/material';
import { UploadFile as UploadIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import * as pdfjsLib from 'pdfjs-dist';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';
import { parsePeelPdf, storePdfPages, PeelPdfRow } from '../../../services/cqm/testEntryService';

// Use the same worker as the rest of the app
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface OverlayPeelFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
  sessionId?: number;
}

const THRESHOLD_EDGE = 5;     // N/cm
const THRESHOLD_CENTER = 3.5; // N/cm

interface LaminatorExtra {
  testCategory?: string;
  pdfPages?: string[];
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
}


function formatDwellTime(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  return digits;
}
type SectionType = 'Edge' | 'Center';

const FRONT_BACK_OPTIONS = ['Front', 'Back'];

function encodeNotes(sectionId: string, sectionType: SectionType, frontBack = ''): string {
  return `${sectionId}|${sectionType}|${frontBack}`;
}
function decodeNotes(notes: string | undefined): { sectionId: string; sectionType: SectionType; frontBack: string } {
  const [sectionId = '', type = 'Edge', frontBack = ''] = (notes ?? '').split('|');
  return { sectionId, sectionType: (type === 'Center' ? 'Center' : 'Edge') as SectionType, frontBack };
}
function thresholdFor(t: SectionType): number {
  return t === 'Center' ? THRESHOLD_CENTER : THRESHOLD_EDGE;
}
function calcPass(minPeel: number | undefined, t: SectionType): boolean | undefined {
  if (minPeel === undefined || isNaN(minPeel)) return undefined;
  return minPeel >= thresholdFor(t);
}

/** Render all pages of a PDF ArrayBuffer to PNG data URLs at the given scale */
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

const OverlayPeelForm: React.FC<OverlayPeelFormProps> = ({ def, entry, onUpdateEntry, onUpdateCardEntry, sessionId }) => {
  const cardEntries = entry.cardEntries ?? [];
  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
  const extra = (meta.extraData ?? {}) as LaminatorExtra;

  const updateExtra = (patch: Partial<LaminatorExtra>) => {
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, extraData: { ...extra, ...patch } } });
  };
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfPages = extra.pdfPages ?? [];
  const [graphsOpen, setGraphsOpen] = useState(pdfPages.length > 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateMeta = (patch: Partial<TestEntryMetadata>) => {
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });
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
          notes: encodeNotes(`H_${existing.length + i + 1}`, 'Edge', ''),
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
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const { sectionType } = decodeNotes(ce?.notes);
    const pass = calcPass(v, sectionType);
    onUpdateCardEntry(def.id, cardNumber, { measurementValue: v, passStatus: pass, isValid: pass !== undefined });
  };

  const handleMaxPeelChange = (cardNumber: number, raw: string) => {
    const v = raw === '' ? null : parseFloat(raw);
    onUpdateCardEntry(def.id, cardNumber, { secondaryMeasurementValue: v });
  };

  const handleSectionIdChange = (cardNumber: number, sectionId: string) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const { sectionType, frontBack } = decodeNotes(ce?.notes);
    onUpdateCardEntry(def.id, cardNumber, { notes: encodeNotes(sectionId, sectionType, frontBack) });
  };

  const handleSectionTypeChange = (cardNumber: number, sectionType: SectionType) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const { sectionId, frontBack } = decodeNotes(ce?.notes);
    const minPeel = ce?.measurementValue as number | undefined;
    onUpdateCardEntry(def.id, cardNumber, {
      notes: encodeNotes(sectionId, sectionType, frontBack),
      passStatus: calcPass(minPeel, sectionType),
    });
  };

  const handleFrontBackChange = (cardNumber: number, value: string) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const { sectionId, sectionType } = decodeNotes(ce?.notes);
    onUpdateCardEntry(def.id, cardNumber, { notes: encodeNotes(sectionId, sectionType, value) });
  };

  const handlePdfImport = async (file: File) => {
    setPdfLoading(true);
    setPdfError(null);
    try {
      // 1. Parse data from backend
      const result = await parsePeelPdf(file);
      const allRows: PeelPdfRow[] = [...result.centerRows, ...result.edgeRows];
      if (allRows.length === 0) {
        setPdfError('No peel data found in this PDF.');
        return;
      }
      const newEntries: CardEntryData[] = allRows.map((row, i) => {
        const st = row.sectionType as SectionType;
        return {
          sampleCardId: 0,
          cardNumber: i + 1,
          measurementValue: row.minPeel,
          secondaryMeasurementValue: row.maxPeel,
          notes: encodeNotes(row.sectionId, st, row.frontBack ?? ''),
          passStatus: row.minPeel >= thresholdFor(st),
          isValid: true,
        };
      });
      onUpdateEntry(def.id, { sampleCount: newEntries.length, cardEntries: newEntries });

      // 2. Render PDF pages to images client-side
      const buffer = await file.arrayBuffer();
      const pages = await renderPdfPages(buffer);
      onUpdateEntry(def.id, { specializedMetadata: { ...meta, extraData: { ...extra, pdfPages: pages } } });
      setGraphsOpen(true);

      // 3. Persist pages to backend so they appear in the final report
      if (sessionId) {
        storePdfPages(sessionId, def.id, pages).catch(() => {
          // Non-critical: graphs won't appear in the report but data is still saved
        });
      }
    } catch {
      setPdfError('Failed to parse PDF. Make sure this is a Peel Strength report.');
    } finally {
      setPdfLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const minValues = useMemo(() =>
    cardEntries
      .map(c => {
        const v = typeof c.measurementValue === 'string' ? parseFloat(c.measurementValue) : c.measurementValue;
        return v !== undefined && !isNaN(v as number) ? (v as number) : null;
      })
      .filter((v): v is number => v !== null),
    [cardEntries]
  );

  const stats = useMemo(() => {
    if (minValues.length === 0) return null;
    const min = Math.min(...minValues);
    const max = Math.max(...minValues);
    const avg = minValues.reduce((a, b) => a + b, 0) / minValues.length;
    return { min: min.toFixed(2), max: max.toFixed(2), avg: avg.toFixed(2) };
  }, [minValues]);

  const PAGE_LABELS = ['Card Center Data', 'Card Edge Data'];

  return (
    <Box>
      {/* ── Title + Import button ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight="bold">
            Solidity/Peel Strength of the Overlay — CQM 3 A, Section 9.1.20 (Unit: N/cm)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Center: pass ≥ {THRESHOLD_CENTER} N/cm &nbsp;|&nbsp; Edge (&lt;5 mm): pass ≥ {THRESHOLD_EDGE} N/cm
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
            label="# of Sections Tested" size="small" fullWidth type="number"
            value={entry.sampleCount ?? 1}
            onChange={e => handleCountChange(e.target.value)}
            inputProps={{ min: 1, max: 50 }}
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
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* ── Laminator Parameters ── */}
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

      {/* ── Per-section results table ── */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'warning.lighter' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Section ID</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Type</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Front/Back</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                Min Peel Result<br />
                <Typography variant="caption" color="text.secondary">N/cm</Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                Max Peel Result<br />
                <Typography variant="caption" color="text.secondary">N/cm</Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Pass/Fail</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cardEntries.map(ce => {
              const { sectionId, sectionType, frontBack } = decodeNotes(ce.notes);
              return (
                <TableRow key={ce.cardNumber} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                  <TableCell>
                    <TextField
                      size="small"
                      placeholder={`H_${ce.cardNumber}`}
                      value={sectionId}
                      onChange={e => handleSectionIdChange(ce.cardNumber, e.target.value)}
                      sx={{ width: 90 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <FormControl size="small">
                      <Select
                        value={sectionType}
                        onChange={e => handleSectionTypeChange(ce.cardNumber, e.target.value as SectionType)}
                        sx={{ fontSize: '0.8rem' }}
                      >
                        <MenuItem value="Edge">Edge</MenuItem>
                        <MenuItem value="Center">Center</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell align="center">
                    <Autocomplete
                      freeSolo
                      size="small"
                      options={FRONT_BACK_OPTIONS}
                      value={frontBack}
                      onInputChange={(_, val) => handleFrontBackChange(ce.cardNumber, val)}
                      sx={{ width: 110 }}
                      renderInput={params => (
                        <TextField {...params} placeholder="Front/Back" size="small" />
                      )}
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
        sx={{ mb: pdfPages.length > 0 ? 2 : 0 }}
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
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}
                >
                  {PAGE_LABELS[i] ?? `Page ${i + 1}`}
                </Typography>
                <Box
                  component="img"
                  src={url}
                  alt={PAGE_LABELS[i] ?? `Page ${i + 1}`}
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

export default OverlayPeelForm;
