import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as ragService from '../../services/ragService';
import type { RagDocument } from '../../services/ragService';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
}

interface RagState {
  documents: RagDocument[];
  loadingDocs: boolean;
  uploadProgress: number | null;
  chat: ChatMessage[];
  querying: boolean;
  error: string | null;
}

const initialState: RagState = {
  documents: [],
  loadingDocs: false,
  uploadProgress: null,
  chat: [],
  querying: false,
  error: null,
};

export const fetchDocuments = createAsyncThunk('rag/fetchDocuments', async () => {
  return await ragService.listDocuments();
});

export const removeDocument = createAsyncThunk('rag/removeDocument', async (id: number) => {
  await ragService.deleteDocument(id);
  return id;
});

const ragSlice = createSlice({
  name: 'rag',
  initialState,
  reducers: {
    setUploadProgress(state, action: PayloadAction<number | null>) {
      state.uploadProgress = action.payload;
    },
    documentIngested(state, action: PayloadAction<RagDocument>) {
      const idx = state.documents.findIndex((d) => d.id === action.payload.id);
      if (idx >= 0) state.documents[idx] = action.payload;
      else state.documents.unshift(action.payload);
    },
    addUserMessage(state, action: PayloadAction<string>) {
      state.chat.push({ role: 'user', text: action.payload });
      // Placeholder for streaming assistant reply
      state.chat.push({ role: 'assistant', text: '', streaming: true });
      state.querying = true;
    },
    appendStreamChunk(state, action: PayloadAction<string>) {
      const last = state.chat[state.chat.length - 1];
      if (last?.role === 'assistant') last.text += action.payload;
    },
    finalizeStream(state) {
      const last = state.chat[state.chat.length - 1];
      if (last?.role === 'assistant') last.streaming = false;
      state.querying = false;
    },
    streamError(state, action: PayloadAction<string>) {
      const last = state.chat[state.chat.length - 1];
      if (last?.role === 'assistant') {
        last.text = `Error: ${action.payload}`;
        last.streaming = false;
      }
      state.querying = false;
    },
    clearChat(state) {
      state.chat = [];
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocuments.pending, (state) => { state.loadingDocs = true; })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.documents = action.payload;
        state.loadingDocs = false;
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.loadingDocs = false;
        state.error = action.error.message ?? 'Failed to load documents';
      })
      .addCase(removeDocument.fulfilled, (state, action) => {
        state.documents = state.documents.filter((d) => d.id !== action.payload);
      });
  },
});

export const {
  setUploadProgress, documentIngested,
  addUserMessage, appendStreamChunk, finalizeStream, streamError,
  clearChat, clearError,
} = ragSlice.actions;

export default ragSlice.reducer;
