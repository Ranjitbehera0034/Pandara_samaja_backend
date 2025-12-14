# Security Best Practices

## 🔒 Securing Your Admin Account

### **CRITICAL: Change Default Password Immediately!**

The default admin password (`admin123`) is publicly known and **MUST** be changed before deploying to production.

---

## Quick Password Change

### **Step 1: Run the Password Change Script**

```bash
node change-admin-password.js
```

### **Step 2: Follow the Prompts**

```
🔒 Admin Password Change Tool

Enter new admin password (min 8 characters): ********
Confirm new password: ********

✅ Admin password updated successfully!
```

### **Step 3: Save Your Password Securely**

- Use a password manager (1Password, LastPass, Bitwarden)
- Never commit passwords to Git
- Never share passwords via email/chat

---

## Password Requirements

✅ **Minimum 8 characters**
✅ **Mix of letters, numbers, and symbols** (recommended)
✅ **Unique** (don't reuse passwords)
✅ **Not easily guessable**

### Good Password Examples:
- `MyP@ndara2024!Secure`
- `N1kh!la#Admin$2024`
- `Secure@Samaja#2024`

### Bad Password Examples:
- ❌ `admin123` (default - publicly known)
- ❌ `password` (too common)
- ❌ `12345678` (too simple)
- ❌ `admin` (too short)

---

## Security Checklist

### Before Production Deployment:

- [ ] Change default admin password
- [ ] Set strong JWT_SECRET in environment variables
- [ ] Enable HTTPS (SSL/TLS)
- [ ] Set NODE_ENV=production
- [ ] Review all environment variables
- [ ] Remove any test/debug code
- [ ] Enable rate limiting (optional but recommended)
- [ ] Set up monitoring/logging
- [ ] Configure CORS properly
- [ ] Review database permissions

### After Deployment:

- [ ] Test login with new password
- [ ] Verify JWT tokens work correctly
- [ ] Check that old password doesn't work
- [ ] Monitor logs for suspicious activity
- [ ] Set up backup strategy

---

## Environment Variables Security

### **Never Commit These to Git:**

```bash
# .env file (already in .gitignore)
DATABASE_URL=...
JWT_SECRET=...
SMTP_PASS=...
SENDGRID_API_KEY=...
```

### **Use Strong Secrets:**

Generate strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Additional Security Measures

### 1. **Rate Limiting** (Recommended)

Install:
```bash
npm install express-rate-limit
```

Add to `app.js`:
```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later'
});

app.use('/api/auth/login', loginLimiter);
```

### 2. **Helmet.js** (Security Headers)

Install:
```bash
npm install helmet
```

Add to `app.js`:
```javascript
const helmet = require('helmet');
app.use(helmet());
```

### 3. **HTTPS Only** (Production)

In Render:
- Enable "Force HTTPS" in settings
- Redirect HTTP to HTTPS

### 4. **Regular Password Rotation**

- Change admin password every 90 days
- Use the `change-admin-password.js` script

### 5. **Monitor Login Attempts**

Check logs regularly for:
- Failed login attempts
- Unusual IP addresses
- Multiple rapid login attempts

---

## Password Recovery

### If You Forget the Admin Password:

**Option 1: Reset to a New Password**
```bash
node change-admin-password.js
```

**Option 2: Reset to Default (NOT RECOMMENDED for production)**
```bash
node reset-admin-password.js
# This resets to admin123 - change immediately!
```

---

## Multi-Factor Authentication (Future Enhancement)

Consider adding 2FA for extra security:
- Google Authenticator
- SMS verification
- Email verification codes

---

## Incident Response

### If You Suspect a Security Breach:

1. **Immediately change admin password**
   ```bash
   node change-admin-password.js
   ```

2. **Generate new JWT secret**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Update in Render environment variables

3. **Check database for unauthorized changes**

4. **Review server logs** for suspicious activity

5. **Consider rotating database credentials**

---

## Security Contacts

- **Report Security Issues**: Create a private GitHub issue
- **Emergency**: Change passwords immediately, then investigate

---

## Compliance & Best Practices

### Data Protection:
- Store passwords as bcrypt hashes (✅ already implemented)
- Use HTTPS for all communications
- Implement proper session management
- Log security events

### Access Control:
- Principle of least privilege
- Regular access reviews
- Strong authentication
- Audit trails

---

## Summary

✅ **What We've Secured:**
1. Removed default password from console logs
2. Created secure password change tool
3. Implemented bcrypt password hashing
4. JWT-based authentication
5. Environment variable protection

⚠️ **What You Must Do:**
1. **Change default password NOW**
2. Set strong JWT_SECRET
3. Never commit .env file
4. Use HTTPS in production
5. Monitor logs regularly

🎯 **Priority Actions:**
```bash
# 1. Change admin password
node change-admin-password.js

# 2. Generate strong JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 3. Add to Render environment variables
# JWT_SECRET=<generated-secret>
```

---

## Questions?

See also:
- `change-admin-password.js` - Password change tool
- `EMAIL_SECURITY_SETUP.md` - Email security
- `API_REFERENCE.md` - API documentation
