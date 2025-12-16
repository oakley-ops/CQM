import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { fetchEVMMetrics, fetchCostForecast } from '../../../store/slices/costSlice';
import { RootState, AppDispatch } from '../../../store/store';

interface EVMDashboardProps {
  projectId: number;
}

const EVMDashboard = ({ projectId }: EVMDashboardProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { evmMetrics, forecast, loading } = useSelector((state: RootState) => state.cost);

  useEffect(() => {
    dispatch(fetchEVMMetrics(projectId));
    dispatch(fetchCostForecast(projectId));
  }, [dispatch, projectId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!evmMetrics) {
    return (
      <Box textAlign="center" p={4}>
        <Typography variant="h6" gutterBottom>
          No EVM Data Available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create an EVM snapshot to start tracking earned value metrics
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Earned Value Management Dashboard
      </Typography>

      {/* Performance Summary */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: evmMetrics.cpi >= 1 ? 'success.light' : 'error.light' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h6">Cost Performance</Typography>
                  <Typography variant="h4">{evmMetrics.performance.cost}</Typography>
                  <Typography variant="body2">CPI: {evmMetrics.cpi.toFixed(2)}</Typography>
                </Box>
                {evmMetrics.cpi >= 1 ? <TrendingUpIcon sx={{ fontSize: 60 }} /> : <TrendingDownIcon sx={{ fontSize: 60 }} />}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: evmMetrics.spi >= 1 ? 'success.light' : 'error.light' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h6">Schedule Performance</Typography>
                  <Typography variant="h4">{evmMetrics.performance.schedule}</Typography>
                  <Typography variant="body2">SPI: {evmMetrics.spi.toFixed(2)}</Typography>
                </Box>
                {evmMetrics.spi >= 1 ? <TrendingUpIcon sx={{ fontSize: 60 }} /> : <TrendingDownIcon sx={{ fontSize: 60 }} />}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* EVM Metrics */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            EVM Metrics
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">Planned Value (PV)</Typography>
              <Typography variant="h6">{formatCurrency(evmMetrics.pv)}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">Earned Value (EV)</Typography>
              <Typography variant="h6">{formatCurrency(evmMetrics.ev)}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">Actual Cost (AC)</Typography>
              <Typography variant="h6">{formatCurrency(evmMetrics.ac)}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">Budget at Completion (BAC)</Typography>
              <Typography variant="h6">{formatCurrency(evmMetrics.bac)}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Variances */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Variances
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body1">Cost Variance (CV)</Typography>
                <Chip 
                  label={formatCurrency(evmMetrics.cv)} 
                  color={evmMetrics.cv >= 0 ? 'success' : 'error'}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body1">Schedule Variance (SV)</Typography>
                <Chip 
                  label={formatCurrency(evmMetrics.sv)} 
                  color={evmMetrics.sv >= 0 ? 'success' : 'error'}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Forecasts */}
      {forecast && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Cost Forecast
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">Estimate at Completion (EAC)</Typography>
                <Typography variant="h6">{formatCurrency(forecast.eac)}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">Estimate to Complete (ETC)</Typography>
                <Typography variant="h6">{formatCurrency(forecast.etc)}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">Variance at Completion (VAC)</Typography>
                <Typography variant="h6" color={forecast.vac >= 0 ? 'success.main' : 'error.main'}>
                  {formatCurrency(forecast.vac)}
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">Completion %</Typography>
                <Typography variant="h6">{forecast.completion_percentage.toFixed(1)}%</Typography>
              </Grid>
            </Grid>
            <Box mt={2}>
              <Chip 
                label={`Forecast Status: ${forecast.forecast_status}`}
                color={forecast.forecast_status === 'On Track' ? 'success' : 'warning'}
              />
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default EVMDashboard;
