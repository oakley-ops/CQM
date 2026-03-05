import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Grid,
  Divider,
  IconButton,
  Alert
} from '@mui/material';
import { Close, Download, OpenInNew } from '@mui/icons-material';
import { format } from 'date-fns';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface DocumentViewerProps {
  open: boolean;
  onClose: () => void;
  document: {
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
  };
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ open, onClose, document }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setPdfError('Failed to load PDF document');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownload = () => {
    const token = localStorage.getItem('token');
    const url = `${import.meta.env.VITE_API_URL}/documents/${document.id}/download`;
    
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = document.original_filename;
        window.document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(error => {
        console.error('Download error:', error);
      });
  };

  const renderPreview = () => {
    if (document.document_type === 'pdf') {
      const pdfUrl = `${import.meta.env.VITE_API_URL}/documents/${document.id}/download`;
      const token = localStorage.getItem('token');

      return (
        <Box sx={{ maxHeight: '600px', overflow: 'auto', textAlign: 'center' }}>
          {pdfError ? (
            <Alert severity="error">{pdfError}</Alert>
          ) : (
            <>
              <Document
                file={{
                  url: pdfUrl,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  httpHeaders: { Authorization: `Bearer ${token}` }
                } as any}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
              >
                <Page pageNumber={pageNumber} />
              </Document>
              
              {numPages && numPages > 1 && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                  <Button
                    size="small"
                    disabled={pageNumber <= 1}
                    onClick={() => setPageNumber(pageNumber - 1)}
                  >
                    Previous
                  </Button>
                  <Typography variant="body2">
                    Page {pageNumber} of {numPages}
                  </Typography>
                  <Button
                    size="small"
                    disabled={pageNumber >= numPages}
                    onClick={() => setPageNumber(pageNumber + 1)}
                  >
                    Next
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      );
    }

    if (document.google_sheet_url) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" gutterBottom>
            This is a Google Sheets document
          </Typography>
          <Button
            variant="contained"
            startIcon={<OpenInNew />}
            onClick={() => window.open(document.google_sheet_url!, '_blank')}
            sx={{ mt: 2 }}
          >
            Open in Google Sheets
          </Button>
        </Box>
      );
    }

    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          Preview not available for this file type
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={handleDownload}
          sx={{ mt: 2 }}
        >
          Download to View
        </Button>
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{document.document_name}</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {/* Document Metadata */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">
              Category
            </Typography>
            <Box>
              <Chip label={document.category} size="small" />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">
              File Size
            </Typography>
            <Typography variant="body2">
              {formatFileSize(document.file_size)}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">
              Uploaded By
            </Typography>
            <Typography variant="body2">
              {document.uploader.first_name} {document.uploader.last_name}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">
              Upload Date
            </Typography>
            <Typography variant="body2">
              {format(new Date(document.created_at), 'MMM dd, yyyy HH:mm')}
            </Typography>
          </Grid>
          
          {document.description && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body2">
                {document.description}
              </Typography>
            </Grid>
          )}
          
          {document.tags && document.tags.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Tags
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {document.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                ))}
              </Box>
            </Grid>
          )}
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Document Preview */}
        {renderPreview()}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleDownload} startIcon={<Download />}>
          Download
        </Button>
        {document.google_sheet_url && (
          <Button
            onClick={() => window.open(document.google_sheet_url!, '_blank')}
            startIcon={<OpenInNew />}
          >
            Open in Google Sheets
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentViewer;
