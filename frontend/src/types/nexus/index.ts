// ── Conformity & Grade enums ─────────────────────────────────────────────────

export type Conformity = 'NC+' | 'nc-' | 'RI' | 'Full' | 'NCC' | 'tbd' | 'n/a';
export type AuditGrade = 'A' | 'B' | 'C' | 'D';
export type AuditStatus = 'draft' | 'in-progress' | 'submitted' | 'completed' | 'archived';
export type CertOutcome = 'Certified' | 'Conditional' | 'Not Certified' | 'tbd';
export type ProductCategory = 'ic' | 'icm' | 'il' | 'cb' | 'icc' | 'p' | 'iacicm' | 'bsm' | 'iacil' | 'iac';
export type CapaStatus =
  | 'Not yet started'
  | 'In progress'
  | 'Under Review'
  | 'Complete'
  | 'Cancelled'
  | 'Finding Rejected'
  | 'Awaiting Auditor';
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

// ── Core domain models ───────────────────────────────────────────────────────

export interface NexusAuditRecord {
  id: number;
  site_name: string;
  company: string;
  address?: string;
  country?: string;
  site_code?: string;
  audit_date_start?: string;
  audit_date_end?: string;
  auditor_name?: string;
  auditor_company?: string;
  iso_9001_certified: boolean;
  grade?: AuditGrade;
  status: AuditStatus;
  next_audit_date?: string;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface NexusQmsAssessment {
  id: number;
  audit_record_id: number;
  requirement_id: string;
  section?: string;
  title: string;
  description?: string;
  vendor_compliance?: string;
  conformity: Conformity;
  auditor_comment?: string;
  created_at: string;
  updated_at: string;
}

export interface NexusProductScope {
  id: number;
  audit_record_id: number;
  product_category: ProductCategory;
  product_label?: string;
  in_scope: boolean;
  audited: boolean;
  rank?: AuditGrade;
  cert_outcome: CertOutcome;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface NexusProcessStepAssessment {
  id: number;
  product_scope_id: number;
  process_tag: string;
  process_name: string;
  conformity: Conformity;
  vendor_site?: string;
  equipment?: string;
  auditor_comment?: string;
  created_at: string;
  updated_at: string;
}

export interface NexusCapaItem {
  id: number;
  audit_record_id: number;
  action_id: string;
  requirement_id?: string;
  source_type?: 'qms' | 'process-step' | 'manual';
  source_entity_id?: number;
  severity?: 'NC+' | 'nc-' | 'RI';
  observation?: string;
  root_cause?: string;
  corrective_action?: string;
  responsible_person?: string;
  deadline?: string;
  status: CapaStatus;
  evidence_ref?: string;
  auditor_review_status?: 'Pending' | 'Accepted' | 'Rejected';
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface NexusAlert {
  id: number;
  audit_record_id?: number;
  alert_type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  action_required?: string;
  requirement_id?: string;
  entity_type?: string;
  entity_id?: number;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  updated_at: string;
}

export type CertStatus = 'CQM Certified' | 'CQM Recognised' | 'Pending' | 'Not Certified' | 'N/A';

export interface NexusAuditComponent {
  id: number;
  audit_record_id: number;
  component_type: string;
  article_number?: string;
  used_for_product?: string;
  supplier_name?: string;
  supplier_city?: string;
  supplier_country_code?: string;
  cert_status?: CertStatus;
  cert_label?: string;
  comment?: string;
  created_at: string;
  updated_at: string;
}

export interface AiReadinessResult {
  score: number;
  rating: 'High' | 'Medium' | 'Low' | 'Critical Risk';
  actions: string[];
}

export interface SpcFinding {
  test: string;
  status: 'ok' | 'warning' | 'critical';
  message: string;
}

export interface AiSpcResult {
  cardType: string;
  spcSummary: Array<{ test: string; unit?: string; n: number; mean?: number | null; cpk?: number | null; cp?: number | null; violations: number }>;
  analysis: { summary: string; findings: SpcFinding[] };
}

export interface NexusDocumentRef {
  id: number;
  audit_record_id: number;
  requirement_id?: string;
  doc_id?: string;
  title: string;
  doc_type?: string;
  version?: string;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export type PlanStatus = 'draft' | 'in-progress' | 'submitted' | 'approved' | 'rejected';
export type PlanType = 'product' | 'process';
export type ItemStatus = 'pending' | 'in-progress' | 'complete' | 'not-applicable';
export type ReviewOutcome = 'approved' | 'conditional' | 'rejected' | 'pending';

export interface NexusQualificationPlan {
  id: number;
  audit_record_id?: number;
  product_scope_id?: number;
  job_id?: number;
  plan_type: PlanType;
  version: string;
  owner?: string;
  status: PlanStatus;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface NexusQualificationItem {
  id: number;
  plan_id: number;
  requirement_id?: string;
  section?: string;
  title: string;
  status: ItemStatus;
  evidence_type?: string;
  evidence_ref?: string;
  responsible?: string;
  target_date?: string;
  completed_date?: string;
  notes?: string;
}

export interface NexusDesignReview {
  id: number;
  plan_id: number;
  review_type: 'intermediate' | 'final';
  reviewer?: string;
  review_date?: string;
  outcome: ReviewOutcome;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface GateCondition {
  label: string;
  passed: boolean;
  detail?: string | null;
}

export interface GateResult {
  passed: boolean;
  conditions: GateCondition[];
}

export interface NexusPlanDetail extends NexusQualificationPlan {
  items: NexusQualificationItem[];
  reviews: NexusDesignReview[];
  gate: GateResult;
}

// ── Request / summary types ──────────────────────────────────────────────────

export interface CreateAuditRequest {
  site_name: string;
  company: string;
  iso_9001_certified: boolean;
  address?: string;
  country?: string;
  site_code?: string;
  audit_date_start?: string;
  audit_date_end?: string;
  auditor_name?: string;
  auditor_company?: string;
  notes?: string;
}

export interface QmsSummary {
  total: number;
  score: number | null;
  counts: Record<Conformity, number>;
}

export interface CapaSummary {
  total: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  overdue: number;
}

export interface ConformityMonitorRow {
  card_type: string;
  total_sessions: number;
  sessions_last_30d: number;
  last_session_date: string | null;
  days_since_last: number | null;
  pass_rate_90d: number | null;
  total_entries_90d: number;
  monitoring_risk: boolean;
  threshold_risk: boolean;
}

export interface ConformitySessionRow {
  id: number;
  session_number: string;
  card_type: string;
  test_date: string;
  batch_lot_number: string;
  session_type: string;
  status: string;
  total_entries: number;
  passing_entries: number;
  pass_rate: number | null;
}

export interface NexusDashboardStats {
  totalAudits: number;
  openCapas: number;
  overdueCapas: number;
  unreadAlerts: number;
}

export interface AlertSummaryCount {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}
