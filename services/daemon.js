/**
 * Continuous Always-Running Daemon Service
 * Runs the Master Autonomous AI Engine periodically in background
 */

const http = require('http');
const MasterAutonomousEngine = require('./autonomous_engine');
const TelegramBotController = require('./telegram_bot');
const { logger } = require('./observability');

// Configurable Interval (Default: Every 1 hour = 3600000 ms, or ENV specified)
const INTERVAL_MS = (parseInt(process.env.AUTOMATION_INTERVAL_MINUTES, 10) || 60) * 60 * 1000;
const PORT = process.env.PORT || 10000;

class AutonomousDaemon {
  constructor() {
    this.engine = new MasterAutonomousEngine();
    this.telegramBot = new TelegramBotController();
    this.telegramBot.startPolling();
    this.isRunning = false;
    this.cycleCount = 0;
    this.setupHttpServer();
  }

  /**
   * Health-check HTTP server to keep Render Free tier awake 24/7
   */
  setupHttpServer() {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ONLINE',
        service: 'Autonomous AI Website Builder Daemon',
        uptime_seconds: process.uptime(),
        cycles_completed: this.cycleCount
      }));
    });

    server.listen(PORT, () => {
      logger.info(`🌐 [Keep-Alive] HTTP Health Check Server listening on PORT ${PORT}`);
    });

    // Self-ping loop every 5 minutes to prevent Render free tier sleep
    setInterval(() => {
      const selfUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
      fetch(selfUrl).catch(() => {});
    }, 5 * 60 * 1000);
  }

  async runSingleCycle() {
    if (this.telegramBot && this.telegramBot.isPaused) {
      logger.info(`⏸️ [Daemon] Engine is currently PAUSED via Telegram /stop command. Skipping build cycle.`);
      return;
    }

    this.cycleCount++;
    logger.info(`=================================================================`);
    logger.info(`🔄 [Daemon] Executing Autonomous AI Engine Cycle #${this.cycleCount}`);
    logger.info(`=================================================================`);

    try {
      const result = await this.engine.executeFullRun();
      logger.info(`✅ [Daemon] Cycle #${this.cycleCount} finished successfully`, { result });
    } catch (err) {
      logger.error(`❌ [Daemon] Cycle #${this.cycleCount} encountered an error`, err);
    }
  }

  start() {
    if (this.isRunning) {
      logger.warn('⚠️ [Daemon] Daemon is already running.');
      return;
    }

    this.isRunning = true;
    logger.info('=================================================================');
    logger.info('🚀 AUTONOMOUS AI WEBSITE BUILDER DAEMON STARTED (ALWAYS RUNNING) 🚀');
    logger.info(`⏱️ Schedule Interval: Every ${INTERVAL_MS / 60000} minutes`);
    logger.info('=================================================================');

    // Run first cycle immediately
    this.runSingleCycle();

    // Schedule recurring cycles
    this.timer = setInterval(() => {
      this.runSingleCycle();
    }, INTERVAL_MS);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.isRunning = false;
      logger.info('⏹️ [Daemon] Autonomous AI Daemon stopped gracefully.');
    }
  }
}

// Start Daemon automatically when executed directly
if (require.main === module) {
  const daemon = new AutonomousDaemon();
  daemon.start();

  // Handle process termination signals
  process.on('SIGINT', () => {
    daemon.stop();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    daemon.stop();
    process.exit(0);
  });
}

module.exports = AutonomousDaemon;
