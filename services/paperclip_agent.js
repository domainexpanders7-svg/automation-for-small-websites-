/**
 * Paperclip Autonomous Agent Service
 * Handles multi-agent task execution, prompt synthesis, code generation, and validation.
 */

const AIGenerator = require('./ai_generator');
const { logger } = require('./observability');

class PaperclipAgent {
  constructor() {
    this.generator = new AIGenerator();
  }

  /**
   * Execute Paperclip autonomous website build task
   * @param {Object} project - Project topic metadata
   */
  async buildProject(project) {
    logger.info(`📎 [Paperclip Agent] Starting multi-stage generation for: ${project.title}...`);
    
    const prompt = `You are Paperclip Agent, an expert AI Web Developer.
Build a complete, responsive, single-file HTML5 web tool for: "${project.title}".
Category: ${project.category}

Requirements:
1. Include modern dark mode CSS styling with Google Fonts, glassmorphism card, and smooth hover effects.
2. Include fully working JavaScript logic for user input and real-time generation/calculation.
3. Include Adsterra / Monetag container placeholders: #ad-slot-top and #ad-slot-bottom.
4. Output ONLY clean HTML starting with <!DOCTYPE html>.`;

    try {
      // 1. Try OpenRouter / Gemini / Groq APIs
      const html = await this.generator.buildWebsiteCode(project);
      
      // 2. Validate HTML Structure
      if (html && html.includes('<!DOCTYPE html>') && html.includes('</html>')) {
        logger.info(`📎 [Paperclip Agent] Successfully compiled HTML code (${html.length} bytes)`);
        return html;
      }

      logger.warn('📎 [Paperclip Agent] Primary AI returned incomplete code. Engaging Paperclip Generative Fallback...');
      return this.generator.generateFallbackWebApp(project);

    } catch (err) {
      logger.error('📎 [Paperclip Agent] Task execution error:', err);
      return this.generator.generateFallbackWebApp(project);
    }
  }
}

module.exports = PaperclipAgent;
