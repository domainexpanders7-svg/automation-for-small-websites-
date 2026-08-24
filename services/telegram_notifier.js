/**
 * Shared Telegram Notifier Utility
 * Used by OpenCode Agent, Kilo Agent, and Autonomous Engine to send
 * CLI error alerts, status updates, and diagnostic info to Telegram.
 */

const { logger } = require('./observability');

const token = process.env.TELEGRAM_BOT_TOKEN || '';
const chatId = process.env.TELEGRAM_CHAT_ID || '';

async function sendTelegramAlert(text) {
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });
  } catch (e) {
    logger.error(`[Telegram Notifier] Failed to send alert: ${e.message}`);
  }
}

/**
 * Send CLI error notification to Telegram
 * @param {string} agentName - 'OpenCode' or 'Kilo'
 * @param {string} action - What the agent was trying to do
 * @param {string} errorMsg - The error message
 */
async function notifyCLIError(agentName, action, errorMsg) {
  const msg = `⚠️ *CLI Error Alert*\n\n` +
              `🤖 *Agent*: ${agentName}\n` +
              `📋 *Action*: ${action}\n` +
              `❌ *Error*: \`${errorMsg.substring(0, 500)}\`\n\n` +
              `ℹ️ System auto-fell back to Groq AI API for this operation.`;
  await sendTelegramAlert(msg);
}

/**
 * Send CLI status update to Telegram
 * @param {string} agentName - Agent name
 * @param {string} status - Status message
 */
async function notifyCLIStatus(agentName, status) {
  const msg = `🔧 *CLI Status Update*\n\n` +
              `🤖 *Agent*: ${agentName}\n` +
              `📊 *Status*: ${status}`;
  await sendTelegramAlert(msg);
}

module.exports = { sendTelegramAlert, notifyCLIError, notifyCLIStatus };
