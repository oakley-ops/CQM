import api from '../api';
import type {
  Job,
  CreateJobRequest,
  UpdateJobRequest,
  JobStatistics,
  ControlChartData,
  SPCData,
  JobsListParams,
  JobsListResponse,
} from '../../types/cqm';

export const listJobs = async (params?: JobsListParams): Promise<JobsListResponse> => {
  const response = await api.get('/jobs', { params });
  return response.data;
};

export const getJob = async (jobNumber: string): Promise<Job> => {
  const response = await api.get(`/jobs/${jobNumber}`);
  return response.data.data;
};

export const createJob = async (data: CreateJobRequest): Promise<Job> => {
  const response = await api.post('/jobs', data);
  return response.data.data;
};

export const updateJob = async (jobNumber: string, data: UpdateJobRequest): Promise<Job> => {
  const response = await api.patch(`/jobs/${jobNumber}`, data);
  return response.data.data;
};

export const deleteJob = async (jobNumber: string): Promise<void> => {
  await api.delete(`/jobs/${jobNumber}`);
};

export const getJobStatistics = async (jobNumber: string): Promise<JobStatistics> => {
  const response = await api.get(`/jobs/${jobNumber}/statistics`);
  return response.data.data;
};

export const getJobControlChart = async (
  jobNumber: string,
  testDefinitionId: number
): Promise<ControlChartData> => {
  const response = await api.get(`/jobs/${jobNumber}/control-chart/${testDefinitionId}`);
  return response.data.data;
};

export const getJobSPC = async (
  jobNumber: string,
  testDefinitionId: number
): Promise<SPCData> => {
  const response = await api.get(`/jobs/${jobNumber}/spc/${testDefinitionId}`);
  return response.data.data;
};
