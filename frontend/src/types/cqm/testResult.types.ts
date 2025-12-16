/**
 * Test Result Type Definitions
 */

import { ResultStatus } from './common.types';

export interface TestResult {
  id: number;
  facility_id: number;
  test_definition_id: number;
  batch_id: number;
  tester_id: number;
  test_date: string;
  actual_value?: string;
  result_status: ResultStatus;
  notes?: string;
  evidence_url?: string;
  verified_by?: number;
  verification_date?: string;
  created_at?: string;
  updated_at?: string;
  // Populated fields
  test_definition?: {
    id: number;
    test_name: string;
    test_id: string;
    iso_standard: string;
  };
  batch?: {
    id: number;
    batch_number: string;
    product_code: string;
  };
  tester?: {
    id: number;
    username: string;
  };
}

export interface TestResultFormData {
  facility_id: number;
  test_definition_id: number;
  batch_id: number;
  tester_id: number;
  test_date?: string;
  actual_value?: string;
  result_status: ResultStatus;
  notes?: string;
  evidence_url?: string;
}

export interface TestResultFilters {
  facility_id?: number;
  test_definition_id?: number;
  batch_id?: number;
  tester_id?: number;
  result_status?: ResultStatus;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface TestTrendData {
  date: string;
  total_tests: number;
  passed: number;
  failed: number;
  pass_rate: number;
}

export interface BatchTestSummary {
  batch_id: number;
  batch_number: string;
  total_tests: number;
  completed_tests: number;
  passed_tests: number;
  failed_tests: number;
  pending_tests: number;
  pass_rate: number;
  completion_rate: number;
}

export interface TestResultStatistics {
  total_results: number;
  passed: number;
  failed: number;
  pending: number;
  rework: number;
  pass_rate: number;
  results_by_test: Array<{
    test_id: number;
    test_name: string;
    total: number;
    passed: number;
    pass_rate: number;
  }>;
  results_by_date: TestTrendData[];
}

