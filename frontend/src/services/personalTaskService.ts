import api from './api';

export interface PersonalTask {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  task_type: 'todo' | 'weekly_priority' | 'weekly_plan' | '30_day' | '60_day' | 'training' | 'event';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Cancelled';
  due_date?: string;
  start_date?: string;
  completed_date?: string;
  is_recurring: boolean;
  recurrence_pattern?: 'daily' | 'weekly' | 'monthly';
  sequence_order: number;
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface TaskFilters {
  task_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

export interface TaskStatistics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  todayTasks: number;
}

export const personalTaskService = {
  // Get all tasks with optional filters
  getTasks: async (filters?: TaskFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    const response = await api.get(`/personal-tasks?${params.toString()}`);
    return response.data;
  },

  // Get task by ID
  getTaskById: async (id: number) => {
    const response = await api.get(`/personal-tasks/${id}`);
    return response.data;
  },

  // Create task
  createTask: async (taskData: Partial<PersonalTask>) => {
    const response = await api.post('/personal-tasks', taskData);
    return response.data;
  },

  // Update task
  updateTask: async (id: number, taskData: Partial<PersonalTask>) => {
    const response = await api.put(`/personal-tasks/${id}`, taskData);
    return response.data;
  },

  // Delete task
  deleteTask: async (id: number) => {
    const response = await api.delete(`/personal-tasks/${id}`);
    return response.data;
  },

  // Reorder tasks
  reorderTasks: async (tasks: Array<{ id: number; sequence_order: number }>) => {
    const response = await api.post('/personal-tasks/reorder', { tasks });
    return response.data;
  },

  // Get task statistics
  getStatistics: async () => {
    const response = await api.get('/personal-tasks/statistics');
    return response.data;
  },
};

export default personalTaskService;
