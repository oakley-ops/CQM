import { useEffect, useState } from 'react';
import { Alert, AlertTitle, Box, Button, Chip, Collapse, IconButton, Stack } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import { getAlertSummary, listAlerts } from '../../services/nexus/nexusService';
import type { AlertSummaryCount, NexusAlert } from '../../types/nexus';

interface Props {
  auditId?: number;
}

export default function AlertBanner({ auditId }: Props) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AlertSummaryCount | null>(null);
  const [topAlert, setTopAlert] = useState<NexusAlert | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [sum, alerts] = await Promise.all([
          getAlertSummary(),
          listAlerts(auditId),
        ]);
        if (!cancelled) {
          setSummary(sum);
          setTopAlert(alerts[0] ?? null);
          setDismissed(false);
        }
      } catch { /* silent — banner is non-critical */ }
    }
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [auditId]);

  if (!summary || summary.total === 0 || dismissed) return null;
  const isCritical = summary.critical > 0;
  const isHigh = summary.high > 0;
  if (!isCritical && !isHigh) return null;

  return (
    <Collapse in={!dismissed}>
      <Alert
        severity={isCritical ? 'error' : 'warning'}
        icon={isCritical ? <ErrorIcon /> : <WarningIcon />}
        action={
          <IconButton size="small" onClick={() => setDismissed(true)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
        sx={{ mb: 2, alignItems: 'flex-start' }}
      >
        <AlertTitle sx={{ fontWeight: 700 }}>
          {isCritical ? 'Critical compliance issues require immediate attention' : 'Compliance warnings require attention'}
        </AlertTitle>
        <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
          {summary.critical > 0 && (
            <Chip label={`${summary.critical} Critical`} size="small" color="error" variant="outlined" />
          )}
          {summary.high > 0 && (
            <Chip label={`${summary.high} High`} size="small" color="warning" variant="outlined" />
          )}
          {summary.medium > 0 && (
            <Chip label={`${summary.medium} Medium`} size="small" color="info" variant="outlined" />
          )}
        </Stack>
        {topAlert && (
          <Box sx={{ fontSize: 13, color: 'inherit', mb: 1 }}>
            <strong>{topAlert.title}</strong> — {topAlert.message}
          </Box>
        )}
        <Button
          size="small"
          variant="outlined"
          color={isCritical ? 'error' : 'warning'}
          onClick={() => navigate('/nexus/alerts')}
        >
          View all {summary.total} alerts
        </Button>
      </Alert>
    </Collapse>
  );
}
