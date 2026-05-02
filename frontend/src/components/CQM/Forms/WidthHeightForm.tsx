import React, { useEffect, useState } from 'react';
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
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Check as CheckIcon, Close as CancelIcon } from '@mui/icons-material';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';
import { getPunchTools, addPunchTool, PunchTool } from '../../../services/cqm/punchToolService';

interface WidthHeightFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
}

// ISO 7810 ID-1 tolerances (verified against ISO standard)
const WIDTH_MIN = 85.47;
const WIDTH_MAX = 85.72;
const HEIGHT_MIN = 53.92;
const HEIGHT_MAX = 54.03;

function inRange(val: number | string | undefined, min: number, max: number): boolean | undefined {
  if (val === undefined || val === '') return undefined;
  const n = Number(val);
  if (isNaN(n)) return undefined;
  return n >= min && n <= max;
}

function calcPassFail(widthMm: number | string | undefined, heightMm: number | string | undefined): boolean | undefined {
  const wOk = inRange(widthMm, WIDTH_MIN, WIDTH_MAX);
  const hOk = inRange(heightMm, HEIGHT_MIN, HEIGHT_MAX);
  if (wOk === undefined || hOk === undefined) return undefined;
  return wOk && hOk;
}

const WidthHeightForm: React.FC<WidthHeightFormProps> = ({ def, entry, onUpdateEntry, onUpdateCardEntry }) => {
  const cardEntries = entry.cardEntries ?? [];
  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};

  // Punch tool state
  const [punchTools, setPunchTools] = useState<PunchTool[]>([]);
  const [loadingTools, setLoadingTools] = useState(true);
  const [addingNew, setAddingNew] = useState(false);
  const [newSerial, setNewSerial] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    getPunchTools()
      .then(setPunchTools)
      .catch(() => setPunchTools([]))
      .finally(() => setLoadingTools(false));
  }, []);

  const handleAddTool = async () => {
    if (!newSerial.trim()) { setAddError('Serial number is required'); return; }
    setSaving(true);
    setAddError('');
    try {
      const created = await addPunchTool(newSerial.trim(), newDesc.trim() || undefined);
      setPunchTools(prev => [...prev, created].sort((a, b) => a.serial_number.localeCompare(b.serial_number)));
      updateMeta({ extraData: { ...meta.extraData, punchToolSerial: created.serial_number } });
      setNewSerial('');
      setNewDesc('');
      setAddingNew(false);
    } catch {
      setAddError('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

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
          widthMm: '',
          heightMm: '',
          punchPosition: '',
          isValid: false,
        })),
      ];
    } else {
      next = existing.slice(0, n);
    }
    onUpdateEntry(def.id, { sampleCount: n, cardEntries: next });
  };

  const handleMeasurement = (cardNumber: number, field: 'widthMm' | 'heightMm', value: string) => {
    const ce = cardEntries.find(c => c.cardNumber === cardNumber);
    const next = { ...ce, [field]: value } as CardEntryData;
    const pass = calcPassFail(next.widthMm, next.heightMm);
    onUpdateCardEntry(def.id, cardNumber, {
      [field]: value,
      passStatus: pass,
      isValid: pass !== undefined,
    });
  };

  const handlePunchPosition = (cardNumber: number, value: string) => {
    onUpdateCardEntry(def.id, cardNumber, { punchPosition: value });
  };

  const renderStatusChip = (val: number | string | undefined, min: number, max: number) => {
    const ok = inRange(val, min, max);
    if (ok === undefined) return <Typography variant="caption" color="text.secondary">—</Typography>;
    return ok
      ? <Chip label="OK" color="success" size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
      : <Chip label="OUT" color="error" size="small" sx={{ fontSize: '0.65rem', height: 18 }} />;
  };

  const selectedSerial = (meta.extraData?.punchToolSerial as string) ?? '';
  const punchToolChanged = (meta.extraData?.punchToolChanged as boolean) ?? false;

  return (
    <Box>
      {/* ── Header ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
        Width and Height Test Log — ISO 7810 ID-1 (#3002#, Section 9.1.2)
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Test method #8030# (ISO/IEC 10373-1) &nbsp;·&nbsp;
        W: {WIDTH_MIN}–{WIDTH_MAX} mm &nbsp;·&nbsp;
        H: {HEIGHT_MIN}–{HEIGHT_MAX} mm &nbsp;·&nbsp;
        Qualification ≥ 8 cards &nbsp;·&nbsp; Monitoring: 1 per setup / punch position
      </Typography>

      {/* ── Metadata ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="# of Samples Tested" size="small" fullWidth type="number"
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
            label="Caliper / Gauge ID#" size="small" fullWidth
            value={(meta.extraData?.caliperGaugeId as string) ?? ''}
            onChange={e => updateMeta({ extraData: { ...meta.extraData, caliperGaugeId: e.target.value } })}
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

        {/* ── Punch Tool Serial Number ── */}
        <Grid item xs={12} sm={6} md={4}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Punch Tool Change / Maintenance?
            </Typography>
            <RadioGroup row
              value={punchToolChanged ? 'Y' : 'N'}
              onChange={e => updateMeta({ extraData: { ...meta.extraData, punchToolChanged: e.target.value === 'Y' } })}
            >
              <FormControlLabel value="Y" control={<Radio size="small" />} label="Y" />
              <FormControlLabel value="N" control={<Radio size="small" />} label="N" />
            </RadioGroup>
          </Box>
        </Grid>

        <Grid item xs={12} sm={8} md={8}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Punch Tool Serial Number
          </Typography>
          {addingNew ? (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <TextField
                size="small"
                label="Serial Number *"
                value={newSerial}
                onChange={e => { setNewSerial(e.target.value.toUpperCase()); setAddError(''); }}
                error={!!addError}
                helperText={addError || ' '}
                sx={{ width: 160 }}
                autoFocus
              />
              <TextField
                size="small"
                label="Description (optional)"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                helperText=" "
                sx={{ width: 200 }}
              />
              <Tooltip title="Save">
                <span>
                  <IconButton color="primary" onClick={handleAddTool} disabled={saving} size="small" sx={{ mt: 0.5 }}>
                    {saving ? <CircularProgress size={18} /> : <CheckIcon />}
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Cancel">
                <IconButton onClick={() => { setAddingNew(false); setNewSerial(''); setNewDesc(''); setAddError(''); }} size="small" sx={{ mt: 0.5 }}>
                  <CancelIcon />
                </IconButton>
              </Tooltip>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Select punch tool</InputLabel>
                <Select
                  label="Select punch tool"
                  value={selectedSerial}
                  onChange={e => updateMeta({ extraData: { ...meta.extraData, punchToolSerial: e.target.value } })}
                  disabled={loadingTools}
                  startAdornment={loadingTools ? <CircularProgress size={14} sx={{ mr: 1 }} /> : undefined}
                >
                  {punchTools.length === 0 && !loadingTools && (
                    <MenuItem value="" disabled>
                      <em>No punch tools registered yet</em>
                    </MenuItem>
                  )}
                  {punchTools.map(pt => (
                    <MenuItem key={pt.id} value={pt.serial_number}>
                      {pt.serial_number}
                      {pt.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          {pt.description}
                        </Typography>
                      )}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Tooltip title="Add new punch tool serial number">
                <IconButton size="small" color="primary" onClick={() => setAddingNew(true)}>
                  <AddIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Grid>
      </Grid>

      {/* Re-qualification warning */}
      {punchToolChanged && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Punch Tool Change Detected</strong> — Per #3002#, a re-qualification is required.
          Verify conformity for <strong>each position</strong> of the punching tool.
          Qualification minimum sample size: 8 cards.
          {selectedSerial && <> &nbsp;·&nbsp; Tool: <strong>{selectedSerial}</strong></>}
        </Alert>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* ── Tolerance reference ── */}
      <Box sx={{ display: 'flex', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
        <Paper variant="outlined" sx={{ px: 2, py: 0.75, display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">Width (ISO 7810):</Typography>
          <Typography variant="caption" fontWeight="bold">{WIDTH_MIN} – {WIDTH_MAX} mm</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ px: 2, py: 0.75, display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">Height (ISO 7810):</Typography>
          <Typography variant="caption" fontWeight="bold">{HEIGHT_MIN} – {HEIGHT_MAX} mm</Typography>
        </Paper>
        {selectedSerial && (
          <Paper variant="outlined" sx={{ px: 2, py: 0.75, display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">Punch Tool:</Typography>
            <Typography variant="caption" fontWeight="bold">{selectedSerial}</Typography>
          </Paper>
        )}
      </Box>

      {/* ── Measurement table ── */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'primary.lighter' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Card ID#</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Punch Position</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Width (mm)</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>W Status</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Height (mm)</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>H Status</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Result</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cardEntries.map(ce => (
              <TableRow key={ce.cardNumber} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                <TableCell sx={{ fontWeight: 'medium', whiteSpace: 'nowrap' }}>
                  Card {String(ce.cardNumber).padStart(2, '0')}
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    placeholder="e.g. Pos 1"
                    value={(ce.punchPosition as string) ?? ''}
                    onChange={e => handlePunchPosition(ce.cardNumber, e.target.value)}
                    inputProps={{ style: { fontSize: '0.75rem', padding: '2px 6px' } }}
                    sx={{ width: 90 }}
                  />
                </TableCell>
                <TableCell align="center">
                  <TextField
                    size="small"
                    type="number"
                    placeholder="85.xx"
                    value={(ce.widthMm as string) ?? ''}
                    onChange={e => handleMeasurement(ce.cardNumber, 'widthMm', e.target.value)}
                    inputProps={{ step: 0.01, style: { fontSize: '0.75rem', padding: '2px 6px', width: 72, textAlign: 'right' } }}
                    sx={{ width: 90 }}
                    error={inRange(ce.widthMm, WIDTH_MIN, WIDTH_MAX) === false}
                  />
                </TableCell>
                <TableCell align="center">
                  {renderStatusChip(ce.widthMm, WIDTH_MIN, WIDTH_MAX)}
                </TableCell>
                <TableCell align="center">
                  <TextField
                    size="small"
                    type="number"
                    placeholder="53.xx"
                    value={(ce.heightMm as string) ?? ''}
                    onChange={e => handleMeasurement(ce.cardNumber, 'heightMm', e.target.value)}
                    inputProps={{ step: 0.01, style: { fontSize: '0.75rem', padding: '2px 6px', width: 72, textAlign: 'right' } }}
                    sx={{ width: 90 }}
                    error={inRange(ce.heightMm, HEIGHT_MIN, HEIGHT_MAX) === false}
                  />
                </TableCell>
                <TableCell align="center">
                  {renderStatusChip(ce.heightMm, HEIGHT_MIN, HEIGHT_MAX)}
                </TableCell>
                <TableCell align="center">
                  {ce.passStatus === undefined ? (
                    <Typography variant="caption" color="text.secondary">—</Typography>
                  ) : ce.passStatus ? (
                    <Chip label="PASS" color="success" size="small" sx={{ fontWeight: 'bold', minWidth: 60 }} />
                  ) : (
                    <Chip label="FAIL" color="error" size="small" sx={{ fontWeight: 'bold', minWidth: 60 }} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Job Notes ── */}
      <TextField
        label="Job Notes"
        size="small"
        fullWidth
        multiline
        rows={3}
        value={meta.jobNotes ?? ''}
        onChange={e => updateMeta({ jobNotes: e.target.value })}
        helperText="Note any out-of-tolerance cards or punch positions requiring attention."
      />
    </Box>
  );
};

export default WidthHeightForm;
