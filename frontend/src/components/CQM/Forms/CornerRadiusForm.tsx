import React from 'react';
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
  FormControlLabel,
  Radio,
  RadioGroup,
  Divider,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  MenuItem,
} from '@mui/material';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';

interface CornerRadiusFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
}

type CornerResult = 'PASS' | 'FAIL' | 'NO TEST' | undefined;

interface CornerRadiusExtra {
  equipmentType?: string;
  equipmentSerial?: string;
  magnification?: number | string;
  patternId?: string;
}

const NOMINAL_MM = 3.18;
const TOL_MM = 0.30;
const MIN_MM = NOMINAL_MM - TOL_MM; // 2.88
const MAX_MM = NOMINAL_MM + TOL_MM; // 3.48
const MIN_MAG = 10;

const CORNER_LABELS = [
  { key: 'cornerA' as const, label: 'A', title: 'Top-Left (TL)' },
  { key: 'cornerB' as const, label: 'B', title: 'Top-Right (TR)' },
  { key: 'cornerC' as const, label: 'C', title: 'Bottom-Left (BL)' },
  { key: 'cornerD' as const, label: 'D', title: 'Bottom-Right (BR)' },
] as const;

function calcPassFail(a: CornerResult, b: CornerResult, c: CornerResult, d: CornerResult): boolean | undefined {
  const results = [a, b, c, d];
  const tested = results.filter(r => r !== undefined && r !== 'NO TEST');
  if (tested.length === 0) return undefined;
  return tested.every(r => r === 'PASS');
}

const CornerRadiusForm: React.FC<CornerRadiusFormProps> = ({ def, entry, onUpdateEntry, onUpdateCardEntry }) => {
  const cardEntries = entry.cardEntries ?? [];
  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
  const extra = (meta.extraData ?? {}) as CornerRadiusExtra;

  const updateMeta = (patch: Partial<TestEntryMetadata>) =>
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });

  const updateExtra = (patch: Partial<CornerRadiusExtra>) =>
    updateMeta({ extraData: { ...extra, ...patch } });

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
          cornerA: undefined,
          cornerB: undefined,
          cornerC: undefined,
          cornerD: undefined,
          isValid: false,
        })),
      ];
    } else {
      next = existing.slice(0, n);
    }
    onUpdateEntry(def.id, { sampleCount: n, cardEntries: next });
  };

  const handleCornerChange = (
    cardNumber: number,
    corner: 'cornerA' | 'cornerB' | 'cornerC' | 'cornerD',
    value: 'PASS' | 'FAIL' | 'NO TEST',
  ) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const next = { ...ce, [corner]: value } as CardEntryData;
    const pass = calcPassFail(next.cornerA, next.cornerB, next.cornerC, next.cornerD);
    onUpdateCardEntry(def.id, cardNumber, {
      [corner]: value,
      passStatus: pass,
      isValid: pass !== undefined,
    });
  };

  const magVal = parseFloat(String(extra.magnification ?? ''));
  const magWarn = !isNaN(magVal) && magVal < MIN_MAG;

  return (
    <Box>
      {/* ── Title ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
        Corners — Test Method #8060# (ISO 7810 ID-1)
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Nominal: {NOMINAL_MM} mm · Tolerance: ±{TOL_MM} mm · Acceptable range: {MIN_MM}–{MAX_MM} mm
        &nbsp;·&nbsp; Frequency: 1/Batch · Card passes only if ALL tested corners pass
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

      {/* ── Corner layout diagram ── */}
      <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1, display: 'inline-block' }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          #8060# — corner positions (viewed from front of card)
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, width: 160 }}>
          <Box sx={{ textAlign: 'center', fontSize: 11, color: '#475569', border: '1px dashed #cbd5e1', borderRadius: 1, px: 0.5, py: 0.25 }}>
            A<br/><span style={{ fontSize: 10 }}>Top-Left</span>
          </Box>
          <Box sx={{ textAlign: 'center', fontSize: 11, color: '#475569', border: '1px dashed #cbd5e1', borderRadius: 1, px: 0.5, py: 0.25 }}>
            B<br/><span style={{ fontSize: 10 }}>Top-Right</span>
          </Box>
          <Box sx={{ textAlign: 'center', fontSize: 11, color: '#475569', border: '1px dashed #cbd5e1', borderRadius: 1, px: 0.5, py: 0.25 }}>
            C<br/><span style={{ fontSize: 10 }}>Bot-Left</span>
          </Box>
          <Box sx={{ textAlign: 'center', fontSize: 11, color: '#475569', border: '1px dashed #cbd5e1', borderRadius: 1, px: 0.5, py: 0.25 }}>
            D<br/><span style={{ fontSize: 10 }}>Bot-Right</span>
          </Box>
        </Box>
      </Box>

      {/* ── Per-card corner table ── */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f0fdf4' }}>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Card ID#</TableCell>
              {CORNER_LABELS.map(c => (
                <TableCell key={c.key} align="center" sx={{ fontWeight: 'bold', minWidth: 120 }}>
                  Corner {c.label}
                  <Typography variant="caption" display="block" color="text.secondary" fontWeight="normal">
                    {c.title}
                  </Typography>
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Result</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cardEntries.map(ce => (
              <TableRow key={ce.cardNumber} sx={{ '&:hover': { backgroundColor: 'action.hover' }, verticalAlign: 'middle' }}>
                <TableCell sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                  Card CGC{String(ce.cardNumber).padStart(2, '0')}
                </TableCell>

                {CORNER_LABELS.map(({ key }) => {
                  const result = ce[key] as 'PASS' | 'FAIL' | 'NO TEST' | undefined;
                  return (
                    <TableCell key={key} align="center" sx={{ px: 0.5 }}>
                      <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={result ?? null}
                        onChange={(_, val) => {
                          if (val !== null) handleCornerChange(ce.cardNumber, key, val);
                        }}
                      >
                        <ToggleButton
                          value="PASS"
                          sx={{
                            fontSize: '0.6rem', px: 0.75, py: 0.25,
                            color: 'success.main',
                            '&.Mui-selected': { bgcolor: 'success.light', color: 'success.contrastText' },
                          }}
                        >
                          PASS
                        </ToggleButton>
                        <ToggleButton
                          value="FAIL"
                          sx={{
                            fontSize: '0.6rem', px: 0.75, py: 0.25,
                            color: 'error.main',
                            '&.Mui-selected': { bgcolor: 'error.light', color: 'error.contrastText' },
                          }}
                        >
                          FAIL
                        </ToggleButton>
                        <ToggleButton
                          value="NO TEST"
                          sx={{
                            fontSize: '0.6rem', px: 0.75, py: 0.25,
                            '&.Mui-selected': { bgcolor: 'grey.300' },
                          }}
                        >
                          N/T
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </TableCell>
                  );
                })}

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
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Pass criteria reminder ── */}
      <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
        <Typography variant="caption">
          <strong>Pass criteria (#3005# / #8060#):</strong> Corner radius shall be {NOMINAL_MM} mm ± {TOL_MM} mm ({MIN_MM}–{MAX_MM} mm).
          The corner profile must (1) fit between the two concentric circle lines of the gauge template, and
          (2) adjacent card edges must fit between the two parallel lines of the template.
          All four corners must pass; any corner outside the tolerance = card FAIL.
        </Typography>
      </Alert>

      {/* ── Job Notes ── */}
      <TextField
        label="Job Notes"
        size="small"
        fullWidth
        multiline
        rows={2}
        value={meta.jobNotes ?? ''}
        onChange={e => updateMeta({ jobNotes: e.target.value })}
        helperText="Record any alignment issues with straight-edge tangent points or equipment observations."
      />
    </Box>
  );
};

export default CornerRadiusForm;
