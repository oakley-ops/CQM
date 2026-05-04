import api from './api';
import type { AutodataRun, AutodataRunConfig } from '../types/cqm/autodata';

export const listRuns = async (): Promise<AutodataRun[]> => {
  const res = await api.get('/autodata/runs');
  return res.data;
};

export const createRun = async (config: AutodataRunConfig & { run_name?: string }): Promise<AutodataRun> => {
  const res = await api.post('/autodata/runs', config);
  return res.data;
};

export const getRun = async (id: number): Promise<AutodataRun> => {
  const res = await api.get(`/autodata/runs/${id}`);
  return res.data;
};

export const deleteRun = async (id: number): Promise<void> => {
  await api.delete(`/autodata/runs/${id}`);
};

export const getDownloadUrl = (id: number): string =>
  `/api/autodata/runs/${id}/download`;
