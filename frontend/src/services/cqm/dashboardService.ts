/**
 * Dashboard Service
 * API calls for CQM Dashboard data
 */

import { apiGet } from '../api';
import type { ApiResponse, WidgetData } from '../../types/cqm';

const BASE_URL = '/dashboard';

interface DashboardData {
  complianceMetrics: WidgetData[];
  auditMetrics: WidgetData[];
  ncMetrics: WidgetData[];
  testMetrics: WidgetData[];
  productionMetrics: WidgetData[];
  certificationMetrics: WidgetData[];
}

export const dashboardService = {
  /**
   * Get main CQM dashboard data
   */
  getCQMDashboard: async (): Promise<ApiResponse<DashboardData>> => {
    return apiGet<DashboardData>(BASE_URL);
  },

  /**
   * Get compliance metrics
   */
  getComplianceMetrics: async (): Promise<ApiResponse<WidgetData[]>> => {
    return apiGet<WidgetData[]>(`${BASE_URL}/compliance`);
  },

  /**
   * Get audit metrics
   */
  getAuditMetrics: async (): Promise<ApiResponse<WidgetData[]>> => {
    return apiGet<WidgetData[]>(`${BASE_URL}/audits`);
  },

  /**
   * Get non-conformity metrics
   */
  getNCMetrics: async (): Promise<ApiResponse<WidgetData[]>> => {
    return apiGet<WidgetData[]>(`${BASE_URL}/non-conformities`);
  },

  /**
   * Get test result metrics
   */
  getTestResultMetrics: async (): Promise<ApiResponse<WidgetData[]>> => {
    return apiGet<WidgetData[]>(`${BASE_URL}/test-results`);
  },

  /**
   * Get certification metrics
   */
  getCertificationMetrics: async (): Promise<ApiResponse<WidgetData[]>> => {
    return apiGet<WidgetData[]>(`${BASE_URL}/certifications`);
  },

  /**
   * Get production metrics
   */
  getProductionMetrics: async (): Promise<ApiResponse<WidgetData[]>> => {
    return apiGet<WidgetData[]>(`${BASE_URL}/production`);
  },

  /**
   * Export dashboard
   */
  exportDashboard: async (format: 'pdf' | 'excel' = 'pdf'): Promise<void> => {
    const { apiDownload } = await import('../api');
    return apiDownload(`${BASE_URL}/export?format=${format}`, `dashboard.${format}`);
  },
};

export default dashboardService;



