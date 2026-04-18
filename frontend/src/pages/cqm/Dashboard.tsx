/**
 * CQM Dashboard Page
 * Main dashboard for Card Quality Management System
 */

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Button,
  ButtonGroup,
  Chip,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import {
  Assessment as ReportIcon,
  CheckCircle as CheckCircleIcon,
  Science as TestIcon,
  TrendingUp as TrendIcon,
  Add as AddIcon,
  CheckCircleOutline as GreenIcon,
  Warning as YellowIcon,
  Cancel as RedIcon,
  HelpOutline as GreyIcon,
} from '@mui/icons-material';
import { fetchTestEntryMetrics, fetchKPIs } from '../../store/slices/cqm/testEntrySlice';
import { StatsCard, RecentEntriesList } from '../../components/CQM/Common';
import { CategoryTestSummary } from '../../components/CQM/Charts';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { RootState, AppDispatch } from '../../store/store';
import type { KPIResult, KPIStatus } from '../../types/cqm';

// ---- KPI status helpers ----

const kpiColors: Record<KPIStatus, string> = {
  green:  '#4caf50',
  yellow: '#ff9800',
  red:    '#f44336',
  grey:   '#9e9e9e',
};

const kpiBgColors: Record<KPIStatus, string> = {
  green:  '#f1f8e9',
  yellow: '#fff8e1',
  red:    '#ffebee',
  grey:   '#f5f5f5',
};

const KPIStatusIcon = ({ status }: { status: KPIStatus }) => {
  const sx = { fontSize: 28, color: kpiColors[status] };
  if (status === 'green')  return <GreenIcon sx={sx} />;
  if (status === 'yellow') return <YellowIcon sx={sx} />;
  if (status === 'red')    return <RedIcon sx={sx} />;
  return <GreyIcon sx={sx} />;
};

const formatKPIValue = (kpi: KPIResult): string => {
  if (kpi.currentValue === null) return '—';
  const v = kpi.currentValue;
  if (kpi.unit === '%')       return `${v}%`;
  if (kpi.unit === 'days')    return `${v}d`;
  if (kpi.unit === 'sessions') return String(v);
  return String(v);
};

const KPICard = ({ kpi }: { kpi: KPIResult }) => (
  <Tooltip
    title={
      <Box>
        <Typography variant="body2">{kpi.description}</Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Target: {kpi.higherIsBetter ? '≥' : '≤'} {kpi.targetValue}{kpi.unit}
          {kpi.warningThreshold !== null && (
            <> &nbsp;|&nbsp; Warning: {kpi.higherIsBetter ? '≥' : '≤'} {kpi.warningThreshold}{kpi.unit}</>
          )}
        </Typography>
      </Box>
    }
    arrow
  >
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: `1px solid ${kpiColors[kpi.status]}40`,
        bgcolor: kpiBgColors[kpi.status],
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        cursor: 'default',
      }}
    >
      <KPIStatusIcon status={kpi.status} />
      <Box flex={1} minWidth={0}>
        <Typography variant="caption" color="text.secondary" noWrap>
          {kpi.kpiName}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: kpiColors[kpi.status] }}>
          {formatKPIValue(kpi)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Target: {kpi.higherIsBetter ? '≥' : '≤'}{kpi.targetValue}{kpi.unit}
        </Typography>
      </Box>
    </Paper>
  </Tooltip>
);

// ---- Dashboard ----

const PERIODS = [
  { label: '7D',  days: 7   },
  { label: '30D', days: 30  },
  { label: '90D', days: 90  },
  { label: '1Y',  days: 365 },
];

const Dashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { metrics, kpis, loading, error } = useSelector((state: RootState) => state.testEntry);

  const [selectedDays, setSelectedDays] = useState(30);
  const [trendDays, setTrendDays] = useState<7 | 30>(7);

  // Re-fetch when period changes
  useEffect(() => {
    dispatch(fetchKPIs(selectedDays));
    dispatch(fetchTestEntryMetrics(Math.min(selectedDays, 90)));
  }, [dispatch, selectedDays]);

  // Re-fetch trend when trend selector changes
  const handleTrendDaysChange = (_: React.MouseEvent<HTMLElement>, value: 7 | 30 | null) => {
    if (value === null) return;
    setTrendDays(value);
    dispatch(fetchTestEntryMetrics(value));
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

  const trendChartData = metrics?.passRateTrend?.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    'Pass Rate': item.passRate,
    'Total Tests': item.totalTests,
  })) || [];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Quality Dashboard
        </Typography>
        <Box display="flex" gap={1.5} alignItems="center">
          <ButtonGroup size="small" variant="outlined">
            {PERIODS.map(p => (
              <Button
                key={p.days}
                onClick={() => setSelectedDays(p.days)}
                variant={selectedDays === p.days ? 'contained' : 'outlined'}
              >
                {p.label}
              </Button>
            ))}
          </ButtonGroup>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/quality-test')}
          >
            Record New Test
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      {kpis.length > 0 && (
        <Box mb={3}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Key Performance Indicators — Last {selectedDays === 365 ? '1 Year' : `${selectedDays} Days`}
          </Typography>
          <Grid container spacing={2}>
            {kpis.map((kpi) => (
              <Grid item xs={12} sm={6} md={4} lg={2.4} key={kpi.kpiKey}>
                <KPICard kpi={kpi} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Sessions Today"
            value={metrics?.testsToday || 0}
            icon={<TestIcon sx={{ fontSize: 40 }} />}
            color="#2196f3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Sessions This Week"
            value={metrics?.testsThisWeek || 0}
            icon={<ReportIcon sx={{ fontSize: 40 }} />}
            color="#9c27b0"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Sessions This Month"
            value={metrics?.testsThisMonth || 0}
            icon={<TrendIcon sx={{ fontSize: 40 }} />}
            color="#ff9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Overall Pass Rate"
            value={`${metrics?.overallPassRate || 0}%`}
            icon={<CheckCircleIcon sx={{ fontSize: 40 }} />}
            color={
              (metrics?.overallPassRate || 0) >= 95
                ? '#4caf50'
                : (metrics?.overallPassRate || 0) >= 80
                  ? '#ff9800'
                  : '#f44336'
            }
          />
        </Grid>
      </Grid>

      {/* Session Status Chips */}
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom color="text.secondary">
          Test Sessions by Status
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            label={`Draft: ${metrics?.sessionsCount?.draft || 0}`}
            color="default"
            variant="outlined"
          />
          <Chip
            label={`Submitted: ${metrics?.sessionsCount?.submitted || 0}`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`Approved: ${metrics?.sessionsCount?.approved || 0}`}
            color="success"
            variant="outlined"
          />
          <Chip
            label={`Rejected: ${metrics?.sessionsCount?.rejected || 0}`}
            color="error"
            variant="outlined"
          />
        </Box>
      </Paper>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tests by Category
              </Typography>
              <CategoryTestSummary
                data={metrics?.testsByCategory || []}
                loading={loading.metrics}
                height={300}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6">
                  Pass Rate Trend
                </Typography>
                <ToggleButtonGroup
                  value={trendDays}
                  exclusive
                  onChange={handleTrendDaysChange}
                  size="small"
                >
                  <ToggleButton value={7}>7d</ToggleButton>
                  <ToggleButton value={30}>30d</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Submitted &amp; approved sessions only
              </Typography>
              {trendChartData.length > 0 ? (
                <Box height={250} mt={1}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                      <RechartTooltip formatter={(v: unknown) => [`${v}%`, 'Pass Rate']} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="Pass Rate"
                        name="Pass Rate %"
                        stroke="#4caf50"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Box
                  sx={{
                    height: 250,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography color="text.secondary">
                    No trend data available
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Sessions */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Test Sessions
          </Typography>
          <RecentEntriesList
            sessions={metrics?.recentSessions || []}
            loading={loading.metrics}
            onViewSession={(session) => {
              console.log('View session:', session);
            }}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default Dashboard;
