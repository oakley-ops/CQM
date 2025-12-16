import api from '../api';
import { ProjectCharter, ApiResponse } from '../../types';

export const charterService = {
  async getCharter(projectId: number): Promise<ApiResponse<ProjectCharter>> {
    const response = await api.get(`/projects/${projectId}/charter`);
    return response.data;
  },

  async createCharter(projectId: number, data: Partial<ProjectCharter>): Promise<ApiResponse<ProjectCharter>> {
    const response = await api.post(`/projects/${projectId}/charter`, data);
    return response.data;
  },

  async updateCharter(projectId: number, data: Partial<ProjectCharter>): Promise<ApiResponse<ProjectCharter>> {
    const response = await api.put(`/projects/${projectId}/charter`, data);
    return response.data;
  },

  async approveCharter(projectId: number): Promise<ApiResponse<ProjectCharter>> {
    const response = await api.put(`/projects/${projectId}/charter/approve`);
    return response.data;
  },

  async deleteCharter(projectId: number): Promise<ApiResponse<{ message: string }>> {
    const response = await api.delete(`/projects/${projectId}/charter`);
    return response.data;
  },
};
