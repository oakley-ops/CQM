import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { fetchBudgets, fetchBudgetSummary, createBudget, deleteBudget } from '../../../store/slices/costSlice';
import { RootState, AppDispatch } from '../../../store/store';
import { toast } from 'react-toastify';

interface BudgetListProps {
  projectId: number;
}

const BudgetList = ({ projectId }: BudgetListProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { budgets, budgetSummary, loading } = useSelector((state: RootState) => state.cost);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    planned_amount: '',
    approved_amount: '',
    notes: '',
  });

  useEffect(() => {
    dispatch(fetchBudgets(projectId));
    dispatch(fetchBudgetSummary(projectId));
  }, [dispatch, projectId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      await dispatch(createBudget({ projectId, data: formData as any })).unwrap();
      toast.success('Budget created successfully!');
      setOpenDialog(false);
      setFormData({ category: '', planned_amount: '', approved_amount: '', notes: '' });
      dispatch(fetchBudgetSummary(projectId));
    } catch (error) {
      toast.error('Failed to create budget');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await dispatch(deleteBudget(id)).unwrap();
        toast.success('Budget deleted successfully!');
        dispatch(fetchBudgetSummary(projectId));
      } catch (error) {
        toast.error('Failed to delete budget');
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  const utilizationPercentage = budgetSummary && budgetSummary.total_budget > 0
    ? (budgetSummary.total_expenses / budgetSummary.total_budget) * 100
    : 0;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Budget</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
          Add Budget
        </Button>
      </Box>

      {budgetSummary && (
        <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography variant="h6">Total Budget</Typography>
                <Typography variant="h4">{formatCurrency(budgetSummary.total_budget)}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="h6">Total Expenses</Typography>
                <Typography variant="h4">{formatCurrency(budgetSummary.total_expenses)}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="h6">Remaining</Typography>
                <Typography variant="h4">{formatCurrency(budgetSummary.remaining_budget)}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" gutterBottom>
                  Budget Utilization: {utilizationPercentage.toFixed(1)}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(utilizationPercentage, 100)} 
                  color={utilizationPercentage > 90 ? 'error' : utilizationPercentage > 75 ? 'warning' : 'success'}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {budgets.length === 0 ? (
        <Box textAlign="center" p={4}>
          <Typography variant="body1" color="text.secondary">
            No budgets created yet
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {budgets.map((budget) => (
            <Grid item xs={12} md={6} key={budget.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start">
                    <Box flex={1}>
                      <Typography variant="h6">{budget.category}</Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Planned: {formatCurrency(budget.planned_amount)}
                      </Typography>
                      {budget.approved_amount && (
                        <Typography variant="body2" color="success.main">
                          Approved: {formatCurrency(budget.approved_amount)}
                        </Typography>
                      )}
                      {budget.notes && (
                        <Typography variant="caption" display="block" mt={1}>
                          {budget.notes}
                        </Typography>
                      )}
                    </Box>
                    <Button size="small" color="error" onClick={() => handleDelete(budget.id)}>
                      <DeleteIcon />
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Budget Category</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Planned Amount"
            name="planned_amount"
            type="number"
            value={formData.planned_amount}
            onChange={handleChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Approved Amount (Optional)"
            name="approved_amount"
            type="number"
            value={formData.approved_amount}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.category || !formData.planned_amount}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BudgetList;
