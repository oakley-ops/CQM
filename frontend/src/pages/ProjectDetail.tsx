import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { fetchProject } from '../store/slices/projectSlice';
import { RootState, AppDispatch } from '../store/store';
import IntegrationTabs from '../components/Integration/IntegrationTabs';

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { currentProject, loading } = useSelector((state: RootState) => state.projects);

  useEffect(() => {
    if (id) {
      dispatch(fetchProject(parseInt(id)));
    }
  }, [dispatch, id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!currentProject) {
    return (
      <Box>
        <Typography variant="h6">Project not found</Typography>
        <Button onClick={() => navigate('/projects')} sx={{ mt: 2 }}>
          Back to Projects
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/projects')}
        sx={{ mb: 3 }}
      >
        Back to Projects
      </Button>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 3 }}>
            <Box>
              <Typography variant="h4" gutterBottom>
                {currentProject.name}
              </Typography>
              <Chip
                label={currentProject.status.replace('_', ' ').toUpperCase()}
                color="primary"
                sx={{ mt: 1 }}
              />
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body1" paragraph>
                {currentProject.description || 'No description provided'}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Project Manager
              </Typography>
              <Typography variant="body1" paragraph>
                {currentProject.projectManager
                  ? `${currentProject.projectManager.first_name} ${currentProject.projectManager.last_name}`
                  : 'Not assigned'}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Start Date
              </Typography>
              <Typography variant="body1">
                {currentProject.start_date
                  ? new Date(currentProject.start_date).toLocaleDateString()
                  : 'Not set'}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                End Date
              </Typography>
              <Typography variant="body1">
                {currentProject.end_date
                  ? new Date(currentProject.end_date).toLocaleDateString()
                  : 'Not set'}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Budget
              </Typography>
              <Typography variant="body1">
                ${currentProject.budget?.toLocaleString() || '0'}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="body1">
                {currentProject.progress || 0}%
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Phase 2: Integration Management */}
      <IntegrationTabs projectId={parseInt(id!)} />
    </Box>
  );
};

export default ProjectDetail;
