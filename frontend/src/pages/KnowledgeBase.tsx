import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, Chip, IconButton, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Tooltip, CircularProgress, Divider,
} from '@mui/material';
import {
  Upload as UploadIcon, Delete as DeleteIcon,
  CheckCircle as ReadyIcon, HourglassEmpty as PendingIcon, Error as ErrorIcon,
  MenuBook as KBIcon, TableChart as CQMAPIcon, CheckCircleOutline as SuccessIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchDocuments, removeDocument, documentIngested, setUploadProgress } from '../store/slices/ragSlice';
import * as ragService from '../services/ragService';
import type { CQMAPMeta } from '../services/ragService';

const StatusChip: React.FC<{ status: string; error?: string }> = ({ status, error }) => {
  if (status === 'ready') return <Chip icon={<ReadyIcon />} label="Ready" color="success" size="small" />;
  if (status === 'error') return <Tooltip title={error ?? 'Unknown error'}><Chip icon={<ErrorIcon />} label="Error" color="error" size="small" /></Tooltip>;
  return <Chip icon={<PendingIcon />} label="Ingesting…" color="warning" size="small" />;
};

// ── CQMAP upload dialog states ────────────────────────────────────────────────
type CQMAPDialogState = 'idle' | 'uploading' | 'success';

const KnowledgeBase: React.FC = () => {
  const dispatch = useAppDispatch();
  const { documents, loadingDocs, uploadProgress } = useAppSelector((s) => s.rag);
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === 'admin';

  // ── PDF upload state ───────────────────────────────────────────────────────
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── CQMAP upload state ─────────────────────────────────────────────────────
  const [cqmapOpen, setCqmapOpen] = useState(false);
  const [cqmapFile, setCqmapFile] = useState<File | null>(null);
  const [cqmapName, setCqmapName] = useState('');
  const [cqmapState, setCqmapState] = useState<CQMAPDialogState>('idle');
  const [cqmapError, setCqmapError] = useState<string | null>(null);
  const [cqmapMeta, setCqmapMeta] = useState<CQMAPMeta | null>(null);
  const cqmapInputRef = useRef<HTMLInputElement>(null);

  // ── Delete state ───────────────────────────────────────────────────────────
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // ── Polling for pending docs ───────────────────────────────────────────────
  useEffect(() => { dispatch(fetchDocuments()); }, [dispatch]);

  useEffect(() => {
    const hasPending = documents.some((d) => d.status === 'pending');
    if (!hasPending) return;
    const timer = setInterval(() => dispatch(fetchDocuments()), 4000);
    return () => clearInterval(timer);
  }, [documents, dispatch]);

  // ── PDF upload handlers ────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setSelectedFile(f);
    if (f && !docName) setDocName(f.name.replace(/\.pdf$/i, ''));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const doc = await ragService.uploadDocument(selectedFile, docName, (pct) => {
        dispatch(setUploadProgress(pct));
      });
      dispatch(documentIngested(doc));
      setUploadOpen(false);
      setSelectedFile(null);
      setDocName('');
      dispatch(setUploadProgress(null));
    } catch (err: any) {
      setUploadError(err.response?.data?.message ?? err.message);
    } finally {
      setUploading(false);
    }
  };

  const closePdfDialog = () => {
    if (uploading) return;
    setUploadOpen(false);
    setSelectedFile(null);
    setDocName('');
    setUploadError(null);
  };

  // ── CQMAP upload handlers ──────────────────────────────────────────────────
  const handleCQMAPFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setCqmapFile(f);
    setCqmapError(null);
    if (f && !cqmapName) setCqmapName(f.name.replace(/\.xlsx$/i, ''));
  };

  const handleCQMAPUpload = async () => {
    if (!cqmapFile) return;
    setCqmapState('uploading');
    setCqmapError(null);
    try {
      const { doc, meta } = await ragService.uploadCQMAP(cqmapFile, cqmapName || undefined);
      dispatch(documentIngested(doc));
      setCqmapMeta(meta);
      setCqmapState('success');
    } catch (err: any) {
      setCqmapError(err.response?.data?.message ?? err.message);
      setCqmapState('idle');
    }
  };

  const closeCQMAPDialog = () => {
    if (cqmapState === 'uploading') return;
    setCqmapOpen(false);
    setCqmapFile(null);
    setCqmapName('');
    setCqmapError(null);
    setCqmapMeta(null);
    setCqmapState('idle');
  };

  // ── Delete handler ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (deleteId == null) return;
    await dispatch(removeDocument(deleteId));
    setDeleteId(null);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <KBIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" fontWeight="bold">Knowledge Base</Typography>
          <Typography variant="body2" color="text.secondary">
            Upload ISO standards, CQM procedure PDFs, or Mastercard CQMAP assessment plans.
          </Typography>
        </Box>
        {isAdmin && (
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<CQMAPIcon />}
              onClick={() => setCqmapOpen(true)}
              sx={{ borderColor: 'warning.main', color: 'warning.dark', '&:hover': { borderColor: 'warning.dark', bgcolor: 'warning.50' } }}
            >
              Import CQMAP
            </Button>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => setUploadOpen(true)}
            >
              Upload PDF
            </Button>
          </Box>
        )}
      </Box>

      {/* ── Document table ── */}
      {loadingDocs && documents.length === 0 ? (
        <CircularProgress />
      ) : documents.length === 0 ? (
        <Alert severity="info">
          No documents uploaded yet.{' '}
          {isAdmin
            ? 'Click "Upload PDF" for ISO/CQM specs, or "Import CQMAP" for a vendor assessment Excel.'
            : 'Ask an admin to upload reference documents.'}
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Document Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>File</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Chunks</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Uploaded</TableCell>
                {isAdmin && <TableCell />}
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                  <TableCell sx={{ fontWeight: 'medium' }}>{doc.name}</TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{doc.filename}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <StatusChip status={doc.status} error={doc.error_message} />
                  </TableCell>
                  <TableCell align="center">
                    {doc.status === 'ready' ? doc.chunk_count : '—'}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  {isAdmin && (
                    <TableCell align="right">
                      <IconButton size="small" color="error" onClick={() => setDeleteId(doc.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Upload PDF dialog ── */}
      <Dialog open={uploadOpen} onClose={closePdfDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {uploadError && <Alert severity="error" onClose={() => setUploadError(null)}>{uploadError}</Alert>}
          <Button variant="outlined" component="label" startIcon={<UploadIcon />}>
            {selectedFile ? selectedFile.name : 'Choose PDF file'}
            <input ref={fileInputRef} type="file" accept="application/pdf" hidden onChange={handleFileChange} />
          </Button>
          <TextField
            label="Document Name" size="small" fullWidth
            value={docName} onChange={(e) => setDocName(e.target.value)}
            helperText="e.g. CQM 2.19 Procedures, ISO 7810"
          />
          {uploadProgress !== null && (
            <Box>
              <Typography variant="caption">Uploading… {uploadProgress}%</Typography>
              <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 0.5 }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closePdfDialog} disabled={uploading}>Cancel</Button>
          <Button
            variant="contained" onClick={handleUpload}
            disabled={!selectedFile || !docName.trim() || uploading}
          >
            {uploading && <CircularProgress size={18} sx={{ mr: 1 }} />}
            Upload & Ingest
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Import CQMAP dialog ── */}
      <Dialog open={cqmapOpen} onClose={closeCQMAPDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CQMAPIcon sx={{ color: 'warning.main' }} />
          Import CQMAP Assessment Plan
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>

          {/* idle: file picker */}
          {cqmapState === 'idle' && (
            <>
              {cqmapError && (
                <Alert severity="error" onClose={() => setCqmapError(null)}>{cqmapError}</Alert>
              )}
              <Alert severity="info" sx={{ fontSize: 13 }}>
                Accepts Mastercard CQMAP V3.A <strong>.xlsx</strong> files. All product sheets
                (ic, icm, il, cb, icc, p, iacicm, bsm, iacil, iac), QMS requirements, components,
                and CAP findings are extracted and indexed automatically.
              </Alert>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CQMAPIcon />}
                sx={{ borderColor: 'warning.main', color: 'warning.dark' }}
              >
                {cqmapFile ? cqmapFile.name : 'Choose CQMAP .xlsx file'}
                <input
                  ref={cqmapInputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  hidden
                  onChange={handleCQMAPFileChange}
                />
              </Button>
              <TextField
                label="Document Name (optional)" size="small" fullWidth
                value={cqmapName} onChange={(e) => setCqmapName(e.target.value)}
                helperText="Auto-filled with Vendor / Site once extracted. Leave blank to auto-detect."
                disabled={!cqmapFile}
              />
            </>
          )}

          {/* uploading: spinner */}
          {cqmapState === 'uploading' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 3 }}>
              <CircularProgress size={48} sx={{ color: 'warning.main' }} />
              <Typography variant="body2" color="text.secondary">
                Extracting CQMAP data and starting ingestion…
              </Typography>
              <Typography variant="caption" color="text.disabled">
                Reading all product sheets, QMS requirements, components, and CAP findings.
              </Typography>
            </Box>
          )}

          {/* success: metadata summary */}
          {cqmapState === 'success' && cqmapMeta && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SuccessIcon color="success" sx={{ fontSize: 28 }} />
                <Typography variant="h6" color="success.main">Extraction Successful</Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Vendor</Typography>
                  <Typography variant="body2" fontWeight="bold">{cqmapMeta.vendor || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Site</Typography>
                  <Typography variant="body2" fontWeight="bold">{cqmapMeta.site || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Audit Type</Typography>
                  <Typography variant="body2">{[cqmapMeta.auditType, cqmapMeta.auditMode].filter(Boolean).join(' · ') || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Audit Date</Typography>
                  <Typography variant="body2">{cqmapMeta.auditDate || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Requirement Codes Found</Typography>
                  <Typography variant="body2" fontWeight="bold">{cqmapMeta.reqCodeCount.toLocaleString()} occurrences</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Unique Requirements</Typography>
                  <Typography variant="body2" fontWeight="bold">{cqmapMeta.uniqueCodeCount} codes</Typography>
                </Box>
              </Box>
              <Divider />
              <Alert severity="warning" sx={{ fontSize: 13 }}>
                Ingestion is running in the background. The document will appear as <strong>Ingesting…</strong>
                in the list and switch to <strong>Ready</strong> once embedding is complete.
              </Alert>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          {cqmapState === 'success' ? (
            <Button variant="contained" onClick={closeCQMAPDialog}>Done</Button>
          ) : (
            <>
              <Button onClick={closeCQMAPDialog} disabled={cqmapState === 'uploading'}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleCQMAPUpload}
                disabled={!cqmapFile || cqmapState === 'uploading'}
                sx={{ bgcolor: 'warning.main', '&:hover': { bgcolor: 'warning.dark' } }}
              >
                {cqmapState === 'uploading' && <CircularProgress size={18} sx={{ mr: 1, color: 'white' }} />}
                Extract & Import
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* ── Delete confirmation ── */}
      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)} maxWidth="xs">
        <DialogTitle>Delete Document?</DialogTitle>
        <DialogContent>
          <Typography>This will permanently remove the document and its vector index. This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default KnowledgeBase;
