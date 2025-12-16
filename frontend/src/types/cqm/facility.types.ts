/**
 * Manufacturing Facility Type Definitions
 */

import { CertificationStatus } from './common.types';

export interface ManufacturingFacility {
  id: number;
  facility_name: string;
  location: string;
  country_code: string;
  technology_type: string;
  contact_person_id: number;
  certification_status: CertificationStatus;
  cqm_label?: string;
  accreditation_number?: string;
  last_audit_date?: string;
  next_audit_date?: string;
  certificate_number?: string;
  certificate_issue_date?: string;
  certificate_expiry_date?: string;
  certification_body?: string;
  scope_of_certification?: string;
  annual_production_capacity?: number;
  quality_management_system?: string;
  iso_certifications?: string[];
  key_technologies?: string[];
  production_capabilities?: string[];
  equipment_list?: string[];
  quality_control_equipment?: string[];
  testing_capabilities?: string[];
  card_types_produced?: string[];
  chip_types_supported?: string[];
  personalization_capabilities?: string[];
  environmental_certifications?: string[];
  security_accreditations?: string[];
  compliance_documents_url?: string;
  facility_photos_url?: string;
  audit_reports_url?: string;
  notes?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface FacilityFormData {
  facility_name: string;
  location: string;
  country_code: string;
  technology_type: string;
  contact_person_id: number;
  certification_status: CertificationStatus;
  accreditation_number?: string;
  certificate_number?: string;
  certificate_issue_date?: string;
  certificate_expiry_date?: string;
  certification_body?: string;
  scope_of_certification?: string;
  annual_production_capacity?: number;
  quality_management_system?: string;
  iso_certifications?: string[];
  key_technologies?: string[];
  production_capabilities?: string[];
  notes?: string;
}

export interface FacilityFilters {
  search?: string;
  country?: string;
  technology?: string;
  certification_status?: CertificationStatus;
  page?: number;
  limit?: number;
}

export interface CQMLabel {
  full_label: string;
  accreditation: string;
  country_code: string;
  location: string;
  technology: string;
  status: string;
}

export interface FacilityDashboard {
  facility: ManufacturingFacility;
  statistics: {
    total_audits: number;
    completed_audits: number;
    pending_audits: number;
    total_non_conformities: number;
    open_non_conformities: number;
    total_capa_actions: number;
    open_capa_actions: number;
    total_test_results: number;
    pass_rate: number;
    total_batches: number;
    approved_batches: number;
  };
  recent_audits: Array<{
    id: number;
    audit_type: string;
    scheduled_date: string;
    audit_status: string;
  }>;
  upcoming_audits: Array<{
    id: number;
    audit_type: string;
    scheduled_date: string;
  }>;
  certificate_status: {
    is_expiring_soon: boolean;
    days_until_expiry: number;
    expiry_date: string;
  };
}

export interface FacilityStatistics {
  total_facilities: number;
  certified_facilities: number;
  pending_certification: number;
  suspended_facilities: number;
  facilities_by_country: Array<{
    country: string;
    count: number;
  }>;
  facilities_by_technology: Array<{
    technology: string;
    count: number;
  }>;
  expiring_certificates: Array<{
    facility_id: number;
    facility_name: string;
    expiry_date: string;
    days_until_expiry: number;
  }>;
}

