# Email Report Dialog - Integration Example

## How to Use the EmailReportDialog Component

The `EmailReportDialog` component provides a user-friendly interface for sending executive dashboards and status reports via email.

### Basic Usage

```typescript
import React, { useState } from 'react';
import EmailReportDialog from '../components/Reports/EmailReportDialog';
import { Button } from '@mui/material';
import { Email } from '@mui/icons-material';

const ReportsPage = () => {
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [reportType, setReportType] = useState<'executive' | 'status'>('executive');
  const projectId = 1; // Get from your route params or state

  const handleEmailExecutive = () => {
    setReportType('executive');
    setShowEmailDialog(true);
  };

  const handleEmailStatus = () => {
    setReportType('status');
    setShowEmailDialog(true);
  };

  return (
    <div>
      <h1>Project Reports</h1>
      
      {/* Email Buttons */}
      <div style={{ display: 'flex', gap: '10px', margin: '20px 0' }}>
        <Button
          variant="contained"
          startIcon={<Email />}
          onClick={handleEmailExecutive}
        >
          Email Executive Dashboard
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<Email />}
          onClick={handleEmailStatus}
        >
          Email Status Report
        </Button>
      </div>

      {/* Email Dialog */}
      {showEmailDialog && (
        <EmailReportDialog
          projectId={projectId}
          reportType={reportType}
          onClose={() => setShowEmailDialog(false)}
        />
      )}
      
      {/* Your existing reports content */}
    </div>
  );
};

export default ReportsPage;
```

### Integration with ReportsTabs Component

If you want to add email functionality to your existing `ReportsTabs.tsx`:

```typescript
// In ReportsTabs.tsx
import React, { useState } from 'react';
import { Button } from '@mui/material';
import { Email } from '@mui/icons-material';
import EmailReportDialog from './EmailReportDialog';

// Inside your component
const [showEmailDialog, setShowEmailDialog] = useState(false);
const [emailReportType, setEmailReportType] = useState<'executive' | 'status'>('executive');

// Add this button near your Executive Dashboard section
<Button
  variant="outlined"
  size="small"
  startIcon={<Email />}
  onClick={() => {
    setEmailReportType('executive');
    setShowEmailDialog(true);
  }}
  sx={{ ml: 2 }}
>
  Email Report
</Button>

// Add the dialog at the end of your component
{showEmailDialog && (
  <EmailReportDialog
    projectId={projectId}
    reportType={emailReportType}
    onClose={() => setShowEmailDialog(false)}
  />
)}
```

### Features

The dialog provides:

1. **Multiple Recipients**: Add multiple email addresses
2. **Email Validation**: Validates email format before sending
3. **Period Selection**: For status reports, choose Daily/Weekly/Monthly/Quarterly
4. **Include URL Option**: Optionally include a link to view the full report online
5. **Loading State**: Shows spinner while sending
6. **Success/Error Messages**: Clear feedback on send status
7. **Auto-close**: Automatically closes after successful send

### API Requirements

Make sure your backend is configured:

1. **Environment Variables** (`.env`):
   ```env
   EMAIL_USER=service@gmail.com
   EMAIL_PASSWORD=your_gmail_app_password
   ```

2. **Backend Running**: The backend server must be running on `http://localhost:5000`

3. **Authentication**: User must be logged in (JWT token in localStorage)

### Styling

The component uses Tailwind CSS classes. If you prefer Material-UI styling, you can replace the className attributes with MUI's `sx` prop:

```typescript
// Example conversion
<div className="p-6 space-y-4">
  // becomes
<Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
```

### Customization

You can customize the component by:

1. **Changing Colors**: Update the Tailwind classes (e.g., `bg-blue-600` to `bg-green-600`)
2. **Adding Fields**: Add more form fields like CC, BCC, custom message
3. **Attachment Support**: Extend to support file attachments
4. **Templates**: Add predefined recipient lists

### Example: Adding to Executive Dashboard

```typescript
// In your Executive Dashboard component
import { IconButton, Tooltip } from '@mui/material';
import { Email } from '@mui/icons-material';
import EmailReportDialog from './EmailReportDialog';

const ExecutiveDashboard = ({ projectId }) => {
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Executive Dashboard</h2>
        
        <Tooltip title="Email this dashboard">
          <IconButton 
            color="primary" 
            onClick={() => setShowEmailDialog(true)}
          >
            <Email />
          </IconButton>
        </Tooltip>
      </div>

      {/* Dashboard content */}
      
      {showEmailDialog && (
        <EmailReportDialog
          projectId={projectId}
          reportType="executive"
          onClose={() => setShowEmailDialog(false)}
        />
      )}
    </div>
  );
};
```

### Testing

1. **Test Email Configuration**:
   ```bash
   curl -X POST http://localhost:5000/api/email/test \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"recipient": "your-email@example.com"}'
   ```

2. **Check Email Status**:
   ```bash
   curl http://localhost:5000/api/email/status \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

### Troubleshooting

**Dialog doesn't open:**
- Check that `showEmailDialog` state is being set to `true`
- Verify the component is imported correctly

**Email not sending:**
- Check browser console for errors
- Verify backend is running
- Check that EMAIL_USER and EMAIL_PASSWORD are configured
- Ensure you're using a Gmail App Password, not regular password

**Styling issues:**
- Make sure Tailwind CSS is configured in your project
- Or convert to Material-UI styling

### Next Steps

1. Add the email button to your Reports page
2. Test with your email address
3. Customize the styling to match your app
4. Add scheduled reports (future enhancement)
5. Add email templates for different stakeholders

---

**Component Location:** `src/components/Reports/EmailReportDialog.tsx`
