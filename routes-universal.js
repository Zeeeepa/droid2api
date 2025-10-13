import express from 'express';
import fetch from 'node-fetch';
import { getConfig, getModelById, getEndpointByType, getSystemPrompt, getModelReasoning, getRedirectedModelId } from './config.js';
import { logInfo, logDebug, logError, logRequest, logResponse } from './logger.js';
import { transformToAnthropic, getAnthropicHeaders } from './transformers/request-anthropic.js';
import { transformToOpenAI, getOpenAIHeaders } from './transformers/request-openai.js';
import { transformToCommon, getCommonHeaders } from './transformers/request-common.js';
import { AnthropicResponseTransformer } from './transformers/response-anthropic.js';
import { OpenAIResponseTransformer } from './transformers/response-openai.js';
import { getApiKey } from './auth.js';

const router = express.Router();

// ============================================================================
// FORMAT DETECTION & NORMALIZATION
// ============================================================================

/**
 * Detect the request format based on the endpoint path
 */
function detectRequestFormat(req) {
  if (req.path === '/v1/chat/completions') {
    return 'openai';
  } else if (req.path === '/v1/messages') {
    return 'anthropic';
  } else if (req.path === '/v1/generateContent') {
    return 'gemini';
  }
  return 'unknown';
}

/**
 * Transform Gemini format to OpenAI format (for internal processing)
 */
function geminiToOpenAI(geminiRequest) {
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

/**
 * Transform Anthropic format to OpenAI format (for internal processing)
 */
function anthropicToOpenAI(anthropicRequest) {
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

/**
 * Transform OpenAI response to Gemini format
 */
function openaiToGemini(openaiResponse) {
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

/**
 * Transform OpenAI response to Anthropic format
 */
function openaiToAnthropic(openaiResponse) {
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

// ============================================================================
// STREAMING TRANSFORMERS
// ============================================================================

/**
 * Transform OpenAI SSE stream to Gemini SSE stream
 */
async function* transformStreamToGemini(responseBody) {
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

/**
 * Transform OpenAI SSE stream to Anthropic SSE stream
 */
async function* transformStreamToAnthropic(responseBody, messageId) {
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

// ============================================================================
// BACKEND ROUTING
// ============================================================================

/**
 * Determine which backend to use based on configuration
 */
function selectBackend() {
  // Check for Claude Code configuration
  if (process.env.ANTHROPIC_BASE_URL && process.env.ANTHROPIC_AUTH_TOKEN) {
    return {
      type: 'claude-code',
      baseUrl: process.env.ANTHROPIC_BASE_URL,
      apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
      model: process.env.ANTHROPIC_MODEL || 'glm-4.6'
    };
  }
  
  // Check for claude-code-router configuration
  if (process.env.OPENAI_BASE_URL && process.env.OPENAI_API_KEY) {
    return {
      type: 'claude-code-router',
      baseUrl: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'MBZUAI-IFM/K2-Think'
    };
  }
  
  // Fallback to config-based routing
  return {
    type: 'config',
    baseUrl: null,
    apiKey: null,
    model: null
  };
}

// ============================================================================
// UNIVERSAL API HANDLER
// ============================================================================

/**
 * Universal handler for all three API formats
 */
router.post(['/v1/chat/completions', '/v1/messages', '/v1/generateContent'], async (req, res) => {
  const inputFormat = detectRequestFormat(req);
  logInfo(`Universal Gateway: Request format detected: ${inputFormat}`);
  logRequest(req.path, req.body);

  try {
    // Step 1: Normalize all formats to OpenAI internally
    let normalizedRequest;
    if (inputFormat === 'gemini') {
      normalizedRequest = geminiToOpenAI(req.body);
    } else if (inputFormat === 'anthropic') {
      normalizedRequest = anthropicToOpenAI(req.body);
    } else {
      normalizedRequest = req.body;
    }

    // Step 2: Select backend
    const backend = selectBackend();
    logInfo(`Routing to backend: ${backend.type}`);

    // Step 3: Call backend
    let backendResponse;
    
    if (backend.type === 'claude-code') {
      // Route through Claude Code (Anthropic format)
      const anthropicRequest = transformToAnthropic(normalizedRequest, getSystemPrompt());
      
      const response = await fetch(backend.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': backend.apiKey
        },
        body: JSON.stringify({
          ...anthropicRequest,
          model: backend.model
        })
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status} ${response.statusText}`);
      }

      if (normalizedRequest.stream) {
        // Handle streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        if (inputFormat === 'gemini') {
          for await (const chunk of transformStreamToGemini(response.body)) {
            res.write(chunk);
          }
        } else if (inputFormat === 'anthropic') {
          for await (const chunk of transformStreamToAnthropic(response.body, `msg_${Date.now()}`)) {
            res.write(chunk);
          }
        } else {
          // OpenAI format - pass through
          for await (const chunk of response.body) {
            res.write(chunk);
          }
        }
        
        res.end();
        return;
      } else {
        // Non-streaming
        backendResponse = await response.json();
      }
      
    } else if (backend.type === 'claude-code-router') {
      // Route through claude-code-router (OpenAI format)
      const response = await fetch(`${backend.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${backend.apiKey}`
        },
        body: JSON.stringify({
          ...normalizedRequest,
          model: backend.model
        })
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status} ${response.statusText}`);
      }

      if (normalizedRequest.stream) {
        // Handle streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        if (inputFormat === 'gemini') {
          for await (const chunk of transformStreamToGemini(response.body)) {
            res.write(chunk);
          }
        } else if (inputFormat === 'anthropic') {
          for await (const chunk of transformStreamToAnthropic(response.body, `msg_${Date.now()}`)) {
            res.write(chunk);
          }
        } else {
          // OpenAI format - pass through
          for await (const chunk of response.body) {
            res.write(chunk);
          }
        }
        
        res.end();
        return;
      } else {
        // Non-streaming
        backendResponse = await response.json();
      }
      
    } else {
      // Use config-based routing (existing logic)
      const config = getConfig();
      const modelId = getRedirectedModelId(normalizedRequest.model);
      const model = getModelById(modelId);
      
      if (!model) {
        return res.status(400).json({ 
          error: { message: `Model not found: ${normalizedRequest.model}` } 
        });
      }

      const endpoint = getEndpointByType(model.type);
      const apiKey = await getApiKey(req.headers.authorization);
      
      let backendRequest;
      let headers;
      
      if (model.type === 'anthropic') {
        backendRequest = transformToAnthropic(normalizedRequest, getSystemPrompt());
        headers = getAnthropicHeaders(apiKey);
      } else if (model.type === 'openai') {
        backendRequest = transformToOpenAI(normalizedRequest);
        headers = getOpenAIHeaders(apiKey);
      } else {
        backendRequest = transformToCommon(normalizedRequest);
        headers = getCommonHeaders(apiKey);
      }

      const response = await fetch(endpoint.base_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(backendRequest)
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status} ${response.statusText}`);
      }

      if (normalizedRequest.stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        if (inputFormat === 'gemini') {
          for await (const chunk of transformStreamToGemini(response.body)) {
            res.write(chunk);
          }
        } else if (inputFormat === 'anthropic') {
          for await (const chunk of transformStreamToAnthropic(response.body, `msg_${Date.now()}`)) {
            res.write(chunk);
          }
        } else {
          for await (const chunk of response.body) {
            res.write(chunk);
          }
        }
        
        res.end();
        return;
      } else {
        backendResponse = await response.json();
      }
    }

    // Step 4: Transform response to match input format
    let finalResponse;
    if (inputFormat === 'gemini') {
      finalResponse = openaiToGemini(backendResponse);
    } else if (inputFormat === 'anthropic') {
      finalResponse = openaiToAnthropic(backendResponse);
    } else {
      finalResponse = backendResponse;
    }

    logResponse(200, null, finalResponse);
    res.json(finalResponse);

  } catch (error) {
    logError('Universal gateway error', error);
    res.status(error.status || 500).json({
      error: {
        message: error.message || 'Internal server error',
        type: 'internal_error'
      }
    });
  }
});

export default router;

