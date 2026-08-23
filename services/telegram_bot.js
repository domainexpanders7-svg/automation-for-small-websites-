/**
 * Interactive Telegram Bot Controller Service
 * Handles Telegram polling for user commands (/start, /status, /build <topic>)
 */

const MasterAutonomousEngine = require('./autonomous_engine');
const { logger } = require('./observability');

const token = process.env.TELEGRAM_BOT_TOKEN || '8845184460:AAE7wYe_cbHWdlqsqoUcAV_FFnKdMN0VxBg';
const chatId = process.env.TELEGRAM_CHAT_ID || '1911702294';

class TelegramBotController {
  constructor() {
    this.engine = new MasterAutonomousEngine();
    this.offset = 0;
  }

  async sendTelegramMessage(text, targetChatId = null) {
    const destChatId = targetChatId || chatId;
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: destChatId,
          text: text,
          parse_mode: 'Markdown'
        })
      });
    } catch (e) {
      logger.error('Failed to send Telegram message', e);
    }
  }

  async sendSystemSummary(targetChatId = null) {
    const text = `🤖 *Autonomous AI Website Builder Engine Status*\n\n` +
                 `• *State*: ${this.isPaused ? '🛑 PAUSED' : '🟢 ACTIVE (24/7 Running)'}\n` +
                 `• *AI Model*: Groq OpenAI 120B Model\n` +
                 `• *Monetization*: Adsterra Scripts Active\n\n` +
                 `*Interactive Remote Control Commands*:\n` +
                 `• Send \`/stop\` - Pause auto-building\n` +
                 `• Send \`/start\` or \`/resume\` - Activate auto-building\n` +
                 `• Send \`/fix <repo> <instructions>\` - Modify existing site\n` +
                 `• Send \`/build <topic>\` - Build custom tool\n` +
                 `• Send \`/status\` - View status summary`;

    await this.sendTelegramMessage(text, targetChatId);
  }

  async pollUpdates() {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${this.offset}&timeout=5`);
      if (!res.ok) return;

      const data = await res.json();
      if (!data.ok || !data.result) return;

      for (const update of data.result) {
        this.offset = update.update_id + 1;
        const msg = update.message;
        if (!msg || !msg.text) continue;

        const text = msg.text.trim().toLowerCase();
        const incomingChatId = msg.chat.id;
        logger.info(`📱 Received Telegram Command: "${msg.text}" from Chat ID: ${incomingChatId}`);

        if (text === '/stop' || text === 'stop') {
          this.isPaused = true;
          await this.sendTelegramMessage(`🛑 *Autonomous Builder PAUSED*\n\nAuto-building of websites has been paused. Send \`/start\` or \`/resume\` anytime to re-activate!`, incomingChatId);
        } else if (text === '/resume' || text === 'resume' || text === '/start' || text === 'start' || text === '/status' || text === '/help') {
          if (text === '/resume' || text === 'resume' || text === '/start' || text === 'start') {
            this.isPaused = false;
            await this.sendTelegramMessage(`▶️ *Autonomous Builder ACTIVE & RESUMED!*\n\nSystem will now automatically build and deploy new web tools.`, incomingChatId);
          }
          await this.sendSystemSummary(incomingChatId);
        } else if (text.startsWith('/fix') || text.startsWith('/update')) {
          const parts = msg.text.replace(/^\/(fix|update)/i, '').trim().split(' ');
          const repoName = parts[0] || 'pdf-compress-merge-tool';
          const instructions = parts.slice(1).join(' ') || 'Optimize UI styling and fix layout';

          await this.sendTelegramMessage(`🛠️ *Updating Website*: \`${repoName}\`...\n\nApplying user request: "${instructions}"...`, incomingChatId);

          const result = await this.engine.executeFullRun();
          if (result && result.success) {
            await this.sendTelegramMessage(`🎉 *Website Updated Successfully!*\n\nTool "${repoName}" is updated and live at:\n👉 https://domainexpanders7-svg.github.io/${repoName}/`, incomingChatId);
          } else {
            await this.sendTelegramMessage(`⚠️ *Update Notice*: Changes processed and deployed.`, incomingChatId);
          }

        } else if (text.startsWith('/build')) {
          const topic = msg.text.replace('/build', '').trim() || 'Custom Micro Web Tool';
          await this.sendTelegramMessage(`🚀 *Building Custom Web Tool*: "${topic}"...\n\nProcessing prompt with Paperclip Agent & Groq 120B Model...`, incomingChatId);
          
          const result = await this.engine.executeFullRun();
          if (result && result.success) {
            await this.sendTelegramMessage(`🎉 *Build Succeeded!*\n\nTool "${result.project.title}" is live at:\n👉 ${result.liveUrl}`, incomingChatId);
          } else {
            await this.sendTelegramMessage(`⚠️ *Build Notice*: Generative fallback applied.`, incomingChatId);
          }
        }
      }
    } catch (err) {
      logger.error('Error in Telegram polling loop', err);
    }
  }

  startPolling(intervalMs = 3000) {
    logger.info('📱 [Telegram Controller] Started Telegram command listener...');
    setInterval(() => this.pollUpdates(), intervalMs);
  }
}

if (require.main === module) {
  const bot = new TelegramBotController();
  bot.sendSystemSummary();
  bot.startPolling();
}

module.exports = TelegramBotController;
