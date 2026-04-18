import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Divider,
  FormControl, FormControlLabel, FormHelperText, FormLabel, Grid,
  InputLabel, MenuItem, Paper, Radio, RadioGroup, Select,
  Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material';
import { ArrowBack as BackIcon, Save as SaveIcon } from '@mui/icons-material';
import { createStudy } from '../../services/cqm/kappaService';
import api from '../../services/api';
import type { CreateStudyPayload, AttributeType, ReferenceType } from '../../types/cqm/kappa.types';

interface UserOption {
  id: number;
  label: string;
  email: string;
}

interface TestDefOption {
  id: number;
  label: string;
  code: string;
}

const KappaStudyCreate: React.FC = () => {
  const navigate = useNavigate();

  // ── form state ─────────────────────────────────────────────────────────────
  const [studyName, setStudyName]       = useState('');
  const [cardType, setCardType]         = useState('');
  const [sampleCount, setSampleCount]   = useState(20);
  const [trialCount, setTrialCount]     = useState(2);
  const [attrType, setAttrType]         = useState<AttributeType>('passfail');
  const [attrOptions, setAttrOptions]   = useState<string[]>(['Pass', 'Fail']);
  const [newOption, setNewOption]       = useState('');
  const [refType, setRefType]           = useState<ReferenceType>('predefined');
  const [refData, setRefData]           = useState<Record<string, string>>({});
  const [notes, setNotes]               = useState('');
  const [appraisers, setAppraisers]     = useState<UserOption[]>([]);
  const [selectedTest, setSelectedTest] = useState<TestDefOption | null>(null);

  // ── remote data ────────────────────────────────────────────────────────────
  const [users, setUsers]       = useState<UserOption[]>([]);
  const [testDefs, setTestDefs] = useState<TestDefOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [usersRes, defsRes] = await Promise.all([
          api.get('/users'),
          api.get('/test-entries/definitions'),
        ]);
        const rawUsers = usersRes.data?.users || usersRes.data || [];
        setUsers(rawUsers.map((u: any) => ({
          id: u.id,
          label: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email,
          email: u.email,
        })));
        const rawDefs = defsRes.data?.definitions || defsRes.data || [];
        setTestDefs(rawDefs.map((d: any) => ({
          id: d.id,
          label: d.test_name,
          code: d.test_id,
        })));
      } catch (e) {
        // non-fatal — user can still create study without linking a test definition
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, []);

  // Sync reference data keys when sample count changes
  useEffect(() => {
    setRefData(prev => {
      const next: Record<string, string> = {};
      for (let i = 1; i <= sampleCount; i++) {
        next[String(i)] = prev[String(i)] || '';
      }
      return next;
    });
  }, [sampleCount]);

  // Reset options when switching attribute type
  useEffect(() => {
    if (attrType === 'passfail') setAttrOptions(['Pass', 'Fail']);
  }, [attrType]);

  const addOption = () => {
    const val = newOption.trim();
    if (val && !attrOptions.includes(val)) {
      setAttrOptions(prev => [...prev, val]);
    }
    setNewOption('');
  };

  const removeOption = (opt: string) => {
    setAttrOptions(prev => prev.filter(o => o !== opt));
  };

  const handleSubmit = async () => {
    if (!studyName.trim()) { setError('Study name is required'); return; }
    if (appraisers.length === 0) { setError('Select at least one appraiser'); return; }
    if (attrOptions.length < 2) { setError('At least two attribute options are required'); return; }

    setSaving(true);
    setError(null);
    try {
      const payload: CreateStudyPayload = {
        study_name: studyName.trim(),
        test_definition_id: selectedTest?.id || null,
        card_type: cardType.trim() || undefined,
        sample_count: sampleCount,
        trial_count: trialCount,
        attribute_type: attrType,
        attribute_options: attrOptions,
        reference_type: refType,
        reference_data: refType === 'predefined'
          ? Object.fromEntries(Object.entries(refData).filter(([, v]) => v !== ''))
          : null,
        notes: notes.trim() || undefined,
        appraiser_ids: appraisers.map(a => a.id),
      };
      const res = await createStudy(payload);
      navigate(`/kappa/${res.study.id}`);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
      setSaving(false);
    }
  };

  if (loadingData) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Button startIcon={<BackIcon />} onClick={() => navigate('/kappa')} sx={{ mb: 2 }}>
        Back to Studies
      </Button>

      <Typography variant="h5" fontWeight={700} mb={3}>New Kappa Study</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* ── Study basics ─────────────────────────────────────────────────── */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>Study Setup</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField
                  label="Study Name"
                  fullWidth
                  required
                  value={studyName}
                  onChange={e => setStudyName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Card Type (optional)"
                  fullWidth
                  value={cardType}
                  onChange={e => setCardType(e.target.value)}
                  placeholder="e.g. CBY, Internal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={testDefs}
                  value={selectedTest}
                  onChange={(_, v) => setSelectedTest(v)}
                  getOptionLabel={o => `${o.label} (${o.code})`}
                  renderInput={params => <TextField {...params} label="Test Definition (optional)" />}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Sample Count"
                  type="number"
                  fullWidth
                  value={sampleCount}
                  onChange={e => setSampleCount(Math.max(2, parseInt(e.target.value, 10) || 20))}
                  inputProps={{ min: 2, max: 200 }}
                  helperText="Recommended: 20–50"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Trials per Appraiser</InputLabel>
                  <Select
                    value={trialCount}
                    label="Trials per Appraiser"
                    onChange={e => setTrialCount(Number(e.target.value))}
                  >
                    {[2, 3].map(n => (
                      <MenuItem key={n} value={n}>{n} trials</MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>2 is standard; 3 for borderline tests</FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* ── Appraisers ────────────────────────────────────────────────────── */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>Appraisers</Typography>
            <Autocomplete
              multiple
              options={users}
              value={appraisers}
              onChange={(_, v) => setAppraisers(v)}
              getOptionLabel={o => o.label}
              renderTags={(vals, getTagProps) =>
                vals.map((opt, index) => (
                  <Chip label={opt.label} {...getTagProps({ index })} key={opt.id} size="small" />
                ))
              }
              renderInput={params => (
                <TextField
                  {...params}
                  label="Select Appraisers"
                  placeholder="Search users…"
                  required
                />
              )}
            />
            <FormHelperText>All selected users will enter ratings for each sample item.</FormHelperText>
          </Paper>
        </Grid>

        {/* ── Attribute options ─────────────────────────────────────────────── */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>Attribute Options</Typography>
            <FormControl>
              <FormLabel>Attribute Type</FormLabel>
              <RadioGroup row value={attrType} onChange={e => setAttrType(e.target.value as AttributeType)}>
                <FormControlLabel value="passfail" control={<Radio />} label="Pass / Fail (binary)" />
                <FormControlLabel value="categorical" control={<Radio />} label="Categorical (multi-label)" />
              </RadioGroup>
            </FormControl>

            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {attrOptions.map(opt => (
                <Chip
                  key={opt}
                  label={opt}
                  onDelete={attrType === 'categorical' && attrOptions.length > 2 ? () => removeOption(opt) : undefined}
                />
              ))}
            </Box>

            {attrType === 'categorical' && (
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <TextField
                  size="small"
                  label="Add option"
                  value={newOption}
                  onChange={e => setNewOption(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                />
                <Button variant="outlined" onClick={addOption}>Add</Button>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* ── Reference data ────────────────────────────────────────────────── */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>Reference (Known Truth)</Typography>
            <FormControl>
              <FormLabel>Reference Type</FormLabel>
              <RadioGroup row value={refType} onChange={e => setRefType(e.target.value as ReferenceType)}>
                <Tooltip title="QA manager enters the correct answer for each sample before appraisers rate. Recommended for Six Sigma MSA.">
                  <FormControlLabel value="predefined" control={<Radio />} label="Pre-defined (QA manager enters truth upfront)" />
                </Tooltip>
                <Tooltip title="A designated master appraiser's ratings are used as the reference.">
                  <FormControlLabel value="master_appraiser" control={<Radio />} label="Master appraiser (reference set by expert)" />
                </Tooltip>
              </RadioGroup>
            </FormControl>

            {refType === 'predefined' && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Enter the known-correct rating for each sample. You can leave blanks and fill in later.
                </Typography>
                <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 100 }}>Sample #</TableCell>
                        <TableCell>Reference Rating</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Array.from({ length: sampleCount }, (_, i) => i + 1).map(s => (
                        <TableRow key={s}>
                          <TableCell>{s}</TableCell>
                          <TableCell>
                            <FormControl size="small" sx={{ minWidth: 140 }}>
                              <Select
                                value={refData[String(s)] || ''}
                                onChange={e => setRefData(prev => ({ ...prev, [String(s)]: e.target.value }))}
                                displayEmpty
                              >
                                <MenuItem value=""><em>— blank —</em></MenuItem>
                                {attrOptions.map(opt => (
                                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* ── Notes ─────────────────────────────────────────────────────────── */}
        <Grid item xs={12}>
          <TextField
            label="Notes (optional)"
            multiline
            rows={3}
            fullWidth
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </Grid>

        {/* ── Submit ────────────────────────────────────────────────────────── */}
        <Grid item xs={12}>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={() => navigate('/kappa')} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
              onClick={handleSubmit}
              disabled={saving}
            >
              Create Study
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default KappaStudyCreate;
