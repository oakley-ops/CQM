import React, { useMemo } from 'react';
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
} from '@mui/material';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';

interface WarpageFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
}

const NO_EMBOSSING_MAX = 1.5;
const EMBOSSED_MAX = 2.5;

function calcPassFail(
  noEmbossing: number | string | undefined,
  embossed: number | null | undefined,
  isNA: boolean,
): boolean | undefined {
  const v1 = typeof noEmbossing === 'string' ? parseFloat(noEmbossing) : noEmbossing;
  if (v1 === undefined || isNaN(v1 as number)) return undefined;
  const embossedPass = isNA || embossed === null || embossed === undefined
    ? true
    : (embossed as number) <= EMBOSSED_MAX;
  return (v1 as number) <= NO_EMBOSSING_MAX && embossedPass;
}

const WarpageForm: React.FC<WarpageFormProps> = ({ def, entry, onUpdateEntry, onUpdateCardEntry }) => {
  const cardEntries = entry.cardEntries ?? [];
  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};

  const updateMeta = (patch: Partial<TestEntryMetadata>) => {
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });
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
          measurementValue: undefined,
          secondaryMeasurementValue: null,
          secondaryIsNA: true,
          isValid: false,
        })),
      ];
    } else {
      next = existing.slice(0, n);
    }
    onUpdateEntry(def.id, { sampleCount: n, cardEntries: next });
  };

  const handleNoEmbossingChange = (cardNumber: number, raw: string) => {
    const v = raw === '' ? undefined : parseFloat(raw);
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const isNA = ce?.secondaryIsNA ?? true;
    const embossed = ce?.secondaryMeasurementValue;
    const pass = calcPassFail(v, embossed, isNA);
    onUpdateCardEntry(def.id, cardNumber, {
      measurementValue: v,
      passStatus: pass,
      isValid: pass !== undefined,
    });
  };

  const handleEmbossedChange = (cardNumber: number, raw: string) => {
    const v = raw === '' ? null : parseFloat(raw);
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const noEmb = ce?.measurementValue;
    const pass = calcPassFail(noEmb, v, false);
    onUpdateCardEntry(def.id, cardNumber, {
      secondaryMeasurementValue: v,
      secondaryIsNA: false,
      passStatus: pass,
      isValid: pass !== undefined,
    });
  };

  const handleNAToggle = (cardNumber: number, checked: boolean) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const noEmb = ce?.measurementValue;
    const pass = calcPassFail(noEmb, null, checked);
    onUpdateCardEntry(def.id, cardNumber, {
      secondaryIsNA: checked,
      secondaryMeasurementValue: checked ? null : undefined,
      passStatus: pass,
      isValid: pass !== undefined,
    });
  };

  // Auto-calculated stats from No Embossing values
  const noEmbossingValues = useMemo(() => {
    return cardEntries
      .map(c => {
        const v = typeof c.measurementValue === 'string' ? parseFloat(c.measurementValue) : c.measurementValue;
        return v !== undefined && !isNaN(v) ? v : null;
      })
      .filter((v): v is number => v !== null);
  }, [cardEntries]);

  const stats = useMemo(() => {
    if (noEmbossingValues.length === 0) return null;
    const min = Math.min(...noEmbossingValues);
    const max = Math.max(...noEmbossingValues);
    const avg = noEmbossingValues.reduce((a, b) => a + b, 0) / noEmbossingValues.length;
    return { min: min.toFixed(3), max: max.toFixed(3), avg: avg.toFixed(3) };
  }, [noEmbossingValues]);

  return (
    <Box>
      {/* ── Section A: Header metadata ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
        Test Log — CQM 2.19, Section 9.1.7 (Unit: mm)
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Test Method" size="small" fullWidth
            value={meta.sampledBy !== undefined ? '' : '#8100#'}
            InputProps={{ readOnly: true }}
            defaultValue="#8100#"
            helperText="Fixed: #8100#"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Sampled By" size="small" fullWidth
            value={meta.sampledBy ?? ''}
            onChange={e => updateMeta({ sampledBy: e.target.value })}
          />
        </Grid>
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
          <Box>
            <Typography variant="caption" color="text.secondary">Calibration Verified</Typography>
            <RadioGroup row
              value={meta.calibrationVerified === undefined ? '' : meta.calibrationVerified ? 'Y' : 'N'}
              onChange={e => updateMeta({ calibrationVerified: e.target.value === 'Y' })}
            >
              <FormControlLabel value="Y" control={<Radio size="small" />} label="Y" />
              <FormControlLabel value="N" control={<Radio size="small" />} label="N" />
            </RadioGroup>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Valid Until" size="small" fullWidth type="date"
            value={meta.calibrationValidUntil ?? ''}
            onChange={e => updateMeta({ calibrationValidUntil: e.target.value })}
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
            label="Calibration Valid Until" size="small" fullWidth type="date"
            value={meta.calValidUntil ?? ''}
            onChange={e => updateMeta({ calValidUntil: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
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

      {/* ── Section B: Per-card measurement table ── */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'warning.lighter' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Card ID#</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                Warpage — No Embossing<br />
                <Typography variant="caption" color="text.secondary">max {NO_EMBOSSING_MAX} mm</Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                Warpage — Embossed<br />
                <Typography variant="caption" color="text.secondary">max {EMBOSSED_MAX} mm</Typography>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>N/A<br /><Typography variant="caption">(Embossed)</Typography></TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Pass/Fail</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cardEntries.map(ce => {
              const pass = ce.passStatus;
              return (
                <TableRow key={ce.cardNumber} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                  <TableCell sx={{ fontWeight: 'medium', whiteSpace: 'nowrap' }}>
                    Card {String(ce.cardNumber).padStart(2, '0')}
                  </TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      size="small"
                      value={ce.measurementValue ?? ''}
                      onChange={e => handleNoEmbossingChange(ce.cardNumber, e.target.value)}
                      inputProps={{ step: 0.001, min: 0, style: { textAlign: 'center', width: 80 } }}
                      sx={{ width: 100 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      size="small"
                      disabled={ce.secondaryIsNA}
                      value={ce.secondaryIsNA ? '' : (ce.secondaryMeasurementValue ?? '')}
                      onChange={e => handleEmbossedChange(ce.cardNumber, e.target.value)}
                      inputProps={{ step: 0.001, min: 0, style: { textAlign: 'center', width: 80 } }}
                      sx={{ width: 100 }}
                      placeholder={ce.secondaryIsNA ? 'N/A' : ''}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Checkbox
                      checked={ce.secondaryIsNA ?? true}
                      onChange={e => handleNAToggle(ce.cardNumber, e.target.checked)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {pass === undefined ? (
                      <Typography variant="caption" color="text.secondary">—</Typography>
                    ) : pass ? (
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

      {/* ── Section C: Summary stats ── */}
      {stats && (
        <Box sx={{ display: 'flex', gap: 3, mb: 2, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">No Embossing summary:</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={`Min: ${stats.min}`} size="small" variant="outlined" />
            <Chip label={`Max: ${stats.max}`} size="small" variant="outlined" />
            <Chip label={`Avg: ${stats.avg}`} size="small" variant="outlined" />
          </Box>
        </Box>
      )}

      {/* ── Section D: Footer ── */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Expanded Uncertainty: ± 0.041 mm &nbsp;(coverage factor k=2, approximate 95% confidence level)
      </Typography>

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

export default WarpageForm;
