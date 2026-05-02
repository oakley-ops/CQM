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
import Quotes from './pages/Quotes';
import QuoteDetail from './pages/QuoteDetail';
import QuoteForm from './pages/QuoteForm';
import Clients from './pages/Clients';

// CQM Pages
import { Dashboard as CQMDashboard, QualityTestDataEntry, SessionHistory, SessionDetail, KPIPage, TestEntryPage } from './pages/cqm';
import AdhesionLogPage from './pages/cqm/AdhesionLogPage';
import { JobList, JobDetail } from './pages/cqm/jobs';
import KnowledgeBase from './pages/KnowledgeBase';

// Kappa / MSA Pages
import { KappaStudyList, KappaStudyCreate, KappaStudyDetail } from './pages/kappa';

// NEXUS Pages
import NexusIntro from './pages/nexus/NexusIntro';

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
        <Route path="quality-test" element={<QualityTestDataEntry />} />
        <Route path="quality-test/session/:sessionId/test/:definitionId" element={<TestEntryPage />} />
        <Route path="sessions" element={<SessionHistory />} />
        <Route path="session/:id" element={<SessionDetail />} />
        <Route path="kpis" element={<KPIPage />} />
        <Route path="jobs" element={<JobList />} />
        <Route path="jobs/:jobNumber" element={<JobDetail />} />
        <Route path="adhesion-log" element={<AdhesionLogPage />} />
        <Route path="knowledge-base" element={<KnowledgeBase />} />

        {/* Kappa / MSA Routes */}
        <Route path="kappa" element={<KappaStudyList />} />
        <Route path="kappa/new" element={<KappaStudyCreate />} />
        <Route path="kappa/:id" element={<KappaStudyDetail />} />

        {/* Quote Tracker Routes */}
        <Route path="quotes" element={<Quotes />} />
        <Route path="quotes/new" element={<QuoteForm />} />
        <Route path="quotes/:id" element={<QuoteDetail />} />
        <Route path="quotes/:id/edit" element={<QuoteForm />} />
        <Route path="clients" element={<Clients />} />

        {/* NEXUS Routes */}
        <Route path="nexus" element={<NexusIntro />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
