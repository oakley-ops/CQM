import api from '../api';
import { Budget, BudgetSummary, ApiResponse } from '../../types';

interface BudgetsResponse {
  success: boolean;
  count: number;
  data: Budget[];
}

export const budgetService = {
  async getBudgets(projectId: number): Promise<BudgetsResponse> {
    const response = await api.get(`/projects/${projectId}/budgets`);
    return response.data;
  },

  async getBudgetSummary(projectId: number): Promise<ApiResponse<BudgetSummary>> {
    const response = await api.get(`/projects/${projectId}/budgets/summary`);
    return response.data;
  },

  async createBudget(projectId: number, data: Partial<Budget>): Promise<ApiResponse<Budget>> {
    const response = await api.post(`/projects/${projectId}/budgets`, data);
    return response.data;
  },

  async updateBudget(id: number, data: Partial<Budget>): Promise<ApiResponse<Budget>> {
    const response = await api.put(`/budgets/${id}`, data);
    return response.data;
  },

  async deleteBudget(id: number): Promise<ApiResponse<{ message: string }>> {
    const response = await api.delete(`/budgets/${id}`);
    return response.data;
  },
};
