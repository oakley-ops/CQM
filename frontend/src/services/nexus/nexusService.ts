import api from '../api';
import type {
  NexusAuditRecord,
  NexusQmsAssessment,
  NexusProductScope,
  NexusProcessStepAssessment,
  NexusCapaItem,
  NexusAlert,
  CreateAuditRequest,
  QmsSummary,
  CapaSummary,
  AlertSummaryCount,
  Conformity,
  ProductCategory,
  CertOutcome,
} from '../../types/nexus';

// ── Audit Records ─────────────────────────────────────────────────────────────

export const listAudits = async (): Promise<NexusAuditRecord[]> => {
  const res = await api.get('/nexus/audits');
  return res.data;
};

export const getAudit = async (id: number): Promise<NexusAuditRecord> => {
  const res = await api.get(`/nexus/audits/${id}`);
  return res.data;
};

export const createAudit = async (data: CreateAuditRequest): Promise<NexusAuditRecord> => {
  const res = await api.post('/nexus/audits', data);
  return res.data;
};

export const updateAudit = async (id: number, data: Partial<NexusAuditRecord>): Promise<NexusAuditRecord> => {
  const res = await api.patch(`/nexus/audits/${id}`, data);
  return res.data;
};

export const deleteAudit = async (id: number): Promise<void> => {
  await api.delete(`/nexus/audits/${id}`);
};

// ── QMS Assessment ────────────────────────────────────────────────────────────

export const listQms = async (auditId: number): Promise<NexusQmsAssessment[]> => {
  const res = await api.get(`/nexus/audits/${auditId}/qms`);
  return res.data;
};

export const getQmsSummary = async (auditId: number): Promise<QmsSummary> => {
  const res = await api.get(`/nexus/audits/${auditId}/qms/summary`);
  return res.data;
};

export const updateQms = async (
  auditId: number,
  requirementId: string,
  data: { conformity?: Conformity; vendor_compliance?: string; auditor_comment?: string }
): Promise<NexusQmsAssessment> => {
  const res = await api.patch(`/nexus/audits/${auditId}/qms/${requirementId}`, data);
  return res.data;
};

// ── Product Scope ─────────────────────────────────────────────────────────────

export const listScopes = async (auditId: number): Promise<NexusProductScope[]> => {
  const res = await api.get(`/nexus/audits/${auditId}/scope`);
  return res.data;
};

export const createScope = async (
  auditId: number,
  data: { product_category: ProductCategory; product_label?: string; in_scope?: boolean }
): Promise<NexusProductScope & { steps_seeded: number }> => {
  const res = await api.post(`/nexus/audits/${auditId}/scope`, data);
  return res.data;
};

export const updateScope = async (
  auditId: number,
  scopeId: number,
  data: { in_scope?: boolean; audited?: boolean; rank?: string; cert_outcome?: CertOutcome; notes?: string }
): Promise<NexusProductScope> => {
  const res = await api.patch(`/nexus/audits/${auditId}/scope/${scopeId}`, data);
  return res.data;
};

export const listSteps = async (auditId: number, scopeId: number): Promise<NexusProcessStepAssessment[]> => {
  const res = await api.get(`/nexus/audits/${auditId}/scope/${scopeId}/steps`);
  return res.data;
};

export const updateStep = async (
  auditId: number,
  scopeId: number,
  stepId: number,
  data: { conformity?: Conformity; vendor_site?: string; equipment?: string; auditor_comment?: string }
): Promise<NexusProcessStepAssessment> => {
  const res = await api.patch(`/nexus/audits/${auditId}/scope/${scopeId}/steps/${stepId}`, data);
  return res.data;
};

// ── CAPA ──────────────────────────────────────────────────────────────────────

export const listCapa = async (auditId: number): Promise<NexusCapaItem[]> => {
  const res = await api.get(`/nexus/audits/${auditId}/capa`);
  return res.data;
};

export const createCapa = async (auditId: number, data: Partial<NexusCapaItem>): Promise<NexusCapaItem> => {
  const res = await api.post(`/nexus/audits/${auditId}/capa`, data);
  return res.data;
};

export const updateCapa = async (auditId: number, capaId: number, data: Partial<NexusCapaItem>): Promise<NexusCapaItem> => {
  const res = await api.patch(`/nexus/audits/${auditId}/capa/${capaId}`, data);
  return res.data;
};

export const getCapaSummary = async (auditId: number): Promise<CapaSummary> => {
  const res = await api.get(`/nexus/audits/${auditId}/capa/summary`);
  return res.data;
};

// ── Alerts ────────────────────────────────────────────────────────────────────

export const listAlerts = async (auditId?: number): Promise<NexusAlert[]> => {
  const params = auditId ? { audit_record_id: auditId } : {};
  const res = await api.get('/nexus/alerts', { params });
  return res.data;
};

export const getAlertSummary = async (): Promise<AlertSummaryCount> => {
  const res = await api.get('/nexus/alerts/summary');
  return res.data;
};

export const markAlertRead = async (id: number): Promise<NexusAlert> => {
  const res = await api.patch(`/nexus/alerts/${id}/read`);
  return res.data;
};

export const dismissAlert = async (id: number): Promise<NexusAlert> => {
  const res = await api.patch(`/nexus/alerts/${id}/dismiss`);
  return res.data;
};

export const runWatchdog = async (auditId?: number): Promise<{ message: string }> => {
  const res = await api.post('/nexus/watchdog/run', auditId ? { audit_record_id: auditId } : {});
  return res.data;
};
