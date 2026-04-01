import React, { useState, useEffect, useCallback } from 'react';
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
  Button,
} from '@mui/material';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';

interface SolidityFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
}

interface SolidityExtra {
  testDate?: string;
  equipmentModelId?: string;
  adhesionWeightId?: string;
  adhesionWeightCalUntil?: string;
  envLoggerCalUntil?: string;
  preExposureHandCheck?: boolean;
  postExposureHandCheck?: boolean;
  postExposureVisualInspection?: boolean;
  // Laminator parameters
  hotTempC?: number;
  hotTempF?: number;
  hotPressureBar?: number;
  hotDwellTime?: string;
  coldTempC?: number;
  coldTempF?: number;
  coldPressureBar?: number;
  coldDwellTime?: string;
  laminatorId?: string;
  numCycles?: number;
  overlayMaterial?: string;
  laminatorNotes?: string;
}


function formatDwellTime(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  return digits;
}

const CRITERIA = [
  { key: 'a', label: 'a) delamination' },
  { key: 'b', label: 'b) discoloration or colour transfer' },
  { key: 'c', label: 'c) changes to surface finish' },
  { key: 'd', label: 'd) transfer of material from one card to another' },
  { key: 'e', label: 'e) deformation' },
  { key: 'f', label: 'f) The cards shall be easily separated by hand.' },
] as const;

type CriterionKey = typeof CRITERIA[number]['key'];

// cardNumber → { a: bool|undef, b: ..., ... }
type CriteriaMatrix = Map<number, Record<CriterionKey, boolean | undefined>>;

function blankCriteria(): Record<CriterionKey, boolean | undefined> {
  return { a: undefined, b: undefined, c: undefined, d: undefined, e: undefined, f: undefined };
}

function cardPassStatus(row: Record<CriterionKey, boolean | undefined>): boolean | undefined {
  const vals = CRITERIA.map(c => row[c.key]);
  if (vals.every(v => v === true)) return true;
  if (vals.some(v => v === false)) return false;
  return undefined;
}

function matrixFromCardEntries(cardEntries: CardEntryData[]): CriteriaMatrix {
  const m: CriteriaMatrix = new Map();
  cardEntries.forEach(ce => {
    try {
      const parsed = ce.notes ? JSON.parse(ce.notes) : {};
      m.set(ce.cardNumber, { ...blankCriteria(), ...parsed });
    } catch {
      m.set(ce.cardNumber, blankCriteria());
    }
  });
  return m;
}

const SolidityForm: React.FC<SolidityFormProps> = ({ def, entry, onUpdateEntry, onUpdateCardEntry }) => {
  const cardEntries = entry.cardEntries ?? [];
  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
  const extra: SolidityExtra = (meta.extraData ?? {}) as SolidityExtra;

  const [matrix, setMatrix] = useState<CriteriaMatrix>(() => matrixFromCardEntries(cardEntries));

  // Re-sync matrix when card count changes (cards added/removed)
  useEffect(() => {
    setMatrix(prev => {
      const next: CriteriaMatrix = new Map();
      cardEntries.forEach(ce => {
        next.set(ce.cardNumber, prev.get(ce.cardNumber) ?? blankCriteria());
      });
      return next;
    });
  }, [cardEntries.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateMeta = (patch: Partial<TestEntryMetadata>) => {
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });
  };

  const updateExtra = (patch: Partial<SolidityExtra>) => {
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
          notes: JSON.stringify(blankCriteria()),
          isValid: false,
        })),
      ];
    } else {
      next = existing.slice(0, n);
    }
    onUpdateEntry(def.id, { sampleCount: n, cardEntries: next });
  };

  const handleCellToggle = useCallback((cardNumber: number, key: CriterionKey) => {
    setMatrix(prev => {
      const next = new Map(prev);
      const row = { ...(next.get(cardNumber) ?? blankCriteria()) };
      // cycle: undefined → true → false → undefined
      if (row[key] === undefined) row[key] = true;
      else if (row[key] === true) row[key] = false;
      else row[key] = undefined;
      next.set(cardNumber, row);

      const pass = cardPassStatus(row);
      const allFilled = CRITERIA.every(c => row[c.key] !== undefined);
      onUpdateCardEntry(def.id, cardNumber, {
        passStatus: pass,
        notes: JSON.stringify(row),
        isValid: allFilled,
      });

      return next;
    });
  }, [def.id, onUpdateCardEntry]);

  const renderCellChip = (cardNumber: number, key: CriterionKey) => {
    const row = matrix.get(cardNumber) ?? blankCriteria();
    const val = row[key];
    if (val === undefined) {
      return (
        <Chip
          label="—"
          size="small"
          variant="outlined"
          onClick={() => handleCellToggle(cardNumber, key)}
          sx={{ minWidth: 60, cursor: 'pointer' }}
        />
      );
    }
    return (
      <Chip
        label={val ? 'PASS' : 'FAIL'}
        size="small"
        color={val ? 'success' : 'error'}
        onClick={() => handleCellToggle(cardNumber, key)}
        sx={{ minWidth: 60, fontWeight: 'bold', cursor: 'pointer' }}
      />
    );
  };

  const renderHeaderCheck = (
    label: string,
    value: boolean | undefined,
    onChange: (v: boolean) => void,
  ) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant={value === true ? 'contained' : 'outlined'}
          color="success"
          size="small"
          onClick={() => onChange(true)}
          sx={{ minWidth: 80, fontWeight: 'bold' }}
        >
          PASS
        </Button>
        <Button
          variant={value === false ? 'contained' : 'outlined'}
          color="error"
          size="small"
          onClick={() => onChange(false)}
          sx={{ minWidth: 80, fontWeight: 'bold' }}
        >
          FAIL
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box>
      {/* Title */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
        Card Testing for Solidity-Adhesion or Blocking Test Log (CQM 2.19, Section 9.1.26)
      </Typography>

      {/* ── Section A: Header metadata ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Left column */}
        <Grid item xs={12} md={7}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Test Method" size="small" fullWidth
                value="#8130#"
                InputProps={{ readOnly: true }}
                helperText="Fixed: #8130#"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Sampled By" size="small" fullWidth
                value={meta.sampledBy ?? ''}
                onChange={e => updateMeta({ sampledBy: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="# of Samples Tested" size="small" fullWidth type="number"
                value={entry.sampleCount ?? 1}
                onChange={e => handleCountChange(e.target.value)}
                inputProps={{ min: 1, max: 50 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Technician" size="small" fullWidth
                value={meta.technician ?? ''}
                onChange={e => updateMeta({ technician: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Time" size="small" fullWidth type="time"
                value={meta.testTime ?? ''}
                onChange={e => updateMeta({ testTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Date" size="small" fullWidth type="date"
                value={extra.testDate ?? ''}
                onChange={e => updateExtra({ testDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Temperature (°C)" size="small" fullWidth type="number"
                value={meta.temperatureC ?? ''}
                onChange={e => updateMeta({ temperatureC: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Relative Humidity (%)" size="small" fullWidth type="number"
                value={meta.humidityPct ?? ''}
                onChange={e => updateMeta({ humidityPct: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Equipment Model & ID#" size="small" fullWidth
                value={extra.equipmentModelId ?? ''}
                onChange={e => updateExtra({ equipmentModelId: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Calibration Valid Until" size="small" fullWidth type="date"
                value={meta.calibrationValidUntil ?? ''}
                onChange={e => updateMeta({ calibrationValidUntil: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Adhesion and Blocking Weight ID#" size="small" fullWidth
                value={extra.adhesionWeightId ?? ''}
                onChange={e => updateExtra({ adhesionWeightId: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Calibration Valid Until (Weight)" size="small" fullWidth type="date"
                value={extra.adhesionWeightCalUntil ?? ''}
                onChange={e => updateExtra({ adhesionWeightCalUntil: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Environmental Logger ID#" size="small" fullWidth
                value={meta.envLoggerId ?? ''}
                onChange={e => updateMeta({ envLoggerId: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Calibration Valid Until (Logger)" size="small" fullWidth type="date"
                value={extra.envLoggerCalUntil ?? ''}
                onChange={e => updateExtra({ envLoggerCalUntil: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Grid>

        {/* Right column */}
        <Grid item xs={12} md={5}>
          <Box sx={{ pl: { md: 2 } }}>
            <Box sx={{ mb: 2 }}>
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

            {renderHeaderCheck(
              'Pre-Exposure Check by Hand',
              extra.preExposureHandCheck,
              v => updateExtra({ preExposureHandCheck: v }),
            )}
            {renderHeaderCheck(
              'Post-Exposure Check by Hand',
              extra.postExposureHandCheck,
              v => updateExtra({ postExposureHandCheck: v }),
            )}
            {renderHeaderCheck(
              'Post-Exposure Visual Inspection',
              extra.postExposureVisualInspection,
              v => updateExtra({ postExposureVisualInspection: v }),
            )}
          </Box>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* ── Section B: Laminator Parameters ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
        Laminator Parameters
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Hot Press */}
        <Grid item xs={12} sm={4}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
            Hot Press
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12}>
              <TextField
                label="Temperature (°C)" size="small" fullWidth type="number"
                value={extra.hotTempC ?? ''}
                onChange={e => {
                  const c = e.target.value === '' ? undefined : Number(e.target.value);
                  const f = c !== undefined ? parseFloat(((c * 9) / 5 + 32).toFixed(1)) : undefined;
                  updateExtra({ hotTempC: c, hotTempF: f });
                }}
                InputProps={{
                  endAdornment: extra.hotTempF !== undefined ? (
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 0.5 }}>
                      {extra.hotTempF} °F
                    </Typography>
                  ) : null,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Pressure (bar)" size="small" fullWidth type="number"
                value={extra.hotPressureBar ?? ''}
                onChange={e => updateExtra({ hotPressureBar: e.target.value === '' ? undefined : Number(e.target.value) })}
                inputProps={{ step: 0.1, min: 0 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Dwell Time (mm:ss)" size="small" fullWidth
                placeholder="e.g. 03:30"
                value={extra.hotDwellTime ?? ''}
                onChange={e => updateExtra({ hotDwellTime: formatDwellTime(e.target.value) })}
              />
            </Grid>
          </Grid>
        </Grid>

        {/* Cold Press */}
        <Grid item xs={12} sm={4}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
            Cold Press
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12}>
              <TextField
                label="Temperature (°C)" size="small" fullWidth type="number"
                value={extra.coldTempC ?? ''}
                onChange={e => {
                  const c = e.target.value === '' ? undefined : Number(e.target.value);
                  const f = c !== undefined ? parseFloat(((c * 9) / 5 + 32).toFixed(1)) : undefined;
                  updateExtra({ coldTempC: c, coldTempF: f });
                }}
                InputProps={{
                  endAdornment: extra.coldTempF !== undefined ? (
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 0.5 }}>
                      {extra.coldTempF} °F
                    </Typography>
                  ) : null,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Pressure (bar)" size="small" fullWidth type="number"
                value={extra.coldPressureBar ?? ''}
                onChange={e => updateExtra({ coldPressureBar: e.target.value === '' ? undefined : Number(e.target.value) })}
                inputProps={{ step: 0.1, min: 0 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Dwell Time (mm:ss)" size="small" fullWidth
                placeholder="e.g. 03:30"
                value={extra.coldDwellTime ?? ''}
                onChange={e => updateExtra({ coldDwellTime: formatDwellTime(e.target.value) })}
              />
            </Grid>
          </Grid>
        </Grid>

        {/* General */}
        <Grid item xs={12} sm={4}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
            General
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12}>
              <TextField
                label="Laminator Name" size="small" fullWidth
                value={extra.laminatorId ?? ''}
                onChange={e => updateExtra({ laminatorId: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Number of Cycles" size="small" fullWidth type="number"
                value={extra.numCycles ?? ''}
                onChange={e => updateExtra({ numCycles: e.target.value === '' ? undefined : Number(e.target.value) })}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Overlay / Adhesive Material" size="small" fullWidth
                value={extra.overlayMaterial ?? ''}
                onChange={e => updateExtra({ overlayMaterial: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes" size="small" fullWidth multiline rows={2}
                value={extra.laminatorNotes ?? ''}
                onChange={e => updateExtra({ laminatorNotes: e.target.value })}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* ── Section D: Transposed per-card table ── */}
      {cardEntries.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Set "# of Samples Tested" above to add card columns.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'warning.lighter' }}>
                {cardEntries.map(ce => (
                  <TableCell
                    key={ce.cardNumber}
                    align="center"
                    sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}
                  >
                    Card CGAB{String(ce.cardNumber).padStart(2, '0')}
                  </TableCell>
                ))}
                <TableCell sx={{ fontWeight: 'bold' }}>Inspection Type</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {CRITERIA.map(criterion => (
                <TableRow key={criterion.key} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                  {cardEntries.map(ce => (
                    <TableCell key={ce.cardNumber} align="center" sx={{ py: 1 }}>
                      {renderCellChip(ce.cardNumber, criterion.key)}
                    </TableCell>
                  ))}
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Typography variant="body2">{criterion.label}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Section E: Job Notes ── */}
      <TextField
        label="Job Notes"
        size="small"
        fullWidth
        multiline
        rows={3}
        value={meta.jobNotes ?? ''}
        onChange={e => updateMeta({ jobNotes: e.target.value })}
      />
    </Box>
  );
};

export default SolidityForm;
