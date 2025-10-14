/**
 * OpenAI Stream to Anthropic Stream Transformer
 * Converts OpenAI SSE stream to Anthropic SSE stream format
 */

import { logDebug } from '../../logger.js';

/**
 * Transform OpenAI SSE stream to Anthropic SSE stream
 * @param {ReadableStream} responseBody - OpenAI stream response body
 * @param {string} messageId - Message ID for the stream
 * @yields {string} Anthropic-formatted SSE chunks
 */
export async function* transformStreamToAnthropic(responseBody, messageId) {
  let buffer = '';
  
  for await (const chunk of responseBody) {
    const text = chunk.toString();
    buffer += text;

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim() || line.startsWith(':')) continue;

      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        
        if (data === '[DONE]') {
          yield 'event: message_stop\ndata: {"type":"message_stop"}\n\n';
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          
          if (delta?.content) {
            const anthropicChunk = {
              type: 'content_block_delta',
              index: 0,
              delta: {
                type: 'text_delta',
                text: delta.content
              }
            };
            yield `event: content_block_delta\ndata: ${JSON.stringify(anthropicChunk)}\n\n`;
          }
        } catch (e) {
          logDebug('Failed to parse SSE chunk', e);
        }
      }
    }
  }
}

