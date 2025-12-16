import api from './api';
import { Project, ApiResponse, PaginatedResponse } from '../types';

interface CreateProjectData {
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  project_manager_id?: number;
  budget?: number;
}

export const projectService = {
  async getProjects(page = 1, limit = 10, status?: string): Promise<PaginatedResponse<Project>> {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (status) params.append('status', status);
    const response = await api.get(`/projects?${params}`);
    return response.data;
  },

  async getProject(id: number): Promise<ApiResponse<Project>> {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  async createProject(data: CreateProjectData): Promise<ApiResponse<Project>> {
    const response = await api.post('/projects', data);
    return response.data;
  },

  async updateProject(id: number, data: Partial<Project>): Promise<ApiResponse<Project>> {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  },

  async deleteProject(id: number): Promise<ApiResponse<{ message: string }>> {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },
};
