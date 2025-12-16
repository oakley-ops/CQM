import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip,
  useTheme,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  Today,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, differenceInDays, parseISO } from 'date-fns';
import { Task, TaskDependency } from '../../../types';
import { taskService } from '../../../services/schedule/taskService';
import { toast } from 'react-toastify';

interface GanttChartProps {
  projectId: number;
}

interface GanttTask extends Task {
  dependencies?: TaskDependency[];
}

const GanttChart = ({ projectId }: GanttChartProps) => {
  const theme = useTheme();
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewStart, setViewStart] = useState<Date>(startOfMonth(new Date()));
  const [viewEnd, setViewEnd] = useState<Date>(endOfMonth(addDays(new Date(), 90)));
  const [zoom, setZoom] = useState(1); // 1 = day view, 7 = week view, 30 = month view
  const [draggedTask, setDraggedTask] = useState<number | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGanttData();
  }, [projectId]);

  const fetchGanttData = async () => {
    try {
      setLoading(true);
      const response = await taskService.getTasks(projectId);
      const tasksWithDates = response.data.filter(
        (task) => task.start_date && task.end_date
      );
      setTasks(tasksWithDates);
    } catch (error) {
      console.error('Error fetching Gantt data:', error);
      toast.error('Failed to load Gantt chart data');
    } finally {
      setLoading(false);
    }
  };

  const getTaskColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.palette.success.main;
      case 'in_progress':
        return theme.palette.primary.main;
      case 'blocked':
        return theme.palette.error.main;
      case 'not_started':
        return theme.palette.grey[400];
      default:
        return theme.palette.grey[300];
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return theme.palette.error.main;
      case 'high':
        return theme.palette.warning.main;
      case 'medium':
        return theme.palette.info.main;
      case 'low':
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const calculateTaskPosition = (task: Task) => {
    if (!task.start_date || !task.end_date) return null;

    const taskStart = parseISO(task.start_date);
    const taskEnd = parseISO(task.end_date);
    const totalDays = differenceInDays(viewEnd, viewStart);
    const startOffset = differenceInDays(taskStart, viewStart);
    const duration = differenceInDays(taskEnd, taskStart) + 1;

    const left = (startOffset / totalDays) * 100;
    const width = (duration / totalDays) * 100;

    return { left: `${Math.max(0, left)}%`, width: `${Math.max(1, width)}%` };
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.max(1, prev / 2));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.min(30, prev * 2));
  };

  const handlePanLeft = () => {
    const days = Math.floor(differenceInDays(viewEnd, viewStart) * 0.25);
    setViewStart((prev) => addDays(prev, -days));
    setViewEnd((prev) => addDays(prev, -days));
  };

  const handlePanRight = () => {
    const days = Math.floor(differenceInDays(viewEnd, viewStart) * 0.25);
    setViewStart((prev) => addDays(prev, days));
    setViewEnd((prev) => addDays(prev, days));
  };

  const handleToday = () => {
    const today = new Date();
    setViewStart(startOfMonth(today));
    setViewEnd(endOfMonth(addDays(today, 90)));
  };

  const handleTaskDragStart = (taskId: number, e: React.MouseEvent) => {
    setDraggedTask(taskId);
    setDragStartX(e.clientX);
  };

  const handleTaskDrag = (e: React.MouseEvent) => {
    if (!draggedTask || !chartRef.current) return;

    const chartWidth = chartRef.current.offsetWidth;
    const totalDays = differenceInDays(viewEnd, viewStart);
    const pixelsPerDay = chartWidth / totalDays;
    const deltaX = e.clientX - dragStartX;
    const daysDelta = Math.round(deltaX / pixelsPerDay);

    // Update task dates (this would trigger an API call in production)
    if (Math.abs(daysDelta) > 0) {
      const task = tasks.find((t) => t.id === draggedTask);
      if (task && task.start_date && task.end_date) {
        const newStartDate = addDays(parseISO(task.start_date), daysDelta);
        const newEndDate = addDays(parseISO(task.end_date), daysDelta);
        
        // Update local state
        setTasks((prev) =>
          prev.map((t) =>
            t.id === draggedTask
              ? {
                  ...t,
                  start_date: format(newStartDate, 'yyyy-MM-dd'),
                  end_date: format(newEndDate, 'yyyy-MM-dd'),
                }
              : t
          )
        );
        
        setDragStartX(e.clientX);
      }
    }
  };

  const handleTaskDragEnd = async () => {
    if (!draggedTask) return;

    const task = tasks.find((t) => t.id === draggedTask);
    if (task) {
      try {
        await taskService.updateTask(task.id, {
          start_date: task.start_date,
          end_date: task.end_date,
        });
        toast.success('Task dates updated successfully');
      } catch (error) {
        console.error('Error updating task:', error);
        toast.error('Failed to update task dates');
        fetchGanttData(); // Revert changes
      }
    }

    setDraggedTask(null);
  };

  const renderTimeline = () => {
    const days = eachDayOfInterval({ start: viewStart, end: viewEnd });
    const displayDays = days.filter((_, index) => index % zoom === 0);

    return (
      <Box
        sx={{
          display: 'flex',
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
          position: 'sticky',
          top: 0,
          zIndex: 2,
        }}
      >
        <Box sx={{ width: 250, flexShrink: 0, borderRight: `1px solid ${theme.palette.divider}`, p: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            Task Name
          </Typography>
        </Box>
        <Box sx={{ flex: 1, display: 'flex', position: 'relative' }}>
          {displayDays.map((day, index) => (
            <Box
              key={index}
              sx={{
                flex: 1,
                minWidth: 40,
                borderRight: `1px solid ${theme.palette.divider}`,
                p: 0.5,
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" display="block">
                {format(day, 'MMM')}
              </Typography>
              <Typography variant="caption" fontWeight="bold">
                {format(day, 'd')}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const renderTodayLine = () => {
    const today = new Date();
    const totalDays = differenceInDays(viewEnd, viewStart);
    const todayOffset = differenceInDays(today, viewStart);
    const left = (todayOffset / totalDays) * 100;

    if (left < 0 || left > 100) return null;

    return (
      <Box
        sx={{
          position: 'absolute',
          left: `${left}%`,
          top: 0,
          bottom: 0,
          width: 2,
          backgroundColor: theme.palette.error.main,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -8,
            left: -6,
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: `8px solid ${theme.palette.error.main}`,
          }}
        />
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (tasks.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Tasks with Dates
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add start and end dates to tasks to see them in the Gantt chart
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Controls */}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          Gantt Chart
        </Typography>
        <Tooltip title="Pan Left">
          <IconButton onClick={handlePanLeft} size="small">
            <ChevronLeft />
          </IconButton>
        </Tooltip>
        <Tooltip title="Today">
          <IconButton onClick={handleToday} size="small">
            <Today />
          </IconButton>
        </Tooltip>
        <Tooltip title="Pan Right">
          <IconButton onClick={handlePanRight} size="small">
            <ChevronRight />
          </IconButton>
        </Tooltip>
        <Box sx={{ borderLeft: `1px solid ${theme.palette.divider}`, height: 24, mx: 1 }} />
        <Tooltip title="Zoom In">
          <IconButton onClick={handleZoomIn} size="small" disabled={zoom <= 1}>
            <ZoomIn />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom Out">
          <IconButton onClick={handleZoomOut} size="small" disabled={zoom >= 30}>
            <ZoomOut />
          </IconButton>
        </Tooltip>
        <Typography variant="caption" color="text.secondary">
          {format(viewStart, 'MMM d, yyyy')} - {format(viewEnd, 'MMM d, yyyy')}
        </Typography>
      </Paper>

      {/* Gantt Chart */}
      <Paper sx={{ overflow: 'auto', maxHeight: 600 }}>
        {renderTimeline()}
        <Box
          ref={chartRef}
          sx={{ position: 'relative' }}
          onMouseMove={handleTaskDrag}
          onMouseUp={handleTaskDragEnd}
          onMouseLeave={handleTaskDragEnd}
        >
          {renderTodayLine()}
          {tasks.map((task, index) => {
            const position = calculateTaskPosition(task);
            if (!position) return null;

            return (
              <Box
                key={task.id}
                sx={{
                  display: 'flex',
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  minHeight: 50,
                  backgroundColor: index % 2 === 0 ? theme.palette.background.default : 'transparent',
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                {/* Task Name Column */}
                <Box
                  sx={{
                    width: 250,
                    flexShrink: 0,
                    borderRight: `1px solid ${theme.palette.divider}`,
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {task.name}
                    </Typography>
                    {task.assignee && (
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {task.assignee.first_name} {task.assignee.last_name}
                      </Typography>
                    )}
                  </Box>
                  <Chip
                    label={task.priority}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      backgroundColor: getPriorityColor(task.priority),
                      color: 'white',
                    }}
                  />
                </Box>

                {/* Timeline Column */}
                <Box sx={{ flex: 1, position: 'relative', p: 1 }}>
                  <Tooltip
                    title={
                      <Box>
                        <Typography variant="caption" display="block">
                          {task.name}
                        </Typography>
                        <Typography variant="caption" display="block">
                          {task.start_date} to {task.end_date}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Progress: {task.progress}%
                        </Typography>
                      </Box>
                    }
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        left: position.left,
                        width: position.width,
                        height: 32,
                        backgroundColor: getTaskColor(task.status),
                        borderRadius: 1,
                        cursor: draggedTask === task.id ? 'grabbing' : 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        px: 1,
                        boxShadow: draggedTask === task.id ? 3 : 1,
                        transition: draggedTask === task.id ? 'none' : 'all 0.2s',
                        '&:hover': {
                          boxShadow: 2,
                          transform: 'translateY(-1px)',
                        },
                      }}
                      onMouseDown={(e) => handleTaskDragStart(task.id, e)}
                    >
                      {/* Progress Bar */}
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${task.progress}%`,
                          backgroundColor: 'rgba(255, 255, 255, 0.3)',
                          borderRadius: 1,
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'white',
                          fontWeight: 'bold',
                          position: 'relative',
                          zIndex: 1,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {task.progress}%
                      </Typography>
                    </Box>
                  </Tooltip>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* Legend */}
      <Paper sx={{ p: 2, mt: 2, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 16, height: 16, backgroundColor: theme.palette.success.main, borderRadius: 0.5 }} />
          <Typography variant="caption">Completed</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 16, height: 16, backgroundColor: theme.palette.primary.main, borderRadius: 0.5 }} />
          <Typography variant="caption">In Progress</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 16, height: 16, backgroundColor: theme.palette.error.main, borderRadius: 0.5 }} />
          <Typography variant="caption">Blocked</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 16, height: 16, backgroundColor: theme.palette.grey[400], borderRadius: 0.5 }} />
          <Typography variant="caption">Not Started</Typography>
        </Box>
        <Box sx={{ borderLeft: `1px solid ${theme.palette.divider}`, height: 24, mx: 1 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 2, height: 16, backgroundColor: theme.palette.error.main }} />
          <Typography variant="caption">Today</Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default GanttChart;
