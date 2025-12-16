/**
 * Non-Conformity Type Definitions
 */

import { NCType, NCStatus, Severity } from './common.types';

export interface NonConformity {
  id: number;
  facility_id: number;
  nc_type: NCType;
  severity: Severity;
  description: string;
  root_cause?: string;
  corrective_action_plan?: string;
  preventive_action_plan?: string;
  raised_by: number;
  raised_date: string;
  assigned_to?: number;
  due_date?: string;
  closure_date?: string;
  status: NCStatus;
  verification_notes?: string;
  verified_by?: number;
  verification_date?: string;
  created_at?: string;
  updated_at?: string;
  // Populated fields
  facility?: {
    id: number;
    facility_name: string;
  };
  raised_by_user?: {
    id: number;
    username: string;
  };
  assigned_to_user?: {
    id: number;
    username: string;
  };
}

export interface NonConformityFormData {
  facility_id: number;
  nc_type: NCType;
  severity: Severity;
  description: string;
  root_cause?: string;
  corrective_action_plan?: string;
  preventive_action_plan?: string;
  raised_by: number;
  assigned_to?: number;
  due_date?: string;
  status: NCStatus;
}

export interface NonConformityFilters {
  facility_id?: number;
  nc_type?: NCType;
  severity?: Severity;
  status?: NCStatus;
  raised_by?: number;
  assigned_to?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface NonConformityStatistics {
  total_ncs: number;
  open_ncs: number;
  in_progress_ncs: number;
  closed_ncs: number;
  verified_ncs: number;
  overdue_ncs: number;
  ncs_by_type: Array<{
    nc_type: NCType;
    count: number;
  }>;
  ncs_by_severity: Array<{
    severity: Severity;
    count: number;
  }>;
  ncs_by_facility: Array<{
    facility_id: number;
    facility_name: string;
    total_ncs: number;
    open_ncs: number;
  }>;
  ncs_trend: Array<{
    month: string;
    total: number;
    major: number;
    minor: number;
    observation: number;
  }>;
}

