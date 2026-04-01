import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, Chip, IconButton, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Tooltip, CircularProgress,
} from '@mui/material';
import {
  Upload as UploadIcon, Delete as DeleteIcon,
  CheckCircle as ReadyIcon, HourglassEmpty as PendingIcon, Error as ErrorIcon,
  MenuBook as KBIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchDocuments, removeDocument, documentIngested, setUploadProgress } from '../store/slices/ragSlice';
import * as ragService from '../services/ragService';

const StatusChip: React.FC<{ status: string; error?: string }> = ({ status, error }) => {
  if (status === 'ready') return <Chip icon={<ReadyIcon />} label="Ready" color="success" size="small" />;
  if (status === 'error') return <Tooltip title={error ?? 'Unknown error'}><Chip icon={<ErrorIcon />} label="Error" color="error" size="small" /></Tooltip>;
  return <Chip icon={<PendingIcon />} label="Ingesting…" color="warning" size="small" />;
};

const KnowledgeBase: React.FC = () => {
  const dispatch = useAppDispatch();
  const { documents, loadingDocs, uploadProgress } = useAppSelector((s) => s.rag);
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === 'admin';

  const [uploadOpen, setUploadOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll for pending documents every 4s
  useEffect(() => {
    dispatch(fetchDocuments());
  }, [dispatch]);

  useEffect(() => {
    const hasPending = documents.some((d) => d.status === 'pending');
    if (!hasPending) return;
    const timer = setInterval(() => dispatch(fetchDocuments()), 4000);
    return () => clearInterval(timer);
  }, [documents, dispatch]);

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

  const handleDelete = async () => {
    if (deleteId == null) return;
    await dispatch(removeDocument(deleteId));
    setDeleteId(null);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <KBIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" fontWeight="bold">Knowledge Base</Typography>
          <Typography variant="body2" color="text.secondary">
            Upload ISO standards and CQM procedure PDFs to power the AI chat assistant.
          </Typography>
        </Box>
        {isAdmin && (
          <Button
            variant="contained" startIcon={<UploadIcon />}
            sx={{ ml: 'auto' }}
            onClick={() => setUploadOpen(true)}
          >
            Upload Document
          </Button>
        )}
      </Box>

      {loadingDocs && documents.length === 0 ? (
        <CircularProgress />
      ) : documents.length === 0 ? (
        <Alert severity="info">
          No documents uploaded yet. {isAdmin ? 'Click "Upload Document" to get started.' : 'Ask an admin to upload reference documents.'}
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

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onClose={() => !uploading && setUploadOpen(false)} maxWidth="sm" fullWidth>
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
          <Button onClick={() => setUploadOpen(false)} disabled={uploading}>Cancel</Button>
          <Button
            variant="contained" onClick={handleUpload}
            disabled={!selectedFile || !docName.trim() || uploading}
          >
            {uploading ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
            Upload & Ingest
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)} maxWidth="xs">
        <DialogTitle>Delete Document?</DialogTitle>
        <DialogContent>
          <Typography>This will permanently remove the PDF and its vector index. This cannot be undone.</Typography>
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
