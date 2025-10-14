/**
 * Format Detection Module
 * Detects the API format based on the request path
 */

/**
 * Detect the request format based on the endpoint path
 * @param {Object} req - Express request object
 * @returns {string} Format name: 'openai', 'anthropic', 'gemini', or 'unknown'
 */
export function detectRequestFormat(req) {
  if (req.path === '/v1/chat/completions') {
    return 'openai';
  } else if (req.path === '/v1/messages') {
    return 'anthropic';
  } else if (req.path === '/v1/generateContent') {
    return 'gemini';
  }
  return 'unknown';
}

