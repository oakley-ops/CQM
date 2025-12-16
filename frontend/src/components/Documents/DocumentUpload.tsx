import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Typography,
  LinearProgress,
  Alert
} from '@mui/material';
import { CloudUpload, Link as LinkIcon } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { toast } from 'react-toastify';

interface DocumentUploadProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  onUploadSuccess: () => void;
}

const DOCUMENT_CATEGORIES = [
  { value: 'photo', label: '📸 Photo/Image' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'contract', label: 'Contract' },
  { value: 'report', label: 'Report' },
  { value: 'specification', label: 'Specification' },
  { value: 'meeting_minutes', label: 'Meeting Minutes' },
  { value: 'other', label: 'Other' }
];

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  open,
  onClose,
  projectId,
  onUploadSuccess
}) => {
  const [uploadMode, setUploadMode] = useState<'file' | 'google_sheet'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      if (!documentName) {
        setDocumentName(selectedFile.name);
      }
      setError(null);
    }
  }, [documentName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/csv': ['.csv'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: false
  });

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleUploadFile = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_name', documentName);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('tags', tags.join(','));

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL}/projects/${projectId}/documents/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          },
          onUploadProgress: (progressEvent) => {
            const progress = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            setUploadProgress(progress);
          }
        }
      );

      toast.success('Document uploaded successfully!');
      onUploadSuccess();
      handleClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to upload document';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleImportGoogleSheet = async () => {
    if (!googleSheetUrl.trim()) {
      setError('Please enter a Google Sheets URL');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL}/projects/${projectId}/documents/import-google-sheet`,
        {
          google_sheet_url: googleSheetUrl,
          document_name: documentName,
          category,
          description
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      toast.success('Google Sheet imported successfully!');
      onUploadSuccess();
      handleClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to import Google Sheet';
      const detailMessage = err.response?.data?.message;
      setError(detailMessage || errorMessage);
      
      if (err.response?.status === 503) {
        toast.error('Google Sheets integration not configured. Please contact your administrator.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setDocumentName('');
    setCategory('other');
    setDescription('');
    setTags([]);
    setTagInput('');
    setGoogleSheetUrl('');
    setUploadProgress(0);
    setError(null);
    setUploadMode('file');
    onClose();
  };

  const handleSubmit = () => {
    if (uploadMode === 'file') {
      handleUploadFile();
    } else {
      handleImportGoogleSheet();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Upload Document</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Upload Mode Selection */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
            <Button
              variant={uploadMode === 'file' ? 'contained' : 'outlined'}
              startIcon={<CloudUpload />}
              onClick={() => setUploadMode('file')}
            >
              Upload File
            </Button>
            <Button
              variant={uploadMode === 'google_sheet' ? 'contained' : 'outlined'}
              startIcon={<LinkIcon />}
              onClick={() => setUploadMode('google_sheet')}
            >
              Import Google Sheet
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {uploadMode === 'file' ? (
            <>
              {/* File Upload Dropzone */}
              <Box
                {...getRootProps()}
                sx={{
                  border: '2px dashed',
                  borderColor: isDragActive ? 'primary.main' : 'grey.300',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                  mb: 3,
                  transition: 'all 0.2s'
                }}
              >
                <input {...getInputProps()} />
                <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {isDragActive ? 'Drop file here' : 'Drag & drop a file here'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  or click to select a file
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Supported: PDF, Excel, Word, CSV, PNG, JPG, JPEG (Max 50MB)
                </Typography>
                <Typography variant="caption" color="primary.main" sx={{ mt: 0.5, display: 'block', fontWeight: 'bold' }}>
                  📸 Images Supported: Upload photos, screenshots, diagrams
                </Typography>
              </Box>

              {file && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </Alert>
              )}
            </>
          ) : (
            <>
              {/* Google Sheets URL Input */}
              <TextField
                fullWidth
                label="Google Sheets URL"
                value={googleSheetUrl}
                onChange={(e) => setGoogleSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                sx={{ mb: 2 }}
              />
            </>
          )}

          {/* Common Fields */}
          <TextField
            fullWidth
            label="Document Name"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            sx={{ mb: 2 }}
            required
          />

          <TextField
            fullWidth
            select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            sx={{ mb: 2 }}
          >
            {DOCUMENT_CATEGORIES.map((cat) => (
              <MenuItem key={cat.value} value={cat.value}>
                {cat.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />

          {/* Tags Input */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Add Tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              InputProps={{
                endAdornment: (
                  <Button size="small" onClick={handleAddTag}>
                    Add
                  </Button>
                )
              }}
            />
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  size="small"
                />
              ))}
            </Box>
          </Box>

          {uploading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                {uploadProgress}% uploaded
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={uploading || (uploadMode === 'file' ? !file : !googleSheetUrl)}
        >
          {uploading ? 'Uploading...' : uploadMode === 'file' ? 'Upload' : 'Import'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentUpload;
