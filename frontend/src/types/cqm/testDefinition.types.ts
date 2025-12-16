/**
 * Test Definition Type Definitions
 */

import { MeasurementType, RiskLevel, TestDefinitionStatus } from './common.types';

export interface TestDefinition {
  id: number;
  category_id: number;
  test_id: string;
  test_name: string;
  iso_standard: string;
  description?: string;
  procedure: string;
  pass_criteria: string;
  expected_result?: string;
  measurement_type: MeasurementType;
  unit_of_measurement?: string;
  tolerance?: string;
  is_mandatory: boolean;
  is_cqm_required: boolean;
  is_destructive: boolean;
  risk_level: RiskLevel;
  frequency?: string;
  equipment_required?: string[];
  skills_required?: string[];
  estimated_duration?: number;
  version: string;
  status: TestDefinitionStatus;
  effective_date?: string;
  superseded_by?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  approved_by?: number;
  approval_date?: string;
}

export interface TestCategory {
  id: number;
  category_code: string;
  name: string;
  description?: string;
  iso_standard?: string;
  display_order: number;
  is_active: boolean;
  is_mandatory: boolean;
  test_count?: number;
}

export interface TestDefinitionFormData {
  category_id: number;
  test_id: string;
  test_name: string;
  iso_standard: string;
  description?: string;
  procedure: string;
  pass_criteria: string;
  expected_result?: string;
  measurement_type: MeasurementType;
  unit_of_measurement?: string;
  tolerance?: string;
  is_mandatory: boolean;
  is_cqm_required: boolean;
  is_destructive: boolean;
  risk_level: RiskLevel;
  frequency?: string;
  equipment_required?: string[];
  version: string;
}

export interface TestDefinitionFilters {
  search?: string;
  category_id?: number;
  iso_standard?: string;
  status?: TestDefinitionStatus;
  is_mandatory?: boolean;
  is_cqm_required?: boolean;
  risk_level?: RiskLevel;
  page?: number;
  limit?: number;
}

export interface TestDefinitionStatistics {
  total_tests: number;
  active_tests: number;
  mandatory_tests: number;
  cqm_required_tests: number;
  tests_by_category: Array<{
    category_id: number;
    category_name: string;
    count: number;
  }>;
  tests_by_iso_standard: Array<{
    iso_standard: string;
    count: number;
  }>;
  tests_by_risk_level: Array<{
    risk_level: string;
    count: number;
  }>;
}

