import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, UploadFile as UploadIcon } from '@mui/icons-material';
import * as pdfjsLib from 'pdfjs-dist';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';
import { storePdfPages } from '../../../services/cqm/testEntryService';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface ResistanceImpactFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
  sessionId?: number;
}

const IMPACT_WEIGHT_N = 18;   // N — fixed per spec

// Drop height in cm for a given energy (Nm): h = E / W
function dropHeightCm(energyNm: number): string {
  return ((energyNm / IMPACT_WEIGHT_N) * 100).toFixed(1);
}

type EnergyLevel = '2' | '10';
type ObsValue = '0' | '1';   // '0' = none/absent, '1' = present
type LocationType = 'Center' | 'Embossing';
type TestMode = 'standard' | 'alternative';

interface ImpactExtra {
  testMode?: TestMode;
  pdfPages?: string[];
}

// notes: sampleId|energyNm|cracks|splinters|brokenParts|location
function encodeNotes(
  sampleId: string,
  energyNm: EnergyLevel,
  cracks: ObsValue,
  splinters: ObsValue,
  brokenParts: ObsValue,
  location: LocationType,
): string {
  return [sampleId, energyNm, cracks, splinters, brokenParts, location].join('|');
}

function decodeNotes(notes?: string): {
  sampleId: string;
  energyNm: EnergyLevel;
  cracks: ObsValue;
  splinters: ObsValue;
  brokenParts: ObsValue;
  location: LocationType;
} {
  const [sampleId = '', energyNm = '2', cracks = '0', splinters = '0', brokenParts = '0', location = 'Center'] = (notes ?? '').split('|');
  return {
    sampleId,
    energyNm: (energyNm === '10' ? '10' : '2') as EnergyLevel,
    cracks: (cracks === '1' ? '1' : '0') as ObsValue,
    splinters: (splinters === '1' ? '1' : '0') as ObsValue,
    brokenParts: (brokenParts === '1' ? '1' : '0') as ObsValue,
    location: (location === 'Embossing' ? 'Embossing' : 'Center') as LocationType,
  };
}

function calcPass(energyNm: EnergyLevel, cracks: ObsValue, splinters: ObsValue, brokenParts: ObsValue): boolean {
  if (energyNm === '2') return cracks === '0' && splinters === '0';
  return splinters === '0' && brokenParts === '0';
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

const ObsSelect: React.FC<{ value: ObsValue; onChange: (v: ObsValue) => void }> = ({ value, onChange }) => (
  <FormControl size="small">
    <Select
      value={value}
      onChange={e => onChange(e.target.value as ObsValue)}
      sx={{ fontSize: '0.8rem', minWidth: 80 }}
      renderValue={v => (
        <Chip
          label={v === '0' ? 'None' : 'Present'}
          color={v === '0' ? 'success' : 'error'}
          size="small"
          sx={{ fontWeight: 'bold', height: 22 }}
        />
      )}
    >
      <MenuItem value="0">None</MenuItem>
      <MenuItem value="1">Present</MenuItem>
    </Select>
  </FormControl>
);

const ResistanceImpactForm: React.FC<ResistanceImpactFormProps> = ({ def, entry, onUpdateEntry, onUpdateCardEntry, sessionId }) => {
  const cardEntries = entry.cardEntries ?? [];
  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
  const extra = (meta.extraData ?? {}) as ImpactExtra;
  const testMode: TestMode = extra.testMode ?? 'standard';

  const updateMeta = (patch: Partial<TestEntryMetadata>) =>
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });

  const updateExtra = (patch: Partial<ImpactExtra>) =>
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, extraData: { ...extra, ...patch } } });

  // Initialize pass/fail for any cards that don't have it yet (e.g. the initial blank card)
  useEffect(() => {
    const needsInit = cardEntries.some(c => c.passStatus === undefined);
    if (!needsInit) return;
    const initialized = cardEntries.map(c => {
      if (c.passStatus !== undefined) return c;
      const { energyNm, cracks, splinters, brokenParts } = decodeNotes(c.notes);
      return { ...c, passStatus: calcPass(energyNm, cracks, splinters, brokenParts), isValid: true };
    });
    onUpdateEntry(def.id, { cardEntries: initialized, sampleCount: initialized.length });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfPages = extra.pdfPages ?? [];
  const [graphsOpen, setGraphsOpen] = useState(pdfPages.length > 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleModeChange = (_: React.MouseEvent<HTMLElement>, val: TestMode | null) => {
    if (!val) return;
    updateExtra({ testMode: val });
  };

  const handleCountChange = (raw: string, forEnergy: EnergyLevel) => {
    const n = Math.max(1, parseInt(raw) || 1);
    const existing = cardEntries.filter(c => decodeNotes(c.notes).energyNm === forEnergy);
    const other = cardEntries.filter(c => decodeNotes(c.notes).energyNm !== forEnergy);

    let energyRows: CardEntryData[];
    if (n > existing.length) {
      energyRows = [
        ...existing,
        ...Array.from({ length: n - existing.length }, (_, i) => ({
          sampleCardId: 0,
          cardNumber: 0,
          passStatus: calcPass(forEnergy, '0', '0', '0'),
          measurementValue: undefined,
          secondaryMeasurementValue: null,
          notes: encodeNotes(`S_${existing.length + i + 1}`, forEnergy, '0', '0', '0', 'Center'),
          isValid: true,
        })),
      ];
    } else {
      energyRows = existing.slice(0, n);
    }

    const combined = [...other, ...energyRows].map((c, i) => ({ ...c, cardNumber: i + 1 }));
    onUpdateEntry(def.id, { cardEntries: combined, sampleCount: combined.length });
  };

  const updateObs = (cardNumber: number, field: 'cracks' | 'splinters' | 'brokenParts', value: ObsValue) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const decoded = decodeNotes(ce?.notes);
    const next = { ...decoded, [field]: value };
    const pass = calcPass(next.energyNm, next.cracks, next.splinters, next.brokenParts);
    onUpdateCardEntry(def.id, cardNumber, {
      notes: encodeNotes(next.sampleId, next.energyNm, next.cracks, next.splinters, next.brokenParts, next.location),
      passStatus: pass,
      isValid: true,
    });
  };

  const updateLocation = (cardNumber: number, location: LocationType) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const { sampleId, energyNm, cracks, splinters, brokenParts } = decodeNotes(ce?.notes);
    onUpdateCardEntry(def.id, cardNumber, { notes: encodeNotes(sampleId, energyNm, cracks, splinters, brokenParts, location) });
  };

  const updateSampleId = (cardNumber: number, sampleId: string) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const { energyNm, cracks, splinters, brokenParts, location } = decodeNotes(ce?.notes);
    onUpdateCardEntry(def.id, cardNumber, { notes: encodeNotes(sampleId, energyNm, cracks, splinters, brokenParts, location) });
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

  const rows2Nm = cardEntries.filter(c => decodeNotes(c.notes).energyNm === '2');
  const rows10Nm = cardEntries.filter(c => decodeNotes(c.notes).energyNm === '10');

  const renderTable = (rows: CardEntryData[], energyNm: EnergyLevel) => (
    <TableContainer component={Paper} variant="outlined" sx={{ mb: 1 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: energyNm === '2' ? '#e8f5e9' : '#fff3e0' }}>
            <TableCell sx={{ fontWeight: 'bold' }}>Sample ID</TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Location</TableCell>
            {energyNm === '2' && (
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Cracks</TableCell>
            )}
            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Splinters</TableCell>
            {energyNm === '10' && (
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Parts Broken Off</TableCell>
            )}
            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Pass/Fail</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(ce => {
            const { sampleId, cracks, splinters, brokenParts, location } = decodeNotes(ce.notes);
            return (
              <TableRow key={ce.cardNumber} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                <TableCell>
                  <TextField
                    size="small"
                    placeholder={`S_${ce.cardNumber}`}
                    value={sampleId}
                    onChange={e => updateSampleId(ce.cardNumber, e.target.value)}
                    sx={{ width: 90 }}
                  />
                </TableCell>
                <TableCell align="center">
                  <FormControl size="small">
                    <Select
                      value={location}
                      onChange={e => updateLocation(ce.cardNumber, e.target.value as LocationType)}
                      sx={{ fontSize: '0.8rem' }}
                    >
                      <MenuItem value="Center">Center</MenuItem>
                      <MenuItem value="Embossing">Embossing Area</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>
                {energyNm === '2' && (
                  <TableCell align="center">
                    <ObsSelect value={cracks} onChange={v => updateObs(ce.cardNumber, 'cracks', v)} />
                  </TableCell>
                )}
                <TableCell align="center">
                  <ObsSelect value={splinters} onChange={v => updateObs(ce.cardNumber, 'splinters', v)} />
                </TableCell>
                {energyNm === '10' && (
                  <TableCell align="center">
                    <ObsSelect value={brokenParts} onChange={v => updateObs(ce.cardNumber, 'brokenParts', v)} />
                  </TableCell>
                )}
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
  );

  return (
    <Box>
      {/* ── Title + PDF import ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight="bold">
            Solidity — Resistance to Impact — Test Method #8160# [ISO7811-1]
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Impact weight: {IMPACT_WEIGHT_N} N &nbsp;|&nbsp;
            2 Nm (h ≈ {dropHeightCm(2)} cm): no cracks, no splinters &nbsp;|&nbsp;
            10 Nm (h ≈ {dropHeightCm(10)} cm): no splinters, no parts broken off
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
        </Box>
      </Box>

      {/* ── Test mode ── */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          Test Mode
        </Typography>
        <ToggleButtonGroup size="small" exclusive value={testMode} onChange={handleModeChange}>
          <ToggleButton value="standard">Standard — #8160# Impact Resistance</ToggleButton>
          <ToggleButton value="alternative">Alternative — #4026# Absence of Residual Stress (Embossing)</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Alert severity="warning" sx={{ mb: 2 }}>
        <strong>Important:</strong> ICM, signature panels, or other items applied after lamination near the impact center may influence the result. Metalized areas (e.g. antennae) inside the card <strong>can invalidate the test result</strong>.
      </Alert>

      {pdfError && (
        <Alert severity="error" onClose={() => setPdfError(null)} sx={{ mb: 1.5 }}>
          {pdfError}
        </Alert>
      )}

      {/* ── Header metadata ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
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
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* ── 2 Nm Impact Test ── */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
              2 Nm Impact Test &nbsp;
              <Chip label={`Drop height ≈ ${dropHeightCm(2)} cm`} size="small" variant="outlined" />
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Pass criteria: no cracks through material &amp; no splinters
            </Typography>
          </Box>
          <TextField
            label="# of Samples" size="small" type="number"
            value={rows2Nm.length || 1}
            onChange={e => handleCountChange(e.target.value, '2')}
            inputProps={{ min: 1, max: 50 }}
            sx={{ width: 130 }}
          />
        </Box>
        {renderTable(rows2Nm, '2')}
      </Box>

      {/* ── 10 Nm Impact Test ── */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
              10 Nm Impact Test &nbsp;
              <Chip label={`Drop height ≈ ${dropHeightCm(10)} cm`} size="small" variant="outlined" />
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Pass criteria: no splinters &amp; no parts broken off
            </Typography>
          </Box>
          <TextField
            label="# of Samples" size="small" type="number"
            value={rows10Nm.length || 1}
            onChange={e => handleCountChange(e.target.value, '10')}
            inputProps={{ min: 1, max: 50 }}
            sx={{ width: 130 }}
          />
        </Box>
        {renderTable(rows10Nm, '10')}
      </Box>

      <TextField
        label="Job Notes" size="small" fullWidth multiline rows={2}
        value={meta.jobNotes ?? ''}
        onChange={e => updateMeta({ jobNotes: e.target.value })}
        sx={{ mt: 1, mb: pdfPages.length > 0 ? 2 : 0 }}
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

export default ResistanceImpactForm;
