import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  Card,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as MitigateIcon,
} from '@mui/icons-material';
import { RootState, AppDispatch } from '../../../store/store';
import {
  fetchRisks,
  createRisk,
  updateRisk,
  deleteRisk,
  mitigateRisk,
} from '../../../store/slices/riskSlice';
import { CreateRiskDto } from '../../../services/risk/riskService';

interface RiskRegisterProps {
  projectId: number;
}

const RiskRegister = ({ projectId }: RiskRegisterProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { risks, loading } = useSelector((state: RootState) => state.risk);
  
  const [open, setOpen] = useState(false);
  const [mitigateOpen, setMitigateOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<any>(null);
  const [mitigatingRisk, setMitigatingRisk] = useState<any>(null);
  const [formData, setFormData] = useState<CreateRiskDto>({
    title: '',
    description: '',
    category: 'technical',
    probability: 'medium',
    impact: 'medium',
    status: 'identified',
  });
  const [mitigationData, setMitigationData] = useState({
    response_strategy: 'mitigate',
    response_plan: '',
    contingency_plan: '',
  });

  useEffect(() => {
    dispatch(fetchRisks(projectId));
  }, [dispatch, projectId]);

  const handleOpen = (risk?: any) => {
    if (risk) {
      setEditingRisk(risk);
      setFormData({
        title: risk.title,
        description: risk.description || '',
        category: risk.category || 'technical',
        probability: risk.probability,
        impact: risk.impact,
        status: risk.status,
        owner_id: risk.owner_id,
        response_strategy: risk.response_strategy,
        response_plan: risk.response_plan || '',
        contingency_plan: risk.contingency_plan || '',
        trigger_conditions: risk.trigger_conditions || '',
        identified_date: risk.identified_date,
        review_date: risk.review_date,
      });
    } else {
      setEditingRisk(null);
      setFormData({
        title: '',
        description: '',
        category: 'technical',
        probability: 'medium',
        impact: 'medium',
        status: 'identified',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingRisk(null);
  };

  const handleSubmit = async () => {
    if (editingRisk) {
      await dispatch(updateRisk({ riskId: editingRisk.id, data: formData }));
    } else {
      await dispatch(createRisk({ projectId, data: formData }));
    }
    handleClose();
    dispatch(fetchRisks(projectId));
  };

  const handleDelete = async (riskId: number) => {
    if (window.confirm('Are you sure you want to delete this risk?')) {
      await dispatch(deleteRisk(riskId));
      dispatch(fetchRisks(projectId));
    }
  };

  const handleMitigateOpen = (risk: any) => {
    setMitigatingRisk(risk);
    setMitigationData({
      response_strategy: risk.response_strategy || 'mitigate',
      response_plan: risk.response_plan || '',
      contingency_plan: risk.contingency_plan || '',
    });
    setMitigateOpen(true);
  };

  const handleMitigateClose = () => {
    setMitigateOpen(false);
    setMitigatingRisk(null);
  };

  const handleMitigateSubmit = async () => {
    if (mitigatingRisk) {
      await dispatch(mitigateRisk({ riskId: mitigatingRisk.id, data: mitigationData }));
      handleMitigateClose();
      dispatch(fetchRisks(projectId));
    }
  };

  const getRiskScoreColor = (score?: number) => {
    if (!score) return 'default';
    if (score >= 15) return 'error';
    if (score >= 8) return 'warning';
    return 'success';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed':
        return 'success';
      case 'mitigated':
      case 'monitoring':
        return 'info';
      case 'occurred':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Risk Register</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Add Risk
        </Button>
      </Box>

      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Probability</TableCell>
              <TableCell>Impact</TableCell>
              <TableCell>Score</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {risks.map((risk) => (
              <TableRow key={risk.id}>
                <TableCell>{risk.title}</TableCell>
                <TableCell>{risk.category || '-'}</TableCell>
                <TableCell>
                  <Chip label={risk.probability.toUpperCase()} size="small" />
                </TableCell>
                <TableCell>
                  <Chip label={risk.impact.toUpperCase()} size="small" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={risk.risk_score || 0}
                    color={getRiskScoreColor(risk.risk_score)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={risk.status.toUpperCase()}
                    color={getStatusColor(risk.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{risk.owner?.name || '-'}</TableCell>
                <TableCell>
                  {risk.status !== 'closed' && (
                    <IconButton size="small" onClick={() => handleMitigateOpen(risk)}>
                      <MitigateIcon />
                    </IconButton>
                  )}
                  <IconButton size="small" onClick={() => handleOpen(risk)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(risk.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {risks.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No risks found. Click "Add Risk" to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editingRisk ? 'Edit Risk' : 'Add Risk'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              >
                <MenuItem value="technical">Technical</MenuItem>
                <MenuItem value="external">External</MenuItem>
                <MenuItem value="organizational">Organizational</MenuItem>
                <MenuItem value="project-management">Project Management</MenuItem>
                <MenuItem value="financial">Financial</MenuItem>
                <MenuItem value="legal">Legal</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <MenuItem value="identified">Identified</MenuItem>
                <MenuItem value="assessed">Assessed</MenuItem>
                <MenuItem value="mitigated">Mitigated</MenuItem>
                <MenuItem value="monitoring">Monitoring</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
                <MenuItem value="occurred">Occurred</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Probability"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: e.target.value as any })}
              >
                <MenuItem value="very-low">Very Low</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="very-high">Very High</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Impact"
                value={formData.impact}
                onChange={(e) => setFormData({ ...formData, impact: e.target.value as any })}
              >
                <MenuItem value="very-low">Very Low</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="very-high">Very High</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingRisk ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mitigation Dialog */}
      <Dialog open={mitigateOpen} onClose={handleMitigateClose} maxWidth="md" fullWidth>
        <DialogTitle>Mitigate Risk</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Response Strategy"
                value={mitigationData.response_strategy}
                onChange={(e) => setMitigationData({ ...mitigationData, response_strategy: e.target.value })}
              >
                <MenuItem value="avoid">Avoid</MenuItem>
                <MenuItem value="mitigate">Mitigate</MenuItem>
                <MenuItem value="transfer">Transfer</MenuItem>
                <MenuItem value="accept">Accept</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Response Plan"
                value={mitigationData.response_plan}
                onChange={(e) => setMitigationData({ ...mitigationData, response_plan: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Contingency Plan"
                value={mitigationData.contingency_plan}
                onChange={(e) => setMitigationData({ ...mitigationData, contingency_plan: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleMitigateClose}>Cancel</Button>
          <Button onClick={handleMitigateSubmit} variant="contained" disabled={!mitigationData.response_plan}>
            Mitigate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RiskRegister;
