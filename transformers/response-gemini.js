import { logDebug } from '../logger.js';

export class GeminiResponseTransformer {
  constructor(model, requestId) {
    this.model = model;
    this.requestId = requestId || `chatcmpl-${Date.now()}`;
    this.created = Math.floor(Date.now() / 1000);
    this.usage = null;
  }

  // Transform non-streaming Gemini response to OpenAI format
  transformResponse(geminiResponse) {
    logDebug('Transforming Gemini non-streaming response');
    
    const candidate = geminiResponse.candidates?.[0];
    if (!candidate) {
      throw new Error('No candidates in Gemini response');
    }

    const content = this.extractTextFromParts(candidate.content?.parts);
    const finishReason = this.mapFinishReason(candidate.finishReason);

    const openaiResponse = {
      id: this.requestId,
      object: 'chat.completion',
      created: this.created,
      model: this.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: content
        },
        finish_reason: finishReason
      }]
    };

    // Add usage metadata if present
    if (geminiResponse.usageMetadata) {
      openaiResponse.usage = {
        prompt_tokens: geminiResponse.usageMetadata.promptTokenCount || 0,
        completion_tokens: geminiResponse.usageMetadata.candidatesTokenCount || 0,
        total_tokens: geminiResponse.usageMetadata.totalTokenCount || 0
      };
    }

    return openaiResponse;
  }

  // Parse Gemini SSE chunks (each chunk is complete JSON)
  parseChunk(chunkText) {
    try {
      return JSON.parse(chunkText);
    } catch (e) {
      logDebug('Failed to parse Gemini chunk', e);
      return null;
    }
  }

  // Transform streaming chunk to OpenAI format
  transformStreamChunk(geminiChunk, isFirst = false) {
    const candidate = geminiChunk.candidates?.[0];
    if (!candidate) {
      return null;
    }

    const chunk = {
      id: this.requestId,
      object: 'chat.completion.chunk',
      created: this.created,
      model: this.model,
      choices: [{
        index: 0,
        delta: {},
        finish_reason: null
      }]
    };

    // First chunk includes role
    if (isFirst && !this.roleSet) {
      chunk.choices[0].delta.role = 'assistant';
      this.roleSet = true;
    }

    // Extract text content from parts
    const text = this.extractTextFromParts(candidate.content?.parts);
    if (text) {
      chunk.choices[0].delta.content = text;
    }

    // Handle finish reason
    if (candidate.finishReason) {
      chunk.choices[0].finish_reason = this.mapFinishReason(candidate.finishReason);
    }

    // Store usage metadata if present
    if (geminiChunk.usageMetadata) {
      this.usage = {
        prompt_tokens: geminiChunk.usageMetadata.promptTokenCount || 0,
        completion_tokens: geminiChunk.usageMetadata.candidatesTokenCount || 0,
        total_tokens: geminiChunk.usageMetadata.totalTokenCount || 0
      };
    }

    return `data: ${JSON.stringify(chunk)}\n\n`;
  }

  extractTextFromParts(parts) {
    if (!parts || !Array.isArray(parts)) return '';
    
    return parts.map(part => {
      if (part.text) {
        return part.text;
      }
      if (part.functionCall) {
        // Format function call as text for compatibility
        return JSON.stringify({
          function_call: {
            name: part.functionCall.name,
            arguments: JSON.stringify(part.functionCall.args)
          }
        });
      }
      return '';
    }).join('');
  }

  mapFinishReason(geminiReason) {
    const reasonMap = {
      'STOP': 'stop',
      'MAX_TOKENS': 'length',
      'SAFETY': 'content_filter',
      'RECITATION': 'content_filter',
      'OTHER': null
    };
    return reasonMap[geminiReason] || null;
  }

  createDoneSignal() {
    let doneMessage = 'data: [DONE]\n\n';
    
    // Optionally include usage in final chunk before [DONE]
    if (this.usage) {
      const usageChunk = {
        id: this.requestId,
        object: 'chat.completion.chunk',
        created: this.created,
        model: this.model,
        choices: [],
        usage: this.usage
      };
      doneMessage = `data: ${JSON.stringify(usageChunk)}\n\n` + doneMessage;
    }
    
    return doneMessage;
  }

  async *transformStream(sourceStream) {
    let buffer = '';
    let isFirst = true;

    try {
      for await (const chunk of sourceStream) {
        const chunkText = chunk.toString();
        buffer += chunkText;

        // Gemini streams JSON objects separated by newlines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          // Remove 'data: ' prefix if present
          let jsonText = line.trim();
          if (jsonText.startsWith('data: ')) {
            jsonText = jsonText.slice(6);
          }

          // Skip [DONE] signals from source
          if (jsonText === '[DONE]') {
            continue;
          }

          const geminiChunk = this.parseChunk(jsonText);
          if (geminiChunk) {
            const transformed = this.transformStreamChunk(geminiChunk, isFirst);
            if (transformed) {
              yield transformed;
              isFirst = false;
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        let jsonText = buffer.trim();
        if (jsonText.startsWith('data: ')) {
          jsonText = jsonText.slice(6);
        }
        if (jsonText !== '[DONE]') {
          const geminiChunk = this.parseChunk(jsonText);
          if (geminiChunk) {
            const transformed = this.transformStreamChunk(geminiChunk, isFirst);
            if (transformed) {
              yield transformed;
            }
          }
        }
      }

      // Send final [DONE] signal
      yield this.createDoneSignal();

    } catch (error) {
      logDebug('Error in Gemini stream transformation', error);
      throw error;
    }
  }
}

// Export function for non-streaming response transformation
export function convertResponseToOpenAI(geminiResponse, model, requestId) {
  const transformer = new GeminiResponseTransformer(model, requestId);
  return transformer.transformResponse(geminiResponse);
}

