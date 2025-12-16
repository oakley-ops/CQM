import api from '../api';
import { Task, TaskDependency, GanttData, ApiResponse } from '../../types';

interface TasksResponse {
  success: boolean;
  count: number;
  data: Task[];
}

export const taskService = {
  async getTasks(projectId: number, filters?: { status?: string; assigned_to?: number; priority?: string }): Promise<TasksResponse> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to.toString());
    if (filters?.priority) params.append('priority', filters.priority);
    const response = await api.get(`/projects/${projectId}/tasks?${params}`);
    return response.data;
  },

  async getTask(id: number): Promise<ApiResponse<Task>> {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  async createTask(projectId: number, data: Partial<Task>): Promise<ApiResponse<Task>> {
    const response = await api.post(`/projects/${projectId}/tasks`, data);
    return response.data;
  },

  async updateTask(id: number, data: Partial<Task>): Promise<ApiResponse<Task>> {
    const response = await api.put(`/tasks/${id}`, data);
    return response.data;
  },

  async updateProgress(id: number, progress: number): Promise<ApiResponse<Task>> {
    const response = await api.put(`/tasks/${id}/progress`, { progress });
    return response.data;
  },

  async deleteTask(id: number): Promise<ApiResponse<{ message: string }>> {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },

  async getGanttData(projectId: number): Promise<ApiResponse<GanttData>> {
    const response = await api.get(`/projects/${projectId}/tasks/gantt`);
    return response.data;
  },

  async addDependency(taskId: number, data: Partial<TaskDependency>): Promise<ApiResponse<TaskDependency>> {
    const response = await api.post(`/tasks/${taskId}/dependencies`, data);
    return response.data;
  },

  async removeDependency(dependencyId: number): Promise<ApiResponse<{ message: string }>> {
    const response = await api.delete(`/task-dependencies/${dependencyId}`);
    return response.data;
  },
};
