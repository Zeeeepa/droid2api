# 🚀 Gemini API Support for droid2api

This upgrade adds native Google Gemini API format support to droid2api, making it a **universal AI API gateway** that supports OpenAI, Anthropic, and Gemini formats simultaneously.

---

## ✨ What's New

### Multi-Format API Gateway

droid2api now accepts requests in **three different API formats** and routes them all to your configured backend (Z.ai, Anthropic Claude, OpenAI, etc.):

1. **OpenAI API Format** - `/v1/chat/completions`
2. **Anthropic API Format** - `/v1/messages`  
3. **Gemini API Format** - `/v1/generateContent` ⭐ NEW!

### Smart Format Conversion

- **Request Transformation**: Gemini format → OpenAI (internal) → Backend
- **Response Transformation**: Backend → OpenAI (internal) → Gemini format
- **Zero Data Loss**: All parameters and content preserved accurately
- **Streaming Support**: Full Server-Sent Events (SSE) streaming for Gemini

---

## 📦 Installation

### Quick Install

```bash
# 1. Ensure you're in droid2api root directory
cd /path/to/droid2api

# 2. Run the installer
./install-gemini-support.sh

# 3. Restart droid2api
npm start
```

### Manual Installation

If you prefer manual installation:

1. **Copy transformer files**:
   ```bash
   # Files should be in transformers/
   ls transformers/request-gemini.js
   ls transformers/response-gemini.js
   ```

2. **Add imports to routes.js** (after existing transformer imports):
   ```javascript
   import { geminiToOpenAI, openaiToGemini } from './transformers/request-gemini.js';
   import { GeminiResponseTransformer } from './transformers/response-gemini.js';
   ```

3. **Add Gemini route** (before `export default router`):
   ```javascript
   router.post('/v1/generateContent', async (req, res) => {
     // See routes-gemini-upgrade.js for complete implementation
   });
   ```

4. **Restart droid2api**

---

## 🎯 Usage Examples

### Basic Text Generation

```bash
curl -X POST http://localhost:3000/v1/generateContent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "contents": [{
      "role": "user",
      "parts": [{"text": "Explain quantum computing in simple terms"}]
    }],
    "generationConfig": {
      "maxOutputTokens": 1000,
      "temperature": 0.7
    }
  }'
```

### Streaming Response

```bash
curl -X POST http://localhost:3000/v1/generateContent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "contents": [{
      "role": "user",
      "parts": [{"text": "Count from 1 to 10"}]
    }],
    "generationConfig": {
      "stream": true
    }
  }'
```

### With System Instructions

```bash
curl -X POST http://localhost:3000/v1/generateContent \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "systemInstruction": {
      "parts": [{"text": "You are a helpful AI assistant specialized in Python programming"}]
    },
    "contents": [{
      "role": "user",
      "parts": [{"text": "How do I read a CSV file in Python?"}]
    }]
  }'
```

### Multi-Modal (Text + Images)

```bash
curl -X POST http://localhost:3000/v1/generateContent \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "contents": [{
      "role": "user",
      "parts": [
        {"text": "What do you see in this image?"},
        {
          "inlineData": {
            "mimeType": "image/jpeg",
            "data": "BASE64_ENCODED_IMAGE_DATA"
          }
        }
      ]
    }]
  }'
```

---

## 🔄 API Format Mapping

### Request Parameters

| Gemini | OpenAI (Internal) | Description |
|--------|-------------------|-------------|
| `contents` | `messages` | Conversation history |
| `contents[].role` | `messages[].role` | `user`/`model` → `user`/`assistant` |
| `contents[].parts[].text` | `messages[].content` | Text content |
| `systemInstruction` | First message with `role: system` | System prompt |
| `generationConfig.maxOutputTokens` | `max_tokens` | Max response length |
| `generationConfig.temperature` | `temperature` | Randomness (0-1) |
| `generationConfig.topP` | `top_p` | Nucleus sampling |
| `generationConfig.stopSequences` | `stop` | Stop sequences |
| `generationConfig.stream` | `stream` | Enable streaming |

### Response Format

| OpenAI (Internal) | Gemini | Description |
|-------------------|--------|-------------|
| `choices[0].message.content` | `candidates[0].content.parts[0].text` | Response text |
| `choices[0].finish_reason` | `candidates[0].finishReason` | Why it stopped |
| `usage.prompt_tokens` | `usageMetadata.promptTokenCount` | Input tokens |
| `usage.completion_tokens` | `usageMetadata.candidatesTokenCount` | Output tokens |
| `usage.total_tokens` | `usageMetadata.totalTokenCount` | Total tokens |

### Finish Reasons

| OpenAI | Gemini | Description |
|--------|--------|-------------|
| `stop` | `STOP` | Natural completion |
| `length` | `MAX_TOKENS` | Hit token limit |
| `content_filter` | `SAFETY` | Safety filter triggered |
| `tool_calls` | `STOP` | Function call made |

---

## 🏗️ Architecture

### Request Flow

```
Client (Gemini SDK)
        ↓
POST /v1/generateContent
        ↓
geminiToOpenAI() transformer
        ↓
OpenAI format (internal)
        ↓
Existing droid2api logic
        ↓
Backend API (Z.ai, Claude, etc.)
        ↓
Backend response
        ↓
openaiToGemini() transformer
        ↓
Gemini format response
        ↓
Client receives Gemini response
```

### Streaming Flow

```
Client → Gemini request → geminiToOpenAI()
        ↓
Backend streaming SSE chunks
        ↓
GeminiResponseTransformer.transformStream()
        ↓
Convert each OpenAI chunk → Gemini chunk
        ↓
Client receives Gemini SSE stream
```

---

## 🧪 Testing

### Test All Three Formats

```bash
# OpenAI format
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4","messages":[{"role":"user","content":"Hello"}]}'

# Anthropic format
curl -X POST http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-sonnet-4","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}'

# Gemini format
curl -X POST http://localhost:3000/v1/generateContent \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4","contents":[{"role":"user","parts":[{"text":"Hello"}]}]}'
```

All three should return responses with the same content but in different formats!

---

## 🔧 Configuration

### Z.ai Example

```json
{
  "port": 3000,
  "models": [{
    "name": "GLM-4.6",
    "id": "glm-4.6",
    "type": "anthropic"
  }],
  "endpoint": [{
    "name": "anthropic",
    "base_url": "https://api.z.ai/api/anthropic/v1/messages"
  }],
  "model_redirects": {
    "claude-sonnet-4-20250514": "glm-4.6",
    "gemini-pro": "glm-4.6",
    "gpt-4": "glm-4.6"
  }
}
```

### .env

```bash
FACTORY_API_KEY=your_zai_api_key_here
```

---

## 📊 Supported Features

### ✅ Fully Supported

- ✅ Text generation (streaming & non-streaming)
- ✅ Multi-turn conversations
- ✅ System instructions
- ✅ Generation config (temperature, maxTokens, topP, stop)
- ✅ Multi-modal input (text + images via base64)
- ✅ Token counting and usage metadata
- ✅ Finish reasons
- ✅ Model aliases/redirects

### ⚠️ Partially Supported

- ⚠️ Tool/function calling (converted but may need backend support)
- ⚠️ Safety ratings (returned empty, depends on backend)
- ⚠️ Citation metadata (depends on backend capability)

### ❌ Not Supported

- ❌ Gemini-specific safety settings (no equivalent in OpenAI/Anthropic)
- ❌ Gemini topK parameter (not available in OpenAI API)
- ❌ Grounding with Google Search (backend-specific feature)

---

## 🐛 Troubleshooting

### "Cannot find module './transformers/request-gemini.js'"

**Solution:** Ensure the Gemini transformer files exist:
```bash
ls -la transformers/request-gemini.js
ls -la transformers/response-gemini.js
```

### Gemini endpoint returns 404

**Solution:** Run the installer or manually add the route:
```bash
./install-gemini-support.sh
```

### Streaming doesn't work

**Solution:** Ensure your backend supports streaming and that `generationConfig.stream` is set to `true`.

### Token counts don't match

**Solution:** This is normal - different formats may count tokens slightly differently. The backend's count is authoritative.

---

## 🎯 Use Cases

### 1. Universal SDK Support

Use **any AI SDK** with droid2api:

```javascript
// Google AI SDK
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI({ 
  apiKey: "YOUR_KEY",
  baseUrl: "http://localhost:3000"
});

// OpenAI SDK
import OpenAI from "openai";
const openai = new OpenAI({ 
  apiKey: "YOUR_KEY",
  baseURL: "http://localhost:3000/v1"
});

// Anthropic SDK
import Anthropic from "@anthropic-ai/sdk";
const anthropic = new Anthropic({
  apiKey: "YOUR_KEY",
  baseURL: "http://localhost:3000"
});
```

### 2. Backend Flexibility

Switch between backends without changing client code:

```bash
# Use Z.ai's GLM-4.6
BACKEND=zai npm start

# Use Anthropic Claude
BACKEND=anthropic npm start

# Use OpenAI
BACKEND=openai npm start
```

### 3. Cost Optimization

Route different formats to different backends based on cost:

- Gemini SDK users → Z.ai (cheaper)
- OpenAI SDK users → OpenAI (familiar)
- Anthropic SDK users → Claude (best quality)

---

## 📚 Related Documentation

- [Gemini API Reference](https://ai.google.dev/api/rest)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Anthropic API Reference](https://docs.anthropic.com/claude/reference)
- [droid2api Main README](./README.md)

---

## 🤝 Contributing

Found a bug or want to improve Gemini support? Please open an issue or PR!

---

## 📝 License

Same as droid2api main project.

---

## 🎉 Credits

Gemini API support developed to enable universal AI API gateway functionality with full format conversion and streaming support.

**Happy multi-format AI development!** 🚀

