import api from '../api';
import { Expense, ExpenseSummary, ApiResponse } from '../../types';

interface ExpensesResponse {
  success: boolean;
  count: number;
  data: Expense[];
}

export const expenseService = {
  async getExpenses(projectId: number, filters?: { status?: string; category?: string }): Promise<ExpensesResponse> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    const response = await api.get(`/projects/${projectId}/expenses?${params}`);
    return response.data;
  },

  async getExpenseSummary(projectId: number): Promise<ApiResponse<ExpenseSummary>> {
    const response = await api.get(`/projects/${projectId}/expenses/summary`);
    return response.data;
  },

  async createExpense(projectId: number, data: Partial<Expense>): Promise<ApiResponse<Expense>> {
    const response = await api.post(`/projects/${projectId}/expenses`, data);
    return response.data;
  },

  async updateExpense(id: number, data: Partial<Expense>): Promise<ApiResponse<Expense>> {
    const response = await api.put(`/expenses/${id}`, data);
    return response.data;
  },

  async approveExpense(id: number): Promise<ApiResponse<Expense>> {
    const response = await api.put(`/expenses/${id}/approve`);
    return response.data;
  },

  async rejectExpense(id: number): Promise<ApiResponse<Expense>> {
    const response = await api.put(`/expenses/${id}/reject`);
    return response.data;
  },

  async deleteExpense(id: number): Promise<ApiResponse<{ message: string }>> {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  },
};
