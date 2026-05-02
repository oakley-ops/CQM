import { useEffect, useState } from 'react';
import {
  Box, Grid, TextField, MenuItem, FormControlLabel, Checkbox,
  Typography, Divider, Chip, Button, CircularProgress, Alert
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { AdhesionLogFormValues, AdhesionLogEntry } from '../../../types/cqm/adhesionLog';
import { adhesionLogService } from '../../../services/cqm/adhesionLogService';

// ─── constants ────────────────────────────────────────────────────────────────

const CORE_OPTIONS    = ['Nan Ya', 'Klockner', 'Other'];
const LAMINATOR_OPTIONS = ['PHI', 'Oasys', 'inkroom', 'Other'];
const TEST_METHOD_OPTIONS = ['Peel Test #7120#', 'Cross Hatch', 'Other'];
const POST_CURED_OPTIONS  = ['x1', 'x2', 'No', '?'];

const EMPTY_DEFAULTS: AdhesionLogFormValues = {
  job_number: '', job_name: '', side: '', test_date: new Date().toISOString().slice(0, 10),
  emv: false, csr: false, inks: '', screen_printed: false,
  core: '', core_thickness: '', overlay: '', coating: '',
  laminator: '', lam_temp_f: '', dwell_time_sec: '', post_cured: '',
  strip_a: '', strip_b: '', strip_c: '', strip_d: '', strip_e: '',
  strip_a_tore: false, strip_b_tore: false, strip_c_tore: false, strip_d_tore: false, strip_e_tore: false,
  pass_threshold: '1.50', test_method: 'Peel Test #7120#',
  tape_spec_confirmed: false, exclusions: '', notes: '',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function parseNum(v: string) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function computeLive(values: AdhesionLogFormValues) {
  const strips = ['a', 'b', 'c', 'd', 'e'] as const;
  const nums = strips
    .filter(k => !(values as any)[`strip_${k}_tore`])
    .map(k => parseNum((values as any)[`strip_${k}`]))
    .filter((n): n is number => n !== null);
  const min    = nums.length ? Math.min(...nums) : null;
  const minIn  = min != null ? Math.round(min * 2.54 * 1000) / 1000 : null;
  const thresh = parseNum(values.pass_threshold) ?? 1.50;
  const result = min != null ? (min >= thresh ? 'PASS' : 'FAIL') : null;
  return { min, minIn, result };
}

// ─── component ────────────────────────────────────────────────────────────────

interface Props {
  initialValues?: Partial<AdhesionLogFormValues>;
  editId?: number;
  onSaved: (entry: AdhesionLogEntry) => void;
  onCancel: () => void;
}

export default function AdhesionLogForm({ initialValues, editId, onSaved, onCancel }: Props) {
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [autoFilling, setAutoFilling] = useState(false);

  const { control, handleSubmit, watch, setValue } = useForm<AdhesionLogFormValues>({
    defaultValues: { ...EMPTY_DEFAULTS, ...initialValues },
  });

  const values    = watch();
  const { min, minIn, result } = computeLive(values);

  // Auto-fill material/process fields from the last entry for this job number
  const jobNumber = watch('job_number');
  useEffect(() => {
    if (!jobNumber || jobNumber.length < 3) return;
    const timer = setTimeout(async () => {
      setAutoFilling(true);
      try {
        const last = await adhesionLogService.getLastForJob(jobNumber);
        if (last) {
          const fields: (keyof AdhesionLogFormValues)[] = [
            'job_name', 'core', 'overlay', 'coating',
            'laminator', 'lam_temp_f', 'dwell_time_sec', 'post_cured', 'pass_threshold'
          ];
          fields.forEach(f => {
            const v = (last as any)[f];
            if (v != null && v !== '') setValue(f, String(v));
          });
        }
      } catch { /* ignore */ } finally {
        setAutoFilling(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobNumber]);

  const onSubmit = async (data: AdhesionLogFormValues) => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        ...data,
        min_lbf_cm: min,
        min_lbf_in: minIn,
        result,
        lam_temp_f:      data.lam_temp_f      ? parseInt(data.lam_temp_f)       : null,
        dwell_time_sec:  data.dwell_time_sec  ? parseFloat(data.dwell_time_sec)  : null,
        core_thickness:  data.core_thickness  ? parseFloat(data.core_thickness)  : null,
        pass_threshold:  parseFloat(data.pass_threshold) || 1.50,
        strip_a: data.strip_a ? parseFloat(data.strip_a) : null,
        strip_b: data.strip_b ? parseFloat(data.strip_b) : null,
        strip_c: data.strip_c ? parseFloat(data.strip_c) : null,
        strip_d: data.strip_d ? parseFloat(data.strip_d) : null,
        strip_e: data.strip_e ? parseFloat(data.strip_e) : null,
      };

      const saved = editId
        ? await adhesionLogService.update(editId, payload as any)
        : await adhesionLogService.create(payload as any);

      onSaved(saved);
    } catch (err: any) {
      setSaveError(err?.response?.data?.error ?? 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const resultColor = result === 'PASS' ? 'success' : result === 'FAIL' ? 'error' : 'default';

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}

      {/* ── Job Identity ───────────────────────────────────────── */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Job Identity</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={3}>
          <Controller name="job_number" control={control} render={({ field }) => (
            <TextField {...field} label="Job #" fullWidth size="small"
              InputProps={{ endAdornment: autoFilling ? <CircularProgress size={14} /> : null }}
            />
          )} />
        </Grid>
        <Grid item xs={12} sm={5}>
          <Controller name="job_name" control={control} render={({ field }) => (
            <TextField {...field} label="Job Name" fullWidth size="small" />
          )} />
        </Grid>
        <Grid item xs={6} sm={2}>
          <Controller name="side" control={control} render={({ field }) => (
            <TextField {...field} label="Side" select fullWidth size="small">
              <MenuItem value="F">Front</MenuItem>
              <MenuItem value="B">Back</MenuItem>
            </TextField>
          )} />
        </Grid>
        <Grid item xs={6} sm={2}>
          <Controller name="test_date" control={control} rules={{ required: true }} render={({ field }) => (
            <TextField {...field} label="Date" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} />
          )} />
        </Grid>
        <Grid item xs={6} sm={2}>
          <Controller name="emv" control={control} render={({ field }) => (
            <FormControlLabel control={<Checkbox {...field} checked={field.value} size="small" />} label="EMV" />
          )} />
        </Grid>
        <Grid item xs={6} sm={2}>
          <Controller name="csr" control={control} render={({ field }) => (
            <FormControlLabel control={<Checkbox {...field} checked={field.value} size="small" />} label="CSR" />
          )} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller name="inks" control={control} render={({ field }) => (
            <TextField {...field} label="Inks" fullWidth size="small" />
          )} />
        </Grid>
        <Grid item xs={12} sm={2}>
          <Controller name="screen_printed" control={control} render={({ field }) => (
            <FormControlLabel control={<Checkbox {...field} checked={field.value} size="small" />} label="Screen Printed (SS)" />
          )} />
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* ── Materials ──────────────────────────────────────────── */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Materials</Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <Controller name="core" control={control} render={({ field }) => (
            <TextField {...field} label="Core" select fullWidth size="small">
              {CORE_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </TextField>
          )} />
        </Grid>
        <Grid item xs={6} sm={2}>
          <Controller name="core_thickness" control={control} render={({ field }) => (
            <TextField {...field} label="Core Thick (mil)" type="number" fullWidth size="small" />
          )} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <Controller name="overlay" control={control} render={({ field }) => (
            <TextField {...field} label="Overlay" fullWidth size="small" />
          )} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <Controller name="coating" control={control} render={({ field }) => (
            <TextField {...field} label="Coating" fullWidth size="small" />
          )} />
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* ── Lamination Process ─────────────────────────────────── */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Lamination Process</Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <Controller name="laminator" control={control} render={({ field }) => (
            <TextField {...field} label="Laminator" select fullWidth size="small">
              {LAMINATOR_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </TextField>
          )} />
        </Grid>
        <Grid item xs={6} sm={2}>
          <Controller name="lam_temp_f" control={control} render={({ field }) => (
            <TextField {...field} label="Temp (°F)" type="number" fullWidth size="small" />
          )} />
        </Grid>
        <Grid item xs={6} sm={2}>
          <Controller name="dwell_time_sec" control={control} render={({ field }) => (
            <TextField {...field} label="Dwell (sec)" type="number" fullWidth size="small" />
          )} />
        </Grid>
        <Grid item xs={6} sm={2}>
          <Controller name="post_cured" control={control} render={({ field }) => (
            <TextField {...field} label="Post Cured" select fullWidth size="small">
              {POST_CURED_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </TextField>
          )} />
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* ── Strip Measurements ─────────────────────────────────── */}
      <Box display="flex" alignItems="center" gap={2} mb={1}>
        <Typography variant="subtitle2" color="text.secondary">Strip Measurements (lbf/cm)</Typography>
        <Controller name="pass_threshold" control={control} render={({ field }) => (
          <TextField {...field} label="Pass Threshold" type="number" size="small"
            sx={{ width: 140 }}
            inputProps={{ step: '0.01' }}
          />
        )} />
      </Box>

      <Grid container spacing={2} alignItems="center">
        {(['a', 'b', 'c', 'd', 'e'] as const).map(k => (
          <Grid item xs key={k}>
            <Controller name={`strip_${k}` as any} control={control} render={({ field }) => (
              <TextField
                {...field}
                label={`Strip ${k.toUpperCase()}`}
                type="number"
                fullWidth
                size="small"
                inputProps={{ step: '0.001' }}
                disabled={watch(`strip_${k}_tore` as any)}
              />
            )} />
            <Controller name={`strip_${k}_tore` as any} control={control} render={({ field }) => (
              <FormControlLabel
                control={<Checkbox {...field} checked={field.value} size="small"
                  onChange={e => {
                    field.onChange(e);
                    if (e.target.checked) setValue(`strip_${k}` as any, '');
                  }}
                />}
                label="Tore"
                sx={{ mt: 0.5 }}
              />
            )} />
          </Grid>
        ))}

        {/* Live result display */}
        <Grid item xs={12} sm={3}>
          <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block">Min (lbf/cm)</Typography>
            <Typography variant="h6">{min != null ? min.toFixed(3) : '—'}</Typography>
            {minIn != null && (
              <Typography variant="caption" color="text.secondary">{minIn.toFixed(3)} lbf/in</Typography>
            )}
            <Box mt={0.5}>
              <Chip
                label={result ?? 'Pending'}
                color={resultColor as any}
                size="small"
              />
            </Box>
          </Box>
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* ── CQM / ISO Compliance ───────────────────────────────── */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>CQM Compliance</Typography>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={4}>
          <Controller name="test_method" control={control} render={({ field }) => (
            <TextField {...field} label="Test Method" select fullWidth size="small">
              {TEST_METHOD_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </TextField>
          )} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Controller name="tape_spec_confirmed" control={control} render={({ field }) => (
            <FormControlLabel
              control={<Checkbox {...field} checked={field.value} size="small" />}
              label="Tape meets (10 ± 1) N / 25 mm (IEC 60454-2)"
            />
          )} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Controller name="exclusions" control={control} render={({ field }) => (
            <TextField {...field} label="Exclusions (IC contacts, high-adhesion areas)" fullWidth size="small" />
          )} />
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* ── Notes ──────────────────────────────────────────────── */}
      <Controller name="notes" control={control} render={({ field }) => (
        <TextField {...field} label="Notes" fullWidth multiline minRows={2} size="small" />
      )} />

      {/* ── Actions ────────────────────────────────────────────── */}
      <Box display="flex" justifyContent="flex-end" gap={1} mt={3}>
        <Button onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button
          type="submit"
          variant="contained"
          disabled={saving}
          color={result === 'FAIL' ? 'error' : 'primary'}
          startIcon={saving ? <CircularProgress size={16} /> : null}
        >
          {saving ? 'Saving…' : editId ? 'Update Entry' : 'Save Entry'}
        </Button>
      </Box>
    </Box>
  );
}
