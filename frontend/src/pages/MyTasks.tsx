import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  CheckBox,
  Star,
  CalendarMonth,
  Event,
  School,
  CloudUpload as ExportIcon,
} from '@mui/icons-material';
import api from '../services/api';
import TodoList from '../components/Tasks/TodoList';
import WeeklyPriorities from '../components/Tasks/WeeklyPriorities';
import WeeklyPlan from '../components/Tasks/WeeklyPlan';
import MonthlyPlan from '../components/Tasks/MonthlyPlan';
import TrainingCalendar from '../components/Tasks/TrainingCalendar';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`task-tabpanel-${index}`}
      aria-labelledby={`task-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box>
          {children}
        </Box>
      )}
    </div>
  );
}

const MyTasks = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleExportToExcel = async () => {
    try {
      setExporting(true);
      
      // Get the token
      const token = localStorage.getItem('token');
      
      // Use fetch with proper headers
      const response = await fetch(`${import.meta.env.VITE_API_URL}/personal-tasks/export/excel`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `My_Tasks_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSnackbar({
        open: true,
        message: 'Tasks exported successfully! File is downloading...',
        severity: 'success',
      });
    } catch (error: any) {
      console.error('Error exporting tasks:', error);
      setSnackbar({
        open: true,
        message: 'Failed to export tasks',
        severity: 'error',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            My Tasks
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your personal tasks, priorities, and planning
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="success"
          startIcon={exporting ? <CircularProgress size={20} color="inherit" /> : <ExportIcon />}
          onClick={handleExportToExcel}
          disabled={exporting}
          sx={{ mt: 1 }}
        >
          {exporting ? 'Exporting...' : 'Export to Excel'}
        </Button>
      </Box>

      <Paper elevation={2} sx={{ width: '100%', borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            aria-label="task management tabs"
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minHeight: 64,
                textTransform: 'none',
                fontSize: '0.95rem',
                fontWeight: 500,
              }
            }}
          >
            <Tab icon={<CheckBox />} label="To-Do List" iconPosition="start" />
            <Tab icon={<Star />} label="Weekly Priorities" iconPosition="start" />
            <Tab icon={<CalendarMonth />} label="Weekly Plan" iconPosition="start" />
            <Tab icon={<Event />} label="30/60 Day Plan" iconPosition="start" />
            <Tab icon={<School />} label="Training & Events" iconPosition="start" />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          <TabPanel value={currentTab} index={0}>
            <TodoList />
          </TabPanel>
          <TabPanel value={currentTab} index={1}>
            <WeeklyPriorities />
          </TabPanel>
          <TabPanel value={currentTab} index={2}>
            <WeeklyPlan />
          </TabPanel>
          <TabPanel value={currentTab} index={3}>
            <MonthlyPlan />
          </TabPanel>
          <TabPanel value={currentTab} index={4}>
            <TrainingCalendar />
          </TabPanel>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MyTasks;
