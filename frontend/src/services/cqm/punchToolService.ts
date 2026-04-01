import api from '../api';

export interface PunchTool {
  id: number;
  serial_number: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export const getPunchTools = async (): Promise<PunchTool[]> => {
  const res = await api.get<{ success: boolean; data: PunchTool[] }>('/punch-tools');
  return res.data.data;
};

export const addPunchTool = async (serialNumber: string, description?: string): Promise<PunchTool> => {
  const res = await api.post<{ success: boolean; data: PunchTool }>('/punch-tools', {
    serialNumber,
    description,
  });
  return res.data.data;
};

export const deactivatePunchTool = async (id: number): Promise<void> => {
  await api.patch(`/punch-tools/${id}/deactivate`);
};
