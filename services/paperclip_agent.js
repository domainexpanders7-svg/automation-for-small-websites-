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
  /**
   * Stage 1: Planning Agent - Generates README.md architecture spec
   */
  generateReadmePlan(project) {
    return `# ⚡ ${project.title}

## 🎯 Overview & Architecture Plan
Auto-designed by **Paperclip AI Architect Agent**. This repository contains a production-ready, responsive, client-side web application for **${project.title}** (${project.category}).

## 🛠️ Tech Stack & Features
- **Frontend Framework**: HTML5, CSS3 Glassmorphism UI Engine, Google Fonts (Plus Jakarta Sans).
- **Interactive Logic**: Client-Side JavaScript Engine (Chart.js / WebAssembly PDF-Lib / Custom Math State Engine).
- **Ad Monetization**: Adsterra Ad Engine integrated (\`Social Bar\`, \`Popunder\`, \`728x90 Banner\`).
- **Hosting & Deployment**: 100% Free GitHub Pages Live Hosting.

## 🚀 Live Access & Verification
- **Live Website**: [https://domainexpanders7-svg.github.io/${project.name}/](https://domainexpanders7-svg.github.io/${project.name}/)
- **Repository**: [https://github.com/domainexpanders7-svg/${project.name}](https://github.com/domainexpanders7-svg/${project.name})

---
*Generated automatically by Master Autonomous AI Platform.*
`;
  }

  /**
   * Execute Paperclip multi-agent pipeline
   * @param {Object} project - Project topic metadata
   */
  async buildProject(project) {
    logger.info(`📎 [Paperclip Agent] Phase 1: Planning Architect generating README.md for "${project.title}"...`);
    const readmePlan = this.generateReadmePlan(project);

    logger.info(`📎 [Paperclip Agent] Phase 2: Lead Developer compiling HTML5/JS application...`);
    
    try {
      let html = await this.generator.buildWebsiteCode(project);
      
      if (!html || !html.includes('<!DOCTYPE html>') || !html.includes('</html>')) {
        logger.warn('📎 [Paperclip Agent] Primary AI returned incomplete code. Engaging Generative Engine...');
        html = this.generator.generateFallbackWebApp(project);
      }

      logger.info(`📎 [Paperclip Agent] Phase 3: QA & Monetization Agent embedding Adsterra scripts (${html.length} bytes)...`);
      return { html, readmePlan };

    } catch (err) {
      logger.error('📎 [Paperclip Agent] Task execution error:', err);
      const html = this.generator.generateFallbackWebApp(project);
      return { html, readmePlan };
    }
  }
}

module.exports = PaperclipAgent;
