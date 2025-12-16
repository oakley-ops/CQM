import api from '../api';

export interface Risk {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  category?: 'technical' | 'external' | 'organizational' | 'project-management' | 'financial' | 'legal' | 'other';
  probability: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  impact: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  risk_score?: number;
  status: 'identified' | 'assessed' | 'mitigated' | 'monitoring' | 'closed' | 'occurred';
  owner_id?: number;
  response_strategy?: 'avoid' | 'mitigate' | 'transfer' | 'accept' | 'exploit' | 'enhance' | 'share';
  response_plan?: string;
  contingency_plan?: string;
  trigger_conditions?: string;
  identified_date?: string;
  review_date?: string;
  owner?: {
    id: number;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface RiskSummary {
  total_risks: number;
  identified_count: number;
  assessed_count: number;
  mitigated_count: number;
  monitoring_count: number;
  closed_count: number;
  occurred_count: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  average_risk_score: number;
}

export interface RiskMatrix {
  [probability: string]: {
    [impact: string]: Risk[];
  };
}

export interface CreateRiskDto {
  title: string;
  description?: string;
  category?: string;
  probability?: string;
  impact?: string;
  status?: string;
  owner_id?: number;
  response_strategy?: string;
  response_plan?: string;
  contingency_plan?: string;
  trigger_conditions?: string;
  identified_date?: string;
  review_date?: string;
}

export interface UpdateRiskDto extends Partial<CreateRiskDto> {}

const riskService = {
  // Get all risks for a project
  getRisks: async (projectId: number): Promise<Risk[]> => {
    const response = await api.get(`/projects/${projectId}/risks`);
    return response.data.data;
  },

  // Get single risk
  getRisk: async (riskId: number): Promise<Risk> => {
    const response = await api.get(`/risks/${riskId}`);
    return response.data.data;
  },

  // Get risk matrix
  getMatrix: async (projectId: number): Promise<RiskMatrix> => {
    const response = await api.get(`/projects/${projectId}/risks/matrix`);
    return response.data.data;
  },

  // Get risk summary
  getSummary: async (projectId: number): Promise<RiskSummary> => {
    const response = await api.get(`/projects/${projectId}/risks/summary`);
    return response.data.data;
  },

  // Create risk
  createRisk: async (projectId: number, data: CreateRiskDto): Promise<Risk> => {
    const response = await api.post(`/projects/${projectId}/risks`, data);
    return response.data.data;
  },

  // Update risk
  updateRisk: async (riskId: number, data: UpdateRiskDto): Promise<Risk> => {
    const response = await api.put(`/risks/${riskId}`, data);
    return response.data.data;
  },

  // Delete risk
  deleteRisk: async (riskId: number): Promise<void> => {
    await api.delete(`/risks/${riskId}`);
  },

  // Mitigate risk
  mitigateRisk: async (riskId: number, data: { response_strategy: string; response_plan: string; contingency_plan?: string }): Promise<Risk> => {
    const response = await api.put(`/risks/${riskId}/mitigate`, data);
    return response.data.data;
  },

  // Close risk
  closeRisk: async (riskId: number): Promise<Risk> => {
    const response = await api.put(`/risks/${riskId}/close`);
    return response.data.data;
  }
};

export default riskService;
