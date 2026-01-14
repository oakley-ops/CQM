// Test Category Types
export interface TestCategory {
  id: number;
  category_code: string;
  category_name: string;
  section_number: string;
  card_type: string;
  icon?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  definitions?: TestDefinition[];
}

// Test Definition Types
export type TestType = 'measurement' | 'passfail' | 'assessment';

export interface TestDefinition {
  id: number;
  category_id: number;
  test_code: string;
  test_name: string;
  test_type: TestType;
  unit_of_measure?: string;
  min_value?: number;
  max_value?: number;
  target_value?: number;
  assessment_options?: string;
  iso_reference?: string;
  display_order: number;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: TestCategory;
}

// Test Session Types
export type SessionStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface TestSession {
  id: number;
  session_number: string;
  card_type: string;
  manufacturing_stage: string;
  batch_lot_number: string;
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

export interface TestEntry {
  id: number;
  session_id: number;
  test_definition_id: number;
  measurement_value?: number;
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
  cardType: string;
  manufacturingStage: string;
  batchLotNumber: string;
  cardSerialNumber?: string;
  testDate?: string;
  equipmentId?: string;
  generalNotes?: string;
}

export interface CreateEntryRequest {
  sessionId: number;
  testDefinitionId: number;
  measurementValue?: number;
  assessmentValue?: AssessmentValue;
  passStatus?: boolean;
  multiValueNotes?: string;
  notes?: string;
  retestRequired?: boolean;
}

export interface BulkSaveEntriesRequest {
  sessionId: number;
  entries: Omit<CreateEntryRequest, 'sessionId'>[];
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
  measurementValue?: number | string;
  assessmentValue?: AssessmentValue;
  passStatus?: boolean;
  notes?: string;
  retestRequired?: boolean;
  isValid?: boolean;
  error?: string;
}

export interface CategoryFormState {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  entries: TestEntryFormData[];
  isComplete: boolean;
}
