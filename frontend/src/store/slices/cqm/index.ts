/**
 * CQM Slices Index
 * Central export point for all CQM Redux slices
 */

export { default as facilityReducer } from './facilitySlice';
export { default as dashboardReducer } from './dashboardSlice';

// Export all actions
export * from './facilitySlice';
export * from './dashboardSlice';

