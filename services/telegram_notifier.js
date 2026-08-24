/**
 * Centralized Telegram Notifier Utility
 * All Telegram notifications for the autonomous engine flow through this module.
 * Used by OpenCode Agent, Kilo Agent, and Autonomous Engine.
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
 */
async function notifyCLIError(agentName, action, errorMsg) {
  const msg = `⚠️ *CLI Error Alert*\n\n` +
              `🤖 *Agent*: ${agentName}\n` +
              `📋 *Action*: ${action}\n` +
              `❌ *Error*: \`${errorMsg.substring(0, 500)}\`\n\n` +
              `ℹ️ Auto-fallback activated.`;
  await sendTelegramAlert(msg);
}

/**
 * Send CLI status update to Telegram
 */
async function notifyCLIStatus(agentName, status) {
  const msg = `🔧 *CLI Status Update*\n\n` +
              `🤖 *Agent*: ${agentName}\n` +
              `📊 *Status*: ${status}`;
  await sendTelegramAlert(msg);
}

/**
 * Notify that a new stage has started
 */
async function notifyStageStart(agentName, stageNumber, stageName) {
  const msg = `🚀 *Stage ${stageNumber} Started*\n\n` +
              `🤖 *Agent*: ${agentName}\n` +
              `📋 *Stage*: ${stageName}`;
  await sendTelegramAlert(msg);
}

/**
 * Notify that a stage completed successfully
 */
async function notifyStageComplete(agentName, stageNumber, stageName, resultSummary = '') {
  const msg = `✅ *Stage ${stageNumber} Complete*\n\n` +
              `🤖 *Agent*: ${agentName}\n` +
              `📋 *Stage*: ${stageName}\n` +
              `${resultSummary ? `📊 *Result*: ${resultSummary}\n` : ''}` +
              `➡️ Proceeding to next stage...`;
  await sendTelegramAlert(msg);
}

/**
 * Notify that a stage failed
 */
async function notifyStageFailure(agentName, stageNumber, stageName, errorMsg, plannedAction = 'Retrying with fallback agent') {
  const msg = `❌ *Stage ${stageNumber} Failed*\n\n` +
              `🤖 *Agent*: ${agentName}\n` +
              `📋 *Stage*: ${stageName}\n` +
              `💥 *Error*: \`${errorMsg.substring(0, 500)}\`\n\n` +
              `🛠️ *Action*: ${plannedAction}`;
  await sendTelegramAlert(msg);
}

/**
 * Notify that the Render server received a trigger
 */
async function notifyRenderTrigger(source = 'webhook') {
  const msg = `🌐 *Render Trigger Received*\n\n` +
              `📍 *Source*: ${source}\n` +
              `🤖 *Action*: Initiating 7-Stage AI Agent Development Cycle`;
  await sendTelegramAlert(msg);
}

/**
 * Notify agent fallback event
 */
async function notifyAgentFallback(fromAgent, toAgent, reason) {
  const msg = `🔄 *Agent Fallback*\n\n` +
              `⬇️ *From*: ${fromAgent}\n` +
              `⬆️ *To*: ${toAgent}\n` +
              `📋 *Reason*: ${reason}`;
  await sendTelegramAlert(msg);
}

/**
 * Notify that the full cycle has started
 */
async function notifyCycleStart(cycleNumber) {
  const msg = `🔄 *Autonomous Cycle Started*\n\n` +
              `🔢 *Cycle*: #${cycleNumber}\n` +
              `🤖 *Agents*: OpenCode (primary) + KiloCode (secondary/debug)\n` +
              `🚀 *Deployment*: Render Free Tier\n` +
              `📱 *Status*: Running 7-stage loop...`;
  await sendTelegramAlert(msg);
}

/**
 * Notify that the full cycle has completed
 */
async function notifyCycleComplete(cycleNumber, projectName, liveUrl, durationMs, success) {
  const status = success ? '✅ SUCCESS' : '⚠️ PARTIAL';
  const msg = `${status} *Autonomous Cycle #${cycleNumber} Complete*\n\n` +
              `📁 *Project*: ${projectName}\n` +
              `🌐 *Live URL*: ${liveUrl || 'N/A'}\n` +
              `⏱️ *Duration*: ${durationMs}ms\n` +
              `🤖 *Agents*: OpenCode + KiloCode\n` +
              `🛡️ *Observability*: Active`;
  await sendTelegramAlert(msg);
}

module.exports = {
  sendTelegramAlert,
  notifyCLIError,
  notifyCLIStatus,
  notifyStageStart,
  notifyStageComplete,
  notifyStageFailure,
  notifyRenderTrigger,
  notifyAgentFallback,
  notifyCycleStart,
  notifyCycleComplete
};
