import axios from 'axios';
import { AdhesionLogEntry, AdhesionLogFormValues, AdhesionLogListResponse } from '../../types/cqm/adhesionLog';

const BASE = '/api/adhesion-log';

export const adhesionLogService = {
  list: (params?: {
    job_number?: string;
    result?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    limit?: number;
  }) => axios.get<AdhesionLogListResponse>(BASE, { params }).then(r => r.data),

  getOne: (id: number) =>
    axios.get<AdhesionLogEntry>(`${BASE}/${id}`).then(r => r.data),

  getLastForJob: (jobNumber: string) =>
    axios.get<AdhesionLogEntry | null>(`${BASE}/job/${encodeURIComponent(jobNumber)}/last`).then(r => r.data),

  create: (data: Partial<AdhesionLogFormValues>) =>
    axios.post<AdhesionLogEntry>(BASE, data).then(r => r.data),

  update: (id: number, data: Partial<AdhesionLogFormValues>) =>
    axios.put<AdhesionLogEntry>(`${BASE}/${id}`, data).then(r => r.data),

  remove: (id: number) =>
    axios.delete(`${BASE}/${id}`).then(r => r.data),
};
