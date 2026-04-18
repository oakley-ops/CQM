import React, { useState } from 'react';
import {
  Box, TextField, Button, Typography, Stack,
  Collapse, IconButton, Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';

interface SpecLimitEditorProps {
  testDefinitionId: number;
  testName: string;
  currentLSL: number | null;
  currentUSL: number | null;
  currentTarget?: number | null;
  currentUnit?: string;
  onSaved?: (lsl: number | null, usl: number | null) => void;
}

export const SpecLimitEditor: React.FC<SpecLimitEditorProps> = ({
  testDefinitionId,
  testName,
  currentLSL,
  currentUSL,
  currentTarget,
  currentUnit,
  onSaved,
}) => {
  const [open, setOpen] = useState(false);
  const [lsl, setLsl] = useState(currentLSL !== null ? String(currentLSL) : '');
  const [usl, setUsl] = useState(currentUSL !== null ? String(currentUSL) : '');
  const [target, setTarget] = useState(currentTarget !== null && currentTarget !== undefined ? String(currentTarget) : '');
  const [unit, setUnit] = useState(currentUnit || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const payload: Record<string, any> = {};
      if (lsl !== '') payload.min_acceptable_value = parseFloat(lsl);
      else payload.min_acceptable_value = '';
      if (usl !== '') payload.max_acceptable_value = parseFloat(usl);
      else payload.max_acceptable_value = '';
      if (target !== '') payload.target_value = parseFloat(target);
      if (unit !== '') payload.unit_of_measurement = unit;

      await axios.patch(`/api/test-categories/definitions/${testDefinitionId}/spec-limits`, payload);
      setSuccess(true);
      setOpen(false);
      onSaved?.(
        lsl !== '' ? parseFloat(lsl) : null,
        usl !== '' ? parseFloat(usl) : null,
      );
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save spec limits');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Spec limits for <strong>{testName}</strong>:&nbsp;
          LSL = {currentLSL !== null ? currentLSL : 'none'}&nbsp; | &nbsp;
          USL = {currentUSL !== null ? currentUSL : 'none'}
          {currentUnit ? ` (${currentUnit})` : ''}
        </Typography>
        <IconButton size="small" onClick={() => setOpen(v => !v)} title="Edit spec limits">
          <EditIcon fontSize="small" />
        </IconButton>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mt: 0.5, py: 0.25 }} onClose={() => setSuccess(false)}>
          Spec limits saved.
        </Alert>
      )}

      <Collapse in={open}>
        <Box sx={{ mt: 1, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 1 }}>
            Edit Spec Limits
          </Typography>
          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            <TextField
              label="LSL" size="small" type="number" value={lsl}
              onChange={e => setLsl(e.target.value)}
              sx={{ width: 110 }}
              inputProps={{ step: 'any' }}
            />
            <TextField
              label="USL" size="small" type="number" value={usl}
              onChange={e => setUsl(e.target.value)}
              sx={{ width: 110 }}
              inputProps={{ step: 'any' }}
            />
            <TextField
              label="Target" size="small" type="number" value={target}
              onChange={e => setTarget(e.target.value)}
              sx={{ width: 110 }}
              inputProps={{ step: 'any' }}
            />
            <TextField
              label="Unit" size="small" value={unit}
              onChange={e => setUnit(e.target.value)}
              sx={{ width: 90 }}
            />
            <Button
              variant="contained" size="small" startIcon={<CheckIcon />}
              onClick={handleSave} disabled={saving}
            >
              Save
            </Button>
            <Button
              variant="outlined" size="small" startIcon={<CloseIcon />}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </Stack>
          {error && <Alert severity="error" sx={{ mt: 1, py: 0.25 }}>{error}</Alert>}
        </Box>
      </Collapse>
    </Box>
  );
};
