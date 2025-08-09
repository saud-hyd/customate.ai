# Gmail Integration - Production Deployment Guide

## 🚀 **Status: Ready for Production**

Your Gmail integration is fully functional and ready for production deployment on Render.

## **Step-by-Step Production Setup**

### 1. Update Google Cloud Console
**Go to**: https://console.cloud.google.com/apis/credentials/oauthclient/751601092687-nsj9h7i3u9lo01r76rmq1cvukjitte0s.apps.googleusercontent.com?project=customate-465723

**Add these Authorized redirect URIs**:
- `https://customate-ai-1.onrender.com/api/channel/gmail/oauth/callback`
- `https://customate.ai/auth/gmail/callback`  
- `https://app.customate.ai/auth/gmail/callback`

### 2. Configure Render Environment Variables

**In your Render service dashboard, add these environment variables:**

#### Google Cloud Configuration:
```
GOOGLE_CLOUD_PROJECT_ID=customate-465723
GMAIL_PUBSUB_TOPIC=gmail-notifications
```

#### Service Account Credentials (Choose Option A or B):

**Option A: Upload JSON File**
1. Upload your `service-account.json` file to your Render service
2. Set: `GOOGLE_APPLICATION_CREDENTIALS=/opt/render/project/src/service-account.json`

**Option B: JSON Content in Environment Variable (Recommended)**
1. Copy your entire `service-account.json` content
2. Set: `GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"customate-465723",...}`

#### Production URLs:
```
ENVIRONMENT=production
FRONTEND_URL=https://customate.ai
BACKEND_URL=https://customate-ai-1.onrender.com
OAUTH_REDIRECT_URI=https://customate.ai/auth/gmail/callback
```

### 3. Deploy to Render

1. **Commit your changes**:
```bash
git add .
git commit -m "Add Gmail integration for production deployment"
git push origin main
```

2. **Render will automatically deploy** your updated code

### 4. Test Production Gmail Integration

After deployment, test these endpoints:

#### Health Check:
```bash
curl https://customate-ai-1.onrender.com/health
```

#### Gmail OAuth Initialization:
```bash
curl -X POST "https://customate-ai-1.onrender.com/api/channel/gmail/oauth/authorize" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "client_id": "751601092687-nsj9h7i3u9lo01r76rmq1cvukjitte0s.apps.googleusercontent.com",
    "client_secret": "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",
    "redirect_uri": "https://customate.ai/auth/gmail/callback"
  }'
```

#### Gmail Webhook Test:
```bash
curl -X POST "https://customate-ai-1.onrender.com/api/channel/gmail/webhook/test" \
  -H "Content-Type: application/json" \
  -d '{"email": "usecustomate.ai@gmail.com", "historyId": "12345"}'
```

### 5. Configure Gmail Watch for Real-Time Notifications

Once a Gmail channel is created in production, the system will automatically:
1. ✅ Create Google Cloud Pub/Sub topic
2. ✅ Set up Gmail API watch
3. ✅ Enable real-time email processing
4. ✅ Send AI responses automatically

### 6. Frontend Integration

Update your frontend to use the production Gmail OAuth flow:

**Gmail Setup URL**: `https://customate.ai/channels/gmail/setup`

## **Production Features**

### ✅ **Fully Working**:
- Gmail OAuth 2.0 authentication
- Real-time email notifications via Google Cloud Pub/Sub
- AI-powered email responses using OpenAI GPT-4.1-mini
- Knowledge base integration (RAG)
- Conversation threading and management
- Manual email processing fallback
- Production-ready error handling

### 🎯 **Production Endpoints**:
- **OAuth**: `/api/channel/gmail/oauth/authorize`
- **Channel Creation**: `/api/channel/gmail/create`
- **Webhook**: `/api/channel/gmail/webhook/pubsub`
- **Manual Processing**: `/api/channel/gmail/{channel_id}/process-emails`

## **Monitoring & Maintenance**

### Log Monitoring
Watch Render logs for:
- Gmail API authentication
- Pub/Sub message processing
- AI response generation
- Email sending success/failures

### Performance Metrics
- Email processing time
- AI response quality
- Google Cloud Pub/Sub delivery rates
- Gmail API rate limits

## **Security Notes**

- ✅ OAuth 2.0 with proper state validation
- ✅ Service account with minimal required permissions
- ✅ Webhook signature verification
- ✅ Client-specific API key authentication
- ✅ Secure credential storage

## **Support**

If you encounter issues:
1. Check Render deployment logs
2. Verify Google Cloud credentials
3. Test individual endpoints
4. Monitor Gmail API quotas

## 🚀 **Ready to Deploy!**

Your Gmail integration is production-ready. Just follow the steps above to go live!