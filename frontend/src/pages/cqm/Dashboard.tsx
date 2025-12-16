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

  const statsCards = [
    {
      title: 'Total Facilities',
      value: facilityStats?.totalFacilities || 0,
      icon: <FacilityIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      color: 'primary.light',
    },
    {
      title: 'Active Certifications',
      value: facilityStats?.activeCertifications || 0,
      icon: <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main' }} />,
      color: 'success.light',
    },
    {
      title: 'Pending Tests',
      value: 0,
      icon: <TestIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
      color: 'warning.light',
    },
    {
      title: 'Open Non-Conformities',
      value: 0,
      icon: <WarningIcon sx={{ fontSize: 40, color: 'error.main' }} />,
      color: 'error.light',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        CQM Dashboard
      </Typography>

      <Grid container spacing={3}>
        {statsCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {card.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.title}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      backgroundColor: card.color,
                      borderRadius: 2,
                      p: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activities
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No recent activities
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upcoming Audits
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No upcoming audits scheduled
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

