import { logDebug } from '../logger.js';
import { getSystemPrompt, getUserAgent } from '../config.js';

/**
 * Transform Gemini API request to OpenAI format
 * Used internally before routing to other transformers
 */
export function geminiToOpenAI(geminiRequest) {
  logDebug('Transforming Gemini request to OpenAI format');
  
  const openaiRequest = {
    model: geminiRequest.model || 'claude-sonnet-4-20250514',
    messages: [],
    stream: geminiRequest.generationConfig?.stream || false
  };

  // Convert Gemini contents to OpenAI messages
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
            // Convert inline data to image_url format
            message.content.push({
              type: 'image_url',
              image_url: {
                url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
              }
            });
          } else if (part.fileData) {
            // Handle file data references
            message.content.push({
              type: 'image_url',
              image_url: {
                url: part.fileData.fileUri
              }
            });
          }
        });
      }

      // Convert to string if only one text part
      if (message.content.length === 1 && message.content[0].type === 'text') {
        message.content = message.content[0].text;
      }

      openaiRequest.messages.push(message);
    });
  }

  // System instruction → system message
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
      openaiRequest.messages.unshift({
        role: 'system',
        content: systemText
      });
    }
  }

  // Generation config → OpenAI parameters
  if (geminiRequest.generationConfig) {
    const config = geminiRequest.generationConfig;
    
    if (config.maxOutputTokens) {
      openaiRequest.max_tokens = config.maxOutputTokens;
    }
    if (config.temperature !== undefined) {
      openaiRequest.temperature = config.temperature;
    }
    if (config.topP !== undefined) {
      openaiRequest.top_p = config.topP;
    }
    if (config.topK !== undefined) {
      // OpenAI doesn't have topK, but we can note it
      logDebug(`Gemini topK=${config.topK} cannot be mapped to OpenAI`);
    }
    if (config.stopSequences && Array.isArray(config.stopSequences)) {
      openaiRequest.stop = config.stopSequences;
    }
  }

  // Tools/function calling
  if (geminiRequest.tools && Array.isArray(geminiRequest.tools)) {
    openaiRequest.tools = [];
    geminiRequest.tools.forEach(toolSet => {
      if (toolSet.functionDeclarations) {
        toolSet.functionDeclarations.forEach(func => {
          openaiRequest.tools.push({
            type: 'function',
            function: {
              name: func.name,
              description: func.description || '',
              parameters: func.parameters || {}
            }
          });
        });
      }
    });
  }

  logDebug('Gemini → OpenAI conversion complete', openaiRequest);
  return openaiRequest;
}

/**
 * Transform OpenAI response back to Gemini format
 */
export function openaiToGemini(openaiResponse, isStreaming = false) {
  if (isStreaming) {
    // For streaming, we need to handle SSE chunks
    // Return as-is and handle in streaming processor
    return openaiResponse;
  }

  logDebug('Transforming OpenAI response to Gemini format');

  // Extract content from OpenAI response
  const choice = openaiResponse.choices?.[0];
  const content = choice?.message?.content || '';
  const finishReason = choice?.finish_reason || 'STOP';

  // Map finish reasons
  const finishReasonMap = {
    'stop': 'STOP',
    'length': 'MAX_TOKENS',
    'content_filter': 'SAFETY',
    'tool_calls': 'STOP',
    'function_call': 'STOP'
  };

  const geminiResponse = {
    candidates: [{
      content: {
        parts: [{
          text: content
        }],
        role: 'model'
      },
      finishReason: finishReasonMap[finishReason] || 'STOP',
      index: 0,
      safetyRatings: [] // Empty for now
    }],
    usageMetadata: {
      promptTokenCount: openaiResponse.usage?.prompt_tokens || 0,
      candidatesTokenCount: openaiResponse.usage?.completion_tokens || 0,
      totalTokenCount: openaiResponse.usage?.total_tokens || 0
    }
  };

  // Handle tool calls if present
  if (choice?.message?.tool_calls) {
    geminiResponse.candidates[0].content.parts = choice.message.tool_calls.map(tc => ({
      functionCall: {
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments || '{}')
      }
    }));
  }

  logDebug('OpenAI → Gemini conversion complete');
  return geminiResponse;
}

/**
 * Get headers for Gemini API format
 * (Not actually used since we convert to OpenAI internally)
 */
export function getGeminiHeaders(authHeader, clientHeaders = {}) {
  return {
    'Content-Type': 'application/json',
    'x-goog-api-key': authHeader?.replace('Bearer ', '') || '',
    'user-agent': getUserAgent()
  };
}

