# 🌍 Universal API Gateway - Complete Guide

## Overview

**droid2api** now functions as a universal API gateway that accepts requests in three different formats and routes them through either Claude Code or claude-code-router, responding in the same format as the request.

```
┌───────────────────────────────────────────────────────┐
│          Universal API Gateway (droid2api)           │
├───────────────────────────────────────────────────────┤
│                                                       │
│  📥 ACCEPTS 3 FORMATS:                                │
│  ├─ OpenAI:    POST /v1/chat/completions            │
│  ├─ Anthropic: POST /v1/messages                    │
│  └─ Gemini:    POST /v1/generateContent             │
│                                                       │
│  🔄 ROUTES THROUGH:                                   │
│  ├─ Claude Code (@anthropic-ai/claude-code)         │
│  └─ claude-code-router (@musistudio/claude-code-router) │
│                                                       │
│  📤 RESPONDS IN SAME FORMAT:                          │
│  ├─ OpenAI → OpenAI response                        │
│  ├─ Anthropic → Anthropic response                  │
│  └─ Gemini → Gemini response                        │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## 🚀 Installation

### 1. Install Dependencies

```bash
cd droid2api
npm install
```

This will install:
- `@anthropic-ai/claude-code` - Claude Code integration
- `@musistudio/claude-code-router` - Router integration
- All existing dependencies

### 2. Choose Your Backend

You have two options:

#### Option A: Claude Code (via Z.ai or Anthropic)

```bash
export ANTHROPIC_MODEL=glm-4.6
export ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
export ANTHROPIC_AUTH_TOKEN=665b963943b647dc9501dff942afb877.A47LrMc7sgGjyfBJ
```

#### Option B: claude-code-router

```bash
# First, start claude-code-router on port 7000
export OPENAI_API_KEY="sk-k2think-proxy-1760386095"
export OPENAI_BASE_URL="http://localhost:7000/v1"
export OPENAI_MODEL="MBZUAI-IFM/K2-Think"
```

### 3. Start droid2api

```bash
npm start
```

Server will start on port 3000 (or PORT environment variable).

---

## 📝 Usage Examples

### OpenAI Format → Any Backend

```bash
# Request
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.6",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ]
  }'

# Response (OpenAI format)
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "glm-4.6",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello! I'm doing well..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

---

### Anthropic Format → Any Backend

```bash
# Request
curl -X POST http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "glm-4.6",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ]
  }'

# Response (Anthropic format)
{
  "id": "msg-123",
  "type": "message",
  "role": "assistant",
  "content": [{
    "type": "text",
    "text": "Hello! I'm doing well..."
  }],
  "model": "glm-4.6",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {
    "input_tokens": 10,
    "output_tokens": 20
  }
}
```

---

### Gemini Format → Any Backend

```bash
# Request
curl -X POST http://localhost:3000/v1/generateContent \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.6",
    "contents": [{
      "role": "user",
      "parts": [{"text": "Hello, how are you?"}]
    }],
    "generationConfig": {
      "maxOutputTokens": 1024,
      "temperature": 0.7
    }
  }'

# Response (Gemini format)
{
  "candidates": [{
    "content": {
      "parts": [{"text": "Hello! I'm doing well..."}],
      "role": "model"
    },
    "finishReason": "STOP",
    "index": 0,
    "safetyRatings": []
  }],
  "usageMetadata": {
    "promptTokenCount": 10,
    "candidatesTokenCount": 20,
    "totalTokenCount": 30
  }
}
```

---

## 🌊 Streaming Support

All three formats support streaming!

### OpenAI Streaming

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.6",
    "messages": [{"role": "user", "content": "Count to 5"}],
    "stream": true
  }'
```

### Anthropic Streaming

```bash
curl -X POST http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "glm-4.6",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Count to 5"}],
    "stream": true
  }'
```

### Gemini Streaming

```bash
curl -X POST http://localhost:3000/v1/generateContent \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.6",
    "contents": [{
      "role": "user",
      "parts": [{"text": "Count to 5"}]
    }],
    "generationConfig": {
      "stream": true
    }
  }'
```

---

## 🔧 Integration with SDKs

### OpenAI SDK (Python)

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="dummy"  # Not needed for droid2api
)

response = client.chat.completions.create(
    model="glm-4.6",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
```

### OpenAI SDK (TypeScript)

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
    baseURL: 'http://localhost:3000/v1',
    apiKey: 'dummy'
});

const response = await client.chat.completions.create({
    model: 'glm-4.6',
    messages: [{ role: 'user', content: 'Hello!' }]
});
console.log(response.choices[0].message.content);
```

### Anthropic SDK (Python)

```python
from anthropic import Anthropic

client = Anthropic(
    base_url="http://localhost:3000",
    api_key="dummy"
)

message = client.messages.create(
    model="glm-4.6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
)
print(message.content[0].text)
```

### Anthropic SDK (TypeScript)

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
    baseURL: 'http://localhost:3000',
    apiKey: 'dummy'
});

const message = await client.messages.create({
    model: 'glm-4.6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: 'Hello!' }]
});
console.log(message.content[0].text);
```

### Google Generative AI SDK

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI({
    apiKey: 'dummy',
    baseUrl: 'http://localhost:3000'
});

const model = genAI.getGenerativeModel({ model: 'glm-4.6' });
const result = await model.generateContent('Hello!');
console.log(result.response.text());
```

---

## 🎯 Backend Configuration

### Claude Code Setup

When using Claude Code as the backend:

```bash
# .env file
ANTHROPIC_MODEL=glm-4.6
ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
ANTHROPIC_AUTH_TOKEN=your_token_here
```

**Features:**
- Access to Z.ai's GLM-4.6 model
- Anthropic API format backend
- Full streaming support
- Extended thinking/reasoning

---

### claude-code-router Setup

When using claude-code-router:

```bash
# .env file
OPENAI_API_KEY=sk-k2think-proxy-1760386095
OPENAI_BASE_URL=http://localhost:7000/v1
OPENAI_MODEL=MBZUAI-IFM/K2-Think
```

**Features:**
- Smart routing based on context
- Token counting and optimization
- Session management
- Cost optimization
- Multiple backend support

---

## 🔄 Request Flow

### Example: Gemini Request → Claude Code → Gemini Response

```
1. Client sends Gemini format request
   POST /v1/generateContent
   {
     "model": "glm-4.6",
     "contents": [{"role":"user","parts":[{"text":"Hello"}]}]
   }

2. droid2api detects format: "gemini"

3. Convert to internal OpenAI format
   {
     "model": "glm-4.6",
     "messages": [{"role":"user","content":"Hello"}]
   }

4. Route to Claude Code (Anthropic format)
   POST https://api.z.ai/api/anthropic
   {
     "model": "glm-4.6",
     "messages": [{"role":"user","content":"Hello"}]
   }

5. Receive response from Claude Code

6. Convert response to Gemini format
   {
     "candidates": [{
       "content": {"parts":[{"text":"..."}],"role":"model"},
       "finishReason": "STOP"
     }]
   }

7. Return to client in Gemini format
```

---

## 📊 Format Mapping Reference

### Request Parameters

| OpenAI | Anthropic | Gemini | Notes |
|--------|-----------|--------|-------|
| `messages` | `messages` | `contents` | Conversation history |
| `model` | `model` | `model` | Model identifier |
| `max_tokens` | `max_tokens` | `generationConfig.maxOutputTokens` | Max response length |
| `temperature` | `temperature` | `generationConfig.temperature` | Randomness (0-1) |
| `top_p` | `top_p` | `generationConfig.topP` | Nucleus sampling |
| `stop` | `stop_sequences` | `generationConfig.stopSequences` | Stop sequences |
| `stream` | `stream` | `generationConfig.stream` | Enable streaming |
| System message | `system` | `systemInstruction` | System prompt |

### Response Structure

| OpenAI | Anthropic | Gemini | Notes |
|--------|-----------|--------|-------|
| `choices[0].message.content` | `content[0].text` | `candidates[0].content.parts[0].text` | Response text |
| `choices[0].finish_reason` | `stop_reason` | `candidates[0].finishReason` | Why it stopped |
| `usage.prompt_tokens` | `usage.input_tokens` | `usageMetadata.promptTokenCount` | Input tokens |
| `usage.completion_tokens` | `usage.output_tokens` | `usageMetadata.candidatesTokenCount` | Output tokens |
| `usage.total_tokens` | (sum) | `usageMetadata.totalTokenCount` | Total tokens |

---

## 🛠️ Advanced Configuration

### Environment Variables

```bash
# Backend Selection (Priority Order)
# 1. Claude Code
ANTHROPIC_MODEL=glm-4.6
ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
ANTHROPIC_AUTH_TOKEN=your_token

# 2. claude-code-router
OPENAI_API_KEY=your_key
OPENAI_BASE_URL=http://localhost:7000/v1
OPENAI_MODEL=MBZUAI-IFM/K2-Think

# 3. Fallback to config.json (existing behavior)

# Server Configuration
PORT=3000
DEBUG=true
```

---

## 🧪 Testing

### Test All Formats

```bash
# OpenAI format
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"glm-4.6","messages":[{"role":"user","content":"Hi"}]}'

# Anthropic format
curl -X POST http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"glm-4.6","max_tokens":100,"messages":[{"role":"user","content":"Hi"}]}'

# Gemini format
curl -X POST http://localhost:3000/v1/generateContent \
  -H "Content-Type: application/json" \
  -d '{"model":"glm-4.6","contents":[{"role":"user","parts":[{"text":"Hi"}]}]}'
```

All three should work and return responses in their respective formats!

---

## 🎨 Architecture Diagram

```
┌────────────────────────────────────────────────────────────┐
│                    Client Applications                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐           │
│  │ OpenAI   │    │ Anthropic│    │  Gemini  │           │
│  │   SDK    │    │   SDK    │    │   SDK    │           │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘           │
└───────┼───────────────┼───────────────┼──────────────────┘
        │               │               │
        │ OpenAI fmt    │ Anthropic fmt │ Gemini fmt
        │               │               │
        └───────┬───────┴───────┬───────┘
                │               │
                ▼               ▼
       ┌────────────────────────────────────┐
       │   Universal API Gateway            │
       │      (droid2api:3000)              │
       ├────────────────────────────────────┤
       │  Format Detection                  │
       │  ├─ /v1/chat/completions → OpenAI │
       │  ├─ /v1/messages → Anthropic      │
       │  └─ /v1/generateContent → Gemini  │
       │                                    │
       │  Normalization to OpenAI (internal)│
       │                                    │
       │  Backend Selection                 │
       │  ├─ Claude Code?                  │
       │  ├─ claude-code-router?           │
       │  └─ config.json                   │
       │                                    │
       │  Response Transformation           │
       │  └─ Match input format            │
       └────────┬───────────────┬───────────┘
                │               │
      ┌─────────▼─────┐   ┌────▼────────────┐
      │  Claude Code  │   │ claude-code-    │
      │  (Z.ai GLM)   │   │   router        │
      │  Anthropic API│   │  OpenAI API     │
      └───────────────┘   └─────────────────┘
```

---

## 🚨 Troubleshooting

### "Cannot find module '@anthropic-ai/claude-code'"

**Solution**: Run `npm install` to install dependencies.

### "Backend not responding"

**Solution**: Check that your environment variables are set correctly:
```bash
echo $ANTHROPIC_BASE_URL
echo $ANTHROPIC_AUTH_TOKEN
# or
echo $OPENAI_BASE_URL
echo $OPENAI_API_KEY
```

### "Format conversion failed"

**Solution**: Enable debug logging:
```bash
DEBUG=true npm start
```

### "Streaming not working"

**Solution**: Ensure your client properly handles Server-Sent Events (SSE) and that `stream: true` is set in the request.

---

## 📚 Related Documentation

- [Claude Code Documentation](https://github.com/anthropics/claude-code)
- [claude-code-router Documentation](https://github.com/musistudio/claude-code-router)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Anthropic API Reference](https://docs.anthropic.com/claude/reference)
- [Gemini API Reference](https://ai.google.dev/api/rest)

---

## 🎉 Benefits

1. **Universal Compatibility**: Use any SDK with any backend
2. **Format Independence**: Switch formats without changing backend
3. **Backend Flexibility**: Easy switching between Claude Code and router
4. **Streaming Support**: Real-time responses in all formats
5. **Zero Lock-in**: Change providers anytime
6. **Cost Optimization**: Route to cheapest/best model per request
7. **Developer Experience**: Use familiar SDKs and tools

---

## 💡 Pro Tips

1. **Use with claude-code-router** for smart routing based on context
2. **Set DEBUG=true** during development to see format transformations
3. **Test all formats** to ensure compatibility
4. **Monitor token usage** across different backends
5. **Cache responses** for repeated queries (implement separately)
6. **Use streaming** for better user experience on long responses

---

Happy multi-format AI development! 🚀

