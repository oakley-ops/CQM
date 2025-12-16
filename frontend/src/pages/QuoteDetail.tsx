import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  CheckCircle,
  RadioButtonUnchecked,
  Block,
  Add as AddIcon,
  Rocket as RocketIcon,
} from '@mui/icons-material';
import { quoteService, Quote, QuoteMilestoneTracking, QuoteAction } from '../services/quote/quoteService';

const QuoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [newAction, setNewAction] = useState<{ description: string; action_type: 'Next Action' | 'Follow-up' | 'Blocker' | 'Note' }>({ 
    description: '', 
    action_type: 'Next Action' 
  });
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<QuoteMilestoneTracking | null>(null);
  const [milestoneUpdate, setMilestoneUpdate] = useState<{ status: 'Not Started' | 'In Progress' | 'Completed' | 'Skipped' | 'Blocked'; blockers: string }>({ 
    status: 'Not Started', 
    blockers: '' 
  });
  const scrollPositionRef = useRef<number>(0);

  useEffect(() => {
    if (id) {
      fetchQuote();
    }
  }, [id]);

  const fetchQuote = async (preserveScroll = false) => {
    try {
      if (preserveScroll) {
        scrollPositionRef.current = window.scrollY;
      }
      setLoading(true);
      const response = await quoteService.getQuoteById(Number(id));
      setQuote(response.data);
    } catch (error) {
      console.error('Error fetching quote:', error);
    } finally {
      setLoading(false);
      if (preserveScroll) {
        setTimeout(() => {
          window.scrollTo(0, scrollPositionRef.current);
        }, 0);
      }
    }
  };

  const handleMoveToNextStage = async () => {
    try {
      await quoteService.moveToNextStage(Number(id));
      fetchQuote();
    } catch (error) {
      console.error('Error moving to next stage:', error);
    }
  };

  const areAllMilestonesComplete = () => {
    if (!quote?.milestoneTracking || quote.milestoneTracking.length === 0) {
      return false;
    }
    return quote.milestoneTracking.every(tracking => tracking.status === 'Completed');
  };

  const handleConvertToProject = async () => {
    if (!confirm('Convert this quote to a project? This will create a new project with the quote details.')) return;
    
    try {
      const response = await quoteService.convertToProject(Number(id));
      alert(`Quote successfully converted to project!`);
      navigate(`/projects/${response.data.project.id}`);
    } catch (error: any) {
      console.error('Error converting to project:', error);
      alert(error.response?.data?.message || 'Error converting quote to project');
    }
  };

  const handleAddAction = async () => {
    try {
      await quoteService.createAction(Number(id), newAction);
      setActionDialogOpen(false);
      setNewAction({ description: '', action_type: 'Next Action' });
      fetchQuote(true);
    } catch (error) {
      console.error('Error creating action:', error);
    }
  };

  const handleMilestoneClick = (milestone: QuoteMilestoneTracking) => {
    setSelectedMilestone(milestone);
    setMilestoneUpdate({ 
      status: milestone.status || 'Not Started', 
      blockers: milestone.blockers || '' 
    });
    setMilestoneDialogOpen(true);
  };

  const handleUpdateMilestone = async () => {
    if (!selectedMilestone) return;
    try {
      await quoteService.updateMilestone(Number(id), selectedMilestone.milestone_id, milestoneUpdate);
      setMilestoneDialogOpen(false);
      setSelectedMilestone(null);
      fetchQuote(true);
    } catch (error) {
      console.error('Error updating milestone:', error);
    }
  };

  const getMilestoneIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle color="success" />;
      case 'In Progress':
        return <RadioButtonUnchecked color="primary" />;
      case 'Blocked':
        return <Block color="error" />;
      default:
        return <RadioButtonUnchecked color="disabled" />;
    }
  };

  const calculateProgress = () => {
    if (!quote?.milestoneTracking) return 0;
    const completed = quote.milestoneTracking.filter(m => m.status === 'Completed').length;
    return (completed / quote.milestoneTracking.length) * 100;
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  if (!quote) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Typography>Quote not found</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/quotes')}>
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4">{quote.quote_number}</Typography>
            <Typography variant="body2" color="text.secondary">
              {quote.project_name}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => navigate(`/quotes/${id}/edit`)}
          >
            Edit
          </Button>
          {quote.status === 'Completed' && !quote.project_id && areAllMilestonesComplete() && (
            <Button
              variant="contained"
              color="success"
              startIcon={<RocketIcon />}
              onClick={handleConvertToProject}
            >
              Convert to Project
            </Button>
          )}
          {quote.project_id && (
            <Button
              variant="outlined"
              onClick={() => navigate(`/projects/${quote.project_id}`)}
            >
              View Project
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleMoveToNextStage}
            disabled={quote.status === 'Completed'}
          >
            Next Stage
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Quote Info */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quote Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Client</Typography>
                  <Typography>{quote.client?.name || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Assigned To</Typography>
                  <Typography>{quote.assignee?.full_name || 'Unassigned'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Priority</Typography>
                  <Box>
                    <Chip label={quote.priority} size="small" />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Box>
                    <Chip label={quote.status} size="small" color="primary" />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Quote Value</Typography>
                  <Typography>${quote.quote_value?.toLocaleString() || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Days in Process</Typography>
                  <Typography>{quote.days_in_process || 0} days</Typography>
                </Grid>
              </Grid>
              {quote.notes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">Notes</Typography>
                  <Typography>{quote.notes}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Milestone Timeline */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Milestone Progress
              </Typography>
              <Box sx={{ mb: 3 }}>
                <LinearProgress variant="determinate" value={calculateProgress()} sx={{ height: 10, borderRadius: 5 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {Math.round(calculateProgress())}% Complete
                </Typography>
              </Box>
              <List>
                {quote.milestoneTracking?.map((tracking: QuoteMilestoneTracking) => (
                  <ListItem 
                    key={tracking.id} 
                    sx={{ 
                      borderLeft: 3, 
                      borderColor: tracking.status === 'Completed' ? 'success.main' : 'grey.300', 
                      mb: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                    onClick={() => handleMilestoneClick(tracking)}
                  >
                    <Box sx={{ mr: 2 }}>{getMilestoneIcon(tracking.status)}</Box>
                    <ListItemText
                      primary={tracking.milestone?.name}
                      secondary={
                        <Box component="span">
                          <Typography variant="body2" component="span" display="block">
                            Status: {tracking.status}
                          </Typography>
                          {tracking.blockers && (
                            <Typography variant="body2" color="error" component="span" display="block">
                              Blocker: {tracking.blockers}
                            </Typography>
                          )}
                        </Box>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                    {tracking.completed_date && (
                      <Typography variant="body2" color="text.secondary">
                        {new Date(tracking.completed_date).toLocaleDateString()}
                      </Typography>
                    )}
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Actions Sidebar */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Actions</Typography>
                <IconButton size="small" onClick={() => setActionDialogOpen(true)}>
                  <AddIcon />
                </IconButton>
              </Box>
              <List>
                {quote.actions?.filter((a: QuoteAction) => !a.completed).map((action: QuoteAction) => (
                  <ListItem key={action.id} sx={{ bgcolor: 'grey.50', mb: 1, borderRadius: 1 }}>
                    <ListItemText
                      primary={action.description}
                      secondary={
                        <Box component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Chip label={action.action_type} size="small" />
                          {action.due_date && (
                            <Typography variant="caption" component="span">
                              Due: {new Date(action.due_date).toLocaleDateString()}
                            </Typography>
                          )}
                        </Box>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                  </ListItem>
                ))}
                {(!quote.actions || quote.actions.filter((a: QuoteAction) => !a.completed).length === 0) && (
                  <Typography variant="body2" color="text.secondary">No pending actions</Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Action Dialog */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Action</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={newAction.description}
            onChange={(e) => setNewAction({ ...newAction, description: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddAction} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>

      {/* Update Milestone Dialog */}
      <Dialog open={milestoneDialogOpen} onClose={() => setMilestoneDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Milestone: {selectedMilestone?.milestone?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              fullWidth
              label="Status"
              value={milestoneUpdate.status}
              onChange={(e) => setMilestoneUpdate({ ...milestoneUpdate, status: e.target.value as 'Not Started' | 'In Progress' | 'Completed' | 'Skipped' | 'Blocked' })}
            >
              <MenuItem value="Not Started">Not Started</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
              <MenuItem value="Blocked">Blocked</MenuItem>
              <MenuItem value="Skipped">Skipped</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="Blockers / Notes"
              multiline
              rows={3}
              value={milestoneUpdate.blockers}
              onChange={(e) => setMilestoneUpdate({ ...milestoneUpdate, blockers: e.target.value })}
              helperText="Describe any blockers or add notes"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMilestoneDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateMilestone} variant="contained">Update</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default QuoteDetail;
