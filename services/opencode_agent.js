/**
 * Server-Side OpenCode Agent Controller
 * Default Model: 'opencode/big-pickle'
 * Handles autonomous multi-file full-stack website generation, CLI command execution, & live post-deployment QA verification.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const AIGenerator = require('./ai_generator');
const { logger } = require('./observability');

class OpenCodeAgent {
  constructor(model = 'opencode/big-pickle') {
    this.model = model;
    this.generator = new AIGenerator();
    this.isAvailable = false;
    this.checkAvailability();
  }

  /**
   * Check if opencode CLI is available in the server system PATH
   */
  checkAvailability() {
    exec('opencode --version', (err, stdout) => {
      if (!err && stdout) {
        this.isAvailable = true;
        logger.info(`✅ [OpenCode Agent] OpenCode CLI detected on server (${stdout.trim()}). Default model: ${this.model}`);
      } else {
        this.isAvailable = false;
        logger.warn(`⚠️ [OpenCode Agent] OpenCode CLI not detected on server. Utilizing API-backed OpenCode engine (model: ${this.model}).`);
      }
    });
  }

  /**
   * Execute an OpenCode CLI run command with default 'opencode/big-pickle' model
   */
  async runCommand(prompt, cwd, timeoutMs = 120000) {
    if (!this.isAvailable) {
      return { success: false, error: 'OpenCode CLI not installed on server' };
    }
    return new Promise((resolve) => {
      const command = `opencode run -m ${this.model} "${prompt.replace(/"/g, '\\"')}"`;
      logger.info(`🤖 [OpenCode Agent] Command: ${command} (CWD: ${cwd})`);

      exec(command, { cwd, timeout: timeoutMs }, (error, stdout, stderr) => {
        if (error) {
          logger.error(`❌ [OpenCode Agent] Execution error: ${error.message}`, { stderr });
          resolve({ success: false, error: error.message, stdout, stderr });
        } else {
          logger.info(`🎉 [OpenCode Agent] Execution completed successfully.`);
          resolve({ success: true, stdout, stderr });
        }
      });
    });
  }

  /**
   * Generate Full-Stack Multi-File Website Project (OpenCode Agent)
   */
  async generateWebsite(project, targetDir) {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    if (this.isAvailable) {
      const prompt = `Build a complete multi-file full-stack web application for "${project.title}" (${project.category}). ` +
                     `Generate index.html, src/app.js, src/styles.css, src/components/Header.js, src/components/Main.js, and package.json. ` +
                     `Use modern glassmorphism dark UI design system, Adsterra monetization slots, and responsive layout.`;

      const result = await this.runCommand(prompt, targetDir);

      const indexPath = path.join(targetDir, 'index.html');
      if (result.success && fs.existsSync(indexPath)) {
        const htmlContent = fs.readFileSync(indexPath, 'utf8');
        return { success: true, htmlContent };
      }
    }

    logger.info(`⚡ [OpenCode Agent] Generating multi-file full-stack web app via Groq-backed OpenCode engine (${this.model})...`);
    const multiFileApp = await this.generator.generateMultiFileFullStackApp(project, targetDir);
    return { success: true, htmlContent: multiFileApp.indexHtml, files: multiFileApp.files };
  }

  /**
   * Post-Deployment Live Verification Check (OpenCode Agent)
   */
  async verifyDeployedWebsite(vercelLiveUrl, targetDir) {
    logger.info(`🔍 [OpenCode Agent] Auditing live deployed Vercel site: ${vercelLiveUrl}...`);
    try {
      const res = await fetch(vercelLiveUrl);
      const isLive = res.ok;
      logger.info(`✅ [OpenCode Agent] Live Vercel Site Check: HTTP ${res.status} (${isLive ? 'SUCCESS' : 'FAILED'})`);
      
      if (this.isAvailable) {
        await this.runCommand(`Verify live deployed website at ${vercelLiveUrl}. Ensure main features and CSS load cleanly.`, targetDir, 40000);
      }
      return { success: isLive, status: res.status, liveUrl: vercelLiveUrl };
    } catch (err) {
      logger.error(`❌ [OpenCode Agent] Live URL verification failed: ${err.message}`);
      return { success: false, error: err.message, liveUrl: vercelLiveUrl };
    }
  }
}

module.exports = OpenCodeAgent;
