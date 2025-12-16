import api from '../api';

export interface QualityMetric {
  id: number;
  project_id: number;
  metric_name: string;
  metric_type?: string;
  target_value?: number;
  actual_value?: number;
  unit?: string;
  measurement_date?: string;
  status: 'on-target' | 'at-risk' | 'off-target' | 'pending';
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface QualityMetricSummary {
  total_metrics: number;
  on_target_count: number;
  at_risk_count: number;
  off_target_count: number;
  pending_count: number;
}

export interface CreateQualityMetricDto {
  metric_name: string;
  metric_type?: string;
  target_value?: number;
  actual_value?: number;
  unit?: string;
  measurement_date?: string;
  status?: string;
  notes?: string;
}

export interface UpdateQualityMetricDto extends Partial<CreateQualityMetricDto> {}

const qualityMetricService = {
  // Get all metrics for a project
  getMetrics: async (projectId: number): Promise<QualityMetric[]> => {
    const response = await api.get(`/projects/${projectId}/quality-metrics`);
    return response.data.data;
  },

  // Get single metric
  getMetric: async (metricId: number): Promise<QualityMetric> => {
    const response = await api.get(`/quality-metrics/${metricId}`);
    return response.data.data;
  },

  // Get metrics summary
  getSummary: async (projectId: number): Promise<QualityMetricSummary> => {
    const response = await api.get(`/projects/${projectId}/quality-metrics/summary`);
    return response.data.data;
  },

  // Get metrics trends
  getTrends: async (projectId: number, metricName?: string, days?: number): Promise<QualityMetric[]> => {
    const params = new URLSearchParams();
    if (metricName) params.append('metric_name', metricName);
    if (days) params.append('days', days.toString());
    
    const response = await api.get(`/projects/${projectId}/quality-metrics/trends?${params.toString()}`);
    return response.data.data;
  },

  // Create metric
  createMetric: async (projectId: number, data: CreateQualityMetricDto): Promise<QualityMetric> => {
    const response = await api.post(`/projects/${projectId}/quality-metrics`, data);
    return response.data.data;
  },

  // Update metric
  updateMetric: async (metricId: number, data: UpdateQualityMetricDto): Promise<QualityMetric> => {
    const response = await api.put(`/quality-metrics/${metricId}`, data);
    return response.data.data;
  },

  // Delete metric
  deleteMetric: async (metricId: number): Promise<void> => {
    await api.delete(`/quality-metrics/${metricId}`);
  }
};

export default qualityMetricService;
