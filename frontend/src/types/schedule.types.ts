// Task Types
export interface Task {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  assigned_to?: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  start_date?: string;
  end_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  progress: number;
  parent_task_id?: number;
  created_by?: number;
  assignee?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  subtasks?: Task[];
  created_at: string;
  updated_at: string;
}

// Task Dependency Types
export interface TaskDependency {
  id: number;
  task_id: number;
  depends_on_task_id: number;
  dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  lag_days: number;
  created_at: string;
}

// Milestone Types
export interface Milestone {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  due_date: string;
  status: 'pending' | 'at_risk' | 'completed' | 'missed';
  completion_date?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

// Gantt Chart Data
export interface GanttData {
  tasks: Task[];
  dependencies: TaskDependency[];
}

// State Types
export interface ScheduleState {
  tasks: Task[];
  milestones: Milestone[];
  ganttData: GanttData | null;
  loading: boolean;
  error: string | null;
}
