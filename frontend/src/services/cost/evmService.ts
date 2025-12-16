import api from '../api';
import { EVMMetrics, EVMSnapshot, EVMHistory, CostForecast, ApiResponse } from '../../types';

interface EVMHistoryResponse {
  success: boolean;
  count: number;
  data: EVMHistory[];
}

export const evmService = {
  async getEVMMetrics(projectId: number): Promise<ApiResponse<EVMMetrics>> {
    const response = await api.get(`/projects/${projectId}/evm`);
    return response.data;
  },

  async createEVMSnapshot(projectId: number, data: Partial<EVMSnapshot>): Promise<ApiResponse<EVMSnapshot>> {
    const response = await api.post(`/projects/${projectId}/evm/snapshot`, data);
    return response.data;
  },

  async getEVMHistory(projectId: number): Promise<EVMHistoryResponse> {
    const response = await api.get(`/projects/${projectId}/evm/history`);
    return response.data;
  },

  async getCostForecast(projectId: number): Promise<ApiResponse<CostForecast>> {
    const response = await api.get(`/projects/${projectId}/evm/forecast`);
    return response.data;
  },
};
