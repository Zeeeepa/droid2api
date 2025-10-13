/**
 * Backend Handler Module
 * Handles requests to different backends (Claude Code, claude-code-router, config-based)
 */

import fetch from 'node-fetch';
import { transformToAnthropic, getAnthropicHeaders } from '../transformers/request-anthropic.js';
import { transformToOpenAI, getOpenAIHeaders } from '../transformers/request-openai.js';
import { transformToCommon, getCommonHeaders } from '../transformers/request-common.js';
import { getConfig, getModelById, getEndpointByType, getSystemPrompt, getRedirectedModelId } from '../config.js';
import { getApiKey } from '../auth.js';
import { logInfo, logError } from '../logger.js';

/**
 * Handle request to Claude Code backend
 * @param {Object} backend - Backend configuration
 * @param {Object} normalizedRequest - Request in OpenAI format
 * @param {Object} res - Express response object
 * @returns {Promise<Object|null>} Backend response or null if streaming
 */
export async function handleClaudeCodeBackend(backend, normalizedRequest, res) {
  logInfo('Routing to Claude Code backend');
  
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
    return { streaming: true, body: response.body };
  }

  return await response.json();
}

/**
 * Handle request to claude-code-router backend
 * @param {Object} backend - Backend configuration
 * @param {Object} normalizedRequest - Request in OpenAI format
 * @param {Object} res - Express response object
 * @returns {Promise<Object|null>} Backend response or null if streaming
 */
export async function handleClaudeCodeRouterBackend(backend, normalizedRequest, res) {
  logInfo('Routing to claude-code-router backend');
  
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
    return { streaming: true, body: response.body };
  }

  return await response.json();
}

/**
 * Handle request to config-based backend
 * @param {Object} normalizedRequest - Request in OpenAI format
 * @param {Object} authHeader - Authorization header
 * @returns {Promise<Object>} Backend response
 */
export async function handleConfigBackend(normalizedRequest, authHeader) {
  logInfo('Routing to config-based backend');
  
  const config = getConfig();
  const modelId = getRedirectedModelId(normalizedRequest.model);
  const model = getModelById(modelId);
  
  if (!model) {
    throw new Error(`Model not found: ${normalizedRequest.model}`);
  }

  const endpoint = getEndpointByType(model.type);
  const apiKey = await getApiKey(authHeader);
  
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
    return { streaming: true, body: response.body };
  }

  return await response.json();
}

