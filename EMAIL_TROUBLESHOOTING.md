# Email Troubleshooting Guide

## Common Issues and Solutions

### 1. Connection Timeout Error

**Error Message:**
```
❌ Failed to send security alert email: Error: Connection timeout
code: 'ETIMEDOUT'
```

**Cause:** Hosting platform (like Render) blocks outgoing connections on port 587.

**Solution:** Use port 465 with SSL instead.

#### For Render (Production):
Update environment variables:
```bash
SMTP_PORT=465
```

#### For Local Development:
You can use either:
- Port 465 (SSL) - Recommended
- Port 587 (TLS) - Also works

Update your `.env` file:
```bash
SMTP_PORT=465
```

---

### 2. Authentication Failed

**Error Message:**
```
❌ Failed to send security alert email: Error: Invalid login
code: 'EAUTH'
```

**Causes:**
- Using regular Gmail password instead of App Password
- 2-Factor Authentication not enabled
- Incorrect App Password

**Solution:**

1. **Enable 2FA on Gmail:**
   - Go to: https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select: Mail → Other (Custom name)
   - Copy the 16-character password
   - Remove spaces: `abcd efgh ijkl mnop` → `abcdefghijklmnop`

3. **Update .env:**
   ```bash
   SMTP_PASS=abcdefghijklmnop
   ```

---

### 3. SMTP Credentials Not Found

**Error Message:**
```
⚠️ SMTP credentials not found. Skipping email alert.
```

**Cause:** Environment variables not set.

**Solution:**

Check your `.env` file has:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=nikhilaodishapandarasamaja@gmail.com
SMTP_PASS=your-app-password
ALERT_EMAIL_TO=nikhilaodishapandarasamaja@gmail.com
ALERT_EMAIL_FROM=nikhilaodishapandarasamaja@gmail.com
```

**Verify with:**
```bash
node check-email-config.js
```

---

### 4. Email Not Received

**Possible Causes:**

1. **Check Spam/Junk Folder**
   - Gmail might filter automated emails

2. **Wrong Email Address**
   - Verify `ALERT_EMAIL_TO` is correct

3. **Gmail Blocked the Email**
   - Check Gmail's "Blocked" or "Spam" settings

4. **App Password Expired**
   - Generate a new App Password

**Debug Steps:**

1. Check server logs for success message:
   ```
   ✅ Security alert email sent: <message-id>
   ```

2. If you see the success message but no email:
   - Check spam folder
   - Check Gmail filters
   - Try a different email address

---

### 5. Port Issues on Different Platforms

#### Render
- ✅ Port 465 (SSL) - **Recommended**
- ❌ Port 587 (TLS) - Often blocked

#### Heroku
- ✅ Port 465 (SSL) - Works
- ✅ Port 587 (TLS) - Works

#### AWS EC2/DigitalOcean
- ✅ Port 465 (SSL) - Works
- ✅ Port 587 (TLS) - Works
- ⚠️ May need to configure firewall rules

#### Local Development
- ✅ Port 465 (SSL) - Works
- ✅ Port 587 (TLS) - Works

---

### 6. Testing Email Configuration

**Quick Test:**
```bash
node test-login-notification.js
```

**Expected Output:**
```
✅ Login successful!
✅ Notification sent successfully!
📧 Check your email at the configured ALERT_EMAIL_TO address
```

**Check Configuration:**
```bash
node check-email-config.js
```

---

### 7. Gmail Security Settings

If emails still don't send, check these Gmail settings:

1. **Less Secure App Access** (if not using App Password)
   - Not recommended, use App Password instead

2. **Allow IMAP/SMTP**
   - Gmail Settings → Forwarding and POP/IMAP
   - Enable IMAP

3. **Check Blocked Accounts**
   - Gmail Settings → Filters and Blocked Addresses
   - Make sure your app isn't blocked

---

### 8. Alternative Email Providers

If Gmail doesn't work, try these alternatives:

#### SendGrid (Recommended for Production)
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=465
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### AWS SES
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=465
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

---

### 9. Debugging in Production (Render)

**View Logs:**
1. Go to Render Dashboard
2. Select your service
3. Click "Logs" tab
4. Look for:
   - `✅ Security alert email sent:` (success)
   - `❌ Failed to send security alert email:` (error)

**Common Render Issues:**
- Port 587 blocked → Use port 465
- Environment variables not set → Check Environment tab
- Service not redeployed → Trigger manual deploy

---

### 10. Environment-Specific Configuration

#### Development (.env file)
```bash
SMTP_PORT=465  # or 587
NODE_ENV=development
```

#### Production (Render Environment Variables)
```bash
SMTP_PORT=465  # Must use 465 on Render
NODE_ENV=production
```

---

## Quick Checklist

Before asking for help, verify:

- [ ] 2FA enabled on Gmail
- [ ] App Password generated (not regular password)
- [ ] App Password has no spaces
- [ ] Using port 465 (not 587) on Render
- [ ] All environment variables set correctly
- [ ] Server restarted after changing .env
- [ ] Checked spam/junk folder
- [ ] Verified email address is correct
- [ ] Checked server logs for errors

---

## Still Not Working?

1. **Test with a different email provider** (SendGrid, AWS SES)
2. **Check Render logs** for specific error messages
3. **Verify firewall rules** on your hosting platform
4. **Contact support** with:
   - Error message from logs
   - Environment (local/production)
   - Email provider (Gmail/SendGrid/etc)
   - Port being used (465/587)
