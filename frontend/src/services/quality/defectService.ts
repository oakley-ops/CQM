import api from '../api';

export interface Defect {
  id: number;
  project_id: number;
  inspection_id?: number;
  title: string;
  description?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in-progress' | 'resolved' | 'closed' | 'rejected';
  detected_date: string;
  detected_by?: number;
  assigned_to?: number;
  resolved_date?: string;
  resolution?: string;
  detectedBy?: {
    id: number;
    name: string;
    email: string;
  };
  assignedTo?: {
    id: number;
    name: string;
    email: string;
  };
  inspection?: {
    id: number;
    inspection_name: string;
    inspection_date: string;
  };
  created_at: string;
  updated_at: string;
}

export interface DefectSummary {
  total_defects: number;
  open_count: number;
  in_progress_count: number;
  resolved_count: number;
  closed_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
}

export interface CreateDefectDto {
  title: string;
  description?: string;
  severity?: string;
  priority?: string;
  status?: string;
  detected_date: string;
  inspection_id?: number;
  assigned_to?: number;
}

export interface UpdateDefectDto extends Partial<CreateDefectDto> {}

const defectService = {
  // Get all defects for a project
  getDefects: async (projectId: number): Promise<Defect[]> => {
    const response = await api.get(`/projects/${projectId}/defects`);
    return response.data.data;
  },

  // Get single defect
  getDefect: async (defectId: number): Promise<Defect> => {
    const response = await api.get(`/defects/${defectId}`);
    return response.data.data;
  },

  // Get defects summary
  getSummary: async (projectId: number): Promise<DefectSummary> => {
    const response = await api.get(`/projects/${projectId}/defects/summary`);
    return response.data.data;
  },

  // Create defect
  createDefect: async (projectId: number, data: CreateDefectDto): Promise<Defect> => {
    const response = await api.post(`/projects/${projectId}/defects`, data);
    return response.data.data;
  },

  // Update defect
  updateDefect: async (defectId: number, data: UpdateDefectDto): Promise<Defect> => {
    const response = await api.put(`/defects/${defectId}`, data);
    return response.data.data;
  },

  // Delete defect
  deleteDefect: async (defectId: number): Promise<void> => {
    await api.delete(`/defects/${defectId}`);
  },

  // Assign defect
  assignDefect: async (defectId: number, userId: number): Promise<Defect> => {
    const response = await api.put(`/defects/${defectId}/assign`, { assigned_to: userId });
    return response.data.data;
  },

  // Resolve defect
  resolveDefect: async (defectId: number, resolution: string): Promise<Defect> => {
    const response = await api.put(`/defects/${defectId}/resolve`, { resolution });
    return response.data.data;
  },

  // Close defect
  closeDefect: async (defectId: number): Promise<Defect> => {
    const response = await api.put(`/defects/${defectId}/close`);
    return response.data.data;
  }
};

export default defectService;
