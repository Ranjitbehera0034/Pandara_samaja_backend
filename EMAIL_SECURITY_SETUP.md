# Email Security Alerts Setup Guide

## Overview
The system now sends email alerts whenever an admin user logs in, providing enhanced security monitoring.

## Features
- **Automatic Email Alerts**: Sends an email notification when any admin logs in
- **Detailed Login Information**: Includes username, IP address, timestamp, and user agent
- **Professional Email Template**: Clean, branded HTML email design
- **Non-blocking**: Email sending happens asynchronously to not delay login response

## Setup Instructions

### 1. Gmail Setup (Recommended)

#### Option A: Using Gmail with App Password (Recommended)
1. Enable 2-Factor Authentication on your Gmail account
2. Go to [Google Account Settings](https://myaccount.google.com/)
3. Navigate to Security → 2-Step Verification → App passwords
4. Generate a new app password for "Mail"
5. Copy the 16-character password

#### Option B: Using Gmail with Less Secure Apps (Not Recommended)
1. Go to [Less secure app access](https://myaccount.google.com/lesssecureapps)
2. Turn on "Allow less secure apps"
3. Use your regular Gmail password

### 2. Environment Configuration

Add these variables to your `.env` file:

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=nikhilaodishapandarasamaja@gmail.com
SMTP_PASS=your-app-password-here

# Alert Recipients
ALERT_EMAIL_TO=nikhilaodishapandarasamaja@gmail.com
ALERT_EMAIL_FROM=nikhilaodishapandarasamaja@gmail.com
```

### 3. Using Other Email Providers

#### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### AWS SES
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-aws-smtp-username
SMTP_PASS=your-aws-smtp-password
```

#### Outlook/Office 365
```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

## Testing

To test the email functionality:

1. Configure your `.env` file with valid SMTP credentials
2. Restart the server
3. Login as admin via the API:
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
   ```
4. Check the configured email inbox for the security alert

## Email Content

The security alert email includes:
- **Username**: The admin account that logged in
- **User Role**: Confirmation of admin role
- **IP Address**: Client IP address
- **Timestamp**: Exact time of login
- **User Agent**: Browser/client information

## Troubleshooting

### Email not sending?

1. **Check SMTP credentials**: Verify `SMTP_USER` and `SMTP_PASS` are correct
2. **Check server logs**: Look for error messages starting with `❌ Failed to send security alert email:`
3. **Verify SMTP settings**: Ensure `SMTP_HOST` and `SMTP_PORT` match your provider
4. **Check firewall**: Ensure port 587 is not blocked
5. **Gmail specific**: Make sure 2FA is enabled and you're using an app password

### Warning message: "SMTP credentials not found"

This means `SMTP_USER` or `SMTP_PASS` are not set in your `.env` file. The system will continue to work, but no emails will be sent.

## Security Best Practices

1. **Never commit `.env` file**: Keep SMTP credentials secure
2. **Use app passwords**: Don't use your main email password
3. **Monitor alerts**: Regularly check security alert emails
4. **Rotate credentials**: Change SMTP passwords periodically
5. **Use dedicated email**: Consider a dedicated email account for system alerts

## Disabling Email Alerts

To disable email alerts temporarily:
1. Remove or comment out `SMTP_USER` and `SMTP_PASS` from `.env`
2. The system will log a warning but continue to function normally

## Future Enhancements

Potential improvements:
- Failed login attempt notifications
- Multiple recipient support
- SMS/Slack integration
- Rate limiting for alert emails
- Customizable email templates
