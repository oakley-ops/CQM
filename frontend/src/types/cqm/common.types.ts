/**
 * Common CQM Type Definitions
 * Shared types used across all CQM modules
 */

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
  message?: string;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
    value?: string;
  }>;
  timestamp?: string;
}

// Filter & Search
export interface FilterParams {
  search?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  [key: string]: string | number | boolean | undefined;
}

// Common Status Types
export type StatusType = 'Active' | 'Inactive' | 'Pending' | 'Completed' | 'Cancelled';

export type CertificationStatus = 'Pending' | 'Certified' | 'Suspended' | 'Revoked';

export type QCStatus = 'Pending' | 'Approved' | 'Rejected' | 'Quarantined';

export type NCType = 'Major' | 'Minor' | 'Observation';

export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type MeasurementType = 'Numeric' | 'Pass/Fail' | 'Visual Inspection';

export type ResultStatus = 'Pass' | 'Fail' | 'Pending' | 'Rework';

export type AuditType = 'Initial' | 'Surveillance' | 'Re-certification' | 'Remote' | 'On-site';

export type AuditStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';

export type CAPAStatus = 'Submitted' | 'Under Review' | 'Approved' | 'In Progress' | 'Completed' | 'Verified' | 'Closed' | 'Rejected';

export type NCStatus = 'Open' | 'In Progress' | 'Closed' | 'Verified';

export type TestDefinitionStatus = 'Active' | 'Under Review' | 'Superseded' | 'Obsolete';

// User Roles
export type UserRole = 'admin' | 'quality_manager' | 'auditor' | 'production_manager' | 'tester' | 'viewer';

// Date Range
export interface DateRange {
  startDate: Date | string;
  endDate: Date | string;
}

// Chart Data
export interface ChartDataPoint {
  name: string;
  value: number;
  label?: string;
}

export interface TrendData {
  date: string;
  value: number;
  label?: string;
}

// Statistics
export interface Statistics {
  total: number;
  active?: number;
  inactive?: number;
  pending?: number;
  completed?: number;
  [key: string]: number | undefined;
}

// Audit Trail
export interface AuditTrail {
  action: string;
  performedBy: number;
  performedAt: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
}

// File Upload
export interface FileUpload {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: number;
  uploadedAt: string;
}

// Export Options
export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  filename: string;
  filters?: FilterParams;
  columns?: string[];
}

// Notification
export interface Notification {
  id: number;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// Dashboard Widget Data
export interface WidgetData {
  title: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease';
  icon?: string;
  color?: string;
}



