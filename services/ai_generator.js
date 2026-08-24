/**
 * AI Generator Utility
 * 
 * DEPRECATED: This module is NO LONGER used for website code generation.
 * All code generation is performed EXCLUSIVELY by OpenCode and Kilo agents.
 * 
 * This file is retained ONLY as a utility for:
 * - Direct Groq API calls when agents need AI assistance
 * - Generic AI prompt helpers
 * 
 * ALL hardcoded templates have been removed per project constraints.
 * No pre-existing templates. No external codebase imports for generation.
 */

const { logger } = require('./observability');

class AIGenerator {
  constructor() {
    this.geminiKey = process.env.GEMINI_API_KEY || '';
    this.groqKey = process.env.GROQ_API_KEY || '';
    this.openrouterKey = process.env.OPENROUTER_API_KEY || '';
    logger.info('⚠️ [AIGenerator] Initialized in DEPRECATED mode. Do not use for website generation.');
  }

  /**
   * Call Groq API for generic AI completion (used by agents as internal fallback)
   */
  async generateWithGroq(prompt, model = 'openai/gpt-oss-20b', maxTokens = 4000) {
    if (!this.groqKey) {
      logger.warn('⚠️ [AIGenerator] GROQ_API_KEY not set.');
      return null;
    }

    logger.info(`🧠 [AIGenerator] Calling Groq API (${model})...`);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        logger.error(`❌ [AIGenerator] Groq API error HTTP ${response.status}`);
        return null;
      }

      const data = await response.json();
      const generatedText = data.choices?.[0]?.message?.content || '';
      return generatedText;
    } catch (err) {
      logger.error(`❌ [AIGenerator] Groq API call failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Helper to clean markdown backticks from AI output
   */
  extractHtml(text) {
    let clean = text.trim();
    if (clean.includes('```html')) {
      clean = clean.split('```html')[1].split('```')[0].trim();
    } else if (clean.includes('```')) {
      clean = clean.split('```')[1].split('```')[0].trim();
    }
    return clean;
  }

  /**
   * Get CLI command specs for reference
   */
  getAgentCLICommandsSpec() {
    return {
      opencode: {
        defaultModel: 'opencode/big-pickle',
        command: 'opencode run -m opencode/big-pickle "<prompt>"',
        debug: 'opencode debug',
        useCase: 'Primary full-stack website development & initial scaffolding'
      },
      kilo: {
        defaultModel: 'autofree',
        command: 'kilo run -m autofree "<prompt>"',
        audit: 'kilo audit',
        useCase: 'Secondary fallback website development, repository refactoring, & QA error repair loop'
      }
    };
  }
}

module.exports = AIGenerator;
