import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface StatusReport {
  id: number;
  project_id: number;
  report_date: string;
  reporting_period?: string;
  overall_status: string;
  accomplishments?: string;
  planned_activities?: string;
  issues?: string;
  risks?: string;
  budget_status?: string;
  schedule_status?: string;
  created_by?: number;
}

export interface MeetingMinute {
  id: number;
  project_id: number;
  meeting_title: string;
  meeting_date: string;
  location?: string;
  attendees?: string;
  agenda?: string;
  discussion?: string;
  decisions?: string;
  action_items?: string;
  next_meeting?: string;
  created_by?: number;
}

export interface CommunicationLog {
  id: number;
  project_id: number;
  communication_type: string;
  subject: string;
  description?: string;
  sender_id?: number;
  recipients?: string;
  communication_date: string;
  priority: string;
}

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

// Status Reports
export const getStatusReports = async (projectId: number) => {
  const response = await axios.get(`${API_URL}/projects/${projectId}/communications/status-reports`, {
    headers: getAuthHeader()
  });
  return response.data.data;
};

export const createStatusReport = async (projectId: number, data: Partial<StatusReport>) => {
  const response = await axios.post(`${API_URL}/projects/${projectId}/communications/status-reports`, data, {
    headers: getAuthHeader()
  });
  return response.data.data;
};

export const updateStatusReport = async (projectId: number, reportId: number, data: Partial<StatusReport>) => {
  const response = await axios.put(`${API_URL}/projects/${projectId}/communications/status-reports/${reportId}`, data, {
    headers: getAuthHeader()
  });
  return response.data.data;
};

export const deleteStatusReport = async (projectId: number, reportId: number) => {
  await axios.delete(`${API_URL}/projects/${projectId}/communications/status-reports/${reportId}`, {
    headers: getAuthHeader()
  });
};

// Meeting Minutes
export const getMeetingMinutes = async (projectId: number) => {
  const response = await axios.get(`${API_URL}/projects/${projectId}/communications/meeting-minutes`, {
    headers: getAuthHeader()
  });
  return response.data.data;
};

export const createMeetingMinute = async (projectId: number, data: Partial<MeetingMinute>) => {
  const response = await axios.post(`${API_URL}/projects/${projectId}/communications/meeting-minutes`, data, {
    headers: getAuthHeader()
  });
  return response.data.data;
};

export const updateMeetingMinute = async (projectId: number, minuteId: number, data: Partial<MeetingMinute>) => {
  const response = await axios.put(`${API_URL}/projects/${projectId}/communications/meeting-minutes/${minuteId}`, data, {
    headers: getAuthHeader()
  });
  return response.data.data;
};

export const deleteMeetingMinute = async (projectId: number, minuteId: number) => {
  await axios.delete(`${API_URL}/projects/${projectId}/communications/meeting-minutes/${minuteId}`, {
    headers: getAuthHeader()
  });
};

// Communication Logs
export const getCommunicationLogs = async (projectId: number) => {
  const response = await axios.get(`${API_URL}/projects/${projectId}/communications/communication-logs`, {
    headers: getAuthHeader()
  });
  return response.data.data;
};

export const createCommunicationLog = async (projectId: number, data: Partial<CommunicationLog>) => {
  const response = await axios.post(`${API_URL}/projects/${projectId}/communications/communication-logs`, data, {
    headers: getAuthHeader()
  });
  return response.data.data;
};

export const updateCommunicationLog = async (projectId: number, logId: number, data: Partial<CommunicationLog>) => {
  const response = await axios.put(`${API_URL}/projects/${projectId}/communications/communication-logs/${logId}`, data, {
    headers: getAuthHeader()
  });
  return response.data.data;
};

export const deleteCommunicationLog = async (projectId: number, logId: number) => {
  await axios.delete(`${API_URL}/projects/${projectId}/communications/communication-logs/${logId}`, {
    headers: getAuthHeader()
  });
};
