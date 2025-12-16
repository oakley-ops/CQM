import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { RootState, AppDispatch } from '../../../store/store';
import {
  fetchMetrics,
  fetchMetricsSummary,
  createMetric,
  updateMetric,
  deleteMetric,
} from '../../../store/slices/qualitySlice';
import { CreateQualityMetricDto } from '../../../services/quality/qualityMetricService';

interface MetricsListProps {
  projectId: number;
}

const MetricsList = ({ projectId }: MetricsListProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { metrics, metricsSummary, loading } = useSelector((state: RootState) => state.quality);
  
  const [open, setOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<any>(null);
  const [formData, setFormData] = useState<CreateQualityMetricDto>({
    metric_name: '',
    metric_type: '',
    target_value: 0,
    actual_value: 0,
    unit: '',
    measurement_date: new Date().toISOString().split('T')[0],
    status: 'pending',
    notes: '',
  });

  useEffect(() => {
    dispatch(fetchMetrics(projectId));
    dispatch(fetchMetricsSummary(projectId));
  }, [dispatch, projectId]);

  const handleOpen = (metric?: any) => {
    if (metric) {
      setEditingMetric(metric);
      setFormData({
        metric_name: metric.metric_name,
        metric_type: metric.metric_type || '',
        target_value: metric.target_value || 0,
        actual_value: metric.actual_value || 0,
        unit: metric.unit || '',
        measurement_date: metric.measurement_date || new Date().toISOString().split('T')[0],
        status: metric.status,
        notes: metric.notes || '',
      });
    } else {
      setEditingMetric(null);
      setFormData({
        metric_name: '',
        metric_type: '',
        target_value: 0,
        actual_value: 0,
        unit: '',
        measurement_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        notes: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingMetric(null);
  };

  const handleSubmit = async () => {
    if (editingMetric) {
      await dispatch(updateMetric({ metricId: editingMetric.id, data: formData }));
    } else {
      await dispatch(createMetric({ projectId, data: formData }));
    }
    handleClose();
    dispatch(fetchMetrics(projectId));
    dispatch(fetchMetricsSummary(projectId));
  };

  const handleDelete = async (metricId: number) => {
    if (window.confirm('Are you sure you want to delete this metric?')) {
      await dispatch(deleteMetric(metricId));
      dispatch(fetchMetrics(projectId));
      dispatch(fetchMetricsSummary(projectId));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-target':
        return 'success';
      case 'at-risk':
        return 'warning';
      case 'off-target':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Summary Cards */}
      {metricsSummary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Metrics
                </Typography>
                <Typography variant="h4">{metricsSummary.total_metrics}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  On Target
                </Typography>
                <Typography variant="h4" color="success.main">
                  {metricsSummary.on_target_count}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  At Risk
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {metricsSummary.at_risk_count}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Off Target
                </Typography>
                <Typography variant="h4" color="error.main">
                  {metricsSummary.off_target_count}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Pending
                </Typography>
                <Typography variant="h4">{metricsSummary.pending_count}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Quality Metrics</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Add Metric
        </Button>
      </Box>

      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Metric Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>Actual</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {metrics.map((metric) => (
              <TableRow key={metric.id}>
                <TableCell>{metric.metric_name}</TableCell>
                <TableCell>{metric.metric_type || '-'}</TableCell>
                <TableCell>
                  {metric.target_value} {metric.unit}
                </TableCell>
                <TableCell>
                  {metric.actual_value} {metric.unit}
                </TableCell>
                <TableCell>
                  <Chip
                    label={metric.status.replace('-', ' ').toUpperCase()}
                    color={getStatusColor(metric.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {metric.measurement_date
                    ? new Date(metric.measurement_date).toLocaleDateString()
                    : '-'}
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleOpen(metric)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(metric.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {metrics.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No metrics found. Click "Add Metric" to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editingMetric ? 'Edit Metric' : 'Add Metric'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Metric Name"
                value={formData.metric_name}
                onChange={(e) => setFormData({ ...formData, metric_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Metric Type"
                value={formData.metric_type}
                onChange={(e) => setFormData({ ...formData, metric_type: e.target.value })}
              >
                <MenuItem value="performance">Performance</MenuItem>
                <MenuItem value="reliability">Reliability</MenuItem>
                <MenuItem value="usability">Usability</MenuItem>
                <MenuItem value="maintainability">Maintainability</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Target Value"
                value={formData.target_value}
                onChange={(e) => setFormData({ ...formData, target_value: parseFloat(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Actual Value"
                value={formData.actual_value}
                onChange={(e) => setFormData({ ...formData, actual_value: parseFloat(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="on-target">On Target</MenuItem>
                <MenuItem value="at-risk">At Risk</MenuItem>
                <MenuItem value="off-target">Off Target</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Measurement Date"
                value={formData.measurement_date}
                onChange={(e) => setFormData({ ...formData, measurement_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingMetric ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MetricsList;
