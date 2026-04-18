// ── Kappa / Attribute Agreement Analysis types ────────────────────────────────

export type AttributeType = 'passfail' | 'categorical';
export type ReferenceType = 'predefined' | 'master_appraiser';
export type StudyStatus = 'open' | 'complete';

export interface KappaAppraiserSummary {
  id: number;
  name: string;
  username?: string;
  email?: string;
}

export interface KappaStudy {
  id: number;
  study_name: string;
  test_definition_id: number | null;
  category_id: number | null;
  card_type: string | null;
  sample_count: number;
  trial_count: number;
  attribute_type: AttributeType;
  attribute_options: string[];
  reference_type: ReferenceType;
  reference_data: Record<string, string> | null;  // { "1": "Pass", "2": "Fail" }
  master_appraiser_id: number | null;
  status: StudyStatus;
  notes: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;

  // Joined
  creator?: KappaAppraiserSummary;
  masterAppraiser?: KappaAppraiserSummary;
  testDefinition?: { id: number; test_name: string; test_id: string };
  category?: { id: number; name: string; category_code: string };
  appraisers?: KappaAppraiserSummary[];
  ratings?: KappaRating[];

  // Computed (list view only, server-injected)
  creator_name?: string;
  appraiser_count?: number;
  worst_within_kappa?: number | null;
  fleiss_kappa?: number | null;
  overall_passed?: boolean | null;
}

export interface KappaRating {
  id: number;
  study_id: number;
  appraiser_id: number;
  sample_number: number;
  trial_number: number;
  rating: string;
  created_at: string;
  appraiser_name?: string;
}

// ── Computed results ──────────────────────────────────────────────────────────

export interface ConfusionMatrix {
  matrix: Record<string, Record<string, number>>;
  categories: string[];
}

export interface PerAppraiserResult {
  userId: number;
  name: string;
  completeSamples: number;
  withinKappa: number | null;
  vsReferenceKappa: number | null;
  trialAgreementPct: number | null;
  effectivePct: number | null;
  withinInterpretation: string;
  vsRefInterpretation: string;
  confusion: ConfusionMatrix | null;
}

export interface PairwiseKappa {
  appraiserA: { id: number; name: string };
  appraiserB: { id: number; name: string };
  kappa: number | null;
  interpretation: string;
}

export interface BetweenAppraisersResult {
  fleissKappa: number | null;
  fleissInterpretation: string;
  pairwiseKappa: PairwiseKappa[];
  overallAgreementPct: number | null;
  raterCount: number;
  evaluatedSamples: number;
}

export interface KappaGate {
  threshold: number;
  withinPassed: boolean;
  betweenPassed: boolean;
  vsRefPassed: boolean;
  overallPassed: boolean;
  hasReference: boolean;
}

export interface KappaResults {
  perAppraiser: PerAppraiserResult[];
  betweenAppraisers: BetweenAppraisersResult;
  gate: KappaGate;
  meta: {
    sampleCount: number;
    trialCount: number;
    categories: string[];
    completedBy: number;
  };
}

export interface KappaTrendPoint {
  study_id: number;
  study_name: string;
  date: string;
  fleiss_kappa: number | null;
  worst_within_kappa: number | null;
  overall_passed: boolean;
}

// ── Form / create ─────────────────────────────────────────────────────────────

export interface CreateStudyPayload {
  study_name: string;
  test_definition_id?: number | null;
  category_id?: number | null;
  card_type?: string;
  sample_count: number;
  trial_count: number;
  attribute_type: AttributeType;
  attribute_options: string[];
  reference_type: ReferenceType;
  reference_data?: Record<string, string> | null;
  master_appraiser_id?: number | null;
  notes?: string;
  appraiser_ids: number[];
}

export interface SubmitRatingsPayload {
  appraiser_id: number;
  ratings: { sample_number: number; trial_number: number; rating: string }[];
}
