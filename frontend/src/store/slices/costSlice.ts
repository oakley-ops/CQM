import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { budgetService } from '../../services/cost/budgetService';
import { expenseService } from '../../services/cost/expenseService';
import { evmService } from '../../services/cost/evmService';
import { CostState, Budget, Expense } from '../../types';

const initialState: CostState = {
  budgets: [],
  expenses: [],
  evmMetrics: null,
  evmHistory: [],
  forecast: null,
  budgetSummary: null,
  expenseSummary: null,
  loading: false,
  error: null,
};

// Budget Thunks
export const fetchBudgets = createAsyncThunk(
  'cost/fetchBudgets',
  async (projectId: number, { rejectWithValue }) => {
    try {
      const response = await budgetService.getBudgets(projectId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch budgets');
    }
  }
);

export const fetchBudgetSummary = createAsyncThunk(
  'cost/fetchBudgetSummary',
  async (projectId: number, { rejectWithValue }) => {
    try {
      const response = await budgetService.getBudgetSummary(projectId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch budget summary');
    }
  }
);

export const createBudget = createAsyncThunk(
  'cost/createBudget',
  async ({ projectId, data }: { projectId: number; data: Partial<Budget> }, { rejectWithValue }) => {
    try {
      const response = await budgetService.createBudget(projectId, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create budget');
    }
  }
);

export const deleteBudget = createAsyncThunk(
  'cost/deleteBudget',
  async (id: number, { rejectWithValue }) => {
    try {
      await budgetService.deleteBudget(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete budget');
    }
  }
);

// Expense Thunks
export const fetchExpenses = createAsyncThunk(
  'cost/fetchExpenses',
  async (projectId: number, { rejectWithValue }) => {
    try {
      const response = await expenseService.getExpenses(projectId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch expenses');
    }
  }
);

export const fetchExpenseSummary = createAsyncThunk(
  'cost/fetchExpenseSummary',
  async (projectId: number, { rejectWithValue }) => {
    try {
      const response = await expenseService.getExpenseSummary(projectId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch expense summary');
    }
  }
);

export const createExpense = createAsyncThunk(
  'cost/createExpense',
  async ({ projectId, data }: { projectId: number; data: Partial<Expense> }, { rejectWithValue }) => {
    try {
      const response = await expenseService.createExpense(projectId, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create expense');
    }
  }
);

export const approveExpense = createAsyncThunk(
  'cost/approveExpense',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await expenseService.approveExpense(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to approve expense');
    }
  }
);

export const deleteExpense = createAsyncThunk(
  'cost/deleteExpense',
  async (id: number, { rejectWithValue }) => {
    try {
      await expenseService.deleteExpense(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete expense');
    }
  }
);

// EVM Thunks
export const fetchEVMMetrics = createAsyncThunk(
  'cost/fetchEVMMetrics',
  async (projectId: number, { rejectWithValue }) => {
    try {
      const response = await evmService.getEVMMetrics(projectId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch EVM metrics');
    }
  }
);

export const fetchCostForecast = createAsyncThunk(
  'cost/fetchCostForecast',
  async (projectId: number, { rejectWithValue }) => {
    try {
      const response = await evmService.getCostForecast(projectId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch cost forecast');
    }
  }
);

const costSlice = createSlice({
  name: 'cost',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCostData: (state) => {
      state.budgets = [];
      state.expenses = [];
      state.evmMetrics = null;
      state.forecast = null;
    },
  },
  extraReducers: (builder) => {
    // Budgets
    builder
      .addCase(fetchBudgets.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchBudgets.fulfilled, (state, action) => {
        state.loading = false;
        state.budgets = action.payload;
      })
      .addCase(fetchBudgets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchBudgetSummary.fulfilled, (state, action) => {
        state.budgetSummary = action.payload;
      })
      .addCase(createBudget.fulfilled, (state, action) => {
        state.budgets.push(action.payload);
      })
      .addCase(deleteBudget.fulfilled, (state, action) => {
        state.budgets = state.budgets.filter(b => b.id !== action.payload);
      });

    // Expenses
    builder
      .addCase(fetchExpenses.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.loading = false;
        state.expenses = action.payload;
      })
      .addCase(fetchExpenses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchExpenseSummary.fulfilled, (state, action) => {
        state.expenseSummary = action.payload;
      })
      .addCase(createExpense.fulfilled, (state, action) => {
        state.expenses.unshift(action.payload);
      })
      .addCase(approveExpense.fulfilled, (state, action) => {
        const index = state.expenses.findIndex(e => e.id === action.payload.id);
        if (index !== -1) {
          state.expenses[index] = action.payload;
        }
      })
      .addCase(deleteExpense.fulfilled, (state, action) => {
        state.expenses = state.expenses.filter(e => e.id !== action.payload);
      });

    // EVM
    builder
      .addCase(fetchEVMMetrics.fulfilled, (state, action) => {
        state.evmMetrics = action.payload;
      })
      .addCase(fetchCostForecast.fulfilled, (state, action) => {
        state.forecast = action.payload;
      });
  },
});

export const { clearError, clearCostData } = costSlice.actions;
export default costSlice.reducer;
