/**
 * OpenAI to Anthropic Format Transformer
 * Converts OpenAI API format responses to Anthropic format
 */

import { logDebug } from '../../logger.js';

/**
 * Transform OpenAI format response to Anthropic format
 * @param {Object} openaiResponse - Response in OpenAI API format
 * @returns {Object} Response in Anthropic API format
 */
export function openaiToAnthropic(openaiResponse) {
  logDebug('Converting OpenAI response to Anthropic format');
  
  const choice = openaiResponse.choices?.[0];
  const content = choice?.message?.content || '';
  const stopReason = choice?.finish_reason || 'end_turn';

  const stopReasonMap = {
    'stop': 'end_turn',
    'length': 'max_tokens',
    'content_filter': 'stop_sequence',
    'tool_calls': 'tool_use'
  };

  return {
    id: openaiResponse.id || `msg_${Date.now()}`,
    type: 'message',
    role: 'assistant',
    content: [{
      type: 'text',
      text: content
    }],
    model: openaiResponse.model || 'claude-sonnet-4',
    stop_reason: stopReasonMap[stopReason] || 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: openaiResponse.usage?.prompt_tokens || 0,
      output_tokens: openaiResponse.usage?.completion_tokens || 0
    }
  };
}

