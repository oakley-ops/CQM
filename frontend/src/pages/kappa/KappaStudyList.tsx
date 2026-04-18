import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, CircularProgress, IconButton, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tooltip, Typography, Alert,
} from '@mui/material';
import { Add as AddIcon, Visibility as ViewIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { listStudies, deleteStudy } from '../../services/cqm/kappaService';
import KappaGauge from '../../components/CQM/KappaGauge';
import type { KappaStudy } from '../../types/cqm/kappa.types';

const KappaStudyList: React.FC = () => {
  const navigate = useNavigate();
  const [studies, setStudies] = useState<KappaStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listStudies();
      setStudies(res.studies);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete study "${name}"? This cannot be undone.`)) return;
    try {
      await deleteStudy(id);
      setStudies(prev => prev.filter(s => s.id !== id));
    } catch (e: any) {
      alert(e.response?.data?.error || e.message);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Attribute Agreement Analysis</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Kappa (κ) studies — Six Sigma MSA gate: κ ≥ 0.75
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/kappa/new')}
        >
          New Study
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : studies.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">No studies yet</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Create your first Kappa study to evaluate inspector agreement.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} sx={{ mt: 3 }} onClick={() => navigate('/kappa/new')}>
            New Study
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Study Name</TableCell>
                <TableCell>Test / Category</TableCell>
                <TableCell align="center">Samples</TableCell>
                <TableCell align="center">Trials</TableCell>
                <TableCell align="center">Appraisers</TableCell>
                <TableCell>Worst Within-κ</TableCell>
                <TableCell>Between-κ (Fleiss)</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Gate</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {studies.map((study) => (
                <TableRow key={study.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{study.study_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(study.created_at).toLocaleDateString()}
                      {study.creator_name ? ` · ${study.creator_name}` : ''}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {study.testDefinition?.test_name || study.category?.name || '—'}
                    </Typography>
                    {study.card_type && (
                      <Typography variant="caption" color="text.secondary">{study.card_type}</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">{study.sample_count}</TableCell>
                  <TableCell align="center">{study.trial_count}</TableCell>
                  <TableCell align="center">{study.appraiser_count ?? '—'}</TableCell>
                  <TableCell sx={{ minWidth: 160 }}>
                    {study.status === 'complete' && study.worst_within_kappa !== undefined ? (
                      <KappaGauge kappa={study.worst_within_kappa ?? null} showLabel={false} />
                    ) : '—'}
                  </TableCell>
                  <TableCell sx={{ minWidth: 160 }}>
                    {study.status === 'complete' && study.fleiss_kappa !== undefined ? (
                      <KappaGauge kappa={study.fleiss_kappa ?? null} showLabel={false} />
                    ) : '—'}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={study.status === 'complete' ? 'Complete' : 'Open'}
                      color={study.status === 'complete' ? 'default' : 'primary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {study.status === 'complete' && study.overall_passed !== undefined ? (
                      <Chip
                        label={study.overall_passed ? 'PASS' : 'FAIL'}
                        color={study.overall_passed ? 'success' : 'error'}
                        size="small"
                        variant="outlined"
                      />
                    ) : '—'}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View study">
                      <IconButton size="small" onClick={() => navigate(`/kappa/${study.id}`)}>
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete study">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(study.id, study.study_name)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default KappaStudyList;
