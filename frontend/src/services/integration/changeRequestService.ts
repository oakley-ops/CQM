import api from '../api';
import { ChangeRequest, ApiResponse } from '../../types';

interface ChangeRequestsResponse {
  success: boolean;
  count: number;
  data: ChangeRequest[];
}

export const changeRequestService = {
  async getChangeRequests(projectId: number, filters?: { status?: string; priority?: string }): Promise<ChangeRequestsResponse> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    const response = await api.get(`/projects/${projectId}/change-requests?${params}`);
    return response.data;
  },

  async getChangeRequest(id: number): Promise<ApiResponse<ChangeRequest>> {
    const response = await api.get(`/change-requests/${id}`);
    return response.data;
  },

  async createChangeRequest(projectId: number, data: Partial<ChangeRequest>): Promise<ApiResponse<ChangeRequest>> {
    const response = await api.post(`/projects/${projectId}/change-requests`, data);
    return response.data;
  },

  async updateChangeRequest(id: number, data: Partial<ChangeRequest>): Promise<ApiResponse<ChangeRequest>> {
    const response = await api.put(`/change-requests/${id}`, data);
    return response.data;
  },

  async reviewChangeRequest(id: number, review_notes: string): Promise<ApiResponse<ChangeRequest>> {
    const response = await api.put(`/change-requests/${id}/review`, { review_notes });
    return response.data;
  },

  async approveChangeRequest(id: number, approval_notes?: string): Promise<ApiResponse<ChangeRequest>> {
    const response = await api.put(`/change-requests/${id}/approve`, { approval_notes });
    return response.data;
  },

  async rejectChangeRequest(id: number, review_notes: string): Promise<ApiResponse<ChangeRequest>> {
    const response = await api.put(`/change-requests/${id}/reject`, { review_notes });
    return response.data;
  },

  async implementChangeRequest(id: number, implementation_notes?: string): Promise<ApiResponse<ChangeRequest>> {
    const response = await api.put(`/change-requests/${id}/implement`, { implementation_notes });
    return response.data;
  },

  async deleteChangeRequest(id: number): Promise<ApiResponse<{ message: string }>> {
    const response = await api.delete(`/change-requests/${id}`);
    return response.data;
  },
};
