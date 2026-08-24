/**
 * Server-Side OpenCode Agent Controller
 * Default Model: 'opencode/big-pickle'
 * PRIMARY coding agent: All website code generation goes through OpenCode CLI first.
 * Fallback: Groq AI API (never hardcoded templates).
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { logger } = require('./observability');
const { notifyCLIError, notifyCLIStatus } = require('./telegram_notifier');

class OpenCodeAgent {
  constructor(model = 'opencode/big-pickle') {
    this.model = model;
    this.isAvailable = false;
    this.groqKey = process.env.GROQ_API_KEY || '';
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
        logger.warn(`⚠️ [OpenCode Agent] OpenCode CLI not detected. Will use Groq AI API for code generation.`);
        notifyCLIStatus('OpenCode', 'CLI not detected on server. Using Groq AI API fallback for code generation.');
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
      const escapedPrompt = prompt.replace(/"/g, '\\"');
      const command = `opencode run -m ${this.model} "${escapedPrompt}"`;
      logger.info(`🤖 [OpenCode Agent] Command: ${command} (CWD: ${cwd})`);

      exec(command, { cwd, timeout: timeoutMs, maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
        if (error) {
          logger.error(`❌ [OpenCode Agent] Execution error: ${error.message}`);
          notifyCLIError('OpenCode', `CLI command failed (CWD: ${cwd})`, error.message);
          resolve({ success: false, error: error.message, stdout, stderr });
        } else {
          logger.info(`🎉 [OpenCode Agent] Execution completed successfully.`);
          resolve({ success: true, stdout, stderr });
        }
      });
    });
  }

  /**
   * Build the detailed prompt for full-stack website generation
   */
  buildCodeGenPrompt(project) {
    return `Build a production-ready single-page web app for "${project.title}" (${project.category}). Single index.html with inline CSS/JS. Dark glassmorphism UI (#0f172a bg, #38bdf8 accents, backdrop-filter blur). Google Fonts. REAL interactive JS functionality for ${project.title} (forms, calculations, dynamic output). Ad divs: #ad-slot-top, #ad-slot-bottom. SEO meta viewport, og:title, JSON-LD schema. Mobile responsive. CSS animations. No frameworks. Return ONLY raw HTML starting with <!DOCTYPE html>. No markdown.`;
  }

  /**
   * Generate website code using Groq AI API (real AI, not templates)
   */
  async generateWithGroqAPI(project) {
    if (!this.groqKey) {
      logger.warn(`⚠️ [OpenCode Agent] GROQ_API_KEY not set. Cannot generate AI code.`);
      return null;
    }

    const prompt = this.buildCodeGenPrompt(project);
    logger.info(`🧠 [OpenCode Agent] Generating code via Groq AI API (model: openai/gpt-oss-20b)...`);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        logger.error(`❌ [OpenCode Agent] Groq API error HTTP ${response.status}: ${errText}`);
        notifyCLIError('OpenCode (Groq API)', `HTTP ${response.status} error during code generation`, errText.substring(0, 300));
        return null;
      }

      const data = await response.json();
      let generatedCode = data.choices?.[0]?.message?.content || '';

      // Strip markdown backticks if present
      if (generatedCode.includes('```html')) {
        generatedCode = generatedCode.split('```html')[1].split('```')[0].trim();
      } else if (generatedCode.includes('```')) {
        generatedCode = generatedCode.split('```')[1].split('```')[0].trim();
      }

      if (generatedCode.includes('<!DOCTYPE html>') || generatedCode.includes('<!doctype html>')) {
        logger.info(`✅ [OpenCode Agent] Groq AI generated ${generatedCode.length} bytes of real code.`);
        return generatedCode;
      }

      logger.warn(`⚠️ [OpenCode Agent] Groq AI response did not contain valid HTML.`);
      return null;
    } catch (err) {
      logger.error(`❌ [OpenCode Agent] Groq API call failed: ${err.message}`);
      return null;
    }
  }

  /**
   * PRIMARY: Generate Full-Stack Website Project using OpenCode CLI or Groq AI API
   * NEVER uses hardcoded templates.
   */
  async generateWebsite(project, targetDir) {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Strategy 1: Use OpenCode CLI on the deployed server
    if (this.isAvailable) {
      logger.info(`⚡ [OpenCode Agent] Using OpenCode CLI (${this.model}) for code generation...`);
      const prompt = this.buildCodeGenPrompt(project);
      const result = await this.runCommand(prompt, targetDir);

      const indexPath = path.join(targetDir, 'index.html');
      if (result.success && fs.existsSync(indexPath)) {
        const htmlContent = fs.readFileSync(indexPath, 'utf8');
        if (htmlContent.includes('<!DOCTYPE html>') || htmlContent.includes('<!doctype html>')) {
          logger.info(`✅ [OpenCode Agent] CLI generated real code: ${htmlContent.length} bytes`);
          return { success: true, htmlContent, source: 'opencode-cli' };
        }
      }
      logger.warn(`⚠️ [OpenCode Agent] CLI did not produce valid index.html. Falling back to Groq AI API...`);
    }

    // Strategy 2: Use Groq AI API (real AI code generation)
    const groqCode = await this.generateWithGroqAPI(project);
    if (groqCode) {
      // Write the AI-generated code to disk
      const indexPath = path.join(targetDir, 'index.html');
      fs.writeFileSync(indexPath, groqCode, 'utf8');
      logger.info(`✅ [OpenCode Agent] Groq AI code written to ${indexPath}`);
      return { success: true, htmlContent: groqCode, source: 'groq-api' };
    }

    logger.error(`❌ [OpenCode Agent] All code generation strategies failed for "${project.title}".`);
    return { success: false, htmlContent: null };
  }

  /**
   * Post-Deployment Live Verification Check (OpenCode Agent)
   */
  async verifyDeployedWebsite(vercelLiveUrl, targetDir) {
    logger.info(`🔍 [OpenCode Agent] Auditing live deployed Vercel site: ${vercelLiveUrl}...`);
    try {
      const res = await fetch(vercelLiveUrl);
      const isLive = res.ok;
      logger.info(`${isLive ? '✅' : '⚠️'} [OpenCode Agent] Live Vercel Site Check: HTTP ${res.status} (${isLive ? 'SUCCESS' : 'FAILED'})`);

      if (this.isAvailable && isLive) {
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
