import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  TestCategory,
  TestDefinition,
  TestSession,
  TestEntry,
  SampleCard,
  TestEntryMetrics,
  KPIResult,
  KPIHistoryPoint,
  ActionItem,
  CreateSessionRequest,
  BulkSaveEntriesRequest,
  SessionsListParams,
  TestEntryFormData,
  CategoryFormState,
} from '../../../types/cqm';
import * as testEntryService from '../../../services/cqm/testEntryService';

interface TestEntryState {
  // Categories
  categories: TestCategory[];
  selectedCategory: TestCategory | null;
  definitions: TestDefinition[];

  // Sessions
  sessions: TestSession[];
  currentSession: TestSession | null;
  sessionsPagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  // Entries
  entries: TestEntry[];

  // Sample Cards
  sampleCards: SampleCard[];

  // Metrics
  metrics: TestEntryMetrics | null;
  kpis: KPIResult[];
  kpiHistory: KPIHistoryPoint[];
  kpiError: string | null;
  actionItems: ActionItem[];
  actionItemsError: string | null;

  // Form state (local)
  formState: {
    sessionData: CreateSessionRequest | null;
    categoryStates: CategoryFormState[];
    isDirty: boolean;
  };

  // Loading states
  loading: {
    categories: boolean;
    definitions: boolean;
    sessions: boolean;
    session: boolean;
    entries: boolean;
    metrics: boolean;
    kpis: boolean;
    kpiHistory: boolean;
    actionItems: boolean;
    saving: boolean;
  };

  // Errors
  error: string | null;
}

const initialState: TestEntryState = {
  categories: [],
  selectedCategory: null,
  definitions: [],
  sessions: [],
  currentSession: null,
  sessionsPagination: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  },
  entries: [],
  sampleCards: [],
  metrics: null,
  kpis: [],
  kpiHistory: [],
  kpiError: null,
  actionItems: [],
  actionItemsError: null,
  formState: {
    sessionData: null,
    categoryStates: [],
    isDirty: false,
  },
  loading: {
    categories: false,
    definitions: false,
    sessions: false,
    session: false,
    entries: false,
    metrics: false,
    kpis: false,
    kpiHistory: false,
    actionItems: false,
    saving: false,
  },
  error: null,
};

// Async thunks
export const fetchCategories = createAsyncThunk(
  'testEntry/fetchCategories',
  async (params?: { cardType?: string; activeOnly?: boolean }) => {
    return await testEntryService.getCategories(params?.cardType, params?.activeOnly);
  }
);

export const fetchCategoriesByCardType = createAsyncThunk(
  'testEntry/fetchCategoriesByCardType',
  async (cardType: string) => {
    return await testEntryService.getCategoriesByCardType(cardType);
  }
);

export const fetchDefinitionsByCategory = createAsyncThunk(
  'testEntry/fetchDefinitionsByCategory',
  async (categoryId: number) => {
    return await testEntryService.getDefinitionsByCategory(categoryId);
  }
);

export const fetchSessions = createAsyncThunk(
  'testEntry/fetchSessions',
  async (params?: SessionsListParams) => {
    return await testEntryService.getSessions(params);
  }
);

export const fetchSession = createAsyncThunk(
  'testEntry/fetchSession',
  async (id: number) => {
    return await testEntryService.getSession(id);
  }
);

export const createSession = createAsyncThunk(
  'testEntry/createSession',
  async (data: CreateSessionRequest) => {
    return await testEntryService.createSession(data);
  }
);

export const updateSession = createAsyncThunk(
  'testEntry/updateSession',
  async ({ id, data }: { id: number; data: Partial<CreateSessionRequest> }) => {
    return await testEntryService.updateSession(id, data);
  }
);

export const deleteSession = createAsyncThunk(
  'testEntry/deleteSession',
  async (id: number) => {
    await testEntryService.deleteSession(id);
    return id;
  }
);

export const submitSession = createAsyncThunk(
  'testEntry/submitSession',
  async (id: number) => {
    return await testEntryService.submitSession(id);
  }
);

export const approveSession = createAsyncThunk(
  'testEntry/approveSession',
  async (id: number) => {
    return await testEntryService.approveSession(id);
  }
);

export const rejectSession = createAsyncThunk(
  'testEntry/rejectSession',
  async ({ id, reason }: { id: number; reason: string }) => {
    return await testEntryService.rejectSession(id, reason);
  }
);

export const reopenSession = createAsyncThunk(
  'testEntry/reopenSession',
  async (id: number) => {
    return await testEntryService.reopenSession(id);
  }
);

export const fetchEntriesBySession = createAsyncThunk(
  'testEntry/fetchEntriesBySession',
  async (sessionId: number) => {
    return await testEntryService.getEntriesBySession(sessionId);
  }
);

export const bulkSaveEntries = createAsyncThunk(
  'testEntry/bulkSaveEntries',
  async (data: BulkSaveEntriesRequest) => {
    return await testEntryService.bulkSaveEntries(data);
  }
);

export const fetchTestEntryMetrics = createAsyncThunk(
  'testEntry/fetchTestEntryMetrics',
  async (trendDays?: number) => {
    return await testEntryService.getTestEntryMetrics(trendDays);
  }
);

export const fetchKPIs = createAsyncThunk(
  'testEntry/fetchKPIs',
  async (days?: number) => {
    return await testEntryService.getKPIs(days);
  }
);

export const fetchKPIHistory = createAsyncThunk(
  'testEntry/fetchKPIHistory',
  async (months?: number) => {
    return await testEntryService.getKPIHistory(months);
  }
);

export const fetchActionItems = createAsyncThunk(
  'testEntry/fetchActionItems',
  async () => {
    const response = await testEntryService.getActionItems();
    return response.items;
  }
);

export const updateKPIThreshold = createAsyncThunk(
  'testEntry/updateKPIThreshold',
  async ({ kpiKey, targetValue, warningThreshold }: { kpiKey: string; targetValue: number; warningThreshold: number | null }) => {
    return await testEntryService.updateKPIThreshold(kpiKey, targetValue, warningThreshold);
  }
);

export const createSampleCards = createAsyncThunk(
  'testEntry/createSampleCards',
  async ({ sessionId, count, categoryId }: { sessionId: number; count: number; categoryId?: number }) => {
    return await testEntryService.createSampleCards(sessionId, count, categoryId);
  }
);

export const fetchSampleCards = createAsyncThunk(
  'testEntry/fetchSampleCards',
  async ({ sessionId, categoryId }: { sessionId: number; categoryId?: number }) => {
    return await testEntryService.getSampleCardsBySession(sessionId, categoryId);
  }
);

const testEntrySlice = createSlice({
  name: 'testEntry',
  initialState,
  reducers: {
    setSelectedCategory: (state, action: PayloadAction<TestCategory | null>) => {
      state.selectedCategory = action.payload;
    },

    clearCurrentSession: (state) => {
      state.currentSession = null;
      state.entries = [];
    },

    clearError: (state) => {
      state.error = null;
    },

    // Form state management
    initFormState: (state, action: PayloadAction<CreateSessionRequest>) => {
      state.formState.sessionData = action.payload;
      state.formState.categoryStates = [];
      state.formState.isDirty = false;
    },

    updateFormSessionData: (state, action: PayloadAction<Partial<CreateSessionRequest>>) => {
      if (state.formState.sessionData) {
        state.formState.sessionData = { ...state.formState.sessionData, ...action.payload };
      }
      state.formState.isDirty = true;
    },

    updateCategoryFormState: (state, action: PayloadAction<CategoryFormState>) => {
      const index = state.formState.categoryStates.findIndex(
        (c) => c.categoryId === action.payload.categoryId
      );
      if (index >= 0) {
        state.formState.categoryStates[index] = action.payload;
      } else {
        state.formState.categoryStates.push(action.payload);
      }
      state.formState.isDirty = true;
    },

    updateEntryFormData: (
      state,
      action: PayloadAction<{ categoryId: number; entry: TestEntryFormData }>
    ) => {
      const categoryState = state.formState.categoryStates.find(
        (c) => c.categoryId === action.payload.categoryId
      );
      if (categoryState) {
        const entryIndex = categoryState.entries.findIndex(
          (e) => e.testDefinitionId === action.payload.entry.testDefinitionId
        );
        if (entryIndex >= 0) {
          categoryState.entries[entryIndex] = action.payload.entry;
        } else {
          categoryState.entries.push(action.payload.entry);
        }
        // Check if category is complete
        categoryState.isComplete = categoryState.entries.every((e) => e.isValid);
      }
      state.formState.isDirty = true;
    },

    clearFormState: (state) => {
      state.formState = {
        sessionData: null,
        categoryStates: [],
        isDirty: false,
      };
      state.sampleCards = [];
    },

    setFormDirty: (state, action: PayloadAction<boolean>) => {
      state.formState.isDirty = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch categories
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading.categories = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading.categories = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading.categories = false;
        state.error = action.error.message || 'Failed to fetch categories';
      });

    // Fetch categories by card type
    builder
      .addCase(fetchCategoriesByCardType.pending, (state) => {
        state.loading.categories = true;
        state.error = null;
      })
      .addCase(fetchCategoriesByCardType.fulfilled, (state, action) => {
        state.loading.categories = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategoriesByCardType.rejected, (state, action) => {
        state.loading.categories = false;
        state.error = action.error.message || 'Failed to fetch categories';
      });

    // Fetch definitions by category
    builder
      .addCase(fetchDefinitionsByCategory.pending, (state) => {
        state.loading.definitions = true;
        state.error = null;
      })
      .addCase(fetchDefinitionsByCategory.fulfilled, (state, action) => {
        state.loading.definitions = false;
        state.definitions = action.payload;
      })
      .addCase(fetchDefinitionsByCategory.rejected, (state, action) => {
        state.loading.definitions = false;
        state.error = action.error.message || 'Failed to fetch definitions';
      });

    // Fetch sessions
    builder
      .addCase(fetchSessions.pending, (state) => {
        state.loading.sessions = true;
        state.error = null;
      })
      .addCase(fetchSessions.fulfilled, (state, action) => {
        state.loading.sessions = false;
        state.sessions = action.payload.data;
        state.sessionsPagination = action.payload.pagination;
      })
      .addCase(fetchSessions.rejected, (state, action) => {
        state.loading.sessions = false;
        state.error = action.error.message || 'Failed to fetch sessions';
      });

    // Fetch single session
    builder
      .addCase(fetchSession.pending, (state) => {
        state.loading.session = true;
        state.error = null;
      })
      .addCase(fetchSession.fulfilled, (state, action) => {
        state.loading.session = false;
        state.currentSession = action.payload;
        state.entries = action.payload.entries || [];
      })
      .addCase(fetchSession.rejected, (state, action) => {
        state.loading.session = false;
        state.error = action.error.message || 'Failed to fetch session';
      });

    // Create session
    builder
      .addCase(createSession.pending, (state) => {
        state.loading.saving = true;
        state.error = null;
      })
      .addCase(createSession.fulfilled, (state, action) => {
        state.loading.saving = false;
        state.currentSession = action.payload;
        state.sessions.unshift(action.payload);
      })
      .addCase(createSession.rejected, (state, action) => {
        state.loading.saving = false;
        state.error = action.error.message || 'Failed to create session';
      });

    // Update session
    builder
      .addCase(updateSession.pending, (state) => {
        state.loading.saving = true;
        state.error = null;
      })
      .addCase(updateSession.fulfilled, (state, action) => {
        state.loading.saving = false;
        state.currentSession = action.payload;
        const index = state.sessions.findIndex((s) => s.id === action.payload.id);
        if (index >= 0) {
          state.sessions[index] = action.payload;
        }
      })
      .addCase(updateSession.rejected, (state, action) => {
        state.loading.saving = false;
        state.error = action.error.message || 'Failed to update session';
      });

    // Delete session
    builder
      .addCase(deleteSession.pending, (state) => {
        state.loading.saving = true;
        state.error = null;
      })
      .addCase(deleteSession.fulfilled, (state, action) => {
        state.loading.saving = false;
        state.sessions = state.sessions.filter((s) => s.id !== action.payload);
        if (state.currentSession?.id === action.payload) {
          state.currentSession = null;
          state.entries = [];
        }
      })
      .addCase(deleteSession.rejected, (state, action) => {
        state.loading.saving = false;
        state.error = action.error.message || 'Failed to delete session';
      });

    // Submit session
    builder
      .addCase(submitSession.pending, (state) => {
        state.loading.saving = true;
        state.error = null;
      })
      .addCase(submitSession.fulfilled, (state, action) => {
        state.loading.saving = false;
        state.currentSession = action.payload;
        const index = state.sessions.findIndex((s) => s.id === action.payload.id);
        if (index >= 0) {
          state.sessions[index] = action.payload;
        }
      })
      .addCase(submitSession.rejected, (state, action) => {
        state.loading.saving = false;
        state.error = action.error.message || 'Failed to submit session';
      });

    // Approve session
    builder
      .addCase(approveSession.fulfilled, (state, action) => {
        state.currentSession = action.payload;
        const index = state.sessions.findIndex((s) => s.id === action.payload.id);
        if (index >= 0) {
          state.sessions[index] = action.payload;
        }
      });

    // Reject session
    builder
      .addCase(rejectSession.fulfilled, (state, action) => {
        state.currentSession = action.payload;
        const index = state.sessions.findIndex((s) => s.id === action.payload.id);
        if (index >= 0) {
          state.sessions[index] = action.payload;
        }
      });

    // Reopen session
    builder
      .addCase(reopenSession.fulfilled, (state, action) => {
        state.currentSession = action.payload;
        const index = state.sessions.findIndex((s) => s.id === action.payload.id);
        if (index >= 0) {
          state.sessions[index] = action.payload;
        }
      });

    // Fetch entries by session
    builder
      .addCase(fetchEntriesBySession.pending, (state) => {
        state.loading.entries = true;
        state.error = null;
      })
      .addCase(fetchEntriesBySession.fulfilled, (state, action) => {
        state.loading.entries = false;
        state.entries = action.payload;
      })
      .addCase(fetchEntriesBySession.rejected, (state, action) => {
        state.loading.entries = false;
        state.error = action.error.message || 'Failed to fetch entries';
      });

    // Bulk save entries
    builder
      .addCase(bulkSaveEntries.pending, (state) => {
        state.loading.saving = true;
        state.error = null;
      })
      .addCase(bulkSaveEntries.fulfilled, (state) => {
        state.loading.saving = false;
        state.formState.isDirty = false;
      })
      .addCase(bulkSaveEntries.rejected, (state, action) => {
        state.loading.saving = false;
        state.error = action.error.message || 'Failed to save entries';
      });

    // Fetch metrics
    builder
      .addCase(fetchTestEntryMetrics.pending, (state) => {
        state.loading.metrics = true;
        state.error = null;
      })
      .addCase(fetchTestEntryMetrics.fulfilled, (state, action) => {
        state.loading.metrics = false;
        state.metrics = action.payload;
      })
      .addCase(fetchTestEntryMetrics.rejected, (state, action) => {
        state.loading.metrics = false;
        state.error = action.error.message || 'Failed to fetch metrics';
      });

    // Fetch KPIs
    builder
      .addCase(fetchKPIs.pending, (state) => {
        state.loading.kpis = true;
        state.kpiError = null;
      })
      .addCase(fetchKPIs.fulfilled, (state, action) => {
        state.loading.kpis = false;
        state.kpis = action.payload;
        state.kpiError = null;
      })
      .addCase(fetchKPIs.rejected, (state, action) => {
        state.loading.kpis = false;
        state.kpiError = action.error?.message || 'Failed to load KPIs';
      });

    // Fetch KPI history
    builder
      .addCase(fetchKPIHistory.pending, (state) => {
        state.loading.kpiHistory = true;
      })
      .addCase(fetchKPIHistory.fulfilled, (state, action) => {
        state.loading.kpiHistory = false;
        state.kpiHistory = action.payload;
      })
      .addCase(fetchKPIHistory.rejected, (state) => {
        state.loading.kpiHistory = false;
      });

    // Update KPI threshold
    builder
      .addCase(updateKPIThreshold.fulfilled, (_state) => {
        // Re-fetch is triggered from the page after save
      });

    // Fetch action items
    builder
      .addCase(fetchActionItems.pending, (state) => {
        state.loading.actionItems = true;
        state.actionItemsError = null;
      })
      .addCase(fetchActionItems.fulfilled, (state, action) => {
        state.loading.actionItems = false;
        state.actionItems = action.payload;
        state.actionItemsError = null;
      })
      .addCase(fetchActionItems.rejected, (state, action) => {
        state.loading.actionItems = false;
        state.actionItemsError = action.error?.message || 'Failed to load action items';
      });

    // Sample cards
    builder
      .addCase(createSampleCards.fulfilled, (state, action) => {
        state.sampleCards = action.payload;
      })
      .addCase(fetchSampleCards.fulfilled, (state, action) => {
        state.sampleCards = action.payload;
      });
  },
});

export const {
  setSelectedCategory,
  clearCurrentSession,
  clearError,
  initFormState,
  updateFormSessionData,
  updateCategoryFormState,
  updateEntryFormData,
  clearFormState,
  setFormDirty,
} = testEntrySlice.actions;

export default testEntrySlice.reducer;
