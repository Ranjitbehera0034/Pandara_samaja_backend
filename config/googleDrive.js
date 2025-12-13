// config/googleDrive.js
const fs = require('fs');
const { Readable } = require('stream');
const { google } = require('googleapis');
const mime = require('mime-types');

const FOLDER_ID = process.env.DRIVE_FOLDER_ID;
if (!FOLDER_ID) {
  console.warn('⚠️ DRIVE_FOLDER_ID is not set. File uploads will fail.');
}

let drive;

// STRATEGY 1: OAuth2 (Recommended for Personal Accounts)
if (process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_CLIENT_ID) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  drive = google.drive({ version: 'v3', auth: oauth2Client });

} else {
  // STRATEGY 2: Service Account (Recommended for Workspace/Organizations)

  // Try to parse credentials from GOOGLE_CREDENTIALS env var
  let credentials;
  if (process.env.GOOGLE_CREDENTIALS) {
    try {
      credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    } catch (err) {
      console.error('Failed to parse GOOGLE_CREDENTIALS env var:', err);
    }
  }

  const auth = new google.auth.GoogleAuth({
    credentials, // undefined = auto-discover from file (GOOGLE_APPLICATION_CREDENTIALS)
    scopes: ['https://www.googleapis.com/auth/drive']
  });
  drive = google.drive({ version: 'v3', auth });
}

/**
 * Uploads a file (Buffer or on-disk) to Google Drive, makes it public,
 * and returns a direct link.
 *
 * @param {object} file Multer file object
 * @param {string} file.originalname
 * @param {Buffer} [file.buffer]
 * @param {string} [file.path]
 * @returns {Promise<string>} public URL
 */
async function uploadFile(file) {
  if (!file || !file.originalname) {
    throw new Error('Invalid file object passed to uploadFile');
  }

  // Create a readable stream from Buffer or from disk
  let stream;
  if (file.buffer) {
    stream = Readable.from(file.buffer);
  } else if (file.path) {
    stream = fs.createReadStream(file.path);
  } else {
    throw new Error('Invalid file object passed to uploadFile');
  }

  // 1. Upload to Drive
  const res = await drive.files.create({
    requestBody: {
      name: file.originalname,
      parents: [FOLDER_ID],
    },
    media: {
      mimeType: mime.lookup(file.originalname) || 'application/octet-stream',
      body: stream
    },
    fields: 'id'
  });

  const fileId = res.data.id;

  // 2. Make it public
  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' }
  });

  // 3. Cleanup local file if on disk
  if (file.path) {
    fs.unlink(file.path, err => {
      if (err) console.warn('Failed to delete temp file:', file.path, err);
    });
  }

  // 4. Return a direct link
  return `https://drive.google.com/uc?id=${fileId}`;
}

module.exports = { uploadFile };
