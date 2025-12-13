# How to Setup Google Drive (Personal Account Fix)

Prior "Service Account" setup often fails for personal Gmail accounts with a "Quota" error because Service Accounts have 0GB storage unless you pay for Google Workspace.

**The Fix:** Use OAuth2 (Client ID & Secret) instead. This lets the backend upload files *as you* (using your personal storage).

## Step 1: Create OAuth2 Credentials

1. Go to [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials).
2. Click **Create Credentials** -> **OAuth client ID**.
3. Application Type: **Web application**.
4. Name: "Backend Uploader".
5. **Authorized redirect URIs**: Add `https://developers.google.com/oauthplayground` (important!).
6. Click **Create**.
7. Copy your **Client ID** and **Client Secret**.

## Step 2: Generate a Refresh Token

We need a "Refresh Token" so the backend can stay logged in as you forever without manual login.

1. In your project terminal, run this helper script:
   ```bash
   node scripts/generate-drive-token.js
   ```
2. Paste your Client ID and Client Secret when asked.
3. Visit the URL it generates.
4. Authorize the app with your Google Account.
5. You will see an **Authorization Code** on the next page (OAuth Playground).
6. Copy that Code and paste it back into the terminal.

## Step 3: Update .env

The script will give you the exact lines to add to your `.env` file. It will look like this:

```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-long-refresh-token
DRIVE_FOLDER_ID=your-folder-id
```

**Remove** `GOOGLE_CREDENTIALS` or `GOOGLE_APPLICATION_CREDENTIALS` if they exist in your `.env`.

## Step 4: Restart & Test

```bash
npm start
```
Now uploads will work using your personal Google Drive storage!
