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

    const recipient = process.env.ALERT_EMAIL_TO || 'admin@nikhilaodishapandarasamaja.in';
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

module.exports = { sendLoginAlert };
