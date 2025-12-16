import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { charterService } from '../../services/integration/charterService';
import { stakeholderService } from '../../services/integration/stakeholderService';
import { changeRequestService } from '../../services/integration/changeRequestService';
import { lessonLearnedService } from '../../services/integration/lessonLearnedService';
import { IntegrationState, ProjectCharter, Stakeholder, ChangeRequest, LessonLearned } from '../../types';

const initialState: IntegrationState = {
  charter: null,
  stakeholders: [],
  changeRequests: [],
  lessonsLearned: [],
  loading: false,
  error: null,
};

// Charter Thunks
export const fetchCharter = createAsyncThunk(
  'integration/fetchCharter',
  async (projectId: number, { rejectWithValue }) => {
    try {
      const response = await charterService.getCharter(projectId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch charter');
    }
  }
);

export const createCharter = createAsyncThunk(
  'integration/createCharter',
  async ({ projectId, data }: { projectId: number; data: Partial<ProjectCharter> }, { rejectWithValue }) => {
    try {
      const response = await charterService.createCharter(projectId, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create charter');
    }
  }
);

export const updateCharter = createAsyncThunk(
  'integration/updateCharter',
  async ({ projectId, data }: { projectId: number; data: Partial<ProjectCharter> }, { rejectWithValue }) => {
    try {
      const response = await charterService.updateCharter(projectId, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update charter');
    }
  }
);

// Stakeholder Thunks
export const fetchStakeholders = createAsyncThunk(
  'integration/fetchStakeholders',
  async (projectId: number, { rejectWithValue }) => {
    try {
      const response = await stakeholderService.getStakeholders(projectId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch stakeholders');
    }
  }
);

export const createStakeholder = createAsyncThunk(
  'integration/createStakeholder',
  async ({ projectId, data }: { projectId: number; data: Partial<Stakeholder> }, { rejectWithValue }) => {
    try {
      const response = await stakeholderService.createStakeholder(projectId, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create stakeholder');
    }
  }
);

export const deleteStakeholder = createAsyncThunk(
  'integration/deleteStakeholder',
  async (id: number, { rejectWithValue }) => {
    try {
      await stakeholderService.deleteStakeholder(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete stakeholder');
    }
  }
);

// Change Request Thunks
export const fetchChangeRequests = createAsyncThunk(
  'integration/fetchChangeRequests',
  async (projectId: number, { rejectWithValue }) => {
    try {
      const response = await changeRequestService.getChangeRequests(projectId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch change requests');
    }
  }
);

export const createChangeRequest = createAsyncThunk(
  'integration/createChangeRequest',
  async ({ projectId, data }: { projectId: number; data: Partial<ChangeRequest> }, { rejectWithValue }) => {
    try {
      const response = await changeRequestService.createChangeRequest(projectId, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create change request');
    }
  }
);

export const approveChangeRequest = createAsyncThunk(
  'integration/approveChangeRequest',
  async ({ id, notes }: { id: number; notes?: string }, { rejectWithValue }) => {
    try {
      const response = await changeRequestService.approveChangeRequest(id, notes);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to approve change request');
    }
  }
);

// Lessons Learned Thunks
export const fetchLessonsLearned = createAsyncThunk(
  'integration/fetchLessonsLearned',
  async (projectId: number, { rejectWithValue }) => {
    try {
      const response = await lessonLearnedService.getLessonsLearned(projectId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch lessons learned');
    }
  }
);

export const createLessonLearned = createAsyncThunk(
  'integration/createLessonLearned',
  async ({ projectId, data }: { projectId: number; data: Partial<LessonLearned> }, { rejectWithValue }) => {
    try {
      const response = await lessonLearnedService.createLessonLearned(projectId, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create lesson learned');
    }
  }
);

const integrationSlice = createSlice({
  name: 'integration',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearIntegrationData: (state) => {
      state.charter = null;
      state.stakeholders = [];
      state.changeRequests = [];
      state.lessonsLearned = [];
    },
  },
  extraReducers: (builder) => {
    // Charter
    builder
      .addCase(fetchCharter.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCharter.fulfilled, (state, action) => {
        state.loading = false;
        state.charter = action.payload;
      })
      .addCase(fetchCharter.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createCharter.fulfilled, (state, action) => {
        state.charter = action.payload;
      })
      .addCase(updateCharter.fulfilled, (state, action) => {
        state.charter = action.payload;
      });

    // Stakeholders
    builder
      .addCase(fetchStakeholders.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchStakeholders.fulfilled, (state, action) => {
        state.loading = false;
        state.stakeholders = action.payload;
      })
      .addCase(fetchStakeholders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createStakeholder.fulfilled, (state, action) => {
        state.stakeholders.push(action.payload);
      })
      .addCase(deleteStakeholder.fulfilled, (state, action) => {
        state.stakeholders = state.stakeholders.filter(s => s.id !== action.payload);
      });

    // Change Requests
    builder
      .addCase(fetchChangeRequests.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchChangeRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.changeRequests = action.payload;
      })
      .addCase(fetchChangeRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createChangeRequest.fulfilled, (state, action) => {
        state.changeRequests.unshift(action.payload);
      })
      .addCase(approveChangeRequest.fulfilled, (state, action) => {
        const index = state.changeRequests.findIndex(cr => cr.id === action.payload.id);
        if (index !== -1) {
          state.changeRequests[index] = action.payload;
        }
      });

    // Lessons Learned
    builder
      .addCase(fetchLessonsLearned.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchLessonsLearned.fulfilled, (state, action) => {
        state.loading = false;
        state.lessonsLearned = action.payload;
      })
      .addCase(fetchLessonsLearned.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createLessonLearned.fulfilled, (state, action) => {
        state.lessonsLearned.unshift(action.payload);
      });
  },
});

export const { clearError, clearIntegrationData } = integrationSlice.actions;
export default integrationSlice.reducer;
