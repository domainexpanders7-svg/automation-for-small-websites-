/**
 * Server-Side Kilo Code Agent Controller
 * Default Model: 'autofree'
 * SECONDARY coding agent: Used for debugging, testing, refactoring, and fallback code generation.
 * Supports specialized execution modes: 'code', 'debug', 'ask', 'plan', 'orchestrator'
 * NEVER uses hardcoded templates. Uses Groq AI API as last resort.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { logger } = require('./observability');
const {
  notifyCLIError,
  notifyCLIStatus,
  notifyStageStart,
  notifyStageComplete,
  notifyStageFailure,
  notifyAgentFallback
} = require('./telegram_notifier');

class KiloAgent {
  constructor(model = 'autofree') {
    this.model = model;
    this.isAvailable = false;
    this.groqKey = process.env.GROQ_API_KEY || '';
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
        notifyCLIStatus('Kilo', `CLI detected on server. Default model: ${this.model}`);
      } else {
        this.isAvailable = false;
        const msg = 'Kilo CLI not detected on server. Will use Groq AI API fallback for code operations.';
        logger.warn(`⚠️ [Kilo Agent] ${msg}`);
        notifyCLIStatus('Kilo', msg);
      }
    });
  }

  /**
   * Execute a Kilo CLI run command with specified agent mode ('code', 'debug', 'ask', 'plan', 'orchestrator')
   */
  async runCommand(prompt, cwd, mode = 'code', timeoutMs = 120000) {
    if (!this.isAvailable) {
      return { success: false, error: 'Kilo CLI not installed on server' };
    }
    return new Promise((resolve) => {
      const escapedPrompt = prompt.replace(/"/g, '\\"');
      const command = `kilo run -m ${this.model} --agent ${mode} "${escapedPrompt}"`;
      logger.info(`🤖 [Kilo Agent: ${mode}] Command: ${command} (CWD: ${cwd})`);

      exec(command, { cwd, timeout: timeoutMs, maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
        if (error) {
          logger.error(`❌ [Kilo Agent: ${mode}] Execution error: ${error.message}`);
          notifyCLIError('Kilo', `CLI --agent ${mode} command failed (CWD: ${cwd})`, error.message);
          resolve({ success: false, error: error.message, stdout, stderr });
        } else {
          logger.info(`🎉 [Kilo Agent: ${mode}] Execution completed successfully.`);
          resolve({ success: true, stdout, stderr });
        }
      });
    });
  }

  /**
   * Generate code via Groq AI API for repair/fallback (real AI, not templates)
   */
  async generateWithGroqAPI(prompt) {
    if (!this.groqKey) {
      logger.warn(`⚠️ [Kilo Agent] GROQ_API_KEY not set.`);
      return null;
    }

    logger.info(`🧠 [Kilo Agent] Generating code via Groq AI API...`);
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
          temperature: 0.5
        })
      });

      if (!response.ok) {
        logger.error(`❌ [Kilo Agent] Groq API error HTTP ${response.status}`);
        notifyCLIError('Kilo (Groq API)', `HTTP ${response.status} error`, 'API request failed');
        return null;
      }

      const data = await response.json();
      let code = data.choices?.[0]?.message?.content || '';

      if (code.includes('```html')) {
        code = code.split('```html')[1].split('```')[0].trim();
      } else if (code.includes('```')) {
        code = code.split('```')[1].split('```')[0].trim();
      }

      if (code.includes('<!DOCTYPE html>') || code.includes('<!doctype html>')) {
        logger.info(`✅ [Kilo Agent] Groq AI generated ${code.length} bytes of repair code.`);
        return code;
      }
      return null;
    } catch (err) {
      logger.error(`❌ [Kilo Agent] Groq API call failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Run QA tests on HTML content (replaces PaperclipAgent.runAgileQATests)
   */
  async runTests(htmlContent, project) {
    logger.info(`🧪 [Kilo Agent] Running QA tests for "${project.title}"...`);

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
          new vm.Script(jsCode);
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
    logger.info(`🧪 [Kilo Agent] Tests ${testResults.passed ? 'PASSED' : 'FAILED'}: ${JSON.stringify(testResults)}`);
    return testResults;
  }

  /**
   * Fallback Full-Stack Website Generator (Kilo Code)
   * Uses CLI first, then Groq AI API. NEVER hardcoded templates.
   */
  async generateWebsite(project, targetDir) {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    await notifyStageStart('Kilo', 3, 'Component Generation (Fallback)');

    // Strategy 1: Use Kilo CLI on the deployed server
    if (this.isAvailable) {
      logger.info(`⚡ [Kilo Agent] Using Kilo CLI (${this.model} --agent code) for code generation...`);
      const prompt = `Build a complete, production-ready, responsive single-page web application for "${project.title}" (${project.category}). ` +
                     `Generate a single index.html file with inline CSS (dark glassmorphism design) and inline JavaScript (real interactive functionality). ` +
                     `Include ad container divs #ad-slot-top and #ad-slot-bottom. Include SEO meta tags and JSON-LD schema. ` +
                     `Use Google Fonts. Make it mobile responsive. Return only valid HTML.`;

      const res = await this.runCommand(prompt, targetDir, 'code');
      const indexPath = path.join(targetDir, 'index.html');
      if (res.success && fs.existsSync(indexPath)) {
        const htmlContent = fs.readFileSync(indexPath, 'utf8');
        if (htmlContent.includes('<!DOCTYPE html>') || htmlContent.includes('<!doctype html>')) {
          logger.info(`✅ [Kilo Agent] CLI generated real code: ${htmlContent.length} bytes`);
          await notifyStageComplete('Kilo', 3, 'Component Generation (Fallback)', `Generated ${htmlContent.length} bytes via CLI`);
          return { success: true, htmlContent, source: 'kilo-cli' };
        }
      }
      logger.warn(`⚠️ [Kilo Agent] CLI did not produce valid index.html. Falling back to Groq AI API...`);
      await notifyAgentFallback('Kilo CLI', 'Kilo Groq API', 'CLI did not produce valid index.html');
    }

    // Strategy 2: Use Groq AI API
    const groqPrompt = `Build a production-ready single-page web app for "${project.title}" (${project.category}). Single index.html with inline CSS/JS. Dark glassmorphism UI. Google Fonts. REAL interactive JS. Ad divs #ad-slot-top, #ad-slot-bottom. SEO meta tags. Mobile responsive. Return ONLY raw HTML starting with <!DOCTYPE html>. No markdown.`;

    const groqCode = await this.generateWithGroqAPI(groqPrompt);
    if (groqCode) {
      const indexPath = path.join(targetDir, 'index.html');
      fs.writeFileSync(indexPath, groqCode, 'utf8');
      await notifyStageComplete('Kilo', 3, 'Component Generation (Fallback)', `Generated ${groqCode.length} bytes via Groq API`);
      return { success: true, htmlContent: groqCode, source: 'groq-api' };
    }

    logger.error(`❌ [Kilo Agent] All code generation strategies failed for "${project.title}".`);
    await notifyStageFailure('Kilo', 3, 'Component Generation (Fallback)', 'All code generation strategies failed', 'No more fallbacks available');
    return { success: false, htmlContent: null };
  }

  /**
   * Systematic Debugging & Error Repair Mode
   * Uses Kilo CLI --agent debug first, then Groq AI API for repair. NEVER hardcoded templates.
   */
  async repairBrokenCode(targetDir, htmlContent, errorLogs) {
    logger.info(`🛠️ [Kilo Agent Debug Mode] Diagnosing and fixing errors...`, { errors: errorLogs });

    await notifyStageStart('Kilo', 4, 'Sandbox Execution & Self-Correction (Debug Mode)');

    // Strategy 1: Use Kilo CLI debug mode on deployed server
    if (this.isAvailable) {
      logger.info(`⚡ [Kilo Agent] Running debug mode via CLI...`);
      const prompt = `Debug and fix these build errors in index.html: ${errorLogs.join('; ')}. Fix all JavaScript syntax errors, missing HTML tags, and CSS issues. Save the fixed code to index.html.`;
      await this.runCommand(prompt, targetDir, 'debug', 60000);
      const indexPath = path.join(targetDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        const fixedCode = fs.readFileSync(indexPath, 'utf8');
        if (fixedCode.includes('<!DOCTYPE html>') || fixedCode.includes('<!doctype html>')) {
          logger.info(`✅ [Kilo Agent Debug] CLI repaired code: ${fixedCode.length} bytes`);
          await notifyStageComplete('Kilo', 4, 'Sandbox Execution & Self-Correction (Debug Mode)', `Repaired ${fixedCode.length} bytes via CLI`);
          return fixedCode;
        }
      }
    }

    // Strategy 2: Use Groq AI API to repair
    const repairPrompt = `Fix these errors in a web app HTML file: ${errorLogs.join('; ')}. Return the COMPLETE corrected HTML starting with <!DOCTYPE html>. No markdown backticks. Raw HTML only. Here is the broken code (first 4000 chars): ${(htmlContent || '').substring(0, 4000)}`;

    const repairedCode = await this.generateWithGroqAPI(repairPrompt);
    if (repairedCode) {
      const indexPath = path.join(targetDir, 'index.html');
      fs.writeFileSync(indexPath, repairedCode, 'utf8');
      await notifyStageComplete('Kilo', 4, 'Sandbox Execution & Self-Correction (Debug Mode)', `Repaired ${repairedCode.length} bytes via Groq API`);
      return repairedCode;
    }

    // If all repair fails, return original code (don't substitute with template)
    logger.warn(`⚠️ [Kilo Agent Debug] All repair strategies exhausted. Returning original code.`);
    await notifyStageFailure('Kilo', 4, 'Sandbox Execution & Self-Correction (Debug Mode)', 'All repair strategies exhausted', 'Returning original code');
    return htmlContent;
  }

  /**
   * Post-Deployment Live Verification Check (Kilo Agent)
   */
  async verifyDeployedWebsite(liveUrl, targetDir) {
    logger.info(`🔍 [Kilo Agent Audit] Auditing live deployed Render site: ${liveUrl}...`);
    try {
      const res = await fetch(liveUrl);
      const isLive = res.ok;
      logger.info(`${isLive ? '✅' : '⚠️'} [Kilo Agent Audit] Live Render Site Check: HTTP ${res.status} (${isLive ? 'PASSED' : 'FAILED'})`);

      if (this.isAvailable && isLive) {
        await this.runCommand(`Audit live deployed site at ${liveUrl}. Verify layout, JavaScript execution, and mobile responsiveness.`, targetDir, 'ask', 40000);
      }
      return { success: isLive, status: res.status, liveUrl };
    } catch (err) {
      logger.error(`❌ [Kilo Agent Audit] Live URL verification failed: ${err.message}`);
      return { success: false, error: err.message, liveUrl };
    }
  }
}

module.exports = KiloAgent;
