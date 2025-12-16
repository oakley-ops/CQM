import api from '../api';
import { Milestone, ApiResponse } from '../../types';

interface MilestonesResponse {
  success: boolean;
  count: number;
  data: Milestone[];
}

export const milestoneService = {
  async getMilestones(projectId: number, filters?: { status?: string }): Promise<MilestonesResponse> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    const response = await api.get(`/projects/${projectId}/milestones?${params}`);
    return response.data;
  },

  async getMilestone(id: number): Promise<ApiResponse<Milestone>> {
    const response = await api.get(`/milestones/${id}`);
    return response.data;
  },

  async createMilestone(projectId: number, data: Partial<Milestone>): Promise<ApiResponse<Milestone>> {
    const response = await api.post(`/projects/${projectId}/milestones`, data);
    return response.data;
  },

  async updateMilestone(id: number, data: Partial<Milestone>): Promise<ApiResponse<Milestone>> {
    const response = await api.put(`/milestones/${id}`, data);
    return response.data;
  },

  async completeMilestone(id: number): Promise<ApiResponse<Milestone>> {
    const response = await api.put(`/milestones/${id}/complete`);
    return response.data;
  },

  async deleteMilestone(id: number): Promise<ApiResponse<{ message: string }>> {
    const response = await api.delete(`/milestones/${id}`);
    return response.data;
  },
};
