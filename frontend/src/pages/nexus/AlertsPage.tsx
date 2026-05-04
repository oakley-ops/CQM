import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Collapse, Divider,
  Drawer, List, ListItem, ListItemText, Paper, Stack, Typography,
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import { dismissAlert, listAlerts, markAlertRead, runWatchdog, getAlertAdvice } from '../../services/nexus/nexusService';
import type { AlertAdvice } from '../../services/nexus/nexusService';
import type { AlertSeverity, NexusAlert } from '../../types/nexus';

const SEVERITY_ICON: Record<AlertSeverity, React.ReactNode> = {
  critical: <ErrorIcon color="error" />,
  high:     <WarningIcon color="warning" />,
  medium:   <InfoIcon color="info" />,
  low:      <CheckCircleIcon color="action" />,
};

const SEVERITY_COLOR: Record<AlertSeverity, 'error' | 'warning' | 'info' | 'default'> = {
  critical: 'error',
  high:     'warning',
  medium:   'info',
  low:      'default',
};

const URGENCY_COLOR: Record<string, 'error' | 'warning' | 'success'> = {
  immediate: 'error',
  'this-week': 'warning',
  'this-month': 'success',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<NexusAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  // Advice drawer state
  const [adviceAlert, setAdviceAlert] = useState<NexusAlert | null>(null);
  const [advice, setAdvice] = useState<AlertAdvice | null>(null);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceError, setAdviceError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAlerts(await listAlerts());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id: number) => {
    await markAlertRead(id);
    setAlerts(a => a.map(x => x.id === id ? { ...x, is_read: true } : x));
  };

  const handleDismiss = async (id: number) => {
    await dismissAlert(id);
    setAlerts(a => a.filter(x => x.id !== id));
    if (adviceAlert?.id === id) setAdviceAlert(null);
  };

  const handleRunWatchdog = async () => {
    setRunning(true);
    try {
      await runWatchdog();
      load();
    } finally {
      setRunning(false);
    }
  };

  const handleOpenAdvice = async (alert: NexusAlert) => {
    setAdviceAlert(alert);
    setAdvice(null);
    setAdviceError('');
    setAdviceLoading(true);
    try {
      const result = await getAlertAdvice(alert.id);
      setAdvice(result);
    } catch {
      setAdviceError('Failed to get AI advice. Check that ANTHROPIC_API_KEY is set.');
    } finally {
      setAdviceLoading(false);
    }
  };

  const bySeverity = (sev: AlertSeverity) => alerts.filter(a => a.severity === sev);

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Compliance Alerts</Typography>
          <Typography variant="body2" color="text.secondary">
            Active watchdog alerts — checked every 15 minutes against all audit records.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {(['critical', 'high', 'medium', 'low'] as AlertSeverity[]).map(sev => {
            const count = bySeverity(sev).length;
            return count > 0 ? (
              <Chip key={sev} label={`${count} ${sev}`} size="small" color={SEVERITY_COLOR[sev]} />
            ) : null;
          })}
          <Button variant="outlined" size="small" onClick={handleRunWatchdog} disabled={running}>
            {running ? 'Running…' : 'Run Watchdog Now'}
          </Button>
        </Stack>
      </Stack>

      {alerts.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
          <Typography fontWeight={600}>All clear — no active compliance alerts.</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            The watchdog runs every 15 minutes and will alert you if anything falls out of compliance.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {alerts.map(alert => (
            <Paper
              key={alert.id}
              variant="outlined"
              sx={{
                p: 2.5, borderRadius: 2,
                borderColor: alert.severity === 'critical' ? 'error.light'
                  : alert.severity === 'high' ? 'warning.light' : 'divider',
                bgcolor: !alert.is_read ? 'action.hover' : 'inherit',
                opacity: alert.is_read ? 0.85 : 1,
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                {SEVERITY_ICON[alert.severity]}
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={0.5} flexWrap="wrap">
                    <Typography fontWeight={700} variant="body1">{alert.title}</Typography>
                    <Chip label={alert.severity} size="small" color={SEVERITY_COLOR[alert.severity]} sx={{ fontSize: 10, height: 18 }} />
                    {!alert.is_read && <Chip label="New" size="small" color="primary" sx={{ fontSize: 10, height: 18 }} />}
                    {alert.requirement_id && (
                      <Chip label={alert.requirement_id} size="small" sx={{ fontFamily: 'monospace', fontSize: 10, height: 18, bgcolor: 'action.hover' }} />
                    )}
                  </Stack>
                  <Typography variant="body2" color="text.secondary" mb={1}>{alert.message}</Typography>
                  {alert.action_required && (
                    <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Action Required
                      </Typography>
                      <Typography variant="body2" mt={0.25}>{alert.action_required}</Typography>
                    </Box>
                  )}
                </Box>
                <Stack direction="row" spacing={0.5} flexShrink={0}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AutoAwesomeIcon />}
                    onClick={() => handleOpenAdvice(alert)}
                    sx={{ fontSize: 11 }}
                  >
                    What to do?
                  </Button>
                  {!alert.is_read && (
                    <Button size="small" variant="outlined" onClick={() => handleMarkRead(alert.id)}>
                      Mark read
                    </Button>
                  )}
                  <Button size="small" color="error" onClick={() => handleDismiss(alert.id)}>
                    Dismiss
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* ── AI Advice Drawer ── */}
      <Drawer
        anchor="right"
        open={!!adviceAlert}
        onClose={() => setAdviceAlert(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 3 } }}
      >
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <AutoAwesomeIcon color="primary" />
          <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
            What should I do?
          </Typography>
          <IconButton onClick={() => setAdviceAlert(null)} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>

        {adviceAlert && (
          <Box mb={2} p={1.5} bgcolor="action.hover" borderRadius={1}>
            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
              {SEVERITY_ICON[adviceAlert.severity]}
              <Typography fontWeight={700} variant="body2">{adviceAlert.title}</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">{adviceAlert.message}</Typography>
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        {adviceLoading && (
          <Stack alignItems="center" spacing={2} py={4}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">Claude is analysing this alert…</Typography>
          </Stack>
        )}

        {adviceError && <Alert severity="error">{adviceError}</Alert>}

        <Collapse in={!!advice}>
          {advice && (
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle2" fontWeight={700}>Urgency</Typography>
                <Chip
                  label={advice.urgency.replace('-', ' ')}
                  size="small"
                  color={URGENCY_COLOR[advice.urgency] ?? 'default'}
                  sx={{ textTransform: 'capitalize' }}
                />
              </Stack>

              <Box>
                <Typography variant="subtitle2" fontWeight={700} mb={0.5}>Steps to resolve</Typography>
                <List dense disablePadding>
                  {advice.steps.map((step, i) => (
                    <ListItem key={i} sx={{ py: 0.5, pl: 0, alignItems: 'flex-start' }}>
                      <Typography variant="body2" color="primary" sx={{ mr: 1, fontWeight: 700, minWidth: 20 }}>{i + 1}.</Typography>
                      <ListItemText primary={step} primaryTypographyProps={{ variant: 'body2' }} />
                    </ListItem>
                  ))}
                </List>
              </Box>

              {advice.evidence_needed?.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} mb={0.5}>Evidence to collect</Typography>
                  <List dense disablePadding>
                    {advice.evidence_needed.map((e, i) => (
                      <ListItem key={i} sx={{ py: 0.25, pl: 1 }}>
                        <ListItemText primary={`• ${e}`} primaryTypographyProps={{ variant: 'body2' }} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {advice.who_to_involve?.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} mb={0.5}>Who to involve</Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                    {advice.who_to_involve.map((who, i) => (
                      <Chip key={i} label={who} size="small" variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              )}

              <Button
                variant="outlined"
                size="small"
                startIcon={<AutoAwesomeIcon />}
                onClick={() => handleOpenAdvice(adviceAlert!)}
              >
                Re-run
              </Button>
            </Stack>
          )}
        </Collapse>
      </Drawer>
    </Box>
  );
}
