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
   * Agent 1: ChatGPT Architectural Planner - Generates ARCHITECTURE.md & README.md
   */
  generateArchitecturePlan(project) {
    const liveUrl = `https://domainexpanders7-svg.github.io/${project.name}/`;
    const repoUrl = `https://github.com/domainexpanders7-svg/${project.name}`;

    const architecture = `# 🏛️ Architecture Specification: ${project.title}

## 🎯 System Goals & Component Breakdown
Auto-architected by **Paperclip AI Planner Agent**.

### 🧩 Component Hierarchy:
- \`index.html\`: HTML5 Entry point, Google Fonts, Adsterra scripts, JSON-LD Schema & OpenGraph Meta.
- \`src/components/Header.jsx\`: Glassmorphism Sticky Navigation & Status Badge.
- \`src/components/MainEngine.jsx\`: Main Interactive Calculation / Processing Engine & LocalStorage state manager.
- \`src/components/AdBanner.jsx\`: High-CTR Adsterra Monetization slots.
- \`src/styles/globals.css\`: Design System, HSL Color Palette, Animations, Glassmorphism backdrop filters.
- \`package.json\`: Project manifest & scripts.

## 📡 Micro-Services & External Libraries
- **Charts Engine**: Chart.js CDN (Interactive Doughnut / Line charts).
- **PDF Engine**: PDF-Lib WebAssembly (Client-side PDF merging & compression).
- **Monetization**: Adsterra Ad Engine (\`Social Bar\`, \`Popunder\`, \`728x90 Banner\`).
`;

    const readme = `# ⚡ ${project.title}

## 🎯 Overview
**${project.title}** is a production-ready, multi-file full-stack web application built for high performance, mobile responsiveness, and privacy (${project.category}).

## 🌐 Live Links
- **Live Site**: [${liveUrl}](${liveUrl})
- **GitHub Repository**: [${repoUrl}](${repoUrl})

---
*Architected and deployed by Master 4-Agent Autonomous AI Platform.*
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

    return { architecture, readme, sitemap, robots };
  }

  /**
   * Execute 4-Agent Full-Stack Pipeline
   * @param {Object} project - Project topic metadata
   */
  async buildProject(project) {
    logger.info(`🧠 Agent 1 (ChatGPT Planner): Generating ARCHITECTURE.md & README.md for "${project.title}"...`);
    const { architecture, readme, sitemap, robots } = this.generateArchitecturePlan(project);

    logger.info(`⚛️ Agent 3 (Full-Stack Multi-File Developer): Compiling modular web application via Groq 120B API...`);
    
    try {
      let html = await this.generator.buildWebsiteCode(project);
      
      if (!html || !html.includes('<!DOCTYPE html>') || !html.includes('</html>')) {
        logger.warn('⚠️ Agent 3: Primary AI returned incomplete code. Engaging Generative Fallback Engine...');
        html = this.generator.generateFallbackWebApp(project);
      }

      logger.info(`💰 Agent 4 (Monetization & Deployment Agent): Auto-injecting Adsterra ad scripts (${html.length} bytes)...`);
      return { html, architecture, readme, sitemap, robots };

    } catch (err) {
      logger.error('❌ Multi-Agent Pipeline error:', err);
      const html = this.generator.generateFallbackWebApp(project);
      return { html, architecture, readme, sitemap, robots };
    }
  }
}

module.exports = PaperclipAgent;
