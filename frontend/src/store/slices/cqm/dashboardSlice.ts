/**
 * Dashboard Redux Slice
 * State management for CQM Dashboard
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dashboardService } from '../../../services/cqm';
import type { WidgetData } from '../../../types/cqm';

interface DashboardState {
  complianceMetrics: WidgetData[];
  auditMetrics: WidgetData[];
  ncMetrics: WidgetData[];
  testMetrics: WidgetData[];
  productionMetrics: WidgetData[];
  certificationMetrics: WidgetData[];
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  complianceMetrics: [],
  auditMetrics: [],
  ncMetrics: [],
  testMetrics: [],
  productionMetrics: [],
  certificationMetrics: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchAll',
  async () => {
    const response = await dashboardService.getCQMDashboard();
    return response.data;
  }
);

export const fetchComplianceMetrics = createAsyncThunk(
  'dashboard/fetchCompliance',
  async () => {
    const response = await dashboardService.getComplianceMetrics();
    return response.data;
  }
);

export const fetchAuditMetrics = createAsyncThunk(
  'dashboard/fetchAudits',
  async () => {
    const response = await dashboardService.getAuditMetrics();
    return response.data;
  }
);

// Slice
const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.complianceMetrics = action.payload.complianceMetrics;
        state.auditMetrics = action.payload.auditMetrics;
        state.ncMetrics = action.payload.ncMetrics;
        state.testMetrics = action.payload.testMetrics;
        state.productionMetrics = action.payload.productionMetrics;
        state.certificationMetrics = action.payload.certificationMetrics;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch dashboard data';
      });

    builder.addCase(fetchComplianceMetrics.fulfilled, (state, action) => {
      state.complianceMetrics = action.payload;
    });

    builder.addCase(fetchAuditMetrics.fulfilled, (state, action) => {
      state.auditMetrics = action.payload;
    });
  },
});

export const { clearError } = dashboardSlice.actions;
export default dashboardSlice.reducer;

