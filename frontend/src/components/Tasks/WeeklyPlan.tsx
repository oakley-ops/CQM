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
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  NavigateBefore,
  NavigateNext,
} from '@mui/icons-material';
import { personalTaskService, PersonalTask } from '../../services/personalTaskService';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const WeeklyPlan = () => {
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PersonalTask | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium' as 'Critical' | 'High' | 'Medium' | 'Low',
    start_date: '',
    notes: '',
  });

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  function getDateForDay(weekStart: Date, dayIndex: number): string {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    return date.toISOString().split('T')[0];
  }

  function getDayName(weekStart: Date, dayIndex: number): string {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  useEffect(() => {
    fetchTasks();
  }, [currentWeekStart]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const response = await personalTaskService.getTasks({
        task_type: 'weekly_plan',
        start_date: currentWeekStart.toISOString().split('T')[0],
        end_date: weekEnd.toISOString().split('T')[0],
      });
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (day: string, task?: PersonalTask) => {
    setSelectedDay(day);
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        start_date: task.start_date || day,
        notes: task.notes || '',
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        priority: 'Medium',
        start_date: day,
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTask(null);
    setSelectedDay('');
  };

  const handleSave = async () => {
    try {
      const taskData = {
        ...formData,
        task_type: 'weekly_plan' as const,
        status: editingTask?.status || 'Not Started' as const,
        due_date: formData.start_date,
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

  const handleToggleComplete = async (task: PersonalTask) => {
    try {
      const newStatus = task.status === 'Completed' ? 'Not Started' : 'Completed';
      await personalTaskService.updateTask(task.id, { status: newStatus });
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await personalTaskService.deleteTask(id);
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handlePreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  };

  const handleNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  };

  const handleThisWeek = () => {
    setCurrentWeekStart(getWeekStart(new Date()));
  };

  const getTasksForDay = (date: string) => {
    return tasks.filter(task => task.start_date === date);
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

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Weekly Plan</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <IconButton onClick={handlePreviousWeek}>
            <NavigateBefore />
          </IconButton>
          <Button variant="outlined" onClick={handleThisWeek} size="small">
            This Week
          </Button>
          <Typography variant="body1" sx={{ minWidth: 200, textAlign: 'center' }}>
            {currentWeekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Typography>
          <IconButton onClick={handleNextWeek}>
            <NavigateNext />
          </IconButton>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {DAYS_OF_WEEK.map((day, index) => {
          const dateStr = getDateForDay(currentWeekStart, index);
          const dayTasks = getTasksForDay(dateStr);
          const isToday = dateStr === new Date().toISOString().split('T')[0];

          return (
            <Grid item xs={12} md={6} lg={4} key={day}>
              <Card sx={{ 
                height: '100%',
                border: isToday ? 2 : 0,
                borderColor: 'primary.main',
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                      <Typography variant="h6">{day}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getDayName(currentWeekStart, index)}
                        {isToday && <Chip label="Today" size="small" color="primary" sx={{ ml: 1 }} />}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleOpenDialog(dateStr)}
                    >
                      <AddIcon />
                    </IconButton>
                  </Box>

                  <Stack spacing={1}>
                    {dayTasks.map((task) => (
                      <Card key={task.id} variant="outlined" sx={{ 
                        bgcolor: task.status === 'Completed' ? 'action.hover' : 'background.paper' 
                      }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleComplete(task)}
                              sx={{ mt: -0.5 }}
                            >
                              <CheckCircleIcon 
                                fontSize="small"
                                color={task.status === 'Completed' ? 'success' : 'disabled'}
                              />
                            </IconButton>
                            <Box sx={{ flex: 1 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  textDecoration: task.status === 'Completed' ? 'line-through' : 'none',
                                  fontWeight: 500,
                                }}
                              >
                                {task.title}
                              </Typography>
                              {task.description && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {task.description}
                                </Typography>
                              )}
                              <Chip
                                label={task.priority}
                                size="small"
                                color={getPriorityColor(task.priority) as any}
                                sx={{ mt: 0.5, height: 20 }}
                              />
                            </Box>
                            <Box>
                              <IconButton size="small" onClick={() => handleOpenDialog(dateStr, task)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => handleDelete(task.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                    {dayTasks.length === 0 && (
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                        No tasks planned
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTask ? 'Edit Task' : 'Add Task'}</DialogTitle>
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
            label="Date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
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
            {editingTask ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WeeklyPlan;
