import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Link,
  Box
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Description as DocumentIcon,
  Assignment as TaskIcon,
  AttachMoney as BudgetIcon,
  Warning as RiskIcon,
  Dashboard as DashboardIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';

interface ExportToSheetsButtonProps {
  projectId: number;
}

const ExportToSheetsButton: React.FC<ExportToSheetsButtonProps> = ({
  projectId
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const [exportType, setExportType] = useState<string>('');
  const [resultDialog, setResultDialog] = useState<{
    open: boolean;
    url?: string;
    count?: number;
    type?: string;
  }>({ open: false });

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExport = async (type: 'documents' | 'tasks' | 'budget' | 'risks' | 'complete') => {
    handleClose();
    setLoading(true);
    setExportType(type);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/export/projects/${projectId}/${type}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        setResultDialog({
          open: true,
          url: data.data.url,
          count: data.data.documentCount || data.data.taskCount || data.data.riskCount || 0,
          type: type
        });
        toast.success(`Exported to Google Sheets successfully!`);
      } else {
        toast.error(data.message || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export to Google Sheets');
    } finally {
      setLoading(false);
      setExportType('');
    }
  };

  const handleCloseResultDialog = () => {
    setResultDialog({ open: false });
  };

  const handleOpenSheet = () => {
    if (resultDialog.url) {
      window.open(resultDialog.url, '_blank');
    }
    handleCloseResultDialog();
  };

  const getExportTypeLabel = (type?: string) => {
    switch (type) {
      case 'documents': return 'Documents';
      case 'tasks': return 'Tasks';
      case 'budget': return 'Budget & Expenses';
      case 'risks': return 'Risks';
      case 'complete': return 'Complete Project Data';
      default: return 'Data';
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={loading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? `Exporting ${getExportTypeLabel(exportType)}...` : 'Export to Google Sheets'}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => handleExport('documents')}>
          <ListItemIcon>
            <DocumentIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export Documents</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleExport('tasks')}>
          <ListItemIcon>
            <TaskIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export Tasks</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleExport('budget')}>
          <ListItemIcon>
            <BudgetIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export Budget & Expenses</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleExport('risks')}>
          <ListItemIcon>
            <RiskIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export Risks</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleExport('complete')} sx={{ borderTop: 1, borderColor: 'divider', mt: 1, pt: 1 }}>
          <ListItemIcon>
            <DashboardIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <strong>Export Complete Project</strong>
          </ListItemText>
        </MenuItem>
      </Menu>

      {/* Success Dialog */}
      <Dialog open={resultDialog.open} onClose={handleCloseResultDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CheckIcon color="success" />
            Export Successful
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            {getExportTypeLabel(resultDialog.type)} exported to Google Sheets successfully!
          </Typography>
          
          {resultDialog.count !== undefined && resultDialog.count > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {resultDialog.count} items exported
            </Typography>
          )}

          {resultDialog.url && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Spreadsheet URL:
              </Typography>
              <Link
                href={resultDialog.url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'block', wordBreak: 'break-all', fontSize: '0.875rem' }}
              >
                {resultDialog.url}
              </Link>
            </Box>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Click "Open Google Sheet" to view the exported data.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResultDialog}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleOpenSheet}
            startIcon={<CloudUploadIcon />}
          >
            Open Google Sheet
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ExportToSheetsButton;
