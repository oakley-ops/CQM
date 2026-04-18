// ─── Job Entity ───────────────────────────────────────────────────────────────

export type JobStatus = 'active' | 'completed' | 'on_hold' | 'cancelled';

export interface Job {
  id: number;
  job_number: string;
  card_type?: string;
  status: JobStatus;
  start_date?: string;
  end_date?: string;
  description?: string;
  customer_reference?: string;
  source_file?: string;
  session_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateJobRequest {
  job_number: string;
  card_type?: string;
  status?: JobStatus;
  start_date?: string;
  end_date?: string;
  description?: string;
  customer_reference?: string;
}

export interface UpdateJobRequest {
  card_type?: string;
  status?: JobStatus;
  start_date?: string;
  end_date?: string;
  description?: string;
  customer_reference?: string;
}

// ─── Job Statistics ───────────────────────────────────────────────────────────

export interface JobMeasurementStat {
  test_definition_id: number;
  test_name: string;
  unit?: string;
  spec_min?: number | null;
  spec_max?: number | null;
  n: number;
  mean: number | null;
  std_dev: number | null;
  min_val: number | null;
  max_val: number | null;
  fail_count: number;
  assessed_count: number;
  cpk?: number | null;
  spec_valid?: boolean;
}

export interface JobOperatorStat {
  operator_name?: string;
  session_count: number;
  pass_count: number;
  fail_count: number;
}

export interface JobStatistics {
  job_number: string;
  job_id: number;
  card_type?: string;
  status: JobStatus;
  date_range: { start?: string; end?: string };
  summary: {
    total_sessions: number;
    total_entries: number;
    pass_count: number;
    fail_count: number;
    pass_rate?: number | null;
  };
  measurements: JobMeasurementStat[];
  operators: JobOperatorStat[];
}

// ─── Control Chart ────────────────────────────────────────────────────────────

export interface ControlChartPoint {
  session_id: number;
  session_number?: string;
  test_date: string;
  equipment_id?: string;
  operator_name?: string;
  measurement_value: number;
  pass_status?: boolean;
  card_identifier?: string;
}

export interface ControlChartSession {
  session_id: number;
  session_number?: string;
  test_date: string;
  equipment_id?: string;
  operator_name?: string;
  measurements: Array<{ value: number; pass_status?: boolean; card_identifier?: string }>;
  session_mean: number;
}

export interface ControlChartData {
  job_number: string;
  test_definition_id: number;
  test_name: string;
  unit?: string;
  spec_min?: number | null;
  spec_max?: number | null;
  target?: number | null;
  points: ControlChartPoint[];
  sessions: ControlChartSession[];
}

// ─── SPC Analysis ─────────────────────────────────────────────────────────────

export interface SPCIndividual {
  idx: number;
  value: number;
  out_of_control: boolean;
  out_of_spec: boolean;
  session_id?: number;
  session_number?: string;
  date?: string;
  card_identifier?: string;
  operator_name?: string;
  pass_status?: boolean;
}

export interface SPCMovingRange {
  idx: number;
  mr_value: number;
  out_of_control: boolean;
}

export interface SPCCapability {
  cp: number | null;
  cpk: number | null;
  cpu?: number | null;
  cpl?: number | null;
  pp: number | null;
  ppk: number | null;
  sigma_within: number;
  sigma_overall: number;
  spec_valid: boolean;
}

export interface SPCHistogramBin {
  bin_center: number;
  bin_start: number;
  bin_end: number;
  count: number;
  in_spec: boolean;
}

export interface SPCViolation {
  rule: number;
  description: string;
  indices: number[];
}

export interface SPCData {
  job_number: string;
  test_definition_id: number;
  test_name: string;
  unit?: string;
  spec_min: number | null;
  spec_max: number | null;
  target?: number | null;
  n: number;
  x_bar: number;
  sigma_within: number;
  sigma_overall: number;
  mr_bar: number;
  ucl_i: number;
  lcl_i: number;
  ucl_mr: number;
  lcl_mr: number;
  individuals: SPCIndividual[];
  moving_ranges: SPCMovingRange[];
  capability: SPCCapability | null;
  spec_valid: boolean;
  violations: SPCViolation[];
  histogram: SPCHistogramBin[];
  error?: string;
}

// ─── List Query Params ────────────────────────────────────────────────────────

export interface JobsListParams {
  search?: string;
  status?: JobStatus;
  card_type?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface JobsListResponse {
  data: Job[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
