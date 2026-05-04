export type RunStatus = 'queued' | 'running' | 'completed' | 'failed';
export type DatasetFormat = 'jsonl' | 'csv';

export interface AutodataRunConfig {
  dateFrom?: string;
  dateTo?: string;
  cardTypes?: string[];
  categoryIds?: number[];
  format?: DatasetFormat;
}

export interface AutodataRunStats {
  collected: number;
  profiled: Record<string, unknown>;
  annotated: number;
  valid: number;
  rejected: number;
  quality_rate: number;
}

export interface AutodataRun {
  id: number;
  run_name: string;
  status: RunStatus;
  config?: AutodataRunConfig;
  stats?: AutodataRunStats;
  sample_count?: number;
  dataset_path?: string;
  dataset_format?: DatasetFormat;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}
