import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Card, CardContent, Paper, CircularProgress, Divider, CardActionArea } from '@mui/material';
import {
  FolderOpen,
  CheckCircle,
  Schedule,
  TrendingUp,
  Description,
  PlayArrow,
  AttachMoney,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { getDashboardStats, DashboardStats } from '../services/dashboardService';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await getDashboardStats();
        setStats(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const projectCards = stats ? [
    { 
      title: 'Total Projects', 
      value: stats.totalProjects.toString(), 
      icon: <FolderOpen />, 
      color: '#1976d2',
      path: '/projects',
      description: 'View all projects'
    },
    { 
      title: 'Completed', 
      value: stats.completedProjects.toString(), 
      icon: <CheckCircle />, 
      color: '#2e7d32',
      path: '/projects?status=completed',
      description: 'View completed projects'
    },
    { 
      title: 'In Progress', 
      value: stats.inProgressProjects.toString(), 
      icon: <Schedule />, 
      color: '#ed6c02',
      path: '/projects?status=in_progress',
      description: 'View active projects'
    },
    { 
      title: 'On Track', 
      value: `${stats.onTrackPercentage}%`, 
      icon: <TrendingUp />, 
      color: '#9c27b0',
      path: '/projects',
      description: 'View project health'
    },
  ] : [];

  const quoteCards = stats ? [
    { 
      title: 'Total Quotes', 
      value: stats.totalQuotes.toString(), 
      icon: <Description />, 
      color: '#1976d2',
      path: '/quotes',
      description: 'View all quotes'
    },
    { 
      title: 'Active Quotes', 
      value: stats.activeQuotes.toString(), 
      icon: <PlayArrow />, 
      color: '#ed6c02',
      path: '/quotes?status=active',
      description: 'View active quotes'
    },
    { 
      title: 'Completed', 
      value: stats.completedQuotes.toString(), 
      icon: <CheckCircle />, 
      color: '#2e7d32',
      path: '/quotes?status=completed',
      description: 'View completed quotes'
    },
    { 
      title: 'Pipeline Value', 
      value: `$${(stats.pipelineValue || 0).toLocaleString()}`, 
      icon: <AttachMoney />, 
      color: '#9c27b0',
      path: '/quotes?status=active',
      description: 'View pipeline value'
    },
  ] : [];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Welcome back, {user?.first_name}!
        </Typography>
        <Typography variant="body1" color="error" gutterBottom>
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome back, {user?.first_name}!
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Here's an overview of your quotes and projects
      </Typography>

      {/* Quotes Section */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Description /> Quotes Overview
        </Typography>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {quoteCards.map((stat) => (
            <Grid item xs={12} sm={6} md={3} key={stat.title}>
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                    cursor: 'pointer',
                  }
                }}
              >
                <CardActionArea 
                  onClick={() => navigate(stat.path)}
                  sx={{ height: '100%' }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          bgcolor: `${stat.color}20`,
                          color: stat.color,
                          mr: 2,
                        }}
                      >
                        {stat.icon}
                      </Box>
                      <Box>
                        <Typography variant="h4" component="div">
                          {stat.value}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {stat.title}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      {stat.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Projects Section */}
      <Box>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FolderOpen /> Projects Overview
        </Typography>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {projectCards.map((stat) => (
            <Grid item xs={12} sm={6} md={3} key={stat.title}>
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                    cursor: 'pointer',
                  }
                }}
              >
                <CardActionArea 
                  onClick={() => navigate(stat.path)}
                  sx={{ height: '100%' }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          bgcolor: `${stat.color}20`,
                          color: stat.color,
                          mr: 2,
                        }}
                      >
                        {stat.icon}
                      </Box>
                      <Box>
                        <Typography variant="h4" component="div">
                          {stat.value}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {stat.title}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      {stat.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          🎉 System Ready!
        </Typography>
        <Typography variant="body1" paragraph>
          Your enterprise project management system is now running. You have access to:
        </Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <li>Quote tracking and milestone management</li>
          <li>Automatic quote-to-project conversion</li>
          <li>Project creation and management</li>
          <li>User authentication and authorization</li>
          <li>Role-based access control</li>
          <li>Dashboard and analytics</li>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Navigate to <strong>Quotes</strong> to create your first quote or <strong>Projects</strong> to create a project!
        </Typography>
      </Paper>
    </Box>
  );
};

export default Dashboard;
