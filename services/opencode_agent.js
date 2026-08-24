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
const {
  notifyCLIError,
  notifyCLIStatus,
  notifyStageStart,
  notifyStageComplete,
  notifyStageFailure,
  notifyAgentFallback
} = require('./telegram_notifier');

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
        notifyCLIStatus('OpenCode', `CLI detected on server. Default model: ${this.model}`);
      } else {
        this.isAvailable = false;
        const msg = 'OpenCode CLI not detected on server. Will use Groq AI API fallback for code generation.';
        logger.warn(`⚠️ [OpenCode Agent] ${msg}`);
        notifyCLIStatus('OpenCode', msg);
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
   * Generate a test suite for the generated HTML using Groq AI API
   */
  async generateTestSuite(htmlContent, project) {
    if (!this.groqKey) {
      logger.warn(`⚠️ [OpenCode Agent] GROQ_API_KEY not set. Cannot generate test suite.`);
      return null;
    }

    const prompt = `You are a QA engineer. Given this HTML project "${project.title}", generate a Node.js test script that validates:
1. HTML structure (DOCTYPE, closing tags, viewport, og:title, JSON-LD schema)
2. JavaScript syntax validity (extract inline scripts and validate with new Function() or vm.Script)
3. Ad slot presence (#ad-slot-top, #ad-slot-bottom)
4. Mobile responsiveness indicators (max-width, flex, grid)
5. SEO meta tags presence

Return ONLY valid JavaScript code that can be run with Node.js. The script should output PASS/FAIL for each test and an overall result. No markdown backticks.`;

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
          max_tokens: 3000,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        logger.error(`❌ [OpenCode Agent] Test suite generation failed: HTTP ${response.status}`);
        return null;
      }

      const data = await response.json();
      let code = data.choices?.[0]?.message?.content || '';
      if (code.includes('```javascript')) {
        code = code.split('```javascript')[1].split('```')[0].trim();
      } else if (code.includes('```')) {
        code = code.split('```')[1].split('```')[0].trim();
      }
      return code;
    } catch (err) {
      logger.error(`❌ [OpenCode Agent] Test suite generation failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Run generated tests using Node.js vm sandbox
   */
  async runTests(htmlContent, project) {
    logger.info(`🧪 [OpenCode Agent] Running QA tests for "${project.title}"...`);

    const testResults = {
      htmlSyntax: false,
      jsSyntax: false,
      adSlots: false,
      seoSchema: false,
      mobileResponsive: false,
      passed: false,
      errors: []
    };

    if (!htmlContent) {
      testResults.errors.push('HTML code is null or empty.');
      return testResults;
    }

    // Pass 1: HTML Syntax & Structure
    if (htmlContent.includes('<!DOCTYPE html>') && htmlContent.includes('</html>') && htmlContent.includes('</body>')) {
      testResults.htmlSyntax = true;
    } else {
      testResults.errors.push('HTML structure missing DOCTYPE or closing tags.');
    }

    // Pass 2: JavaScript Syntax Validation via Node.js vm Sandbox
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let jsErrors = [];
    while ((match = scriptRegex.exec(htmlContent)) !== null) {
      const jsCode = match[1].trim();
      if (jsCode && !match[0].includes('src=') && !match[0].toLowerCase().includes('json')) {
        try {
          new (require('vm').Script)(jsCode);
        } catch (err) {
          jsErrors.push(`JS Syntax Error: ${err.message}`);
        }
      }
    }
    if (jsErrors.length === 0) {
      testResults.jsSyntax = true;
    } else {
      testResults.errors.push(...jsErrors);
    }

    // Pass 3: Ad slots audit
    if (htmlContent.includes('ad-slot-top') && htmlContent.includes('ad-slot-bottom')) {
      testResults.adSlots = true;
    } else {
      testResults.errors.push('Ad slots missing in layout.');
    }

    // Pass 4: SEO & JSON-LD Schema Audit
    if (htmlContent.includes('application/ld+json') && htmlContent.includes('og:title') && htmlContent.includes('viewport')) {
      testResults.seoSchema = true;
    } else {
      testResults.errors.push('SEO viewport, OpenGraph tags, or JSON-LD schema missing.');
    }

    // Pass 5: Mobile Responsiveness Audit
    if (htmlContent.includes('max-width') || htmlContent.includes('flex') || htmlContent.includes('grid')) {
      testResults.mobileResponsive = true;
    } else {
      testResults.errors.push('CSS responsive rules missing.');
    }

    testResults.passed = testResults.htmlSyntax && testResults.jsSyntax && testResults.adSlots && testResults.seoSchema && testResults.mobileResponsive;
    logger.info(`🧪 [OpenCode Agent] Tests ${testResults.passed ? 'PASSED' : 'FAILED'}: ${JSON.stringify(testResults)}`);
    return testResults;
  }

  /**
   * PRIMARY: Generate Full-Stack Website Project using OpenCode CLI or Groq AI API
   * NEVER uses hardcoded templates.
   */
  async generateWebsite(project, targetDir) {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    await notifyStageStart('OpenCode', 3, 'Component Generation');

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
          await notifyStageComplete('OpenCode', 3, 'Component Generation', `Generated ${htmlContent.length} bytes via CLI`);
          return { success: true, htmlContent, source: 'opencode-cli' };
        }
      }
      logger.warn(`⚠️ [OpenCode Agent] CLI did not produce valid index.html. Falling back to Groq AI API...`);
      await notifyAgentFallback('OpenCode CLI', 'OpenCode Groq API', 'CLI did not produce valid index.html');
    }

    // Strategy 2: Use Groq AI API (real AI code generation)
    const groqCode = await this.generateWithGroqAPI(project);
    if (groqCode) {
      const indexPath = path.join(targetDir, 'index.html');
      fs.writeFileSync(indexPath, groqCode, 'utf8');
      logger.info(`✅ [OpenCode Agent] Groq AI code written to ${indexPath}`);
      await notifyStageComplete('OpenCode', 3, 'Component Generation', `Generated ${groqCode.length} bytes via Groq API`);
      return { success: true, htmlContent: groqCode, source: 'groq-api' };
    }

    logger.error(`❌ [OpenCode Agent] All code generation strategies failed for "${project.title}".`);
    await notifyStageFailure('OpenCode', 3, 'Component Generation', 'All code generation strategies failed', 'Will attempt Kilo Agent fallback');
    return { success: false, htmlContent: null };
  }

  /**
   * Post-Deployment Live Verification Check (OpenCode Agent)
   */
  async verifyDeployedWebsite(liveUrl, targetDir) {
    logger.info(`🔍 [OpenCode Agent] Auditing live deployed Render site: ${liveUrl}...`);
    try {
      const res = await fetch(liveUrl);
      const isLive = res.ok;
      logger.info(`${isLive ? '✅' : '⚠️'} [OpenCode Agent] Live Render Site Check: HTTP ${res.status} (${isLive ? 'SUCCESS' : 'FAILED'})`);

      if (this.isAvailable && isLive) {
        await this.runCommand(`Verify live deployed website at ${liveUrl}. Ensure main features and CSS load cleanly.`, targetDir, 40000);
      }
      return { success: isLive, status: res.status, liveUrl };
    } catch (err) {
      logger.error(`❌ [OpenCode Agent] Live URL verification failed: ${err.message}`);
      return { success: false, error: err.message, liveUrl };
    }
  }
}

module.exports = OpenCodeAgent;
