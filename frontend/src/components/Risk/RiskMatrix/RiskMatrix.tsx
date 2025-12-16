import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  CircularProgress,
} from '@mui/material';
import { RootState, AppDispatch } from '../../../store/store';
import { fetchRiskMatrix } from '../../../store/slices/riskSlice';

interface RiskMatrixProps {
  projectId: number;
}

const RiskMatrix = ({ projectId }: RiskMatrixProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { riskMatrix, loading } = useSelector((state: RootState) => state.risk);

  useEffect(() => {
    dispatch(fetchRiskMatrix(projectId));
  }, [dispatch, projectId]);

  const impactLevels = ['very-high', 'high', 'medium', 'low', 'very-low'];
  const probabilityLevels = ['very-low', 'low', 'medium', 'high', 'very-high'];

  const getCellColor = (probability: string, impact: string) => {
    const probValue = probabilityLevels.indexOf(probability) + 1;
    const impactValue = impactLevels.length - impactLevels.indexOf(impact);
    const score = probValue * impactValue;

    if (score >= 15) return '#f44336'; // Red - High risk
    if (score >= 8) return '#ff9800'; // Orange - Medium risk
    return '#4caf50'; // Green - Low risk
  };

  const formatLabel = (label: string) => {
    return label.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (!riskMatrix) {
    return (
      <Box p={3}>
        <Typography>No risk data available</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Probability-Impact (P-I) Matrix
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Visual representation of risks based on their probability and impact
      </Typography>

      <Box sx={{ overflowX: 'auto' }}>
        <Grid container spacing={0} sx={{ minWidth: 600 }}>
          {/* Header row */}
          <Grid item xs={2}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.200' }}>
              <Typography variant="subtitle2" fontWeight="bold">
                Probability ↓ / Impact →
              </Typography>
            </Paper>
          </Grid>
          {impactLevels.map((impact) => (
            <Grid item xs={2} key={impact}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.200' }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {formatLabel(impact)}
                </Typography>
              </Paper>
            </Grid>
          ))}

          {/* Matrix rows */}
          {probabilityLevels.reverse().map((probability) => (
            <Grid container item xs={12} spacing={0} key={probability}>
              <Grid item xs={2}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.200', height: '100%' }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {formatLabel(probability)}
                  </Typography>
                </Paper>
              </Grid>
              {impactLevels.map((impact) => {
                const risks = riskMatrix[probability]?.[impact] || [];
                const cellColor = getCellColor(probability, impact);
                
                return (
                  <Grid item xs={2} key={`${probability}-${impact}`}>
                    <Paper
                      sx={{
                        p: 2,
                        minHeight: 120,
                        bgcolor: cellColor,
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                      }}
                    >
                      <Typography variant="caption" fontWeight="bold">
                        {risks.length} Risk{risks.length !== 1 ? 's' : ''}
                      </Typography>
                      {risks.map((risk: any) => (
                        <Chip
                          key={risk.id}
                          label={risk.title}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(255,255,255,0.9)',
                            color: 'text.primary',
                            fontSize: '0.7rem',
                          }}
                        />
                      ))}
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Legend */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Typography variant="subtitle2">Risk Level:</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 20, bgcolor: '#4caf50', borderRadius: 1 }} />
            <Typography variant="body2">Low (1-7)</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 20, bgcolor: '#ff9800', borderRadius: 1 }} />
            <Typography variant="body2">Medium (8-14)</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 20, bgcolor: '#f44336', borderRadius: 1 }} />
            <Typography variant="body2">High (15-25)</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default RiskMatrix;
