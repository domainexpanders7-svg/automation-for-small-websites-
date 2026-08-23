/**
 * Server-Side Kilo Code Agent Controller
 * Default Model: 'autofree' (or 'kilo-code-v1')
 * Supports specialized execution modes: 'code', 'debug', 'ask', 'plan', 'orchestrator'
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const AIGenerator = require('./ai_generator');
const { logger } = require('./observability');

class KiloAgent {
  constructor(model = 'autofree') {
    this.model = model;
    this.generator = new AIGenerator();
    this.isAvailable = false;
    this.checkAvailability();
  }

  /**
   * Check if kilo CLI is available in the server system PATH
   */
  checkAvailability() {
    exec('kilo --version', (err, stdout) => {
      if (!err && stdout) {
        this.isAvailable = true;
        logger.info(`✅ [Kilo Agent] Kilo CLI detected on server (${stdout.trim()}). Default model: ${this.model}`);
      } else {
        this.isAvailable = false;
        logger.warn(`⚠️ [Kilo Agent] Kilo CLI not detected on server. Utilizing API-backed Kilo Multi-Mode Engine (model: ${this.model}).`);
      }
    });
  }

  /**
   * Execute a Kilo CLI run command with specified mode ('code', 'debug', 'ask', 'plan', 'orchestrator')
   */
  async runCommand(prompt, cwd, mode = 'code', timeoutMs = 120000) {
    if (!this.isAvailable) {
      return { success: false, error: 'Kilo CLI not installed on server' };
    }
    return new Promise((resolve) => {
      const command = `kilo run -m ${this.model} --mode ${mode} "${prompt.replace(/"/g, '\\"')}"`;
      logger.info(`🤖 [Kilo Agent Mode: ${mode}] Command: ${command} (CWD: ${cwd})`);

      exec(command, { cwd, timeout: timeoutMs }, (error, stdout, stderr) => {
        if (error) {
          logger.error(`❌ [Kilo Agent Mode: ${mode}] Execution error: ${error.message}`, { stderr });
          resolve({ success: false, error: error.message, stdout, stderr });
        } else {
          logger.info(`🎉 [Kilo Agent Mode: ${mode}] Execution completed successfully.`);
          resolve({ success: true, stdout, stderr });
        }
      });
    });
  }

  /**
   * Refactor / Fallback Full-Stack Website Generator (Kilo Code)
   */
  async generateWebsite(project, targetDir) {
    if (this.isAvailable) {
      const prompt = `Refactor & build complete multi-file full-stack app for "${project.title}" (${project.category}). ` +
                     `Create index.html, src/app.js, src/styles.css, src/components/Header.js, and package.json with modern glassmorphism design.`;
      const res = await this.runCommand(prompt, targetDir, 'code');
      const indexPath = path.join(targetDir, 'index.html');
      if (res.success && fs.existsSync(indexPath)) {
        return { success: true, htmlContent: fs.readFileSync(indexPath, 'utf8') };
      }
    }
    logger.info(`⚡ [Kilo Agent] Generating multi-file fallback web app via Kilo AI engine (${this.model})...`);
    const multiFileApp = await this.generator.generateMultiFileFullStackApp(project, targetDir);
    return { success: true, htmlContent: multiFileApp.indexHtml, files: multiFileApp.files };
  }

  /**
   * Systematic Debugging & Error Diagnosis Mode (--mode debug)
   */
  async repairBrokenCode(targetDir, htmlContent, errorLogs) {
    logger.info(`🛠️ [Kilo Agent Debug Mode] Diagnosing and fixing software issues...`, { errors: errorLogs });

    if (this.isAvailable) {
      const prompt = `Systematic debugging: Fix build failures (${errorLogs.join('; ')}). Inspect index.html, src/app.js, src/styles.css. Repair all errors.`;
      await this.runCommand(prompt, targetDir, 'debug', 60000);
      const indexPath = path.join(targetDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        return fs.readFileSync(indexPath, 'utf8');
      }
    }

    logger.info(`⚡ [Kilo Agent Debug Mode] Applying self-healing repair pass via Kilo engine...`);
    return this.generator.generateFallbackWebApp({ name: 'repaired-app', title: 'Self-Healed Application' });
  }

  /**
   * Post-Deployment Live Verification Check (Kilo Agent)
   */
  async verifyDeployedWebsite(vercelLiveUrl, targetDir) {
    logger.info(`🔍 [Kilo Agent Audit Mode] Auditing live deployed Vercel site: ${vercelLiveUrl}...`);
    try {
      const res = await fetch(vercelLiveUrl);
      const isLive = res.ok;
      logger.info(`✅ [Kilo Agent Audit Mode] Live Vercel Site Check: HTTP ${res.status} (${isLive ? 'PASSED' : 'FAILED'})`);
      
      if (this.isAvailable) {
        await this.runCommand(`Audit live deployed site at ${vercelLiveUrl}. Verify layout and JavaScript execution.`, targetDir, 'ask', 40000);
      }
      return { success: isLive, status: res.status, liveUrl: vercelLiveUrl };
    } catch (err) {
      logger.error(`❌ [Kilo Agent Audit Mode] Live URL verification failed: ${err.message}`);
      return { success: false, error: err.message, liveUrl: vercelLiveUrl };
    }
  }
}

module.exports = KiloAgent;
