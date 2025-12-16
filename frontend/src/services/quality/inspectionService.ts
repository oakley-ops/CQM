import api from '../api';

export interface QualityInspection {
  id: number;
  project_id: number;
  inspection_name: string;
  inspection_type?: string;
  inspection_date: string;
  inspector_id?: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'approved' | 'rejected';
  result?: 'pass' | 'fail' | 'conditional';
  score?: number;
  findings?: string;
  recommendations?: string;
  inspector?: {
    id: number;
    name: string;
    email: string;
  };
  defects?: any[];
  created_at: string;
  updated_at: string;
}

export interface CreateInspectionDto {
  inspection_name: string;
  inspection_type?: string;
  inspection_date: string;
  inspector_id?: number;
  status?: string;
  result?: string;
  score?: number;
  findings?: string;
  recommendations?: string;
}

export interface UpdateInspectionDto extends Partial<CreateInspectionDto> {}

const inspectionService = {
  // Get all inspections for a project
  getInspections: async (projectId: number): Promise<QualityInspection[]> => {
    const response = await api.get(`/projects/${projectId}/inspections`);
    return response.data.data;
  },

  // Get single inspection
  getInspection: async (inspectionId: number): Promise<QualityInspection> => {
    const response = await api.get(`/inspections/${inspectionId}`);
    return response.data.data;
  },

  // Create inspection
  createInspection: async (projectId: number, data: CreateInspectionDto): Promise<QualityInspection> => {
    const response = await api.post(`/projects/${projectId}/inspections`, data);
    return response.data.data;
  },

  // Update inspection
  updateInspection: async (inspectionId: number, data: UpdateInspectionDto): Promise<QualityInspection> => {
    const response = await api.put(`/inspections/${inspectionId}`, data);
    return response.data.data;
  },

  // Delete inspection
  deleteInspection: async (inspectionId: number): Promise<void> => {
    await api.delete(`/inspections/${inspectionId}`);
  },

  // Complete inspection
  completeInspection: async (inspectionId: number, data: { result?: string; score?: number; findings?: string; recommendations?: string }): Promise<QualityInspection> => {
    const response = await api.put(`/inspections/${inspectionId}/complete`, data);
    return response.data.data;
  },

  // Approve inspection
  approveInspection: async (inspectionId: number): Promise<QualityInspection> => {
    const response = await api.put(`/inspections/${inspectionId}/approve`);
    return response.data.data;
  },

  // Reject inspection
  rejectInspection: async (inspectionId: number, data?: { findings?: string }): Promise<QualityInspection> => {
    const response = await api.put(`/inspections/${inspectionId}/reject`, data);
    return response.data.data;
  }
};

export default inspectionService;
