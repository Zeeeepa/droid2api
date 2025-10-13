import { logDebug } from '../logger.js';

/**
 * Transform streaming OpenAI response to Gemini format
 */
export class GeminiResponseTransformer {
  constructor(modelId, requestId = null) {
    this.modelId = modelId;
    this.requestId = requestId || `chatcmpl-${Date.now()}`;
    this.buffer = '';
  }

  /**
   * Transform OpenAI SSE stream to Gemini SSE stream
   */
  async *transformStream(responseBody) {
    try {
      for await (const chunk of responseBody) {
        const text = chunk.toString();
        this.buffer += text;

        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;

          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              // End of stream marker - convert to Gemini format
              yield 'data: {"candidates":[{"finishReason":"STOP","index":0}],"usageMetadata":{}}\n\n';
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const geminiChunk = this.convertChunk(parsed);
              
              if (geminiChunk) {
                yield `data: ${JSON.stringify(geminiChunk)}\n\n`;
              }
            } catch (e) {
              logDebug('Failed to parse SSE chunk', e);
            }
          }
        }
      }

      // Process remaining buffer
      if (this.buffer.trim()) {
        const lines = this.buffer.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data && data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data);
                const geminiChunk = this.convertChunk(parsed);
                if (geminiChunk) {
                  yield `data: ${JSON.stringify(geminiChunk)}\n\n`;
                }
              } catch (e) {
                logDebug('Failed to parse final chunk', e);
              }
            }
          }
        }
      }

    } catch (error) {
      logDebug('Stream transformation error', error);
      throw error;
    }
  }

  /**
   * Convert a single OpenAI chunk to Gemini format
   */
  convertChunk(openaiChunk) {
    const delta = openaiChunk.choices?.[0]?.delta;
    const finishReason = openaiChunk.choices?.[0]?.finish_reason;

    if (!delta && !finishReason) {
      return null;
    }

    const geminiChunk = {
      candidates: [{
        content: {
          parts: [],
          role: 'model'
        },
        index: 0
      }]
    };

    // Add content if present
    if (delta?.content) {
      geminiChunk.candidates[0].content.parts.push({
        text: delta.content
      });
    }

    // Add finish reason if present
    if (finishReason) {
      const finishReasonMap = {
        'stop': 'STOP',
        'length': 'MAX_TOKENS',
        'content_filter': 'SAFETY',
        'tool_calls': 'STOP'
      };
      geminiChunk.candidates[0].finishReason = finishReasonMap[finishReason] || 'STOP';
    }

    // Add usage metadata if present
    if (openaiChunk.usage) {
      geminiChunk.usageMetadata = {
        promptTokenCount: openaiChunk.usage.prompt_tokens || 0,
        candidatesTokenCount: openaiChunk.usage.completion_tokens || 0,
        totalTokenCount: openaiChunk.usage.total_tokens || 0
      };
    }

    return geminiChunk;
  }
}

