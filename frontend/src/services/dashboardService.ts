import api from './api';

export interface DashboardStats {
  totalProjects: number;
  completedProjects: number;
  inProgressProjects: number;
  onTrackPercentage: number;
  totalQuotes: number;
  activeQuotes: number;
  completedQuotes: number;
  pipelineValue: number;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await api.get('/dashboard/stats');
  return response.data.data;
};
