import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, Paper, Stack, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material';
import { isAxiosError } from 'axios';
import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import AuditGradeBadge from '../../components/nexus/AuditGradeBadge';
import AlertBanner from '../../components/nexus/AlertBanner';
import { createAudit, deleteAudit, listAudits } from '../../services/nexus/nexusService';
import type { AuditGrade, AuditStatus, CreateAuditRequest, NexusAuditRecord } from '../../types/nexus';

const STATUS_COLORS: Record<AuditStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  draft: 'default',
  'in-progress': 'info',
  submitted: 'warning',
  closed: 'success',
};

const EMPTY_FORM: CreateAuditRequest = {
  site_name: '',
  company: '',
  iso_9001_certified: false,
  address_line1: '',
  country_code: '',
  site_code: '',
  audit_date_start: '',
  audit_date_end: '',
  auditor_name: '',
  auditor_company: '',
  notes: '',
};

export default function AuditsPage() {
  const navigate = useNavigate();
  const [audits, setAudits] = useState<NexusAuditRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateAuditRequest>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAudits(await listAudits());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // New cycle: carry the site profile over from the most recent record so a
  // single-site deployment (Nashville) only fills in the cycle-specific fields.
  const handleOpen = () => {
    const latest = audits[0];
    setForm(latest ? {
      ...EMPTY_FORM,
      site_name: latest.site_name,
      company: latest.company,
      address_line1: latest.address_line1 ?? '',
      country_code: latest.country_code ?? '',
      site_code: latest.site_code ?? '',
      iso_9001_certified: latest.iso_9001_certified,
    } : EMPTY_FORM);
    setError('');
    setDialogOpen(true);
  };
  const handleClose = () => setDialogOpen(false);

  const handleChange = (field: keyof CreateAuditRequest) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.site_name.trim() || !form.company.trim()) {
      setError('Site name and company are required.');
      return;
    }
    setSaving(true);
    try {
      await createAudit(form);
      handleClose();
      load();
    } catch (err) {
      setError(
        isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : 'Failed to create audit record. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete audit record "${name}"? This cannot be undone.`)) return;
    await deleteAudit(id);
    load();
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <AlertBanner />

      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Audit Records</Typography>
          <Typography variant="body2" color="text.secondary">
            Each record mirrors the Mastercard CQMAP V3.A Coversheet — site info, grade, next audit date.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen}>
          New Audit Record
        </Button>
      </Stack>

      {audits.length === 0 && !loading ? (
        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
          <Typography color="text.secondary" mb={2}>
            No audit records yet. Create one to start tracking your CQM qualification.
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={handleOpen}>
            Create First Audit Record
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>Site</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Company</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ISO 9001</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Grade</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Audit Dates</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Next Audit</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {audits.map(a => (
                <TableRow key={a.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/nexus/audits/${a.id}`)}>
                  <TableCell>
                    <Typography fontWeight={600}>{a.site_name}</Typography>
                    {a.site_code && <Typography variant="caption" color="text.secondary">{a.site_code}</Typography>}
                  </TableCell>
                  <TableCell>{a.company}</TableCell>
                  <TableCell>
                    <Chip
                      label={a.iso_9001_certified ? 'ISO 9001' : 'No ISO 9001'}
                      size="small"
                      color={a.iso_9001_certified ? 'success' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={a.status}
                      size="small"
                      color={STATUS_COLORS[a.status] ?? 'default'}
                      variant="outlined"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    {a.grade ? <AuditGradeBadge grade={a.grade as AuditGrade} showMonths /> : <Typography color="text.disabled" variant="caption">—</Typography>}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {a.audit_date_start && a.audit_date_end
                      ? `${a.audit_date_start} – ${a.audit_date_end}`
                      : a.audit_date_start ?? '—'}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {a.next_audit_date ?? <Typography color="text.disabled" variant="caption">—</Typography>}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Open">
                        <IconButton size="small" onClick={() => navigate(`/nexus/audits/${a.id}`)}>
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDelete(a.id, a.site_name)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Create Dialog ── */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>New Audit Record</DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            {error && <Chip label={error} color="error" size="small" sx={{ height: 'auto', py: 0.5 }} />}

            <Stack direction="row" spacing={2}>
              <TextField
                label="Site Name *"
                value={form.site_name}
                onChange={handleChange('site_name')}
                size="small"
                fullWidth
              />
              <TextField
                label="Site Code"
                value={form.site_code}
                onChange={handleChange('site_code')}
                size="small"
                sx={{ width: 140 }}
              />
            </Stack>

            <TextField
              label="Company *"
              value={form.company}
              onChange={handleChange('company')}
              size="small"
              fullWidth
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Address"
                value={form.address_line1}
                onChange={handleChange('address_line1')}
                size="small"
                fullWidth
              />
              <TextField
                label="Country Code (ISO, e.g. US)"
                value={form.country_code}
                onChange={handleChange('country_code')}
                size="small"
                inputProps={{ maxLength: 2 }}
                sx={{ width: 200 }}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Audit Start"
                type="date"
                value={form.audit_date_start}
                onChange={handleChange('audit_date_start')}
                size="small"
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Audit End"
                type="date"
                value={form.audit_date_end}
                onChange={handleChange('audit_date_end')}
                size="small"
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>

            <FormControlLabel
              control={
                <Switch
                  checked={form.iso_9001_certified}
                  onChange={e => setForm(f => ({ ...f, iso_9001_certified: e.target.checked }))}
                  color="success"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>ISO 9001 Certified</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {form.iso_9001_certified
                      ? '31 QMS requirements will be seeded (shorter checklist for certified sites)'
                      : '60 QMS requirements will be seeded (full checklist for non-certified sites)'}
                  </Typography>
                </Box>
              }
            />

            <TextField
              label="Notes"
              value={form.notes}
              onChange={handleChange('notes')}
              size="small"
              multiline
              rows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
