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
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';

interface CardEdgesFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
}

interface CardEdgesExtra {
  testDate?: string;
  mahrId?: string;
  envLoggerCalUntil?: string;
  highResImages?: 'Y' | 'N' | 'NA';
}

const EDGE_BURR_MAX = 0.08;

const VISUAL_OPTIONS = [
  'No Edge Burr Present',
  'Edge Burr Present',
  'Edge Notch Present',
  'Surface Imperfection Present',
];

function calcPassFail(value: number | string | undefined, isNA: boolean): boolean | undefined {
  if (isNA) return true;
  const v = typeof value === 'string' ? parseFloat(value) : value;
  if (v === undefined || isNaN(v as number)) return undefined;
  return (v as number) <= EDGE_BURR_MAX;
}

const CardEdgesForm: React.FC<CardEdgesFormProps> = ({ def, entry, onUpdateEntry, onUpdateCardEntry }) => {
  const cardEntries = entry.cardEntries ?? [];
  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
  const extra: CardEdgesExtra = (meta.extraData ?? {}) as CardEdgesExtra;

  const updateMeta = (patch: Partial<TestEntryMetadata>) => {
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });
  };

  const updateExtra = (patch: Partial<CardEdgesExtra>) => {
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
          measurementValue: undefined,
          secondaryIsNA: true,
          notes: 'No Edge Burr Present',
          isValid: false,
        })),
      ];
    } else {
      next = existing.slice(0, n);
    }
    onUpdateEntry(def.id, { sampleCount: n, cardEntries: next });
  };

  const handleBurrChange = (cardNumber: number, raw: string) => {
    const value = raw === '' ? undefined : parseFloat(raw);
    const pass = calcPassFail(value, false);
    onUpdateCardEntry(def.id, cardNumber, {
      measurementValue: value,
      secondaryIsNA: false,
      notes: 'Edge Burr Present',
      passStatus: pass,
      isValid: pass !== undefined,
    });
  };

  const handleNAToggle = (cardNumber: number, checked: boolean) => {
    onUpdateCardEntry(def.id, cardNumber, {
      secondaryIsNA: checked,
      measurementValue: checked ? undefined : undefined,
      notes: checked ? 'No Edge Burr Present' : '',
      passStatus: checked ? true : undefined,
      isValid: checked,
    });
  };

  const handleVisualChange = (cardNumber: number, value: string) => {
    onUpdateCardEntry(def.id, cardNumber, { notes: value });
  };

  // Summary stats for measured (non-N/A) values
  const measuredValues = useMemo(() => {
    return cardEntries
      .filter(ce => !ce.secondaryIsNA && ce.measurementValue !== undefined)
      .map(ce => typeof ce.measurementValue === 'string' ? parseFloat(ce.measurementValue) : ce.measurementValue as number)
      .filter(v => !isNaN(v));
  }, [cardEntries]);

  const stats = useMemo(() => {
    if (measuredValues.length === 0) return null;
    const min = Math.min(...measuredValues);
    const max = Math.max(...measuredValues);
    return { min: min.toFixed(3), max: max.toFixed(3) };
  }, [measuredValues]);

  return (
    <Box>
      {/* Title */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
        Card Edges / Edge Burrs Test Log — CQM 2.19, Section 9.1.6 &nbsp;(Unit: mm)
      </Typography>

      {/* ── Section A: Header metadata ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Left column */}
        <Grid item xs={12} md={7}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Sampled By" size="small" fullWidth
                value={meta.sampledBy ?? ''}
                onChange={e => updateMeta({ sampledBy: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="# of Samples" size="small" fullWidth type="number"
                value={entry.sampleCount ?? 1}
                onChange={e => handleCountChange(e.target.value)}
                inputProps={{ min: 1, max: 100 }}
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
                label="Test Method" size="small" fullWidth
                value="#8070#"
                InputProps={{ readOnly: true }}
                helperText="Fixed: #8070#"
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
                label="Mahr ID#" size="small" fullWidth
                value={extra.mahrId ?? ''}
                onChange={e => updateExtra({ mahrId: e.target.value })}
                helperText="Perthometer equipment ID"
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
              <Typography variant="caption" color="text.secondary">High-Resolution Images</Typography>
              <RadioGroup
                row
                value={extra.highResImages ?? ''}
                onChange={e => updateExtra({ highResImages: e.target.value as 'Y' | 'N' | 'NA' })}
              >
                <FormControlLabel value="Y" control={<Radio size="small" />} label="Y" />
                <FormControlLabel value="N" control={<Radio size="small" />} label="N" />
                <FormControlLabel value="NA" control={<Radio size="small" />} label="N/A" />
              </RadioGroup>
            </Box>
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
          </Box>
        </Grid>
      </Grid>

      {/* Job Notes */}
      <TextField
        label="Job Notes"
        size="small"
        fullWidth
        multiline
        rows={2}
        value={meta.jobNotes ?? ''}
        onChange={e => updateMeta({ jobNotes: e.target.value })}
        sx={{ mb: 2 }}
      />

      <Divider sx={{ mb: 2 }} />

      {/* ── Section B: Per-card measurement table ── */}
      {cardEntries.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Set "# of Samples" above to add card rows.
        </Typography>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'warning.lighter' }}>
                  <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Card ID#</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                    Edge Burr<br />
                    <Typography variant="caption" color="text.secondary">max {EDGE_BURR_MAX} mm</Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>N/A</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Visual Inspection</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Results</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cardEntries.map(ce => {
                  const isNA = ce.secondaryIsNA ?? true;
                  const pass = ce.passStatus;
                  return (
                    <TableRow key={ce.cardNumber} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                      <TableCell sx={{ fontWeight: 'medium', whiteSpace: 'nowrap' }}>
                        Card CGEB{String(ce.cardNumber).padStart(3, '0')}
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          size="small"
                          disabled={isNA}
                          value={isNA ? '' : (ce.measurementValue ?? '')}
                          onChange={e => handleBurrChange(ce.cardNumber, e.target.value)}
                          inputProps={{ step: 0.001, min: 0, style: { textAlign: 'center', width: 70 } }}
                          sx={{ width: 90 }}
                          placeholder={isNA ? 'N/A' : '0.000'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Checkbox
                          checked={isNA}
                          onChange={e => handleNAToggle(ce.cardNumber, e.target.checked)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                          <Select
                            value={ce.notes || (isNA ? 'No Edge Burr Present' : '')}
                            onChange={e => handleVisualChange(ce.cardNumber, e.target.value)}
                            displayEmpty
                          >
                            {VISUAL_OPTIONS.map(opt => (
                              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
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

          {/* Stats */}
          {stats && (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Measured burr values:</Typography>
              <Chip label={`Min: ${stats.min} mm`} size="small" variant="outlined" />
              <Chip label={`Max: ${stats.max} mm`} size="small" variant="outlined"
                color={parseFloat(stats.max) > EDGE_BURR_MAX ? 'error' : 'default'}
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default CardEdgesForm;
