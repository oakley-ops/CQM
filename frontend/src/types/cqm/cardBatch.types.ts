/**
 * Card Batch Type Definitions
 */

import { QCStatus } from './common.types';

export interface CardBatch {
  id: number;
  facility_id: number;
  batch_number: string;
  product_code: string;
  card_type: string;
  quantity_produced: number;
  quantity_accepted?: number;
  quantity_rejected?: number;
  production_date: string;
  qc_status: QCStatus;
  qc_by?: number;
  qc_date?: string;
  expiry_date?: string;
  storage_location?: string;
  notes?: string;
  traceability_data?: Record<string, unknown>;
  quarantine_reason?: string;
  quarantine_date?: string;
  release_date?: string;
  created_at?: string;
  updated_at?: string;
  // Populated fields
  facility?: {
    id: number;
    facility_name: string;
  };
  qc_by_user?: {
    id: number;
    username: string;
  };
}

export interface CardBatchFormData {
  facility_id: number;
  batch_number: string;
  product_code: string;
  card_type: string;
  quantity_produced: number;
  production_date: string;
  qc_status: QCStatus;
  expiry_date?: string;
  storage_location?: string;
  notes?: string;
}

export interface CardBatchFilters {
  facility_id?: number;
  product_code?: string;
  card_type?: string;
  qc_status?: QCStatus;
  production_date_start?: string;
  production_date_end?: string;
  page?: number;
  limit?: number;
}

export interface BatchYieldUpdate {
  quantity_accepted: number;
  quantity_rejected: number;
}

export interface BatchQCUpdate {
  qc_status: QCStatus;
  qc_by: number;
  qc_date: string;
  notes?: string;
}

export interface BatchQuarantine {
  quarantine_reason: string;
  quarantine_date: string;
}

export interface BatchRelease {
  release_date: string;
  release_notes?: string;
}

export interface BatchTraceability {
  batch_id: number;
  batch_number: string;
  product_code: string;
  production_date: string;
  facility: {
    facility_name: string;
    location: string;
  };
  raw_materials: Array<{
    material_name: string;
    supplier: string;
    lot_number: string;
    receipt_date: string;
  }>;
  production_steps: Array<{
    step_name: string;
    operator: string;
    start_time: string;
    end_time: string;
    equipment_used: string;
  }>;
  quality_checks: Array<{
    check_name: string;
    result: string;
    performed_by: string;
    performed_at: string;
  }>;
  test_results: Array<{
    test_name: string;
    result_status: string;
    test_date: string;
  }>;
}

export interface CardBatchStatistics {
  total_batches: number;
  pending_qc: number;
  approved_batches: number;
  rejected_batches: number;
  quarantined_batches: number;
  total_cards_produced: number;
  total_cards_accepted: number;
  total_cards_rejected: number;
  overall_yield_rate: number;
  batches_by_product: Array<{
    product_code: string;
    count: number;
    total_quantity: number;
  }>;
  batches_by_facility: Array<{
    facility_id: number;
    facility_name: string;
    total_batches: number;
    yield_rate: number;
  }>;
  production_trend: Array<{
    month: string;
    batches: number;
    quantity_produced: number;
    yield_rate: number;
  }>;
}

