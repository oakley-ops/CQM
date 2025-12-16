import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface TeamMember {
  id: number;
  project_id: number;
  user_id: number;
  role: string;
  allocation_percentage: number;
  start_date?: string;
  end_date?: string;
  hourly_rate?: number;
  skills?: string;
  status: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface ResourceAllocation {
  id: number;
  project_id: number;
  team_member_id: number;
  task_id?: number;
  allocated_hours: number;
  start_date: string;
  end_date: string;
  notes?: string;
  teamMember?: TeamMember;
  task?: {
    id: number;
    name: string;
  };
}

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

// Team Members
export const getTeamMembers = async (projectId: number): Promise<TeamMember[]> => {
  const response = await axios.get(`${API_URL}/projects/${projectId}/resources/team-members`, {
    headers: getAuthHeader()
  });
  return response.data.data;
};

export const createTeamMember = async (projectId: number, data: Partial<TeamMember>): Promise<TeamMember> => {
  const response = await axios.post(`${API_URL}/projects/${projectId}/resources/team-members`, data, {
    headers: getAuthHeader()
  });
  return response.data.data;
};

export const updateTeamMember = async (projectId: number, memberId: number, data: Partial<TeamMember>): Promise<TeamMember> => {
  const response = await axios.put(`${API_URL}/projects/${projectId}/resources/team-members/${memberId}`, data, {
    headers: getAuthHeader()
  });
  return response.data.data;
};

export const deleteTeamMember = async (projectId: number, memberId: number): Promise<void> => {
  await axios.delete(`${API_URL}/projects/${projectId}/resources/team-members/${memberId}`, {
    headers: getAuthHeader()
  });
};

// Resource Allocations
export const getAllocations = async (projectId: number): Promise<ResourceAllocation[]> => {
  const response = await axios.get(`${API_URL}/projects/${projectId}/resources/allocations`, {
    headers: getAuthHeader()
  });
  return response.data.data;
};

export const createAllocation = async (projectId: number, data: Partial<ResourceAllocation>): Promise<ResourceAllocation> => {
  const response = await axios.post(`${API_URL}/projects/${projectId}/resources/allocations`, data, {
    headers: getAuthHeader()
  });
  return response.data.data;
};

export const updateAllocation = async (projectId: number, allocationId: number, data: Partial<ResourceAllocation>): Promise<ResourceAllocation> => {
  const response = await axios.put(`${API_URL}/projects/${projectId}/resources/allocations/${allocationId}`, data, {
    headers: getAuthHeader()
  });
  return response.data.data;
};

export const deleteAllocation = async (projectId: number, allocationId: number): Promise<void> => {
  await axios.delete(`${API_URL}/projects/${projectId}/resources/allocations/${allocationId}`, {
    headers: getAuthHeader()
  });
};
