import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Chip,
  FormControlLabel,
  Checkbox,
  Divider,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
} from '@mui/material';
import { CheckCircle as PassIcon } from '@mui/icons-material';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';

interface UseConditionsFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
}

interface UseConditionsExtra {
  productSpecRef?:           string;
  specStatesConformity?:     boolean;
  conformityByConstruction?: boolean;
  conditionsDeviate?:        boolean;
  deviatingConditions?:      string;
  guidanceProvided?:         boolean;
  guidanceDocRef?:           string;
}

function computePass(extra: UseConditionsExtra): boolean | undefined {
  if (!extra.specStatesConformity || !extra.conformityByConstruction) return undefined;
  if (!extra.productSpecRef?.trim()) return undefined;
  if (extra.conditionsDeviate === undefined) return undefined;
  if (extra.conditionsDeviate && !extra.guidanceProvided) return undefined;
  return true;
}

const UseConditionsForm: React.FC<UseConditionsFormProps> = ({
  def, entry, onUpdateEntry,
}) => {
  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
  const extra = (meta.extraData ?? {}) as UseConditionsExtra;

  const updateMeta = (patch: Partial<TestEntryMetadata>) =>
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });

  const updateExtra = (patch: Partial<UseConditionsExtra>) => {
    const nextExtra = { ...extra, ...patch };
    const pass = computePass(nextExtra);
    onUpdateEntry(def.id, {
      specializedMetadata: { ...meta, extraData: nextExtra },
      passStatus: pass,
      isValid: pass !== undefined,
    });
  };

  // Sync pass/fail on mount in case entry was pre-populated
  useEffect(() => {
    const pass = computePass(extra);
    if (pass !== entry.passStatus) {
      onUpdateEntry(def.id, { passStatus: pass, isValid: pass !== undefined });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pass = computePass(extra);
  const bothBoxes = extra.specStatesConformity && extra.conformityByConstruction;

  return (
    <Box>
      {/* ── Title ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
        Use Conditions (#3048#)
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        ICC-REQ § 10.1.9 · Conformity by construction · No active testing required
      </Typography>

      <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
        <Typography variant="caption">
          No sample testing is required for this requirement. Conformity is achieved by construction
          and stated in the product specification. Complete the declaration below to record conformity.
        </Typography>
      </Alert>

      {/* ── Section A: Conformity Declaration ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
        Conformity Declaration
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4} md={3}>
          <TextField
            label="Date" size="small" fullWidth type="date"
            value={meta.testDate ?? ''}
            onChange={e => updateMeta({ testDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      </Grid>

      <Paper
        variant="outlined"
        sx={{
          p: 2, mb: 2,
          borderColor: bothBoxes ? 'success.light' : 'warning.light',
          bgcolor: bothBoxes ? 'success.50' : 'warning.50',
        }}
      >
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={extra.specStatesConformity ?? false}
              onChange={e => updateExtra({ specStatesConformity: e.target.checked })}
              color="success"
            />
          }
          label={
            <Typography variant="body2" fontWeight={500}>
              The product specification states conformity with use and storage conditions
            </Typography>
          }
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={extra.conformityByConstruction ?? false}
              onChange={e => updateExtra({ conformityByConstruction: e.target.checked })}
              color="success"
            />
          }
          label={
            <Typography variant="body2" fontWeight={500}>
              Conformity is achieved by construction
            </Typography>
          }
          sx={{ mt: 0.5 }}
        />
        {bothBoxes && extra.productSpecRef?.trim() && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, pl: 0.5 }}>
            <PassIcon fontSize="small" color="success" />
            <Typography variant="caption" color="success.dark">
              Declaration complete — conformity recorded
            </Typography>
          </Box>
        )}
      </Paper>

      <Divider sx={{ mb: 2 }} />

      {/* ── Section B: Use Conditions Assessment ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
        Use Conditions Assessment
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Where conditions of use or storage deviate from what a card holder would normally expect,
        the Vendor shall provide adequate guidance.
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="body2">
          Do conditions of use or storage deviate from normal card-holder expectations?
        </Typography>
        <ToggleButtonGroup
          exclusive size="small"
          value={extra.conditionsDeviate === undefined ? null : extra.conditionsDeviate}
          onChange={(_, val) => {
            if (val === null) return;
            updateExtra({ conditionsDeviate: val as boolean });
          }}
        >
          <ToggleButton
            value={true}
            sx={{
              fontSize: '0.7rem', px: 1.5, py: 0.4,
              '&.Mui-selected': { bgcolor: 'warning.light', color: 'warning.contrastText' },
            }}
          >
            Yes
          </ToggleButton>
          <ToggleButton
            value={false}
            sx={{
              fontSize: '0.7rem', px: 1.5, py: 0.4,
              '&.Mui-selected': { bgcolor: 'success.light', color: 'success.contrastText' },
            }}
          >
            No
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {extra.conditionsDeviate === true && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: 'warning.light' }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Description of deviating conditions" size="small" fullWidth multiline rows={3}
                value={extra.deviatingConditions ?? ''}
                onChange={e => updateExtra({ deviatingConditions: e.target.value })}
                helperText="e.g. extended temperature range, humidity limits, UV exposure, specific handling"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={extra.guidanceProvided ?? false}
                    onChange={e => updateExtra({ guidanceProvided: e.target.checked })}
                    color="success"
                  />
                }
                label={
                  <Typography variant="body2" fontWeight={500}>
                    Adequate guidance has been provided to card holders regarding deviating conditions
                  </Typography>
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Guidance document reference" size="small" fullWidth
                value={extra.guidanceDocRef ?? ''}
                onChange={e => updateExtra({ guidanceDocRef: e.target.value })}
                helperText="e.g. user manual version, data sheet, product insert"
                disabled={!extra.guidanceProvided}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {extra.conditionsDeviate === false && (
        <Alert severity="success" sx={{ mb: 2, py: 0.5 }}>
          <Typography variant="caption">
            No deviating conditions — no additional guidance required.
          </Typography>
        </Alert>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* ── Overall result ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="body2" fontWeight={500}>Overall Result:</Typography>
        {pass === undefined ? (
          <Chip label="Incomplete" size="small" sx={{ bgcolor: 'grey.200', color: 'text.secondary' }} />
        ) : (
          <Chip label="PASS — Conformity Declared" color="success" size="small" sx={{ fontWeight: 'bold' }} />
        )}
      </Box>

      {/* ── Pass criteria ── */}
      <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
        <Typography variant="caption">
          <strong>Pass criteria (#3048#):</strong> Product specification states conformity and conformity
          is achieved by construction. Where conditions deviate from normal card-holder expectations,
          adequate guidance shall be provided by the Vendor.
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
        helperText="Record any relevant notes about use conditions, deviations, or guidance provided."
      />
    </Box>
  );
};

export default UseConditionsForm;
