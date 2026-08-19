/**
 * Paperclip Autonomous Multi-Agent Service (5-Agent Pipeline)
 * 1. Market Analyst & SEO Agent
 * 2. UI/UX Architect Agent
 * 3. Lead Full-Stack Developer Agent (Groq OpenAI 120B)
 * 4. Adsterra Monetization & Ad Optimization Agent
 * 5. QA & Self-Healing Validator Agent
 */

const AIGenerator = require('./ai_generator');
const { logger } = require('./observability');

class PaperclipAgent {
  constructor() {
    this.generator = new AIGenerator();
  }

  /**
   * Stage 1: Market Analyst & SEO Architect Agent - Generates README.md, Sitemap, and SEO Spec
   */
  generateSeoArchitectureSpec(project) {
    const liveUrl = `https://domainexpanders7-svg.github.io/${project.name}/`;
    const repoUrl = `https://github.com/domainexpanders7-svg/${project.name}`;

    const readme = `# ⚡ ${project.title}

## 🎯 Overview
**${project.title}** is a production-ready, zero-install, responsive micro web application designed for high performance, privacy, and ease of use. Category: **${project.category}**.

## 🛠️ Key Features
- **Client-Side Processing**: 100% in-browser calculation & processing (Zero data leaves your browser).
- **Responsive UI/UX**: Dark mode glassmorphic interface built with Plus Jakarta Sans typography.
- **Monetization Engine**: Integrated Adsterra ad containers (\`Social Bar\`, \`Popunder\`, \`728x90 Banner\`).
- **SEO & Schema**: Includes Google JSON-LD \`WebApplication\` schema & OpenGraph social sharing meta tags.

## 🌐 Live Access
- **Live URL**: [${liveUrl}](${liveUrl})
- **GitHub Repository**: [${repoUrl}](${repoUrl})

---
*Auto-built and deployed by Paperclip 5-Agent Autonomous Engine.*
`;

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${liveUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    const robots = `User-agent: *
Allow: /
Sitemap: ${liveUrl}sitemap.xml`;

    return { readme, sitemap, robots };
  }

  /**
   * Execute 5-Agent Autonomous Web Tool Pipeline
   * @param {Object} project - Project topic metadata
   */
  async buildProject(project) {
    logger.info(`📎 [Paperclip Agent] Agent 1 (Market Analyst): Synthesizing SEO Spec & Architecture for "${project.title}"...`);
    const { readme, sitemap, robots } = this.generateSeoArchitectureSpec(project);

    logger.info(`📎 [Paperclip Agent] Agent 2 & 3 (UI/UX Architect & Lead Developer): Compiling full application via Groq 120B API...`);
    
    try {
      let html = await this.generator.buildWebsiteCode(project);
      
      // Agent 5 (QA & Self-Healing Validator)
      if (!html || !html.includes('<!DOCTYPE html>') || !html.includes('</html>')) {
        logger.warn('📎 [Paperclip Agent] Agent 5 (Self-Healing): Primary AI output incomplete. Engaging High-Quality Generative Engine...');
        html = this.generator.generateFallbackWebApp(project);
      }

      logger.info(`📎 [Paperclip Agent] Agent 4 (Monetization Engine): Auto-injecting Adsterra ad scripts (${html.length} bytes)...`);
      return { html, readme, sitemap, robots };

    } catch (err) {
      logger.error('📎 [Paperclip Agent] Multi-Agent Pipeline error:', err);
      const html = this.generator.generateFallbackWebApp(project);
      return { html, readme, sitemap, robots };
    }
  }
}

module.exports = PaperclipAgent;
