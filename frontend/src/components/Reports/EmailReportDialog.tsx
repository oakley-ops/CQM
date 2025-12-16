import React, { useState } from 'react';
import { 
  Email as MailIcon, 
  Send as SendIcon, 
  Close as CloseIcon, 
  Add as PlusIcon, 
  Delete as DeleteIcon 
} from '@mui/icons-material';

interface EmailReportDialogProps {
  projectId: number;
  reportType: 'executive' | 'status';
  onClose: () => void;
}

const EmailReportDialog: React.FC<EmailReportDialogProps> = ({
  projectId,
  reportType,
  onClose
}) => {
  const [recipients, setRecipients] = useState<string[]>(['']);
  const [period, setPeriod] = useState('Weekly');
  const [includeUrl, setIncludeUrl] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const addRecipient = () => {
    setRecipients([...recipients, '']);
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const updateRecipient = (index: number, value: string) => {
    const newRecipients = [...recipients];
    newRecipients[index] = value;
    setRecipients(newRecipients);
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSend = async () => {
    // Validate recipients
    const validRecipients = recipients.filter(r => r.trim() !== '');
    
    if (validRecipients.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one recipient' });
      return;
    }

    const invalidEmails = validRecipients.filter(r => !validateEmail(r));
    if (invalidEmails.length > 0) {
      setMessage({ type: 'error', text: 'Please enter valid email addresses' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const endpoint = reportType === 'executive' 
        ? `/api/email/reports/${projectId}/executive`
        : `/api/email/reports/${projectId}/status`;

      const body = reportType === 'executive'
        ? { recipients: validRecipients, includeUrl }
        : { recipients: validRecipients, period, includeUrl };

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `Report sent successfully to ${validRecipients.length} recipient(s)!` 
        });
        
        // Close dialog after 2 seconds
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to send report' });
      }
    } catch (error) {
      console.error('Error sending report:', error);
      setMessage({ type: 'error', text: 'Failed to send report. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <MailIcon className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">
              Email {reportType === 'executive' ? 'Executive Dashboard' : 'Status Report'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipients
            </label>
            <div className="space-y-2">
              {recipients.map((recipient, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="email"
                    value={recipient}
                    onChange={(e) => updateRecipient(index, e.target.value)}
                    placeholder="email@example.com"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {recipients.length > 1 && (
                    <button
                      onClick={() => removeRecipient(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <DeleteIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addRecipient}
              className="mt-2 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <PlusIcon className="w-4 h-4" />
              Add recipient
            </button>
          </div>

          {/* Period (for status reports only) */}
          {reportType === 'status' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
              </select>
            </div>
          )}

          {/* Include URL */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includeUrl"
              checked={includeUrl}
              onChange={(e) => setIncludeUrl(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="includeUrl" className="text-sm text-gray-700">
              Include link to view full report online
            </label>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-3 rounded-md ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <SendIcon className="w-4 h-4" />
                Send Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailReportDialog;
