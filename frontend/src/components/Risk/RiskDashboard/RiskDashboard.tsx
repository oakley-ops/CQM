import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { RootState, AppDispatch } from '../../../store/store';
import { fetchRiskSummary } from '../../../store/slices/riskSlice';

interface RiskDashboardProps {
  projectId: number;
}

const RiskDashboard = ({ projectId }: RiskDashboardProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { riskSummary, loading } = useSelector((state: RootState) => state.risk);

  useEffect(() => {
    dispatch(fetchRiskSummary(projectId));
  }, [dispatch, projectId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (!riskSummary) {
    return (
      <Box p={3}>
        <Typography>No risk summary available</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Risk Dashboard
      </Typography>

      {/* Overall Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <WarningIcon color="action" />
                <Typography color="text.secondary" variant="subtitle2">
                  Total Risks
                </Typography>
              </Box>
              <Typography variant="h3">{riskSummary.total_risks}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <ErrorIcon color="error" />
                <Typography color="text.secondary" variant="subtitle2">
                  High Risk
                </Typography>
              </Box>
              <Typography variant="h3" color="error.main">
                {riskSummary.high_risk_count}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <WarningIcon color="warning" />
                <Typography color="text.secondary" variant="subtitle2">
                  Medium Risk
                </Typography>
              </Box>
              <Typography variant="h3" color="warning.main">
                {riskSummary.medium_risk_count}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircleIcon color="success" />
                <Typography color="text.secondary" variant="subtitle2">
                  Low Risk
                </Typography>
              </Box>
              <Typography variant="h3" color="success.main">
                {riskSummary.low_risk_count}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Status Breakdown */}
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Risk Status
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Identified
              </Typography>
              <Typography variant="h4">{riskSummary.identified_count}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Assessed
              </Typography>
              <Typography variant="h4">{riskSummary.assessed_count}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Mitigated
              </Typography>
              <Typography variant="h4" color="info.main">
                {riskSummary.mitigated_count}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Monitoring
              </Typography>
              <Typography variant="h4" color="info.main">
                {riskSummary.monitoring_count}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Closed
              </Typography>
              <Typography variant="h4" color="success.main">
                {riskSummary.closed_count}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Occurred
              </Typography>
              <Typography variant="h4" color="error.main">
                {riskSummary.occurred_count}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Average Risk Score */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography color="text.secondary" gutterBottom>
            Average Risk Score
          </Typography>
          <Typography variant="h3">
            {riskSummary.average_risk_score ? Number(riskSummary.average_risk_score).toFixed(2) : '0.00'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Scale: 1 (Very Low) to 25 (Very High)
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RiskDashboard;
