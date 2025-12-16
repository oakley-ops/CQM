import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  Typography,
  Grid,
  Chip,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  School as SchoolIcon,
  Event as EventIcon,
  Repeat as RepeatIcon,
} from '@mui/icons-material';
import { personalTaskService, PersonalTask } from '../../services/personalTaskService';

const TrainingCalendar = () => {
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PersonalTask | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'training' as 'training' | 'event',
    priority: 'Medium' as 'Critical' | 'High' | 'Medium' | 'Low',
    start_date: '',
    due_date: '',
    is_recurring: false,
    recurrence_pattern: '' as '' | 'daily' | 'weekly' | 'monthly',
    notes: '',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const [trainingResponse, eventResponse] = await Promise.all([
        personalTaskService.getTasks({ task_type: 'training' }),
        personalTaskService.getTasks({ task_type: 'event' }),
      ]);
      setTasks([...trainingResponse.data, ...eventResponse.data]);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (task?: PersonalTask) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description || '',
        task_type: task.task_type as 'training' | 'event',
        priority: task.priority,
        start_date: task.start_date || '',
        due_date: task.due_date || '',
        is_recurring: task.is_recurring,
        recurrence_pattern: (task.recurrence_pattern || '') as '' | 'daily' | 'weekly' | 'monthly',
        notes: task.notes || '',
        tags: task.tags || [],
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        task_type: 'training',
        priority: 'Medium',
        start_date: '',
        due_date: '',
        is_recurring: false,
        recurrence_pattern: '',
        notes: '',
        tags: [],
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTask(null);
    setTagInput('');
  };

  const handleSave = async () => {
    try {
      const taskData = {
        ...formData,
        status: editingTask?.status || ('Not Started' as const),
        recurrence_pattern: formData.is_recurring && formData.recurrence_pattern ? formData.recurrence_pattern : undefined,
      };

      if (editingTask) {
        await personalTaskService.updateTask(editingTask.id, taskData);
      } else {
        await personalTaskService.createTask(taskData);
      }

      handleCloseDialog();
      fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      await personalTaskService.deleteTask(id);
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'error';
      case 'High': return 'warning';
      case 'Medium': return 'info';
      case 'Low': return 'default';
      default: return 'default';
    }
  };

  const getUpcomingTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    return tasks
      .filter(task => task.start_date && task.start_date >= today)
      .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
  };

  const getPastTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    return tasks
      .filter(task => task.due_date && task.due_date < today)
      .sort((a, b) => (b.due_date || '').localeCompare(a.due_date || ''));
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  const upcomingTasks = getUpcomingTasks();
  const pastTasks = getPastTasks();

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6">Training & Events Calendar</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Training/Event
        </Button>
      </Box>

      {/* Upcoming Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EventIcon /> Upcoming ({upcomingTasks.length})
        </Typography>
        <Grid container spacing={2}>
          {upcomingTasks.map((task) => (
            <Grid item xs={12} md={6} key={task.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {task.task_type === 'training' ? <SchoolIcon color="primary" /> : <EventIcon color="secondary" />}
                        <Typography variant="body1" fontWeight={600}>
                          {task.title}
                        </Typography>
                        {task.is_recurring && <RepeatIcon fontSize="small" color="action" />}
                      </Box>
                      {task.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {task.description}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                        <Chip
                          label={task.task_type === 'training' ? 'Training' : 'Event'}
                          size="small"
                          color={task.task_type === 'training' ? 'primary' : 'secondary'}
                        />
                        <Chip
                          label={task.priority}
                          size="small"
                          color={getPriorityColor(task.priority) as any}
                        />
                        {task.start_date && (
                          <Chip
                            label={`${new Date(task.start_date).toLocaleDateString()}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {task.is_recurring && task.recurrence_pattern && (
                          <Chip
                            icon={<RepeatIcon />}
                            label={task.recurrence_pattern}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                      {task.tags && task.tags.length > 0 && (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {task.tags.map((tag, index) => (
                            <Chip key={index} label={tag} size="small" variant="outlined" sx={{ height: 20 }} />
                          ))}
                        </Stack>
                      )}
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => handleOpenDialog(task)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(task.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {upcomingTasks.length === 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" align="center">
                    No upcoming training or events scheduled.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Past Section */}
      {pastTasks.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Past Events ({pastTasks.length})
          </Typography>
          <Grid container spacing={2}>
            {pastTasks.map((task) => (
              <Grid item xs={12} md={6} key={task.id}>
                <Card sx={{ opacity: 0.7 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          {task.task_type === 'training' ? <SchoolIcon /> : <EventIcon />}
                          <Typography variant="body1" fontWeight={500}>
                            {task.title}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Chip
                            label={task.task_type === 'training' ? 'Training' : 'Event'}
                            size="small"
                          />
                          {task.due_date && (
                            <Chip
                              label={new Date(task.due_date).toLocaleDateString()}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          <Chip
                            label={task.status}
                            size="small"
                            color={task.status === 'Completed' ? 'success' : 'default'}
                          />
                        </Stack>
                      </Box>
                      <IconButton size="small" color="error" onClick={() => handleDelete(task.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTask ? 'Edit' : 'Add'} Training/Event</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
            required
          />
          <TextField
            fullWidth
            select
            label="Type"
            value={formData.task_type}
            onChange={(e) => setFormData({ ...formData, task_type: e.target.value as 'training' | 'event' })}
            sx={{ mb: 2 }}
          >
            <MenuItem value="training">Training</MenuItem>
            <MenuItem value="event">Event</MenuItem>
          </TextField>
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
            select
            label="Priority"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
            sx={{ mb: 2 }}
          >
            <MenuItem value="Critical">Critical</MenuItem>
            <MenuItem value="High">High</MenuItem>
            <MenuItem value="Medium">Medium</MenuItem>
            <MenuItem value="Low">Low</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label="Start Date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="End Date"
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.is_recurring}
                onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
              />
            }
            label="Recurring"
            sx={{ mb: 2 }}
          />
          {formData.is_recurring && (
            <TextField
              fullWidth
              select
              label="Recurrence Pattern"
              value={formData.recurrence_pattern}
              onChange={(e) => setFormData({ ...formData, recurrence_pattern: e.target.value as any })}
              sx={{ mb: 2 }}
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </TextField>
          )}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                label="Add Tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                size="small"
              />
              <Button onClick={handleAddTag} variant="outlined">Add</Button>
            </Box>
            <Stack direction="row" spacing={0.5} flexWrap="wrap">
              {formData.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  onDelete={() => handleRemoveTag(tag)}
                />
              ))}
            </Stack>
          </Box>
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
            {editingTask ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TrainingCalendar;
