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
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';

interface ThreeWheelTestFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
}

interface ThreeWheelExtra {
  machineSerial?:   string;
  machineCalUntil?: string;
  forceN?:          string;
  testStage?:       string;
  cyclesH?:         number | string;
  cyclesV?:         number | string;
  cardType?:        string;
  msaLabels?:       string[];
}

interface MsaResult {
  h:    'PASS' | 'FAIL' | '';
  v:    'PASS' | 'FAIL' | '';
  desc: string;
}

const DEFAULT_MSA_LABELS = ['Chip Module', 'Antenna Coil'];

const FORCE_OPTIONS = [
  { value: '8',  label: '8 N ± 0.5 N',  note: 'Required (default)' },
  { value: '10', label: '10 N',          note: 'Monitoring — Recommended' },
  { value: '12', label: '12 N',          note: 'Qualification — Recommended' },
  { value: '15', label: '15 N',          note: 'IAC Qualification — Report Only' },
];

function encodeMsas(msas: MsaResult[]): string {
  return JSON.stringify({ msas });
}

function decodeMsas(notes: string | undefined, count: number): MsaResult[] {
  try {
    const parsed = JSON.parse(notes ?? '{}') as { msas?: MsaResult[] };
    const existing = parsed.msas ?? [];
    const result = existing.map(m => ({ h: m.h ?? '' as MsaResult['h'], v: m.v ?? '' as MsaResult['v'], desc: m.desc ?? '' }));
    while (result.length < count) result.push({ h: '', v: '', desc: '' });
    return result.slice(0, count) as MsaResult[];
  } catch {
    return Array.from({ length: count }, () => ({ h: '' as MsaResult['h'], v: '' as MsaResult['v'], desc: '' }));
  }
}

function computeCardPass(msas: MsaResult[], isInfoOnly: boolean): { pass: boolean | undefined; isValid: boolean } {
  if (isInfoOnly) return { pass: undefined, isValid: false };
  if (msas.length === 0) return { pass: undefined, isValid: false };
  if (!msas.every(m => m.h !== '' && m.v !== '')) return { pass: undefined, isValid: false };
  return { pass: msas.every(m => m.h === 'PASS' && m.v === 'PASS'), isValid: true };
}

const ThreeWheelTestForm: React.FC<ThreeWheelTestFormProps> = ({ def, entry, onUpdateEntry, onUpdateCardEntry }) => {
  const cardEntries = entry.cardEntries ?? [];
  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
  const extra = (meta.extraData ?? {}) as ThreeWheelExtra;
  const msaLabels = extra.msaLabels ?? DEFAULT_MSA_LABELS;
  const isInfoOnly = extra.forceN === '15';

  const updateMeta = (patch: Partial<TestEntryMetadata>) =>
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });

  const updateExtra = (patch: Partial<ThreeWheelExtra>) =>
    updateMeta({ extraData: { ...extra, ...patch } });

  const makeBlankCard = (cardNumber: number): CardEntryData => ({
    sampleCardId: 0,
    cardNumber,
    passStatus: undefined,
    notes: encodeMsas(Array.from({ length: msaLabels.length }, () => ({ h: '', v: '', desc: '' }))),
    isValid: false,
  });

  const handleCountChange = (raw: string) => {
    const n = Math.max(1, parseInt(raw) || 1);
    const existing = entry.cardEntries ?? [];
    const next = n > existing.length
      ? [...existing, ...Array.from({ length: n - existing.length }, (_, i) => makeBlankCard(existing.length + i + 1))]
      : existing.slice(0, n);
    onUpdateEntry(def.id, { sampleCount: n, cardEntries: next });
  };

  const handleMsaLabelChange = (idx: number, value: string) => {
    const next = [...msaLabels];
    next[idx] = value;
    updateExtra({ msaLabels: next });
  };

  const handleAddMsa = () => {
    const next = [...msaLabels, `MSA ${msaLabels.length + 1}`];
    const updatedCards = cardEntries.map(ce => {
      const msas = decodeMsas(ce.notes, msaLabels.length);
      msas.push({ h: '', v: '', desc: '' });
      return { ...ce, notes: encodeMsas(msas) };
    });
    onUpdateEntry(def.id, { cardEntries: updatedCards });
    updateExtra({ msaLabels: next });
  };

  const handleRemoveMsa = (idx: number) => {
    if (msaLabels.length <= 1) return;
    const next = msaLabels.filter((_, i) => i !== idx);
    const updatedCards = cardEntries.map(ce => {
      const msas = decodeMsas(ce.notes, msaLabels.length);
      msas.splice(idx, 1);
      const { pass, isValid } = computeCardPass(msas, isInfoOnly);
      return { ...ce, notes: encodeMsas(msas), passStatus: pass, isValid };
    });
    onUpdateEntry(def.id, { cardEntries: updatedCards });
    updateExtra({ msaLabels: next });
  };

  const handleMsaResult = (
    cardNumber: number,
    msaIdx: number,
    field: 'h' | 'v',
    value: 'PASS' | 'FAIL',
  ) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const msas = decodeMsas(ce?.notes, msaLabels.length);
    msas[msaIdx] = { ...msas[msaIdx], [field]: value };
    const { pass, isValid } = computeCardPass(msas, isInfoOnly);
    onUpdateCardEntry(def.id, cardNumber, { notes: encodeMsas(msas), passStatus: pass, isValid });
  };

  const handleMsaDesc = (cardNumber: number, msaIdx: number, value: string) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const msas = decodeMsas(ce?.notes, msaLabels.length);
    msas[msaIdx] = { ...msas[msaIdx], desc: value };
    onUpdateCardEntry(def.id, cardNumber, { notes: encodeMsas(msas) });
  };

  const totalCycles = (Number(extra.cyclesH ?? 50) + Number(extra.cyclesV ?? 50));

  return (
    <Box>
      {/* ── Title ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
        3 Wheel Test Robustness — ISO/IEC 10373-1 (#8210#)
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Test method #8210# · {extra.forceN ?? '8'} N · {totalCycles} total cycles
        ({extra.cyclesH ?? 50} H + {extra.cyclesV ?? 50} V) per MSA
        &nbsp;·&nbsp; Qualification min. sample size: 8 · Monitoring: 1/month
      </Typography>

      {isInfoOnly && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="caption">
            <strong>15 N — Report Only:</strong> Results at this force level are recorded for information.
            Cards are <em>never</em> marked FAIL regardless of outcome.
          </Typography>
        </Alert>
      )}

      {/* ── Section A: Equipment & header ── */}
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
            label="Date" size="small" fullWidth type="date"
            value={meta.testDate ?? ''}
            onChange={e => updateMeta({ testDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
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
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="# of Samples Tested" size="small" fullWidth type="number"
            value={entry.sampleCount ?? 1}
            onChange={e => handleCountChange(e.target.value)}
            inputProps={{ min: 1, max: 50 }}
            helperText="Qualification minimum: 8"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select label="Applied Force" size="small" fullWidth
            value={extra.forceN ?? '8'}
            onChange={e => updateExtra({ forceN: e.target.value })}
          >
            {FORCE_OPTIONS.map(o => (
              <MenuItem key={o.value} value={o.value}>{o.label} — {o.note}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Box>
            <Typography variant="caption" color="text.secondary">Samples Preconditioned</Typography>
            <RadioGroup
              row
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

      {/* ── Section B: MSA label configuration ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight="bold">
          Mechanically Sensitive Areas (MSAs)
        </Typography>
        <Button
          size="small" startIcon={<AddIcon />} variant="outlined"
          onClick={handleAddMsa}
          sx={{ ml: 'auto', fontSize: '0.7rem', py: 0.25 }}
        >
          Add MSA
        </Button>
      </Box>

      <Grid container spacing={1} sx={{ mb: 2 }}>
        {msaLabels.map((label, idx) => (
          <Grid item key={idx} xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TextField
                label={`MSA ${idx + 1}`} size="small" fullWidth
                value={label}
                onChange={e => handleMsaLabelChange(idx, e.target.value)}
                inputProps={{ style: { fontSize: '0.8rem' } }}
              />
              <Tooltip title="Remove MSA">
                <span>
                  <IconButton
                    size="small" color="error"
                    onClick={() => handleRemoveMsa(idx)}
                    disabled={msaLabels.length <= 1}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* ── Section C: Per-card results ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
        Per-Card Results
      </Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 400 + msaLabels.length * 160 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#e8f5e9' }}>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Card ID#</TableCell>
              {msaLabels.map((label, idx) => (
                <TableCell key={idx} align="center" sx={{ fontWeight: 'bold', minWidth: 160 }}>
                  {label}
                  <Typography variant="caption" display="block" color="text.secondary" fontWeight="normal">
                    H (horiz) · V (vert)
                  </Typography>
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Result</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cardEntries.map(ce => {
              const msas = decodeMsas(ce.notes, msaLabels.length);
              return (
                <TableRow
                  key={ce.cardNumber}
                  sx={{ '&:hover': { backgroundColor: 'action.hover' }, verticalAlign: 'top' }}
                >
                  <TableCell sx={{ fontWeight: 500, whiteSpace: 'nowrap', pt: 1.5 }}>
                    Card {String(ce.cardNumber).padStart(2, '0')}
                  </TableCell>

                  {msas.map((msa, msaIdx) => (
                    <TableCell key={msaIdx} align="center" sx={{ px: 0.5, py: 1 }}>
                      {/* Horizontal */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, justifyContent: 'center' }}>
                        <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary', minWidth: 12 }}>H</Typography>
                        <ToggleButtonGroup
                          exclusive size="small"
                          value={msa.h || null}
                          onChange={(_, val) => { if (val !== null) handleMsaResult(ce.cardNumber, msaIdx, 'h', val); }}
                        >
                          <ToggleButton value="PASS" sx={{ fontSize: '0.55rem', px: 0.6, py: 0.2, color: 'success.main', '&.Mui-selected': { bgcolor: 'success.light', color: 'success.contrastText' } }}>
                            P
                          </ToggleButton>
                          <ToggleButton value="FAIL" sx={{ fontSize: '0.55rem', px: 0.6, py: 0.2, color: 'error.main', '&.Mui-selected': { bgcolor: 'error.light', color: 'error.contrastText' } }}>
                            F
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                      {/* Vertical */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, justifyContent: 'center' }}>
                        <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary', minWidth: 12 }}>V</Typography>
                        <ToggleButtonGroup
                          exclusive size="small"
                          value={msa.v || null}
                          onChange={(_, val) => { if (val !== null) handleMsaResult(ce.cardNumber, msaIdx, 'v', val); }}
                        >
                          <ToggleButton value="PASS" sx={{ fontSize: '0.55rem', px: 0.6, py: 0.2, color: 'success.main', '&.Mui-selected': { bgcolor: 'success.light', color: 'success.contrastText' } }}>
                            P
                          </ToggleButton>
                          <ToggleButton value="FAIL" sx={{ fontSize: '0.55rem', px: 0.6, py: 0.2, color: 'error.main', '&.Mui-selected': { bgcolor: 'error.light', color: 'error.contrastText' } }}>
                            F
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                      {/* Damage description */}
                      <TextField
                        size="small" placeholder="Notes"
                        value={msa.desc}
                        onChange={e => handleMsaDesc(ce.cardNumber, msaIdx, e.target.value)}
                        disabled={msa.h !== 'FAIL' && msa.v !== 'FAIL'}
                        inputProps={{ style: { fontSize: '0.65rem', padding: '2px 4px' } }}
                        sx={{ width: 110 }}
                      />
                    </TableCell>
                  ))}

                  <TableCell align="center" sx={{ pt: 1.5 }}>
                    {isInfoOnly ? (
                      <Chip label="INFO" size="small" sx={{ bgcolor: 'grey.300', fontWeight: 'bold', minWidth: 60, fontSize: '0.65rem' }} />
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

      {/* ── Pass criteria ── */}
      <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
        <Typography variant="caption">
          <strong>Pass criteria (#3054# / #8210#):</strong> Every MSA shall pass at 8 N ± 0.5 N
          for 2 × 50 cycles horizontally and vertically. Apparatus: one wheel above, two below;
          max ± 5° angular error; standard chamfer wheels on low-friction bearings.
          <br />
          <strong>Recommended:</strong> 10 N (monitoring), 12 N (qualification).
          &nbsp;<strong>IAC at 15 N:</strong> recorded for information only — does not affect pass/fail.
        </Typography>
      </Alert>

      {/* ── Job notes ── */}
      <TextField
        label="Job Notes"
        size="small"
        fullWidth
        multiline
        rows={3}
        value={meta.jobNotes ?? ''}
        onChange={e => updateMeta({ jobNotes: e.target.value })}
        helperText="Record force applied, MSA locations tested, any damage observations."
      />
    </Box>
  );
};

export default ThreeWheelTestForm;
