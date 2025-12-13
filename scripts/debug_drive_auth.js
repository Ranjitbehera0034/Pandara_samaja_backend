require('dotenv').config();
const { google } = require('googleapis');

async function main() {
    console.log('🔍 Checking Google Drive Authentication...');

    const FOLDER_ID = process.env.DRIVE_FOLDER_ID;
    if (!FOLDER_ID) {
        console.error('❌ ERROR: DRIVE_FOLDER_ID is missing in .env');
        return;
    }
    console.log(`📂 Target Folder ID: ${FOLDER_ID}`);

    let authClient;
    let authType = '';

    try {
        if (process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_CLIENT_ID) {
            authType = 'OAuth2 (User)';
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
            );
            oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
            authClient = oauth2Client;
        } else if (process.env.GOOGLE_CREDENTIALS) {
            authType = 'Service Account';
            let credentials;
            credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
            authClient = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/drive']
            });
        } else {
            console.error('❌ No valid Google credentials found in .env');
            return;
        }

        console.log(`🔐 Auth Type: ${authType}`);

        const drive = google.drive({ version: 'v3', auth: authClient });

        // Get info about the authenticated user/service account
        const about = await drive.about.get({ fields: 'user' });
        const userEmail = about.data.user.emailAddress;
        const userName = about.data.user.displayName;

        console.log(`\n✅ Authenticated successfully!`);
        console.log(`👤 Name:  ${userName}`);
        console.log(`Mz Email: ${userEmail}`);

        console.log(`\n🚨 ACTION REQUIRED:`);
        console.log(`You must share the folder "${FOLDER_ID}" with this email address:`);
        console.log(`👉 ${userEmail}`);
        console.log(`\nSteps:`);
        console.log(`1. Go to Google Drive (https://drive.google.com).`);
        console.log(`2. Search for folder: folderId:${FOLDER_ID}`);
        console.log(`3. Right click -> Share.`);
        console.log(`4. Paste "${userEmail}" and give "Editor" permission.`);

    } catch (error) {
        console.error('\n❌ Error details:', error.message);
        if (error.message.includes('invalid_grant')) {
            console.error('💡 Hint: Your Refresh Token or Service Account credentials might be expired or invalid.');
        }
    }
}

main();
