import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import riskService, { Risk, RiskSummary, RiskMatrix, CreateRiskDto, UpdateRiskDto } from '../../services/risk/riskService';

interface RiskState {
  risks: Risk[];
  riskSummary: RiskSummary | null;
  riskMatrix: RiskMatrix | null;
  selectedRisk: Risk | null;
  loading: boolean;
  error: string | null;
}

const initialState: RiskState = {
  risks: [],
  riskSummary: null,
  riskMatrix: null,
  selectedRisk: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchRisks = createAsyncThunk(
  'risk/fetchRisks',
  async (projectId: number) => {
    return await riskService.getRisks(projectId);
  }
);

export const fetchRisk = createAsyncThunk(
  'risk/fetchRisk',
  async (riskId: number) => {
    return await riskService.getRisk(riskId);
  }
);

export const fetchRiskMatrix = createAsyncThunk(
  'risk/fetchRiskMatrix',
  async (projectId: number) => {
    return await riskService.getMatrix(projectId);
  }
);

export const fetchRiskSummary = createAsyncThunk(
  'risk/fetchRiskSummary',
  async (projectId: number) => {
    return await riskService.getSummary(projectId);
  }
);

export const createRisk = createAsyncThunk(
  'risk/createRisk',
  async ({ projectId, data }: { projectId: number; data: CreateRiskDto }) => {
    return await riskService.createRisk(projectId, data);
  }
);

export const updateRisk = createAsyncThunk(
  'risk/updateRisk',
  async ({ riskId, data }: { riskId: number; data: UpdateRiskDto }) => {
    return await riskService.updateRisk(riskId, data);
  }
);

export const deleteRisk = createAsyncThunk(
  'risk/deleteRisk',
  async (riskId: number) => {
    await riskService.deleteRisk(riskId);
    return riskId;
  }
);

export const mitigateRisk = createAsyncThunk(
  'risk/mitigateRisk',
  async ({ riskId, data }: { riskId: number; data: any }) => {
    return await riskService.mitigateRisk(riskId, data);
  }
);

export const closeRisk = createAsyncThunk(
  'risk/closeRisk',
  async (riskId: number) => {
    return await riskService.closeRisk(riskId);
  }
);

const riskSlice = createSlice({
  name: 'risk',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedRisk: (state) => {
      state.selectedRisk = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch risks
      .addCase(fetchRisks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRisks.fulfilled, (state, action) => {
        state.loading = false;
        state.risks = action.payload;
      })
      .addCase(fetchRisks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch risks';
      })
      
      // Fetch single risk
      .addCase(fetchRisk.fulfilled, (state, action) => {
        state.selectedRisk = action.payload;
      })
      
      // Fetch risk matrix
      .addCase(fetchRiskMatrix.fulfilled, (state, action) => {
        state.riskMatrix = action.payload;
      })
      
      // Fetch risk summary
      .addCase(fetchRiskSummary.fulfilled, (state, action) => {
        state.riskSummary = action.payload;
      })
      
      // Create risk
      .addCase(createRisk.fulfilled, (state, action) => {
        state.risks.push(action.payload);
      })
      
      // Update risk
      .addCase(updateRisk.fulfilled, (state, action) => {
        const index = state.risks.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.risks[index] = action.payload;
        }
        if (state.selectedRisk?.id === action.payload.id) {
          state.selectedRisk = action.payload;
        }
      })
      
      // Delete risk
      .addCase(deleteRisk.fulfilled, (state, action) => {
        state.risks = state.risks.filter(r => r.id !== action.payload);
      })
      
      // Mitigate risk
      .addCase(mitigateRisk.fulfilled, (state, action) => {
        const index = state.risks.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.risks[index] = action.payload;
        }
      })
      
      // Close risk
      .addCase(closeRisk.fulfilled, (state, action) => {
        const index = state.risks.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.risks[index] = action.payload;
        }
      });
  },
});

export const { clearError, clearSelectedRisk } = riskSlice.actions;
export default riskSlice.reducer;
