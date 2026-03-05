import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  TextField,
  MenuItem,
  InputAdornment,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  CloudUpload,
  Download,
  Delete,
  Visibility,
  Search,
  Archive,
  Unarchive,
  CloudDownload,
  InsertDriveFile,
  PictureAsPdf,
  TableChart,
  Image as ImageIcon
} from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import DocumentUpload from './DocumentUpload';
import DocumentViewer from './DocumentViewer';
import ExportButton from './ExportButton';

interface Document {
  id: number;
  document_name: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  document_type: string;
  category: string;
  description: string;
  tags: string[];
  google_sheet_url: string | null;
  is_archived: boolean;
  created_at: string;
  uploader: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface DocumentStats {
  total: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  totalSize: number;
}

interface DocumentListProps {
  projectId: number;
}

const DOCUMENT_CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'photo', label: '📸 Photos/Images' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'contract', label: 'Contract' },
  { value: 'report', label: 'Report' },
  { value: 'specification', label: 'Specification' },
  { value: 'meeting_minutes', label: 'Meeting Minutes' },
  { value: 'other', label: 'Other' }
];

const DocumentList: React.FC<DocumentListProps> = ({ projectId }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [_loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewerDialogOpen, setViewerDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchDocuments();
    fetchStats();
  }, [projectId, categoryFilter, showArchived]);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const params: any = { archived: showArchived };
      
      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/projects/${projectId}/documents`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params
        }
      );

      setDocuments(response.data.documents);
    } catch (error: any) {
      toast.error('Failed to fetch documents');
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/projects/${projectId}/documents/stats`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDownload = async (documentId: number, filename: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/documents/${documentId}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Document downloaded successfully');
    } catch (error) {
      toast.error('Failed to download document');
      console.error('Error downloading document:', error);
    }
  };

  const handleDelete = async (documentId: number) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/documents/${documentId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success('Document deleted successfully');
      fetchDocuments();
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete document');
      console.error('Error deleting document:', error);
    }
  };

  const handleArchive = async (documentId: number, archive: boolean) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/documents/${documentId}/archive`,
        { archived: archive },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success(`Document ${archive ? 'archived' : 'unarchived'} successfully`);
      fetchDocuments();
      fetchStats();
    } catch (error) {
      toast.error(`Failed to ${archive ? 'archive' : 'unarchive'} document`);
      console.error('Error archiving document:', error);
    }
  };

  const handleView = (document: Document) => {
    setSelectedDocument(document);
    setViewerDialogOpen(true);
  };

  const getDocumentIcon = (type: string, mimeType?: string) => {
    // Check if it's an image by mime type
    if (mimeType && mimeType.startsWith('image/')) {
      return <ImageIcon color="info" />;
    }
    
    switch (type) {
      case 'pdf':
        return <PictureAsPdf color="error" />;
      case 'google_sheet':
      case 'excel':
        return <TableChart color="success" />;
      case 'image':
        return <ImageIcon color="info" />;
      default:
        return <InsertDriveFile color="action" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Box>
      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Documents
                </Typography>
                <Typography variant="h4">{stats.total}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  PDF Files
                </Typography>
                <Typography variant="h4">{stats.byType.pdf || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Invoices
                </Typography>
                <Typography variant="h4">{stats.byCategory.invoice || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Size
                </Typography>
                <Typography variant="h4">{formatFileSize(stats.totalSize)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Paper sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Project Documents</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <ExportButton projectId={projectId} />
            <Button
              variant="contained"
              startIcon={<CloudUpload />}
              onClick={() => setUploadDialogOpen(true)}
            >
              Upload Document
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                fetchDocuments();
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              )
            }}
            sx={{ flexGrow: 1, minWidth: 200 }}
          />

          <TextField
            select
            label="Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            {DOCUMENT_CATEGORIES.map((cat) => (
              <MenuItem key={cat.value} value={cat.value}>
                {cat.label}
              </MenuItem>
            ))}
          </TextField>

          <Button
            variant={showArchived ? 'contained' : 'outlined'}
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </Button>
        </Box>

        {/* Documents Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Uploaded By</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Tags</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="text.secondary">
                      No documents found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id} hover>
                    <TableCell>{getDocumentIcon(doc.document_type, doc.mime_type)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {doc.document_name}
                      </Typography>
                      {doc.description && (
                        <Typography variant="caption" color="text.secondary">
                          {doc.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={doc.category} size="small" />
                    </TableCell>
                    <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                    <TableCell>
                      {doc.uploader.first_name} {doc.uploader.last_name}
                    </TableCell>
                    <TableCell>
                      {format(new Date(doc.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {doc.tags?.slice(0, 2).map((tag) => (
                          <Chip key={tag} label={tag} size="small" variant="outlined" />
                        ))}
                        {doc.tags?.length > 2 && (
                          <Chip label={`+${doc.tags.length - 2}`} size="small" variant="outlined" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleView(doc)}
                        title="View"
                      >
                        <Visibility />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDownload(doc.id, doc.original_filename)}
                        title="Download"
                      >
                        <Download />
                      </IconButton>
                      {doc.google_sheet_url && (
                        <IconButton
                          size="small"
                          onClick={() => window.open(doc.google_sheet_url!, '_blank')}
                          title="Open in Google Sheets"
                        >
                          <CloudDownload />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => handleArchive(doc.id, !doc.is_archived)}
                        title={doc.is_archived ? 'Unarchive' : 'Archive'}
                      >
                        {doc.is_archived ? <Unarchive /> : <Archive />}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(doc.id)}
                        title="Delete"
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Upload Dialog */}
      <DocumentUpload
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        projectId={projectId}
        onUploadSuccess={() => {
          fetchDocuments();
          fetchStats();
        }}
      />

      {/* Viewer Dialog */}
      {selectedDocument && (
        <DocumentViewer
          open={viewerDialogOpen}
          onClose={() => {
            setViewerDialogOpen(false);
            setSelectedDocument(null);
          }}
          document={selectedDocument}
        />
      )}
    </Box>
  );
};

export default DocumentList;
