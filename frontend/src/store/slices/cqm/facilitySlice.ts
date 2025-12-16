/**
 * Facility Redux Slice
 * State management for Manufacturing Facilities
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { facilityService } from '../../../services/cqm';
import type {
  ManufacturingFacility,
  FacilityFormData,
  FacilityFilters,
  FacilityStatistics,
  PaginationMeta,
} from '../../../types/cqm';

interface FacilityState {
  facilities: ManufacturingFacility[];
  selectedFacility: ManufacturingFacility | null;
  statistics: FacilityStatistics | null;
  loading: boolean;
  error: string | null;
  filters: FacilityFilters;
  pagination: PaginationMeta | null;
}

const initialState: FacilityState = {
  facilities: [],
  selectedFacility: null,
  statistics: null,
  loading: false,
  error: null,
  filters: {
    page: 1,
    limit: 10,
  },
  pagination: null,
};

// Async thunks
export const fetchFacilities = createAsyncThunk(
  'facility/fetchAll',
  async (filters?: FacilityFilters) => {
    const response = await facilityService.getAllFacilities(filters);
    return response;
  }
);

export const fetchFacilityById = createAsyncThunk(
  'facility/fetchById',
  async (id: number) => {
    const response = await facilityService.getFacilityById(id);
    return response.data;
  }
);

export const createFacility = createAsyncThunk(
  'facility/create',
  async (data: FacilityFormData) => {
    const response = await facilityService.createFacility(data);
    return response.data;
  }
);

export const updateFacility = createAsyncThunk(
  'facility/update',
  async ({ id, data }: { id: number; data: Partial<FacilityFormData> }) => {
    const response = await facilityService.updateFacility(id, data);
    return response.data;
  }
);

export const deleteFacility = createAsyncThunk(
  'facility/delete',
  async (id: number) => {
    await facilityService.deleteFacility(id);
    return id;
  }
);

export const fetchFacilityStatistics = createAsyncThunk(
  'facility/fetchStatistics',
  async () => {
    const response = await facilityService.getFacilityStatistics();
    return response.data;
  }
);

// Slice
const facilitySlice = createSlice({
  name: 'facility',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<FacilityFilters>) => {
      state.filters = action.payload;
    },
    clearSelectedFacility: (state) => {
      state.selectedFacility = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch all facilities
    builder
      .addCase(fetchFacilities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFacilities.fulfilled, (state, action) => {
        state.loading = false;
        state.facilities = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchFacilities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch facilities';
      });

    // Fetch facility by ID
    builder
      .addCase(fetchFacilityById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFacilityById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedFacility = action.payload;
      })
      .addCase(fetchFacilityById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch facility';
      });

    // Create facility
    builder
      .addCase(createFacility.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createFacility.fulfilled, (state, action) => {
        state.loading = false;
        state.facilities.unshift(action.payload);
      })
      .addCase(createFacility.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create facility';
      });

    // Update facility
    builder
      .addCase(updateFacility.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateFacility.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.facilities.findIndex((f) => f.id === action.payload.id);
        if (index !== -1) {
          state.facilities[index] = action.payload;
        }
        if (state.selectedFacility?.id === action.payload.id) {
          state.selectedFacility = action.payload;
        }
      })
      .addCase(updateFacility.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update facility';
      });

    // Delete facility
    builder
      .addCase(deleteFacility.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteFacility.fulfilled, (state, action) => {
        state.loading = false;
        state.facilities = state.facilities.filter((f) => f.id !== action.payload);
        if (state.selectedFacility?.id === action.payload) {
          state.selectedFacility = null;
        }
      })
      .addCase(deleteFacility.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete facility';
      });

    // Fetch statistics
    builder
      .addCase(fetchFacilityStatistics.fulfilled, (state, action) => {
        state.statistics = action.payload;
      });
  },
});

export const { setFilters, clearSelectedFacility, clearError } = facilitySlice.actions;
export default facilitySlice.reducer;

