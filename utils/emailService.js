const nodemailer = require('nodemailer');

// 1. Configure the transporter
// In production, these should be environment variables
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER, // Your email
        pass: process.env.SMTP_PASS  // Your email password or app password
    }
});

/**
 * Send a security alert email when an admin logs in
 * @param {Object} user - The user object (username, etc.)
 * @param {Object} req - The express request object (to get IP, user agent)
 */
const sendLoginAlert = async (user, req) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️ SMTP credentials not found. Skipping email alert.');
        return;
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const timestamp = new Date().toLocaleString();

    const recipient = process.env.ALERT_EMAIL_TO || 'admin@nikhilaodishapandarasamaja.in'; // Default or from env
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
          <p style="margin: 0; font-size: 0.9em;">If this was you, you can ignore this email. If you did not authorize this login, please contact support immediately/change your password.</p>
        </div>
      </div>
       <div style="background-color: #f5f5f5; color: #777; padding: 10px; text-align: center; font-size: 0.8em;">
        &copy; ${new Date().getFullYear()} Nikhila Odisha Pandara Samaja
      </div>
    </div>
  `;

    try {
        const info = await transporter.sendMail({
            from: `"Security Alert" <${sender}>`,
            to: recipient,
            subject: subject,
            html: html
        });
        console.log('✅ Security alert email sent:', info.messageId);
    } catch (error) {
        console.error('❌ Failed to send security alert email:', error);
    }
};

module.exports = { sendLoginAlert };
