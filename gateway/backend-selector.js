/**
 * Backend Selection Module
 * Determines which backend to route requests to based on environment configuration
 */

/**
 * Determine which backend to use based on configuration
 * Priority: Claude Code > claude-code-router > config-based
 * @returns {Object} Backend configuration object
 */
export function selectBackend() {
  // Check for Claude Code configuration
  if (process.env.ANTHROPIC_BASE_URL && process.env.ANTHROPIC_AUTH_TOKEN) {
    return {
      type: 'claude-code',
      baseUrl: process.env.ANTHROPIC_BASE_URL,
      apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
      model: process.env.ANTHROPIC_MODEL || 'glm-4.6'
    };
  }
  
  // Check for claude-code-router configuration
  if (process.env.OPENAI_BASE_URL && process.env.OPENAI_API_KEY) {
    return {
      type: 'claude-code-router',
      baseUrl: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'MBZUAI-IFM/K2-Think'
    };
  }
  
  // Fallback to config-based routing
  return {
    type: 'config',
    baseUrl: null,
    apiKey: null,
    model: null
  };
}

