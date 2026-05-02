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
  Checkbox,
  Divider,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  MenuItem,
} from '@mui/material';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';

interface TempHumidityExposureFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
}

interface TempHumidityExtra {
  chamberSerial?:       string;
  chamberCalUntil?:     string;
  testMethod?:          string;   // '#8091#' | '#8092#' | '#8110#'
  setPointTempC?:       number | string;
  setPointHumidityPct?: number | string;
  durationH?:           number | string;
  cardType?:            string;   // 'Standard' | 'Biometric' | 'Advanced'
  testStage?:           string;   // 'Standard' | 'Biometric-55' | 'Biometric-50'
  csiLetterObtained?:   boolean;
  req3044Passed?:       boolean;  // #3045# deferred compliance via #3044# result
  cardConstructionRef?: string;   // #3045# sampling note
}

type SubResult = 'PASS' | 'FAIL' | undefined;
type OptResult = 'PASS' | 'FAIL' | 'NO TEST' | undefined;

function computeCardPass(
  warpageMm: number | string | undefined,
  delamination: SubResult,
  visualVariation: SubResult,
  icFunctional: SubResult,
  bioFunctional: OptResult,
  isBiometric: boolean,
): boolean | undefined {
  const warpage = parseFloat(String(warpageMm ?? ''));
  if (isNaN(warpage) || !delamination || !visualVariation || !icFunctional) return undefined;
  if (isBiometric && !bioFunctional) return undefined;
  const warpageOk = warpage <= 10;
  const bioOk = !isBiometric || bioFunctional === 'PASS' || bioFunctional === 'NO TEST';
  return warpageOk && delamination === 'PASS' && visualVariation === 'PASS' && icFunctional === 'PASS' && bioOk;
}

const TempHumidityExposureForm: React.FC<TempHumidityExposureFormProps> = ({
  def, entry, onUpdateEntry, onUpdateCardEntry,
}) => {
  const cardEntries = entry.cardEntries ?? [];
  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
  const extra = (meta.extraData ?? {}) as TempHumidityExtra;

  const isHeatOnly = def.test_id === '#3045#';
  const isBiometric = extra.cardType === 'Biometric' || extra.cardType === 'Advanced';
  const isBiometricRetest = extra.testStage === 'Biometric-55' || extra.testStage === 'Biometric-50';
  const is8092 = extra.testMethod === '#8092#';
  const defaultMethod = isHeatOnly ? '#8110#' : '#8091#';

  const updateMeta = (patch: Partial<TestEntryMetadata>) =>
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });

  const updateExtra = (patch: Partial<TempHumidityExtra>) =>
    updateMeta({ extraData: { ...extra, ...patch } });

  const handleCountChange = (raw: string) => {
    const n = Math.max(1, parseInt(raw) || 1);
    const existing = entry.cardEntries ?? [];
    const next: CardEntryData[] = n > existing.length
      ? [...existing, ...Array.from({ length: n - existing.length }, (_, i) => ({
          sampleCardId: 0,
          cardNumber: existing.length + i + 1,
          passStatus: undefined,
          isValid: false,
        }))]
      : existing.slice(0, n);
    onUpdateEntry(def.id, { sampleCount: n, cardEntries: next });
  };

  const handleCardField = (cardNumber: number, updates: Partial<CardEntryData>) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber) ?? {};
    const merged = { ...ce, ...updates };
    const pass = computeCardPass(
      merged.measurementValue,
      merged.cornerA as SubResult,
      merged.cornerB as SubResult,
      merged.cornerC as SubResult,
      merged.cornerD as OptResult,
      isBiometric,
    );
    onUpdateCardEntry(def.id, cardNumber, { ...updates, passStatus: pass, isValid: pass !== undefined });
  };

  const warpageLimit = 10;

  const handleReq3044Passed = (checked: boolean) => {
    updateExtra({ req3044Passed: checked });
    if (checked) {
      const updated = cardEntries.map(ce =>
        onUpdateCardEntry(def.id, ce.cardNumber, { passStatus: true, isValid: true })
      );
      void updated;
      onUpdateEntry(def.id, {
        cardEntries: cardEntries.map(ce => ({ ...ce, passStatus: true, isValid: true })),
      });
    }
  };

  return (
    <Box>
      {/* ── Title ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
        {isHeatOnly
          ? 'Resistance to Heat — ISO/IEC 10373-1 (#8110#)'
          : 'Durability – Temperature and Humidity Exposure (#8091# / #8092#)'}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Test method {extra.testMethod ?? defaultMethod} · ISO/IEC 10373-1
        &nbsp;·&nbsp; Qualification only — monitoring not required · Min sample size: 3
      </Typography>

      {isHeatOnly && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="caption">
            <strong>Deferred compliance:</strong> If #3044# (T&H Exposure) has already been run and
            passed at the same temperature, this card is automatically compliant to #3045#.
            Check the box below to record deferred compliance — no additional testing required.
          </Typography>
        </Alert>
      )}

      {isBiometricRetest && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="caption">
            <strong>Biometric retest ({extra.testStage === 'Biometric-55' ? '55 °C' : '50 °C'}):</strong>{' '}
            This stage is required because the card failed to remain fully functional at 60 °C.
            A CSI letter must be obtained before recording results.
          </Typography>
        </Alert>
      )}

      {/* ── Section A: Equipment & header ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {isHeatOnly && (
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={extra.req3044Passed ?? false}
                  onChange={e => handleReq3044Passed(e.target.checked)}
                />
              }
              label={
                <Typography variant="body2">
                  #3044# result available and passed — record deferred compliance (no re-test required)
                </Typography>
              }
            />
          </Grid>
        )}
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
            label="Ambient Temp after Recovery (°C)" size="small" fullWidth type="number"
            value={meta.temperatureC ?? ''}
            onChange={e => updateMeta({ temperatureC: e.target.value })}
            helperText="Ambient conditions during card recovery"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Ambient Humidity (% r.H.)" size="small" fullWidth type="number"
            value={meta.humidityPct ?? ''}
            onChange={e => updateMeta({ humidityPct: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="# of Samples" size="small" fullWidth type="number"
            value={entry.sampleCount ?? 1}
            onChange={e => handleCountChange(e.target.value)}
            inputProps={{ min: 1, max: 50 }}
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
        {isBiometricRetest && (
          <Grid item xs={12} sm={6} md={4}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={extra.csiLetterObtained ?? false}
                  onChange={e => updateExtra({ csiLetterObtained: e.target.checked })}
                />
              }
              label={
                <Typography variant="caption">
                  CSI letter obtained for this card
                </Typography>
              }
            />
          </Grid>
        )}
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* ── Section B: Per-card results ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
        Per-Card Results
      </Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: isBiometric ? 780 : 640 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#fff8e1' }}>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Card ID#</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 110 }}>
                Warpage (mm)
                <Typography variant="caption" display="block" color="text.secondary" fontWeight="normal">
                  ≤ {warpageLimit} mm
                </Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 110 }}>
                Delamination
                <Typography variant="caption" display="block" color="text.secondary" fontWeight="normal">
                  None observed
                </Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 110 }}>
                Visual Change
                <Typography variant="caption" display="block" color="text.secondary" fontWeight="normal">
                  No significant variation
                </Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 110 }}>
                IC Functional
                <Typography variant="caption" display="block" color="text.secondary" fontWeight="normal">
                  ATR / ATS verified
                </Typography>
              </TableCell>
              {isBiometric && (
                <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 110 }}>
                  Biometric
                  <Typography variant="caption" display="block" color="text.secondary" fontWeight="normal">
                    Sensor functional
                  </Typography>
                </TableCell>
              )}
              <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 80 }}>Notes</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Result</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cardEntries.map(ce => {
              const warpage = parseFloat(String(ce.measurementValue ?? ''));
              const warpageOk = !isNaN(warpage) && warpage <= warpageLimit;
              const delamination = ce.cornerA as SubResult;
              const visualVariation = ce.cornerB as SubResult;
              const icFunctional = ce.cornerC as SubResult;
              const bioFunctional = ce.cornerD as OptResult;

              return (
                <TableRow
                  key={ce.cardNumber}
                  sx={{ '&:hover': { backgroundColor: 'action.hover' }, verticalAlign: 'top' }}
                >
                  <TableCell sx={{ fontWeight: 500, whiteSpace: 'nowrap', pt: 1.5 }}>
                    Card {String(ce.cardNumber).padStart(2, '0')}
                  </TableCell>

                  {/* Warpage measurement */}
                  <TableCell align="center" sx={{ px: 0.5, pt: 1 }}>
                    <TextField
                      size="small" type="number"
                      placeholder="mm"
                      value={ce.measurementValue ?? ''}
                      onChange={e => handleCardField(ce.cardNumber, {
                        measurementValue: e.target.value === '' ? undefined : e.target.value,
                      })}
                      inputProps={{ step: 0.1, style: { fontSize: '0.75rem', padding: '3px 6px', textAlign: 'center' } }}
                      sx={{ width: 80 }}
                      error={!isNaN(warpage) && warpage > warpageLimit}
                    />
                    {!isNaN(warpage) && (
                      <Chip
                        label={warpageOk ? '≤ 10' : '> 10'}
                        color={warpageOk ? 'success' : 'error'}
                        size="small"
                        sx={{ mt: 0.25, fontSize: '0.6rem', height: 16 }}
                      />
                    )}
                  </TableCell>

                  {/* Delamination (cornerA) */}
                  <TableCell align="center" sx={{ px: 0.5 }}>
                    <ToggleButtonGroup
                      exclusive size="small"
                      value={delamination ?? null}
                      onChange={(_, val) => { if (val !== null) handleCardField(ce.cardNumber, { cornerA: val }); }}
                    >
                      <ToggleButton value="PASS" sx={{ fontSize: '0.6rem', px: 0.75, py: 0.25, color: 'success.main', '&.Mui-selected': { bgcolor: 'success.light', color: 'success.contrastText' } }}>
                        None
                      </ToggleButton>
                      <ToggleButton value="FAIL" sx={{ fontSize: '0.6rem', px: 0.75, py: 0.25, color: 'error.main', '&.Mui-selected': { bgcolor: 'error.light', color: 'error.contrastText' } }}>
                        Delam.
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </TableCell>

                  {/* Visual variation (cornerB) */}
                  <TableCell align="center" sx={{ px: 0.5 }}>
                    <ToggleButtonGroup
                      exclusive size="small"
                      value={visualVariation ?? null}
                      onChange={(_, val) => { if (val !== null) handleCardField(ce.cardNumber, { cornerB: val }); }}
                    >
                      <ToggleButton value="PASS" sx={{ fontSize: '0.6rem', px: 0.75, py: 0.25, color: 'success.main', '&.Mui-selected': { bgcolor: 'success.light', color: 'success.contrastText' } }}>
                        None
                      </ToggleButton>
                      <ToggleButton value="FAIL" sx={{ fontSize: '0.6rem', px: 0.75, py: 0.25, color: 'error.main', '&.Mui-selected': { bgcolor: 'error.light', color: 'error.contrastText' } }}>
                        Change
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </TableCell>

                  {/* IC functional (cornerC) */}
                  <TableCell align="center" sx={{ px: 0.5 }}>
                    <ToggleButtonGroup
                      exclusive size="small"
                      value={icFunctional ?? null}
                      onChange={(_, val) => { if (val !== null) handleCardField(ce.cardNumber, { cornerC: val }); }}
                    >
                      <ToggleButton value="PASS" sx={{ fontSize: '0.6rem', px: 0.75, py: 0.25, color: 'success.main', '&.Mui-selected': { bgcolor: 'success.light', color: 'success.contrastText' } }}>
                        PASS
                      </ToggleButton>
                      <ToggleButton value="FAIL" sx={{ fontSize: '0.6rem', px: 0.75, py: 0.25, color: 'error.main', '&.Mui-selected': { bgcolor: 'error.light', color: 'error.contrastText' } }}>
                        FAIL
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </TableCell>

                  {/* Biometric functional (cornerD) — only for biometric cards */}
                  {isBiometric && (
                    <TableCell align="center" sx={{ px: 0.5 }}>
                      <ToggleButtonGroup
                        exclusive size="small"
                        value={bioFunctional ?? null}
                        onChange={(_, val) => { if (val !== null) handleCardField(ce.cardNumber, { cornerD: val }); }}
                      >
                        <ToggleButton value="PASS" sx={{ fontSize: '0.6rem', px: 0.6, py: 0.25, color: 'success.main', '&.Mui-selected': { bgcolor: 'success.light', color: 'success.contrastText' } }}>
                          PASS
                        </ToggleButton>
                        <ToggleButton value="FAIL" sx={{ fontSize: '0.6rem', px: 0.6, py: 0.25, color: 'error.main', '&.Mui-selected': { bgcolor: 'error.light', color: 'error.contrastText' } }}>
                          FAIL
                        </ToggleButton>
                        <ToggleButton value="NO TEST" sx={{ fontSize: '0.6rem', px: 0.6, py: 0.25, '&.Mui-selected': { bgcolor: 'grey.300' } }}>
                          N/T
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </TableCell>
                  )}

                  {/* Notes */}
                  <TableCell align="center" sx={{ pt: 1 }}>
                    <TextField
                      size="small"
                      placeholder="None"
                      value={ce.visualNote ?? ''}
                      onChange={e => onUpdateCardEntry(def.id, ce.cardNumber, { visualNote: e.target.value })}
                      inputProps={{ style: { fontSize: '0.7rem', padding: '2px 6px' } }}
                      sx={{ width: 80 }}
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

      {/* ── Biometric retest note ── */}
      {isBiometric && !isBiometricRetest && (
        <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
          <Typography variant="caption">
            <strong>Biometric cards:</strong> If any card fails the IC Functional or Biometric check at the
            standard temperature, the vendor must obtain a CSI letter and retest at 55 °C and 50 °C.
            Use the Test Stage selector above to record those results separately.
          </Typography>
        </Alert>
      )}

      {/* ── Pass criteria ── */}
      <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
        <Typography variant="caption">
          {isHeatOnly ? (
            <>
              <strong>Pass criteria (#3045# / #8110#):</strong> Card shall remain fully functional after
              heat exposure at the temperature defined in #3045#. No warpage {'>'} 10 mm, no delamination,
              no significant visual variation, no loss of functionality.
              &nbsp;Mechanical deformation measured under influence of gravity (external method, ISO/IEC 10373-1).
              &nbsp;Sampling must consider card constructions (layers, materials, process flow) — artwork and ICM variants not required.
              &nbsp;Compliance to #3044# implies compliance to #3045#.
            </>
          ) : (
            <>
              <strong>Pass criteria (#3044# / #8091#):</strong> Card shall remain fully functional after
              exposure. No warpage {'>'} 10 mm, no delamination, no significant visual variation, no loss of
              specified functionality.
              &nbsp;Apparatus: climatic chamber 23–100 °C ± 3 °C, 5–95 % r.H. ± 5 %.
              &nbsp;For ICM testing (#8092#): 85 °C ± 2 °C / 85 % r.H. ± 3 % r.H.
            </>
          )}
        </Typography>
      </Alert>

      {/* ── Card construction ref (#3045# only) ── */}
      {isHeatOnly && (
        <TextField
          label="Card Construction Reference"
          size="small"
          fullWidth
          multiline
          rows={2}
          value={extra.cardConstructionRef ?? ''}
          onChange={e => updateExtra({ cardConstructionRef: e.target.value })}
          helperText="Layers, materials, process flow, parameters — required for #3045# sampling record"
          sx={{ mb: 2 }}
        />
      )}

      {/* ── Job notes ── */}
      <TextField
        label="Job Notes"
        size="small"
        fullWidth
        multiline
        rows={3}
        value={meta.jobNotes ?? ''}
        onChange={e => updateMeta({ jobNotes: e.target.value })}
        helperText={isHeatOnly
          ? 'Record temperature applied, duration, gravity orientation, and any anomalies.'
          : 'Record exposure profile used, chamber conditions observed, and any anomalies.'}
      />
    </Box>
  );
};

export default TempHumidityExposureForm;
