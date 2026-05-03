import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Paper, Stack, Typography,
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { dismissAlert, listAlerts, markAlertRead, runWatchdog } from '../../services/nexus/nexusService';
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

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<NexusAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

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
              <Chip
                key={sev}
                label={`${count} ${sev}`}
                size="small"
                color={SEVERITY_COLOR[sev]}
              />
            ) : null;
          })}
          <Button
            variant="outlined"
            size="small"
            onClick={handleRunWatchdog}
            disabled={running}
          >
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
                p: 2.5,
                borderRadius: 2,
                borderColor: alert.severity === 'critical' ? 'error.light'
                  : alert.severity === 'high' ? 'warning.light'
                  : 'divider',
                bgcolor: !alert.is_read ? 'action.hover' : 'inherit',
                opacity: alert.is_read ? 0.85 : 1,
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                {SEVERITY_ICON[alert.severity]}
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={0.5} flexWrap="wrap">
                    <Typography fontWeight={700} variant="body1">
                      {alert.title}
                    </Typography>
                    <Chip
                      label={alert.severity}
                      size="small"
                      color={SEVERITY_COLOR[alert.severity]}
                      sx={{ fontSize: 10, height: 18 }}
                    />
                    {!alert.is_read && (
                      <Chip label="New" size="small" color="primary" sx={{ fontSize: 10, height: 18 }} />
                    )}
                    {alert.requirement_id && (
                      <Chip
                        label={alert.requirement_id}
                        size="small"
                        sx={{ fontFamily: 'monospace', fontSize: 10, height: 18, bgcolor: 'action.hover' }}
                      />
                    )}
                  </Stack>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    {alert.message}
                  </Typography>
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
    </Box>
  );
}
