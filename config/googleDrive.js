// config/googleDrive.js

const fs           = require('fs');
const { Readable } = require('stream');
const { google }   = require('googleapis');
const mime         = require('mime-types');

const FOLDER_ID = process.env.DRIVE_FOLDER_ID;
if (!FOLDER_ID) throw new Error('DRIVE_FOLDER_ID env var not set');

const auth  = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/drive']
});
const drive = google.drive({ version: 'v3', auth });

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
      name   : file.originalname,
      parents: [FOLDER_ID],
    },
    media: {
      mimeType: mime.lookup(file.originalname) || 'application/octet-stream',
      body    : stream
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
