import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AlertBanner from '../../components/nexus/AlertBanner';
import { createCapa, getAudit, getCapaSummary, listCapa, updateCapa } from '../../services/nexus/nexusService';
import type { CapaSummary, CapaStatus, NexusAuditRecord, NexusCapaItem } from '../../types/nexus';

const STATUS_OPTIONS: CapaStatus[] = [
  'Not yet started', 'In progress', 'Under Review', 'Complete',
  'Cancelled', 'Finding Rejected', 'Awaiting Auditor',
];

const STATUS_COLOR: Record<CapaStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  'Not yet started': 'default',
  'In progress': 'info',
  'Under Review': 'warning',
  'Complete': 'success',
  'Cancelled': 'default',
  'Finding Rejected': 'default',
  'Awaiting Auditor': 'warning',
};

const SEVERITY_COLOR: Record<string, 'error' | 'warning' | 'info'> = {
  'NC+': 'error',
  'nc-': 'warning',
  'RI': 'info',
};

function SummaryBar({ s }: { s: CapaSummary }) {
  return (
    <Stack direction="row" spacing={2} flexWrap="wrap">
      <Chip label={`${s.total} total`} size="small" />
      {s.overdue > 0 && <Chip label={`${s.overdue} overdue`} size="small" color="error" />}
      {Object.entries(s.bySeverity).map(([sev, n]) => n > 0 && (
        <Chip key={sev} label={`${n} ${sev}`} size="small" color={SEVERITY_COLOR[sev] ?? 'default'} variant="outlined" />
      ))}
    </Stack>
  );
}

export default function CapaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auditId = Number(id);

  const [audit, setAudit] = useState<NexusAuditRecord | null>(null);
  const [items, setItems] = useState<NexusCapaItem[]>([]);
  const [summary, setSummary] = useState<CapaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<NexusCapaItem>>({ status: 'Not yet started', severity: 'nc-' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, c, s] = await Promise.all([getAudit(auditId), listCapa(auditId), getCapaSummary(auditId)]);
      setAudit(a);
      setItems(c);
      setSummary(s);
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createCapa(auditId, form);
      setDialogOpen(false);
      setForm({ status: 'Not yet started', severity: 'nc-' });
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (item: NexusCapaItem, status: CapaStatus) => {
    await updateCapa(auditId, item.id, { status });
    setItems(i => i.map(x => x.id === item.id ? { ...x, status } : x));
    setSummary(await getCapaSummary(auditId));
  };

  const today = new Date().toISOString().split('T')[0];

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 1300, mx: 'auto' }}>
      <AlertBanner auditId={auditId} />

      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
        <Button startIcon={<ArrowBackIcon />} size="small" onClick={() => navigate(`/nexus/audits/${auditId}`)}>
          {audit?.site_name ?? 'Audit'}
        </Button>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>CAPA — Corrective Action Plan</Typography>
          <Typography variant="body2" color="text.secondary">
            Mirrors the CAP sheet in CQMAP V3.A. NC+/nc- findings auto-create entries here.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Add CAPA
        </Button>
      </Stack>

      {summary && <Box mb={2}><SummaryBar s={summary} /></Box>}

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700, width: 130 }}>Action ID</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 90 }}>Severity</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 100 }}>Req. ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Observation</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 110 }}>Deadline</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 180 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(item => {
              const isOverdue = item.deadline && item.deadline < today &&
                !['Complete', 'Cancelled', 'Finding Rejected'].includes(item.status);
              return (
                <TableRow key={item.id} sx={{ bgcolor: isOverdue ? 'rgba(198,40,40,0.04)' : 'inherit' }}>
                  <TableCell>
                    <Chip
                      label={item.action_id}
                      size="small"
                      sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, bgcolor: 'action.hover' }}
                    />
                  </TableCell>
                  <TableCell>
                    {item.severity && (
                      <Chip
                        label={item.severity}
                        size="small"
                        color={SEVERITY_COLOR[item.severity] ?? 'default'}
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {item.requirement_id && (
                      <Chip
                        label={item.requirement_id}
                        size="small"
                        sx={{ fontFamily: 'monospace', fontSize: 10, bgcolor: 'action.hover' }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{item.observation ?? '—'}</Typography>
                    {item.responsible_person && (
                      <Typography variant="caption" color="text.secondary">
                        Owner: {item.responsible_person}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.deadline ? (
                      <Chip
                        label={item.deadline}
                        size="small"
                        color={isOverdue ? 'error' : 'default'}
                        variant={isOverdue ? 'filled' : 'outlined'}
                      />
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      value={item.status}
                      onChange={e => handleStatusChange(item, e.target.value as CapaStatus)}
                      sx={{ width: 170 }}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <MenuItem key={s} value={s}>
                          <Chip label={s} size="small" color={STATUS_COLOR[s]} sx={{ fontSize: 10 }} />
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No CAPA items. NC+/nc- conformity ratings auto-create entries here.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Create Dialog ── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New CAPA Item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="Severity"
                value={form.severity ?? 'nc-'}
                onChange={e => setForm(f => ({ ...f, severity: e.target.value as 'NC+' | 'nc-' | 'RI' }))}
                size="small"
                sx={{ width: 120 }}
              >
                {(['NC+', 'nc-', 'RI'] as const).map(s => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Requirement ID"
                value={form.requirement_id ?? ''}
                onChange={e => setForm(f => ({ ...f, requirement_id: e.target.value }))}
                size="small"
                placeholder="#XXXX#"
                sx={{ width: 140 }}
              />
              <TextField
                label="Deadline"
                type="date"
                value={form.deadline ?? ''}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                size="small"
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
            <TextField
              label="Observation"
              value={form.observation ?? ''}
              onChange={e => setForm(f => ({ ...f, observation: e.target.value }))}
              size="small"
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Responsible Person"
              value={form.responsible_person ?? ''}
              onChange={e => setForm(f => ({ ...f, responsible_person: e.target.value }))}
              size="small"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
