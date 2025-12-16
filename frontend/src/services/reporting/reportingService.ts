import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface ExecutiveDashboard {
  project: {
    id: number;
    name: string;
    description: string;
    status: string;
    progress: number;
    startDate: string;
    endDate: string;
    projectManager: {
      id: number;
      name: string;
      email: string;
    };
  };
  overallStatus: {
    status: string;
    color: string;
    label: string;
  };
  budget: {
    planned: string;
    actual: string;
    variance: string;
    variancePercent: number;
    status: string;
    color: string;
    cpi: string | null;
  };
  schedule: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    progress: number;
    status: string;
    color: string;
    spi: string | null;
  };
  quality: {
    totalInspections: number;
    passedInspections: number;
    passRate: number;
    totalDefects: number;
    openDefects: number;
    criticalDefects: number;
    status: string;
    color: string;
  };
  risks: {
    total: number;
    active: number;
    high: number;
    critical: number;
    status: string;
    color: string;
  };
  milestones: {
    total: number;
    completed: number;
    upcoming: Array<{
      id: number;
      name: string;
      dueDate: string;
      status: string;
    }>;
  };
  recentAccomplishments: Array<{
    id: number;
    title: string;
    description: string;
    date: string;
  }>;
  activeIssues: Array<{
    type: string;
    id: number;
    title: string;
    priority?: string;
    severity?: string;
    status: string;
    dueDate?: string;
  }>;
  generatedAt: string;
}

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

export const getExecutiveDashboard = async (projectId: number): Promise<ExecutiveDashboard> => {
  const response = await axios.get(`${API_URL}/projects/${projectId}/reports/executive-dashboard`, {
    headers: getAuthHeader()
  });
  return response.data.data;
};

export const getStatusReport = async (projectId: number, period: string = 'weekly') => {
  const response = await axios.get(`${API_URL}/projects/${projectId}/reports/status-report`, {
    params: { period },
    headers: getAuthHeader()
  });
  return response.data.data;
};
