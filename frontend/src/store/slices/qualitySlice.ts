import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import qualityMetricService, { QualityMetric, QualityMetricSummary, CreateQualityMetricDto, UpdateQualityMetricDto } from '../../services/quality/qualityMetricService';
import inspectionService, { QualityInspection, CreateInspectionDto, UpdateInspectionDto } from '../../services/quality/inspectionService';
import defectService, { Defect, DefectSummary, CreateDefectDto, UpdateDefectDto } from '../../services/quality/defectService';

interface QualityState {
  metrics: QualityMetric[];
  metricsSummary: QualityMetricSummary | null;
  inspections: QualityInspection[];
  defects: Defect[];
  defectsSummary: DefectSummary | null;
  selectedMetric: QualityMetric | null;
  selectedInspection: QualityInspection | null;
  selectedDefect: Defect | null;
  loading: boolean;
  error: string | null;
}

const initialState: QualityState = {
  metrics: [],
  metricsSummary: null,
  inspections: [],
  defects: [],
  defectsSummary: null,
  selectedMetric: null,
  selectedInspection: null,
  selectedDefect: null,
  loading: false,
  error: null,
};

// Quality Metrics Thunks
export const fetchMetrics = createAsyncThunk(
  'quality/fetchMetrics',
  async (projectId: number) => {
    return await qualityMetricService.getMetrics(projectId);
  }
);

export const fetchMetric = createAsyncThunk(
  'quality/fetchMetric',
  async (metricId: number) => {
    return await qualityMetricService.getMetric(metricId);
  }
);

export const fetchMetricsSummary = createAsyncThunk(
  'quality/fetchMetricsSummary',
  async (projectId: number) => {
    return await qualityMetricService.getSummary(projectId);
  }
);

export const createMetric = createAsyncThunk(
  'quality/createMetric',
  async ({ projectId, data }: { projectId: number; data: CreateQualityMetricDto }) => {
    return await qualityMetricService.createMetric(projectId, data);
  }
);

export const updateMetric = createAsyncThunk(
  'quality/updateMetric',
  async ({ metricId, data }: { metricId: number; data: UpdateQualityMetricDto }) => {
    return await qualityMetricService.updateMetric(metricId, data);
  }
);

export const deleteMetric = createAsyncThunk(
  'quality/deleteMetric',
  async (metricId: number) => {
    await qualityMetricService.deleteMetric(metricId);
    return metricId;
  }
);

// Inspections Thunks
export const fetchInspections = createAsyncThunk(
  'quality/fetchInspections',
  async (projectId: number) => {
    return await inspectionService.getInspections(projectId);
  }
);

export const fetchInspection = createAsyncThunk(
  'quality/fetchInspection',
  async (inspectionId: number) => {
    return await inspectionService.getInspection(inspectionId);
  }
);

export const createInspection = createAsyncThunk(
  'quality/createInspection',
  async ({ projectId, data }: { projectId: number; data: CreateInspectionDto }) => {
    return await inspectionService.createInspection(projectId, data);
  }
);

export const updateInspection = createAsyncThunk(
  'quality/updateInspection',
  async ({ inspectionId, data }: { inspectionId: number; data: UpdateInspectionDto }) => {
    return await inspectionService.updateInspection(inspectionId, data);
  }
);

export const deleteInspection = createAsyncThunk(
  'quality/deleteInspection',
  async (inspectionId: number) => {
    await inspectionService.deleteInspection(inspectionId);
    return inspectionId;
  }
);

export const completeInspection = createAsyncThunk(
  'quality/completeInspection',
  async ({ inspectionId, data }: { inspectionId: number; data: any }) => {
    return await inspectionService.completeInspection(inspectionId, data);
  }
);

export const approveInspection = createAsyncThunk(
  'quality/approveInspection',
  async (inspectionId: number) => {
    return await inspectionService.approveInspection(inspectionId);
  }
);

export const rejectInspection = createAsyncThunk(
  'quality/rejectInspection',
  async ({ inspectionId, data }: { inspectionId: number; data?: any }) => {
    return await inspectionService.rejectInspection(inspectionId, data);
  }
);

// Defects Thunks
export const fetchDefects = createAsyncThunk(
  'quality/fetchDefects',
  async (projectId: number) => {
    return await defectService.getDefects(projectId);
  }
);

export const fetchDefect = createAsyncThunk(
  'quality/fetchDefect',
  async (defectId: number) => {
    return await defectService.getDefect(defectId);
  }
);

export const fetchDefectsSummary = createAsyncThunk(
  'quality/fetchDefectsSummary',
  async (projectId: number) => {
    return await defectService.getSummary(projectId);
  }
);

export const createDefect = createAsyncThunk(
  'quality/createDefect',
  async ({ projectId, data }: { projectId: number; data: CreateDefectDto }) => {
    return await defectService.createDefect(projectId, data);
  }
);

export const updateDefect = createAsyncThunk(
  'quality/updateDefect',
  async ({ defectId, data }: { defectId: number; data: UpdateDefectDto }) => {
    return await defectService.updateDefect(defectId, data);
  }
);

export const deleteDefect = createAsyncThunk(
  'quality/deleteDefect',
  async (defectId: number) => {
    await defectService.deleteDefect(defectId);
    return defectId;
  }
);

export const assignDefect = createAsyncThunk(
  'quality/assignDefect',
  async ({ defectId, userId }: { defectId: number; userId: number }) => {
    return await defectService.assignDefect(defectId, userId);
  }
);

export const resolveDefect = createAsyncThunk(
  'quality/resolveDefect',
  async ({ defectId, resolution }: { defectId: number; resolution: string }) => {
    return await defectService.resolveDefect(defectId, resolution);
  }
);

export const closeDefect = createAsyncThunk(
  'quality/closeDefect',
  async (defectId: number) => {
    return await defectService.closeDefect(defectId);
  }
);

const qualitySlice = createSlice({
  name: 'quality',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedMetric: (state) => {
      state.selectedMetric = null;
    },
    clearSelectedInspection: (state) => {
      state.selectedInspection = null;
    },
    clearSelectedDefect: (state) => {
      state.selectedDefect = null;
    },
  },
  extraReducers: (builder) => {
    // Metrics
    builder
      .addCase(fetchMetrics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMetrics.fulfilled, (state, action) => {
        state.loading = false;
        state.metrics = action.payload;
      })
      .addCase(fetchMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch metrics';
      })
      .addCase(fetchMetric.fulfilled, (state, action) => {
        state.selectedMetric = action.payload;
      })
      .addCase(fetchMetricsSummary.fulfilled, (state, action) => {
        state.metricsSummary = action.payload;
      })
      .addCase(createMetric.fulfilled, (state, action) => {
        state.metrics.push(action.payload);
      })
      .addCase(updateMetric.fulfilled, (state, action) => {
        const index = state.metrics.findIndex(m => m.id === action.payload.id);
        if (index !== -1) {
          state.metrics[index] = action.payload;
        }
        if (state.selectedMetric?.id === action.payload.id) {
          state.selectedMetric = action.payload;
        }
      })
      .addCase(deleteMetric.fulfilled, (state, action) => {
        state.metrics = state.metrics.filter(m => m.id !== action.payload);
      })
      
      // Inspections
      .addCase(fetchInspections.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInspections.fulfilled, (state, action) => {
        state.loading = false;
        state.inspections = action.payload;
      })
      .addCase(fetchInspections.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch inspections';
      })
      .addCase(fetchInspection.fulfilled, (state, action) => {
        state.selectedInspection = action.payload;
      })
      .addCase(createInspection.fulfilled, (state, action) => {
        state.inspections.push(action.payload);
      })
      .addCase(updateInspection.fulfilled, (state, action) => {
        const index = state.inspections.findIndex(i => i.id === action.payload.id);
        if (index !== -1) {
          state.inspections[index] = action.payload;
        }
        if (state.selectedInspection?.id === action.payload.id) {
          state.selectedInspection = action.payload;
        }
      })
      .addCase(deleteInspection.fulfilled, (state, action) => {
        state.inspections = state.inspections.filter(i => i.id !== action.payload);
      })
      .addCase(completeInspection.fulfilled, (state, action) => {
        const index = state.inspections.findIndex(i => i.id === action.payload.id);
        if (index !== -1) {
          state.inspections[index] = action.payload;
        }
      })
      .addCase(approveInspection.fulfilled, (state, action) => {
        const index = state.inspections.findIndex(i => i.id === action.payload.id);
        if (index !== -1) {
          state.inspections[index] = action.payload;
        }
      })
      .addCase(rejectInspection.fulfilled, (state, action) => {
        const index = state.inspections.findIndex(i => i.id === action.payload.id);
        if (index !== -1) {
          state.inspections[index] = action.payload;
        }
      })
      
      // Defects
      .addCase(fetchDefects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDefects.fulfilled, (state, action) => {
        state.loading = false;
        state.defects = action.payload;
      })
      .addCase(fetchDefects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch defects';
      })
      .addCase(fetchDefect.fulfilled, (state, action) => {
        state.selectedDefect = action.payload;
      })
      .addCase(fetchDefectsSummary.fulfilled, (state, action) => {
        state.defectsSummary = action.payload;
      })
      .addCase(createDefect.fulfilled, (state, action) => {
        state.defects.push(action.payload);
      })
      .addCase(updateDefect.fulfilled, (state, action) => {
        const index = state.defects.findIndex(d => d.id === action.payload.id);
        if (index !== -1) {
          state.defects[index] = action.payload;
        }
        if (state.selectedDefect?.id === action.payload.id) {
          state.selectedDefect = action.payload;
        }
      })
      .addCase(deleteDefect.fulfilled, (state, action) => {
        state.defects = state.defects.filter(d => d.id !== action.payload);
      })
      .addCase(assignDefect.fulfilled, (state, action) => {
        const index = state.defects.findIndex(d => d.id === action.payload.id);
        if (index !== -1) {
          state.defects[index] = action.payload;
        }
      })
      .addCase(resolveDefect.fulfilled, (state, action) => {
        const index = state.defects.findIndex(d => d.id === action.payload.id);
        if (index !== -1) {
          state.defects[index] = action.payload;
        }
      })
      .addCase(closeDefect.fulfilled, (state, action) => {
        const index = state.defects.findIndex(d => d.id === action.payload.id);
        if (index !== -1) {
          state.defects[index] = action.payload;
        }
      });
  },
});

export const { clearError, clearSelectedMetric, clearSelectedInspection, clearSelectedDefect } = qualitySlice.actions;
export default qualitySlice.reducer;
