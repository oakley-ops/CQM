import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmailReportDialog from './EmailReportDialog';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  Button,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Email as EmailIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { getExecutiveDashboard, ExecutiveDashboard as DashboardData } from '../../services/reporting/reportingService';
import { toast } from 'react-toastify';

interface ExecutiveDashboardProps {
  projectId: number;
}

const ExecutiveDashboard = ({ projectId }: ExecutiveDashboardProps) => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, [projectId]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await getExecutiveDashboard(projectId);
      setDashboard(data);
    } catch (error) {
      toast.error('Failed to load executive dashboard');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    // Prevent multiple simultaneous requests
    if (exportingPdf) {
      return;
    }
    
    setExportingPdf(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = `/api/projects/${projectId}/reports/executive-dashboard/pdf`;

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        }
        const errorData = await response.json().catch(() => ({ message: 'Failed to export PDF' }));
        throw new Error(errorData.message || 'Failed to export PDF');
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `Executive_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  const getStatusIcon = (color: string) => {
    switch (color) {
      case 'green':
        return <CheckIcon sx={{ color: 'success.main' }} />;
      case 'yellow':
        return <WarningIcon sx={{ color: 'warning.main' }} />;
      case 'red':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      default:
        return <CheckIcon sx={{ color: 'success.main' }} />;
    }
  };

  const getStatusColor = (color: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (color) {
      case 'green':
        return 'success';
      case 'yellow':
        return 'warning';
      case 'red':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!dashboard) {
    return (
      <Alert severity="error">Failed to load dashboard data</Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Executive Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generated: {new Date(dashboard.generatedAt).toLocaleString()}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Email this dashboard to stakeholders">
            <Button
              variant="contained"
              startIcon={<EmailIcon />}
              onClick={() => setShowEmailDialog(true)}
              size="small"
            >
              Email Report
            </Button>
          </Tooltip>
          <Tooltip title="Export dashboard as PDF">
            <Button
              variant="contained"
              color="secondary"
              startIcon={<PdfIcon />}
              onClick={handleExportPDF}
              disabled={exportingPdf}
              size="small"
            >
              {exportingPdf ? 'Exporting...' : 'Export PDF'}
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* Overall Status Card */}
      <Card sx={{ mb: 3, bgcolor: dashboard.overallStatus.color === 'green' ? 'success.light' : dashboard.overallStatus.color === 'yellow' ? 'warning.light' : 'error.light' }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              {getStatusIcon(dashboard.overallStatus.color)}
              <Box>
                <Typography variant="h6">Overall Status</Typography>
                <Typography variant="h4">{dashboard.overallStatus.label}</Typography>
              </Box>
            </Box>
            <Box textAlign="right">
              <Typography variant="body2" color="text.secondary">
                Project Progress
              </Typography>
              <Typography variant="h4">{dashboard.project.progress}%</Typography>
            </Box>
          </Box>
          <Box sx={{ mt: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={dashboard.project.progress} 
              sx={{ height: 10, borderRadius: 5 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Budget Card */}
        <Grid item xs={12} md={6} lg={3}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4
              }
            }}
            onClick={() => navigate(`/projects/${projectId}#cost`)}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">Budget</Typography>
                <Chip 
                  label={dashboard.budget.status.replace('-', ' ').toUpperCase()} 
                  color={getStatusColor(dashboard.budget.color)}
                  size="small"
                />
              </Box>
              <Typography variant="h4" gutterBottom>
                ${parseFloat(dashboard.budget.actual).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                of ${parseFloat(dashboard.budget.planned).toLocaleString()}
              </Typography>
              <Box display="flex" alignItems="center" mt={1}>
                {dashboard.budget.variancePercent >= 0 ? (
                  <TrendingUpIcon sx={{ color: 'success.main', mr: 0.5 }} />
                ) : (
                  <TrendingDownIcon sx={{ color: 'error.main', mr: 0.5 }} />
                )}
                <Typography variant="body2" color={dashboard.budget.variancePercent >= 0 ? 'success.main' : 'error.main'}>
                  {Math.abs(dashboard.budget.variancePercent)}% {dashboard.budget.variancePercent >= 0 ? 'under' : 'over'}
                </Typography>
              </Box>
              {dashboard.budget.cpi && (
                <Typography variant="caption" color="text.secondary">
                  CPI: {dashboard.budget.cpi}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Schedule Card */}
        <Grid item xs={12} md={6} lg={3}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4
              }
            }}
            onClick={() => navigate(`/projects/${projectId}#schedule`)}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">Schedule</Typography>
                <Chip 
                  label={dashboard.schedule.status.replace('-', ' ').toUpperCase()} 
                  color={getStatusColor(dashboard.schedule.color)}
                  size="small"
                />
              </Box>
              <Typography variant="h4" gutterBottom>
                {dashboard.schedule.progress}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {dashboard.schedule.completedTasks} of {dashboard.schedule.totalTasks} tasks
              </Typography>
              {dashboard.schedule.overdueTasks > 0 && (
                <Typography variant="body2" color="error.main" mt={1}>
                  {dashboard.schedule.overdueTasks} overdue tasks
                </Typography>
              )}
              {dashboard.schedule.spi && (
                <Typography variant="caption" color="text.secondary">
                  SPI: {dashboard.schedule.spi}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quality Card */}
        <Grid item xs={12} md={6} lg={3}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4
              }
            }}
            onClick={() => navigate(`/projects/${projectId}#quality`)}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">Quality</Typography>
                <Chip 
                  label={dashboard.quality.status.toUpperCase()} 
                  color={getStatusColor(dashboard.quality.color)}
                  size="small"
                />
              </Box>
              <Typography variant="h4" gutterBottom>
                {dashboard.quality.passRate}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pass Rate
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                {dashboard.quality.openDefects} open defects
              </Typography>
              {dashboard.quality.criticalDefects > 0 && (
                <Typography variant="body2" color="error.main">
                  {dashboard.quality.criticalDefects} critical
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Risk Card */}
        <Grid item xs={12} md={6} lg={3}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4
              }
            }}
            onClick={() => navigate(`/projects/${projectId}#risk`)}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">Risks</Typography>
                <Chip 
                  label={dashboard.risks.status.toUpperCase()} 
                  color={getStatusColor(dashboard.risks.color)}
                  size="small"
                />
              </Box>
              <Typography variant="h4" gutterBottom>
                {dashboard.risks.active}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Risks
              </Typography>
              {dashboard.risks.high > 0 && (
                <Typography variant="body2" color="warning.main" mt={1}>
                  {dashboard.risks.high} high priority
                </Typography>
              )}
              {dashboard.risks.critical > 0 && (
                <Typography variant="body2" color="error.main">
                  {dashboard.risks.critical} critical
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Accomplishments */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Accomplishments
              </Typography>
              {dashboard.recentAccomplishments.length > 0 ? (
                <List>
                  {dashboard.recentAccomplishments.map((accomplishment, index) => (
                    <Box key={accomplishment.id}>
                      <ListItem>
                        <ListItemText
                          primary={accomplishment.title}
                          secondary={accomplishment.description}
                        />
                      </ListItem>
                      {index < dashboard.recentAccomplishments.length - 1 && <Divider />}
                    </Box>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No recent accomplishments recorded
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Active Issues */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Issues & Blockers
              </Typography>
              {dashboard.activeIssues.length > 0 ? (
                <List>
                  {dashboard.activeIssues.slice(0, 5).map((issue, index) => (
                    <Box key={`${issue.type}-${issue.id}`}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Chip 
                                label={issue.type.replace('-', ' ')} 
                                size="small" 
                                color={issue.severity === 'critical' || issue.priority === 'critical' ? 'error' : 'warning'}
                              />
                              <Typography variant="body2">{issue.title}</Typography>
                            </Box>
                          }
                          secondary={issue.status}
                        />
                      </ListItem>
                      {index < Math.min(dashboard.activeIssues.length, 5) - 1 && <Divider />}
                    </Box>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No active issues
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Milestones */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upcoming Milestones (Next 30 Days)
              </Typography>
              {dashboard.milestones.upcoming.length > 0 ? (
                <List>
                  {dashboard.milestones.upcoming.map((milestone, index) => (
                    <Box key={milestone.id}>
                      <ListItem>
                        <ListItemText
                          primary={milestone.name}
                          secondary={`Due: ${new Date(milestone.dueDate).toLocaleDateString()} - Status: ${milestone.status}`}
                        />
                      </ListItem>
                      {index < dashboard.milestones.upcoming.length - 1 && <Divider />}
                    </Box>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No upcoming milestones in the next 30 days
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Email Dialog */}
      {showEmailDialog && (
        <EmailReportDialog
          projectId={projectId}
          reportType="executive"
          onClose={() => setShowEmailDialog(false)}
        />
      )}
    </Box>
  );
};

export default ExecutiveDashboard;
