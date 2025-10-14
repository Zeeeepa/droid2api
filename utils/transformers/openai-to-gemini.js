/**
 * OpenAI to Gemini Format Transformer
 * Converts OpenAI API format responses to Gemini format
 */

import { logDebug } from '../../logger.js';

/**
 * Transform OpenAI format response to Gemini format
 * @param {Object} openaiResponse - Response in OpenAI API format
 * @returns {Object} Response in Gemini API format
 */
export function openaiToGemini(openaiResponse) {
  logDebug('Converting OpenAI response to Gemini format');
  
  const choice = openaiResponse.choices?.[0];
  const content = choice?.message?.content || '';
  const finishReason = choice?.finish_reason || 'STOP';

  const finishReasonMap = {
    'stop': 'STOP',
    'length': 'MAX_TOKENS',
    'content_filter': 'SAFETY',
    'tool_calls': 'STOP'
  };

  return {
    candidates: [{
      content: {
        parts: [{ text: content }],
        role: 'model'
      },
      finishReason: finishReasonMap[finishReason] || 'STOP',
      index: 0,
      safetyRatings: []
    }],
    usageMetadata: {
      promptTokenCount: openaiResponse.usage?.prompt_tokens || 0,
      candidatesTokenCount: openaiResponse.usage?.completion_tokens || 0,
      totalTokenCount: openaiResponse.usage?.total_tokens || 0
    }
  };
}

