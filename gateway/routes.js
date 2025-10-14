/**
 * Universal Gateway Routes
 * Main routing logic for the universal API gateway
 */

import express from 'express';
import { detectRequestFormat } from './format-detector.js';
import { selectBackend } from './backend-selector.js';
import { handleClaudeCodeBackend, handleClaudeCodeRouterBackend, handleConfigBackend } from './backend-handlers.js';
import { geminiToOpenAI } from '../utils/transformers/gemini-to-openai.js';
import { anthropicToOpenAI } from '../utils/transformers/anthropic-to-openai.js';
import { openaiToGemini } from '../utils/transformers/openai-to-gemini.js';
import { openaiToAnthropic } from '../utils/transformers/openai-to-anthropic.js';
import { transformStreamToGemini } from '../utils/transformers/stream-to-gemini.js';
import { transformStreamToAnthropic } from '../utils/transformers/stream-to-anthropic.js';
import { logInfo, logError, logRequest, logResponse } from '../logger.js';

const router = express.Router();

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
      backendResponse = await handleClaudeCodeBackend(backend, normalizedRequest, res);
    } else if (backend.type === 'claude-code-router') {
      backendResponse = await handleClaudeCodeRouterBackend(backend, normalizedRequest, res);
    } else {
      backendResponse = await handleConfigBackend(normalizedRequest, req.headers.authorization);
    }

    // Step 4: Handle streaming
    if (backendResponse.streaming) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      if (inputFormat === 'gemini') {
        for await (const chunk of transformStreamToGemini(backendResponse.body)) {
          res.write(chunk);
        }
      } else if (inputFormat === 'anthropic') {
        for await (const chunk of transformStreamToAnthropic(backendResponse.body, `msg_${Date.now()}`)) {
          res.write(chunk);
        }
      } else {
        // OpenAI format - pass through
        for await (const chunk of backendResponse.body) {
          res.write(chunk);
        }
      }
      
      res.end();
      return;
    }

    // Step 5: Transform response to match input format
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

