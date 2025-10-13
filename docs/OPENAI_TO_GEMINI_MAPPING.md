# OpenAI to Gemini API Format Mapping

## 1. Request Format Mapping

### Basic Request
```javascript
// OpenAI Format
{
  "model": "gpt-4",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant"},
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 2048,
  "stream": true
}

// Transforms to Gemini Format
{
  "contents": [
    {
      "role": "user",
      "parts": [{
        "text": "Hello!"
      }]
    }
  ],
  "systemInstruction": {
    "parts": [{
      "text": "You are a helpful assistant"
    }]
  },
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 2048
  }
}
```

### Role Mapping
```javascript
ROLE_MAPPING = {
  "user": "user",
  "assistant": "model",
  "system": null  // Goes to systemInstruction
}
```

### Content Format Mapping
```javascript
// OpenAI Text Content
{"content": "Hello world"}

// → Gemini Parts
{"parts": [{"text": "Hello world"}]}

// OpenAI Image Content
{
  "content": [
    {
      "type": "image_url",
      "image_url": {"url": "https://example.com/img.jpg"}
    },
    {
      "type": "text",
      "text": "Describe this image"
    }
  ]
}

// → Gemini Parts
{"parts": [
  {
    "inlineData": {
      "mimeType": "image/jpeg",
      "data": "base64_image_data"
    }
  },
  {
    "text": "Describe this image"
  }
]}
```

### Parameter Mapping
```javascript
PARAMETER_MAPPING = {
  // Temperature (same scale 0-1)
  "temperature": "temperature",
  
  // Top P (same scale 0-1)
  "top_p": "topP",
  
  // Max Tokens
  "max_tokens": "maxOutputTokens",
  
  // Stop Sequences
  "stop": "stopSequences",
  
  // Stream
  "stream": "stream",
  
  // N (number of completions)
  "n": "candidateCount"
}
```

### Function/Tool Mapping
```javascript
// OpenAI Tools
{
  "tools": [{
    "type": "function",
    "function": {
      "name": "get_weather",
      "description": "Get weather for location",
      "parameters": {
        "type": "object",
        "properties": {
          "location": {"type": "string"},
          "unit": {"type": "string", "enum": ["C", "F"]}
        }
      }
    }
  }]
}

// → Gemini Tools
{
  "tools": [{
    "functionDeclarations": [{
      "name": "get_weather",
      "description": "Get weather for location",
      "parameters": {
        "type": "object",
        "properties": {
          "location": {"type": "string"},
          "unit": {"type": "string", "enum": ["C", "F"]}
        }
      }
    }]
  }]
}
```

## 2. Response Format Mapping

### Basic Response
```javascript
// Gemini Response
{
  "candidates": [{
    "content": {
      "role": "model",
      "parts": [{
        "text": "Hello! How can I help?"
      }]
    },
    "finishReason": "STOP"
  }],
  "usageMetadata": {
    "promptTokenCount": 123,
    "candidatesTokenCount": 456,
    "totalTokenCount": 579
  }
}

// → OpenAI Format
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1702255200,
  "model": "gemini-2.5-pro",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help?"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 123,
    "completion_tokens": 456,
    "total_tokens": 579
  }
}
```

### Streaming Response Mapping
```javascript
// Gemini Stream Chunk
{
  "candidates": [{
    "content": {
      "parts": [{
        "text": "Hello"
      }]
    }
  }]
}

// → OpenAI Stream Format
data: {
  "id": "chatcmpl-123",
  "object": "chat.completion.chunk",
  "created": 1702255200,
  "model": "gemini-2.5-pro",
  "choices": [{
    "index": 0,
    "delta": {
      "content": "Hello"
    }
  }]
}
```

### Function Call Response Mapping
```javascript
// Gemini Function Call
{
  "candidates": [{
    "content": {
      "parts": [{
        "functionCall": {
          "name": "get_weather",
          "args": {
            "location": "London",
            "unit": "C"
          }
        }
      }]
    }
  }]
}

// → OpenAI Function Call
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": null,
      "function_call": {
        "name": "get_weather",
        "arguments": "{\"location\": \"London\", \"unit\": \"C\"}"
      }
    }
  }]
}
```

### Finish Reason Mapping
```javascript
FINISH_REASON_MAPPING = {
  "STOP": "stop",
  "MAX_TOKENS": "length",
  "SAFETY": "content_filter",
  "RECITATION": "content_filter",
  "OTHER": null
}
```

## 3. Error Mapping

```javascript
// Gemini Error
{
  "error": {
    "code": 400,
    "message": "Invalid argument",
    "status": "INVALID_ARGUMENT"
  }
}

// → OpenAI Error
{
  "error": {
    "message": "Invalid argument",
    "type": "invalid_request_error",
    "code": 400
  }
}

ERROR_TYPE_MAPPING = {
  "INVALID_ARGUMENT": "invalid_request_error",
  "FAILED_PRECONDITION": "invalid_request_error",
  "OUT_OF_RANGE": "invalid_request_error",
  "UNAUTHENTICATED": "authentication_error",
  "PERMISSION_DENIED": "permission_error",
  "RESOURCE_EXHAUSTED": "rate_limit_error",
  "CANCELLED": "timeout_error",
  "UNAVAILABLE": "service_unavailable"
}
```

## 4. Special Features

### Thinking/Reasoning Support
```javascript
// OpenAI thinking parameter
{
  "thinking": true,
  "thinking_config": {
    "level": "medium"
  }
}

// → Gemini thoughtConfig
{
  "thoughtConfig": {
    "type": "enabled",
    "budget_tokens": 12288  // medium level
  }
}

THINKING_BUDGET_MAPPING = {
  "low": 4096,
  "medium": 12288,
  "high": 24576
}
```

### Model Name Mapping
```javascript
MODEL_MAPPING = {
  // Fast models
  "gpt-3.5-turbo": "gemini-2.5-flash",
  "gpt-3.5-turbo-16k": "gemini-2.5-flash",
  
  // Pro models
  "gpt-4": "gemini-2.5-pro",
  "gpt-4-32k": "gemini-2.5-pro",
  
  // Thinking models
  "gpt-4-turbo": "gemini-2.5-pro-thinking",
  
  // Long context
  "gpt-4-turbo-128k": "gemini-2.5-pro"  // Gemini supports 2M!
}
```

## 5. Key Differences

### Authentication
- OpenAI: `Authorization: Bearer sk-xxx`
- Gemini: `x-goog-api-key: AIzaXXX`

### Message Structure
- OpenAI: Flat `messages` array
- Gemini: `contents` with nested `parts`

### System Messages
- OpenAI: System role in messages array
- Gemini: Separate `systemInstruction` object

### Roles
- OpenAI: `user`, `assistant`, `system`
- Gemini: `user`, `model` (no system in contents)

### Streaming Format
- OpenAI: `data: {...}\n\n` with delta chunks
- Gemini: JSON objects with full content parts

