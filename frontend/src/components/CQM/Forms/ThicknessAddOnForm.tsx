import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  Alert,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';
import CardDiagram from './CardDiagram';

interface ThicknessAddOnFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
}

interface ThicknessAddOnExtra {
  areaLabels?: string[];
}

interface AreaRow {
  leftMm: string;
  centerMm: string;
  rightMm: string;
}

const BASELINE_SPEC_MIN = 0.76;
const BASELINE_SPEC_MAX = 0.84;
const DELTA_MAX = 0.05;

// areas[0] is always Card Thickness (the outside baseline); areas[1+] are add-on areas
const DEFAULT_AREAS = ['Card Thickness', 'Hologram', 'Signature Panel'];
const AREA_LABELS_STORAGE_KEY_PREFIX = 'thickness-addon-area-labels';
const BLANK_AREA: AreaRow = { leftMm: '', centerMm: '', rightMm: '' };

const LCR_FIELDS = ['leftMm', 'centerMm', 'rightMm'] as const;

function encodeAreas(areas: AreaRow[]): string {
  return JSON.stringify({ areas: areas.map(a => ({ leftMm: a.leftMm, centerMm: a.centerMm, rightMm: a.rightMm })) });
}

function decodeAreas(notes?: string, count = 0): AreaRow[] {
  try {
    const parsed = JSON.parse(notes ?? '{}') as { areas?: AreaRow[]; cardThickness?: AreaRow };
    let raw = parsed.areas ?? [];
    // Migrate from previous format where cardThickness was a separate key
    if (parsed.cardThickness && (raw.length === 0 || raw[0].leftMm === undefined)) {
      raw = [parsed.cardThickness, ...raw];
    }
    const areas: AreaRow[] = raw.map(a => ({
      leftMm: (a as AreaRow).leftMm ?? '',
      centerMm: (a as AreaRow).centerMm ?? '',
      rightMm: (a as AreaRow).rightMm ?? '',
    }));
    while (areas.length < count) areas.push({ ...BLANK_AREA });
    return areas.slice(0, count);
  } catch {
    return Array.from({ length: count }, () => ({ ...BLANK_AREA }));
  }
}

// avg of the 3 outside measurements (Card Thickness area, index 0)
function computeOutsideAvg(ct: AreaRow): number | null {
  const l = parseFloat(ct.leftMm);
  const c = parseFloat(ct.centerMm);
  const r = parseFloat(ct.rightMm);
  if (isNaN(l) || isNaN(c) || isNaN(r)) return null;
  return (l + c + r) / 3;
}

function computeAreaResult(
  area: AreaRow,
  baselineMm: number | null,
): { avgInside: number; delta: number | null; areaPass: boolean | null } | null {
  const l = parseFloat(area.leftMm);
  const c = parseFloat(area.centerMm);
  const r = parseFloat(area.rightMm);
  if (isNaN(l) || isNaN(c) || isNaN(r)) return null;
  const avgInside = (l + c + r) / 3;
  if (baselineMm === null) return { avgInside, delta: null, areaPass: null };
  const delta = avgInside - baselineMm;
  return { avgInside, delta, areaPass: delta <= DELTA_MAX };
}

function advanceFocus(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const inputs = Array.from(document.querySelectorAll('input[type="number"]')) as HTMLElement[];
  const i = inputs.indexOf(e.currentTarget as HTMLElement);
  if (i >= 0 && i < inputs.length - 1) inputs[i + 1].focus();
}

// Only checks add-on areas (slice(1)) — Card Thickness at index 0 is the baseline, not tested
function computeCardStats(addOnAreas: AreaRow[], baselineMm: number | null) {
  const results = addOnAreas.map(a => computeAreaResult(a, baselineMm));
  if (results.some(r => r === null) || results.length === 0) return null;
  const complete = results as NonNullable<ReturnType<typeof computeAreaResult>>[];
  const allPass = baselineMm === null ? null : complete.every(r => r.areaPass === true) ? true : false;
  return { allPass, results: complete };
}

// Build area results for the CardDiagram:
// index 0 (Card Thickness) → spec compliance; index 1+ → delta pass/fail
function buildDiagramResults(areas: AreaRow[], avgOutside: number | null) {
  return areas.map((a, i) => {
    if (i === 0) {
      const avg = computeOutsideAvg(a);
      if (avg === null) return null;
      return { avgInside: avg, delta: null as null, areaPass: (avg >= BASELINE_SPEC_MIN && avg <= BASELINE_SPEC_MAX) as boolean | null };
    }
    return computeAreaResult(a, avgOutside);
  });
}

const ThicknessAddOnForm: React.FC<ThicknessAddOnFormProps> = ({ def, entry, onUpdateEntry, onUpdateCardEntry }) => {
  const cardEntries = entry.cardEntries ?? [];
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [selectedCardIdx, setSelectedCardIdx] = useState(0);

  useEffect(() => {
    if (cardEntries.length > 0 && selectedCardIdx >= cardEntries.length) {
      setSelectedCardIdx(cardEntries.length - 1);
    }
  }, [cardEntries.length, selectedCardIdx]);

  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
  const extra = (meta.extraData ?? {}) as ThicknessAddOnExtra;
  const areaLabelsStorageKey = `${AREA_LABELS_STORAGE_KEY_PREFIX}:${def.id}`;

  const storedAreaLabels = useMemo(() => {
    try {
      const raw = localStorage.getItem(areaLabelsStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return null;
      const labels = parsed.filter((v): v is string => typeof v === 'string').map(v => v.trim()).filter(Boolean);
      return labels.length > 0 ? labels : null;
    } catch {
      return null;
    }
  }, [areaLabelsStorageKey]);

  // Ensure Card Thickness is always at index 0
  const rawLabels = extra.areaLabels ?? storedAreaLabels ?? DEFAULT_AREAS;
  const areaLabels: string[] = rawLabels[0]?.toLowerCase() === 'card thickness'
    ? rawLabels
    : ['Card Thickness', ...rawLabels.filter(l => l.toLowerCase() !== 'card thickness')];

  const foilIdx = areaLabels.findIndex(l => l.trim().toLowerCase() === 'foil');
  const isFoil = foilIdx >= 0;

  const updateMeta = (patch: Partial<TestEntryMetadata>) =>
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });

  const updateExtra = (patch: Partial<ThicknessAddOnExtra>) =>
    updateMeta({ extraData: { ...extra, ...patch } });

  useEffect(() => {
    if (!extra.areaLabels && storedAreaLabels && storedAreaLabels.length > 0) {
      updateExtra({ areaLabels: areaLabels });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extra.areaLabels, storedAreaLabels]);

  useEffect(() => {
    try {
      localStorage.setItem(areaLabelsStorageKey, JSON.stringify(areaLabels));
    } catch {
      // Ignore storage write failures and continue with in-memory state.
    }
  }, [areaLabelsStorageKey, areaLabels]);

  const makeBlankCard = (cardNumber: number): CardEntryData => ({
    sampleCardId: 0,
    cardNumber,
    passStatus: undefined,
    measurementValue: undefined,
    notes: encodeAreas(Array.from({ length: areaLabels.length }, () => ({ ...BLANK_AREA }))),
    isValid: false,
  });

  const handleCountChange = (raw: string) => {
    const n = Math.max(1, parseInt(raw) || 1);
    const existing = entry.cardEntries ?? [];
    const next: CardEntryData[] = n > existing.length
      ? [...existing, ...Array.from({ length: n - existing.length }, (_, i) => makeBlankCard(existing.length + i + 1))]
      : existing.slice(0, n);
    onUpdateEntry(def.id, { sampleCount: n, cardEntries: next });
  };

  // Handles all area changes: areaIdx=0 is Card Thickness (baseline), areaIdx>0 are add-on areas
  const handleReadingChange = (cardNumber: number, areaIdx: number, field: typeof LCR_FIELDS[number], value: string) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const areas = decodeAreas(ce?.notes, areaLabels.length);
    areas[areaIdx] = { ...areas[areaIdx], [field]: value };
    const avgOutside = computeOutsideAvg(areas[0]);
    const stats = computeCardStats(areas.slice(1), avgOutside);
    onUpdateCardEntry(def.id, cardNumber, {
      notes: encodeAreas(areas),
      passStatus: stats?.allPass === true ? true : stats?.allPass === false ? false : undefined,
      measurementValue: undefined,
      isValid: stats !== null && stats.allPass !== null,
    });
  };

  const handleFoilToggle = (checked: boolean) => {
    if (checked === isFoil) return;
    const nextLabels = checked
      ? [...areaLabels, 'Foil']
      : areaLabels.filter((_, idx) => idx !== foilIdx);

    const updatedCards = cardEntries.map(ce => {
      const areas = decodeAreas(ce.notes, areaLabels.length);
      if (checked) {
        areas.push({ ...BLANK_AREA });
      } else if (foilIdx >= 0) {
        areas.splice(foilIdx, 1);
      }
      const avgOutside = computeOutsideAvg(areas[0]);
      const stats = computeCardStats(areas.slice(1), avgOutside);
      return {
        ...ce,
        notes: encodeAreas(areas),
        passStatus: stats?.allPass === true ? true : stats?.allPass === false ? false : undefined,
        measurementValue: undefined,
        isValid: stats !== null && stats.allPass !== null,
      };
    });

    onUpdateEntry(def.id, { cardEntries: updatedCards });
    updateExtra({ areaLabels: nextLabels });
  };

  const sessionSummary = useMemo(() => {
    const complete = cardEntries.filter(ce => ce.isValid);
    if (complete.length === 0) return null;
    const passCount = complete.filter(ce => ce.passStatus === true).length;
    return { passCount, total: complete.length };
  }, [cardEntries]);

  const maxDelta = useMemo(() => {
    let max: number | null = null;
    for (const ce of cardEntries) {
      if (!ce.isValid) continue;
      const areas = decodeAreas(ce.notes, areaLabels.length);
      const avgOutside = computeOutsideAvg(areas[0]);
      if (avgOutside === null) continue;
      for (const a of areas.slice(1)) {
        const r = computeAreaResult(a, avgOutside);
        if (r?.delta !== null && r?.delta !== undefined) {
          if (max === null || r.delta > max) max = r.delta;
        }
      }
    }
    return max;
  }, [cardEntries, areaLabels.length]);

  const clampedIdx = Math.min(selectedCardIdx, Math.max(0, cardEntries.length - 1));
  const currentCard = cardEntries[clampedIdx];
  const currentAreas = currentCard
    ? decodeAreas(currentCard.notes, areaLabels.length)
    : Array.from({ length: areaLabels.length }, () => ({ ...BLANK_AREA }));
  const currentAvgOutside = computeOutsideAvg(currentAreas[0]);
  const currentDiagramResults = buildDiagramResults(currentAreas, currentAvgOutside);

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
        Thickness within Add-on Areas — Test Method #8050# (ISO/IEC 10373-1)
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Acceptance: Δ (avg inside − avg card thickness) ≤ {DELTA_MAX} mm per Add-On Area
        &nbsp;·&nbsp; Card thickness spec: {BASELINE_SPEC_MIN}–{BASELINE_SPEC_MAX} mm
        &nbsp;·&nbsp; Q-Plan: Qualification ≥ 8 samples · Monitoring: 1 item/Set-up
      </Typography>

      {/* ── Equipment header ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Technician" size="small" fullWidth
            value={meta.technician ?? ''}
            onChange={e => updateMeta({ technician: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="# of Samples" size="small" fullWidth type="number"
            value={entry.sampleCount ?? 1}
            onChange={e => handleCountChange(e.target.value)}
            inputProps={{ min: 1, max: 50 }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Test Date" size="small" fullWidth type="date"
            value={meta.testDate ?? ''}
            onChange={e => updateMeta({ testDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Temperature (°F)" size="small" fullWidth type="number"
            value={meta.temperatureF ?? ''}
            onChange={e => updateMeta({ temperatureF: e.target.value })}
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
          <Box>
            <Typography variant="caption" color="text.secondary">Sample Preconditioned</Typography>
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

      {/* ── View mode + card nav ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => { if (v) setViewMode(v); }} size="small">
            <ToggleButton value="card" sx={{ fontSize: '0.75rem', px: 2, textTransform: 'none' }}>Card View</ToggleButton>
            <ToggleButton value="table" sx={{ fontSize: '0.75rem', px: 2, textTransform: 'none' }}>Table View</ToggleButton>
          </ToggleButtonGroup>
          <FormControlLabel
            control={<Checkbox size="small" checked={isFoil} onChange={(_, checked) => handleFoilToggle(checked)} />}
            label={<Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>FOIL</Typography>}
            sx={{ ml: 0 }}
          />
          <FormControlLabel
            control={<Checkbox size="small" checked={meta.isEmvCard ?? false} onChange={(_, checked) => updateMeta({ isEmvCard: checked })} />}
            label={<Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>EMV</Typography>}
            sx={{ ml: 0 }}
          />
        </Box>

        {viewMode === 'card' && cardEntries.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton size="small" onClick={() => setSelectedCardIdx(i => Math.max(0, i - 1))} disabled={clampedIdx === 0}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 110, justifyContent: 'center' }}>
              <Typography variant="body2" fontWeight={600}>CGC{String(currentCard.cardNumber).padStart(2, '0')}</Typography>
              <Typography variant="caption" color="text.secondary">{clampedIdx + 1} / {cardEntries.length}</Typography>
              {currentCard.passStatus === true  && <Chip label="PASS" color="success" size="small" sx={{ height: 18, fontSize: '0.62rem' }} />}
              {currentCard.passStatus === false && <Chip label="FAIL" color="error"   size="small" sx={{ height: 18, fontSize: '0.62rem' }} />}
            </Box>
            <IconButton size="small" onClick={() => setSelectedCardIdx(i => Math.min(cardEntries.length - 1, i + 1))} disabled={clampedIdx >= cardEntries.length - 1}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* ── Card View ── */}
      {viewMode === 'card' && (
        cardEntries.length === 0
          ? <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>No cards yet — set the sample count above.</Typography>
          : (
            <Box sx={{ mb: 2 }}>
              <CardDiagram
                areaLabels={areaLabels}
                areas={currentAreas}
                areaResults={currentDiagramResults}
                onReadingChange={(areaIdx, field, value) =>
                  handleReadingChange(currentCard.cardNumber, areaIdx, field as typeof LCR_FIELDS[number], value)
                }
              />
            </Box>
          )
      )}

      {/* ── Table View ── */}
      {viewMode === 'table' && (
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#e0f2fe' }}>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Card</TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: 130 }}>Type</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 80 }}>Left (mm)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 80 }}>Center (mm)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 80 }}>Right (mm)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 80 }}>
                  <Tooltip title="Arithmetic average of L, C, R readings"><span>Avg (mm)</span></Tooltip>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 72 }}>
                  <Tooltip title={`Δ = avg inside − avg card thickness. Must be ≤ ${DELTA_MAX} mm to pass.`}><span>Δ (mm)</span></Tooltip>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Result</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Card</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cardEntries.map(ce => {
                const areas = decodeAreas(ce.notes, areaLabels.length);
                const avgOutside = computeOutsideAvg(areas[0]);
                const addOnResults = areas.slice(1).map(a => computeAreaResult(a, avgOutside));
                const allDetermined = addOnResults.every(r => r !== null && r.areaPass !== null);
                const cardPass = allDetermined ? addOnResults.every(r => r?.areaPass === true) : undefined;
                const outsideInSpec = avgOutside !== null && avgOutside >= BASELINE_SPEC_MIN && avgOutside <= BASELINE_SPEC_MAX;
                const outsideOutOfSpec = avgOutside !== null && !outsideInSpec;

                return areaLabels.map((label, aIdx) => {
                  const area = areas[aIdx] ?? { ...BLANK_AREA };
                  const isCardThickness = aIdx === 0;
                  const isLastArea = aIdx === areaLabels.length - 1;
                  const result = isCardThickness ? null : addOnResults[aIdx - 1];
                  const areaFailed = result !== null && result?.areaPass === false;

                  return (
                    <TableRow
                      key={`${ce.cardNumber}-${aIdx}`}
                      sx={{
                        '&:hover': { backgroundColor: 'action.hover' },
                        ...(isCardThickness ? { borderTop: '2px solid', borderTopColor: 'divider', backgroundColor: '#f8fafc' } : {}),
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                        {isCardThickness ? `CGC${String(ce.cardNumber).padStart(2, '0')}` : ''}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: isCardThickness ? 600 : 400 }}>
                          {label}
                        </Typography>
                      </TableCell>
                      {LCR_FIELDS.map(field => (
                        <TableCell key={field} align="center">
                          <TextField
                            type="number" size="small"
                            value={area[field]}
                            onChange={e => handleReadingChange(ce.cardNumber, aIdx, field, e.target.value)}
                            onKeyDown={advanceFocus}
                            inputProps={{ step: 0.001, style: { textAlign: 'center', width: 60 } }}
                            sx={{ width: 78 }}
                          />
                        </TableCell>
                      ))}
                      {/* Avg */}
                      <TableCell align="center">
                        {isCardThickness ? (
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600, color: outsideOutOfSpec ? '#ef4444' : avgOutside !== null ? 'success.main' : 'inherit' }}>
                            {avgOutside !== null ? avgOutside.toFixed(3) : '—'}
                          </Typography>
                        ) : (
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: areaFailed ? 700 : 400, color: areaFailed ? '#ef4444' : 'inherit' }}>
                            {result ? result.avgInside.toFixed(3) : '—'}
                          </Typography>
                        )}
                      </TableCell>
                      {/* Δ */}
                      <TableCell align="center">
                        {isCardThickness ? (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        ) : (
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: areaFailed ? 700 : 400, color: areaFailed ? '#ef4444' : 'inherit' }}>
                            {result === null ? '—'
                              : result.delta === null
                                ? <Typography component="span" variant="caption" color="text.secondary">no baseline</Typography>
                                : (result.delta >= 0 ? '+' : '') + result.delta.toFixed(3)}
                          </Typography>
                        )}
                      </TableCell>
                      {/* Result */}
                      <TableCell align="center">
                        {isCardThickness ? (
                          avgOutside === null ? <Typography variant="caption" color="text.secondary">—</Typography>
                            : outsideInSpec ? <Chip label="IN SPEC" color="success" size="small" sx={{ fontWeight: 'bold', fontSize: '0.6rem' }} />
                            : <Chip label="OUT OF SPEC" color="error" size="small" sx={{ fontWeight: 'bold', fontSize: '0.6rem' }} />
                        ) : (
                          result === null || result.areaPass === null
                            ? <Typography variant="caption" color="text.secondary">—</Typography>
                            : result.areaPass
                              ? <Chip label="PASS" color="success" size="small" sx={{ fontWeight: 'bold', minWidth: 52, fontSize: '0.65rem' }} />
                              : <Chip label="FAIL" color="error" size="small" sx={{ fontWeight: 'bold', minWidth: 52, fontSize: '0.65rem' }} />
                        )}
                      </TableCell>
                      {/* Card pass/fail — last add-on row only */}
                      <TableCell align="center">
                        {isLastArea && !isCardThickness ? (
                          cardPass === undefined
                            ? <Typography variant="caption" color="text.secondary">—</Typography>
                            : cardPass
                              ? <Chip label="PASS" color="success" size="small" sx={{ fontWeight: 'bold', minWidth: 60 }} />
                              : <Chip label="FAIL" color="error" size="small" sx={{ fontWeight: 'bold', minWidth: 60 }} />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                });
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Session summary ── */}
      {sessionSummary && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">Session summary:</Typography>
          <Chip label={`${sessionSummary.passCount}/${sessionSummary.total} cards pass`} size="small" color={sessionSummary.passCount === sessionSummary.total ? 'success' : 'error'} />
          {maxDelta !== null && (
            <Chip label={`Max Δ: ${maxDelta >= 0 ? '+' : ''}${maxDelta.toFixed(3)} mm`} size="small" color={maxDelta <= DELTA_MAX ? 'success' : 'error'} variant="outlined" />
          )}
        </Box>
      )}

      <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
        <Typography variant="caption">
          <strong>Pass criteria (#3004# / #8050#):</strong> Δ = avg(L,C,R) inside add-on − avg(L,C,R) card thickness ≤ {DELTA_MAX} mm for every Add-On Area.
          Card thickness (outside baseline) spec: {BASELINE_SPEC_MIN}–{BASELINE_SPEC_MAX} mm. Embossed characters are NOT Add-On Areas.
        </Typography>
      </Alert>

      <TextField
        label="Job Notes" size="small" fullWidth multiline rows={2}
        value={meta.jobNotes ?? ''}
        onChange={e => updateMeta({ jobNotes: e.target.value })}
      />
    </Box>
  );
};

export default ThicknessAddOnForm;
