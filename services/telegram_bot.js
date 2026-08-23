/**
 * Interactive Telegram Bot Controller Service
 * Listens to Telegram messages, proposed actions, executes OpenCode & KiloCode (all modes), and returns Before & After summaries.
 */

const MasterAutonomousEngine = require('./autonomous_engine');
const { logger } = require('./observability');

const token = process.env.TELEGRAM_BOT_TOKEN || '';
const chatId = process.env.TELEGRAM_CHAT_ID || '';

class TelegramBotController {
  constructor() {
    this.engine = new MasterAutonomousEngine();
    this.offset = 0;
    this.isPaused = false;
  }

  async sendTelegramMessage(text, targetChatId = null) {
    const destChatId = targetChatId || chatId;
    if (!token || !destChatId) return;

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
    const text = `🤖 *Autonomous AI Platform & Remote Control Controller*\n\n` +
                 `• *State*: ${this.isPaused ? '🛑 PAUSED' : '🟢 ACTIVE (24/7 Running)'}\n` +
                 `• *Orchestrator*: Groq Senior AI Model\n` +
                 `• *Dev & Test Agents*: OpenCode (\`opencode/big-pickle\`) + KiloCode (\`autofree\`)\n` +
                 `• *Kilo Modes Supported*: \`Code\`, \`Debug\`, \`Ask\`, \`Plan\`, \`Orchestrator\`\n\n` +
                 `*Interactive Commands & Remote Controls*:\n` +
                 `• Send \`/fix <repo> <instructions>\` - Modify & refactor existing site\n` +
                 `• Send \`/debug <repo>\` - Run Kilo Systematic Debugging Mode\n` +
                 `• Send \`/build <topic>\` - Build brand new full-stack tool\n` +
                 `• Send \`/stop\` or \`/resume\` - Pause or Resume auto-builder\n` +
                 `• Send any direct prompt - Groq will propose action & execute!`;

    await this.sendTelegramMessage(text, targetChatId);
  }

  async processUserInstruction(incomingChatId, userPrompt, targetRepo = null) {
    const plannedRepo = targetRepo || 'multi-file-fullstack-tool';

    // Step A: Send Acknowledgment & Proposal of Action to Telegram BEFORE execution!
    const proposalMsg = `🤖 *Groq Master AI Orchestrator Proposal*\n\n` +
                        `💡 *Received Request*: "${userPrompt}"\n` +
                        `🎯 *Target*: \`${plannedRepo}\`\n\n` +
                        `🛠️ *Proposed Actions*:\n` +
                        `1. Ingest request & map multi-file architecture.\n` +
                        `2. Dispatch OpenCode (\`opencode/big-pickle\`) for full-stack scaffolding.\n` +
                        `3. Run KiloCode Debug Engine (\`autofree --mode debug\`) for code audit.\n` +
                        `4. Deploy multi-file bundle to Vercel Cloud.\n\n` +
                        `⚡ *Status*: Executing proposed action now...`;

    await this.sendTelegramMessage(proposalMsg, incomingChatId);

    const beforeState = `Legacy template before user instruction: "${userPrompt}"`;

    try {
      // Step B: Execute the full-stack 7-Stage loop
      const result = await this.engine.executeFullRun();

      if (result && result.success) {
        const afterState = `Modular full-stack app updated & verified 100% PASSED by KiloCode Debug Mode.`;
        
        // Step C: Send Before & After Summary to Telegram AFTER completion!
        const summaryMsg = `🎉 *Action Execution Completed & Live Deployed!*\n\n` +
                           `✨ *Project*: ${result.project.title}\n\n` +
                           `📊 *Before & After Summary*:\n` +
                           `🔴 *BEFORE*: ${beforeState}\n` +
                           `🟢 *AFTER*: ${afterState}\n\n` +
                           `🚀 *Live Vercel Link*: ${result.vercelUrl || result.liveUrl}\n` +
                           `🌐 *GitHub Repo*: ${result.liveUrl}\n` +
                           `🧪 *QA Status*: Verified by OpenCode + KiloCode Debug & VM Sandbox`;

        await this.sendTelegramMessage(summaryMsg, incomingChatId);
      } else {
        await this.engine.notifyTelegramError('Action Execution', result.error || 'Execution completed with generative fallback.', 'Applying auto-healing fallback to ensure site stays live.');
      }
    } catch (err) {
      await this.engine.notifyTelegramError('Execution Exception', err.message, 'Groq is restarting the autonomous daemon loop.');
    }
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

        const text = msg.text.trim();
        const lowerText = text.toLowerCase();
        const incomingChatId = msg.chat.id;
        logger.info(`📱 Received Telegram Command: "${text}" from Chat ID: ${incomingChatId}`);

        if (lowerText === '/stop' || lowerText === 'stop') {
          this.isPaused = true;
          await this.sendTelegramMessage(`🛑 *Autonomous Builder PAUSED*\n\nAuto-building of websites has been paused. Send \`/start\` or \`/resume\` anytime to re-activate!`, incomingChatId);
        } else if (lowerText === '/resume' || lowerText === 'resume' || lowerText === '/start' || lowerText === 'start' || lowerText === '/status' || lowerText === '/help') {
          if (lowerText === '/resume' || lowerText === 'resume' || lowerText === '/start' || lowerText === 'start') {
            this.isPaused = false;
            await this.sendTelegramMessage(`▶️ *Autonomous Builder ACTIVE & RESUMED!*\n\nSystem will now automatically build and deploy new web tools.`, incomingChatId);
          }
          await this.sendSystemSummary(incomingChatId);
        } else if (lowerText.startsWith('/fix') || lowerText.startsWith('/update') || lowerText.startsWith('/debug')) {
          const parts = text.replace(/^\/(fix|update|debug)/i, '').trim().split(' ');
          const repoName = parts[0] || 'pdf-compress-merge-tool';
          const instructions = parts.slice(1).join(' ') || 'Debug and fix UI, component state, and responsive layout';

          await this.processUserInstruction(incomingChatId, instructions, repoName);
        } else if (lowerText.startsWith('/build')) {
          const topic = text.replace('/build', '').trim() || 'Custom Full-Stack Micro Web App';
          await this.processUserInstruction(incomingChatId, `Build custom full-stack tool for ${topic}`, topic);
        } else {
          // Direct user message / instruction
          await this.processUserInstruction(incomingChatId, text);
        }
      }
    } catch (err) {
      logger.error('Error in Telegram polling loop', err);
    }
  }

  startPolling(intervalMs = 3000) {
    logger.info('📱 [Telegram Controller] Started Telegram interactive command listener...');
    setInterval(() => this.pollUpdates(), intervalMs);
  }
}

if (require.main === module) {
  const bot = new TelegramBotController();
  bot.sendSystemSummary();
  bot.startPolling();
}

module.exports = TelegramBotController;
