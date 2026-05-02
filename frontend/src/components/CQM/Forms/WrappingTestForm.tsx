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

interface WrappingTestFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
}

interface WrappingTestExtra {
  machineSerial?: string;
  machineCalUntil?: string;
  fixtureDescription?: string;
  cylinderDiameterMm?: string;
  cardType?: string;
  cyclesFrontSideUp?: number | string;
  cyclesReverseSideUp?: number | string;
}

const DAMAGE_OPTIONS = ['No Damage', 'Crack', 'Delamination', 'Chip Dislodged', 'Other'] as const;
type DamageOption = typeof DAMAGE_OPTIONS[number];

function computeCardPass(
  preFunctional: string | undefined,
  postFunctional: string | undefined,
  damage: string | undefined,
  iacCheck: string | undefined,
  isIAC: boolean,
): boolean | undefined {
  if (!preFunctional || !postFunctional || !damage) return undefined;
  if (preFunctional !== 'PASS' || postFunctional !== 'PASS' || damage !== 'No Damage') return false;
  if (isIAC) {
    if (iacCheck === undefined) return undefined;
    // PASS = component functional; FAIL = connection failed (test fails); NO TEST = N/A
    return iacCheck !== 'FAIL';
  }
  return true;
}

const WrappingTestForm: React.FC<WrappingTestFormProps> = ({ def, entry, onUpdateEntry, onUpdateCardEntry }) => {
  const cardEntries = entry.cardEntries ?? [];
  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
  const extra = (meta.extraData ?? {}) as WrappingTestExtra;

  const updateMeta = (patch: Partial<TestEntryMetadata>) =>
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });

  const updateExtra = (patch: Partial<WrappingTestExtra>) =>
    updateMeta({ extraData: { ...extra, ...patch } });

  const isIAC = extra.cardType === 'IAC' || extra.cardType === 'IAC Biometric';

  const testMethod = extra.cardType === 'IAC Biometric' ? '#8221#' : '#8220#';
  const totalCycles =
    (Number(extra.cyclesFrontSideUp ?? 10) || 0) +
    (Number(extra.cyclesReverseSideUp ?? 10) || 0);

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
          isValid: false,
        })),
      ];
    } else {
      next = existing.slice(0, n);
    }
    onUpdateEntry(def.id, { sampleCount: n, cardEntries: next });
  };

  const handleCardField = (
    cardNumber: number,
    updates: Partial<CardEntryData>,
  ) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber) ?? {};
    const merged = { ...ce, ...updates };
    const pass = computeCardPass(
      merged.cornerA as string | undefined,
      merged.cornerB as string | undefined,
      merged.cornerAExtent,
      merged.cornerD as string | undefined,
      isIAC,
    );
    onUpdateCardEntry(def.id, cardNumber, {
      ...updates,
      passStatus: pass,
      isValid: pass !== undefined,
    });
  };

  return (
    <Box>
      {/* ── Title ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
        Wrapping Test Robustness — ISO/IEC 10373-1 ({testMethod})
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Test method {testMethod} · {totalCycles} total cycles ({extra.cyclesFrontSideUp ?? 10} contact side up +{' '}
        {extra.cyclesReverseSideUp ?? 10} reverse side up)
        &nbsp;·&nbsp; Qualification min. sample size: 8 · Monitoring: 1/month
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="caption">
          <strong>Procedure:</strong> Pre-condition samples. Verify IC functionality (ATR/ATS) before test.
          Insert card front side up, ICM as close as possible to jaw but on the radius of the testing device.
          Apply wrapping cycles contact side up, then repeat reverse side up. Verify IC functionality after test.
          Report compliance status and cylinder diameters tested.
        </Typography>
      </Alert>

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

      {/* ── Section B: Per-card results ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
        Per-Card Results
      </Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Card ID#</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 110 }}>
                Pre-Test IC
                <Typography variant="caption" display="block" color="text.secondary" fontWeight="normal">
                  ATR / ATS verified
                </Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 130 }}>
                Visual Damage
                <Typography variant="caption" display="block" color="text.secondary" fontWeight="normal">
                  After wrapping cycles
                </Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 110 }}>
                Post-Test IC
                <Typography variant="caption" display="block" color="text.secondary" fontWeight="normal">
                  ATR / ATS verified
                </Typography>
              </TableCell>
              {isIAC && (
                <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 120 }}>
                  IAC Component
                  <Typography variant="caption" display="block" color="text.secondary" fontWeight="normal">
                    Connection intact?
                  </Typography>
                </TableCell>
              )}
              <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 90 }}>Notes</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Result</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cardEntries.map(ce => {
              const preFunctional = ce.cornerA as 'PASS' | 'FAIL' | undefined;
              const postFunctional = ce.cornerB as 'PASS' | 'FAIL' | undefined;
              const damage = ce.cornerAExtent as DamageOption | undefined;
              const iacCheck = ce.cornerD as 'PASS' | 'FAIL' | 'NO TEST' | undefined;

              return (
                <TableRow
                  key={ce.cardNumber}
                  sx={{ '&:hover': { backgroundColor: 'action.hover' }, verticalAlign: 'top' }}
                >
                  <TableCell sx={{ fontWeight: 500, whiteSpace: 'nowrap', pt: 1.5 }}>
                    Card {String(ce.cardNumber).padStart(2, '0')}
                  </TableCell>

                  {/* Pre-test IC functional */}
                  <TableCell align="center" sx={{ px: 0.5 }}>
                    <ToggleButtonGroup
                      exclusive size="small"
                      value={preFunctional ?? null}
                      onChange={(_, val) => { if (val !== null) handleCardField(ce.cardNumber, { cornerA: val }); }}
                    >
                      <ToggleButton value="PASS" sx={{ fontSize: '0.6rem', px: 0.75, py: 0.25, color: 'success.main', '&.Mui-selected': { bgcolor: 'success.light', color: 'success.contrastText' } }}>
                        PASS
                      </ToggleButton>
                      <ToggleButton value="FAIL" sx={{ fontSize: '0.6rem', px: 0.75, py: 0.25, color: 'error.main', '&.Mui-selected': { bgcolor: 'error.light', color: 'error.contrastText' } }}>
                        FAIL
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </TableCell>

                  {/* Visual damage category */}
                  <TableCell align="center" sx={{ px: 0.5, pt: 1 }}>
                    <TextField
                      select size="small"
                      value={damage ?? ''}
                      onChange={e => handleCardField(ce.cardNumber, { cornerAExtent: e.target.value })}
                      sx={{ minWidth: 130 }}
                      inputProps={{ style: { fontSize: '0.75rem' } }}
                    >
                      <MenuItem value="">— Select —</MenuItem>
                      {DAMAGE_OPTIONS.map(opt => (
                        <MenuItem key={opt} value={opt} sx={{ fontSize: '0.8rem' }}>{opt}</MenuItem>
                      ))}
                    </TextField>
                    {damage && damage !== 'No Damage' && (
                      <Chip
                        label="FAIL"
                        color="error"
                        size="small"
                        sx={{ mt: 0.5, fontSize: '0.6rem', height: 18 }}
                      />
                    )}
                  </TableCell>

                  {/* Post-test IC functional */}
                  <TableCell align="center" sx={{ px: 0.5 }}>
                    <ToggleButtonGroup
                      exclusive size="small"
                      value={postFunctional ?? null}
                      onChange={(_, val) => { if (val !== null) handleCardField(ce.cardNumber, { cornerB: val }); }}
                    >
                      <ToggleButton value="PASS" sx={{ fontSize: '0.6rem', px: 0.75, py: 0.25, color: 'success.main', '&.Mui-selected': { bgcolor: 'success.light', color: 'success.contrastText' } }}>
                        PASS
                      </ToggleButton>
                      <ToggleButton value="FAIL" sx={{ fontSize: '0.6rem', px: 0.75, py: 0.25, color: 'error.main', '&.Mui-selected': { bgcolor: 'error.light', color: 'error.contrastText' } }}>
                        FAIL
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </TableCell>

                  {/* IAC component check — only shown when card type is IAC */}
                  {isIAC && (
                    <TableCell align="center" sx={{ px: 0.5 }}>
                      <ToggleButtonGroup
                        exclusive size="small"
                        value={iacCheck ?? null}
                        onChange={(_, val) => { if (val !== null) handleCardField(ce.cardNumber, { cornerD: val }); }}
                      >
                        <ToggleButton value="PASS" sx={{ fontSize: '0.55rem', px: 0.6, py: 0.25, color: 'success.main', '&.Mui-selected': { bgcolor: 'success.light', color: 'success.contrastText' } }}>
                          OK
                        </ToggleButton>
                        <ToggleButton value="NO TEST" sx={{ fontSize: '0.55rem', px: 0.6, py: 0.25, color: 'warning.main', '&.Mui-selected': { bgcolor: 'warning.light' } }}>
                          Comp.
                        </ToggleButton>
                        <ToggleButton value="FAIL" sx={{ fontSize: '0.55rem', px: 0.6, py: 0.25, color: 'error.main', '&.Mui-selected': { bgcolor: 'error.light', color: 'error.contrastText' } }}>
                          Conn.
                        </ToggleButton>
                      </ToggleButtonGroup>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.55rem', mt: 0.25 }}>
                        OK / Component fail / Connection fail
                      </Typography>
                    </TableCell>
                  )}

                  {/* Notes */}
                  <TableCell align="center" sx={{ pt: 1 }}>
                    <TextField
                      size="small"
                      placeholder="None"
                      value={ce.visualNote ?? ''}
                      onChange={e => onUpdateCardEntry(def.id, ce.cardNumber, { visualNote: e.target.value })}
                      inputProps={{ style: { fontSize: '0.75rem', padding: '2px 6px' } }}
                      sx={{ width: 90 }}
                    />
                  </TableCell>

                  {/* Overall result */}
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

      {/* ── IAC legend ── */}
      {isIAC && (
        <Alert severity="warning" sx={{ mb: 2, py: 0.5 }}>
          <Typography variant="caption">
            <strong>IAC component check:</strong> <em>OK</em> = component still functional.{' '}
            <em>Comp.</em> = component failed (component itself failed — test criterion PASSES).{' '}
            <em>Conn.</em> = connection between ICM and card failed — test criterion FAILS.
            {extra.cardType === 'IAC Biometric' && (
              <> &nbsp;For biometric sensor: verify no significant detachment after wrapping stress.</>
            )}
          </Typography>
        </Alert>
      )}

      {/* ── Pass criteria ── */}
      <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
        <Typography variant="caption">
          <strong>Pass criteria (#B220# / #3055# / #3068#):</strong> IC shall be functional (ATR/ATS verified)
          before and after wrapping. No significant visual damage (crack, delamination, chip dislodged).
          {isIAC && (
            <> For IAC: any connected component shall remain functional, or if not, the failure shall be of
            the component itself — not of the connection between the ICM and the card.</>
          )}
          &nbsp;Test report shall state compliance and cylinder diameter(s) tested.
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
        helperText="Record cylinder diameters tested, any alignment issues, or observations for the test report."
      />
    </Box>
  );
};

export default WrappingTestForm;
