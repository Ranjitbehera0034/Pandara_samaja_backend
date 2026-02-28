const nodemailer = require('nodemailer');

// Configure SMTP transporter (optional)
const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
const useSSL = smtpPort === 465;

let transporter = null;

// Only create transporter if SMTP credentials are provided
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: smtpPort,
    secure: useSSL,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    debug: process.env.NODE_ENV !== 'production',
    logger: process.env.NODE_ENV !== 'production'
  });
}

/**
 * Send a security alert email when an admin logs in
 * @param {Object} user - The user object (username, etc.)
 * @param {Object} req - The express request object (to get IP, user agent)
 */
const sendLoginAlert = async (user, req) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  // Log to console (always happens)
  console.log('🔐 ADMIN LOGIN DETECTED:');
  console.log(`   Username: ${user.username}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   IP: ${clientIp}`);
  console.log(`   Time: ${timestamp}`);
  console.log(`   User Agent: ${userAgent}`);

  // If no email configured, just log and return
  if (!transporter) {
    console.log('ℹ️  Email notifications not configured (optional)');
    console.log('   To enable: Add SMTP credentials to .env file');
    return;
  }

  const recipient = process.env.ALERT_EMAIL_TO || 'nikhilaodishapandarasamaja@gmail.com';
  const sender = process.env.ALERT_EMAIL_FROM || process.env.SMTP_USER;

  const subject = `🚨 Security Alert: Admin Login Detected - ${user.username}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #d9534f; color: white; padding: 15px; text-align: center;">
        <h2 style="margin: 0;">New Admin Login Detected</h2>
      </div>
      <div style="padding: 20px;">
        <p>Hello,</p>
        <p>A new login to the admin panel was detected. Details are below:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; width: 30%;">Username:</td>
            <td style="padding: 10px;">${user.username}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">User Role:</td>
            <td style="padding: 10px;">${user.role}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">IP Address:</td>
            <td style="padding: 10px;">${clientIp}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold;">Time:</td>
            <td style="padding: 10px;">${timestamp}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold;">User Agent:</td>
            <td style="padding: 10px;">${userAgent}</td>
          </tr>
        </table>

        <div style="margin-top: 20px; padding: 10px; background-color: #f9f9f9; border-left: 4px solid #f0ad4e;">
          <p style="margin: 0; font-size: 0.9em;">If this was you, you can ignore this email. If you did not authorize this login, please contact support immediately.</p>
        </div>
      </div>
       <div style="background-color: #f5f5f5; color: #777; padding: 10px; text-align: center; font-size: 0.8em;">
        &copy; ${new Date().getFullYear()} Nikhila Odisha Pandara Samaja
      </div>
    </div>
  `;

  try {
    console.log('📧 Attempting to send email notification...');
    const info = await transporter.sendMail({
      from: `"Security Alert" <${sender}>`,
      to: recipient,
      subject: subject,
      html: html
    });
    console.log('✅ Email notification sent successfully:', info.messageId);
  } catch (error) {
    console.error('⚠️  Failed to send email notification (non-critical):', error.message);
    console.log('ℹ️  Login was successful, but email notification failed');
    console.log('   This is optional - the system continues to work normally');
  }
};

/**
 * Send a notification when a member is promoted to admin
 * @param {Object} member - The member being promoted
 * @param {Object} credentials - The new admin credentials
 */
const sendPromotionNotification = async (member, credentials) => {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  console.log(`📣 PROMOTION NOTIFICATION:`);
  console.log(`   Admin: ${member.name} (${member.membership_no})`);
  console.log(`   Username: ${credentials.username}`);
  console.log(`   Role: ${credentials.role}`);
  console.log(`   Time: ${timestamp}`);

  if (!transporter) {
    console.log('ℹ️  Email notifications not configured - skipping promotion email');
  } else {
    const recipientEmail = member.email || null;
    if (recipientEmail) {
      const subject = `🎉 Welcome to the Admin Team - Nikhila Odisha Pandara Samaja`;
      const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Congratulations, ${member.name}!</h1>
          <p style="margin-top: 10px; opacity: 0.9;">You have been promoted to <strong>${credentials.role.toUpperCase()}</strong></p>
        </div>
        <div style="padding: 30px; line-height: 1.6; color: #334155;">
          <p>Dear ${member.name},</p>
          <p>We are pleased to inform you that you have been granted administrative access to the <strong>Pandara Samaja Admin Panel</strong>. Your account is now active.</p>
          
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <h3 style="margin-top: 0; color: #1e293b; font-size: 16px;">Portal Access Details:</h3>
            <p style="margin: 5px 0;"><strong>Username:</strong> ${credentials.username}</p>
            <p style="margin: 5px 0;"><strong>Membership ID:</strong> ${member.membership_no}</p>
            <p style="margin: 5px 0; font-style: italic; font-size: 13px; color: #64748b;">(Use the password provided to you by the Super Admin)</p>
          </div>

          <p>Please log in to set up your <strong>Multi-Factor Authentication (MFA)</strong> immediately to secure your account.</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://admin.nikhilaodishapandarasamaja.in" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Login to Admin Panel</a>
          </div>
        </div>
        <div style="background-color: #f1f5f9; color: #64748b; padding: 20px; text-align: center; font-size: 12px;">
          This is an automated notification. Please do not reply to this email.
          <br>&copy; ${new Date().getFullYear()} Nikhila Odisha Pandara Samaja
        </div>
      </div>
      `;

      try {
        await transporter.sendMail({
          from: `"Pandara Samaja Admin" <${process.env.SMTP_USER}>`,
          to: recipientEmail,
          subject: subject,
          html: html
        });
        console.log('✅ Promotion email sent to', member.name);
      } catch (error) {
        console.error('⚠️  Failed to send promotion email:', error.message);
      }
    } else {
      console.log(`ℹ️  No email address for ${member.name}, skipping email notification.`);
    }
  }

  // --- WhatsApp Promotion Notification ---
  if (member.mobile && process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    try {
      const cleanMobile = member.mobile.replace(/\D/g, '');
      const whatsappNumber = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;

      const response = await fetch(`https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: whatsappNumber,
          type: "template",
          template: {
            name: "admin_promotion_welcome", // Make sure this template is created in Meta
            language: { code: "en_US" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: member.name },
                  { type: "text", text: credentials.role.toUpperCase() },
                  { type: "text", text: credentials.username }
                ]
              }
            ]
          }
        })
      });

      const waData = await response.json();
      if (waData.error) {
        console.warn('⚠️  WhatsApp Promo API Error:', waData.error.message);
      } else {
        console.log('✅ Promotion WhatsApp message sent successfully');
      }
    } catch (waErr) {
      console.warn('⚠️  Could not send promotion via WhatsApp (Network/Fetch):', waErr.message);
    }
  }
};

/**
 * Notify Super Admin of an action performed by another admin
 * @param {string} adminName - Name of the admin performing the action
 * @param {string} action - Description of the action performed
 * @param {string} targetType - Type of entity affected (e.g., 'Member', 'Event')
 * @param {string} targetId - ID of the entity affected
 * @param {Object} details - Additional details about the action
 */
const sendAdminActionAlert = async (adminName, action, targetType, targetId, details) => {
  if (!transporter) {
    console.log('ℹ️  Email notifications not configured - skipping admin action alert');
    return;
  }

  const recipient = process.env.ALERT_EMAIL_TO || 'nikhilaodishapandarasamaja@gmail.com';
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const subject = `⚠️ Admin Action Alert: ${action} by ${adminName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #334155; color: white; padding: 15px; text-align: center;">
        <h2 style="margin: 0;">Admin Activity Logged</h2>
      </div>
      <div style="padding: 20px;">
        <p>A significant action was performed in the Admin Panel:</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px; font-weight: bold;">Admin:</td><td style="padding: 8px;">${adminName}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px; font-weight: bold;">Action:</td><td style="padding: 8px;">${action}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px; font-weight: bold;">Target:</td><td style="padding: 8px;">${targetType} (${targetId})</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px; font-weight: bold;">Time:</td><td style="padding: 8px;">${timestamp}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Details:</td><td style="padding: 8px; font-size: 12px;"><code>${JSON.stringify(details)}</code></td></tr>
        </table>
        <div style="margin-top: 20px; text-align: center;">
          <a href="https://admin.nikhilaodishapandarasamaja.in/#/maker-checker" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Review Action</a>
        </div>
      </div>
      <div style="background-color: #f5f5f5; color: #777; padding: 10px; text-align: center; font-size: 0.8em;">
        &copy; ${new Date().getFullYear()} Nikhila Odisha Pandara Samaja
      </div>
    </div>
    `;

  try {
    console.log('📧 Attempting to send admin action alert email...');
    await transporter.sendMail({
      from: `"Audit Monitor" <${process.env.SMTP_USER}>`,
      to: recipient,
      subject: subject,
      html: html
    });
    console.log('✅ Admin action alert email sent successfully.');
  } catch (e) {
    console.error('⚠️  Failed to send admin action alert email:', e.message);
  }
};

module.exports = {
  sendLoginAlert,
  sendPromotionNotification,
  sendAdminActionAlert
};
