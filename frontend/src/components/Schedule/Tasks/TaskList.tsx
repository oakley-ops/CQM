import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { fetchTasks, createTask, deleteTask, updateTaskProgress } from '../../../store/slices/scheduleSlice';
import { RootState, AppDispatch } from '../../../store/store';
import { toast } from 'react-toastify';

interface TaskListProps {
  projectId: number;
}

const TaskList = ({ projectId }: TaskListProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { tasks, loading } = useSelector((state: RootState) => state.schedule);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    estimated_hours: '',
  });

  useEffect(() => {
    dispatch(fetchTasks(projectId));
  }, [dispatch, projectId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      await dispatch(createTask({ projectId, data: formData as any })).unwrap();
      toast.success('Task created successfully!');
      setOpenDialog(false);
      setFormData({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        priority: 'medium',
        estimated_hours: '',
      });
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await dispatch(deleteTask(id)).unwrap();
        toast.success('Task deleted successfully!');
      } catch (error) {
        toast.error('Failed to delete task');
      }
    }
  };

  const handleProgressChange = async (id: number, progress: number) => {
    try {
      await dispatch(updateTaskProgress({ id, progress })).unwrap();
      toast.success('Progress updated!');
    } catch (error) {
      toast.error('Failed to update progress');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      not_started: 'default',
      in_progress: 'primary',
      completed: 'success',
      blocked: 'error',
      cancelled: 'default',
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority: string) => {
    const colors: any = {
      low: 'info',
      medium: 'default',
      high: 'warning',
      critical: 'error',
    };
    return colors[priority] || 'default';
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
        <Typography variant="h5">Tasks</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
          New Task
        </Button>
      </Box>

      {tasks.length === 0 ? (
        <Box textAlign="center" p={4}>
          <Typography variant="body1" color="text.secondary">
            No tasks yet
          </Typography>
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" gap={2}>
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Box flex={1}>
                    <Typography variant="h6">{task.name}</Typography>
                    {task.description && (
                      <Typography variant="body2" color="text.secondary">
                        {task.description}
                      </Typography>
                    )}
                  </Box>
                  <Box display="flex" gap={1} alignItems="center">
                    <Chip label={task.status.replace('_', ' ').toUpperCase()} color={getStatusColor(task.status)} size="small" />
                    <Chip label={task.priority.toUpperCase()} color={getPriorityColor(task.priority)} size="small" />
                    <Button size="small" color="error" onClick={() => handleDelete(task.id)}>
                      <DeleteIcon />
                    </Button>
                  </Box>
                </Box>

                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Progress: {task.progress}%
                      </Typography>
                      <LinearProgress variant="determinate" value={task.progress} sx={{ mt: 0.5 }} />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box display="flex" gap={1} justifyContent="flex-end">
                      {[0, 25, 50, 75, 100].map((progress) => (
                        <Button
                          key={progress}
                          size="small"
                          variant={task.progress === progress ? 'contained' : 'outlined'}
                          onClick={() => handleProgressChange(task.id, progress)}
                        >
                          {progress}%
                        </Button>
                      ))}
                    </Box>
                  </Grid>
                </Grid>

                {(task.start_date || task.end_date) && (
                  <Box mt={2} display="flex" gap={2}>
                    {task.start_date && (
                      <Typography variant="caption">
                        Start: {new Date(task.start_date).toLocaleDateString()}
                      </Typography>
                    )}
                    {task.end_date && (
                      <Typography variant="caption">
                        End: {new Date(task.end_date).toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Task Name"
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
            rows={3}
          />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Date"
                name="start_date"
                type="date"
                value={formData.start_date}
                onChange={handleChange}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Date"
                name="end_date"
                type="date"
                value={formData.end_date}
                onChange={handleChange}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                margin="normal"
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Estimated Hours"
                name="estimated_hours"
                type="number"
                value={formData.estimated_hours}
                onChange={handleChange}
                margin="normal"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.name}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskList;
