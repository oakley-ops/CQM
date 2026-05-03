import { useEffect, useState } from 'react';
import {
  Box, Button, Chip, MenuItem, Paper, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AuditGradeBadge from '../../components/nexus/AuditGradeBadge';
import AlertBanner from '../../components/nexus/AlertBanner';
import { getAudit, updateAudit } from '../../services/nexus/nexusService';
import type { AuditGrade, AuditStatus, NexusAuditRecord } from '../../types/nexus';

const STATUS_OPTIONS: AuditStatus[] = ['draft', 'in-progress', 'submitted', 'completed', 'archived'];
const GRADE_OPTIONS: AuditGrade[] = ['A', 'B', 'C', 'D'];

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auditId = Number(id);

  const [audit, setAudit] = useState<NexusAuditRecord | null>(null);
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auditId) return;
    getAudit(auditId).then(setAudit).catch(() => navigate('/nexus/audits'));
  }, [auditId, navigate]);

  const handleField = async (field: keyof NexusAuditRecord, value: string | boolean) => {
    if (!audit) return;
    setSaving(true);
    try {
      const updated = await updateAudit(auditId, { [field]: value });
      setAudit(updated);
    } finally {
      setSaving(false);
    }
  };

  if (!audit) return null;

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <AlertBanner auditId={auditId} />

      {/* ── Header ── */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/nexus/audits')} size="small">
          All Audits
        </Button>
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="h5" fontWeight={700}>{audit.site_name}</Typography>
            <Chip label={audit.status} size="small" sx={{ textTransform: 'capitalize' }} />
            {audit.grade && <AuditGradeBadge grade={audit.grade} showMonths />}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {audit.company} {audit.country ? `· ${audit.country}` : ''}
          </Typography>
        </Box>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Overview" />
        <Tab label="QMS Assessment" onClick={() => navigate(`/nexus/audits/${auditId}/qms`)} />
        <Tab label="Product Scope" onClick={() => navigate(`/nexus/audits/${auditId}/scope`)} />
        <Tab label="CAPA" onClick={() => navigate(`/nexus/audits/${auditId}/capa`)} />
      </Tabs>

      {/* ── Coversheet Fields ── */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={700} mb={2}>Coversheet Details</Typography>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Site Name"
              value={audit.site_name}
              size="small"
              onBlur={e => handleField('site_name', e.target.value)}
              onChange={e => setAudit(a => a ? { ...a, site_name: e.target.value } : a)}
              fullWidth
            />
            <TextField
              label="Site Code"
              value={audit.site_code ?? ''}
              size="small"
              onBlur={e => handleField('site_code', e.target.value)}
              onChange={e => setAudit(a => a ? { ...a, site_code: e.target.value } : a)}
              sx={{ width: 160 }}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Company"
              value={audit.company}
              size="small"
              onBlur={e => handleField('company', e.target.value)}
              onChange={e => setAudit(a => a ? { ...a, company: e.target.value } : a)}
              fullWidth
            />
            <TextField
              label="Country"
              value={audit.country ?? ''}
              size="small"
              onBlur={e => handleField('country', e.target.value)}
              onChange={e => setAudit(a => a ? { ...a, country: e.target.value } : a)}
              sx={{ width: 180 }}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Auditor Name"
              value={audit.auditor_name ?? ''}
              size="small"
              onBlur={e => handleField('auditor_name', e.target.value)}
              onChange={e => setAudit(a => a ? { ...a, auditor_name: e.target.value } : a)}
              fullWidth
            />
            <TextField
              label="Auditor Company"
              value={audit.auditor_company ?? ''}
              size="small"
              onBlur={e => handleField('auditor_company', e.target.value)}
              onChange={e => setAudit(a => a ? { ...a, auditor_company: e.target.value } : a)}
              fullWidth
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Audit Start"
              type="date"
              value={audit.audit_date_start ?? ''}
              size="small"
              InputLabelProps={{ shrink: true }}
              onBlur={e => handleField('audit_date_start', e.target.value)}
              onChange={e => setAudit(a => a ? { ...a, audit_date_start: e.target.value } : a)}
              fullWidth
            />
            <TextField
              label="Audit End"
              type="date"
              value={audit.audit_date_end ?? ''}
              size="small"
              InputLabelProps={{ shrink: true }}
              onBlur={e => handleField('audit_date_end', e.target.value)}
              onChange={e => setAudit(a => a ? { ...a, audit_date_end: e.target.value } : a)}
              fullWidth
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label="Status"
              value={audit.status}
              size="small"
              onChange={e => handleField('status', e.target.value)}
              sx={{ width: 200 }}
            >
              {STATUS_OPTIONS.map(s => (
                <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Audit Grade"
              value={audit.grade ?? ''}
              size="small"
              onChange={e => handleField('grade', e.target.value)}
              sx={{ width: 160 }}
            >
              <MenuItem value="">— not set —</MenuItem>
              {GRADE_OPTIONS.map(g => (
                <MenuItem key={g} value={g}>Grade {g}</MenuItem>
              ))}
            </TextField>

            {audit.next_audit_date && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">Next audit:</Typography>
                <Chip label={audit.next_audit_date} size="small" color="primary" variant="outlined" />
              </Box>
            )}
          </Stack>

          <TextField
            label="Notes"
            value={audit.notes ?? ''}
            size="small"
            multiline
            rows={3}
            onBlur={e => handleField('notes', e.target.value)}
            onChange={e => setAudit(a => a ? { ...a, notes: e.target.value } : a)}
            fullWidth
          />
        </Stack>

        {saving && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Saving…
          </Typography>
        )}
      </Paper>

      {/* ── Quick Nav ── */}
      <Stack direction="row" spacing={2} mt={3} flexWrap="wrap">
        <Button variant="outlined" onClick={() => navigate(`/nexus/audits/${auditId}/qms`)}>
          QMS Assessment →
        </Button>
        <Button variant="outlined" onClick={() => navigate(`/nexus/audits/${auditId}/scope`)}>
          Product Scope →
        </Button>
        <Button variant="outlined" onClick={() => navigate(`/nexus/audits/${auditId}/capa`)}>
          CAPA →
        </Button>
      </Stack>
    </Box>
  );
}
