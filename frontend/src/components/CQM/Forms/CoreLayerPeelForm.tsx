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
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, UploadFile as UploadIcon } from '@mui/icons-material';
import * as pdfjsLib from 'pdfjs-dist';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';
import { launchQCardForceGauge, storePdfPages } from '../../../services/cqm/testEntryService';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface CoreLayerPeelFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
  sessionId?: number;
}

const THRESHOLD_EDGE = 5;            // N/cm — section ≤3 mm from edge
const THRESHOLD_INTERIOR = 3.5;      // N/cm — section >3 mm from edge
const THRESHOLD_WEAK_MIN = 2;        // N/cm — minimum allowed in a weak area
const WEAK_AREA_MAX_LENGTH = 10;     // mm  — max permitted weak area length

type ZoneType = 'Edge' | 'Interior';
type TestMode = 'standard' | 'corner-delamination';

interface CoreLayerExtra {
  testMode?: TestMode;
  pdfPages?: string[];
}

// notes encoding: sectionId|zone|stripDir|corner|cardRef
function encodeNotes(sectionId: string, zone: ZoneType, stripDir = '', corner = '', cardRef = ''): string {
  return [sectionId, zone, stripDir, corner, cardRef].join('|');
}
function decodeNotes(notes?: string): { sectionId: string; zone: ZoneType; stripDir: string; corner: string; cardRef: string } {
  const [sectionId = '', zone = 'Interior', stripDir = '', corner = '', cardRef = ''] = (notes ?? '').split('|');
  return { sectionId, zone: zone === 'Edge' ? 'Edge' : 'Interior', stripDir, corner, cardRef };
}

function calcPass(minPeel: number | undefined, zone: ZoneType, weakLength?: number | null): boolean | undefined {
  if (minPeel === undefined || isNaN(minPeel)) return undefined;
  if (zone === 'Edge') return minPeel >= THRESHOLD_EDGE;
  if (minPeel >= THRESHOLD_INTERIOR) return true;
  // Weak area rule: length ≤ 10 mm and adhesion ≥ 2 N/cm
  if (minPeel >= THRESHOLD_WEAK_MIN && weakLength !== undefined && weakLength !== null && weakLength <= WEAK_AREA_MAX_LENGTH) return true;
  return false;
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

const CoreLayerPeelForm: React.FC<CoreLayerPeelFormProps> = ({ def, entry, onUpdateEntry, onUpdateCardEntry, sessionId }) => {
  const cardEntries = entry.cardEntries ?? [];
  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
  const extra = (meta.extraData ?? {}) as CoreLayerExtra;
  const testMode: TestMode = extra.testMode ?? 'standard';

  const updateMeta = (patch: Partial<TestEntryMetadata>) =>
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });

  const updateExtra = (patch: Partial<CoreLayerExtra>) =>
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, extraData: { ...extra, ...patch } } });

  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfPages = extra.pdfPages ?? [];
  const [graphsOpen, setGraphsOpen] = useState(pdfPages.length > 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleModeChange = (_: React.MouseEvent<HTMLElement>, val: TestMode | null) => {
    if (!val) return;
    updateExtra({ testMode: val });
    onUpdateEntry(def.id, { cardEntries: [], sampleCount: 0 });
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
          notes: encodeNotes(`S_${existing.length + i + 1}`, 'Interior'),
          isValid: false,
        })),
      ];
    } else {
      next = existing.slice(0, n);
    }
    onUpdateEntry(def.id, { sampleCount: n, cardEntries: next });
  };

  const addCornerStrip = () => {
    const n = cardEntries.length + 1;
    const newRow: CardEntryData = {
      sampleCardId: 0,
      cardNumber: n,
      passStatus: undefined,
      measurementValue: undefined,
      secondaryMeasurementValue: null,
      notes: encodeNotes(`Strip_${n}`, 'Interior', 'H', 'TL', '1'),
      isValid: false,
    };
    onUpdateEntry(def.id, { cardEntries: [...cardEntries, newRow], sampleCount: n });
  };

  const removeLastRow = () => {
    if (cardEntries.length === 0) return;
    const next = cardEntries.slice(0, -1);
    onUpdateEntry(def.id, { cardEntries: next, sampleCount: next.length });
  };

  const handleMinPeelChange = (cardNumber: number, raw: string) => {
    const v = raw === '' ? undefined : parseFloat(raw);
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const { zone } = decodeNotes(ce?.notes);
    const weakLength = ce?.secondaryMeasurementValue as number | null;
    const pass = calcPass(v, zone, weakLength);
    onUpdateCardEntry(def.id, cardNumber, { measurementValue: v, passStatus: pass, isValid: pass !== undefined });
  };

  const handleWeakLengthChange = (cardNumber: number, raw: string) => {
    const v = raw === '' ? null : parseFloat(raw);
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const { zone } = decodeNotes(ce?.notes);
    const minPeel = typeof ce?.measurementValue === 'string' ? parseFloat(ce.measurementValue) : ce?.measurementValue as number | undefined;
    const pass = calcPass(minPeel, zone, v);
    onUpdateCardEntry(def.id, cardNumber, { secondaryMeasurementValue: v, passStatus: pass, isValid: pass !== undefined });
  };

  const handleZoneChange = (cardNumber: number, zone: ZoneType) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const { sectionId, stripDir, corner, cardRef } = decodeNotes(ce?.notes);
    const minPeel = typeof ce?.measurementValue === 'string' ? parseFloat(ce.measurementValue) : ce?.measurementValue as number | undefined;
    const weakLength = ce?.secondaryMeasurementValue as number | null;
    const pass = calcPass(minPeel, zone, weakLength);
    onUpdateCardEntry(def.id, cardNumber, { notes: encodeNotes(sectionId, zone, stripDir, corner, cardRef), passStatus: pass });
  };

  const handleSectionIdChange = (cardNumber: number, sectionId: string) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const { zone, stripDir, corner, cardRef } = decodeNotes(ce?.notes);
    onUpdateCardEntry(def.id, cardNumber, { notes: encodeNotes(sectionId, zone, stripDir, corner, cardRef) });
  };

  const handleStripDirChange = (cardNumber: number, stripDir: string) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const { sectionId, zone, corner, cardRef } = decodeNotes(ce?.notes);
    onUpdateCardEntry(def.id, cardNumber, { notes: encodeNotes(sectionId, zone, stripDir, corner, cardRef) });
  };

  const handleCornerChange = (cardNumber: number, corner: string) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const { sectionId, zone, stripDir, cardRef } = decodeNotes(ce?.notes);
    onUpdateCardEntry(def.id, cardNumber, { notes: encodeNotes(sectionId, zone, stripDir, corner, cardRef) });
  };

  const handleCardRefChange = (cardNumber: number, cardRef: string) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const { sectionId, zone, stripDir, corner } = decodeNotes(ce?.notes);
    onUpdateCardEntry(def.id, cardNumber, { notes: encodeNotes(sectionId, zone, stripDir, corner, cardRef) });
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

  const showWeakLength = (ce: CardEntryData): boolean => {
    const { zone } = decodeNotes(ce.notes);
    const v = typeof ce.measurementValue === 'string' ? parseFloat(ce.measurementValue) : ce.measurementValue as number | undefined;
    return zone === 'Interior' && v !== undefined && !isNaN(v) && v < THRESHOLD_INTERIOR;
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

  const passFailChip = (passStatus: boolean | undefined) => {
    if (passStatus === undefined) return <Typography variant="caption" color="text.secondary">—</Typography>;
    return passStatus
      ? <Chip label="PASS" color="success" size="small" sx={{ fontWeight: 'bold', minWidth: 60 }} />
      : <Chip label="FAIL" color="error" size="small" sx={{ fontWeight: 'bold', minWidth: 60 }} />;
  };

  return (
    <Box>
      {/* ── Title + buttons ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight="bold">
            Solidity — Peel Strength between Core Layers — Test Method #8240# (Unit: N/cm)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Edge (≤3 mm from edge): pass ≥ {THRESHOLD_EDGE} N/cm &nbsp;|&nbsp;
            Interior (&gt;3 mm): pass ≥ {THRESHOLD_INTERIOR} N/cm &nbsp;|&nbsp;
            Weak area: ≥ {THRESHOLD_WEAK_MIN} N/cm &amp; length ≤ {WEAK_AREA_MAX_LENGTH} mm
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

      {/* ── Test mode toggle ── */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          Test Mode
        </Typography>
        <ToggleButtonGroup size="small" exclusive value={testMode} onChange={handleModeChange}>
          <ToggleButton value="standard">Standard (Qualification / Monitoring)</ToggleButton>
          <ToggleButton value="corner-delamination">Corner Delamination Follow-up (#8170#)</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {testMode === 'corner-delamination' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Corner delamination follow-up: test 5 cards using horizontal (H) and vertical (V) strips adjacent to the delaminated corner(s) identified in test #8170#.
        </Alert>
      )}

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
        {testMode === 'standard' && (
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="# of Sections" size="small" fullWidth type="number"
              value={entry.sampleCount ?? 1}
              onChange={e => handleCountChange(e.target.value)}
              inputProps={{ min: 1, max: 50 }}
            />
          </Grid>
        )}
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* ── Standard mode table ── */}
      {testMode === 'standard' && (
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#e8f5e9' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Section ID</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Zone</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  Min Peel<br />
                  <Typography variant="caption" color="text.secondary">N/cm</Typography>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  Weak Area Length<br />
                  <Typography variant="caption" color="text.secondary">mm (if &lt;{THRESHOLD_INTERIOR} N/cm)</Typography>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Pass/Fail</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cardEntries.map(ce => {
                const { sectionId, zone } = decodeNotes(ce.notes);
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
                    <TableCell align="center">
                      <FormControl size="small">
                        <Select
                          value={zone}
                          onChange={e => handleZoneChange(ce.cardNumber, e.target.value as ZoneType)}
                          sx={{ fontSize: '0.8rem' }}
                        >
                          <MenuItem value="Edge">Edge (≤3 mm)</MenuItem>
                          <MenuItem value="Interior">Interior (&gt;3 mm)</MenuItem>
                        </Select>
                      </FormControl>
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
                      {showWeakLength(ce) ? (
                        <TextField
                          type="number" size="small"
                          placeholder="mm"
                          value={ce.secondaryMeasurementValue ?? ''}
                          onChange={e => handleWeakLengthChange(ce.cardNumber, e.target.value)}
                          inputProps={{ step: 0.1, min: 0, style: { textAlign: 'center', width: 70 } }}
                          sx={{ width: 95 }}
                          error={ce.secondaryMeasurementValue !== null && (ce.secondaryMeasurementValue as number) > WEAK_AREA_MAX_LENGTH}
                          helperText={ce.secondaryMeasurementValue !== null && (ce.secondaryMeasurementValue as number) > WEAK_AREA_MAX_LENGTH ? `Exceeds ${WEAK_AREA_MAX_LENGTH} mm` : ''}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">N/A</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">{passFailChip(ce.passStatus)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Corner delamination mode table ── */}
      {testMode === 'corner-delamination' && (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 1.5 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#fff8e1' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Card #</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Corner</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Strip</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Zone</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                    Min Peel<br />
                    <Typography variant="caption" color="text.secondary">N/cm</Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                    Weak Area<br />
                    <Typography variant="caption" color="text.secondary">mm</Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Pass/Fail</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cardEntries.map(ce => {
                  const { zone, stripDir, corner, cardRef } = decodeNotes(ce.notes);
                  return (
                    <TableRow key={ce.cardNumber} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                      <TableCell>
                        <FormControl size="small">
                          <Select
                            value={cardRef || '1'}
                            onChange={e => handleCardRefChange(ce.cardNumber, e.target.value)}
                            sx={{ fontSize: '0.8rem', width: 65 }}
                          >
                            {['1', '2', '3', '4', '5'].map(n => (
                              <MenuItem key={n} value={n}>{n}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell align="center">
                        <FormControl size="small">
                          <Select
                            value={corner || 'TL'}
                            onChange={e => handleCornerChange(ce.cardNumber, e.target.value)}
                            sx={{ fontSize: '0.8rem' }}
                          >
                            <MenuItem value="TL">TL</MenuItem>
                            <MenuItem value="TR">TR</MenuItem>
                            <MenuItem value="BL">BL</MenuItem>
                            <MenuItem value="BR">BR</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell align="center">
                        <FormControl size="small">
                          <Select
                            value={stripDir || 'H'}
                            onChange={e => handleStripDirChange(ce.cardNumber, e.target.value)}
                            sx={{ fontSize: '0.8rem', width: 65 }}
                          >
                            <MenuItem value="H">H</MenuItem>
                            <MenuItem value="V">V</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell align="center">
                        <FormControl size="small">
                          <Select
                            value={zone}
                            onChange={e => handleZoneChange(ce.cardNumber, e.target.value as ZoneType)}
                            sx={{ fontSize: '0.8rem' }}
                          >
                            <MenuItem value="Edge">Edge</MenuItem>
                            <MenuItem value="Interior">Interior</MenuItem>
                          </Select>
                        </FormControl>
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
                        {showWeakLength(ce) ? (
                          <TextField
                            type="number" size="small"
                            placeholder="mm"
                            value={ce.secondaryMeasurementValue ?? ''}
                            onChange={e => handleWeakLengthChange(ce.cardNumber, e.target.value)}
                            inputProps={{ step: 0.1, min: 0, style: { textAlign: 'center', width: 70 } }}
                            sx={{ width: 95 }}
                            error={ce.secondaryMeasurementValue !== null && (ce.secondaryMeasurementValue as number) > WEAK_AREA_MAX_LENGTH}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">N/A</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">{passFailChip(ce.passStatus)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button size="small" variant="outlined" onClick={addCornerStrip}>+ Add Strip</Button>
            {cardEntries.length > 0 && (
              <Button size="small" variant="outlined" color="error" onClick={removeLastRow}>Remove Last</Button>
            )}
          </Box>
        </>
      )}

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

export default CoreLayerPeelForm;
