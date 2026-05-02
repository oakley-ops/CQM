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
  Checkbox,
  Divider,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
} from '@mui/material';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';

interface SoftwareLoadFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
}

interface SoftwareLoadExtra {
  swName?:                string;
  swVersion?:             string;
  swChecksum?:            string;
  loadingToolSerial?:     string;
  loadingToolCalUntil?:   string;
  expectedATR?:           string;
  swSelectionVerifiedBy?: string;
  swSelectionVerified?:   boolean;
  qualificationRunDone?:  boolean;
  packagingUniqueId?:     string;
  swStorageSecure?:       boolean;
}

type SubResult = 'PASS' | 'FAIL' | undefined;
type OptResult = 'PASS' | 'FAIL' | 'NO TEST' | undefined;

function computeCardPass(
  swSelectionVerified: boolean | undefined,
  atr: SubResult,
  functional: SubResult,
): boolean | undefined {
  if (!swSelectionVerified || !atr || !functional) return undefined;
  return atr === 'PASS' && functional === 'PASS';
}

const SoftwareLoadForm: React.FC<SoftwareLoadFormProps> = ({
  def, entry, onUpdateEntry, onUpdateCardEntry,
}) => {
  const cardEntries = entry.cardEntries ?? [];
  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
  const extra = (meta.extraData ?? {}) as SoftwareLoadExtra;

  const swVerified = extra.swSelectionVerified ?? false;

  const updateMeta = (patch: Partial<TestEntryMetadata>) =>
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });

  const updateExtra = (patch: Partial<SoftwareLoadExtra>) =>
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
      swVerified,
      merged.cornerA as SubResult,
      merged.cornerB as SubResult,
    );
    onUpdateCardEntry(def.id, cardNumber, { ...updates, passStatus: pass, isValid: pass !== undefined });
  };

  return (
    <Box>
      {/* ── Title ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
        Loading of Software into IC / ICM / IL / Card (#2515#)
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Vendor-defined test method · 1/Batch · Before personalization
      </Typography>

      {!swVerified && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="caption">
            <strong>SW selection not yet verified.</strong> An independent staff member must confirm the
            correct SW was selected before loading. Check the verification box below to unlock per-card entry.
          </Typography>
        </Alert>
      )}

      {/* ── Section A: Batch-level process verification ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
        Batch-Level Process Verification
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Technician / Operator" size="small" fullWidth
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
            label="# of Samples Tested" size="small" fullWidth type="number"
            value={entry.sampleCount ?? 1}
            onChange={e => handleCountChange(e.target.value)}
            inputProps={{ min: 1, max: 200 }}
          />
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* ── Section B: Process confirmations ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
        Process Confirmations
      </Typography>

      <Grid container spacing={1} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <Box sx={{ border: '1px solid', borderColor: swVerified ? 'success.light' : 'warning.light', borderRadius: 1, p: 1.5, bgcolor: swVerified ? 'success.50' : 'warning.50' }}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={swVerified}
                  onChange={e => updateExtra({ swSelectionVerified: e.target.checked })}
                  color={swVerified ? 'success' : 'warning'}
                />
              }
              label={
                <Typography variant="body2" fontWeight={500}>
                  SW selection independently verified before first device load
                </Typography>
              }
            />
            <TextField
              label="Verified by (independent staff member)" size="small" fullWidth
              value={extra.swSelectionVerifiedBy ?? ''}
              onChange={e => updateExtra({ swSelectionVerifiedBy: e.target.value })}
              disabled={!swVerified}
              sx={{ mt: 1 }}
              helperText="Must be independent from the operator who selected the SW"
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={extra.qualificationRunDone ?? false}
                  onChange={e => updateExtra({ qualificationRunDone: e.target.checked })}
                />
              }
              label={
                <Typography variant="body2" fontWeight={500}>
                  SW qualification run completed before volume loading
                </Typography>
              }
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, pl: 3.5 }}>
              Required each time the vendor processes the SW. Confirms SW is as intended.
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={extra.swStorageSecure ?? false}
                  onChange={e => updateExtra({ swStorageSecure: e.target.checked })}
                />
              }
              label={<Typography variant="body2">SW storage security confirmed (backup/restore in place)</Typography>}
              sx={{ mt: 1 }}
            />
          </Box>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* ── Section C: Per-card sample table ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
        Per-Card Sample Results
      </Typography>
      {extra.expectedATR && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Expected ATR: <strong>{extra.expectedATR}</strong> — compare against each card reading below
        </Typography>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#e8eaf6' }}>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Card ID#</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 110 }}>
                ATR / ATS
                <Typography variant="caption" display="block" color="text.secondary" fontWeight="normal">
                  Matches expected
                </Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 150 }}>
                ATR Read (hex)
                <Typography variant="caption" display="block" color="text.secondary" fontWeight="normal">
                  Actual value from device
                </Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 120 }}>
                Functionality Test
                <Typography variant="caption" display="block" color="text.secondary" fontWeight="normal">
                  Electrical test program
                </Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 100 }}>
                Packaging ID
                <Typography variant="caption" display="block" color="text.secondary" fontWeight="normal">
                  Confirmed on unit
                </Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Notes</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Result</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cardEntries.map(ce => {
              const atr = ce.cornerA as SubResult;
              const functional = ce.cornerB as SubResult;
              const packaging = ce.cornerC as OptResult;
              return (
                <TableRow
                  key={ce.cardNumber}
                  sx={{ '&:hover': { backgroundColor: 'action.hover' }, verticalAlign: 'top',
                    opacity: swVerified ? 1 : 0.45 }}
                >
                  <TableCell sx={{ fontWeight: 500, whiteSpace: 'nowrap', pt: 1.5 }}>
                    Card {String(ce.cardNumber).padStart(2, '0')}
                  </TableCell>

                  {/* ATR match */}
                  <TableCell align="center" sx={{ px: 0.5 }}>
                    <ToggleButtonGroup
                      exclusive size="small"
                      value={atr ?? null}
                      disabled={!swVerified}
                      onChange={(_, val) => { if (val !== null) handleCardField(ce.cardNumber, { cornerA: val }); }}
                    >
                      <ToggleButton value="PASS" sx={{ fontSize: '0.6rem', px: 0.75, py: 0.25, color: 'success.main', '&.Mui-selected': { bgcolor: 'success.light', color: 'success.contrastText' } }}>
                        Match
                      </ToggleButton>
                      <ToggleButton value="FAIL" sx={{ fontSize: '0.6rem', px: 0.75, py: 0.25, color: 'error.main', '&.Mui-selected': { bgcolor: 'error.light', color: 'error.contrastText' } }}>
                        Mismatch
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </TableCell>

                  {/* ATR actual value */}
                  <TableCell align="center" sx={{ px: 0.5, pt: 1 }}>
                    <TextField
                      size="small"
                      placeholder="e.g. 3B 6F..."
                      value={ce.cornerAExtent ?? ''}
                      disabled={!swVerified}
                      onChange={e => onUpdateCardEntry(def.id, ce.cardNumber, { cornerAExtent: e.target.value })}
                      inputProps={{ style: { fontSize: '0.7rem', padding: '2px 6px', fontFamily: 'monospace' } }}
                      sx={{ width: 148 }}
                    />
                  </TableCell>

                  {/* Functionality test */}
                  <TableCell align="center" sx={{ px: 0.5 }}>
                    <ToggleButtonGroup
                      exclusive size="small"
                      value={functional ?? null}
                      disabled={!swVerified}
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

                  {/* Packaging ID confirmed */}
                  <TableCell align="center" sx={{ px: 0.5 }}>
                    <ToggleButtonGroup
                      exclusive size="small"
                      value={packaging ?? null}
                      disabled={!swVerified}
                      onChange={(_, val) => { if (val !== null) onUpdateCardEntry(def.id, ce.cardNumber, { cornerC: val }); }}
                    >
                      <ToggleButton value="PASS" sx={{ fontSize: '0.6rem', px: 0.6, py: 0.25, color: 'success.main', '&.Mui-selected': { bgcolor: 'success.light', color: 'success.contrastText' } }}>
                        OK
                      </ToggleButton>
                      <ToggleButton value="FAIL" sx={{ fontSize: '0.6rem', px: 0.6, py: 0.25, color: 'error.main', '&.Mui-selected': { bgcolor: 'error.light', color: 'error.contrastText' } }}>
                        Fail
                      </ToggleButton>
                      <ToggleButton value="NO TEST" sx={{ fontSize: '0.6rem', px: 0.6, py: 0.25, '&.Mui-selected': { bgcolor: 'grey.300' } }}>
                        N/T
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </TableCell>

                  {/* Notes */}
                  <TableCell align="center" sx={{ pt: 1 }}>
                    <TextField
                      size="small"
                      placeholder="None"
                      value={ce.visualNote ?? ''}
                      disabled={!swVerified}
                      onChange={e => onUpdateCardEntry(def.id, ce.cardNumber, { visualNote: e.target.value })}
                      inputProps={{ style: { fontSize: '0.7rem', padding: '2px 6px' } }}
                      sx={{ width: 90 }}
                    />
                  </TableCell>

                  {/* Overall result */}
                  <TableCell align="center" sx={{ pt: 1.5 }}>
                    {!swVerified ? (
                      <Typography variant="caption" color="warning.main">—</Typography>
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
          <strong>Pass criteria (#2515#):</strong> SW selection verified by an independent staff member
          before first load. Correct ATR verified after loading. Loaded ICM passes full electrical
          functionality test. Device packaging carries a unique identifier for the SW + Device combination.
          &nbsp;SW storage shall protect against unauthorized disclosure, modification, and loss.
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
        helperText="Record SW qualification status, any ATR mismatches, loading errors, or deviations from procedure."
      />
    </Box>
  );
};

export default SoftwareLoadForm;
