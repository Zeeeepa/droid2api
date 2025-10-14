/**
 * Gemini to OpenAI Format Transformer
 * Converts Gemini API format requests to OpenAI format for internal processing
 */

import { logDebug } from '../../logger.js';

/**
 * Transform Gemini format request to OpenAI format
 * @param {Object} geminiRequest - Request in Gemini API format
 * @returns {Object} Request in OpenAI API format
 */
export function geminiToOpenAI(geminiRequest) {
  logDebug('Converting Gemini request to OpenAI format');
  
  const openaiRequest = {
    model: geminiRequest.model || 'claude-sonnet-4',
    messages: [],
    stream: geminiRequest.generationConfig?.stream || false
  };

  // Handle system instruction
  if (geminiRequest.systemInstruction) {
    let systemText = '';
    if (typeof geminiRequest.systemInstruction === 'string') {
      systemText = geminiRequest.systemInstruction;
    } else if (geminiRequest.systemInstruction.parts) {
      systemText = geminiRequest.systemInstruction.parts
        .filter(p => p.text)
        .map(p => p.text)
        .join('\n');
    }
    
    if (systemText) {
      openaiRequest.messages.push({
        role: 'system',
        content: systemText
      });
    }
  }

  // Convert contents to messages
  if (geminiRequest.contents && Array.isArray(geminiRequest.contents)) {
    geminiRequest.contents.forEach(content => {
      const message = {
        role: content.role === 'model' ? 'assistant' : 'user',
        content: []
      };

      if (content.parts && Array.isArray(content.parts)) {
        content.parts.forEach(part => {
          if (part.text) {
            message.content.push({ type: 'text', text: part.text });
          } else if (part.inlineData) {
            message.content.push({
              type: 'image_url',
              image_url: {
                url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
              }
            });
          }
        });
      }

      // Simplify to string if only one text part
      if (message.content.length === 1 && message.content[0].type === 'text') {
        message.content = message.content[0].text;
      }

      openaiRequest.messages.push(message);
    });
  }

  // Map generation config to OpenAI parameters
  if (geminiRequest.generationConfig) {
    const config = geminiRequest.generationConfig;
    if (config.maxOutputTokens) openaiRequest.max_tokens = config.maxOutputTokens;
    if (config.temperature !== undefined) openaiRequest.temperature = config.temperature;
    if (config.topP !== undefined) openaiRequest.top_p = config.topP;
    if (config.stopSequences) openaiRequest.stop = config.stopSequences;
  }

  return openaiRequest;
}

