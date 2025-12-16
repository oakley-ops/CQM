import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon, CheckCircle as CompleteIcon } from '@mui/icons-material';
import { fetchMilestones, createMilestone, deleteMilestone } from '../../../store/slices/scheduleSlice';
import { RootState, AppDispatch } from '../../../store/store';
import { milestoneService } from '../../../services/schedule/milestoneService';
import { toast } from 'react-toastify';

interface MilestoneListProps {
  projectId: number;
}

const MilestoneList = ({ projectId }: MilestoneListProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { milestones, loading } = useSelector((state: RootState) => state.schedule);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    due_date: '',
  });

  useEffect(() => {
    dispatch(fetchMilestones(projectId));
  }, [dispatch, projectId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      await dispatch(createMilestone({ projectId, data: formData })).unwrap();
      toast.success('Milestone created successfully!');
      setOpenDialog(false);
      setFormData({ name: '', description: '', due_date: '' });
    } catch (error) {
      toast.error('Failed to create milestone');
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await milestoneService.completeMilestone(id);
      toast.success('Milestone marked as complete!');
      dispatch(fetchMilestones(projectId));
    } catch (error) {
      toast.error('Failed to complete milestone');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this milestone?')) {
      try {
        await dispatch(deleteMilestone(id)).unwrap();
        toast.success('Milestone deleted successfully!');
      } catch (error) {
        toast.error('Failed to delete milestone');
      }
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: 'default',
      at_risk: 'warning',
      completed: 'success',
      missed: 'error',
    };
    return colors[status] || 'default';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Milestones</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
          New Milestone
        </Button>
      </Box>

      {milestones.length === 0 ? (
        <Box textAlign="center" p={4}>
          <Typography variant="body1" color="text.secondary">
            No milestones yet
          </Typography>
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" gap={2}>
          {milestones.map((milestone) => (
            <Card key={milestone.id}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start">
                  <Box flex={1}>
                    <Typography variant="h6">{milestone.name}</Typography>
                    {milestone.description && (
                      <Typography variant="body2" color="text.secondary">
                        {milestone.description}
                      </Typography>
                    )}
                    <Box mt={1}>
                      <Typography variant="caption" color="text.secondary">
                        Due: {new Date(milestone.due_date).toLocaleDateString()}
                      </Typography>
                      {milestone.completion_date && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                          Completed: {new Date(milestone.completion_date).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Box display="flex" gap={1} alignItems="center">
                    <Chip label={milestone.status.replace('_', ' ').toUpperCase()} color={getStatusColor(milestone.status)} size="small" />
                    {milestone.status !== 'completed' && (
                      <Button size="small" startIcon={<CompleteIcon />} onClick={() => handleComplete(milestone.id)}>
                        Complete
                      </Button>
                    )}
                    <Button size="small" color="error" onClick={() => handleDelete(milestone.id)}>
                      Delete
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Milestone</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Milestone Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="Due Date"
            name="due_date"
            type="date"
            value={formData.due_date}
            onChange={handleChange}
            margin="normal"
            InputLabelProps={{ shrink: true }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.name || !formData.due_date}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MilestoneList;
