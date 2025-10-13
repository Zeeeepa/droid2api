import { logDebug } from '../logger.js';
import { getSystemPrompt, getModelReasoning, getUserAgent } from '../config.js';

export function transformToGemini(openaiRequest) {
  logDebug('Transforming OpenAI request to Gemini format');
  
  const geminiRequest = {
    contents: [],
    generationConfig: {}
  };

  // Transform max_tokens to maxOutputTokens
  if (openaiRequest.max_tokens) {
    geminiRequest.generationConfig.maxOutputTokens = openaiRequest.max_tokens;
  } else if (openaiRequest.max_completion_tokens) {
    geminiRequest.generationConfig.maxOutputTokens = openaiRequest.max_completion_tokens;
  }

  // Extract system message and transform other messages
  let systemContent = '';
  
  if (openaiRequest.messages && Array.isArray(openaiRequest.messages)) {
    for (const msg of openaiRequest.messages) {
      // Handle system messages separately
      if (msg.role === 'system') {
        if (typeof msg.content === 'string') {
          systemContent += msg.content + '\n';
        } else if (Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (part.type === 'text') {
              systemContent += part.text + '\n';
            }
          }
        }
        continue; // Skip adding system messages to contents array
      }

      const geminiMsg = {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: []
      };

      if (typeof msg.content === 'string') {
        geminiMsg.parts.push({
          text: msg.content
        });
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === 'text') {
            geminiMsg.parts.push({
              text: part.text
            });
          } else if (part.type === 'image_url') {
            // Convert image_url to Gemini's inline data format
            const imageUrl = part.image_url.url;
            
            // If it's a base64 data URL, extract the data
            if (imageUrl.startsWith('data:')) {
              const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
              if (matches) {
                geminiMsg.parts.push({
                  inlineData: {
                    mimeType: matches[1],
                    data: matches[2]
                  }
                });
              }
            } else {
              // For HTTP URLs, we need to fetch and convert to base64
              // For now, we'll pass it through and let the route handler deal with it
              geminiMsg.parts.push({
                inlineData: {
                  mimeType: getMimeType(imageUrl),
                  data: imageUrl // Route handler will need to convert this
                }
              });
            }
          } else if (part.type === 'tool_call' || part.functionCall) {
            // Handle tool calls in request
            const toolCall = part.tool_call || part;
            geminiMsg.parts.push({
              functionCall: {
                name: toolCall.function?.name || toolCall.name,
                args: typeof toolCall.function?.arguments === 'string' 
                  ? JSON.parse(toolCall.function.arguments)
                  : (toolCall.args || toolCall.function?.arguments || {})
              }
            });
          }
        }
      }

      // Only add message if it has parts
      if (geminiMsg.parts.length > 0) {
        geminiRequest.contents.push(geminiMsg);
      }
    }
  }

  // Add system instruction with system prompt prepended
  const systemPrompt = getSystemPrompt();
  if (systemPrompt || systemContent) {
    const combinedSystem = (systemPrompt ? systemPrompt + '\n' : '') + systemContent;
    geminiRequest.systemInstruction = {
      parts: [{
        text: combinedSystem.trim()
      }]
    };
  }

  // Transform tools if present
  if (openaiRequest.tools && Array.isArray(openaiRequest.tools)) {
    geminiRequest.tools = [{
      functionDeclarations: openaiRequest.tools.map(tool => {
        if (tool.type === 'function') {
          return {
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters || {}
          };
        }
        return tool;
      })
    }];
  }

  // Handle thinking field based on model configuration
  const reasoningLevel = getModelReasoning(openaiRequest.model);
  if (reasoningLevel === 'auto') {
    // Auto mode: preserve original request's thinking field exactly as-is
    if (openaiRequest.thinking !== undefined) {
      geminiRequest.thoughtConfig = {
        type: 'enabled'
      };
      if (openaiRequest.thinking_config?.level) {
        const budgetTokens = {
          'low': 4096,
          'medium': 12288,
          'high': 24576
        };
        geminiRequest.thoughtConfig.budget_tokens = budgetTokens[openaiRequest.thinking_config.level] || 12288;
      }
    }
    // If original request has no thinking field, don't add one
  } else if (reasoningLevel && ['low', 'medium', 'high'].includes(reasoningLevel)) {
    // Specific level: override with model configuration
    const budgetTokens = {
      'low': 4096,
      'medium': 12288,
      'high': 24576
    };
    
    geminiRequest.thoughtConfig = {
      type: 'enabled',
      budget_tokens: budgetTokens[reasoningLevel]
    };
  } else {
    // Off or invalid: explicitly remove thinking field
    delete geminiRequest.thoughtConfig;
  }

  // Pass through other compatible parameters
  if (openaiRequest.temperature !== undefined) {
    geminiRequest.generationConfig.temperature = openaiRequest.temperature;
  }
  if (openaiRequest.top_p !== undefined) {
    geminiRequest.generationConfig.topP = openaiRequest.top_p;
  }
  if (openaiRequest.top_k !== undefined) {
    geminiRequest.generationConfig.topK = openaiRequest.top_k;
  }
  if (openaiRequest.stop !== undefined) {
    geminiRequest.generationConfig.stopSequences = Array.isArray(openaiRequest.stop) 
      ? openaiRequest.stop 
      : [openaiRequest.stop];
  }
  if (openaiRequest.n !== undefined) {
    geminiRequest.generationConfig.candidateCount = openaiRequest.n;
  }

  logDebug('Transformed Gemini request', geminiRequest);
  return geminiRequest;
}

export function getGeminiHeaders(authHeader, clientHeaders = {}) {
  // Generate unique IDs if not provided
  const sessionId = clientHeaders['x-session-id'] || generateUUID();
  const messageId = clientHeaders['x-assistant-message-id'] || generateUUID();
  
  const headers = {
    'content-type': 'application/json',
    'x-goog-api-key': extractApiKey(authHeader), // Convert Bearer token to API key
    'x-api-provider': 'gemini',
    'x-factory-client': 'cli',
    'x-session-id': sessionId,
    'x-assistant-message-id': messageId,
    'user-agent': getUserAgent(),
    'connection': 'keep-alive'
  };

  // Pass through any additional client headers
  Object.keys(clientHeaders).forEach(key => {
    if (!headers[key] && !key.startsWith('authorization')) {
      headers[key] = clientHeaders[key];
    }
  });

  return headers;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function extractApiKey(authHeader) {
  if (!authHeader) return null;
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7); // Remove 'Bearer ' prefix
  }
  return authHeader;
}

function getMimeType(url) {
  const extension = url.split('.').pop().toLowerCase();
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'heic': 'image/heic'
  };
  return mimeTypes[extension] || 'image/jpeg';
}

