import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as jobService from '../../../services/cqm/jobService';
import type {
  Job,
  JobStatistics,
  ControlChartData,
  SPCData,
  JobsListParams,
  JobsListResponse,
  CreateJobRequest,
  UpdateJobRequest,
} from '../../../types/cqm';

interface JobState {
  jobs: Job[];
  pagination: { total: number; page: number; limit: number; pages: number } | null;
  selectedJob: Job | null;
  statistics: JobStatistics | null;
  controlChart: ControlChartData | null;
  spcData: SPCData | null;
  loading: boolean;
  statsLoading: boolean;
  chartLoading: boolean;
  spcLoading: boolean;
  error: string | null;
}

const initialState: JobState = {
  jobs: [],
  pagination: null,
  selectedJob: null,
  statistics: null,
  controlChart: null,
  spcData: null,
  loading: false,
  statsLoading: false,
  chartLoading: false,
  spcLoading: false,
  error: null,
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async (params: JobsListParams | undefined, { rejectWithValue }) => {
    try {
      return await jobService.listJobs(params);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch jobs');
    }
  }
);

export const fetchJob = createAsyncThunk(
  'jobs/fetchJob',
  async (jobNumber: string, { rejectWithValue }) => {
    try {
      return await jobService.getJob(jobNumber);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch job');
    }
  }
);

export const createJob = createAsyncThunk(
  'jobs/createJob',
  async (data: CreateJobRequest, { rejectWithValue }) => {
    try {
      return await jobService.createJob(data);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create job');
    }
  }
);

export const updateJob = createAsyncThunk(
  'jobs/updateJob',
  async ({ jobNumber, data }: { jobNumber: string; data: UpdateJobRequest }, { rejectWithValue }) => {
    try {
      return await jobService.updateJob(jobNumber, data);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update job');
    }
  }
);

export const deleteJob = createAsyncThunk(
  'jobs/deleteJob',
  async (jobNumber: string, { rejectWithValue }) => {
    try {
      await jobService.deleteJob(jobNumber);
      return jobNumber;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete job');
    }
  }
);

export const fetchJobStatistics = createAsyncThunk(
  'jobs/fetchStatistics',
  async (jobNumber: string, { rejectWithValue }) => {
    try {
      return await jobService.getJobStatistics(jobNumber);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch statistics');
    }
  }
);

export const fetchJobControlChart = createAsyncThunk(
  'jobs/fetchControlChart',
  async (
    { jobNumber, testDefinitionId }: { jobNumber: string; testDefinitionId: number },
    { rejectWithValue }
  ) => {
    try {
      return await jobService.getJobControlChart(jobNumber, testDefinitionId);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch chart data');
    }
  }
);

export const fetchJobSPC = createAsyncThunk(
  'jobs/fetchSPC',
  async (
    { jobNumber, testDefinitionId }: { jobNumber: string; testDefinitionId: number },
    { rejectWithValue }
  ) => {
    try {
      return await jobService.getJobSPC(jobNumber, testDefinitionId);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch SPC data');
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const jobSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    clearSelectedJob(state) {
      state.selectedJob = null;
      state.statistics = null;
      state.controlChart = null;
      state.spcData = null;
    },
    clearControlChart(state) {
      state.controlChart = null;
    },
    clearSpcData(state) {
      state.spcData = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: builder => {
    // fetchJobs
    builder
      .addCase(fetchJobs.pending, state => { state.loading = true; state.error = null; })
      .addCase(fetchJobs.fulfilled, (state, action: PayloadAction<JobsListResponse>) => {
        state.loading = false;
        state.jobs = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // fetchJob
    builder
      .addCase(fetchJob.pending, state => { state.loading = true; state.error = null; })
      .addCase(fetchJob.fulfilled, (state, action: PayloadAction<Job>) => {
        state.loading = false;
        state.selectedJob = action.payload;
      })
      .addCase(fetchJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // createJob
    builder
      .addCase(createJob.pending, state => { state.loading = true; state.error = null; })
      .addCase(createJob.fulfilled, (state, action: PayloadAction<Job>) => {
        state.loading = false;
        state.jobs.unshift(action.payload);
      })
      .addCase(createJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // updateJob
    builder
      .addCase(updateJob.fulfilled, (state, action: PayloadAction<Job>) => {
        const idx = state.jobs.findIndex(j => j.job_number === action.payload.job_number);
        if (idx !== -1) state.jobs[idx] = action.payload;
        if (state.selectedJob?.job_number === action.payload.job_number) {
          state.selectedJob = { ...state.selectedJob, ...action.payload };
        }
      });

    // deleteJob
    builder
      .addCase(deleteJob.fulfilled, (state, action: PayloadAction<string>) => {
        state.jobs = state.jobs.filter(j => j.job_number !== action.payload);
        if (state.pagination) state.pagination.total -= 1;
      });

    // fetchJobStatistics
    builder
      .addCase(fetchJobStatistics.pending, state => { state.statsLoading = true; state.error = null; })
      .addCase(fetchJobStatistics.fulfilled, (state, action: PayloadAction<JobStatistics>) => {
        state.statsLoading = false;
        state.statistics = action.payload;
      })
      .addCase(fetchJobStatistics.rejected, (state, action) => {
        state.statsLoading = false;
        state.error = action.payload as string;
      });

    // fetchJobControlChart
    builder
      .addCase(fetchJobControlChart.pending, state => { state.chartLoading = true; })
      .addCase(fetchJobControlChart.fulfilled, (state, action: PayloadAction<ControlChartData>) => {
        state.chartLoading = false;
        state.controlChart = action.payload;
      })
      .addCase(fetchJobControlChart.rejected, state => { state.chartLoading = false; });

    // fetchJobSPC
    builder
      .addCase(fetchJobSPC.pending, state => { state.spcLoading = true; state.spcData = null; })
      .addCase(fetchJobSPC.fulfilled, (state, action: PayloadAction<SPCData>) => {
        state.spcLoading = false;
        state.spcData = action.payload;
      })
      .addCase(fetchJobSPC.rejected, state => { state.spcLoading = false; });
  }
});

export const { clearSelectedJob, clearControlChart, clearSpcData, clearError } = jobSlice.actions;
export default jobSlice.reducer;
