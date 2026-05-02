export interface AdhesionLogEntry {
  id: number;
  job_number: string | null;
  job_name: string | null;
  side: 'F' | 'B' | null;
  test_date: string;
  emv: boolean;
  csr: boolean;
  inks: string | null;
  screen_printed: boolean;
  core: string | null;
  core_thickness: number | null;
  overlay: string | null;
  coating: string | null;
  laminator: string | null;
  lam_temp_f: number | null;
  dwell_time_sec: number | null;
  post_cured: string | null;
  strip_a: number | null;
  strip_b: number | null;
  strip_c: number | null;
  strip_d: number | null;
  strip_e: number | null;
  strip_a_tore: boolean;
  strip_b_tore: boolean;
  strip_c_tore: boolean;
  strip_d_tore: boolean;
  strip_e_tore: boolean;
  min_lbf_cm: number | null;
  min_lbf_in: number | null;
  pass_threshold: number;
  result: 'PASS' | 'FAIL' | null;
  test_method: string;
  tape_spec_confirmed: boolean;
  exclusions: string | null;
  notes: string | null;
  created_at: string;
}

export interface AdhesionLogFormValues {
  job_number: string;
  job_name: string;
  side: 'F' | 'B' | '';
  test_date: string;
  emv: boolean;
  csr: boolean;
  inks: string;
  screen_printed: boolean;
  core: string;
  core_thickness: string;
  overlay: string;
  coating: string;
  laminator: string;
  lam_temp_f: string;
  dwell_time_sec: string;
  post_cured: string;
  strip_a: string;
  strip_b: string;
  strip_c: string;
  strip_d: string;
  strip_e: string;
  strip_a_tore: boolean;
  strip_b_tore: boolean;
  strip_c_tore: boolean;
  strip_d_tore: boolean;
  strip_e_tore: boolean;
  pass_threshold: string;
  test_method: string;
  tape_spec_confirmed: boolean;
  exclusions: string;
  notes: string;
}

export interface AdhesionLogListResponse {
  total: number;
  page: number;
  limit: number;
  rows: AdhesionLogEntry[];
}
