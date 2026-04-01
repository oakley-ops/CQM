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
  Checkbox,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';

interface CornerImpactFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
}

type CornerResult = 'PASS' | 'FAIL' | 'NO TEST' | undefined;

function calcPassFail(a: CornerResult, b: CornerResult, c: CornerResult, d: CornerResult): boolean | undefined {
  const results = [a, b, c, d];
  const tested = results.filter(r => r !== undefined && r !== 'NO TEST');
  if (tested.length === 0) return undefined;
  return tested.every(r => r === 'PASS');
}

const CornerImpactForm: React.FC<CornerImpactFormProps> = ({ def, entry, onUpdateEntry, onUpdateCardEntry }) => {
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
          cornerA: undefined,
          cornerB: undefined,
          cornerC: undefined,
          cornerD: undefined,
          cornerAExtent: '',
          cornerBExtent: '',
          cornerCExtent: '',
          cornerDExtent: '',
          coreDelamination: false,
          visualNote: '',
          isValid: false,
        })),
      ];
    } else {
      next = existing.slice(0, n);
    }
    onUpdateEntry(def.id, { sampleCount: n, cardEntries: next });
  };

  const handleCornerChange = (
    cardNumber: number,
    corner: 'cornerA' | 'cornerB' | 'cornerC' | 'cornerD',
    value: 'PASS' | 'FAIL' | 'NO TEST',
  ) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const next = { ...ce, [corner]: value } as CardEntryData;
    const pass = calcPassFail(next.cornerA, next.cornerB, next.cornerC, next.cornerD);
    onUpdateCardEntry(def.id, cardNumber, {
      [corner]: value,
      passStatus: pass,
      isValid: pass !== undefined,
    });
  };

  const handleCornerExtent = (
    cardNumber: number,
    extentKey: 'cornerAExtent' | 'cornerBExtent' | 'cornerCExtent' | 'cornerDExtent',
    value: string,
  ) => {
    onUpdateCardEntry(def.id, cardNumber, { [extentKey]: value });
  };

  const handleCoreDelamination = (cardNumber: number, checked: boolean) => {
    onUpdateCardEntry(def.id, cardNumber, { coreDelamination: checked });
  };

  const handleVisualNote = (cardNumber: number, value: string) => {
    onUpdateCardEntry(def.id, cardNumber, { visualNote: value });
  };

  const cornerKeys = ['cornerA', 'cornerB', 'cornerC', 'cornerD'] as const;
  const extentKeys = ['cornerAExtent', 'cornerBExtent', 'cornerCExtent', 'cornerDExtent'] as const;

  const anyCoreDel = cardEntries.some(ce => ce.coreDelamination);

  return (
    <Box>
      {/* ── Section A: Header metadata ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
        Solidity – Resistance to Corner Impact Test Log (CQM 2.19, Section 9.1.23)
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Test method #8170# · 2 cards per set (Card 1: 2 corners; Card 2: remaining 2 corners)
        &nbsp;·&nbsp; Qualification: ≥ 8 cards &nbsp;·&nbsp; Monitoring: 2 cards/batch
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Test Method" size="small" fullWidth
            value="#8170#"
            InputProps={{ readOnly: true }}
            helperText="Fixed: #8170#"
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
          <TextField
            label="Corner Impact Fixture ID#" size="small" fullWidth
            value={meta.fixtureId ?? ''}
            onChange={e => updateMeta({ fixtureId: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Calibration Valid Until (Fixture)" size="small" fullWidth type="date"
            value={meta.fixtureCalValidUntil ?? ''}
            onChange={e => updateMeta({ fixtureCalValidUntil: e.target.value })}
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
            label="Calibration Valid Until (Logger)" size="small" fullWidth type="date"
            value={meta.calValidUntil ?? ''}
            onChange={e => updateMeta({ calValidUntil: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Box>
            <Typography variant="caption" color="text.secondary">Samples Preconditioned</Typography>
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

      {/* ── Core delamination global warning ── */}
      {anyCoreDel && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
          <strong>Core Layer Delamination Detected</strong> — Per #3018#, peel strength verification (test #8240#)
          must be performed on any card exhibiting core layer delamination before final disposition.
        </Alert>
      )}

      {/* ── Section B: Per-card corner table ── */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'warning.lighter' }}>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Card ID#</TableCell>
              {(['A', 'B', 'C', 'D'] as const).map(corner => (
                <TableCell key={corner} align="center" sx={{ fontWeight: 'bold', minWidth: 130 }}>
                  Corner {corner}
                  <Typography variant="caption" display="block" color="text.secondary" fontWeight="normal">
                    Result / Extent
                  </Typography>
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                Core Delam.
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Visual Note</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Result</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cardEntries.map(ce => (
              <TableRow key={ce.cardNumber} sx={{ '&:hover': { backgroundColor: 'action.hover' }, verticalAlign: 'top' }}>
                <TableCell sx={{ fontWeight: 'medium', whiteSpace: 'nowrap', pt: 1.5 }}>
                  Card CGC{String(ce.cardNumber).padStart(2, '0')}
                </TableCell>

                {cornerKeys.map((key, idx) => {
                  const extentKey = extentKeys[idx];
                  const result = ce[key] as 'PASS' | 'FAIL' | 'NO TEST' | undefined;
                  return (
                    <TableCell key={key} align="center" sx={{ px: 0.5 }}>
                      <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={result ?? null}
                        onChange={(_, val) => {
                          if (val !== null) handleCornerChange(ce.cardNumber, key, val);
                        }}
                        sx={{ mb: 0.5 }}
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
                        <ToggleButton
                          value="NO TEST"
                          sx={{
                            fontSize: '0.6rem', px: 0.75, py: 0.25,
                            '&.Mui-selected': { bgcolor: 'grey.300' },
                          }}
                        >
                          N/T
                        </ToggleButton>
                      </ToggleButtonGroup>
                      <TextField
                        size="small"
                        placeholder="Extent / obs."
                        value={(ce[extentKey] as string) ?? ''}
                        onChange={e => handleCornerExtent(ce.cardNumber, extentKey, e.target.value)}
                        disabled={result !== 'FAIL'}
                        inputProps={{ style: { fontSize: '0.7rem', padding: '2px 6px' } }}
                        sx={{ width: 110 }}
                      />
                    </TableCell>
                  );
                })}

                {/* Core delamination */}
                <TableCell align="center" sx={{ pt: 1 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={ce.coreDelamination ?? false}
                        onChange={e => handleCoreDelamination(ce.cardNumber, e.target.checked)}
                        color="warning"
                      />
                    }
                    label={<Typography variant="caption">Yes</Typography>}
                    sx={{ m: 0 }}
                  />
                </TableCell>

                {/* Visual note */}
                <TableCell align="center" sx={{ pt: 1 }}>
                  <TextField
                    size="small"
                    placeholder="None"
                    value={ce.visualNote ?? ''}
                    onChange={e => handleVisualNote(ce.cardNumber, e.target.value)}
                    inputProps={{ style: { width: 80, fontSize: '0.75rem' } }}
                    sx={{ width: 100 }}
                  />
                </TableCell>

                {/* Overall result */}
                <TableCell align="center" sx={{ pt: 1 }}>
                  {ce.passStatus === undefined ? (
                    <Typography variant="caption" color="text.secondary">—</Typography>
                  ) : ce.passStatus ? (
                    <Chip label="PASS" color="success" size="small" sx={{ fontWeight: 'bold', minWidth: 60 }} />
                  ) : (
                    <Chip label="FAIL" color="error" size="small" sx={{ fontWeight: 'bold', minWidth: 60 }} />
                  )}
                  {ce.coreDelamination && (
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        icon={<WarningIcon sx={{ fontSize: '0.8rem !important' }} />}
                        label="Core Delam."
                        color="warning"
                        size="small"
                        sx={{ fontSize: '0.6rem' }}
                      />
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Section C: Pass criteria reminder ── */}
      <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
        <Typography variant="caption">
          <strong>Pass criteria (#3018#):</strong> No delamination and no fracture at any tested corner.
          Any delamination or fracture = FAIL. Record extent (mm) for all non-pass corners.
          Cards with core layer delamination require peel strength verification (#8240#).
        </Typography>
      </Alert>

      {/* ── Section D: Job Notes ── */}
      <TextField
        label="Job Notes"
        size="small"
        fullWidth
        multiline
        rows={3}
        value={meta.jobNotes ?? ''}
        onChange={e => updateMeta({ jobNotes: e.target.value })}
        helperText="Moderate: delamination > 1 mm and ≤ 5 mm. Severe: delamination > 5 mm."
      />
    </Box>
  );
};

export default CornerImpactForm;
