import axios, { AxiosError, AxiosResponse } from 'axios';
import { ApiResponse, ApiError, PaginatedResponse } from '../types/cqm';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const API_VERSION = 'v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'API-Version': API_VERSION,
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor to add token and handle versioning
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add timestamp to prevent caching for GET requests
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and transform responses
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Transform response to include success flag
    return response;
  },
  (error: AxiosError<ApiError>) => {
    // Handle different error scenarios
    if (error.response) {
      const { status, data } = error.response;
      
      // Authentication error
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject({
          message: 'Session expired. Please login again.',
          status: 401
        });
      }
      
      // Authorization error
      if (status === 403) {
        return Promise.reject({
          message: data?.message || 'You do not have permission to perform this action.',
          status: 403
        });
      }
      
      // Validation error
      if (status === 400) {
        return Promise.reject({
          message: data?.message || 'Invalid request data.',
          errors: data?.errors || [],
          status: 400
        });
      }
      
      // Not found error
      if (status === 404) {
        return Promise.reject({
          message: data?.message || 'Resource not found.',
          status: 404
        });
      }
      
      // Rate limit error
      if (status === 429) {
        return Promise.reject({
          message: data?.message || 'Too many requests. Please try again later.',
          status: 429
        });
      }
      
      // Server error
      if (status >= 500) {
        return Promise.reject({
          message: data?.message || 'Server error. Please try again later.',
          status: status
        });
      }
      
      // Other errors
      return Promise.reject({
        message: data?.message || 'An error occurred.',
        status: status
      });
    }
    
    // Network error
    if (error.request) {
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        status: 0
      });
    }
    
    // Other errors
    return Promise.reject({
      message: error.message || 'An unexpected error occurred.',
      status: 0
    });
  }
);

// Helper functions for type-safe API calls
export const apiGet = async <T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> => {
  const response = await api.get<ApiResponse<T>>(url, { params });
  return response.data;
};

export const apiGetPaginated = async <T>(url: string, params?: Record<string, unknown>): Promise<PaginatedResponse<T>> => {
  const response = await api.get<PaginatedResponse<T>>(url, { params });
  return response.data;
};

export const apiPost = async <T>(url: string, data?: unknown): Promise<ApiResponse<T>> => {
  const response = await api.post<ApiResponse<T>>(url, data);
  return response.data;
};

export const apiPut = async <T>(url: string, data?: unknown): Promise<ApiResponse<T>> => {
  const response = await api.put<ApiResponse<T>>(url, data);
  return response.data;
};

export const apiPatch = async <T>(url: string, data?: unknown): Promise<ApiResponse<T>> => {
  const response = await api.patch<ApiResponse<T>>(url, data);
  return response.data;
};

export const apiDelete = async <T>(url: string): Promise<ApiResponse<T>> => {
  const response = await api.delete<ApiResponse<T>>(url);
  return response.data;
};

// File upload helper
export const apiUpload = async <T>(url: string, formData: FormData): Promise<ApiResponse<T>> => {
  const response = await api.post<ApiResponse<T>>(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// File download helper
export const apiDownload = async (url: string, filename: string): Promise<void> => {
  const response = await api.get(url, {
    responseType: 'blob',
  });
  
  const blob = new Blob([response.data]);
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(link.href);
};

export default api;
