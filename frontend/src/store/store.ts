import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
// CQM Reducers
import { dashboardReducer, testEntryReducer, jobReducer } from './slices/cqm';
import ragReducer from './slices/ragSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // CQM Reducers
    dashboard: dashboardReducer,
    testEntry: testEntryReducer,
    jobs: jobReducer,
    rag: ragReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
