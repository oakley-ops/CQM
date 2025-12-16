import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { CircularProgress, Box } from '@mui/material';

import { getMe } from './store/slices/authSlice';
import { useAuth } from './hooks/useAuth';
import { AppDispatch } from './store/store';

// Components
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Quotes from './pages/Quotes';
import QuoteDetail from './pages/QuoteDetail';
import QuoteForm from './pages/QuoteForm';
import MilestoneManagement from './pages/MilestoneManagement';
import Clients from './pages/Clients';
import MyTasks from './pages/MyTasks';

// CQM Pages
import {
  Dashboard as CQMDashboard,
  Facilities,
  TestDefinitions,
  TestResults,
  Audits,
  NonConformities,
  CAPAActions,
  CardBatches,
  Compliance,
} from './pages/cqm';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { token, loading } = useAuth();

  useEffect(() => {
    if (token) {
      dispatch(getMe());
    }
  }, [dispatch, token]);

  if (loading && token) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* CQM Dashboard as main dashboard */}
        <Route index element={<CQMDashboard />} />
        
        {/* CQM Routes */}
        <Route path="facilities" element={<Facilities />} />
        <Route path="test-definitions" element={<TestDefinitions />} />
        <Route path="test-results" element={<TestResults />} />
        <Route path="audits" element={<Audits />} />
        <Route path="non-conformities" element={<NonConformities />} />
        <Route path="capa-actions" element={<CAPAActions />} />
        <Route path="card-batches" element={<CardBatches />} />
        <Route path="compliance" element={<Compliance />} />
        
        {/* Legacy PMBOK Routes (still available) */}
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="quotes" element={<Quotes />} />
        <Route path="quotes/new" element={<QuoteForm />} />
        <Route path="quotes/:id" element={<QuoteDetail />} />
        <Route path="quotes/:id/edit" element={<QuoteForm />} />
        <Route path="milestones" element={<MilestoneManagement />} />
        <Route path="clients" element={<Clients />} />
        <Route path="my-tasks" element={<MyTasks />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
