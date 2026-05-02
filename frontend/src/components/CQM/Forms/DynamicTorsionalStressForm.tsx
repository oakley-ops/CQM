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
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';

interface DynamicTorsionalStressFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
}

interface DynamicTorsionalStressExtra {
  torsionMachineId?: string;
  torsionMachineCalUntil?: string;
  cyclesCompleted?: number | string;
  twistAngleConfig?: '±15° both ends' | '±30° single end' | '';
  cardConstructionRef?: string;
}

type SubResult = 'PASS' | 'FAIL' | undefined;

function derivePassFail(visual: SubResult, functional: SubResult): boolean | undefined {
  if (visual === undefined || functional === undefined) return undefined;
  return visual === 'PASS' && functional === 'PASS';
}

const TWIST_OPTIONS = ['±15° both ends', '±30° single end'] as const;

const DynamicTorsionalStressForm: React.FC<DynamicTorsionalStressFormProps> = ({
  def, entry, onUpdateEntry, onUpdateCardEntry,
}) => {
  const cardEntries = entry.cardEntries ?? [];
  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
  const extra = (meta.extraData ?? {}) as DynamicTorsionalStressExtra;

  const updateMeta = (patch: Partial<TestEntryMetadata>) => {
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });
  };

  const updateExtra = (patch: Partial<DynamicTorsionalStressExtra>) => {
    updateMeta({ extraData: { ...extra, ...patch } });
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
          cornerA: undefined,
          cornerB: undefined,
          cornerAExtent: '',
          visualNote: '',
          isValid: false,
        })),
      ];
    } else {
      next = existing.slice(0, n);
    }
    onUpdateEntry(def.id, { sampleCount: n, cardEntries: next });
  };

  const handleSubResult = (
    cardNumber: number,
    field: 'cornerA' | 'cornerB',
    value: 'PASS' | 'FAIL',
  ) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const nextVisual = (field === 'cornerA' ? value : ce?.cornerA) as SubResult;
    const nextFunctional = (field === 'cornerB' ? value : ce?.cornerB) as SubResult;
    const pass = derivePassFail(nextVisual, nextFunctional);
    onUpdateCardEntry(def.id, cardNumber, {
      [field]: value,
      passStatus: pass,
      isValid: pass !== undefined,
    });
  };

  const cyclesNum =
    typeof extra.cyclesCompleted === 'string'
      ? parseInt(extra.cyclesCompleted)
      : extra.cyclesCompleted;
  const cyclesValid = cyclesNum !== undefined && !isNaN(cyclesNum as number);
  const cyclesStatus = !cyclesValid
    ? null
    : (cyclesNum as number) < 1000
    ? 'error'
    : (cyclesNum as number) < 6000
    ? 'warning'
    : 'success';

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
        Dynamic Torsional Stress Test Log — ISO/IEC 10373-1 (#8150#)
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Test method #8150# · Required: ≥ 1000 cycles (#3069#) · Recommended: 6000 cycles (#A600#)
        &nbsp;·&nbsp; Both card ends twisted ±15° in opposite directions (or single end ±30°)
      </Typography>

      <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
        <Typography variant="caption">
          <strong>Equipment caution (#A600#):</strong> Verify the torsion test machine applies force
          gradually and can measure the maximum force applied. Some commercially available equipment
          does not meet this ISO requirement — confirm machine specification before use.
        </Typography>
      </Alert>

      {/* ── Section A: Header / equipment ── */}
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
            label="Torsion Machine ID#" size="small" fullWidth
            value={extra.torsionMachineId ?? ''}
            onChange={e => updateExtra({ torsionMachineId: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Machine Cal. Valid Until" size="small" fullWidth type="date"
            value={extra.torsionMachineCalUntil ?? ''}
            onChange={e => updateExtra({ torsionMachineCalUntil: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
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

      {/* ── Section B: Test parameters ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
        Test Parameters
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Cycles Completed"
            size="small"
            fullWidth
            type="number"
            value={extra.cyclesCompleted ?? ''}
            onChange={e =>
              updateExtra({ cyclesCompleted: e.target.value === '' ? undefined : Number(e.target.value) })
            }
            inputProps={{ min: 0, step: 100 }}
            helperText="Required: ≥ 1000 (#3069#) | Recommended: 6000 (#A600#)"
            error={cyclesStatus === 'error'}
          />
          {cyclesStatus === 'error' && (
            <Typography variant="caption" color="error">
              Below required minimum of 1000 cycles (#3069#)
            </Typography>
          )}
          {cyclesStatus === 'warning' && (
            <Typography variant="caption" color="warning.main">
              Meets minimum — CQM recommends testing up to 6000 cycles (#A600#)
            </Typography>
          )}
          {cyclesStatus === 'success' && (
            <Typography variant="caption" color="success.main">
              Meets recommended 6000-cycle target
            </Typography>
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <FormControl size="small" fullWidth>
            <InputLabel>Twist Angle Configuration</InputLabel>
            <Select
              label="Twist Angle Configuration"
              value={extra.twistAngleConfig ?? ''}
              onChange={e =>
                updateExtra({
                  twistAngleConfig: e.target.value as DynamicTorsionalStressExtra['twistAngleConfig'],
                })
              }
            >
              <MenuItem value=""><em>Select</em></MenuItem>
              {TWIST_OPTIONS.map(opt => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Single end ±30° achieves equivalent stress per #A600#
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Card Construction Reference"
            size="small"
            fullWidth
            multiline
            rows={2}
            value={extra.cardConstructionRef ?? ''}
            onChange={e => updateExtra({ cardConstructionRef: e.target.value })}
            helperText="Layers, materials, ICM, process flow — artwork not required (#A600#)"
          />
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* ── Section C: Per-card results ── */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'warning.lighter' }}>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Card ID#</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 140 }}>
                Visual Inspection
                <Typography variant="caption" display="block" color="text.secondary" fontWeight="normal">
                  No cracks on surface
                </Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 110 }}>
                Crack Description
                <Typography variant="caption" display="block" color="text.secondary" fontWeight="normal">
                  (if failed)
                </Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 140 }}>
                Functional Test
                <Typography variant="caption" display="block" color="text.secondary" fontWeight="normal">
                  Fully functional
                </Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Notes</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Result</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cardEntries.map(ce => {
              const visual = ce.cornerA as SubResult;
              const functional = ce.cornerB as SubResult;
              return (
                <TableRow
                  key={ce.cardNumber}
                  sx={{ '&:hover': { backgroundColor: 'action.hover' }, verticalAlign: 'top' }}
                >
                  <TableCell sx={{ fontWeight: 'medium', whiteSpace: 'nowrap', pt: 1.5 }}>
                    Card {String(ce.cardNumber).padStart(2, '0')}
                  </TableCell>

                  <TableCell align="center" sx={{ px: 0.5 }}>
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={visual ?? null}
                      onChange={(_, val) => {
                        if (val !== null) handleSubResult(ce.cardNumber, 'cornerA', val);
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
                    </ToggleButtonGroup>
                  </TableCell>

                  <TableCell align="center" sx={{ px: 0.5, pt: 1 }}>
                    <TextField
                      size="small"
                      placeholder="Location / extent"
                      value={ce.cornerAExtent ?? ''}
                      onChange={e => onUpdateCardEntry(def.id, ce.cardNumber, { cornerAExtent: e.target.value })}
                      disabled={visual !== 'FAIL'}
                      inputProps={{ style: { fontSize: '0.7rem', padding: '2px 6px' } }}
                      sx={{ width: 120 }}
                    />
                  </TableCell>

                  <TableCell align="center" sx={{ px: 0.5 }}>
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={functional ?? null}
                      onChange={(_, val) => {
                        if (val !== null) handleSubResult(ce.cardNumber, 'cornerB', val);
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
                    </ToggleButtonGroup>
                  </TableCell>

                  <TableCell align="center" sx={{ pt: 1 }}>
                    <TextField
                      size="small"
                      placeholder="None"
                      value={ce.visualNote ?? ''}
                      onChange={e => onUpdateCardEntry(def.id, ce.cardNumber, { visualNote: e.target.value })}
                      inputProps={{ style: { width: 80, fontSize: '0.75rem' } }}
                      sx={{ width: 100 }}
                    />
                  </TableCell>

                  <TableCell align="center" sx={{ pt: 1.5 }}>
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

      {/* ── Section D: Pass criteria ── */}
      <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
        <Typography variant="caption">
          <strong>Pass criteria (#3069#):</strong> No cracks on surface AND card remains fully functional
          after ≥ 1000 torsion cycles. Both visual and functional tests must pass for each card.
          &nbsp;
          <strong>Recommended (#A600#):</strong> Test beyond 1000 cycles (e.g. up to 6000). Vendor shall
          retain results for recommended cycle counts and make them available to Mastercard upon request.
        </Typography>
      </Alert>

      {/* ── Section E: Job notes ── */}
      <TextField
        label="Job Notes"
        size="small"
        fullWidth
        multiline
        rows={3}
        value={meta.jobNotes ?? ''}
        onChange={e => updateMeta({ jobNotes: e.target.value })}
        helperText="Include any observations, card construction details, or equipment anomalies."
      />
    </Box>
  );
};

export default DynamicTorsionalStressForm;
