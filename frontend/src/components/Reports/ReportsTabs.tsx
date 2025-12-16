import { useState } from 'react';
import { Box, Tabs, Tab, Button } from '@mui/material';
import { Dashboard as DashboardIcon, Assessment as ReportIcon, Email as EmailIcon, PictureAsPdf as PdfIcon } from '@mui/icons-material';
import ExecutiveDashboard from './ExecutiveDashboard';
import EmailReportDialog from './EmailReportDialog';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface ReportsTabsProps {
  projectId: number;
}

const ReportsTabs = ({ projectId }: ReportsTabsProps) => {
  const [value, setValue] = useState(0);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailReportType, setEmailReportType] = useState<'executive' | 'status'>('status');
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleExportPDF = async (reportType: 'executive' | 'status') => {
    // Prevent multiple simultaneous requests
    if (exportingPdf) {
      return;
    }
    
    setExportingPdf(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = reportType === 'executive'
        ? `/api/projects/${projectId}/reports/executive-dashboard/pdf`
        : `/api/projects/${projectId}/reports/status-report/pdf?period=Weekly`;

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        }
        const errorData = await response.json().catch(() => ({ message: 'Failed to export PDF' }));
        throw new Error(errorData.message || 'Failed to export PDF');
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${reportType === 'executive' ? 'Executive_Dashboard' : 'Status_Report'}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange}>
          <Tab icon={<DashboardIcon />} label="Executive Dashboard" />
          <Tab icon={<ReportIcon />} label="Status Report" />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <ExecutiveDashboard projectId={projectId} />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <ReportIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Box sx={{ typography: 'h6', color: 'text.secondary' }}>Status Report</Box>
          <Box sx={{ typography: 'body2', color: 'text.secondary', mt: 1 }}>
            Detailed status report with accomplishments, issues, and decisions needed
          </Box>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
            <Button
              variant="contained"
              startIcon={<EmailIcon />}
              onClick={() => {
                setEmailReportType('status');
                setShowEmailDialog(true);
              }}
            >
              Email Status Report
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<PdfIcon />}
              onClick={() => handleExportPDF('status')}
              disabled={exportingPdf}
            >
              {exportingPdf ? 'Exporting...' : 'Export to PDF'}
            </Button>
          </Box>
        </Box>
      </TabPanel>

      {/* Email Dialog */}
      {showEmailDialog && (
        <EmailReportDialog
          projectId={projectId}
          reportType={emailReportType}
          onClose={() => setShowEmailDialog(false)}
        />
      )}
    </Box>
  );
};

export default ReportsTabs;
