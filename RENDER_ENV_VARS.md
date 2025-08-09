# Render Production Environment Variables for Gmail Integration

Add these environment variables to your Render service:

## Google Cloud Configuration
```
GOOGLE_CLOUD_PROJECT_ID=customate-465723
GMAIL_PUBSUB_TOPIC=gmail-notifications
```

## Google OAuth (Already configured)
```
GOOGLE_CLIENT_ID=751601092687-nsj9h7i3u9lo01r76rmq1cvukjitte0s.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

## Service Account Credentials (Option A: File Upload)
1. Upload your `service-account.json` file to Render
2. Set path: `GOOGLE_APPLICATION_CREDENTIALS=/opt/render/project/src/service-account.json`

## Service Account Credentials (Option B: JSON Content)
Copy the entire JSON content from your service-account.json file and paste it as:
```
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"customate-465723",...}
```

## Production URLs
Update these if not already set:
```
FRONTEND_URL=https://customate.ai
BACKEND_URL=https://customate-ai-1.onrender.com
```

## OAuth Redirect URI
```
OAUTH_REDIRECT_URI=https://customate.ai/auth/gmail/callback
```

## Environment Detection
```
ENVIRONMENT=production
```