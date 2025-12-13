const { google } = require('googleapis');
const readline = require('readline');

// Instructions:
// 1. Go to Google Cloud Console > APIs & Services > Credentials
// 2. Create "OAuth 2.0 Client ID" > "Web application"
// 3. Add "https://developers.google.com/oauthplayground" to "Authorized redirect URIs"
// 4. Run this script: node scripts/generate-drive-token.js

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

(async () => {
    console.log('\n=== Google Drive Refresh Token Generator ===\n');

    const clientId = await question('Enter your Client ID: ');
    const clientSecret = await question('Enter your Client Secret: ');
    const redirectUri = 'https://developers.google.com/oauthplayground';

    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
    );

    // We need full 'drive' scope to upload to a specific existing folder
    // 'drive.file' only allows access to files created by THIS app
    const scopes = ['https://www.googleapis.com/auth/drive'];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes
    });

    console.log('\n---------------------------------------------------------');
    console.log('1. Visit this URL in your browser:');
    console.log(url);
    console.log('\n2. Authorize the app.');
    console.log('3. You will be redirected to OAuth Playground.');
    console.log('4. Copy the "Authorization code" from Step 2 on that page.');
    console.log('---------------------------------------------------------\n');

    const code = await question('Enter the Authorization Code here: ');

    try {
        const { tokens } = await oauth2Client.getToken(code);

        console.log('\n✅ SUCCESS! Here are your credentials for .env:\n');
        console.log(`GOOGLE_CLIENT_ID=${clientId}`);
        console.log(`GOOGLE_CLIENT_SECRET=${clientSecret}`);
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log(`GOOGLE_REDIRECT_URI=${redirectUri}`); // optional usually
        console.log('\n(Save these in your .env file and remove GOOGLE_CREDENTIALS)');

    } catch (err) {
        console.error('\n❌ Error retrieving access token:', err.message);
    } finally {
        rl.close();
    }
})();
