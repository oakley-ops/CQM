import { useEffect, useState } from 'react';
import {
  Box, Button, Chip, Divider, FormControlLabel, MenuItem, Paper, Stack, Switch, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CircularProgress from '@mui/material/CircularProgress';
import AuditGradeBadge from '../../components/nexus/AuditGradeBadge';
import AlertBanner from '../../components/nexus/AlertBanner';
import AiReadinessPanel from '../../components/nexus/AiReadinessPanel';
import { getAudit, updateAudit } from '../../services/nexus/nexusService';
import type { AuditGrade, AuditStatus, NexusAuditRecord } from '../../types/nexus';

const STATUS_OPTIONS: AuditStatus[] = ['draft', 'in-progress', 'submitted', 'closed'];
const GRADE_OPTIONS: AuditGrade[] = ['A', 'B', 'C', 'D'];

const PRODUCT_CODES: { code: string; label: string }[] = [
  { code: 'ic', label: 'IC - Integrated Circuit' },
  { code: 'icm', label: 'ICM - IC Module' },
  { code: 'il', label: 'IL - Inlay' },
  { code: 'cb', label: 'CB - Card Body' },
  { code: 'icc', label: 'ICC - IC Card' },
  { code: 'p', label: 'P - Personalization' },
  { code: 'iacicm', label: 'iacICM - IAC Module' },
  { code: 'bsm', label: 'BSM - Biometric Sensor Module' },
  { code: 'iacil', label: 'iacIL - IAC Inlay' },
  { code: 'iac', label: 'IAC - Interactive Card' },
];

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auditId = Number(id);

  const [audit, setAudit] = useState<NexusAuditRecord | null>(null);
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    if (!auditId) return;
    getAudit(auditId).then(setAudit).catch(() => navigate('/nexus/audits'));
  }, [auditId, navigate]);

  const handleField = async (field: keyof NexusAuditRecord, value: unknown) => {
    if (!audit) return;
    setSaving(true);
    try {
      const updated = await updateAudit(auditId, { [field]: value } as Partial<NexusAuditRecord>);
      setAudit(updated);
    } finally {
      setSaving(false);
    }
  };

  const setVol = (code: string, key: 'total' | 'banking', value: string) => {
    setAudit(a => {
      if (!a) return a;
      const pv = { ...(a.production_volumes ?? {}) };
      pv[code] = { ...(pv[code] ?? {}), [key]: value === '' ? undefined : Number(value) };
      return { ...a, production_volumes: pv };
    });
  };
  const persistVolumes = () => { if (audit) handleField('production_volumes', audit.production_volumes ?? {}); };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/nexus/audits/${auditId}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NEXUS-Audit-${auditId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExportingPdf(false);
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
        <Button variant="contained" onClick={() => navigate(`/nexus/audits/${auditId}/workbook`)}>
          Open Workbook
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={exportingPdf ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfIcon />}
          onClick={handleExportPdf}
          disabled={exportingPdf}
        >
          {exportingPdf ? 'Exporting…' : 'Export PDF'}
        </Button>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Overview" />
        <Tab label="QMS Assessment" onClick={() => navigate(`/nexus/audits/${auditId}/qms`)} />
        <Tab label="Product Scope" onClick={() => navigate(`/nexus/audits/${auditId}/scope`)} />
        <Tab label="CAPA" onClick={() => navigate(`/nexus/audits/${auditId}/capa`)} />
        <Tab label="Qualification Plans" onClick={() => navigate(`/nexus/audits/${auditId}/plans`)} />
        <Tab label="Documents" onClick={() => navigate(`/nexus/audits/${auditId}/documents`)} />
        <Tab label="Components" onClick={() => navigate(`/nexus/audits/${auditId}/components`)} />
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
              onChange={e => handleField('grade', e.target.value || null)}
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

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Auditor Email" value={audit.auditor_email ?? ''} size="small" fullWidth
              onBlur={e => handleField('auditor_email', e.target.value)}
              onChange={e => setAudit(a => a ? { ...a, auditor_email: e.target.value } : a)} />
            <TextField label="Auditor Phone" value={audit.auditor_phone ?? ''} size="small" sx={{ width: 220 }}
              onBlur={e => handleField('auditor_phone', e.target.value)}
              onChange={e => setAudit(a => a ? { ...a, auditor_phone: e.target.value } : a)} />
          </Stack>

          <Divider textAlign="left"><Typography variant="caption" color="text.secondary">CQM Contacts</Typography></Divider>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="CQM Primary Contact" value={audit.primary_contact_name ?? ''} size="small" fullWidth
              onBlur={e => handleField('primary_contact_name', e.target.value)}
              onChange={e => setAudit(a => a ? { ...a, primary_contact_name: e.target.value } : a)} />
            <TextField label="Email" value={audit.primary_contact_email ?? ''} size="small" fullWidth
              onBlur={e => handleField('primary_contact_email', e.target.value)}
              onChange={e => setAudit(a => a ? { ...a, primary_contact_email: e.target.value } : a)} />
            <TextField label="Phone" value={audit.primary_contact_phone ?? ''} size="small" sx={{ width: 170 }}
              onBlur={e => handleField('primary_contact_phone', e.target.value)}
              onChange={e => setAudit(a => a ? { ...a, primary_contact_phone: e.target.value } : a)} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="CQM Audit Contact (if different)" value={audit.audit_contact_name ?? ''} size="small" fullWidth
              onBlur={e => handleField('audit_contact_name', e.target.value)}
              onChange={e => setAudit(a => a ? { ...a, audit_contact_name: e.target.value } : a)} />
            <TextField label="Email" value={audit.audit_contact_email ?? ''} size="small" fullWidth
              onBlur={e => handleField('audit_contact_email', e.target.value)}
              onChange={e => setAudit(a => a ? { ...a, audit_contact_email: e.target.value } : a)} />
            <TextField label="Phone" value={audit.audit_contact_phone ?? ''} size="small" sx={{ width: 170 }}
              onBlur={e => handleField('audit_contact_phone', e.target.value)}
              onChange={e => setAudit(a => a ? { ...a, audit_contact_phone: e.target.value } : a)} />
          </Stack>

          <Divider textAlign="left"><Typography variant="caption" color="text.secondary">Identifiers and Staff</Typography></Divider>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Customer ID (CID)" value={audit.customer_id ?? ''} size="small" fullWidth
              onBlur={e => handleField('customer_id', e.target.value)}
              onChange={e => setAudit(a => a ? { ...a, customer_id: e.target.value } : a)} />
            <TextField label="CVCS Reference" value={audit.cvcs_reference ?? ''} size="small" fullWidth
              onBlur={e => handleField('cvcs_reference', e.target.value)}
              onChange={e => setAudit(a => a ? { ...a, cvcs_reference: e.target.value } : a)} />
            <TextField label="Staff (Total)" type="number" value={audit.staff_total ?? ''} size="small" sx={{ width: 130 }}
              onBlur={e => handleField('staff_total', e.target.value === '' ? null : Number(e.target.value))}
              onChange={e => setAudit(a => a ? { ...a, staff_total: e.target.value === '' ? undefined : Number(e.target.value) } : a)} />
            <TextField label="Staff (Production)" type="number" value={audit.staff_in_production ?? ''} size="small" sx={{ width: 150 }}
              onBlur={e => handleField('staff_in_production', e.target.value === '' ? null : Number(e.target.value))}
              onChange={e => setAudit(a => a ? { ...a, staff_in_production: e.target.value === '' ? undefined : Number(e.target.value) } : a)} />
          </Stack>

          <Divider textAlign="left"><Typography variant="caption" color="text.secondary">Previous and Next Audit</Typography></Divider>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField select label="Previous Audit Type" value={audit.previous_audit_type ?? ''} size="small" sx={{ width: 190 }}
              onChange={e => handleField('previous_audit_type', e.target.value || null)}>
              <MenuItem value="">(none)</MenuItem>
              <MenuItem value="on-site">On-site</MenuItem>
              <MenuItem value="remote">Remote</MenuItem>
            </TextField>
            <TextField select label="Previous Rank" value={audit.previous_audit_rank ?? ''} size="small" sx={{ width: 150 }}
              onChange={e => handleField('previous_audit_rank', e.target.value || null)}>
              <MenuItem value="">(none)</MenuItem>
              {GRADE_OPTIONS.map(g => <MenuItem key={g} value={g}>Grade {g}</MenuItem>)}
            </TextField>
            <FormControlLabel
              control={<Switch checked={!!audit.next_audit_remote_allowed}
                onChange={e => handleField('next_audit_remote_allowed', e.target.checked)} />}
              label={<Typography variant="body2">Next audit may be remote</Typography>} />
          </Stack>

          <Divider textAlign="left"><Typography variant="caption" color="text.secondary">Audit Conclusion</Typography></Divider>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Strengths" value={audit.strengths ?? ''} size="small" multiline rows={2} fullWidth
              onBlur={e => handleField('strengths', e.target.value)}
              onChange={e => setAudit(a => a ? { ...a, strengths: e.target.value } : a)} />
            <TextField label="Weaknesses" value={audit.weaknesses ?? ''} size="small" multiline rows={2} fullWidth
              onBlur={e => handleField('weaknesses', e.target.value)}
              onChange={e => setAudit(a => a ? { ...a, weaknesses: e.target.value } : a)} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Improvements since previous audit" value={audit.improvements ?? ''} size="small" multiline rows={2} fullWidth
              onBlur={e => handleField('improvements', e.target.value)}
              onChange={e => setAudit(a => a ? { ...a, improvements: e.target.value } : a)} />
            <TextField label="Regressions since previous audit" value={audit.regressions ?? ''} size="small" multiline rows={2} fullWidth
              onBlur={e => handleField('regressions', e.target.value)}
              onChange={e => setAudit(a => a ? { ...a, regressions: e.target.value } : a)} />
          </Stack>

          <Divider textAlign="left"><Typography variant="caption" color="text.secondary">Production Volumes (per CQM product)</Typography></Divider>
          <Stack spacing={1}>
            {PRODUCT_CODES.map(pc => (
              <Stack key={pc.code} direction="row" spacing={2} alignItems="center">
                <Typography variant="body2" sx={{ width: 230 }}>{pc.label}</Typography>
                <TextField label="Total" type="number" size="small" sx={{ width: 130 }}
                  value={audit.production_volumes?.[pc.code]?.total ?? ''}
                  onChange={e => setVol(pc.code, 'total', e.target.value)}
                  onBlur={persistVolumes} />
                <TextField label="For banking" type="number" size="small" sx={{ width: 150 }}
                  value={audit.production_volumes?.[pc.code]?.banking ?? ''}
                  onChange={e => setVol(pc.code, 'banking', e.target.value)}
                  onBlur={persistVolumes} />
              </Stack>
            ))}
          </Stack>
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
        <Button variant="outlined" onClick={() => navigate(`/nexus/audits/${auditId}/plans`)}>
          Qualification Plans →
        </Button>
        <Button variant="outlined" onClick={() => navigate(`/nexus/audits/${auditId}/documents`)}>
          Documents →
        </Button>
        <Button variant="outlined" onClick={() => navigate(`/nexus/audits/${auditId}/components`)}>
          Components →
        </Button>
      </Stack>

      {/* ── AI Readiness ── */}
      <Box mt={3}>
        <AiReadinessPanel auditId={auditId} />
      </Box>
    </Box>
  );
}
