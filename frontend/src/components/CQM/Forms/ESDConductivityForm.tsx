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
  Alert,
  MenuItem,
} from '@mui/material';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';

interface ESDConductivityFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
}

interface ESDConductivityExtra {
  meterSerial?:        string;
  oscilloscopeSerial?: string;
  equipCalUntil?:      string;
  testMethod?:         string;          // '#8250#' | '#8260#'
  dischargeVoltageKv?: number | string; // default 8
  calQ0?:              number | string; // calibration Q 0% (nC)
  calQ100?:            number | string; // calibration Q 100% (nC)
  conformityAssumed?:  boolean;
  conformityReason?:   string;
}

interface ESDScenarios {
  s1?: string; s2?: string; s3?: string;
  s4?: string; s5?: string; s6?: string;
}

const LIMIT_1_TO_4 = 15;
const LIMIT_5_TO_6 = 25;

const SCENARIOS = [
  { key: 's1' as const, label: 'Scenario 1', group: '1–4' },
  { key: 's2' as const, label: 'Scenario 2', group: '1–4' },
  { key: 's3' as const, label: 'Scenario 3', group: '1–4' },
  { key: 's4' as const, label: 'Scenario 4', group: '1–4' },
  { key: 's5' as const, label: 'Scenario 5', group: '5–6' },
  { key: 's6' as const, label: 'Scenario 6', group: '5–6' },
];

function encodeScenarios(s: ESDScenarios): string {
  return JSON.stringify({ scenarios: s });
}

function decodeScenarios(notes?: string): ESDScenarios {
  try {
    const parsed = JSON.parse(notes ?? '{}') as { scenarios?: ESDScenarios };
    return parsed.scenarios ?? {};
  } catch {
    return {};
  }
}

function computeESDPass(s: ESDScenarios): boolean | undefined {
  const vals = [s.s1, s.s2, s.s3, s.s4, s.s5, s.s6];
  if (vals.some(v => v === undefined || v === '')) return undefined;
  const nums = vals.map(v => parseFloat(v as string));
  if (nums.some(isNaN)) return undefined;
  const group1Pass = nums.slice(0, 4).every(v => v <= LIMIT_1_TO_4);
  const group2Pass = nums.slice(4, 6).every(v => v <= LIMIT_5_TO_6);
  return group1Pass && group2Pass;
}

function scenarioLimit(key: keyof ESDScenarios): number {
  return key === 's5' || key === 's6' ? LIMIT_5_TO_6 : LIMIT_1_TO_4;
}

const ESDConductivityForm: React.FC<ESDConductivityFormProps> = ({
  def, entry, onUpdateEntry, onUpdateCardEntry,
}) => {
  const cardEntries = entry.cardEntries ?? [];
  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
  const extra = (meta.extraData ?? {}) as ESDConductivityExtra;

  const calQ0 = parseFloat(String(extra.calQ0 ?? ''));
  const calQ100 = parseFloat(String(extra.calQ100 ?? ''));
  const calReady = !isNaN(calQ0) && !isNaN(calQ100);

  const updateMeta = (patch: Partial<TestEntryMetadata>) =>
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });

  const updateExtra = (patch: Partial<ESDConductivityExtra>) =>
    updateMeta({ extraData: { ...extra, ...patch } });

  const handleCountChange = (raw: string) => {
    const n = Math.max(1, parseInt(raw) || 1);
    const existing = entry.cardEntries ?? [];
    const next: CardEntryData[] = n > existing.length
      ? [...existing, ...Array.from({ length: n - existing.length }, (_, i) => ({
          sampleCardId: 0,
          cardNumber: existing.length + i + 1,
          passStatus: undefined,
          notes: encodeScenarios({}),
          isValid: false,
        }))]
      : existing.slice(0, n);
    onUpdateEntry(def.id, { sampleCount: n, cardEntries: next });
  };

  const handleConformityAssumed = (checked: boolean) => {
    updateExtra({ conformityAssumed: checked });
    if (checked) {
      onUpdateEntry(def.id, {
        cardEntries: cardEntries.map(ce => ({ ...ce, passStatus: true, isValid: true })),
      });
    }
  };

  const handleScenario = (cardNumber: number, key: keyof ESDScenarios, value: string) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const s = { ...decodeScenarios(ce?.notes), [key]: value };
    const pass = computeESDPass(s);
    onUpdateCardEntry(def.id, cardNumber, {
      notes: encodeScenarios(s),
      passStatus: pass,
      isValid: pass !== undefined,
    });
  };

  return (
    <Box>
      {/* ── Title ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
        ESD Conductivity (ESC) — ISO/IEC 10373-1 (#8250# / #8260#)
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Test method {extra.testMethod ?? '#8250#'} · Discharge voltage: {extra.dischargeVoltageKv ?? 8} kV
        &nbsp;·&nbsp; Qualification only · Min sample size: 5 · Monitoring: not required
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="caption">
          <strong>Thresholds:</strong> Scenarios 1–4 ≤ {LIMIT_1_TO_4} % · Scenarios 5–6 ≤ {LIMIT_5_TO_6} %
          (relative charge Qₙ% at {extra.dischargeVoltageKv ?? 8} kV).
          &nbsp;<strong>Conformity may be assumed</strong> if all CHD components are known safe at 8 kV,
          or if the component is a homogeneous material that passes #8260#.
        </Typography>
      </Alert>

      {/* ── Section A: Equipment & header ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={extra.conformityAssumed ?? false}
                onChange={e => handleConformityAssumed(e.target.checked)}
              />
            }
            label={
              <Typography variant="body2">
                Conformity assumed — no testing required (all cards set to PASS)
              </Typography>
            }
          />
        </Grid>

        {extra.conformityAssumed && (<>
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
            label="Temperature (°C)" size="small" fullWidth type="number"
            value={meta.temperatureC ?? ''}
            onChange={e => updateMeta({ temperatureC: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Relative Humidity (% r.H.)" size="small" fullWidth type="number"
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
            helperText="Qualification minimum: 5"
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
        </>)}
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* ── Section B: Per-card results ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
        Per-Card Results — Relative Charge Qₙ% per Contact Scenario
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Enter Qₙ% (0–100) for each scenario. Scenarios 1–4 must be ≤ {LIMIT_1_TO_4} %; scenarios 5–6 ≤ {LIMIT_5_TO_6} %.
      </Typography>

      {!calReady && !extra.conformityAssumed && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="caption">
            Fill in calibration values (Q₀% and Q₁₀₀%) before recording per-card results.
          </Typography>
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f3e5f5' }}>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Card ID#</TableCell>
              {SCENARIOS.map(sc => (
                <TableCell key={sc.key} align="center" sx={{ fontWeight: 'bold', minWidth: 90 }}>
                  {sc.label}
                  <Typography variant="caption" display="block" color="text.secondary" fontWeight="normal">
                    ≤ {scenarioLimit(sc.key)} %
                  </Typography>
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Result</TableCell>
            </TableRow>
            {/* Limit band labels */}
            <TableRow sx={{ bgcolor: '#fafafa' }}>
              <TableCell />
              <TableCell colSpan={4} align="center">
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                  Group 1–4 — limit {LIMIT_1_TO_4} %
                </Typography>
              </TableCell>
              <TableCell colSpan={2} align="center">
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                  Group 5–6 — limit {LIMIT_5_TO_6} %
                </Typography>
              </TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {cardEntries.map(ce => {
              const s = decodeScenarios(ce.notes);
              return (
                <TableRow
                  key={ce.cardNumber}
                  sx={{ '&:hover': { backgroundColor: 'action.hover' }, verticalAlign: 'middle' }}
                >
                  <TableCell sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Card {String(ce.cardNumber).padStart(2, '0')}
                  </TableCell>

                  {SCENARIOS.map(sc => {
                    const raw = s[sc.key] ?? '';
                    const num = parseFloat(raw);
                    const limit = scenarioLimit(sc.key);
                    const hasValue = raw !== '' && !isNaN(num);
                    const fails = hasValue && num > limit;
                    return (
                      <TableCell key={sc.key} align="center" sx={{ px: 0.5 }}>
                        <TextField
                          size="small" type="number"
                          placeholder="Qₙ%"
                          value={raw}
                          onChange={e => handleScenario(ce.cardNumber, sc.key, e.target.value)}
                          disabled={!calReady && !extra.conformityAssumed}
                          error={fails}
                          inputProps={{
                            min: 0, max: 100, step: 0.1,
                            style: { fontSize: '0.75rem', padding: '3px 4px', textAlign: 'center', width: 52 },
                          }}
                          sx={{ width: 68 }}
                        />
                        {hasValue && (
                          <Typography
                            variant="caption"
                            display="block"
                            sx={{ fontSize: '0.6rem', color: fails ? 'error.main' : 'success.main', mt: 0.25 }}
                          >
                            {fails ? `> ${limit}%` : `≤ ${limit}%`}
                          </Typography>
                        )}
                      </TableCell>
                    );
                  })}

                  <TableCell align="center">
                    {extra.conformityAssumed ? (
                      <Chip label="ASSUMED" size="small" sx={{ bgcolor: 'info.light', fontWeight: 'bold', minWidth: 72, fontSize: '0.6rem' }} />
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
          <strong>Pass criteria (#3050# / #8250#):</strong> Qₙ% ≤ {LIMIT_1_TO_4} % for scenarios 1–4 and
          ≤ {LIMIT_5_TO_6} % for scenarios 5–6 at {extra.dischargeVoltageKv ?? 8} kV.
          &nbsp;Test report shall include: discharge voltage, calibration charges Q₀% and Q₁₀₀%, and Qₙ% per scenario.
          &nbsp;Conformity assumed if all CHD components are known safe at 8 kV or component passes #8260#.
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
        helperText="Record discharge voltage used, calibration procedure, any anomalies or contact scenario deviations."
      />
    </Box>
  );
};

export default ESDConductivityForm;
