import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  Typography,
  Chip,
  Stack,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { personalTaskService, PersonalTask } from '../../services/personalTaskService';

const WeeklyPriorities = () => {
  const [priorities, setPriorities] = useState<PersonalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPriority, setEditingPriority] = useState<PersonalTask | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    notes: '',
  });

  const MAX_PRIORITIES = 5;

  useEffect(() => {
    fetchPriorities();
  }, []);

  const fetchPriorities = async () => {
    try {
      setLoading(true);
      const response = await personalTaskService.getTasks({ task_type: 'weekly_priority' });
      setPriorities(response.data);
    } catch (error) {
      console.error('Error fetching priorities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (priority?: PersonalTask) => {
    if (priority) {
      setEditingPriority(priority);
      setFormData({
        title: priority.title,
        description: priority.description || '',
        notes: priority.notes || '',
      });
    } else {
      setEditingPriority(null);
      setFormData({
        title: '',
        description: '',
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPriority(null);
  };

  const handleSave = async () => {
    try {
      const taskData = {
        ...formData,
        task_type: 'weekly_priority' as const,
        priority: 'High' as const,
        status: editingPriority?.status || 'Not Started' as const,
        sequence_order: editingPriority?.sequence_order || priorities.length + 1,
      };

      if (editingPriority) {
        await personalTaskService.updateTask(editingPriority.id, taskData);
      } else {
        await personalTaskService.createTask(taskData);
      }

      handleCloseDialog();
      fetchPriorities();
    } catch (error) {
      console.error('Error saving priority:', error);
    }
  };

  const handleToggleComplete = async (priority: PersonalTask) => {
    try {
      const newStatus = priority.status === 'Completed' ? 'Not Started' : 'Completed';
      await personalTaskService.updateTask(priority.id, { status: newStatus });
      fetchPriorities();
    } catch (error) {
      console.error('Error updating priority:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this priority?')) return;
    
    try {
      await personalTaskService.deleteTask(id);
      fetchPriorities();
    } catch (error) {
      console.error('Error deleting priority:', error);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newPriorities = [...priorities];
    [newPriorities[index], newPriorities[index - 1]] = [newPriorities[index - 1], newPriorities[index]];

    const reorderedPriorities = newPriorities.map((p, i) => ({
      id: p.id,
      sequence_order: i + 1,
    }));

    try {
      await personalTaskService.reorderTasks(reorderedPriorities);
      fetchPriorities();
    } catch (error) {
      console.error('Error reordering priorities:', error);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === priorities.length - 1) return;

    const newPriorities = [...priorities];
    [newPriorities[index], newPriorities[index + 1]] = [newPriorities[index + 1], newPriorities[index]];

    const reorderedPriorities = newPriorities.map((p, i) => ({
      id: p.id,
      sequence_order: i + 1,
    }));

    try {
      await personalTaskService.reorderTasks(reorderedPriorities);
      fetchPriorities();
    } catch (error) {
      console.error('Error reordering priorities:', error);
    }
  };

  const completedCount = priorities.filter(p => p.status === 'Completed').length;
  const progressPercentage = priorities.length > 0 ? (completedCount / priorities.length) * 100 : 0;

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h6">Weekly Top 5 Priorities</Typography>
          <Typography variant="body2" color="text.secondary">
            Focus on your most important tasks this week (max 5)
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          disabled={priorities.length >= MAX_PRIORITIES}
        >
          Add Priority
        </Button>
      </Box>

      {priorities.length >= MAX_PRIORITIES && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You've reached the maximum of 5 priorities. Complete or remove one to add more.
        </Alert>
      )}

      {priorities.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Progress</Typography>
            <Typography variant="body2">{completedCount} of {priorities.length} completed</Typography>
          </Box>
          <LinearProgress variant="determinate" value={progressPercentage} sx={{ height: 8, borderRadius: 1 }} />
        </Box>
      )}

      <Stack spacing={2}>
        {priorities.map((priority, index) => (
          <Card key={priority.id}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                  >
                    <ArrowUpIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === priorities.length - 1}
                  >
                    <ArrowDownIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Chip
                  icon={<StarIcon />}
                  label={`#${index + 1}`}
                  color="primary"
                  sx={{ mt: 0.5 }}
                />

                <Checkbox
                  checked={priority.status === 'Completed'}
                  onChange={() => handleToggleComplete(priority)}
                />

                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      textDecoration: priority.status === 'Completed' ? 'line-through' : 'none',
                      fontWeight: 600,
                    }}
                  >
                    {priority.title}
                  </Typography>
                  {priority.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {priority.description}
                    </Typography>
                  )}
                  {priority.notes && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      📝 {priority.notes}
                    </Typography>
                  )}
                </Box>

                <Box>
                  <IconButton onClick={() => handleOpenDialog(priority)} size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(priority.id)} size="small" color="error">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}

        {priorities.length === 0 && (
          <Card>
            <CardContent>
              <Typography color="text.secondary" align="center">
                No priorities set for this week. Add your top 5 most important tasks.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Stack>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingPriority ? 'Edit Priority' : 'Add Priority'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Priority Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
            required
          />
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.title}>
            {editingPriority ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WeeklyPriorities;
