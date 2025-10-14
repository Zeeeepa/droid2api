/**
 * OpenAI Stream to Gemini Stream Transformer
 * Converts OpenAI SSE stream to Gemini SSE stream format
 */

import { logDebug } from '../../logger.js';

/**
 * Transform OpenAI SSE stream to Gemini SSE stream
 * @param {ReadableStream} responseBody - OpenAI stream response body
 * @yields {string} Gemini-formatted SSE chunks
 */
export async function* transformStreamToGemini(responseBody) {
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
          yield 'data: {"candidates":[{"finishReason":"STOP","index":0}]}\n\n';
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          
          if (delta?.content) {
            const geminiChunk = {
              candidates: [{
                content: {
                  parts: [{ text: delta.content }],
                  role: 'model'
                },
                index: 0
              }]
            };
            yield `data: ${JSON.stringify(geminiChunk)}\n\n`;
          }
        } catch (e) {
          logDebug('Failed to parse SSE chunk', e);
        }
      }
    }
  }
}

