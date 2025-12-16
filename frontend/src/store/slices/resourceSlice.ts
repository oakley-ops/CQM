import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as resourceService from '../../services/resource/resourceService';

interface ResourceState {
  teamMembers: resourceService.TeamMember[];
  allocations: resourceService.ResourceAllocation[];
  loading: boolean;
  error: string | null;
}

const initialState: ResourceState = {
  teamMembers: [],
  allocations: [],
  loading: false,
  error: null
};

// Team Members
export const fetchTeamMembers = createAsyncThunk(
  'resource/fetchTeamMembers',
  async (projectId: number) => {
    return await resourceService.getTeamMembers(projectId);
  }
);

export const addTeamMember = createAsyncThunk(
  'resource/addTeamMember',
  async ({ projectId, data }: { projectId: number; data: Partial<resourceService.TeamMember> }) => {
    return await resourceService.createTeamMember(projectId, data);
  }
);

export const modifyTeamMember = createAsyncThunk(
  'resource/modifyTeamMember',
  async ({ projectId, memberId, data }: { projectId: number; memberId: number; data: Partial<resourceService.TeamMember> }) => {
    return await resourceService.updateTeamMember(projectId, memberId, data);
  }
);

export const removeTeamMember = createAsyncThunk(
  'resource/removeTeamMember',
  async ({ projectId, memberId }: { projectId: number; memberId: number }) => {
    await resourceService.deleteTeamMember(projectId, memberId);
    return memberId;
  }
);

// Allocations
export const fetchAllocations = createAsyncThunk(
  'resource/fetchAllocations',
  async (projectId: number) => {
    return await resourceService.getAllocations(projectId);
  }
);

export const addAllocation = createAsyncThunk(
  'resource/addAllocation',
  async ({ projectId, data }: { projectId: number; data: Partial<resourceService.ResourceAllocation> }) => {
    return await resourceService.createAllocation(projectId, data);
  }
);

export const modifyAllocation = createAsyncThunk(
  'resource/modifyAllocation',
  async ({ projectId, allocationId, data }: { projectId: number; allocationId: number; data: Partial<resourceService.ResourceAllocation> }) => {
    return await resourceService.updateAllocation(projectId, allocationId, data);
  }
);

export const removeAllocation = createAsyncThunk(
  'resource/removeAllocation',
  async ({ projectId, allocationId }: { projectId: number; allocationId: number }) => {
    await resourceService.deleteAllocation(projectId, allocationId);
    return allocationId;
  }
);

const resourceSlice = createSlice({
  name: 'resource',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Team Members
      .addCase(fetchTeamMembers.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTeamMembers.fulfilled, (state, action) => {
        state.loading = false;
        state.teamMembers = action.payload;
      })
      .addCase(fetchTeamMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch team members';
      })
      .addCase(addTeamMember.fulfilled, (state, action) => {
        state.teamMembers.push(action.payload);
      })
      .addCase(modifyTeamMember.fulfilled, (state, action) => {
        const index = state.teamMembers.findIndex(m => m.id === action.payload.id);
        if (index !== -1) {
          state.teamMembers[index] = action.payload;
        }
      })
      .addCase(removeTeamMember.fulfilled, (state, action) => {
        state.teamMembers = state.teamMembers.filter(m => m.id !== action.payload);
      })
      // Allocations
      .addCase(fetchAllocations.fulfilled, (state, action) => {
        state.allocations = action.payload;
      })
      .addCase(addAllocation.fulfilled, (state, action) => {
        state.allocations.push(action.payload);
      })
      .addCase(modifyAllocation.fulfilled, (state, action) => {
        const index = state.allocations.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
          state.allocations[index] = action.payload;
        }
      })
      .addCase(removeAllocation.fulfilled, (state, action) => {
        state.allocations = state.allocations.filter(a => a.id !== action.payload);
      });
  }
});

export default resourceSlice.reducer;
