/**
 * CQM Dashboard Page
 *
 * Four zones, prioritized by what a quality manager needs to see first:
 *   1. Health headline   — one primary KPI + two supporting metrics
 *   2. Needs attention   — prioritized action list (/dashboard/action-items)
 *   3. Pass rate trend   — single line chart over the selected window
 *   4. Recent sessions   — read-only context at the bottom
 *
 * Intentionally narrower than the previous page. Items that were removed
 * (KPI card strip, 3x time-window counts, session status chips, tests-by-
 * category stacked bar) either duplicated each other or were detail-level
 * analytics that belong on their own page.
 */

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Paper,
  Select,
  MenuItem,
  Stack,
  FormControl,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { Add as AddIcon } from '@mui/icons-material';
import {
  fetchTestEntryMetrics,
  fetchKPIs,
  fetchActionItems,
} from '../../store/slices/cqm/testEntrySlice';
import { RecentEntriesList } from '../../components/CQM/Common';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { RootState, AppDispatch } from '../../store/store';
import type {
  KPIResult,
  KPIStatus,
  ActionItem,
  ActionItemSeverity,
} from '../../types/cqm';

// ── Styling helpers ────────────────────────────────────────────────────────

const statusColors: Record<KPIStatus, { fg: string; bg: string; border: string }> = {
  green:  { fg: '#2e7d32', bg: '#e8f5e9', border: '#a5d6a7' },
  yellow: { fg: '#ed6c02', bg: '#fff4e5', border: '#ffcc80' },
  red:    { fg: '#c62828', bg: '#ffebee', border: '#ef9a9a' },
  grey:   { fg: '#616161', bg: '#f5f5f5', border: '#e0e0e0' },
};

const severityColors: Record<ActionItemSeverity, { fg: string; bg: string; dot: string }> = {
  critical: { fg: '#c62828', bg: '#ffebee', dot: '#e53935' },
  high:     { fg: '#ed6c02', bg: '#fff4e5', dot: '#fb8c00' },
  medium:   { fg: '#616161', bg: '#f5f5f5', dot: '#9e9e9e' },
};

const formatKPIValue = (kpi: KPIResult): string => {
  if (kpi.currentValue === null) return '—';
  const v = kpi.currentValue;
  if (kpi.unit === '%')        return `${v}%`;
  if (kpi.unit === 'days')     return `${v}d`;
  if (kpi.unit === 'sessions') return String(v);
  return String(v);
};

const PERIODS = [
  { label: 'Last 7 days',  days: 7   },
  { label: 'Last 30 days', days: 30  },
  { label: 'Last 90 days', days: 90  },
  { label: 'Last year',    days: 365 },
];

// ── Zone 1: Health headline ────────────────────────────────────────────────

interface HealthHeadlineProps {
  kpis: KPIResult[];
}

const HealthHeadline = ({ kpis }: HealthHeadlineProps) => {
  const primary   = kpis.find(k => k.kpiKey === 'overall_pass_rate');
  const secondary = [
    kpis.find(k => k.kpiKey === 'first_pass_yield'),
    kpis.find(k => k.kpiKey === 'rejection_rate'),
  ].filter((k): k is KPIResult => Boolean(k));

  if (!primary) return null;
  const color = statusColors[primary.status];

  return (
    <Box mb={3}>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.5 }}>
        Quality health
      </Typography>
      <Box
        display="grid"
        gridTemplateColumns={{ xs: '1fr', md: '2fr 1fr 1fr' }}
        gap={1.5}
        mt={1}
      >
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 2,
            bgcolor: color.bg,
            border: `1px solid ${color.border}`,
          }}
        >
          <Typography variant="body2" sx={{ color: color.fg, fontWeight: 500 }}>
            {primary.kpiName} · target {primary.higherIsBetter ? '≥' : '≤'}{primary.targetValue}{primary.unit}
          </Typography>
          <Typography
            variant="h3"
            sx={{ fontWeight: 500, color: color.fg, mt: 0.5, lineHeight: 1.1 }}
          >
            {formatKPIValue(primary)}
          </Typography>
          <Typography variant="caption" sx={{ color: color.fg, opacity: 0.85 }}>
            {primary.description}
          </Typography>
        </Paper>
        {secondary.map(kpi => {
          const c = statusColors[kpi.status];
          return (
            <Paper
              key={kpi.kpiKey}
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: '#fafafa',
                border: '1px solid #e0e0e0',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {kpi.kpiName}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 500, mt: 0.5, color: c.fg }}>
                {formatKPIValue(kpi)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                target {kpi.higherIsBetter ? '≥' : '≤'}{kpi.targetValue}{kpi.unit}
              </Typography>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
};

// ── Zone 2: Action list ────────────────────────────────────────────────────

interface ActionListProps {
  items: ActionItem[];
  loading: boolean;
}

const ActionList = ({ items, loading }: ActionListProps) => {
  return (
    <Box mb={3}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="baseline"
        mb={1}
      >
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.5 }}>
          Needs attention · {items.length} {items.length === 1 ? 'item' : 'items'}
        </Typography>
      </Stack>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          border: '1px solid #e0e0e0',
          overflow: 'hidden',
        }}
      >
        {loading && items.length === 0 && (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress size={24} />
          </Box>
        )}
        {!loading && items.length === 0 && (
          <Box p={3} textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Nothing needs your attention right now. Nice work.
            </Typography>
          </Box>
        )}
        {items.map((item, idx) => {
          const c = severityColors[item.severity];
          return (
            <Box
              key={item.id}
              display="flex"
              alignItems="center"
              gap={1.5}
              px={2}
              py={1.5}
              sx={{
                borderTop: idx === 0 ? 'none' : '1px solid #eeeeee',
              }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: c.dot,
                  flexShrink: 0,
                }}
              />
              <Box flex={1} minWidth={0}>
                <Typography variant="body2" sx={{ fontWeight: 400 }}>
                  {item.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.meta}
                </Typography>
              </Box>
              <Chip
                label={item.severity}
                size="small"
                sx={{
                  bgcolor: c.bg,
                  color: c.fg,
                  fontWeight: 500,
                  textTransform: 'capitalize',
                  border: 'none',
                }}
              />
            </Box>
          );
        })}
      </Paper>
    </Box>
  );
};

// ── Dashboard ──────────────────────────────────────────────────────────────

const Dashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { metrics, kpis, actionItems, loading, error } = useSelector(
    (state: RootState) => state.testEntry
  );

  const [selectedDays, setSelectedDays] = useState(30);

  useEffect(() => {
    dispatch(fetchKPIs(selectedDays));
    dispatch(fetchTestEntryMetrics(Math.min(selectedDays, 90)));
    dispatch(fetchActionItems());
  }, [dispatch, selectedDays]);

  const handlePeriodChange = (e: SelectChangeEvent<number>) => {
    setSelectedDays(Number(e.target.value));
  };

  if (loading.metrics && !metrics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !metrics) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const primaryKPI = kpis.find(k => k.kpiKey === 'overall_pass_rate');
  const targetPassRate = primaryKPI?.targetValue ?? 95;

  const trendChartData = metrics?.passRateTrend?.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    'Pass Rate': item.passRate,
    'Total Tests': item.totalTests,
  })) || [];

  return (
    <Box>
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
        pb={2}
        sx={{ borderBottom: '1px solid #eeeeee' }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 500 }}>
            Quality dashboard
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Card Quality Management
          </Typography>
        </Box>
        <Stack direction="row" gap={1.5} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select value={selectedDays} onChange={handlePeriodChange}>
              {PERIODS.map(p => (
                <MenuItem key={p.days} value={p.days}>{p.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/quality-test')}
          >
            Record New Test
          </Button>
        </Stack>
      </Stack>

      {/* Zone 1: Health headline */}
      <HealthHeadline kpis={kpis} />

      {/* Zone 2: Action list */}
      <ActionList items={actionItems} loading={loading.actionItems} />

      {/* Zone 3: Pass rate trend */}
      <Box mb={3}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.5 }}>
          Pass rate trend
        </Typography>
        <Card elevation={0} sx={{ mt: 1, borderRadius: 2, border: '1px solid #e0e0e0' }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={1}>
              <Typography variant="body2" color="text.secondary">
                Submitted &amp; approved sessions
              </Typography>
              <Typography variant="caption" color="text.secondary">
                target {targetPassRate}%
              </Typography>
            </Stack>
            {trendChartData.length > 0 ? (
              <Box height={220}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                    <RechartTooltip formatter={(v: unknown) => [`${v}%`, 'Pass Rate']} />
                    <ReferenceLine
                      y={targetPassRate}
                      stroke="#2e7d32"
                      strokeDasharray="4 4"
                      label={{ value: 'target', position: 'right', fill: '#2e7d32', fontSize: 10 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Pass Rate"
                      stroke="#1976d2"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Box
                sx={{
                  height: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography color="text.secondary">No trend data available</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Zone 4: Recent sessions */}
      <Box>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.5 }}>
          Recent sessions
        </Typography>
        <Card elevation={0} sx={{ mt: 1, borderRadius: 2, border: '1px solid #e0e0e0' }}>
          <CardContent>
            <RecentEntriesList
              sessions={metrics?.recentSessions || []}
              loading={loading.metrics}
              onViewSession={(session) => {
                navigate(`/session/${session.id}`);
              }}
            />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Dashboard;
