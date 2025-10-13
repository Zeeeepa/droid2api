/**
 * Anthropic to OpenAI Format Transformer
 * Converts Anthropic API format requests to OpenAI format for internal processing
 */

import { logDebug } from '../../logger.js';

/**
 * Transform Anthropic format request to OpenAI format
 * @param {Object} anthropicRequest - Request in Anthropic API format
 * @returns {Object} Request in OpenAI API format
 */
export function anthropicToOpenAI(anthropicRequest) {
  logDebug('Converting Anthropic request to OpenAI format');
  
  const openaiRequest = {
    model: anthropicRequest.model || 'claude-sonnet-4',
    messages: anthropicRequest.messages || [],
    stream: anthropicRequest.stream || false
  };

  // Add system message if present
  if (anthropicRequest.system) {
    openaiRequest.messages.unshift({
      role: 'system',
      content: anthropicRequest.system
    });
  }

  // Map parameters
  if (anthropicRequest.max_tokens) openaiRequest.max_tokens = anthropicRequest.max_tokens;
  if (anthropicRequest.temperature !== undefined) openaiRequest.temperature = anthropicRequest.temperature;
  if (anthropicRequest.top_p !== undefined) openaiRequest.top_p = anthropicRequest.top_p;
  if (anthropicRequest.stop_sequences) openaiRequest.stop = anthropicRequest.stop_sequences;

  return openaiRequest;
}

