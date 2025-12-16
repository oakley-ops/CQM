import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  Card,
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
  CheckCircle as CompleteIcon,
} from '@mui/icons-material';
import { RootState, AppDispatch } from '../../../store/store';
import {
  fetchInspections,
  createInspection,
  updateInspection,
  deleteInspection,
  completeInspection,
} from '../../../store/slices/qualitySlice';
import { CreateInspectionDto } from '../../../services/quality/inspectionService';

interface InspectionListProps {
  projectId: number;
}

const InspectionList = ({ projectId }: InspectionListProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { inspections, loading } = useSelector((state: RootState) => state.quality);
  
  const [open, setOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<any>(null);
  const [formData, setFormData] = useState<CreateInspectionDto>({
    inspection_name: '',
    inspection_type: '',
    inspection_date: new Date().toISOString().split('T')[0],
    status: 'scheduled',
    findings: '',
    recommendations: '',
  });

  useEffect(() => {
    dispatch(fetchInspections(projectId));
  }, [dispatch, projectId]);

  const handleOpen = (inspection?: any) => {
    if (inspection) {
      setEditingInspection(inspection);
      setFormData({
        inspection_name: inspection.inspection_name,
        inspection_type: inspection.inspection_type || '',
        inspection_date: inspection.inspection_date,
        status: inspection.status,
        findings: inspection.findings || '',
        recommendations: inspection.recommendations || '',
      });
    } else {
      setEditingInspection(null);
      setFormData({
        inspection_name: '',
        inspection_type: '',
        inspection_date: new Date().toISOString().split('T')[0],
        status: 'scheduled',
        findings: '',
        recommendations: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingInspection(null);
  };

  const handleSubmit = async () => {
    if (editingInspection) {
      await dispatch(updateInspection({ inspectionId: editingInspection.id, data: formData }));
    } else {
      await dispatch(createInspection({ projectId, data: formData }));
    }
    handleClose();
    dispatch(fetchInspections(projectId));
  };

  const handleDelete = async (inspectionId: number) => {
    if (window.confirm('Are you sure you want to delete this inspection?')) {
      await dispatch(deleteInspection(inspectionId));
      dispatch(fetchInspections(projectId));
    }
  };

  const handleComplete = async (inspectionId: number) => {
    await dispatch(completeInspection({ inspectionId, data: {} }));
    dispatch(fetchInspections(projectId));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'success';
      case 'in-progress':
        return 'info';
      case 'rejected':
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Quality Inspections</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Add Inspection
        </Button>
      </Box>

      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Inspection Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Result</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inspections.map((inspection) => (
              <TableRow key={inspection.id}>
                <TableCell>{inspection.inspection_name}</TableCell>
                <TableCell>{inspection.inspection_type || '-'}</TableCell>
                <TableCell>
                  {new Date(inspection.inspection_date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Chip
                    label={inspection.status.toUpperCase()}
                    color={getStatusColor(inspection.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {inspection.result ? (
                    <Chip
                      label={inspection.result.toUpperCase()}
                      color={inspection.result === 'pass' ? 'success' : 'error'}
                      size="small"
                    />
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {inspection.status === 'scheduled' && (
                    <IconButton size="small" onClick={() => handleComplete(inspection.id)}>
                      <CompleteIcon />
                    </IconButton>
                  )}
                  <IconButton size="small" onClick={() => handleOpen(inspection)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(inspection.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {inspections.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No inspections found. Click "Add Inspection" to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editingInspection ? 'Edit Inspection' : 'Add Inspection'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Inspection Name"
                value={formData.inspection_name}
                onChange={(e) => setFormData({ ...formData, inspection_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Inspection Type"
                value={formData.inspection_type}
                onChange={(e) => setFormData({ ...formData, inspection_type: e.target.value })}
              >
                <MenuItem value="code-review">Code Review</MenuItem>
                <MenuItem value="testing">Testing</MenuItem>
                <MenuItem value="audit">Audit</MenuItem>
                <MenuItem value="walkthrough">Walkthrough</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Inspection Date"
                value={formData.inspection_date}
                onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Findings"
                value={formData.findings}
                onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Recommendations"
                value={formData.recommendations}
                onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingInspection ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InspectionList;
