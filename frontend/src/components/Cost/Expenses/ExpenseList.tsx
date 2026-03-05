import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Check as ApproveIcon } from '@mui/icons-material';
import { fetchExpenses, fetchExpenseSummary, createExpense, approveExpense } from '../../../store/slices/costSlice';
import { RootState, AppDispatch } from '../../../store/store';
import { toast } from 'react-toastify';

interface ExpenseListProps {
  projectId: number;
}

const ExpenseList = ({ projectId }: ExpenseListProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { expenses, expenseSummary, loading } = useSelector((state: RootState) => state.cost);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    category: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    vendor: '',
    invoice_number: '',
  });

  useEffect(() => {
    dispatch(fetchExpenses(projectId));
    dispatch(fetchExpenseSummary(projectId));
  }, [dispatch, projectId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      await dispatch(createExpense({ projectId, data: formData as any })).unwrap();
      toast.success('Expense created successfully!');
      setOpenDialog(false);
      setFormData({
        description: '',
        category: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        vendor: '',
        invoice_number: '',
      });
      dispatch(fetchExpenseSummary(projectId));
    } catch (error) {
      toast.error('Failed to create expense');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await dispatch(approveExpense(id)).unwrap();
      toast.success('Expense approved!');
      dispatch(fetchExpenseSummary(projectId));
    } catch (error) {
      toast.error('Failed to approve expense');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: 'warning',
      approved: 'success',
      rejected: 'error',
      paid: 'info',
    };
    return colors[status] || 'default';
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Expenses</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
          Add Expense
        </Button>
      </Box>

      {expenseSummary && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">Total Count</Typography>
                <Typography variant="h6">{expenseSummary.total_count}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">Approved</Typography>
                <Typography variant="h6" color="success.main">
                  {formatCurrency(parseFloat(expenseSummary.approved_total.toString()))}
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">Pending</Typography>
                <Typography variant="h6" color="warning.main">
                  {formatCurrency(parseFloat(expenseSummary.pending_total.toString()))}
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">Rejected</Typography>
                <Typography variant="h6" color="error.main">
                  {formatCurrency(parseFloat(expenseSummary.rejected_total.toString()))}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {expenses.length === 0 ? (
        <Box textAlign="center" p={4}>
          <Typography variant="body1" color="text.secondary">
            No expenses recorded yet
          </Typography>
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" gap={2}>
          {expenses.map((expense) => (
            <Card key={expense.id}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start">
                  <Box flex={1}>
                    <Typography variant="h6">{expense.description}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {expense.category} • {new Date(expense.expense_date).toLocaleDateString()}
                    </Typography>
                    {expense.vendor && (
                      <Typography variant="caption" display="block">
                        Vendor: {expense.vendor}
                      </Typography>
                    )}
                    {expense.invoice_number && (
                      <Typography variant="caption" display="block">
                        Invoice: {expense.invoice_number}
                      </Typography>
                    )}
                  </Box>
                  <Box display="flex" gap={1} alignItems="center">
                    <Typography variant="h6">{formatCurrency(expense.amount)}</Typography>
                    <Chip label={expense.status.toUpperCase()} color={getStatusColor(expense.status)} size="small" />
                    {expense.status === 'pending' && (
                      <Button size="small" startIcon={<ApproveIcon />} onClick={() => handleApprove(expense.id)}>
                        Approve
                      </Button>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Expense</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            margin="normal"
            required
          />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount"
                name="amount"
                type="number"
                value={formData.amount}
                onChange={handleChange}
                margin="normal"
                required
              />
            </Grid>
          </Grid>
          <TextField
            fullWidth
            label="Expense Date"
            name="expense_date"
            type="date"
            value={formData.expense_date}
            onChange={handleChange}
            margin="normal"
            InputLabelProps={{ shrink: true }}
            required
          />
          <TextField
            fullWidth
            label="Vendor"
            name="vendor"
            value={formData.vendor}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Invoice Number"
            name="invoice_number"
            value={formData.invoice_number}
            onChange={handleChange}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.description || !formData.amount}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpenseList;
