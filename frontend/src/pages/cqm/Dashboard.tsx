/**
 * CQM Dashboard Page
 * Main dashboard for Card Quality Management System
 */

import { useEffect } from 'react';
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
  Chip,
  Paper,
} from '@mui/material';
import {
  Assessment as ReportIcon,
  CheckCircle as CheckCircleIcon,
  Science as TestIcon,
  TrendingUp as TrendIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { fetchTestEntryMetrics } from '../../store/slices/cqm/testEntrySlice';
import { StatsCard, RecentEntriesList } from '../../components/CQM/Common';
import { CategoryTestSummary } from '../../components/CQM/Charts';
import { TrendChart } from '../../components/CQM/Charts';
import type { RootState, AppDispatch } from '../../store/store';

const Dashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { metrics, loading, error } = useSelector((state: RootState) => state.testEntry);

  useEffect(() => {
    dispatch(fetchTestEntryMetrics());
  }, [dispatch]);

  if (loading.metrics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // Transform pass rate trend data for chart
  const trendChartData = metrics?.passRateTrend?.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
    'Pass Rate': item.passRate,
    'Total Tests': item.totalTests,
  })) || [];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Quality Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/quality-test')}
        >
          Record New Test
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Tests Today"
            value={metrics?.testsToday || 0}
            icon={<TestIcon sx={{ fontSize: 40 }} />}
            color="#2196f3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Tests This Week"
            value={metrics?.testsThisWeek || 0}
            icon={<ReportIcon sx={{ fontSize: 40 }} />}
            color="#9c27b0"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Tests This Month"
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
              <Typography variant="h6" gutterBottom>
                Pass Rate Trend (7 Days)
              </Typography>
              {trendChartData.length > 0 ? (
                <TrendChart
                  title=""
                  data={trendChartData}
                  lines={[
                    { dataKey: 'Pass Rate', name: 'Pass Rate %', color: '#4caf50' },
                  ]}
                />
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
