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
  CheckCircle as ResolveIcon,
} from '@mui/icons-material';
import { RootState, AppDispatch } from '../../../store/store';
import {
  fetchDefects,
  fetchDefectsSummary,
  createDefect,
  updateDefect,
  deleteDefect,
  resolveDefect,
} from '../../../store/slices/qualitySlice';
import { CreateDefectDto } from '../../../services/quality/defectService';

interface DefectListProps {
  projectId: number;
}

const DefectList = ({ projectId }: DefectListProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { defects, defectsSummary, loading } = useSelector((state: RootState) => state.quality);
  
  const [open, setOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [editingDefect, setEditingDefect] = useState<any>(null);
  const [resolvingDefect, setResolvingDefect] = useState<any>(null);
  const [resolution, setResolution] = useState('');
  const [formData, setFormData] = useState<CreateDefectDto>({
    title: '',
    description: '',
    severity: 'medium',
    priority: 'medium',
    detected_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    dispatch(fetchDefects(projectId));
    dispatch(fetchDefectsSummary(projectId));
  }, [dispatch, projectId]);

  const handleOpen = (defect?: any) => {
    if (defect) {
      setEditingDefect(defect);
      setFormData({
        title: defect.title,
        description: defect.description || '',
        severity: defect.severity,
        priority: defect.priority,
        detected_date: defect.detected_date,
      });
    } else {
      setEditingDefect(null);
      setFormData({
        title: '',
        description: '',
        severity: 'medium',
        priority: 'medium',
        detected_date: new Date().toISOString().split('T')[0],
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingDefect(null);
  };

  const handleSubmit = async () => {
    if (editingDefect) {
      await dispatch(updateDefect({ defectId: editingDefect.id, data: formData }));
    } else {
      await dispatch(createDefect({ projectId, data: formData }));
    }
    handleClose();
    dispatch(fetchDefects(projectId));
    dispatch(fetchDefectsSummary(projectId));
  };

  const handleDelete = async (defectId: number) => {
    if (window.confirm('Are you sure you want to delete this defect?')) {
      await dispatch(deleteDefect(defectId));
      dispatch(fetchDefects(projectId));
      dispatch(fetchDefectsSummary(projectId));
    }
  };

  const handleResolveOpen = (defect: any) => {
    setResolvingDefect(defect);
    setResolution('');
    setResolveOpen(true);
  };

  const handleResolveClose = () => {
    setResolveOpen(false);
    setResolvingDefect(null);
    setResolution('');
  };

  const handleResolveSubmit = async () => {
    if (resolvingDefect && resolution) {
      await dispatch(resolveDefect({ defectId: resolvingDefect.id, resolution }));
      handleResolveClose();
      dispatch(fetchDefects(projectId));
      dispatch(fetchDefectsSummary(projectId));
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return 'success';
      case 'in-progress':
        return 'info';
      case 'open':
        return 'warning';
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
      {defectsSummary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Defects
                </Typography>
                <Typography variant="h4">{defectsSummary.total_defects}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Open
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {defectsSummary.open_count}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  In Progress
                </Typography>
                <Typography variant="h4" color="info.main">
                  {defectsSummary.in_progress_count}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Resolved
                </Typography>
                <Typography variant="h4" color="success.main">
                  {defectsSummary.resolved_count}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Defects</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Add Defect
        </Button>
      </Box>

      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Detected Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {defects.map((defect) => (
              <TableRow key={defect.id}>
                <TableCell>{defect.title}</TableCell>
                <TableCell>
                  <Chip
                    label={defect.severity.toUpperCase()}
                    color={getSeverityColor(defect.severity)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={defect.priority.toUpperCase()}
                    color={getSeverityColor(defect.priority)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={defect.status.replace('-', ' ').toUpperCase()}
                    color={getStatusColor(defect.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(defect.detected_date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {(defect.status === 'open' || defect.status === 'in-progress') && (
                    <IconButton size="small" onClick={() => handleResolveOpen(defect)}>
                      <ResolveIcon />
                    </IconButton>
                  )}
                  <IconButton size="small" onClick={() => handleOpen(defect)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(defect.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {defects.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No defects found. Click "Add Defect" to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editingDefect ? 'Edit Defect' : 'Add Defect'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                select
                label="Severity"
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
              >
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                select
                label="Priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              >
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="Detected Date"
                value={formData.detected_date}
                onChange={(e) => setFormData({ ...formData, detected_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingDefect ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={resolveOpen} onClose={handleResolveClose} maxWidth="sm" fullWidth>
        <DialogTitle>Resolve Defect</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Resolution"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            sx={{ mt: 2 }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResolveClose}>Cancel</Button>
          <Button onClick={handleResolveSubmit} variant="contained" disabled={!resolution}>
            Resolve
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DefectList;
