/**
 * Audit Type Definitions
 */

import { AuditType, AuditStatus } from './common.types';

export interface Audit {
  id: number;
  facility_id: number;
  audit_type: AuditType;
  scheduled_date: string;
  auditor_id: number;
  audit_status: AuditStatus;
  scope: string;
  findings_summary?: string;
  recommendations?: string;
  report_url?: string;
  completed_date?: string;
  next_audit_date?: string;
  major_findings?: number;
  minor_findings?: number;
  observations?: number;
  created_at?: string;
  updated_at?: string;
  // Populated fields
  facility?: {
    id: number;
    facility_name: string;
  };
  auditor?: {
    id: number;
    username: string;
  };
}

export interface AuditFormData {
  facility_id: number;
  audit_type: AuditType;
  scheduled_date: string;
  auditor_id: number;
  audit_status: AuditStatus;
  scope: string;
  findings_summary?: string;
  recommendations?: string;
}

export interface AuditFilters {
  facility_id?: number;
  audit_type?: AuditType;
  audit_status?: AuditStatus;
  auditor_id?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface AuditReport {
  audit: Audit;
  findings: Array<{
    finding_type: 'Major' | 'Minor' | 'Observation';
    description: string;
    clause_reference?: string;
    evidence?: string;
  }>;
  corrective_actions: Array<{
    description: string;
    responsible: string;
    due_date: string;
    status: string;
  }>;
}

export interface UpcomingAudit {
  id: number;
  facility_id: number;
  facility_name: string;
  audit_type: AuditType;
  scheduled_date: string;
  days_until_audit: number;
  auditor_id: number;
  auditor_name: string;
}

export interface AuditStatistics {
  total_audits: number;
  completed_audits: number;
  scheduled_audits: number;
  in_progress_audits: number;
  cancelled_audits: number;
  audits_by_type: Array<{
    audit_type: AuditType;
    count: number;
  }>;
  audits_by_facility: Array<{
    facility_id: number;
    facility_name: string;
    total_audits: number;
    last_audit_date: string;
  }>;
  upcoming_audits: UpcomingAudit[];
}

