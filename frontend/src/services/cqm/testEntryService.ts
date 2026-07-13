import api from '../api';
import {
  TestCategory,
  TestDefinition,
  TestSession,
  TestEntry,
  SampleCard,
  CreateSessionRequest,
  CreateEntryRequest,
  BulkSaveEntriesRequest,
  BulkSaveEntriesResponse,
  SessionsListParams,
  SessionsListResponse,
  TestEntryMetrics,
  TestEntryMetadata,
  UpsertEntryMetadataRequest,
  KPIResult,
  KPIHistoryPoint,
  QualificationStatus,
  RejectionBreakdown,
  ActionItemsResponse,
} from '../../types/cqm';

// ==================== Test Categories ====================

export const getCategories = async (cardType?: string, activeOnly?: boolean): Promise<TestCategory[]> => {
  const params: Record<string, string> = {};
  if (cardType) params.cardType = cardType;
  if (activeOnly !== undefined) params.activeOnly = String(activeOnly);

  const response = await api.get('/test-categories', { params });
  return response.data.data;
};

export const getCategory = async (id: number): Promise<TestCategory> => {
  const response = await api.get(`/test-categories/${id}`);
  return response.data.data;
};

export const getCategoriesByCardType = async (cardType: string): Promise<TestCategory[]> => {
  const response = await api.get(`/test-categories/by-card-type/${cardType}`);
  return response.data.data;
};

export const getDefinitionsByCategory = async (categoryId: number): Promise<TestDefinition[]> => {
  const response = await api.get(`/test-categories/${categoryId}/definitions`);
  return response.data.data;
};

export const getAllDefinitions = async (): Promise<TestDefinition[]> => {
  const response = await api.get('/test-categories/definitions/all');
  return response.data.data;
};

export const searchDefinitions = async (q: string): Promise<TestDefinition[]> => {
  const response = await api.get('/test-categories/definitions/search', { params: { q } });
  return response.data.data;
};

export const getAllDefinitionsIncludingHidden = async (): Promise<TestDefinition[]> => {
  const response = await api.get('/test-categories/definitions/all-including-hidden');
  return response.data.data;
};

export const toggleDefinitionVisibility = async (id: number): Promise<{ id: number; status: string }> => {
  const response = await api.patch(`/test-categories/definitions/${id}/visibility`);
  return response.data.data;
};

export const updateDefinitionMachineTags = async (id: number, machineTags: string[]): Promise<{ id: number; machine_tags: string[] }> => {
  const response = await api.patch(`/test-categories/definitions/${id}/machine-tags`, { machine_tags: machineTags });
  return response.data.data;
};

// ==================== Test Sessions ====================

export const getQualificationStatus = async (catNumber: string): Promise<QualificationStatus> => {
  const response = await api.get('/test-sessions/qualification-status', { params: { catNumber } });
  return response.data.data;
};

export const getSessions = async (params?: SessionsListParams): Promise<SessionsListResponse> => {
  const response = await api.get('/test-sessions', { params });
  return response.data;
};

export const getSession = async (id: number): Promise<TestSession> => {
  const response = await api.get(`/test-sessions/${id}`);
  return response.data.data;
};

export const createSession = async (data: CreateSessionRequest): Promise<TestSession> => {
  const response = await api.post('/test-sessions', data);
  return response.data.data;
};

export const updateSession = async (id: number, data: Partial<CreateSessionRequest>): Promise<TestSession> => {
  const response = await api.put(`/test-sessions/${id}`, data);
  return response.data.data;
};

export const deleteSession = async (id: number): Promise<void> => {
  await api.delete(`/test-sessions/${id}`);
};

export const submitSession = async (id: number): Promise<TestSession> => {
  const response = await api.put(`/test-sessions/${id}/submit`);
  return response.data.data;
};

export const approveSession = async (id: number): Promise<TestSession> => {
  const response = await api.put(`/test-sessions/${id}/approve`);
  return response.data.data;
};

export const rejectSession = async (id: number, reason: string): Promise<TestSession> => {
  const response = await api.put(`/test-sessions/${id}/reject`, { reason });
  return response.data.data;
};

export const reopenSession = async (id: number): Promise<TestSession> => {
  const response = await api.put(`/test-sessions/${id}/reopen`);
  return response.data.data;
};

// ==================== Test Entries ====================

export const createOrUpdateEntry = async (data: CreateEntryRequest): Promise<TestEntry> => {
  const response = await api.post('/test-entries', data);
  return response.data.data;
};

export const bulkSaveEntries = async (data: BulkSaveEntriesRequest): Promise<BulkSaveEntriesResponse> => {
  const response = await api.post('/test-entries/bulk', data);
  return response.data.data;
};

export const getEntriesBySession = async (sessionId: number): Promise<TestEntry[]> => {
  const response = await api.get(`/test-entries/session/${sessionId}`);
  return response.data.data;
};

export const deleteEntry = async (id: number): Promise<void> => {
  await api.delete(`/test-entries/${id}`);
};

// ==================== Sample Cards ====================

export const createSampleCards = async (
  sessionId: number,
  count: number,
  categoryId?: number,
  opts?: { extend?: boolean },
): Promise<SampleCard[]> => {
  // extend: append missing card numbers only (non-destructive; returns all cards
  // in scope). Default recreates the batch and deletes entries referencing it.
  const response = await api.post('/sample-cards/bulk', { sessionId, count, categoryId, extend: opts?.extend });
  return response.data.data;
};

export const getSampleCardsBySession = async (sessionId: number, categoryId?: number): Promise<SampleCard[]> => {
  const params = categoryId ? { categoryId } : undefined;
  const response = await api.get(`/sample-cards/session/${sessionId}`, { params });
  return response.data.data;
};

// ==================== Specialized Form Metadata ====================

export const upsertEntryMetadata = async (data: UpsertEntryMetadataRequest): Promise<void> => {
  await api.post('/test-entries/metadata', data);
};

export const storePdfPages = async (sessionId: number, testDefinitionId: number, pages: string[]): Promise<void> => {
  await api.post('/test-entries/metadata/pdf-pages', { sessionId, testDefinitionId, pages });
};

export const getEntryMetadata = async (sessionId: number, testDefinitionId: number): Promise<TestEntryMetadata | null> => {
  const response = await api.get(`/test-entries/metadata/${sessionId}/${testDefinitionId}`);
  return response.data.data;
};

export interface LastEntryMetadataResult {
  metadata: TestEntryMetadata;
  sessionDate: string | null;
  sessionNumber: string | null;
}

export const getLastEntryMetadata = async (testCode: string): Promise<LastEntryMetadataResult | null> => {
  const response = await api.get('/test-entries/metadata/last', { params: { testCode } });
  return response.data.data;
};

// ==================== Dashboard Metrics ====================

export const getTestEntryMetrics = async (trendDays?: number): Promise<TestEntryMetrics> => {
  const params = trendDays ? { trendDays } : undefined;
  const response = await api.get('/dashboard/test-entries', { params });
  return response.data.data;
};

export const getKPIs = async (days?: number): Promise<KPIResult[]> => {
  const params = days ? { days } : undefined;
  const response = await api.get('/dashboard/kpis', { params });
  return response.data.data;
};

export const getActionItems = async (): Promise<ActionItemsResponse> => {
  const response = await api.get('/dashboard/action-items');
  return response.data.data;
};

export const getKPIHistory = async (months?: number): Promise<KPIHistoryPoint[]> => {
  const params = months ? { months } : undefined;
  const response = await api.get('/dashboard/kpis/history', { params });
  return response.data.data;
};

export const updateKPIThreshold = async (
  kpiKey: string,
  targetValue: number,
  warningThreshold: number | null
): Promise<KPIResult> => {
  const response = await api.put(`/dashboard/kpis/${kpiKey}`, { targetValue, warningThreshold });
  return response.data.data;
};

// ==================== PDF Parsing ====================

export interface PeelPdfRow {
  sectionId: string;
  avgPeel: number;
  maxPeel: number;
  frontBack: string;
  direction: string;
  tearing?: string;
  minPeel: number;
  passFail: string;
  sectionType: 'Center' | 'Edge';
}

export interface PeelPdfResult {
  centerRows: PeelPdfRow[];
  edgeRows: PeelPdfRow[];
  jobId: string | null;
}

export interface SmartQcResult {
  piccNumber: number;
  resonanceFrequencyMHz: number | null;
  qFactor: number | null;
  readingPowerV: number | null;
  chipAnswer: string | null;
  testerSerial: string | null;
  softwareVersion: string | null;
  firmwareVersion: string | null;
  vnaPowerDbm: number | null;
  freqMinKhz: number | null;
  freqMaxKhz: number | null;
  freqStepKhz: number | null;
  testDate: string | null;
}

export interface ProfileCardsListCard {
  cardNumber: number;
  timestamp: string;
  resonanceFrequencyMHz: number;
  qFactor: number;
  readingPowerV: number;
}

export interface ProfileCardsListResult {
  profileName: string | null;
  cards: ProfileCardsListCard[];
  totalCards: number;
}

export type SmartQcPdfResponse =
  | { format: 'single-card'; data: SmartQcResult }
  | { format: 'profile-cards-list'; data: ProfileCardsListResult };

export const parseSmartQcPdf = async (file: File): Promise<SmartQcPdfResponse> => {
  const formData = new FormData();
  formData.append('pdf', file);
  const response = await api.post('/test-entries/parse-smartqc-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return { format: response.data.format, data: response.data.data };
};

export interface LaminatePeelRow {
  cardNumber: number;
  p1: number;
  p2: number;
  pass: boolean;
}

export const parseLaminatePeelPdf = async (file: File): Promise<LaminatePeelRow[]> => {
  const formData = new FormData();
  formData.append('pdf', file);
  const response = await api.post('/test-entries/parse-laminate-peel-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data.rows;
};

export const parsePeelPdf = async (file: File): Promise<PeelPdfResult> => {
  const formData = new FormData();
  formData.append('pdf', file);
  const response = await api.post('/test-entries/parse-peel-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
};

// ==================== PDF Export ====================

export const exportSessionPDF = async (sessionId: number): Promise<Blob> => {
  try {
    const response = await api.get(`/test-sessions/${sessionId}/export-pdf`, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf'
      },
      // Important: Ensure axios doesn't try to parse JSON on error
      validateStatus: (status) => status === 200
    });

    // Check if response is actually a blob
    if (response.data instanceof Blob) {
      // Check if it's an error response (JSON blob)
      if (response.data.type === 'application/json') {
        // Read the error message from the JSON blob
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.message || 'Failed to generate PDF');
      }

      // Ensure it's a proper PDF blob
      if (response.data.type !== 'application/pdf') {
        return new Blob([response.data], { type: 'application/pdf' });
      }
      return response.data;
    }

    // If it's an ArrayBuffer, convert to blob
    if (response.data instanceof ArrayBuffer) {
      return new Blob([response.data], { type: 'application/pdf' });
    }

    // Fallback: convert whatever we got to a PDF blob
    return new Blob([response.data], { type: 'application/pdf' });
  } catch (error: unknown) {
    // Handle axios errors with blob response
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: Blob } };
      if (axiosError.response?.data instanceof Blob && axiosError.response.data.type === 'application/json') {
        const text = await axiosError.response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.message || 'Failed to generate PDF');
      }
    }
    throw error;
  }
};

export const exportProfessionalReport = async (sessionId: number): Promise<Blob> => {
  const response = await api.get(`/test-sessions/${sessionId}/export-report`, {
    responseType: 'blob',
    headers: { 'Accept': 'application/pdf' },
    validateStatus: (status) => status === 200
  });
  return response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' });
};

export const exportManagementReport = async (params?: { startDate?: string; endDate?: string; cardType?: string }): Promise<Blob> => {
  const response = await api.get('/test-sessions/management-report', {
    params,
    responseType: 'blob',
    headers: { 'Accept': 'application/pdf' },
    validateStatus: (status) => status === 200
  });
  return response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' });
};

export const exportKPIReport = async (days = 30, months = 6): Promise<Blob> => {
  const response = await api.get('/dashboard/kpis/export', {
    params: { days, months },
    responseType: 'blob',
    headers: { 'Accept': 'application/pdf' },
    validateStatus: (status) => status === 200
  });
  return response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' });
};

export const getRejectionBreakdown = async (days = 30): Promise<RejectionBreakdown> => {
  const response = await api.get('/dashboard/rejection-breakdown', { params: { days } });
  return response.data.data;
};

// ==================== SPC / Cpk ====================

export interface SpcDef {
  id: number;
  test_id: string;
  test_name: string;
  unit_of_measurement: string | null;
  min_acceptable_value: number | null;
  max_acceptable_value: number | null;
  category_code: string;
  category_name: string;
  data_points: number;
}

export interface SpcPoint {
  id: number;
  value: number;
  pass_status: boolean;
  date: string;
  session_number: string;
  session_id: number;
  session_type: 'Monitoring' | 'Qualification';
  card_number: number;
  out_of_control: boolean;
  out_of_spec: boolean;
}

export interface SpcStats {
  n: number;
  mean: number;
  sigma: number;
  ucl: number;
  lcl: number;
  usl: number | null;
  lsl: number | null;
  cp: number | null;
  cpk: number | null;
  ppk: number | null;
  sigmaLevel: number | null;
}

export interface SpcHistBin {
  bin: string;
  midpoint: number;
  freq: number;
  normal: number;
}

export interface SpcData {
  definition: SpcDef;
  points: SpcPoint[];
  stats: SpcStats | null;
  histogram: SpcHistBin[];
}

export const getSpcDefs = async (): Promise<SpcDef[]> => {
  const response = await api.get('/dashboard/spc-defs');
  return response.data.data;
};

export const getSpcData = async (
  testDefinitionId: number,
  options: { days?: number; startDate?: string; endDate?: string; sessionType?: string; measurement?: 'primary' | 'secondary' } = {},
): Promise<SpcData> => {
  const response = await api.get('/dashboard/spc-data', { params: { testDefinitionId, ...options } });
  return response.data.data;
};

// Export as default object for convenience
const testEntryService = {
  // Categories
  getCategories,
  getCategory,
  getCategoriesByCardType,
  getDefinitionsByCategory,
  // Sessions
  getSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  submitSession,
  approveSession,
  rejectSession,
  // Entries
  createOrUpdateEntry,
  bulkSaveEntries,
  getEntriesBySession,
  deleteEntry,
  // Sample Cards
  createSampleCards,
  getSampleCardsBySession,
  // Specialized Metadata
  upsertEntryMetadata,
  getEntryMetadata,
  storePdfPages,
  // Metrics
  getTestEntryMetrics,
  getKPIs,
  getKPIHistory,
  updateKPIThreshold,
  // PDF Import / Parsing
  parsePeelPdf,
  parseLaminatePeelPdf,
  parseSmartQcPdf,
  // PDF Export
  exportSessionPDF,
  exportProfessionalReport,
  exportManagementReport,
  // Desktop app launcher
  launchSmartQC,
};

export default testEntryService;

export function launchSmartQC(): Promise<void> {
  return api.post('/launch/smartqc').then(() => undefined);
}

export function launchQCardForceGauge(): void {
  window.open('qcardforce://', '_self');
}
