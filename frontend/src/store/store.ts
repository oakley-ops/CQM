import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import projectReducer from './slices/projectSlice';
import integrationReducer from './slices/integrationSlice';
import scheduleReducer from './slices/scheduleSlice';
import costReducer from './slices/costSlice';
import qualityReducer from './slices/qualitySlice';
import riskReducer from './slices/riskSlice';
import resourceReducer from './slices/resourceSlice';
// CQM Reducers
import { dashboardReducer, testEntryReducer, jobReducer } from './slices/cqm';
import ragReducer from './slices/ragSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    projects: projectReducer,
    integration: integrationReducer,
    schedule: scheduleReducer,
    cost: costReducer,
    quality: qualityReducer,
    risk: riskReducer,
    resource: resourceReducer,
    // CQM Reducers
    dashboard: dashboardReducer,
    testEntry: testEntryReducer,
    jobs: jobReducer,
    rag: ragReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
