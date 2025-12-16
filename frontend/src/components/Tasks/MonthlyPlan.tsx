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
  ToggleButton,
  ToggleButtonGroup,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  NavigateBefore,
  NavigateNext,
  Event as EventIcon,
} from '@mui/icons-material';
import { personalTaskService, PersonalTask } from '../../services/personalTaskService';

const MonthlyPlan = () => {
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PersonalTask | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'30' | '60'>('30');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium' as 'Critical' | 'High' | 'Medium' | 'Low',
    start_date: '',
    due_date: '',
    notes: '',
  });

  useEffect(() => {
    fetchTasks();
  }, [currentMonth, viewMode]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + (viewMode === '30' ? 1 : 2), 0);
      
      const response = await personalTaskService.getTasks({
        task_type: viewMode === '30' ? '30_day' : '60_day',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (date?: string, task?: PersonalTask) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        start_date: task.start_date || '',
        due_date: task.due_date || '',
        notes: task.notes || '',
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        priority: 'Medium',
        start_date: date || '',
        due_date: date || '',
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTask(null);
  };

  const handleSave = async () => {
    try {
      const taskType = viewMode === '30' ? '30_day' : '60_day';
      const taskData = {
        ...formData,
        task_type: taskType as '30_day' | '60_day',
        status: (editingTask?.status || 'Not Started') as 'Not Started' | 'In Progress' | 'Completed' | 'Cancelled',
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
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await personalTaskService.deleteTask(id);
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getTasksForDate = (dateStr: string) => {
    return tasks.filter(task => 
      (task.start_date && task.start_date === dateStr) || 
      (task.due_date && task.due_date === dateStr)
    );
  };

  const renderCalendar = (monthOffset: number = 0) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + monthOffset, 1);
    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(date);
    const days = [];
    const today = new Date().toISOString().split('T')[0];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<Grid item xs={12/7} key={`empty-${i}`}><Box sx={{ height: 100 }} /></Grid>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTasks = getTasksForDate(dateStr);
      const isToday = dateStr === today;

      days.push(
        <Grid item xs={12/7} key={day}>
          <Card 
            sx={{ 
              height: 100, 
              cursor: 'pointer',
              border: isToday ? 2 : 0,
              borderColor: 'primary.main',
              '&:hover': { bgcolor: 'action.hover' }
            }}
            onClick={() => handleOpenDialog(dateStr)}
          >
            <CardContent sx={{ p: 1, height: '100%', overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" fontWeight={isToday ? 'bold' : 'normal'}>
                  {day}
                </Typography>
                {dayTasks.length > 0 && (
                  <Badge badgeContent={dayTasks.length} color="primary" />
                )}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                {dayTasks.slice(0, 2).map((task) => (
                  <Chip
                    key={task.id}
                    label={task.title}
                    size="small"
                    sx={{ 
                      height: 18, 
                      fontSize: '0.65rem',
                      '& .MuiChip-label': { px: 0.5 }
                    }}
                    color={task.status === 'Completed' ? 'success' : 'default'}
                  />
                ))}
                {dayTasks.length > 2 && (
                  <Typography variant="caption" color="text.secondary">
                    +{dayTasks.length - 2} more
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      );
    }

    return days;
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="h6">Monthly Plan</Typography>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="30">30 Days</ToggleButton>
            <ToggleButton value="60">60 Days</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <IconButton onClick={handlePreviousMonth}>
            <NavigateBefore />
          </IconButton>
          <Button variant="outlined" onClick={handleToday} size="small">
            Today
          </Button>
          <Typography variant="body1" sx={{ minWidth: 150, textAlign: 'center' }}>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Typography>
          <IconButton onClick={handleNextMonth}>
            <NavigateNext />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Task
          </Button>
        </Box>
      </Box>

      {/* Day headers */}
      <Grid container spacing={1} sx={{ mb: 1 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Grid item xs={12/7} key={day}>
            <Typography variant="caption" fontWeight="bold" align="center" display="block">
              {day}
            </Typography>
          </Grid>
        ))}
      </Grid>

      {/* First month calendar */}
      <Grid container spacing={1} sx={{ mb: 3 }}>
        {renderCalendar(0)}
      </Grid>

      {/* Second month calendar (for 60-day view) */}
      {viewMode === '60' && (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Typography>
          <Grid container spacing={1} sx={{ mb: 1 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Grid item xs={12/7} key={day}>
                <Typography variant="caption" fontWeight="bold" align="center" display="block">
                  {day}
                </Typography>
              </Grid>
            ))}
          </Grid>
          <Grid container spacing={1}>
            {renderCalendar(1)}
          </Grid>
        </>
      )}

      {/* Task List */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>All Tasks</Typography>
        <Grid container spacing={2}>
          {tasks.map((task) => (
            <Grid item xs={12} md={6} key={task.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" fontWeight={500}>
                        {task.title}
                      </Typography>
                      {task.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {task.description}
                        </Typography>
                      )}
                      <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={task.priority}
                          size="small"
                          color={getPriorityColor(task.priority) as any}
                        />
                        {task.start_date && (
                          <Chip
                            icon={<EventIcon />}
                            label={`Start: ${new Date(task.start_date).toLocaleDateString()}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {task.due_date && (
                          <Chip
                            label={`Due: ${new Date(task.due_date).toLocaleDateString()}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        <Chip
                          label={task.status}
                          size="small"
                          color={task.status === 'Completed' ? 'success' : 'default'}
                        />
                      </Box>
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => handleOpenDialog(undefined, task)}>
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
          {tasks.length === 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" align="center">
                    No tasks planned for this period. Click on a date or "Add Task" to create one.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>

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
            label="Start Date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Due Date"
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
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

export default MonthlyPlan;
