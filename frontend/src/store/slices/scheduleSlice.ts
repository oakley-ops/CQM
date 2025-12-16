import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { taskService } from '../../services/schedule/taskService';
import { milestoneService } from '../../services/schedule/milestoneService';
import { ScheduleState, Task, Milestone } from '../../types';

const initialState: ScheduleState = {
  tasks: [],
  milestones: [],
  ganttData: null,
  loading: false,
  error: null,
};

// Task Thunks
export const fetchTasks = createAsyncThunk(
  'schedule/fetchTasks',
  async (projectId: number, { rejectWithValue }) => {
    try {
      const response = await taskService.getTasks(projectId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch tasks');
    }
  }
);

export const createTask = createAsyncThunk(
  'schedule/createTask',
  async ({ projectId, data }: { projectId: number; data: Partial<Task> }, { rejectWithValue }) => {
    try {
      const response = await taskService.createTask(projectId, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create task');
    }
  }
);

export const updateTask = createAsyncThunk(
  'schedule/updateTask',
  async ({ id, data }: { id: number; data: Partial<Task> }, { rejectWithValue }) => {
    try {
      const response = await taskService.updateTask(id, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update task');
    }
  }
);

export const updateTaskProgress = createAsyncThunk(
  'schedule/updateTaskProgress',
  async ({ id, progress }: { id: number; progress: number }, { rejectWithValue }) => {
    try {
      const response = await taskService.updateProgress(id, progress);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update progress');
    }
  }
);

export const deleteTask = createAsyncThunk(
  'schedule/deleteTask',
  async (id: number, { rejectWithValue }) => {
    try {
      await taskService.deleteTask(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete task');
    }
  }
);

export const fetchGanttData = createAsyncThunk(
  'schedule/fetchGanttData',
  async (projectId: number, { rejectWithValue }) => {
    try {
      const response = await taskService.getGanttData(projectId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch Gantt data');
    }
  }
);

// Milestone Thunks
export const fetchMilestones = createAsyncThunk(
  'schedule/fetchMilestones',
  async (projectId: number, { rejectWithValue }) => {
    try {
      const response = await milestoneService.getMilestones(projectId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch milestones');
    }
  }
);

export const createMilestone = createAsyncThunk(
  'schedule/createMilestone',
  async ({ projectId, data }: { projectId: number; data: Partial<Milestone> }, { rejectWithValue }) => {
    try {
      const response = await milestoneService.createMilestone(projectId, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create milestone');
    }
  }
);

export const deleteMilestone = createAsyncThunk(
  'schedule/deleteMilestone',
  async (id: number, { rejectWithValue }) => {
    try {
      await milestoneService.deleteMilestone(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete milestone');
    }
  }
);

const scheduleSlice = createSlice({
  name: 'schedule',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearScheduleData: (state) => {
      state.tasks = [];
      state.milestones = [];
      state.ganttData = null;
    },
  },
  extraReducers: (builder) => {
    // Tasks
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.tasks.push(action.payload);
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      })
      .addCase(updateTaskProgress.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter(t => t.id !== action.payload);
      })
      .addCase(fetchGanttData.fulfilled, (state, action) => {
        state.ganttData = action.payload;
      });

    // Milestones
    builder
      .addCase(fetchMilestones.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMilestones.fulfilled, (state, action) => {
        state.loading = false;
        state.milestones = action.payload;
      })
      .addCase(fetchMilestones.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createMilestone.fulfilled, (state, action) => {
        state.milestones.push(action.payload);
      })
      .addCase(deleteMilestone.fulfilled, (state, action) => {
        state.milestones = state.milestones.filter(m => m.id !== action.payload);
      });
  },
});

export const { clearError, clearScheduleData } = scheduleSlice.actions;
export default scheduleSlice.reducer;
