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

// ==================== Test Sessions ====================

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

export const createSampleCards = async (sessionId: number, count: number, categoryId?: number): Promise<SampleCard[]> => {
  const response = await api.post('/sample-cards/bulk', { sessionId, count, categoryId });
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

// ==================== Dashboard Metrics ====================

export const getTestEntryMetrics = async (trendDays?: number): Promise<TestEntryMetrics> => {
  const params = trendDays ? { trendDays } : undefined;
  const response = await api.get('/dashboard/test-entries', { params });
  return response.data.data;
};

export const getKPIs = async (): Promise<KPIResult[]> => {
  const response = await api.get('/dashboard/kpis');
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
}

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
  // PDF Export
  exportSessionPDF,
  // Desktop app launcher
  launchSmartQC,
};

export default testEntryService;

export function launchSmartQC(): Promise<void> {
  return api.post('/launch/smartqc').then(() => undefined);
}
