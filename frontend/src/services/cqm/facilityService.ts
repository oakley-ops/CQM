/**
 * Facility Service
 * API calls for Manufacturing Facilities
 */

import { apiGet, apiGetPaginated, apiPost, apiPut, apiPatch, apiDelete } from '../api';
import type {
  ManufacturingFacility,
  FacilityFormData,
  FacilityFilters,
  CQMLabel,
  FacilityDashboard,
  FacilityStatistics,
  ApiResponse,
  PaginatedResponse,
} from '../../types/cqm';

const BASE_URL = '/facilities';

export const facilityService = {
  /**
   * Get all facilities with optional filters
   */
  getAllFacilities: async (filters?: FacilityFilters): Promise<PaginatedResponse<ManufacturingFacility>> => {
    return apiGetPaginated<ManufacturingFacility>(BASE_URL, filters);
  },

  /**
   * Get facility by ID
   */
  getFacilityById: async (id: number): Promise<ApiResponse<ManufacturingFacility>> => {
    return apiGet<ManufacturingFacility>(`${BASE_URL}/${id}`);
  },

  /**
   * Create new facility
   */
  createFacility: async (data: FacilityFormData): Promise<ApiResponse<ManufacturingFacility>> => {
    return apiPost<ManufacturingFacility>(BASE_URL, data);
  },

  /**
   * Update facility
   */
  updateFacility: async (id: number, data: Partial<FacilityFormData>): Promise<ApiResponse<ManufacturingFacility>> => {
    return apiPut<ManufacturingFacility>(`${BASE_URL}/${id}`, data);
  },

  /**
   * Delete facility
   */
  deleteFacility: async (id: number): Promise<ApiResponse<void>> => {
    return apiDelete<void>(`${BASE_URL}/${id}`);
  },

  /**
   * Get CQM label for facility
   */
  getCQMLabel: async (id: number): Promise<ApiResponse<CQMLabel>> => {
    return apiGet<CQMLabel>(`${BASE_URL}/${id}/cqm-label`);
  },

  /**
   * Update certification status
   */
  updateCertificationStatus: async (
    id: number,
    data: { certification_status: string; certificate_expiry_date?: string }
  ): Promise<ApiResponse<ManufacturingFacility>> => {
    return apiPatch<ManufacturingFacility>(`${BASE_URL}/${id}/certification-status`, data);
  },

  /**
   * Get facility dashboard data
   */
  getFacilityDashboard: async (id: number): Promise<ApiResponse<FacilityDashboard>> => {
    return apiGet<FacilityDashboard>(`${BASE_URL}/${id}/dashboard`);
  },

  /**
   * Get facilities by country
   */
  getFacilitiesByCountry: async (countryCode: string): Promise<ApiResponse<ManufacturingFacility[]>> => {
    return apiGet<ManufacturingFacility[]>(`${BASE_URL}/by-country/${countryCode}`);
  },

  /**
   * Get facilities by technology type
   */
  getFacilitiesByTechnology: async (technologyType: string): Promise<ApiResponse<ManufacturingFacility[]>> => {
    return apiGet<ManufacturingFacility[]>(`${BASE_URL}/by-technology/${technologyType}`);
  },

  /**
   * Get expiring certificates
   */
  getExpiringCertificates: async (days: number = 30): Promise<ApiResponse<ManufacturingFacility[]>> => {
    return apiGet<ManufacturingFacility[]>(`${BASE_URL}/expiring-certificates`, { days });
  },

  /**
   * Get facility statistics
   */
  getFacilityStatistics: async (): Promise<ApiResponse<FacilityStatistics>> => {
    return apiGet<FacilityStatistics>(`${BASE_URL}/statistics`);
  },

  /**
   * Export facilities
   */
  exportFacilities: async (filters?: FacilityFilters, format: 'csv' | 'excel' = 'excel'): Promise<void> => {
    const { apiDownload } = await import('../api');
    const queryParams = new URLSearchParams({
      ...filters as any,
      format,
    }).toString();
    return apiDownload(`${BASE_URL}/export?${queryParams}`, `facilities.${format}`);
  },
};

export default facilityService;

