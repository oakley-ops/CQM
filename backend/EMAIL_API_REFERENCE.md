# Email API Reference

Quick reference for all email-related API endpoints.

## Base URL
```
http://localhost:5000/api/email
```

## Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Endpoints

### 1. Get Email Status
Check if email service is configured and ready.

**GET** `/api/email/status`

**Response:**
```json
{
  "success": true,
  "data": {
    "configured": true,
    "emailUser": "service@gmail.com",
    "service": "Gmail",
    "status": "Ready"
  }
}
```

---

### 2. Verify Email Configuration
Test the email service connection.

**POST** `/api/email/verify`

**Response:**
```json
{
  "success": true,
  "message": "Email service is ready"
}
```

---

### 3. Send Test Email
Send a test email to verify configuration.

**POST** `/api/email/test`

**Request Body:**
```json
{
  "recipient": "test@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "messageId": "<message-id@gmail.com>"
}
```

---

### 4. Send Executive Dashboard Report
Send a formatted executive dashboard report via email.

**POST** `/api/email/reports/:projectId/executive`

**URL Parameters:**
- `projectId` - The ID of the project

**Request Body:**
```json
{
  "recipients": [
    "stakeholder1@example.com",
    "stakeholder2@example.com"
  ],
  "includeUrl": true
}
```

**Fields:**
- `recipients` (required) - Array of email addresses
- `includeUrl` (optional) - Include link to view report online (default: false)

**Response:**
```json
{
  "success": true,
  "message": "Executive dashboard sent to 2 recipient(s)",
  "messageId": "<message-id@gmail.com>"
}
```

**Email Includes:**
- Overall project status with color coding
- Budget metrics (planned, actual, variance, CPI)
- Schedule progress (tasks completed, overdue, SPI)
- Quality metrics (pass rate, defects)
- Risk summary (active, critical)
- Active issues list
- Upcoming milestones
- Optional link to full dashboard

---

### 5. Send Status Report
Send a periodic status report via email.

**POST** `/api/email/reports/:projectId/status`

**URL Parameters:**
- `projectId` - The ID of the project

**Request Body:**
```json
{
  "recipients": ["manager@example.com"],
  "period": "Weekly",
  "includeUrl": true
}
```

**Fields:**
- `recipients` (required) - Array of email addresses
- `period` (optional) - Report period (e.g., "Weekly", "Monthly", "Daily")
- `includeUrl` (optional) - Include link to view report online

**Response:**
```json
{
  "success": true,
  "message": "Status report sent to 1 recipient(s)",
  "messageId": "<message-id@gmail.com>"
}
```

---

### 6. Send Custom Email
Send a custom email with HTML content.

**POST** `/api/email/send`

**Request Body:**
```json
{
  "recipients": ["user1@example.com", "user2@example.com"],
  "subject": "Project Update",
  "message": "<h2>Important Update</h2><p>Your HTML message here</p>",
  "attachments": []
}
```

**Fields:**
- `recipients` (required) - Array of email addresses
- `subject` (required) - Email subject line
- `message` (required) - HTML or plain text message
- `attachments` (optional) - Array of attachment objects

**Attachment Format:**
```json
{
  "filename": "report.pdf",
  "path": "/path/to/file.pdf"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent to 2 recipient(s)",
  "messageId": "<message-id@gmail.com>"
}
```

---

## Error Responses

### Email Service Not Configured
```json
{
  "success": false,
  "message": "Email service not initialized. Please configure EMAIL_USER and EMAIL_PASSWORD in .env"
}
```

### Missing Recipients
```json
{
  "success": false,
  "message": "At least one recipient email is required"
}
```

### Project Not Found
```json
{
  "success": false,
  "message": "Project not found"
}
```

### Email Send Failure
```json
{
  "success": false,
  "message": "Failed to send email",
  "error": "Detailed error message"
}
```

---

## Usage Examples

### cURL Examples

#### Test Email
```bash
curl -X POST http://localhost:5000/api/email/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"recipient": "test@example.com"}'
```

#### Send Executive Dashboard
```bash
curl -X POST http://localhost:5000/api/email/reports/1/executive \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "recipients": ["stakeholder@example.com"],
    "includeUrl": true
  }'
```

#### Send Custom Email
```bash
curl -X POST http://localhost:5000/api/email/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "recipients": ["user@example.com"],
    "subject": "Test Email",
    "message": "<h1>Hello</h1><p>This is a test</p>"
  }'
```

### JavaScript/TypeScript Examples

#### Using Fetch API
```typescript
// Send Executive Dashboard
const sendDashboard = async (projectId: number) => {
  const response = await fetch(`/api/email/reports/${projectId}/executive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      recipients: ['stakeholder@example.com'],
      includeUrl: true
    })
  });
  
  const data = await response.json();
  return data;
};
```

#### Using Axios
```typescript
import axios from 'axios';

// Send Test Email
const sendTestEmail = async (recipient: string) => {
  const response = await axios.post('/api/email/test', 
    { recipient },
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return response.data;
};
```

---

## Rate Limits

- **Gmail Free Account:** 500 emails/day, 100 recipients/email
- **Google Workspace:** 2,000 emails/day, 2,000 recipients/email
- **API Rate Limit:** 100 requests per 15 minutes (configurable)

---

## Notes

1. All email endpoints require authentication
2. Recipients must be valid email addresses
3. HTML content is supported in custom emails
4. Email service must be configured in `.env` before use
5. Check spam folders if emails are not received
6. Monitor Gmail sending limits to avoid service interruption
