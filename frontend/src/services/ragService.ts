import api from './api';

export interface RagDocument {
  id: number;
  name: string;
  filename: string;
  chunk_count: number;
  status: 'pending' | 'ready' | 'error';
  error_message?: string;
  ingested_by?: number;
  ingested_at?: string;
  created_at: string;
}

export interface QueryResponse {
  success: boolean;
  answer: string;
}

export const listDocuments = async (): Promise<RagDocument[]> => {
  const { data } = await api.get('/rag/documents');
  return data.data;
};

export const uploadDocument = async (
  file: File,
  name: string,
  onProgress?: (pct: number) => void,
): Promise<RagDocument> => {
  const form = new FormData();
  form.append('file', file);
  form.append('name', name);
  const { data } = await api.post('/rag/documents', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
    },
  });
  return data.data;
};

export const deleteDocument = async (id: number): Promise<void> => {
  await api.delete(`/rag/documents/${id}`);
};

export const querySync = async (question: string, contextHint?: string): Promise<string> => {
  const { data } = await api.post<QueryResponse>('/rag/query', { question, contextHint });
  return data.answer;
};

/**
 * Stream a query response via Server-Sent Events.
 * Calls onChunk with each text delta, calls onDone when complete.
 * Returns an AbortController so the caller can cancel the stream.
 */
export const queryStream = (
  question: string,
  contextHint: string | undefined,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
): AbortController => {
  const controller = new AbortController();

  // SSE via fetch (axios doesn't support streaming well).
  // Read token from localStorage — same source the api interceptor uses.
  const token = localStorage.getItem('token');

  fetch('/api/rag/query/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ question, contextHint }),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) { onError(`HTTP ${res.status}`); return; }
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'chunk') onChunk(event.text);
          else if (event.type === 'done') onDone();
          else if (event.type === 'error') onError(event.message);
        } catch { /* ignore malformed line */ }
      }
    }
  }).catch((err) => {
    if (err.name !== 'AbortError') onError(err.message);
  });

  return controller;
};
