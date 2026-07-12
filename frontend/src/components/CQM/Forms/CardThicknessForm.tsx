import React, { useMemo } from 'react';
import {
  Box,
  Chip,
  Divider,
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
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';

interface CardThicknessFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
}

const MIN_MM = 0.76;
const MAX_MM = 0.84;
const FORCE_MIN = 3.5;
const FORCE_MAX = 5.9;
const PROBE_MIN = 3;
const PROBE_MAX = 8;

// 5 measurement positions per ISO/IEC 10373-1 #8040#
const POINTS = [
  { key: 'p1', label: 'P1', title: 'Center' },
  { key: 'p2', label: 'P2', title: 'Top Center' },
  { key: 'p3', label: 'P3', title: 'Bottom Center' },
  { key: 'p4', label: 'P4', title: 'Left Center' },
  { key: 'p5', label: 'P5', title: 'Right Center' },
] as const;

type PointKey = 'p1' | 'p2' | 'p3' | 'p4' | 'p5';

interface CardThicknessExtra {
  micrometerSerial?: string;
  appliedForceN?: number | string;
  probeDiameterMm?: number | string;
}

// Encode 5 readings into the notes field: "p1|p2|p3|p4|p5"
function encodePoints(pts: Partial<Record<PointKey, string>>): string {
  return POINTS.map(p => pts[p.key] ?? '').join('|');
}

function decodePoints(notes?: string): Record<PointKey, string> {
  const parts = (notes ?? '').split('|');
  return {
    p1: parts[0] ?? '',
    p2: parts[1] ?? '',
    p3: parts[2] ?? '',
    p4: parts[3] ?? '',
    p5: parts[4] ?? '',
  };
}

function computeStats(pts: Record<PointKey, string>) {
  const vals = POINTS.map(p => {
    const v = parseFloat(pts[p.key]);
    return isNaN(v) ? null : v;
  }).filter((v): v is number => v !== null);
  if (vals.length === 0) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const pass = min >= MIN_MM && max <= MAX_MM;
  return { min, max, avg, pass, count: vals.length };
}

const CardThicknessForm: React.FC<CardThicknessFormProps> = ({ def, entry, onUpdateEntry, onUpdateCardEntry }) => {
  const cardEntries = entry.cardEntries ?? [];
  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
  const extra = (meta.extraData ?? {}) as CardThicknessExtra;

  const updateMeta = (patch: Partial<TestEntryMetadata>) =>
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });

  const updateExtra = (patch: Partial<CardThicknessExtra>) =>
    updateMeta({ extraData: { ...extra, ...patch } });

  const handleCountChange = (raw: string) => {
    const n = Math.max(1, parseInt(raw) || 1);
    const existing = entry.cardEntries ?? [];
    const next: CardEntryData[] = n > existing.length
      ? [
          ...existing,
          ...Array.from({ length: n - existing.length }, (_, i) => ({
            sampleCardId: 0,
            cardNumber: existing.length + i + 1,
            passStatus: undefined,
            measurementValue: undefined,
            secondaryMeasurementValue: null,
            notes: encodePoints({}),
            isValid: false,
          })),
        ]
      : existing.slice(0, n);
    onUpdateEntry(def.id, { sampleCount: n, cardEntries: next });
  };

  const handlePointChange = (cardNumber: number, key: PointKey, raw: string) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const pts = decodePoints(ce?.notes);
    pts[key] = raw;
    const stats = computeStats(pts);
    onUpdateCardEntry(def.id, cardNumber, {
      notes: encodePoints(pts),
      measurementValue: stats ? parseFloat(stats.avg.toFixed(4)) : undefined,
      secondaryMeasurementValue: stats ? parseFloat(stats.min.toFixed(4)) : null,
      passStatus: stats?.count === 5 ? stats.pass : undefined,
      isValid: stats?.count === 5,
    });
  };

  // Session-level summary
  const allStats = useMemo(() => {
    const rows = cardEntries.map(ce => {
      const pts = decodePoints(ce.notes);
      return computeStats(pts);
    }).filter((s): s is NonNullable<ReturnType<typeof computeStats>> => s !== null && s.count === 5);
    if (rows.length === 0) return null;
    const avgs = rows.map(s => s.avg);
    const allMin = Math.min(...rows.map(s => s.min));
    const allMax = Math.max(...rows.map(s => s.max));
    const grandAvg = avgs.reduce((a, b) => a + b, 0) / avgs.length;
    const passCount = rows.filter(s => s.pass).length;
    return { allMin, allMax, grandAvg, passCount, total: rows.length };
  }, [cardEntries]);

  const forceVal = parseFloat(String(extra.appliedForceN ?? ''));
  const probeVal = parseFloat(String(extra.probeDiameterMm ?? ''));
  const forceWarn = !isNaN(forceVal) && (forceVal < FORCE_MIN || forceVal > FORCE_MAX);
  const probeWarn = !isNaN(probeVal) && (probeVal < PROBE_MIN || probeVal > PROBE_MAX);

  return (
    <Box>
      {/* ── Title ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
        Card Thickness Outside Contacts / Embossed / Add-on Areas — Test Method #8040# (Unit: mm)
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Spec: {MIN_MM} – {MAX_MM} mm (ISO 7810 § 9.1.3) · 5 measurement points per card · Card fails if any point is outside spec
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
            label="Test Date" size="small" fullWidth type="date"
            value={meta.testDate ?? ''}
            onChange={e => updateMeta({ testDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
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
            label="Applied Force (N)" size="small" fullWidth type="number"
            value={extra.appliedForceN ?? ''}
            onChange={e => updateExtra({ appliedForceN: e.target.value })}
            error={forceWarn}
            helperText={forceWarn ? `Outside ${FORCE_MIN}–${FORCE_MAX} N spec` : ' '}
            inputProps={{ min: 0, step: 0.1 }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Probe Diameter (mm)" size="small" fullWidth type="number"
            value={extra.probeDiameterMm ?? ''}
            onChange={e => updateExtra({ probeDiameterMm: e.target.value })}
            error={probeWarn}
            helperText={probeWarn ? `Outside ${PROBE_MIN}–${PROBE_MAX} mm spec` : ' '}
            inputProps={{ min: 0, step: 0.1 }}
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

      {/* ── Measurement layout diagram ── */}
      <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1, display: 'inline-block' }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          ISO/IEC 10373-1 #8040# — measurement positions
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr', gap: 0.5, width: 180 }}>
          <Box />
          <Box sx={{ textAlign: 'center', fontSize: 11, color: '#475569', border: '1px dashed #cbd5e1', borderRadius: 1, px: 0.5 }}>P2<br/>Top</Box>
          <Box />
          <Box sx={{ textAlign: 'center', fontSize: 11, color: '#475569', border: '1px dashed #cbd5e1', borderRadius: 1, px: 0.5 }}>P4<br/>Left</Box>
          <Box sx={{ textAlign: 'center', fontSize: 11, bgcolor: '#dbeafe', color: '#1e40af', fontWeight: 700, border: '1px solid #93c5fd', borderRadius: 1, px: 0.5 }}>P1<br/>Center</Box>
          <Box sx={{ textAlign: 'center', fontSize: 11, color: '#475569', border: '1px dashed #cbd5e1', borderRadius: 1, px: 0.5 }}>P5<br/>Right</Box>
          <Box />
          <Box sx={{ textAlign: 'center', fontSize: 11, color: '#475569', border: '1px dashed #cbd5e1', borderRadius: 1, px: 0.5 }}>P3<br/>Bottom</Box>
          <Box />
        </Box>
      </Box>

      {/* ── Per-card measurement table ── */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#e0f2fe' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Card</TableCell>
              {POINTS.map(p => (
                <TableCell key={p.key} align="center" sx={{ fontWeight: 'bold', minWidth: 80 }}>
                  <Tooltip title={p.title} placement="top">
                    <span>{p.label}<br /><Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{p.title}</Typography></span>
                  </Tooltip>
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Avg</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Min</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Max</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Pass/Fail</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cardEntries.map(ce => {
              const pts = decodePoints(ce.notes);
              const stats = computeStats(pts);
              const incomplete = stats && stats.count < 5;
              return (
                <TableRow key={ce.cardNumber} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                  <TableCell sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Card {String(ce.cardNumber).padStart(2, '0')}
                  </TableCell>
                  {POINTS.map(p => {
                    const val = parseFloat(pts[p.key]);
                    const outOfSpec = !isNaN(val) && (val < MIN_MM || val > MAX_MM);
                    return (
                      <TableCell key={p.key} align="center">
                        <TextField
                          type="number" size="small"
                          value={pts[p.key]}
                          onChange={e => handlePointChange(ce.cardNumber, p.key, e.target.value)}
                          error={outOfSpec}
                          inputProps={{ step: 0.001, style: { textAlign: 'center', width: 64, color: outOfSpec ? '#ef4444' : undefined } }}
                          sx={{ width: 82 }}
                        />
                      </TableCell>
                    );
                  })}
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {stats ? stats.avg.toFixed(3) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ color: stats && stats.min < MIN_MM ? '#ef4444' : 'inherit' }}>
                      {stats ? stats.min.toFixed(3) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ color: stats && stats.max > MAX_MM ? '#ef4444' : 'inherit' }}>
                      {stats ? stats.max.toFixed(3) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {incomplete ? (
                      <Typography variant="caption" color="text.secondary">—</Typography>
                    ) : ce.passStatus === undefined ? (
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

      {/* ── Session summary ── */}
      {allStats && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">Session summary:</Typography>
          <Chip label={`Overall Min: ${allStats.allMin.toFixed(3)} mm`} size="small" variant="outlined"
            sx={{ color: allStats.allMin < MIN_MM ? '#ef4444' : undefined }} />
          <Chip label={`Overall Max: ${allStats.allMax.toFixed(3)} mm`} size="small" variant="outlined"
            sx={{ color: allStats.allMax > MAX_MM ? '#ef4444' : undefined }} />
          <Chip label={`Grand Avg: ${allStats.grandAvg.toFixed(3)} mm`} size="small" variant="outlined" />
          <Chip
            label={`${allStats.passCount}/${allStats.total} cards pass`}
            size="small"
            color={allStats.passCount === allStats.total ? 'success' : 'error'}
          />
        </Box>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Expanded Uncertainty: ± 0.025 mm (coverage factor k = 2, ~95% confidence) · Applied force {FORCE_MIN}–{FORCE_MAX} N · Flat probe {PROBE_MIN}–{PROBE_MAX} mm diameter
      </Typography>

      <TextField
        label="Job Notes" size="small" fullWidth multiline rows={2}
        value={meta.jobNotes ?? ''}
        onChange={e => updateMeta({ jobNotes: e.target.value })}
      />
    </Box>
  );
};

export default CardThicknessForm;
