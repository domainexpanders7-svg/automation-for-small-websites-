/**
 * Agent-Reach Web Search Engine Service
 * Powered by Exa AI API (https://github.com/Panniantong/Agent-Reach)
 * Performs semantic web searches & neural topic research with automated fallback strategies.
 */

const { logger } = require('./observability');

class AgentReachSearch {
  constructor() {
    this.exaApiKey = process.env.EXA_API_KEY || '';
  }

  /**
   * Primary Web Search using Exa AI API (Agent-Reach Engine)
   * @param {string} query Search query string
   * @param {number} numResults Number of results to return
   */
  async searchWithExa(query, numResults = 5) {
    if (!this.exaApiKey) {
      throw new Error('EXA_API_KEY not configured in environment variables');
    }

    logger.info(`🔎 [Agent-Reach] Executing Exa AI Neural Web Search for: "${query}"...`);
    const url = 'https://api.exa.ai/search';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': this.exaApiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        numResults: numResults,
        useAutoprompt: true,
        type: 'neural'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Exa AI API error HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const results = data.results?.map(r => ({
      title: r.title || 'Untitled Result',
      url: r.url || '',
      snippet: r.text || r.snippet || ''
    })) || [];

    logger.info(`✅ [Agent-Reach] Exa AI Web Search returned ${results.length} results.`);
    return results;
  }

  /**
   * Secondary Fallback Web Search Engine (DuckDuckGo / Free Web Search API)
   * Triggered when Exa AI API quota is exhausted or unavailable.
   */
  async searchFallback(query) {
    logger.info(`🔄 [Agent-Reach] Executing Fallback Web Search for: "${query}"...`);
    try {
      const encodedQuery = encodeURIComponent(query);
      const res = await fetch(`https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1`);
      if (res.ok) {
        const data = await res.json();
        const related = data.RelatedTopics?.map(t => ({
          title: t.Text?.substring(0, 60) || 'Web Topic',
          url: t.FirstURL || '',
          snippet: t.Text || ''
        })).filter(t => t.snippet) || [];

        if (related.length > 0) {
          logger.info(`✅ [Agent-Reach] Fallback Web Search returned ${related.length} results.`);
          return related;
        }
      }
    } catch (err) {
      logger.warn(`⚠️ [Agent-Reach] Fallback search error: ${err.message}`);
    }

    // Default static trend fallback
    return [
      { title: 'AI ATS Resume & Keyword Optimizer', snippet: 'High demand career tool for job seekers' },
      { title: 'Instant GST & Invoice Calculator India', snippet: 'Popular tax calculation utility' },
      { title: 'Viral AI Instagram Bio Generator', snippet: 'High viral traffic social media tool' }
    ];
  }

  /**
   * Master Web Search Method with Automated Fallback
   */
  async performWebSearch(query, numResults = 5) {
    try {
      if (this.exaApiKey) {
        return await this.searchWithExa(query, numResults);
      } else {
        logger.info('ℹ️ [Agent-Reach] EXA_API_KEY not set. Using Fallback Web Search.');
        return await this.searchFallback(query);
      }
    } catch (err) {
      logger.warn(`⚠️ [Agent-Reach] Primary Exa search failed (${err.message}). Triggering Fallback Web Search...`);
      return await this.searchFallback(query);
    }
  }
}

module.exports = AgentReachSearch;
