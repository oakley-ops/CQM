import api from '../api';
import { Stakeholder, StakeholderMatrix, ApiResponse } from '../../types';

interface StakeholdersResponse {
  success: boolean;
  count: number;
  data: Stakeholder[];
}

export const stakeholderService = {
  async getStakeholders(projectId: number): Promise<StakeholdersResponse> {
    const response = await api.get(`/projects/${projectId}/stakeholders`);
    return response.data;
  },

  async getStakeholder(id: number): Promise<ApiResponse<Stakeholder>> {
    const response = await api.get(`/stakeholders/${id}`);
    return response.data;
  },

  async createStakeholder(projectId: number, data: Partial<Stakeholder>): Promise<ApiResponse<Stakeholder>> {
    const response = await api.post(`/projects/${projectId}/stakeholders`, data);
    return response.data;
  },

  async updateStakeholder(id: number, data: Partial<Stakeholder>): Promise<ApiResponse<Stakeholder>> {
    const response = await api.put(`/stakeholders/${id}`, data);
    return response.data;
  },

  async deleteStakeholder(id: number): Promise<ApiResponse<{ message: string }>> {
    const response = await api.delete(`/stakeholders/${id}`);
    return response.data;
  },

  async getStakeholderMatrix(projectId: number): Promise<ApiResponse<StakeholderMatrix>> {
    const response = await api.get(`/projects/${projectId}/stakeholders/matrix`);
    return response.data;
  },
};
