/**
 * CQM Dashboard Page
 * Main dashboard for Card Quality Management System
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Factory as FacilityIcon,
  Science as TestIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { fetchDashboardData } from '../../store/slices/cqm/dashboardSlice';
import { fetchFacilityStatistics } from '../../store/slices/cqm/facilitySlice';
import { StatsCard, StatusChart, TrendChart } from '../../components/CQM';
import type { RootState, AppDispatch } from '../../store/store';

const Dashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.dashboard);
  const { statistics: facilityStats } = useSelector((state: RootState) => state.facility);

  useEffect(() => {
    dispatch(fetchDashboardData());
    dispatch(fetchFacilityStatistics());
  }, [dispatch]);

  if (loading) {
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

  // Sample data for charts
  const certificationStatusData = [
    { name: 'Active', value: facilityStats?.activeCertifications || 5, color: '#4caf50' },
    { name: 'Pending', value: 2, color: '#ff9800' },
    { name: 'Expired', value: 1, color: '#f44336' },
  ];

  const testTrendData = [
    { date: 'Jan', passed: 45, failed: 5 },
    { date: 'Feb', passed: 52, failed: 3 },
    { date: 'Mar', passed: 48, failed: 7 },
    { date: 'Apr', passed: 58, failed: 2 },
    { date: 'May', passed: 62, failed: 4 },
    { date: 'Jun', passed: 65, failed: 3 },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        CQM Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Facilities"
            value={facilityStats?.totalFacilities || 0}
            icon={<FacilityIcon sx={{ fontSize: 40 }} />}
            color="#0066CC"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Active Certifications"
            value={facilityStats?.activeCertifications || 0}
            icon={<CheckCircleIcon sx={{ fontSize: 40 }} />}
            color="#4caf50"
            trend={{ value: 8, isPositive: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Pending Tests"
            value={15}
            icon={<TestIcon sx={{ fontSize: 40 }} />}
            color="#ff9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Open Non-Conformities"
            value={3}
            icon={<WarningIcon sx={{ fontSize: 40 }} />}
            color="#f44336"
            trend={{ value: 25, isPositive: false }}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <StatusChart
            title="Certification Status Distribution"
            data={certificationStatusData}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TrendChart
            title="Test Results Trend (6 Months)"
            data={testTrendData}
            lines={[
              { dataKey: 'passed', name: 'Passed', color: '#4caf50' },
              { dataKey: 'failed', name: 'Failed', color: '#f44336' },
            ]}
          />
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activities
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No recent activities to display
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

