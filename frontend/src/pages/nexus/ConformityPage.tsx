import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Collapse, LinearProgress,
  Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';
import { getConformityOverview, getCardTypeSessions } from '../../services/nexus/nexusService';
import type { ConformityMonitorRow, ConformitySessionRow } from '../../types/nexus';

function passRateColor(rate: number | null): 'success' | 'warning' | 'error' | 'inherit' {
  if (rate === null) return 'inherit';
  if (rate >= 90) return 'success';
  if (rate >= 80) return 'warning';
  return 'error';
}

function SessionsTable({ cardType }: { cardType: string }) {
  const [rows, setRows] = useState<ConformitySessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCardTypeSessions(cardType, 15)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [cardType]);

  if (loading) return <CircularProgress size={20} sx={{ m: 2 }} />;
  if (rows.length === 0) return <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>No approved sessions found.</Typography>;

  return (
    <TableContainer sx={{ maxHeight: 320 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Session</TableCell>
            <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Batch</TableCell>
            <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Type</TableCell>
            <TableCell sx={{ fontWeight: 700, width: 80, bgcolor: 'background.paper' }}>Entries</TableCell>
            <TableCell sx={{ fontWeight: 700, width: 100, bgcolor: 'background.paper' }}>Pass Rate</TableCell>
            <TableCell sx={{ fontWeight: 700, width: 60, bgcolor: 'background.paper' }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(row => {
            const color = passRateColor(row.pass_rate);
            return (
              <TableRow key={row.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                    {row.session_number}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{row.test_date}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">{row.batch_lot_number}</Typography>
                </TableCell>
                <TableCell>
                  <Chip label={row.session_type} size="small" variant="outlined"
                    color={row.session_type === 'Qualification' ? 'primary' : 'default'} />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{row.total_entries}</Typography>
                </TableCell>
                <TableCell>
                  {row.pass_rate !== null ? (
                    <Stack spacing={0.5}>
                      <Typography variant="body2" fontWeight={700} color={`${color}.main`}>
                        {row.pass_rate}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={row.pass_rate}
                        color={color === 'inherit' ? undefined : color}
                        sx={{ height: 4, borderRadius: 2 }}
                      />
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">—</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip label={row.status} size="small"
                    color={row.status === 'approved' ? 'success' : row.status === 'submitted' ? 'info' : 'default'}
                    sx={{ fontSize: 9, height: 16 }} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function ConformityPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ConformityMonitorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getConformityOverview());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const atRiskCount = rows.filter(r => r.monitoring_risk || r.threshold_risk).length;

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 1300, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Button startIcon={<ArrowBackIcon />} size="small" onClick={() => navigate('/nexus')}>
          NEXUS
        </Button>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>Product Conformity Monitoring</Typography>
          <Typography variant="body2" color="text.secondary">
            Continuous monitoring records (#0701#) and pass rate thresholds (#0702#) per product type.
          </Typography>
        </Box>
        {atRiskCount > 0 && (
          <Chip label={`${atRiskCount} product${atRiskCount > 1 ? 's' : ''} at risk`} color="warning" size="small" />
        )}
        <Button size="small" startIcon={<RefreshIcon />} variant="outlined" onClick={load}>Refresh</Button>
      </Stack>

      {rows.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
          <Typography color="text.secondary">
            No approved test sessions found. Submit and approve sessions in the Quality Test module to see conformity data here.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {rows.map(row => {
            const isExpanded = expanded === row.card_type;
            const color = passRateColor(row.pass_rate_90d);
            const hasRisk = row.monitoring_risk || row.threshold_risk;

            return (
              <Paper
                key={row.card_type}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  borderColor: hasRisk ? 'warning.main' : 'divider',
                  bgcolor: hasRisk ? 'rgba(237,108,2,0.03)' : 'inherit',
                }}
              >
                {/* ── Summary row ── */}
                <Stack
                  direction="row" alignItems="center" spacing={2} p={2}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setExpanded(isExpanded ? null : row.card_type)}
                >
                  {hasRisk
                    ? <WarningAmberIcon color="warning" fontSize="small" />
                    : <CheckCircleIcon color="success" fontSize="small" />}

                  <Typography fontWeight={700} sx={{ minWidth: 80, textTransform: 'uppercase' }}>
                    {row.card_type}
                  </Typography>

                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ flex: 1 }}>
                    <Chip label={`${row.total_sessions} sessions`} size="small" variant="outlined" />
                    <Chip label={`${row.sessions_last_30d} last 30d`} size="small"
                      color={row.sessions_last_30d === 0 ? 'error' : 'default'} variant="outlined" />
                    {row.last_session_date && (
                      <Typography variant="body2" color="text.secondary">
                        Last: {row.last_session_date}
                        {row.days_since_last !== null && ` (${row.days_since_last}d ago)`}
                      </Typography>
                    )}
                  </Stack>

                  {/* Pass rate */}
                  {row.pass_rate_90d !== null ? (
                    <Box sx={{ minWidth: 160 }}>
                      <Stack direction="row" justifyContent="space-between" mb={0.3}>
                        <Typography variant="caption" color="text.secondary">90d pass rate</Typography>
                        <Typography variant="caption" fontWeight={700} color={`${color}.main`}>
                          {row.pass_rate_90d}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={row.pass_rate_90d}
                        color={color === 'inherit' ? undefined : color}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                      {row.threshold_risk && (
                        <Typography variant="caption" color="error.main">Below 80% threshold</Typography>
                      )}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No entries yet</Typography>
                  )}

                  {/* Req chips */}
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="#0701# Continuous quality monitoring records">
                      <Chip
                        label="#0701#"
                        size="small"
                        color={row.monitoring_risk ? 'error' : 'success'}
                        sx={{ fontFamily: 'monospace', fontSize: 10 }}
                      />
                    </Tooltip>
                    <Tooltip title="#0702# Monitoring results meet pass thresholds">
                      <Chip
                        label="#0702#"
                        size="small"
                        color={row.threshold_risk ? 'error' : 'success'}
                        sx={{ fontFamily: 'monospace', fontSize: 10 }}
                      />
                    </Tooltip>
                  </Stack>

                  {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </Stack>

                {/* ── Expanded session table ── */}
                <Collapse in={isExpanded}>
                  <Box sx={{ px: 2, pb: 2, pt: 0 }}>
                    <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                      Recent sessions ({row.card_type}) — {row.total_entries_90d} entries in last 90 days
                    </Typography>
                    <SessionsTable cardType={row.card_type} />
                  </Box>
                </Collapse>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
