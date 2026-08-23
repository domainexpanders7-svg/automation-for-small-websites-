/**
 * Server-Side OpenCode Agent Controller
 * Utilizes OpenCode CLI with 'opencode/big-pickle' model for autonomous website generation & QA testing on deployed servers.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { logger } = require('./observability');

class OpenCodeAgent {
  constructor(model = 'opencode/big-pickle') {
    this.model = model;
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
        logger.warn('⚠️ [OpenCode Agent] OpenCode CLI not detected on server. Falling back to direct API generation.');
      }
    });
  }

  /**
   * Execute an OpenCode run command asynchronously with timeout
   */
  async runCommand(prompt, cwd, timeoutMs = 120000) {
    return new Promise((resolve) => {
      const command = `opencode run -m ${this.model} "${prompt.replace(/"/g, '\\"')}"`;
      logger.info(`🤖 [OpenCode Agent] Running on server: ${command} (CWD: ${cwd})`);

      exec(command, { cwd, timeout: timeoutMs }, (error, stdout, stderr) => {
        if (error) {
          logger.error(`❌ [OpenCode Agent] Command failed: ${error.message}`, { stderr });
          resolve({ success: false, error: error.message, stdout, stderr });
        } else {
          logger.info(`🎉 [OpenCode Agent] Execution completed successfully.`);
          resolve({ success: true, stdout, stderr });
        }
      });
    });
  }

  /**
   * Generate Full Website Project using OpenCode (big-pickle model)
   */
  async generateWebsite(project, targetDir) {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const prompt = `Build a complete, single-file HTML5 web application for "${project.title}" (${project.category}). ` +
                   `Create index.html with inline modern CSS and JS. Implement modern glassmorphism design, responsive layout, ` +
                   `Adsterra ad containers, and full interactive features. Do not use external framework dependencies.`;

    const result = await this.runCommand(prompt, targetDir);

    const indexPath = path.join(targetDir, 'index.html');
    if (result.success && fs.existsSync(indexPath)) {
      const htmlContent = fs.readFileSync(indexPath, 'utf8');
      return { success: true, htmlContent };
    }

    return { success: false, error: result.error || 'index.html not generated' };
  }

  /**
   * Audit & Run QA Test Pass on Deployed Server using OpenCode (big-pickle model)
   */
  async auditAndTestWebsite(targetDir) {
    const prompt = `Audit index.html in the current folder. Check for syntax errors, missing closing tags, ` +
                   `ensure Adsterra script containers are present, and verify mobile responsiveness. Refactor if needed.`;

    const result = await this.runCommand(prompt, targetDir, 60000);
    return result;
  }
}

module.exports = OpenCodeAgent;
