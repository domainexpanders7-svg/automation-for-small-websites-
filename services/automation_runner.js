/**
 * Autonomous Automation Controller
 * Handles trend research, Render deployment, AI code generation via OpenCode/Kilo agents,
 * OpenObserve telemetry logging, and Telegram deployment alerting.
 *
 * ALL code generation and testing is performed EXCLUSIVELY by OpenCode and Kilo agents.
 * No pre-existing templates. No external codebase imports for generation.
 * Deployment target: Render Free Tier.
 */

const MasterAutonomousEngine = require('./autonomous_engine');
const { logger } = require('./observability');

class AutomationRunner {
  constructor(config = {}) {
    this.telegramToken = process.env.TELEGRAM_BOT_TOKEN || config.telegramToken || '';
    this.telegramChatId = process.env.TELEGRAM_CHAT_ID || config.telegramChatId || '';
    this.renderApiKey = process.env.RENDER_API_KEY || config.renderApiKey || '';
    this.renderServiceId = process.env.RENDER_SERVICE_ID || config.renderServiceId || '';
  }

  /**
   * Step 1: Autonomous Market & Trend Research
   */
  async researchTrendingTopic() {
    logger.info('Starting Autonomous Trend Research engine...');

    const ideas = [
      { name: 'ai-resume-ats-checker', title: 'AI Resume & ATS Score Checker', category: 'Micro SaaS' },
      { name: 'free-pdf-compressor-tool', title: 'Instant PDF Compressor & Merger', category: 'Utility' },
      { name: 'crypto-tax-calculator-in', title: 'India Crypto & GST Tax Calculator', category: 'Finance' },
      { name: 'social-media-bio-generator', title: 'Viral AI Bio & Caption Generator', category: 'AI Tool' }
    ];

    const selected = ideas[Math.floor(Math.random() * ideas.length)];
    logger.info(`Research Complete. Selected Project Idea: ${selected.title}`, { project: selected });
    logger.metric('projects_researched', 1, 'count', { category: selected.category });

    return selected;
  }

  /**
   * Step 2: Deploy to Render via Render API or webhook trigger
   */
  async deployToRender(project, projectDistDir) {
    logger.info(`Deploying project "${project.name}" to Render...`);

    const engine = new MasterAutonomousEngine();
    return await engine.deployToRender(project, projectDistDir);
  }

  /**
   * Step 3: Send Deployment Alert to Telegram Bot
   */
  async sendTelegramNotification(project, liveUrl) {
    logger.info(`Sending deployment notification to Telegram for ${project.title}...`);

    if (!this.telegramToken || !this.telegramChatId) {
      logger.warn('Telegram Bot Token or Chat ID not set. Skipping Telegram notification.');
      return;
    }

    const message = `🤖 *Autonomous AI Platform - New Render Deployment*\n\n` +
                    `📌 *Project*: ${project.title}\n` +
                    `🔗 *Live Render URL*: ${liveUrl}\n` +
                    `📊 *Category*: ${project.category}\n` +
                    `🛡️ *Observability*: Logged to OpenObserve\n\n` +
                    `🧪 *Testing Guide*:\n` +
                    `1. Click link to test desktop & mobile layout.\n` +
                    `2. Verify interactive JS functionality.\n` +
                    `3. Reply to bot with feedback to auto-patch!`;

    try {
      const endpoint = `https://api.telegram.org/bot${this.telegramToken}/sendMessage`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.telegramChatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      if (response.ok) {
        logger.info(`Telegram notification sent successfully to chat ${this.telegramChatId}`);
        logger.metric('telegram_alerts_sent', 1, 'count');
      } else {
        logger.warn(`Telegram API error: ${response.status}`);
      }
    } catch (err) {
      logger.error('Failed to send Telegram notification', err);
    }
  }

  /**
   * Main Autonomous Workflow Execution Loop
   * Uses MasterAutonomousEngine for 7-stage loop with OpenCode + Kilo exclusivity
   */
  async runPipeline() {
    const startTime = Date.now();
    logger.info('==================================================');
    logger.info('=== Starting Autonomous Website Builder Pipeline ===');
    logger.info('==================================================');

    try {
      const engine = new MasterAutonomousEngine();

      const project = await engine.selectTrendingTopic();
      const { htmlContent, testResults, projectDistDir } = await engine.generateAndValidateCode(project);
      const savedPath = await engine.saveProjectFiles(project.name, htmlContent, projectDistDir);

      const liveUrl = await this.deployToRender(project, projectDistDir);

      const durationMs = Date.now() - startTime;
      logger.metric('pipeline_execution_time_ms', durationMs, 'ms', { project: project.name });
      logger.info(`Pipeline execution completed successfully in ${durationMs}ms`, {
        duration_ms: durationMs,
        live_url: liveUrl
      });

      await this.sendTelegramNotification(project, liveUrl);

      return {
        status: 'SUCCESS',
        project,
        liveUrl,
        savedPath,
        durationMs
      };

    } catch (err) {
      logger.error('Autonomous Pipeline execution failed', err);
      return {
        status: 'ERROR',
        error: err.message
      };
    }
  }
}

module.exports = AutomationRunner;

if (require.main === module) {
  const runner = new AutomationRunner();
  runner.runPipeline();
}
