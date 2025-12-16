// Project Charter Types
export interface ProjectCharter {
  id: number;
  project_id: number;
  business_case?: string;
  objectives?: string;
  success_criteria?: string;
  high_level_requirements?: string;
  assumptions?: string;
  constraints?: string;
  high_level_risks?: string;
  summary_budget?: number;
  summary_timeline?: string;
  key_stakeholders?: string;
  approval_requirements?: string;
  approved_by?: number;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

// Stakeholder Types
export interface Stakeholder {
  id: number;
  project_id: number;
  name: string;
  role?: string;
  organization?: string;
  email?: string;
  phone?: string;
  interest_level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  influence_level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  engagement_strategy?: string;
  communication_frequency?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface StakeholderMatrix {
  high_power_high_interest: Stakeholder[];
  high_power_low_interest: Stakeholder[];
  low_power_high_interest: Stakeholder[];
  low_power_low_interest: Stakeholder[];
}

// Change Request Types
export interface ChangeRequest {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  justification?: string;
  impact_analysis?: string;
  scope_impact: boolean;
  schedule_impact: boolean;
  cost_impact: boolean;
  quality_impact: boolean;
  estimated_cost?: number;
  estimated_time_days?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requested_by?: number;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'implemented' | 'cancelled';
  reviewed_by?: number;
  reviewed_at?: string;
  review_notes?: string;
  approved_by?: number;
  approved_at?: string;
  approval_notes?: string;
  implemented_at?: string;
  implementation_notes?: string;
  requester?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

// Lesson Learned Types
export interface LessonLearned {
  id: number;
  project_id: number;
  category?: string;
  title: string;
  description?: string;
  what_worked?: string;
  what_didnt_work?: string;
  recommendations?: string;
  impact: 'positive' | 'negative' | 'neutral';
  phase?: 'initiation' | 'planning' | 'execution' | 'monitoring' | 'closing';
  documented_by?: number;
  documenter?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  created_at: string;
  updated_at: string;
}

// State Types
export interface IntegrationState {
  charter: ProjectCharter | null;
  stakeholders: Stakeholder[];
  changeRequests: ChangeRequest[];
  lessonsLearned: LessonLearned[];
  loading: boolean;
  error: string | null;
}
