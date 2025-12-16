// Budget Types
export interface Budget {
  id: number;
  project_id: number;
  category: string;
  planned_amount: number;
  approved_amount?: number;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

// Expense Types
export interface Expense {
  id: number;
  project_id: number;
  budget_id?: number;
  description: string;
  category?: string;
  amount: number;
  expense_date: string;
  vendor?: string;
  invoice_number?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approved_by?: number;
  approved_at?: string;
  created_by?: number;
  budget?: {
    id: number;
    category: string;
  };
  created_at: string;
  updated_at: string;
}

// EVM Types
export interface EVMSnapshot {
  id: number;
  project_id: number;
  snapshot_date: string;
  planned_value: number;
  earned_value: number;
  actual_cost: number;
  bac?: number;
  notes?: string;
  created_at: string;
}

export interface EVMMetrics {
  snapshot_date: string;
  pv: number;
  ev: number;
  ac: number;
  bac: number;
  cpi: number;
  spi: number;
  cv: number;
  sv: number;
  eac: number;
  etc: number;
  vac: number;
  performance: {
    cost: string;
    schedule: string;
  };
}

export interface EVMHistory {
  date: string;
  pv: number;
  ev: number;
  ac: number;
  cpi: number;
  spi: number;
}

export interface CostForecast {
  bac: number;
  current_cost: number;
  eac: number;
  etc: number;
  vac: number;
  completion_percentage: number;
  forecast_status: string;
}

export interface BudgetSummary {
  total_budget: number;
  total_expenses: number;
  remaining_budget: number;
}

export interface ExpenseSummary {
  total_count: number;
  approved_total: number;
  pending_total: number;
  rejected_total: number;
}

// State Types
export interface CostState {
  budgets: Budget[];
  expenses: Expense[];
  evmMetrics: EVMMetrics | null;
  evmHistory: EVMHistory[];
  forecast: CostForecast | null;
  budgetSummary: BudgetSummary | null;
  expenseSummary: ExpenseSummary | null;
  loading: boolean;
  error: string | null;
}
