// Test Category Types
export interface TestCategory {
  id: number;
  category_code: string;
  category_name: string;
  section_number: string;
  card_type: string;
  qualification_sample_size: number;
  monitoring_sample_size: number;
  monitoring_frequency_days?: number | null;
  qualification_valid_months?: number | null;
  icon?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  definitions?: TestDefinition[];
  testCount?: number;
}

// Test Definition Types
export type TestType = 'measurement' | 'passfail' | 'assessment';

export interface TestDefinition {
  id: number;
  category_id: number;
  test_id: string;
  test_name: string;
  short_name?: string;
  test_type: TestType;
  test_frequency?: string;
  // Measurement fields — match DB column names exactly
  unit_of_measurement?: string;
  min_acceptable_value?: number;
  max_acceptable_value?: number;
  target_value?: number;
  tolerance?: number;
  measurement_type?: string;
  // Standard reference
  iso_standard?: string;
  standard_section?: string;
  standard_requirement?: string;
  // Descriptive fields
  description?: string;
  purpose?: string;
  pass_criteria?: string;
  fail_criteria?: string;
  notes?: string;
  procedure?: string;
  test_conditions?: string;
  equipment_required?: string;
  // CQM-specific
  sample_size?: number;
  is_mandatory: boolean;
  is_cqm_required?: boolean;
  risk_level?: string;
  calibration_required?: boolean;
  // Metadata
  version?: string;
  status: string;
  created_at: string;
  updated_at: string;
  category?: TestCategory;
}

// Test Session Types
export type SessionStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type SessionType = 'Qualification' | 'Monitoring';

export interface TestSession {
  id: number;
  session_number: string;
  session_type: SessionType;
  job_name?: string;
  card_type: string;
  manufacturing_stage?: string;
  batch_lot_number: string;
  cat_number?: string;
  card_serial_number?: string;
  test_date: string;
  inspector_id: number;
  status: SessionStatus;
  equipment_id?: string;
  general_notes?: string;
  submitted_at?: string;
  approved_by?: number;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  inspector?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  approver?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  entries?: TestEntry[];
  totalTests?: number;
  passedTests?: number;
  failedTests?: number;
  passRate?: number;
}

// Test Entry Types
export type AssessmentValue = 'Excellent' | 'Good' | 'Acceptable' | 'Poor';

// Sample Card Types
export interface SampleCard {
  id: number;
  session_id: number;
  category_id?: number;
  card_number: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CardEntryData {
  sampleCardId: number;
  cardNumber: number;
  passStatus?: boolean;
  measurementValue?: number | string;
  secondaryMeasurementValue?: number | null; // e.g. embossed warpage; null = N/A
  secondaryIsNA?: boolean;
  assessmentValue?: AssessmentValue;
  notes?: string;
  retestRequired?: boolean;
  isValid?: boolean;
  // Width & Height fields (#3002# / IT-PHY-001)
  widthMm?: number | string;
  heightMm?: number | string;
  punchPosition?: string;
  // Corner impact fields
  cornerA?: 'PASS' | 'FAIL' | 'NO TEST';
  cornerB?: 'PASS' | 'FAIL' | 'NO TEST';
  cornerC?: 'PASS' | 'FAIL' | 'NO TEST';
  cornerD?: 'PASS' | 'FAIL' | 'NO TEST';
  cornerAExtent?: string;
  cornerBExtent?: string;
  cornerCExtent?: string;
  cornerDExtent?: string;
  coreDelamination?: boolean;
  visualNote?: string;
}

/** Header-level metadata for specialized test forms (warpage, solidity, etc.) */
export interface TestEntryMetadata {
  sampledBy?: string;
  technician?: string;
  testDate?: string;             // "YYYY-MM-DD"
  testTime?: string;             // "HH:MM"
  temperatureC?: number | string;
  humidityPct?: number | string;
  calibrationVerified?: boolean;
  calibrationValidUntil?: string;
  envLoggerId?: string;
  calValidUntil?: string;
  samplePreconditioned?: boolean;
  jobNotes?: string;
  // Corner impact specific
  fixtureId?: string;            // Corner Impact Fixture ID#
  fixtureCalValidUntil?: string; // Calibration Valid Until for the fixture
  /** Catch-all for form-specific fields stored in extra_data JSONB on the backend */
  extraData?: Record<string, unknown>;
}

export interface UpsertEntryMetadataRequest {
  sessionId: number;
  testDefinitionId: number;
  metadata: TestEntryMetadata;
}

export interface TestEntry {
  id: number;
  session_id: number;
  test_definition_id: number;
  sample_card_id?: number;
  measurement_value?: number;
  secondary_measurement_value?: number;
  assessment_value?: AssessmentValue;
  pass_status?: boolean;
  multi_value_notes?: string;
  notes?: string;
  retest_required: boolean;
  created_at: string;
  updated_at: string;
  definition?: TestDefinition;
  session?: TestSession;
}

// API Request/Response Types
export interface CreateSessionRequest {
  jobNumber?: string;
  jobName?: string;
  sessionType?: SessionType;
  cardType?: string;
  batchLotNumber: string;
  catNumber?: string;
  testDate?: string;
  sampleCardCount?: number;
}

export interface CreateEntryRequest {
  sessionId: number;
  testDefinitionId: number;
  sampleCardId?: number;
  measurementValue?: number;
  secondaryMeasurementValue?: number;
  assessmentValue?: AssessmentValue;
  passStatus?: boolean;
  multiValueNotes?: string;
  notes?: string;
  retestRequired?: boolean;
}

export interface BulkSaveEntriesRequest {
  sessionId: number;
  entries: (Omit<CreateEntryRequest, 'sessionId'> & { sampleCardId?: number; secondaryMeasurementValue?: number })[];
}

export interface BulkSaveEntriesResponse {
  savedCount: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
}

export interface SessionsListParams {
  page?: number;
  limit?: number;
  status?: SessionStatus;
  sessionType?: SessionType;
  cardType?: string;
  batchLotNumber?: string;
  startDate?: string;
  endDate?: string;
  inspectorId?: number;
}

export interface SessionsListResponse {
  success: boolean;
  data: TestSession[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Rejection Root Cause
export interface RejectionCause {
  testName: string;
  testId: string;
  categoryName: string;
  categoryCode: string;
  failureCount: number;
  sessionsAffected: number;
}

export interface RejectionBreakdown {
  causes: RejectionCause[];
  totalFailedEntries: number;
  periodDays: number;
}

// Qualification / Monitoring Compliance Status
export type QualificationStatusValue = 'qualified' | 're-qual-pending' | 'unqualified';

export interface QualificationStatus {
  status: QualificationStatusValue;
  lastQualification: TestSession | null;
  isExpired: boolean;
  daysUntilExpiry: number | null;
  lastMonitoring: TestSession | null;
  monitoringOverdue: boolean;
  daysSinceLastMonitoring: number | null;
  requiredFrequencyDays: number | null;
}

// KPI Types
export type KPIStatus = 'green' | 'yellow' | 'red' | 'grey';

export interface KPIResult {
  kpiKey: string;
  kpiName: string;
  description: string;
  currentValue: number | null;
  targetValue: number;
  warningThreshold: number | null;
  unit: string;
  higherIsBetter: boolean;
  status: KPIStatus;
}

export interface KPIHistoryPoint {
  month: string;
  overallPassRate: number | null;
  firstPassYield: number | null;
  rejectionRate: number | null;
  avgDaysToApprove: number | null;
  sessionCount: number;
}

// Dashboard Metrics Types
export interface TestEntryMetrics {
  testsToday: number;
  testsThisWeek: number;
  testsThisMonth: number;
  overallPassRate: number;
  sessionsCount: {
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
  };
  testsByCategory: {
    categoryCode: string;
    categoryName: string;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: number;
  }[];
  passRateTrend: {
    date: string;
    passRate: number;
    totalTests: number;
  }[];
  recentSessions: TestSession[];
}

// Form State Types (for local form management)
export interface TestEntryFormData {
  testDefinitionId: number;
  testCode: string;
  testName: string;
  testType: TestType;
  testFrequency?: string;
  isPerCard?: boolean;
  sampleCount?: number;
  cardEntries?: CardEntryData[];
  measurementValue?: number | string;
  assessmentValue?: AssessmentValue;
  passStatus?: boolean;
  notes?: string;
  retestRequired?: boolean;
  isValid?: boolean;
  error?: string;
  testCategory?: 'Qualification' | 'Monitoring' | 'Sampling' | 'Training';
  specializedMetadata?: TestEntryMetadata;
}

export interface CategoryFormState {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  entries: TestEntryFormData[];
  isComplete: boolean;
}
