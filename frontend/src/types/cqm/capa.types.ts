/**
 * CAPA (Corrective and Preventive Action) Type Definitions
 */

import { CAPAStatus } from './common.types';

export interface CapaAction {
  id: number;
  facility_id: number;
  problem_statement: string;
  root_cause: string;
  corrective_action_plan: string;
  preventive_action_plan?: string;
  assigned_to: number;
  due_date: string;
  status: CAPAStatus;
  progress_percentage?: number;
  completion_date?: string;
  effectiveness_verification_date?: string;
  is_effective?: boolean;
  verification_notes?: string;
  verified_by?: number;
  evidence_url?: string;
  created_by: number;
  created_at?: string;
  updated_at?: string;
  // Populated fields
  facility?: {
    id: number;
    facility_name: string;
  };
  assigned_to_user?: {
    id: number;
    username: string;
  };
  created_by_user?: {
    id: number;
    username: string;
  };
}

export interface CapaFormData {
  facility_id: number;
  problem_statement: string;
  root_cause: string;
  corrective_action_plan: string;
  preventive_action_plan?: string;
  assigned_to: number;
  due_date: string;
  status: CAPAStatus;
}

export interface CapaFilters {
  facility_id?: number;
  status?: CAPAStatus;
  assigned_to?: number;
  created_by?: number;
  start_date?: string;
  end_date?: string;
  is_overdue?: boolean;
  page?: number;
  limit?: number;
}

export interface CapaProgressUpdate {
  progress_percentage: number;
  status?: CAPAStatus;
  notes?: string;
}

export interface CapaEffectivenessVerification {
  verified_by: number;
  verification_date: string;
  is_effective: boolean;
  verification_notes?: string;
}

export interface CapaStatistics {
  total_capas: number;
  open_capas: number;
  in_progress_capas: number;
  pending_verification_capas: number;
  closed_capas: number;
  overdue_capas: number;
  effectiveness_rate: number;
  capas_by_facility: Array<{
    facility_id: number;
    facility_name: string;
    total_capas: number;
    open_capas: number;
  }>;
  capas_by_status: Array<{
    status: CAPAStatus;
    count: number;
  }>;
  capas_trend: Array<{
    month: string;
    opened: number;
    closed: number;
    overdue: number;
  }>;
}

export interface CapaHistory {
  id: number;
  capa_id: number;
  action: string;
  performed_by: number;
  performed_at: string;
  old_value?: string;
  new_value?: string;
  notes?: string;
}

