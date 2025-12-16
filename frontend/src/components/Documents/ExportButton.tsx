import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Download as DownloadIcon,
  Description as DocumentIcon,
  Assignment as TaskIcon,
  AttachMoney as BudgetIcon,
  Warning as RiskIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';

interface ExportButtonProps {
  projectId: number;
}

const ExportButton: React.FC<ExportButtonProps> = ({ projectId }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const [exportType, setExportType] = useState<string>('');

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExcelExport = async (type: 'documents' | 'tasks' | 'budget' | 'risks' | 'complete') => {
    handleClose();
    setLoading(true);
    setExportType(type);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/excel-export/projects/${projectId}/${type}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `export_${type}_${Date.now()}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`${getExportTypeLabel(type)} exported successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setLoading(false);
      setExportType('');
    }
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
        startIcon={loading ? <CircularProgress size={20} /> : <DownloadIcon />}
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? `Exporting ${getExportTypeLabel(exportType)}...` : 'Export to Excel'}
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
        <MenuItem onClick={() => handleExcelExport('documents')}>
          <ListItemIcon>
            <DocumentIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export Documents</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleExcelExport('tasks')}>
          <ListItemIcon>
            <TaskIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export Tasks</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleExcelExport('budget')}>
          <ListItemIcon>
            <BudgetIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export Budget & Expenses</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleExcelExport('risks')}>
          <ListItemIcon>
            <RiskIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export Risks</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={() => handleExcelExport('complete')}>
          <ListItemIcon>
            <DashboardIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <strong>Export Complete Project</strong>
          </ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default ExportButton;
