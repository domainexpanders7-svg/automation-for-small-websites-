# Autonomous AI Website Builder - Render Deployment Guide

This guide details how to deploy and run the autonomous AI website builder on **Render Free Tier**.

---

## Architecture Summary

The system runs a 7-stage autonomous development loop:

1. **Research** - Select trending topic using AgentReach web search
2. **Scaffolding** - OpenCode CLI creates project structure
3. **Component Generation** - OpenCode CLI (`opencode/big-pickle`) generates code, KiloCode (`autofree`) as fallback
4. **Testing & Self-Correction** - KiloCode debug mode runs QA tests and repairs code (max 3 attempts)
5. **Deployment** - Deploy to Render via API or webhook
6. **Post-Deployment Verification** - OpenCode + KiloCode audit live URL
7. **Telegram Notification** - Real-time status updates via Telegram bot

**All coding and testing is performed EXCLUSIVELY by OpenCode and Kilo agents.**
**No pre-existing templates. No external codebase imports for generation.**

---

## Prerequisites

- Node.js 18+ installed locally
- Git installed locally
- Telegram Bot Token and Chat ID
- Render account (free tier)
- Groq API Key (for AI fallback)

---

## Step 1: Prepare Environment Variables

Create a `.env` file in the project root:

```env
# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Render Configuration
RENDER_API_KEY=your_render_api_key
RENDER_SERVICE_ID=your_render_service_id
RENDER_EXTERNAL_URL=https://your-service.onrender.com
RENDER_DEPLOY_WEBHOOK=https://api.render.com/v1/services/your-service/deploys

# AI API Keys (fallback when CLIs unavailable)
GROQ_API_KEY=your_groq_api_key

# Optional: Automation interval in minutes (default: 60)
AUTOMATION_INTERVAL_MINUTES=60
```

---

## Step 2: Deploy to Render

### Option A: Deploy via Render Dashboard (Recommended)

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `autonomous-website-builder`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node services/daemon.js`
   - **Plan**: `Free`
5. Add environment variables from Step 1
6. Click **Create Web Service**

### Option B: Deploy via render.yaml

Create a `render.yaml` file in your project root:

```yaml
services:
  - type: web
    name: autonomous-website-builder
    env: node
    buildCommand: npm install
    startCommand: node services/daemon.js
    plan: free
    envVars:
      - key: TELEGRAM_BOT_TOKEN
        sync: false
      - key: TELEGRAM_CHAT_ID
        sync: false
      - key: GROQ_API_KEY
        sync: false
      - key: RENDER_API_KEY
        sync: false
      - key: RENDER_SERVICE_ID
        sync: false
      - key: RENDER_EXTERNAL_URL
        fromService:
          type: web
          name: autonomous-website-builder
          property: hostname
      - key: AUTOMATION_INTERVAL_MINUTES
        value: "60"
```

Then deploy:
```bash
npm install -g render-cli
render deploy
```

---

## Step 3: Verify Deployment

1. Check Render dashboard for your service status
2. Visit `https://your-service.onrender.com/health` - should return JSON with status `ONLINE`
3. Check Telegram for daemon startup notification
4. Trigger a manual build via webhook:
   ```bash
   curl https://your-service.onrender.com/trigger
   ```

---

## Step 4: Configure Telegram Notifications

The daemon sends real-time notifications for:
- Daemon startup
- Each stage start/completion/failure
- Agent fallback events
- Render trigger received
- Deployment success/failure
- Full cycle completion

Ensure your Telegram bot token and chat ID are correctly set in environment variables.

---

## Step 5: OpenCode & KiloCode CLI Setup

For the agents to use CLI mode (instead of Groq API fallback):

### OpenCode CLI
```bash
npm install -g opencode
# Verify installation
opencode --version
```

### KiloCode CLI
```bash
npm install -g kilo
# Verify installation
kilo --version
```

The agents will automatically detect CLI availability on server startup and notify via Telegram.

---

## Render Free Tier Considerations

1. **Cold Starts**: Render free tier sleeps after 15 minutes of inactivity
   - **Mitigation**: Daemon self-pings every 5 minutes via `RENDER_EXTERNAL_URL`
   - **Mitigation**: Use external cron (e.g., cron-job.org) to hit `/trigger` every 15 minutes

2. **Build Time**: Limited to 15 minutes on free tier
   - **Mitigation**: The 7-stage loop is optimized for fast execution
   - **Mitigation**: Agents use bounded retry limits (max 3 attempts per stage)

3. **Service Spins Down**: Service may spin down during low traffic
   - **Mitigation**: Self-ping keep-alive mechanism built into daemon
   - **Mitigation**: Telegram notifications alert when service comes back online

---

## Manual Trigger via Telegram

Send `/trigger` to your Telegram bot to manually start a build cycle.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Service sleeping | Check self-ping is working; verify `RENDER_EXTERNAL_URL` is set |
| CLI not detected | Install OpenCode/Kilo CLI globally on Render using `npm install -g` |
| Groq API fallback not working | Verify `GROQ_API_KEY` is set in Render environment variables |
| Telegram notifications not received | Verify bot token and chat ID; check bot is not blocked |
| Build timeout | Reduce `AUTOMATION_INTERVAL_MINUTES` or optimize agent prompts |

---

## Security Notes

- Never commit `.env` file to Git
- Use Render's environment variable dashboard for secrets
- Telegram bot token should have restricted permissions
- Groq API key should be kept confidential
- Render API key should have minimum required permissions
