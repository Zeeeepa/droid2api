# 🌐 Universal API Gateway - Complete Routing Architecture

## Overview

droid2api acts as a **universal API gateway** that accepts requests in three different API formats (OpenAI, Anthropic, Gemini) and routes them to various backends, returning responses in the original format requested.

---

## 🎯 Multi-Format Support

### Supported Input Formats

```
droid2api Universal Gateway
         │
         ├─ OpenAI Format:    POST /v1/chat/completions
         │                    Content-Type: application/json
         │                    { "model": "...", "messages": [...] }
         │
         ├─ Anthropic Format: POST /v1/messages
         │                    Content-Type: application/json
         │                    anthropic-version: 2023-06-01
         │                    { "model": "...", "messages": [...] }
         │
         └─ Gemini Format:    POST /v1/generateContent
                              Content-Type: application/json
                              { "model": "...", "contents": [...] }
```

**Key Feature**: Request arrives in one format → Transforms internally → Routes to backend → Returns in **original format**

---

## 🔄 Two Routing Modes

### Mode 1: Direct Backend Routing (Z.ai Example)

Route directly to a backend provider like Z.ai:

```bash
# Environment Configuration
export ANTHROPIC_MODEL=glm-4.6
export ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
export ANTHROPIC_AUTH_TOKEN=665b963943b647dc9501dff942afb877.A47LrMc7sgGjyfBJ
```

**Flow:**
```
Client (any format)
        ↓
droid2api (port 3000)
    • Receives request (OpenAI/Anthropic/Gemini)
    • Transforms to backend format (Anthropic for Z.ai)
    • Adds authentication
        ↓
Z.ai Backend
    • GLM-4.6 model processes request
        ↓
droid2api
    • Receives response
    • Transforms back to original format
        ↓
Client receives response in original format
```

**Use Case**: Direct, simple routing to a single backend provider

---

### Mode 2: Smart Routing via claude-code-router

Route through claude-code-router for intelligent model selection:

```bash
# Environment Configuration
export OPENAI_API_KEY="sk-k2think-proxy-1760386095"
export OPENAI_BASE_URL="http://localhost:7000/v1"
export OPENAI_MODEL="MBZUAI-IFM/K2-Think"
```

**Flow:**
```
Client (any format)
        ↓
claude-code-router (port 7000)
    • Token counting & analysis
    • Context size evaluation
    • Smart model selection based on:
        - thinking=true → reasoning model
        - background=true → cheap model
        - tokens > 60k → long context model
        - default → balanced model
        ↓
    Routes to: droid2api (port 3000)
        ↓
droid2api
    • Receives routed request (OpenAI format)
    • Transforms to backend format
    • Adds authentication
        ↓
Backend Provider (Z.ai, Anthropic, OpenAI, etc.)
    • Model processes request
        ↓
droid2api
    • Receives response
    • Transforms to OpenAI format
        ↓
claude-code-router
    • Passes through response
        ↓
Client receives response in OpenAI format
```

**Use Case**: Intelligent routing based on request characteristics for cost optimization

---

## 📊 Complete Request Flow Examples

### Example 1: Gemini SDK → Direct Z.ai

**Client Code:**
```javascript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI({
  apiKey: "dummy-key",
  baseUrl: "http://localhost:3000"  // droid2api
});

const model = genAI.getGenerativeModel({ model: "glm-4.6" });
const result = await model.generateContent("Explain quantum computing");
```

**Flow:**
```
1. Gemini SDK sends request
   POST http://localhost:3000/v1/generateContent
   {
     "model": "glm-4.6",
     "contents": [{
       "role": "user",
       "parts": [{"text": "Explain quantum computing"}]
     }]
   }

2. droid2api receives Gemini format
   • Detects /v1/generateContent endpoint
   • Calls geminiToOpenAI() transformer
   • Converts to OpenAI format internally:
     {
       "model": "glm-4.6",
       "messages": [{
         "role": "user",
         "content": "Explain quantum computing"
       }]
     }

3. droid2api transforms to backend
   • Model type: "anthropic" (from config)
   • Transforms OpenAI → Anthropic format
   • Adds auth: ANTHROPIC_AUTH_TOKEN
   • Sends to: https://api.z.ai/api/anthropic

4. Z.ai processes with GLM-4.6
   • Returns Anthropic format response

5. droid2api transforms back
   • Anthropic → OpenAI (internal)
   • OpenAI → Gemini format
   • Returns to client:
     {
       "candidates": [{
         "content": {
           "parts": [{"text": "Quantum computing is..."}],
           "role": "model"
         },
         "finishReason": "STOP"
       }],
       "usageMetadata": {
         "promptTokenCount": 24,
         "candidatesTokenCount": 156,
         "totalTokenCount": 180
       }
     }

6. Gemini SDK receives native Gemini response
   ✅ Success! Client sees perfect Gemini format
```

---

### Example 2: OpenAI SDK → Smart Router → K2-Think

**Client Code:**
```javascript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "sk-k2think-proxy-1760386095",
  baseURL: "http://localhost:7000/v1"  // claude-code-router
});

const response = await openai.chat.completions.create({
  model: "MBZUAI-IFM/K2-Think",
  messages: [{
    role: "user",
    content: "Solve this complex reasoning problem..."
  }]
});
```

**Flow:**
```
1. OpenAI SDK sends request
   POST http://localhost:7000/v1/chat/completions
   {
     "model": "MBZUAI-IFM/K2-Think",
     "messages": [{
       "role": "user",
       "content": "Solve this complex reasoning problem..."
     }]
   }

2. claude-code-router analyzes
   • Token count: 5,432 tokens
   • Context: reasoning task detected
   • Decision: Use K2-Think reasoning model
   • Routes to: droid2api at localhost:3000

3. claude-code-router forwards
   POST http://localhost:3000/v1/chat/completions
   {
     "model": "MBZUAI-IFM/K2-Think",
     "messages": [...]
   }

4. droid2api processes
   • OpenAI format received
   • Model type: "openai" (or "common")
   • Adds authentication
   • Calls K2-Think API

5. K2-Think responds
   • Returns OpenAI format response
   • Includes reasoning tokens

6. droid2api passes through
   • OpenAI format maintained
   • Returns to claude-code-router

7. claude-code-router passes through
   • Logs usage statistics
   • Returns to client

8. OpenAI SDK receives response
   ✅ Success! Native OpenAI format
```

---

### Example 3: Anthropic SDK → Direct Z.ai

**Client Code:**
```javascript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: "665b963943b647dc9501dff942afb877.A47LrMc7sgGjyfBJ",
  baseURL: "http://localhost:3000"  // droid2api
});

const message = await anthropic.messages.create({
  model: "glm-4.6",
  max_tokens: 1024,
  messages: [{
    role: "user",
    content: "Write a Python function to sort a list"
  }]
});
```

**Flow:**
```
1. Anthropic SDK sends request
   POST http://localhost:3000/v1/messages
   Headers:
     anthropic-version: 2023-06-01
   Body:
     {
       "model": "glm-4.6",
       "max_tokens": 1024,
       "messages": [{
         "role": "user",
         "content": "Write a Python function..."
       }]
     }

2. droid2api receives Anthropic format
   • Detects /v1/messages endpoint
   • Native Anthropic format
   • Adds auth from ANTHROPIC_AUTH_TOKEN
   • Routes directly to backend

3. Z.ai processes
   • GLM-4.6 model
   • Returns Anthropic format response

4. droid2api passes through
   • Anthropic format maintained
   • Returns to client

5. Anthropic SDK receives response
   ✅ Success! Native Anthropic format
```

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    CLIENT APPLICATIONS                          │
│                                                                 │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │  Google AI SDK │  │   OpenAI SDK   │  │ Anthropic SDK  │  │
│  │  (Gemini)      │  │   (GPT)        │  │  (Claude)      │  │
│  └────────┬───────┘  └────────┬───────┘  └────────┬───────┘  │
│           │                   │                    │           │
└───────────┼───────────────────┼────────────────────┼───────────┘
            │                   │                    │
            │ Gemini Format     │ OpenAI Format      │ Anthropic Format
            │                   │                    │
            │                   └────────┬───────────┘
            │                            │
            │                            ▼
            │              ┌─────────────────────────┐
            │              │  claude-code-router     │
            │              │  (Port 7000)            │
            │              │  ┌──────────────────┐   │
            │              │  │ Smart Routing    │   │
            │              │  │ • Token Analysis │   │
            │              │  │ • Context Check  │   │
            │              │  │ • Model Selection│   │
            │              │  └──────────────────┘   │
            │              └─────────┬───────────────┘
            │                        │
            │                        │ OpenAI Format
            │                        │ (all requests)
            └────────────────────────┼────────────────┐
                                     │                │
                                     ▼                ▼
              ┌──────────────────────────────────────────────┐
              │          droid2api (Port 3000)               │
              │        Universal API Gateway                  │
              │                                              │
              │  ┌────────────────────────────────────────┐ │
              │  │  Format Detection & Transformation     │ │
              │  ├────────────────────────────────────────┤ │
              │  │  • Gemini → OpenAI → Backend          │ │
              │  │  • OpenAI → Backend                   │ │
              │  │  • Anthropic → Backend                │ │
              │  └────────────────────────────────────────┘ │
              │                                              │
              │  ┌────────────────────────────────────────┐ │
              │  │  Authentication & Configuration        │ │
              │  ├────────────────────────────────────────┤ │
              │  │  • ANTHROPIC_AUTH_TOKEN               │ │
              │  │  • FACTORY_API_KEY                    │ │
              │  │  • Model routing rules                │ │
              │  └────────────────────────────────────────┘ │
              │                                              │
              └──────────────┬───────────────────────────────┘
                             │
                             │ Backend Format
                             │ (Anthropic/OpenAI/Common)
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │   Z.ai       │  │  Anthropic   │  │   OpenAI     │
  │  (GLM-4.6)   │  │  (Claude)    │  │   (GPT)      │
  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
         │                  │                  │
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
                            │ Response
                            │
                            ▼
              ┌──────────────────────────┐
              │  droid2api               │
              │  Response Transformation │
              │  Backend → Original      │
              └──────────┬───────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    Gemini Format   OpenAI Format   Anthropic Format
         │               │               │
         └───────────────┴───────────────┘
                         │
                         ▼
                    CLIENT
```

---

## 🔧 Configuration Examples

### Configuration 1: Direct Z.ai Routing

**Environment Variables:**
```bash
# droid2api config
export ANTHROPIC_MODEL=glm-4.6
export ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
export ANTHROPIC_AUTH_TOKEN=665b963943b647dc9501dff942afb877.A47LrMc7sgGjyfBJ

# Start droid2api
npm start  # Port 3000
```

**droid2api config.json:**
```json
{
  "port": 3000,
  "models": [{
    "id": "glm-4.6",
    "name": "GLM-4.6",
    "type": "anthropic"
  }],
  "endpoints": [{
    "type": "anthropic",
    "base_url": "https://api.z.ai/api/anthropic"
  }]
}
```

**Client Usage:**
```bash
# Works with ANY SDK!

# OpenAI SDK
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"glm-4.6","messages":[{"role":"user","content":"Hello"}]}'

# Anthropic SDK
curl -X POST http://localhost:3000/v1/messages \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"glm-4.6","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}'

# Gemini SDK
curl -X POST http://localhost:3000/v1/generateContent \
  -d '{"model":"glm-4.6","contents":[{"role":"user","parts":[{"text":"Hello"}]}]}'
```

---

### Configuration 2: Smart Routing via claude-code-router

**Environment Variables:**
```bash
# claude-code-router config
export OPENAI_API_KEY="sk-k2think-proxy-1760386095"
export OPENAI_BASE_URL="http://localhost:7000/v1"
export OPENAI_MODEL="MBZUAI-IFM/K2-Think"

# Start claude-code-router
ccr start  # Port 7000

# Start droid2api
npm start  # Port 3000
```

**claude-code-router config.json:**
```json
{
  "PORT": 7000,
  "Router": {
    "default": "droid2api,glm-4.6",
    "background": "droid2api,gpt-4o-mini",
    "think": "droid2api,K2-Think",
    "longContext": "droid2api,gemini-2.5-pro"
  },
  "Providers": [{
    "name": "droid2api",
    "api_base_url": "http://localhost:3000/v1/chat/completions",
    "api_key": "dummy",
    "models": ["glm-4.6", "K2-Think", "gemini-2.5-pro", "gpt-4o-mini"]
  }]
}
```

**droid2api config.json:**
```json
{
  "port": 3000,
  "models": [
    {
      "id": "glm-4.6",
      "type": "anthropic",
      "reasoning": "high"
    },
    {
      "id": "K2-Think",
      "type": "openai",
      "reasoning": "high"
    },
    {
      "id": "gemini-2.5-pro",
      "type": "openai"
    },
    {
      "id": "gpt-4o-mini",
      "type": "openai"
    }
  ],
  "endpoints": [
    {
      "type": "anthropic",
      "base_url": "https://api.z.ai/api/anthropic"
    },
    {
      "type": "openai",
      "base_url": "https://api.openai.com/v1"
    }
  ]
}
```

**Client Usage:**
```javascript
// Client only knows about router
const openai = new OpenAI({
  apiKey: "sk-k2think-proxy-1760386095",
  baseURL: "http://localhost:7000/v1"
});

// Router automatically selects best model
const response = await openai.chat.completions.create({
  model: "auto",  // Router decides!
  messages: [{ role: "user", content: "Complex reasoning task..." }]
});

// Router routes to K2-Think via droid2api
// droid2api handles format transformation
// Response comes back in OpenAI format
```

---

## 💰 Cost Optimization with Smart Routing

### Routing Rules

```
Request Analysis:
├─ Has thinking=true?        → DeepSeek-reasoner ($0.55/1M)
├─ Is background task?       → GPT-4o-mini      ($0.60/1M)
├─ Token count > 60k?        → Gemini 2.5 Pro   (Free)
└─ Default interactive?      → GLM-4.6          ($2.00/1M via Z.ai)
```

### Cost Comparison

**Traditional (No Router):**
```
All requests → Claude Opus 4 → $15/1M tokens
Monthly cost: $1,350
```

**Optimized (With Router + droid2api):**
```
Interactive  → GLM-4.6        → $2.00/1M
Background   → GPT-4o-mini    → $0.60/1M
Reasoning    → K2-Think       → $0.55/1M
Long Context → Gemini 2.5 Pro → Free
Monthly cost: $276 (79.6% savings!)
```

---

## 🎯 Use Cases

### Use Case 1: Multi-SDK Application

**Scenario**: Application uses different AI SDKs in different modules

```javascript
// Module 1: Uses Gemini SDK (for image analysis)
import { GoogleGenerativeAI } from "@google/generative-ai";
const gemini = new GoogleGenerativeAI({ baseUrl: "http://localhost:3000" });

// Module 2: Uses OpenAI SDK (for text generation)
import OpenAI from "openai";
const openai = new OpenAI({ baseURL: "http://localhost:3000/v1" });

// Module 3: Uses Anthropic SDK (for long-form content)
import Anthropic from "@anthropic-ai/sdk";
const anthropic = new Anthropic({ baseURL: "http://localhost:3000" });

// All three modules hit the same backend!
// All three get responses in their native format!
```

**Benefits:**
- ✅ Use best SDK for each task
- ✅ Single backend configuration
- ✅ Easy to switch backends
- ✅ Consistent authentication

---

### Use Case 2: Cost-Aware Development

**Scenario**: Optimize costs during development vs production

```bash
# Development: Use cheap local model
export ANTHROPIC_BASE_URL=http://localhost:11434/v1
export ANTHROPIC_MODEL=llama3.1

# Staging: Use mid-tier cloud model
export ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
export ANTHROPIC_MODEL=glm-4.6

# Production: Use premium model
export ANTHROPIC_BASE_URL=https://api.anthropic.com
export ANTHROPIC_MODEL=claude-opus-4
```

**Benefits:**
- ✅ No code changes needed
- ✅ Environment-based routing
- ✅ Cost control per environment
- ✅ Easy testing with cheap models

---

### Use Case 3: Smart Model Selection

**Scenario**: Let router choose best model per request

```javascript
// Client doesn't specify model details
const response = await openai.chat.completions.create({
  model: "auto",
  messages: [{
    role: "user",
    content: "Analyze this 100-page document..."
  }]
});

// Router sees:
// - Token count: 80,000 tokens
// - Decision: Use Gemini 2.5 Pro (free, supports 2M context)
// - Routes to: droid2api → Gemini 2.5 Pro
// - Cost: $0.00 instead of $240 with Claude!
```

**Benefits:**
- ✅ Automatic cost optimization
- ✅ Best model for each task
- ✅ No client-side logic needed
- ✅ Centralized routing rules

---

## 🧪 Testing All Formats

```bash
# Test script: test-all-formats.sh

#!/bin/bash

BASE_URL="http://localhost:3000"

echo "Testing OpenAI format..."
curl -X POST $BASE_URL/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.6",
    "messages": [{"role": "user", "content": "Say hello"}]
  }'

echo "\n\nTesting Anthropic format..."
curl -X POST $BASE_URL/v1/messages \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "glm-4.6",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Say hello"}]
  }'

echo "\n\nTesting Gemini format..."
curl -X POST $BASE_URL/v1/generateContent \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.6",
    "contents": [{
      "role": "user",
      "parts": [{"text": "Say hello"}]
    }]
  }'

echo "\n\n✅ All three formats should return 'Hello!' in their respective formats"
```

---

## 🔍 Troubleshooting

### Issue: "Model not found"

**Problem**: Client requests a model that doesn't exist in config

**Solution**: Add model to droid2api config.json:
```json
{
  "models": [{
    "id": "your-model-name",
    "type": "anthropic",  // or "openai"
    "reasoning": "high"   // optional
  }]
}
```

---

### Issue: "Authentication failed"

**Problem**: Backend rejects auth token

**Solution**: Check environment variables:
```bash
# For direct routing
echo $ANTHROPIC_AUTH_TOKEN

# For router
echo $OPENAI_API_KEY

# Restart services after changing env vars
npm restart
```

---

### Issue: "Format transformation error"

**Problem**: Response doesn't match expected format

**Solution**: Check endpoint path:
```
✅ /v1/chat/completions    → OpenAI format
✅ /v1/messages            → Anthropic format
✅ /v1/generateContent     → Gemini format
❌ /v1/completions         → Wrong endpoint!
```

---

## 📚 Related Documentation

- **Gemini Support**: See [GEMINI_SUPPORT.md](./GEMINI_SUPPORT.md) for detailed Gemini API documentation
- **Router Architecture**: See [claude-code-router INTEGRATION_DIAGRAM.md](https://github.com/musistudio/claude-code-router/blob/main/INTEGRATION_DIAGRAM.md)
- **Configuration Guide**: See [README.md](./README.md) for basic setup

---

## 🎉 Summary

droid2api is a **universal API gateway** that:

✅ **Accepts 3 formats**: OpenAI, Anthropic, Gemini
✅ **Routes to any backend**: Z.ai, Anthropic, OpenAI, local models
✅ **Returns original format**: Client gets response in format they sent
✅ **Works with any SDK**: Use Google AI, OpenAI, or Anthropic SDKs
✅ **Smart routing optional**: Add claude-code-router for intelligent model selection
✅ **Cost optimization**: Route expensive tasks to cheap models automatically

**One gateway, infinite possibilities!** 🚀

