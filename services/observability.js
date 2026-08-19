/**
 * OpenObserve Telemetry & Logger Service
 * Integrates with OpenObserve (https://github.com/openobserve/openobserve)
 * Ships structured logs, metrics, tracebacks, and execution events via OpenObserve HTTP Ingestion API.
 */

const fs = require('fs');
const path = require('path');

// Default Configuration from Environment Variables
const CONFIG = {
  url: process.env.OPENOBSERVE_URL || 'http://localhost:5080',
  organization: process.env.OPENOBSERVE_ORG || 'default',
  stream: process.env.OPENOBSERVE_STREAM || 'website_builder_logs',
  auth: process.env.OPENOBSERVE_AUTH || '', // Base64 encoded Basic Auth credentials (user:pass)
  enabled: process.env.OPENOBSERVE_ENABLED === 'true'
};

/**
 * Sends a batch of log records to OpenObserve Ingestion API
 * @param {Array<Object>} logEntries 
 */
async function sendToOpenObserve(logEntries) {
  if (!CONFIG.enabled || !CONFIG.auth) {
    // Fallback: Console output if OpenObserve is not configured
    return;
  }

  const endpoint = `${CONFIG.url.replace(/\/$/, '')}/api/${CONFIG.organization}/${CONFIG.stream}/_json`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${CONFIG.auth}`
      },
      body: JSON.stringify(logEntries)
    });

    if (!response.ok) {
      console.warn(`[OpenObserve] Failed to push logs: HTTP ${response.status}`);
    }
  } catch (err) {
    console.error(`[OpenObserve] Error shipping telemetry: ${err.message}`);
  }
}

/**
 * Main Logger API
 */
class Logger {
  constructor(serviceName = 'website-builder-engine') {
    this.serviceName = serviceName;
  }

  formatEntry(level, message, metadata = {}) {
    return {
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      level: level.toUpperCase(),
      message,
      ...metadata
    };
  }

  log(level, message, metadata = {}) {
    const entry = this.formatEntry(level, message, metadata);
    console.log(`[${entry.timestamp}] [${entry.level}] ${message}`, metadata ? JSON.stringify(metadata) : '');
    sendToOpenObserve([entry]);
    return entry;
  }

  info(message, metadata) {
    return this.log('INFO', message, metadata);
  }

  warn(message, metadata) {
    return this.log('WARN', message, metadata);
  }

  error(message, errorObject, metadata = {}) {
    const errMeta = {
      ...metadata,
      error_name: errorObject?.name || 'Error',
      error_message: errorObject?.message || String(errorObject),
      stack_trace: errorObject?.stack || ''
    };
    return this.log('ERROR', message, errMeta);
  }

  metric(metricName, value, unit = 'count', tags = {}) {
    const metricEntry = this.formatEntry('METRIC', `Metric: ${metricName}`, {
      metric_name: metricName,
      metric_value: value,
      metric_unit: unit,
      tags
    });
    console.log(`[METRIC] ${metricName} = ${value} ${unit}`);
    sendToOpenObserve([metricEntry]);
    return metricEntry;
  }
}

module.exports = {
  Logger,
  logger: new Logger()
};
