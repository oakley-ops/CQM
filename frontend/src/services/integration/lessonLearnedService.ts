import api from '../api';
import { LessonLearned, ApiResponse } from '../../types';

interface LessonsLearnedResponse {
  success: boolean;
  count: number;
  data: LessonLearned[];
}

export const lessonLearnedService = {
  async getLessonsLearned(projectId: number, filters?: { category?: string; phase?: string; impact?: string }): Promise<LessonsLearnedResponse> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.phase) params.append('phase', filters.phase);
    if (filters?.impact) params.append('impact', filters.impact);
    const response = await api.get(`/projects/${projectId}/lessons-learned?${params}`);
    return response.data;
  },

  async getLessonLearned(id: number): Promise<ApiResponse<LessonLearned>> {
    const response = await api.get(`/lessons-learned/${id}`);
    return response.data;
  },

  async createLessonLearned(projectId: number, data: Partial<LessonLearned>): Promise<ApiResponse<LessonLearned>> {
    const response = await api.post(`/projects/${projectId}/lessons-learned`, data);
    return response.data;
  },

  async updateLessonLearned(id: number, data: Partial<LessonLearned>): Promise<ApiResponse<LessonLearned>> {
    const response = await api.put(`/lessons-learned/${id}`, data);
    return response.data;
  },

  async deleteLessonLearned(id: number): Promise<ApiResponse<{ message: string }>> {
    const response = await api.delete(`/lessons-learned/${id}`);
    return response.data;
  },

  async searchLessonsLearned(query: string, filters?: { category?: string; phase?: string; impact?: string }): Promise<LessonsLearnedResponse> {
    const params = new URLSearchParams({ q: query });
    if (filters?.category) params.append('category', filters.category);
    if (filters?.phase) params.append('phase', filters.phase);
    if (filters?.impact) params.append('impact', filters.impact);
    const response = await api.get(`/lessons-learned/search?${params}`);
    return response.data;
  },
};
