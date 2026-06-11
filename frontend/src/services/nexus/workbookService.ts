import api from '../api';
import type { Conformity, NexusProcessStepAssessment, NexusProductScope, NexusQmsAssessment } from '../../types/nexus';
import type { ReadinessData, WorkbookData } from '../../types/nexus/workbook';

export const getWorkbook = async (auditId: number): Promise<WorkbookData> => {
  const res = await api.get(`/nexus/audits/${auditId}/workbook`);
  return res.data;
};

export const getReadiness = async (auditId: number): Promise<ReadinessData> => {
  const res = await api.get(`/nexus/audits/${auditId}/readiness`);
  return res.data;
};

export const patchQmsRow = async (
  auditId: number, requirementId: string,
  data: Partial<Pick<NexusQmsAssessment, 'conformity' | 'vendor_compliance' | 'vendor_evidence_ref' | 'auditor_comment'>>,
): Promise<NexusQmsAssessment> => {
  const res = await api.patch(`/nexus/audits/${auditId}/qms/${encodeURIComponent(requirementId)}`, data);
  return res.data;
};

export const patchStep = async (
  auditId: number, scopeId: number, stepId: number,
  data: Partial<NexusProcessStepAssessment> & { conformity?: Conformity },
): Promise<NexusProcessStepAssessment> => {
  const res = await api.patch(`/nexus/audits/${auditId}/scope/${scopeId}/steps/${stepId}`, data);
  return res.data;
};

export const createScopeRow = async (
  auditId: number,
  data: { product_category: string; product_variant: string; in_scope: boolean; seed_steps?: boolean },
): Promise<NexusProductScope> => {
  const res = await api.post(`/nexus/audits/${auditId}/scope`, data);
  return res.data;
};

export const patchScopeRow = async (
  auditId: number, scopeId: number, data: Partial<NexusProductScope>,
): Promise<NexusProductScope> => {
  const res = await api.patch(`/nexus/audits/${auditId}/scope/${scopeId}`, data);
  return res.data;
};

const download = async (url: string, fallbackName: string) => {
  const res = await api.get(url, { responseType: 'blob' });
  const dispo: string = res.headers['content-disposition'] ?? '';
  const name = /filename="?([^";]+)"?/.exec(dispo)?.[1] ?? fallbackName;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([res.data]));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const downloadCqmapXlsx = (auditId: number) =>
  download(`/nexus/audits/${auditId}/export/cqmap`, `CQMAP-${auditId}.xlsx`);

export const downloadReadinessPdf = (auditId: number) =>
  download(`/nexus/audits/${auditId}/export/readiness`, `CQM-Readiness-${auditId}.pdf`);
