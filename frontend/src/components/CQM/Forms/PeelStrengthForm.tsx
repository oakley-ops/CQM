import React, { useMemo, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
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
  InputLabel,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, UploadFile as UploadIcon, ClearAll as ClearAllIcon } from '@mui/icons-material';
import * as pdfjsLib from 'pdfjs-dist';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';
import { parsePeelPdf, PeelPdfRow, storePdfPages, launchQCardForceGauge, getLastEntryMetadata } from '../../../services/cqm/testEntryService';

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
  jobNumber?: string;
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
  hotPressurePsi?: number;
  hotDwellTime?: string;
  coldTempC?: number;
  coldTempF?: number;
  coldPressurePsi?: number;
  coldDwellTime?: string;
  laminatorId?: string;
  overlayMaterial?: string;
  laminatorNotes?: string;
  // Ramp parameters
  rampEnabled?: boolean;
  rampHotTempC?: number;
  rampHotTempF?: number;
  rampHotPressurePsi?: number;
  rampHotDwellTime?: string;
  rampColdTempC?: number;
  rampColdTempF?: number;
  rampColdPressurePsi?: number;
  rampColdDwellTime?: string;
  // Computed totals (ramp + laminator)
  totalHotDwellTime?: string;
  totalColdDwellTime?: string;
  // Materials
  coreType?: string;
  coreVendor?: string;
  substrate?: 'PVC' | 'PET' | 'Recycle' | 'Foil' | 'Other';
  recycledPct?: number;
  coreThickness?: number;
  overlayFront?: boolean;
  overlayFrontVendor?: string;
  overlayFrontType?: string;
  overlayFrontThickness?: number;
  overlayBack?: boolean;
  overlayBackVendor?: string;
  overlayBackType?: string;
  overlayBackThickness?: number;
  // Inks
  printMethod?: 'Litho' | 'Digital' | '';
  inkTypeFront?: string;
  inkTypeBack?: string;
  inkCoated?: boolean;
  inkPostCure?: boolean;
  inkNotes?: string;
  // PDF graphs
  pdfPages?: string[];
  importedFront?: boolean;
  importedBack?: boolean;
}


function formatDwellTime(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  return digits;
}

function parseDwellSeconds(dwell: string | undefined): number {
  if (!dwell) return 0;
  const [mm, ss] = dwell.split(':').map(Number);
  return (mm || 0) * 60 + (ss || 0);
}

function formatDwellFromSeconds(total: number): string {
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

const THRESHOLD_EDGE = 5;     // N/cm
const THRESHOLD_CENTER = 3.5; // N/cm
type SectionType = 'Edge' | 'Center';
const FRONT_BACK_OPTIONS = ['Front', 'Back'];
const PAGE_LABELS = ['Card Center Data', 'Card Edge Data'];

// Fields carried over between peel tests — excludes PDF data and equipment IDs
const PERSIST_FIELDS: ReadonlyArray<keyof PeelStrengthExtra> = [
  'hotTempC', 'hotTempF', 'hotPressurePsi', 'hotDwellTime',
  'coldTempC', 'coldTempF', 'coldPressurePsi', 'coldDwellTime',
  'laminatorId', 'overlayMaterial', 'laminatorNotes',
  'rampEnabled',
  'rampHotTempC', 'rampHotTempF', 'rampHotPressurePsi', 'rampHotDwellTime',
  'rampColdTempC', 'rampColdTempF', 'rampColdPressurePsi', 'rampColdDwellTime',
  'totalHotDwellTime', 'totalColdDwellTime',
  'coreType', 'coreVendor', 'substrate', 'recycledPct', 'coreThickness',
  'overlayFront', 'overlayFrontVendor', 'overlayFrontType', 'overlayFrontThickness',
  'overlayBack', 'overlayBackVendor', 'overlayBackType', 'overlayBackThickness',
  'printMethod', 'inkTypeFront', 'inkTypeBack', 'inkCoated', 'inkPostCure', 'inkNotes',
];

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

const PeelStrengthForm: React.FC<PeelStrengthFormProps> = ({ def, entry, onUpdateEntry, onUpdateCardEntry, sessionId, jobNumber }) => {
  const cardEntries = entry.cardEntries ?? [];
  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
  const extra = (meta.extraData ?? {}) as unknown as PeelStrengthExtra;

  const [pdfLoading, setPdfLoading] = useState(false);
  const [backPdfLoading, setBackPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfPages = extra.pdfPages ?? [];
  const [graphsOpen, setGraphsOpen] = useState(pdfPages.length > 0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backFileInputRef = useRef<HTMLInputElement>(null);
  const [loadingLast, setLoadingLast] = useState(false);
  const [loadedFromDate, setLoadedFromDate] = useState<string | null>(null);

  const updateMeta = (patch: Partial<TestEntryMetadata>) => {
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });
  };

  const updateExtra = (patch: Partial<PeelStrengthExtra>) => {
    updateMeta({ extraData: { ...extra, ...patch } });
  };

  const handleLoadFromLast = async () => {
    setLoadingLast(true);
    try {
      const result = await getLastEntryMetadata(def.test_id);
      if (!result) {
        setPdfError('No previous submitted peel test found to load from.');
        return;
      }
      const storedExtra = (result.metadata.extraData ?? {}) as Partial<PeelStrengthExtra>;
      const patch: Partial<PeelStrengthExtra> = {};
      for (const k of PERSIST_FIELDS) {
        const v = (storedExtra as Record<string, unknown>)[k];
        if (v !== undefined) (patch as Record<string, unknown>)[k] = v;
      }
      updateExtra(patch);

      const metaPatch: Partial<TestEntryMetadata> = {};
      if (result.metadata.technician) metaPatch.technician = result.metadata.technician;
      if (result.metadata.temperatureC !== undefined) metaPatch.temperatureC = result.metadata.temperatureC;
      if (result.metadata.temperatureF !== undefined) metaPatch.temperatureF = result.metadata.temperatureF;
      if (result.metadata.humidityPct !== undefined) metaPatch.humidityPct = result.metadata.humidityPct;
      if (Object.keys(metaPatch).length > 0) updateMeta(metaPatch);
      setLoadedFromDate(result.sessionDate ?? result.sessionNumber ?? 'previous test');
    } catch {
      setPdfError('Failed to load previous test data. Please try again.');
    } finally {
      setLoadingLast(false);
    }
  };

  const handlePdfImport = async (file: File) => {
    setPdfLoading(true);
    setPdfError(null);
    try {
      const result = await parsePeelPdf(file);

      if (jobNumber && result.jobId && result.jobId.toUpperCase() !== jobNumber.toUpperCase()) {
        setPdfError(`Job ID mismatch: PDF says "${result.jobId}" but current job is "${jobNumber}".`);
        return;
      }

      const allRows: PeelPdfRow[] = [...result.centerRows, ...result.edgeRows];
      if (allRows.length === 0) {
        setPdfError('No peel data found in this PDF.');
        return;
      }

      const wrongSide = allRows.some(r => r.frontBack.toLowerCase() !== 'front');
      if (wrongSide) {
        setPdfError('This PDF contains Back overlay data. Use "Back Peel test PDF" to import it.');
        return;
      }

      const existingEntries = (entry.cardEntries ?? []).filter(ce => ce.isValid);
      const offset = existingEntries.length;
      const newEntries: CardEntryData[] = allRows.map((row, i) => {
        const st = row.sectionType as SectionType;
        return {
          sampleCardId: 0,
          cardNumber: offset + i + 1,
          measurementValue: row.minPeel,
          secondaryMeasurementValue: row.maxPeel,
          notes: encodeNotes(row.sectionId, st, row.frontBack ?? ''),
          passStatus: row.minPeel >= thresholdFor(st),
          isValid: true,
        };
      });
      const mergedEntries = [...existingEntries, ...newEntries];

      const buffer = await file.arrayBuffer();
      const pages = await renderPdfPages(buffer);
      const allPages = [...pdfPages, ...pages];

      onUpdateEntry(def.id, {
        sampleCount: mergedEntries.length,
        cardEntries: mergedEntries,
        specializedMetadata: { ...meta, extraData: { ...extra, pdfPages: allPages, importedFront: true } },
      });

      if (pages.length > 0) setGraphsOpen(true);
      if (sessionId) storePdfPages(sessionId, def.id, allPages).catch(() => {});
    } catch {
      setPdfError('Failed to parse PDF. Make sure this is a peel strength report.');
    } finally {
      setPdfLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBackPdfImport = async (file: File) => {
    setBackPdfLoading(true);
    setPdfError(null);
    try {
      const result = await parsePeelPdf(file);

      if (jobNumber && result.jobId && result.jobId.toUpperCase() !== jobNumber.toUpperCase()) {
        setPdfError(`Job ID mismatch: PDF says "${result.jobId}" but current job is "${jobNumber}".`);
        return;
      }

      const allRows: PeelPdfRow[] = [...result.centerRows, ...result.edgeRows];
      if (allRows.length === 0) {
        setPdfError('No peel data found in this PDF.');
        return;
      }

      const wrongSide = allRows.some(r => r.frontBack.toLowerCase() !== 'back');
      if (wrongSide) {
        setPdfError('This PDF contains Front overlay data. Use "Front Peel test PDF" to import it.');
        return;
      }

      const existingEntries = (entry.cardEntries ?? []).filter(ce => ce.isValid);
      const offset = existingEntries.length;
      const newEntries: CardEntryData[] = allRows.map((row, i) => {
        const st = row.sectionType as SectionType;
        return {
          sampleCardId: 0,
          cardNumber: offset + i + 1,
          measurementValue: row.minPeel,
          secondaryMeasurementValue: row.maxPeel,
          notes: encodeNotes(row.sectionId, st, row.frontBack ?? ''),
          passStatus: row.minPeel >= thresholdFor(st),
          isValid: true,
        };
      });
      const mergedEntries = [...existingEntries, ...newEntries];

      const buffer = await file.arrayBuffer();
      const pages = await renderPdfPages(buffer);
      const allPages = [...pdfPages, ...pages];

      onUpdateEntry(def.id, {
        sampleCount: mergedEntries.length,
        cardEntries: mergedEntries,
        specializedMetadata: { ...meta, extraData: { ...extra, pdfPages: allPages, importedBack: true } },
      });

      if (pages.length > 0) setGraphsOpen(true);
      if (sessionId) storePdfPages(sessionId, def.id, allPages).catch(() => {});
    } catch {
      setPdfError('Failed to parse PDF. Make sure this is a peel strength report.');
    } finally {
      setBackPdfLoading(false);
      if (backFileInputRef.current) backFileInputRef.current.value = '';
    }
  };

  const handleClearPdf = () => {
    onUpdateEntry(def.id, {
      sampleCount: 1,
      cardEntries: [{
        sampleCardId: 0,
        cardNumber: 1,
        passStatus: undefined,
        measurementValue: undefined,
        secondaryMeasurementValue: null,
        notes: encodeNotes('H_1', 'Edge', ''),
        isValid: false,
      }],
      specializedMetadata: { ...meta, extraData: { ...extra, pdfPages: [], importedFront: false, importedBack: false } },
    });
    setGraphsOpen(false);
    setPdfError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (backFileInputRef.current) backFileInputRef.current.value = '';
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

  return (
    <Box>
      {/* ── Title + Import button ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight="bold">
            Peel Strength (Laminate Adhesion) — CQM 3 A, Section 9.1.20 (Unit: N/cm)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Center: pass ≥ {THRESHOLD_CENTER} N/cm &nbsp;|&nbsp; Edge (&lt;5 mm): pass ≥ {THRESHOLD_EDGE} N/cm
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleLoadFromLast}
            disabled={loadingLast}
            startIcon={loadingLast ? <CircularProgress size={14} /> : undefined}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Load from last test
          </Button>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box component="img" src="/qcardforce-icon.png" alt="QCard" sx={{ width: 120, height: 48, objectFit: 'contain', mb: 0.5 }} />
            <Button variant="outlined" size="small" onClick={() => launchQCardForceGauge()}>
              Launch QCardForceGauge
            </Button>
          </Box>
        </Box>
      </Box>

      {loadedFromDate && (
        <Alert
          severity="info"
          onClose={() => setLoadedFromDate(null)}
          sx={{ mb: 1.5 }}
        >
          Loaded laminator and material settings from {loadedFromDate} — verify before recording measurements.
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
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
            label="Temperature (°F)" size="small" fullWidth type="number"
            value={meta.temperatureF ?? ''}
            onChange={e => updateMeta({ temperatureF: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Relative Humidity (%)" size="small" fullWidth type="number"
            value={meta.humidityPct ?? ''}
            onChange={e => updateMeta({ humidityPct: e.target.value })}
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

      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* ── Section B2: Ramp Parameters ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={extra.rampEnabled ?? false}
              onChange={e => updateExtra({ rampEnabled: e.target.checked })}
              size="small"
            />
          }
          label={<Typography variant="subtitle2" fontWeight="bold">Ramp Test</Typography>}
        />
      </Box>

      {extra.rampEnabled && (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {/* Ramp — Hot Press */}
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
                Hot Press
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12}>
                  <TextField
                    label="Temperature (°C)" size="small" fullWidth type="number"
                    value={extra.rampHotTempC ?? ''}
                    onChange={e => {
                      const c = e.target.value === '' ? undefined : Number(e.target.value);
                      const f = c !== undefined ? parseFloat(((c * 9) / 5 + 32).toFixed(1)) : undefined;
                      updateExtra({ rampHotTempC: c, rampHotTempF: f });
                    }}
                    InputProps={{
                      endAdornment: extra.rampHotTempF !== undefined ? (
                        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 0.5 }}>
                          {extra.rampHotTempF} °F
                        </Typography>
                      ) : null,
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Pressure (PSI)" size="small" fullWidth type="number"
                    value={extra.rampHotPressurePsi ?? ''}
                    onChange={e => updateExtra({ rampHotPressurePsi: e.target.value === '' ? undefined : Number(e.target.value) })}
                    inputProps={{ step: 0.1, min: 0 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Dwell Time (mm:ss)" size="small" fullWidth
                    placeholder="e.g. 03:30"
                    value={extra.rampHotDwellTime ?? ''}
                    onChange={e => {
                      const v = formatDwellTime(e.target.value);
                      const total = parseDwellSeconds(v) + parseDwellSeconds(extra.hotDwellTime);
                      updateExtra({ rampHotDwellTime: v, totalHotDwellTime: formatDwellFromSeconds(total) });
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Ramp — Cold Press */}
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
                Cold Press
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12}>
                  <TextField
                    label="Temperature (°C)" size="small" fullWidth type="number"
                    value={extra.rampColdTempC ?? ''}
                    onChange={e => {
                      const c = e.target.value === '' ? undefined : Number(e.target.value);
                      const f = c !== undefined ? parseFloat(((c * 9) / 5 + 32).toFixed(1)) : undefined;
                      updateExtra({ rampColdTempC: c, rampColdTempF: f });
                    }}
                    InputProps={{
                      endAdornment: extra.rampColdTempF !== undefined ? (
                        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 0.5 }}>
                          {extra.rampColdTempF} °F
                        </Typography>
                      ) : null,
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Pressure (PSI)" size="small" fullWidth type="number"
                    value={extra.rampColdPressurePsi ?? ''}
                    onChange={e => updateExtra({ rampColdPressurePsi: e.target.value === '' ? undefined : Number(e.target.value) })}
                    inputProps={{ step: 0.1, min: 0 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Dwell Time (mm:ss)" size="small" fullWidth
                    placeholder="e.g. 03:30"
                    value={extra.rampColdDwellTime ?? ''}
                    onChange={e => {
                      const v = formatDwellTime(e.target.value);
                      const total = parseDwellSeconds(v) + parseDwellSeconds(extra.coldDwellTime);
                      updateExtra({ rampColdDwellTime: v, totalColdDwellTime: formatDwellFromSeconds(total) });
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </>
      )}

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
                label="Pressure (PSI)" size="small" fullWidth type="number"
                value={extra.hotPressurePsi ?? ''}
                onChange={e => updateExtra({ hotPressurePsi: e.target.value === '' ? undefined : Number(e.target.value) })}
                inputProps={{ step: 0.1, min: 0 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Dwell Time (mm:ss)" size="small" fullWidth
                placeholder="e.g. 03:30"
                value={extra.hotDwellTime ?? ''}
                onChange={e => {
                  const v = formatDwellTime(e.target.value);
                  const total = parseDwellSeconds(extra.rampHotDwellTime) + parseDwellSeconds(v);
                  updateExtra({ hotDwellTime: v, totalHotDwellTime: formatDwellFromSeconds(total) });
                }}
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
                label="Pressure (PSI)" size="small" fullWidth type="number"
                value={extra.coldPressurePsi ?? ''}
                onChange={e => updateExtra({ coldPressurePsi: e.target.value === '' ? undefined : Number(e.target.value) })}
                inputProps={{ step: 0.1, min: 0 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Dwell Time (mm:ss)" size="small" fullWidth
                placeholder="e.g. 03:30"
                value={extra.coldDwellTime ?? ''}
                onChange={e => {
                  const v = formatDwellTime(e.target.value);
                  const total = parseDwellSeconds(extra.rampColdDwellTime) + parseDwellSeconds(v);
                  updateExtra({ coldDwellTime: v, totalColdDwellTime: formatDwellFromSeconds(total) });
                }}
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
              <FormControl size="small" fullWidth>
                <InputLabel id="laminator-id-label">Laminator Name</InputLabel>
                <Select
                  labelId="laminator-id-label"
                  label="Laminator Name"
                  value={extra.laminatorId ?? ''}
                  onChange={e => updateExtra({ laminatorId: e.target.value })}
                >
                  <MenuItem value=""><em>Select</em></MenuItem>
                  <MenuItem value="Oasys 1">Oasys Laminator 1</MenuItem>
                  <MenuItem value="Oasys 2">Oasys Laminator 2</MenuItem>
                  <MenuItem value="Burkle">Burkle Laminator</MenuItem>
                </Select>
              </FormControl>
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

      {extra.rampEnabled && (extra.totalHotDwellTime || extra.totalColdDwellTime) && (
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', mt: 1, mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="body2" fontWeight="bold" color="text.secondary">
            Total Dwell (Ramp + Laminator):
          </Typography>
          {extra.totalHotDwellTime && (
            <Chip label={`Hot: ${extra.totalHotDwellTime}`} size="small" color="warning" variant="outlined" />
          )}
          {extra.totalColdDwellTime && (
            <Chip label={`Cold: ${extra.totalColdDwellTime}`} size="small" color="info" variant="outlined" />
          )}
        </Box>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* ── Section C: Materials ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
        Materials
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Core */}
        <Grid item xs={12} sm={4}>
          <FormControl size="small" fullWidth>
            <InputLabel id="core-vendor-label">Core Vendor</InputLabel>
            <Select
              labelId="core-vendor-label"
              label="Core Vendor"
              value={extra.coreVendor ?? ''}
              onChange={e => updateExtra({ coreVendor: e.target.value })}
            >
              <MenuItem value=""><em>Select</em></MenuItem>
              <MenuItem value="Apollo">Apollo</MenuItem>
              <MenuItem value="Bai Jia">Bai Jia</MenuItem>
              <MenuItem value="Boyuan">Boyuan</MenuItem>
              <MenuItem value="CFC">CFC</MenuItem>
              <MenuItem value="Evergreen">Evergreen</MenuItem>
              <MenuItem value="INEOS">INEOS</MenuItem>
              <MenuItem value="Kappus">Kappus</MenuItem>
              <MenuItem value="Klockner">Klockner</MenuItem>
              <MenuItem value="Nan Ya">Nan Ya</MenuItem>
              <MenuItem value="Plami">Plami</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Substrate */}
        <Grid item xs={12} sm={4}>
          <FormControl size="small" fullWidth>
            <InputLabel id="substrate-label">Substrate</InputLabel>
            <Select
              labelId="substrate-label"
              label="Substrate"
              value={extra.substrate ?? ''}
              onChange={e => updateExtra({ substrate: e.target.value as PeelStrengthExtra['substrate'], recycledPct: e.target.value !== 'Recycle' ? undefined : extra.recycledPct })}
            >
              <MenuItem value=""><em>Select</em></MenuItem>
              <MenuItem value="PVC">PVC</MenuItem>
              <MenuItem value="PET">PET</MenuItem>
              <MenuItem value="Recycle">Recycle</MenuItem>
              <MenuItem value="Foil">Foil</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        {extra.substrate === 'Recycle' && (
          <Grid item xs={12} sm={4}>
            <TextField
              label="% Recycled Material" size="small" fullWidth type="number"
              value={extra.recycledPct ?? ''}
              onChange={e => updateExtra({ recycledPct: e.target.value === '' ? undefined : Number(e.target.value) })}
              inputProps={{ min: 0, max: 100, step: 1 }}
              InputProps={{ endAdornment: <Typography variant="caption" color="text.secondary">%</Typography> }}
            />
          </Grid>
        )}

        <Grid item xs={12} sm={4}>
          <TextField
            label="Core Thickness" size="small" fullWidth type="number"
            value={extra.coreThickness ?? ''}
            onChange={e => updateExtra({ coreThickness: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
            inputProps={{ step: 0.1, min: 0 }}
            InputProps={{ endAdornment: <Typography variant="caption" color="text.secondary">mil</Typography> }}
          />
        </Grid>

        {/* Overlay */}
        <Grid item xs={12}>
          <Divider textAlign="left">
            <Typography variant="caption" color="text.secondary" fontWeight="bold">Overlay</Typography>
          </Divider>
        </Grid>

        {/* Overlay — Front */}
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={extra.overlayFront ?? false}
                onChange={e => updateExtra({ overlayFront: e.target.checked })}
              />
            }
            label={<Typography variant="body2" fontWeight="bold">Front</Typography>}
          />
        </Grid>
        {extra.overlayFront && (
          <>
            <Grid item xs={12} sm={4}>
              <FormControl size="small" fullWidth>
                <InputLabel id="front-overlay-vendor-label">Front Overlay Vendor</InputLabel>
                <Select
                  labelId="front-overlay-vendor-label"
                  label="Front Overlay Vendor"
                  value={extra.overlayFrontVendor ?? ''}
                  onChange={e => updateExtra({ overlayFrontVendor: e.target.value })}
                >
                  <MenuItem value=""><em>Select</em></MenuItem>
                  <MenuItem value="Apollo">Apollo</MenuItem>
                  <MenuItem value="Bai Jia">Bai Jia</MenuItem>
                  <MenuItem value="Boyuan">Boyuan</MenuItem>
                  <MenuItem value="CFC">CFC</MenuItem>
                  <MenuItem value="Evergreen">Evergreen</MenuItem>
                  <MenuItem value="INEOS">INEOS</MenuItem>
                  <MenuItem value="Kappus">Kappus</MenuItem>
                  <MenuItem value="Klockner">Klockner</MenuItem>
                  <MenuItem value="Nan Ya">Nan Ya</MenuItem>
                  <MenuItem value="Plami">Plami</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Front Overlay Type" size="small" fullWidth
                value={extra.overlayFrontType ?? ''}
                onChange={e => updateExtra({ overlayFrontType: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl size="small" fullWidth>
                <InputLabel id="front-overlay-thickness-label">Front Overlay Thickness</InputLabel>
                <Select
                  labelId="front-overlay-thickness-label"
                  label="Front Overlay Thickness"
                  value={extra.overlayFrontThickness ?? ''}
                  onChange={e => updateExtra({ overlayFrontThickness: e.target.value === '' ? undefined : Number(e.target.value) })}
                >
                  <MenuItem value=""><em>Select</em></MenuItem>
                  <MenuItem value={2}>2 mil</MenuItem>
                  <MenuItem value={3}>3 mil</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </>
        )}

        {/* Overlay — Back */}
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={extra.overlayBack ?? false}
                onChange={e => updateExtra({ overlayBack: e.target.checked })}
              />
            }
            label={<Typography variant="body2" fontWeight="bold">Back</Typography>}
          />
        </Grid>
        {extra.overlayBack && (
          <>
            <Grid item xs={12} sm={4}>
              <FormControl size="small" fullWidth>
                <InputLabel id="back-overlay-vendor-label">Back Overlay Vendor</InputLabel>
                <Select
                  labelId="back-overlay-vendor-label"
                  label="Back Overlay Vendor"
                  value={extra.overlayBackVendor ?? ''}
                  onChange={e => updateExtra({ overlayBackVendor: e.target.value })}
                >
                  <MenuItem value=""><em>Select</em></MenuItem>
                  <MenuItem value="Apollo">Apollo</MenuItem>
                  <MenuItem value="Bai Jia">Bai Jia</MenuItem>
                  <MenuItem value="Boyuan">Boyuan</MenuItem>
                  <MenuItem value="CFC">CFC</MenuItem>
                  <MenuItem value="Evergreen">Evergreen</MenuItem>
                  <MenuItem value="INEOS">INEOS</MenuItem>
                  <MenuItem value="Kappus">Kappus</MenuItem>
                  <MenuItem value="Klockner">Klockner</MenuItem>
                  <MenuItem value="Nan Ya">Nan Ya</MenuItem>
                  <MenuItem value="Plami">Plami</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Back Overlay Type" size="small" fullWidth
                value={extra.overlayBackType ?? ''}
                onChange={e => updateExtra({ overlayBackType: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl size="small" fullWidth>
                <InputLabel id="back-overlay-thickness-label">Back Overlay Thickness</InputLabel>
                <Select
                  labelId="back-overlay-thickness-label"
                  label="Back Overlay Thickness"
                  value={extra.overlayBackThickness ?? ''}
                  onChange={e => updateExtra({ overlayBackThickness: e.target.value === '' ? undefined : Number(e.target.value) })}
                >
                  <MenuItem value=""><em>Select</em></MenuItem>
                  <MenuItem value={2}>2 mil</MenuItem>
                  <MenuItem value={3}>3 mil</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </>
        )}
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* ── Section D: Inks ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
        Inks
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}>
          <FormControl size="small" fullWidth>
            <InputLabel id="print-method-label">Print Method</InputLabel>
            <Select
              labelId="print-method-label"
              label="Print Method"
              value={extra.printMethod ?? ''}
              onChange={e => {
                const method = e.target.value as PeelStrengthExtra['printMethod'];
                const inkPatch = method === 'Digital'
                  ? { inkTypeFront: 'Digital Inks', inkTypeBack: 'Digital Inks' }
                  : { inkTypeFront: '', inkTypeBack: '' };
                updateExtra({ printMethod: method, ...inkPatch });
              }}
            >
              <MenuItem value=""><em>Select</em></MenuItem>
              <MenuItem value="Litho">Litho</MenuItem>
              <MenuItem value="Digital">Digital</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Ink Type — Front" size="small" fullWidth
            value={extra.inkTypeFront ?? ''}
            onChange={e => updateExtra({ inkTypeFront: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Ink Type — Back" size="small" fullWidth
            value={extra.inkTypeBack ?? ''}
            onChange={e => updateExtra({ inkTypeBack: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={extra.inkCoated ?? false}
                onChange={e => updateExtra({ inkCoated: e.target.checked })}
              />
            }
            label="Coated"
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={extra.inkPostCure ?? false}
                onChange={e => updateExtra({ inkPostCure: e.target.checked })}
              />
            }
            label="Post Cure"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Ink Notes" size="small" fullWidth multiline rows={2}
            value={extra.inkNotes ?? ''}
            onChange={e => updateExtra({ inkNotes: e.target.value })}
          />
        </Grid>
        <Grid item xs={12}>
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
            disabled={pdfLoading || extra.importedFront}
            title={extra.importedFront ? 'Front PDF already imported — clear to re-import' : undefined}
          >
            {pdfLoading ? 'Importing…' : 'Front Peel test PDF'}
          </Button>
          <input
            ref={backFileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleBackPdfImport(file);
            }}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={backPdfLoading ? <CircularProgress size={14} /> : <UploadIcon />}
            onClick={() => backFileInputRef.current?.click()}
            disabled={backPdfLoading || extra.importedBack}
            title={extra.importedBack ? 'Back PDF already imported — clear to re-import' : undefined}
          >
            {backPdfLoading ? 'Importing…' : 'Back Peel test PDF'}
          </Button>
          {(pdfPages.length > 0 || cardEntries.some(c => c.isValid)) && (
            <Button
              variant="outlined"
              size="small"
              color="error"
              startIcon={<ClearAllIcon />}
              onClick={handleClearPdf}
              sx={{ ml: 1 }}
            >
              Clear PDF & Data
            </Button>
          )}
          {pdfError && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1 }}>
              <Typography variant="caption" color="error" sx={{ lineHeight: 1.4 }}>
                {pdfError}
              </Typography>
              <Typography
                variant="caption"
                color="error"
                sx={{ cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}
                onClick={() => setPdfError(null)}
              >
                ✕
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* ── Section E: Per-section measurement table ── */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'warning.lighter' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Section ID</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Type</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Front/Back</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                Min Peel<br />
                <Typography variant="caption" color="text.secondary">N/cm</Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                Max Peel<br />
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
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
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

export default PeelStrengthForm;
