import api from '../api';

export interface Client {
  id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuoteMilestone {
  id: number;
  name: string;
  description?: string;
  sequence_order: number;
  target_duration_days?: number;
  is_active: boolean;
}

export interface QuoteMilestoneTracking {
  id: number;
  quote_id: number;
  milestone_id: number;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Skipped' | 'Blocked';
  started_date?: string;
  completed_date?: string;
  expected_completion_date?: string;
  actual_duration_days?: number;
  assigned_to?: number;
  blockers?: string;
  notes?: string;
  milestone?: QuoteMilestone;
  assignee?: {
    id: number;
    username: string;
    email: string;
    full_name: string;
  };
}

export interface QuoteAction {
  id: number;
  quote_id: number;
  action_type: 'Next Action' | 'Follow-up' | 'Blocker' | 'Note';
  description: string;
  assigned_to?: number;
  due_date?: string;
  completed: boolean;
  completed_date?: string;
  created_by?: number;
  created_at: string;
  assignee?: {
    id: number;
    username: string;
    email: string;
    full_name: string;
  };
  creator?: {
    id: number;
    username: string;
    email: string;
    full_name: string;
  };
}

export interface Quote {
  id: number;
  quote_number: string;
  client_id?: number;
  project_name: string;
  assigned_to?: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  current_stage?: string;
  current_milestone_id?: number;
  status: 'Not Started' | 'In Process' | 'On Hold' | 'Completed' | 'Cancelled';
  deadline?: string;
  created_date: string;
  quote_build_complete_date?: string;
  review_date?: string;
  approval_date?: string;
  sent_to_customer_date?: string;
  signed_date?: string;
  completed_date?: string;
  days_in_process?: number;
  review_rejected_notes?: string;
  notes?: string;
  quote_value?: number;
  probability_percentage?: number;
  created_by?: number;
  project_id?: number;
  converted_to_project_date?: string;
  updated_at: string;
  client?: Client;
  assignee?: {
    id: number;
    username: string;
    email: string;
    full_name: string;
  };
  creator?: {
    id: number;
    username: string;
    email: string;
    full_name: string;
  };
  currentMilestone?: QuoteMilestone;
  milestoneTracking?: QuoteMilestoneTracking[];
  actions?: QuoteAction[];
}

export interface QuoteStatistics {
  total_quotes: number;
  active_quotes: number;
  completed_quotes: number;
  on_hold_quotes: number;
  conversion_rate: number;
  avg_days_in_process: number;
  pipeline_value: number;
  quotes_by_priority: Array<{ priority: string; count: number }>;
  quotes_by_stage: Array<{ current_stage: string; count: number }>;
}

export interface QuoteFilters {
  status?: string;
  priority?: string;
  assigned_to?: number;
  client_id?: number;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

// Quote API calls
export const quoteService = {
  // Get all quotes with filters
  getQuotes: async (filters?: QuoteFilters) => {
    const response = await api.get('/quotes', { params: filters });
    return response.data;
  },

  // Get quote by ID
  getQuoteById: async (id: number) => {
    const response = await api.get(`/quotes/${id}`);
    return response.data;
  },

  // Create new quote
  createQuote: async (quoteData: Partial<Quote>) => {
    const response = await api.post('/quotes', quoteData);
    return response.data;
  },

  // Update quote
  updateQuote: async (id: number, updates: Partial<Quote>) => {
    const response = await api.put(`/quotes/${id}`, updates);
    return response.data;
  },

  // Update quote status
  updateQuoteStatus: async (id: number, status: string) => {
    const response = await api.patch(`/quotes/${id}/status`, { status });
    return response.data;
  },

  // Move to next stage
  moveToNextStage: async (id: number) => {
    const response = await api.patch(`/quotes/${id}/next-stage`);
    return response.data;
  },

  // Convert to project
  convertToProject: async (id: number) => {
    const response = await api.post(`/quotes/${id}/convert-to-project`);
    return response.data;
  },

  // Delete quote
  deleteQuote: async (id: number) => {
    const response = await api.delete(`/quotes/${id}`);
    return response.data;
  },

  // Get quote statistics
  getStatistics: async () => {
    const response = await api.get('/quotes/statistics');
    return response.data;
  },

  // Milestone operations
  getMilestones: async (quoteId: number) => {
    const response = await api.get(`/quotes/${quoteId}/milestones`);
    return response.data;
  },

  updateMilestone: async (quoteId: number, milestoneId: number, updates: Partial<QuoteMilestoneTracking>) => {
    const response = await api.put(`/quotes/${quoteId}/milestones/${milestoneId}`, updates);
    return response.data;
  },

  completeMilestone: async (quoteId: number, milestoneId: number) => {
    const response = await api.patch(`/quotes/${quoteId}/milestones/${milestoneId}/complete`);
    return response.data;
  },

  // Action operations
  getActions: async (quoteId: number, completed?: boolean) => {
    const response = await api.get(`/quotes/${quoteId}/actions`, {
      params: { completed }
    });
    return response.data;
  },

  createAction: async (quoteId: number, actionData: Partial<QuoteAction>) => {
    const response = await api.post(`/quotes/${quoteId}/actions`, actionData);
    return response.data;
  },

  updateAction: async (quoteId: number, actionId: number, updates: Partial<QuoteAction>) => {
    const response = await api.put(`/quotes/${quoteId}/actions/${actionId}`, updates);
    return response.data;
  },

  completeAction: async (quoteId: number, actionId: number) => {
    const response = await api.patch(`/quotes/${quoteId}/actions/${actionId}/complete`);
    return response.data;
  },

  deleteAction: async (quoteId: number, actionId: number) => {
    const response = await api.delete(`/quotes/${quoteId}/actions/${actionId}`);
    return response.data;
  },
};

// Client API calls
export const clientService = {
  // Get all clients
  getClients: async (params?: { search?: string; is_active?: boolean; page?: number; limit?: number }) => {
    const response = await api.get('/clients', { params });
    return response.data;
  },

  // Get client by ID
  getClientById: async (id: number) => {
    const response = await api.get(`/clients/${id}`);
    return response.data;
  },

  // Create new client
  createClient: async (clientData: Partial<Client>) => {
    const response = await api.post('/clients', clientData);
    return response.data;
  },

  // Update client
  updateClient: async (id: number, updates: Partial<Client>) => {
    const response = await api.put(`/clients/${id}`, updates);
    return response.data;
  },

  // Delete client
  deleteClient: async (id: number) => {
    const response = await api.delete(`/clients/${id}`);
    return response.data;
  },
};

// Milestone template API calls
export const milestoneTemplateService = {
  // Get all milestone templates
  getMilestoneTemplates: async () => {
    const response = await api.get('/quote-milestones');
    return response.data;
  },
};
