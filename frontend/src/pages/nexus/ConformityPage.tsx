import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Collapse, LinearProgress,
  Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useNavigate } from 'react-router-dom';
import { getConformityOverview, getCardTypeSessions, postSpcAnalysis } from '../../services/nexus/nexusService';
import type { AiSpcResult, ConformityMonitorRow, ConformitySessionRow } from '../../types/nexus';

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
  const [spcResults, setSpcResults] = useState<Record<string, AiSpcResult>>({});
  const [spcLoading, setSpcLoading] = useState<Record<string, boolean>>({});
  const [spcError, setSpcError] = useState<Record<string, string>>({});
  const [spcExpanded, setSpcExpanded] = useState<Record<string, boolean>>({});

  const handleSpcAnalysis = async (cardType: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSpcLoading(s => ({ ...s, [cardType]: true }));
    setSpcError(s => ({ ...s, [cardType]: '' }));
    try {
      const result = await postSpcAnalysis(cardType);
      setSpcResults(s => ({ ...s, [cardType]: result }));
      setSpcExpanded(s => ({ ...s, [cardType]: true }));
    } catch {
      setSpcError(s => ({ ...s, [cardType]: 'AI analysis failed. Check that ANTHROPIC_API_KEY is set.' }));
    } finally {
      setSpcLoading(s => ({ ...s, [cardType]: false }));
    }
  };

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

                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={spcLoading[row.card_type] ? <CircularProgress size={12} /> : <AutoAwesomeIcon />}
                    onClick={(e) => handleSpcAnalysis(row.card_type, e)}
                    disabled={spcLoading[row.card_type]}
                    sx={{ whiteSpace: 'nowrap', fontSize: 11 }}
                  >
                    AI SPC
                  </Button>

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

                {/* ── AI SPC findings panel ── */}
                <Collapse in={!!spcResults[row.card_type] && spcExpanded[row.card_type]}>
                  {spcError[row.card_type] && (
                    <Alert severity="error" sx={{ mx: 2, mb: 2 }}>{spcError[row.card_type]}</Alert>
                  )}
                  {spcResults[row.card_type] && (
                    <Box sx={{ px: 2, pb: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Stack direction="row" alignItems="center" spacing={1} mt={1.5} mb={1}>
                        <AutoAwesomeIcon color="primary" fontSize="small" />
                        <Typography variant="subtitle2" fontWeight={700}>AI SPC Analysis</Typography>
                        <Button size="small" onClick={() => setSpcExpanded(s => ({ ...s, [row.card_type]: false }))} sx={{ ml: 'auto', fontSize: 11 }}>
                          Hide
                        </Button>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" mb={1.5}>
                        {spcResults[row.card_type].analysis.summary}
                      </Typography>
                      <Stack spacing={0.75}>
                        {spcResults[row.card_type].analysis.findings.map((f, i) => (
                          <Stack key={i} direction="row" alignItems="flex-start" spacing={1}>
                            <Chip
                              label={f.status}
                              size="small"
                              color={f.status === 'ok' ? 'success' : f.status === 'warning' ? 'warning' : 'error'}
                              sx={{ minWidth: 68, fontSize: 10 }}
                            />
                            <Box>
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: 12 }}>{f.test}</Typography>
                              <Typography variant="caption" color="text.secondary">{f.message}</Typography>
                            </Box>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Collapse>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
