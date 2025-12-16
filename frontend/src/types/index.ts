// User types
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone?: string;
  avatar_url?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Project types
export interface Project {
  id: number;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  project_manager_id?: number;
  projectManager?: User;
  budget?: number;
  progress?: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    projects: T[];
    pagination: {
      total: number;
      page: number;
      pages: number;
    };
  };
}

// Export integration types
export * from './integration.types';

// Export schedule types
export * from './schedule.types';

// Export cost types
export * from './cost.types';
