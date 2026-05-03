import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Divider, LinearProgress,
  Paper, Stack, Typography,
} from '@mui/material';
import {
  FactCheck as QmsIcon,
  CategoryOutlined as ScopeIcon,
  PrecisionManufacturing as QualIcon,
  ReportProblem as CapaIcon,
  ArticleOutlined as DocsIcon,
  Notifications as AlertsIcon,
  MonitorHeart as ConformityIcon,
  Warning as WarningIcon,
  ErrorOutline as CriticalIcon,
  CheckCircleOutline as OkIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import AuditGradeBadge from '../../components/nexus/AuditGradeBadge';
import {
  getDashboardStats, listAudits, listAlerts, getAlertSummary,
} from '../../services/nexus/nexusService';
import type {
  NexusAuditRecord, NexusAlert, NexusDashboardStats, AlertSummaryCount, AlertSeverity,
} from '../../types/nexus';

const SEVERITY_COLOR: Record<AlertSeverity, 'error' | 'warning' | 'info' | 'default'> = {
  critical: 'error',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 150 }}>
      <Typography variant="h4" fontWeight={800} color={color ?? 'text.primary'} lineHeight={1}>
        {value}
      </Typography>
      <Typography variant="body2" fontWeight={600} mt={0.5}>{label}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Paper>
  );
}

function AuditRow({ audit }: { audit: NexusAuditRecord }) {
  const navigate = useNavigate();
  const today = new Date();
  const nextDate = audit.next_audit_date ? new Date(audit.next_audit_date) : null;
  const daysToAudit = nextDate ? Math.floor((nextDate.getTime() - today.getTime()) / 86400000) : null;

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, borderRadius: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
      onClick={() => navigate(`/nexus/audits/${audit.id}`)}
    >
      <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography fontWeight={700}>{audit.site_name}</Typography>
          <Typography variant="body2" color="text.secondary">{audit.company}{audit.country ? ` · ${audit.country}` : ''}</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          {audit.grade && <AuditGradeBadge grade={audit.grade} />}
          <Chip
            label={audit.status}
            size="small"
            color={audit.status === 'completed' ? 'success' : audit.status === 'in-progress' ? 'info' : 'default'}
          />
          {daysToAudit !== null && (
            <Chip
              label={daysToAudit <= 0 ? 'Audit overdue' : daysToAudit <= 30 ? `${daysToAudit}d to audit` : `Next: ${audit.next_audit_date}`}
              size="small"
              color={daysToAudit !== null && daysToAudit <= 30 ? 'warning' : 'default'}
              variant="outlined"
            />
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

const MODULES = [
  { label: 'QMS Assessment',      icon: <QmsIcon />,   path: (id: number) => `/nexus/audits/${id}/qms`,       desc: '31 or 60 requirements' },
  { label: 'Product Scope',       icon: <ScopeIcon />, path: (id: number) => `/nexus/audits/${id}/scope`,     desc: '90 process steps per product' },
  { label: 'Qual. Plans',         icon: <QualIcon />,  path: (id: number) => `/nexus/audits/${id}/plans`,     desc: '#0706# gate + #0571# reviews' },
  { label: 'CAPA',                icon: <CapaIcon />,  path: (id: number) => `/nexus/audits/${id}/capa`,      desc: 'Corrective action tracking' },
  { label: 'Documents',           icon: <DocsIcon />,  path: (id: number) => `/nexus/audits/${id}/documents`, desc: 'Evidence document register' },
  { label: 'Conformity',          icon: <ConformityIcon />, path: (_id: number) => `/nexus/conformity`,      desc: '#0701# / #0702# monitoring' },
  { label: 'All Alerts',          icon: <AlertsIcon />,path: (_id: number) => `/nexus/alerts`,               desc: 'Compliance watchdog feed' },
];

export default function NexusDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<NexusDashboardStats | null>(null);
  const [audits, setAudits] = useState<NexusAuditRecord[]>([]);
  const [alerts, setAlerts] = useState<NexusAlert[]>([]);
  const [alertSummary, setAlertSummary] = useState<AlertSummaryCount | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, al, as_] = await Promise.all([
        getDashboardStats(),
        listAudits(),
        listAlerts(),
        getAlertSummary(),
      ]);
      setStats(s);
      setAudits(a);
      setAlerts(al.slice(0, 8));
      setAlertSummary(as_);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high');
  const activeAudits = audits.filter(a => a.status !== 'archived');
  const firstAudit = activeAudits[0];

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>

      {/* ── Header ── */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 36, height: 36, borderRadius: '10px',
                background: 'linear-gradient(135deg, #FF9800, #F44336)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: 15, letterSpacing: -0.5 }}>Nx</Typography>
            </Box>
            <Typography variant="h5" fontWeight={800} letterSpacing="-0.03em">NEXUS Dashboard</Typography>
            <Chip label="CQMAP V3.A" size="small" sx={{ fontSize: 10 }} variant="outlined" />
          </Stack>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Qualification Hub — Mastercard card manufacturing audit readiness
          </Typography>
        </Box>
        <Button variant="contained" size="small" onClick={() => navigate('/nexus/audits')}>
          All Audits
        </Button>
        <Button variant="outlined" size="small" onClick={() => navigate('/nexus/alerts')}
          color={alertSummary && alertSummary.critical > 0 ? 'error' : 'primary'}>
          {alertSummary?.total ? `${alertSummary.total} Alert${alertSummary.total > 1 ? 's' : ''}` : 'Alerts'}
        </Button>
      </Stack>

      {/* ── Critical alerts banner ── */}
      {criticalAlerts.length > 0 && (
        <Paper
          variant="outlined"
          sx={{ p: 2, mb: 2, borderRadius: 2, borderColor: 'error.main', bgcolor: 'rgba(198,40,40,0.04)' }}
        >
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <CriticalIcon color="error" fontSize="small" />
            <Typography fontWeight={700} color="error.main">
              {criticalAlerts.length} critical / high alert{criticalAlerts.length > 1 ? 's' : ''} require action
            </Typography>
          </Stack>
          <Stack spacing={0.5}>
            {criticalAlerts.map(a => (
              <Typography key={a.id} variant="body2">
                <Chip label={a.severity} size="small" color={SEVERITY_COLOR[a.severity]} sx={{ mr: 1, fontSize: 10, height: 18 }} />
                {a.title}
              </Typography>
            ))}
          </Stack>
          <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/nexus/alerts')}>View all alerts →</Button>
        </Paper>
      )}

      {/* ── Stats ── */}
      {stats && (
        <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
          <StatCard label="Active Audits" value={stats.totalAudits} sub="draft / in-progress / submitted" />
          <StatCard label="Open CAPAs" value={stats.openCapas} color={stats.openCapas > 0 ? 'warning.main' : undefined} />
          <StatCard
            label="Overdue CAPAs" value={stats.overdueCapas}
            color={stats.overdueCapas > 0 ? 'error.main' : undefined}
            sub={stats.overdueCapas > 0 ? 'deadline passed' : 'none overdue'}
          />
          <StatCard
            label="Unread Alerts" value={stats.unreadAlerts}
            color={stats.unreadAlerts > 0 ? 'warning.main' : undefined}
          />
        </Stack>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>

        {/* ── Left: Active Audits ── */}
        <Box sx={{ flex: 1.6 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
            <Typography variant="h6" fontWeight={700}>Active Audits</Typography>
            <Chip label={activeAudits.length} size="small" />
          </Stack>

          {activeAudits.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <Typography color="text.secondary" mb={1.5}>No active audits. Create your first audit record to start.</Typography>
              <Button variant="contained" onClick={() => navigate('/nexus/audits')}>Create Audit Record</Button>
            </Paper>
          ) : (
            <Stack spacing={1.5}>
              {activeAudits.map(a => <AuditRow key={a.id} audit={a} />)}
            </Stack>
          )}

          {/* ── Module Quick Nav (for first active audit) ── */}
          {firstAudit && (
            <Box mt={3}>
              <Typography variant="subtitle2" color="text.secondary" mb={1.5} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                {firstAudit.site_name} — Quick Navigate
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {MODULES.map(m => (
                  <Button
                    key={m.label}
                    variant="outlined"
                    size="small"
                    startIcon={m.icon}
                    onClick={() => navigate(m.path(firstAudit.id))}
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                  >
                    {m.label}
                  </Button>
                ))}
              </Stack>
            </Box>
          )}
        </Box>

        {/* ── Right: Recent Alerts ── */}
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
            <Typography variant="h6" fontWeight={700}>Recent Alerts</Typography>
            {alertSummary && alertSummary.total > 0 && (
              <Chip label={`${alertSummary.total} unread`} size="small" color="warning" />
            )}
          </Stack>

          {alerts.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
              <OkIcon color="success" sx={{ fontSize: 32, mb: 0.5 }} />
              <Typography variant="body2" color="text.secondary">No active alerts — system is healthy.</Typography>
            </Paper>
          ) : (
            <Stack spacing={1}>
              {alerts.map(a => (
                <Paper key={a.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                  <Stack direction="row" alignItems="flex-start" spacing={1}>
                    {(a.severity === 'critical' || a.severity === 'high')
                      ? <WarningIcon sx={{ fontSize: 16, color: a.severity === 'critical' ? 'error.main' : 'warning.main', mt: 0.2 }} />
                      : <OkIcon sx={{ fontSize: 16, color: 'info.main', mt: 0.2 }} />
                    }
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center" mb={0.2}>
                        <Chip label={a.severity} size="small" color={SEVERITY_COLOR[a.severity]} sx={{ fontSize: 9, height: 16 }} />
                        {a.requirement_id && (
                          <Chip label={a.requirement_id} size="small" sx={{ fontSize: 9, height: 16, fontFamily: 'monospace' }} />
                        )}
                      </Stack>
                      <Typography variant="body2" fontWeight={600} lineHeight={1.3}>{a.title}</Typography>
                    </Box>
                  </Stack>
                </Paper>
              ))}
              {alerts.length >= 8 && (
                <Button size="small" onClick={() => navigate('/nexus/alerts')}>View all alerts →</Button>
              )}
            </Stack>
          )}

          {/* ── Alert summary bar ── */}
          {alertSummary && alertSummary.total > 0 && (
            <Box mt={2}>
              <Stack direction="row" justifyContent="space-between" mb={0.5}>
                <Typography variant="caption" color="text.secondary">Alert severity breakdown</Typography>
                <Typography variant="caption" fontWeight={700}>{alertSummary.total} total</Typography>
              </Stack>
              {(['critical', 'high', 'medium', 'low'] as const).map(sev => (
                alertSummary[sev] > 0 && (
                  <Stack key={sev} direction="row" alignItems="center" spacing={1} mb={0.5}>
                    <Typography variant="caption" sx={{ width: 50, textTransform: 'capitalize' }}>{sev}</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(alertSummary[sev] / alertSummary.total) * 100}
                      color={SEVERITY_COLOR[sev] === 'default' ? 'inherit' : SEVERITY_COLOR[sev]}
                      sx={{ flex: 1, height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption" fontWeight={700} sx={{ width: 20, textAlign: 'right' }}>
                      {alertSummary[sev]}
                    </Typography>
                  </Stack>
                )
              ))}
            </Box>
          )}
        </Box>
      </Stack>

      <Divider sx={{ my: 4 }} />

      {/* ── Footer ── */}
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        <Typography variant="caption" color="text.secondary">
          Mastercard CQMAP V3.A · Conformity scale: NC+ · nc- · RI · Full · NCC · tbd · n/a
        </Typography>
        <Button size="small" variant="text" onClick={() => navigate('/nexus/audits')}>
          Manage Audits
        </Button>
        <Button size="small" variant="text" onClick={() => navigate('/nexus/alerts')}>
          Compliance Watchdog
        </Button>
      </Stack>
    </Box>
  );
}
