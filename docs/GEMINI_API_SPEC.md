# Gemini API Specification

## 1. Base URL & Endpoints

```
Base URL: https://generativelanguage.googleapis.com/v1beta

Endpoints:
- POST /models/{model}:generateContent        # Non-streaming
- POST /models/{model}:streamGenerateContent  # Streaming
- POST /models/{model}:countTokens            # Token counting
```

## 2. Authentication

```
Header: x-goog-api-key: YOUR_API_KEY
(NOT Authorization: Bearer - different from OpenAI/Anthropic)
```

## 3. Request Format

### Basic Request
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "Write a story about a magic tree"
        }
      ]
    }
  ],
  "systemInstruction": {
    "parts": [{
      "text": "You are a helpful assistant..."
    }]
  },
  "generationConfig": {
    "temperature": 0.7,
    "topP": 0.8,
    "topK": 40,
    "maxOutputTokens": 2048,
    "candidateCount": 1,
    "stopSequences": ["END"]
  },
  "thoughtConfig": {
    "type": "enabled",
    "budget_tokens": 12288
  }
}
```

### Multi-turn Conversation
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [{ "text": "Hi there!" }]
    },
    {
      "role": "model",
      "parts": [{ "text": "Hello! How can I help you today?" }]
    },
    {
      "role": "user", 
      "parts": [{ "text": "Tell me about quantum computing" }]
    }
  ]
}
```

### Function Calling
```json
{
  "contents": [...],
  "tools": [
    {
      "functionDeclarations": [
        {
          "name": "get_weather",
          "description": "Get current weather for a location",
          "parameters": {
            "type": "object",
            "properties": {
              "location": {
                "type": "string",
                "description": "City name"
              },
              "unit": {
                "type": "string",
                "enum": ["celsius", "fahrenheit"]
              }
            },
            "required": ["location"]
          }
        }
      ]
    }
  ]
}
```

### Image Input
```json
{
  "contents": [{
    "role": "user",
    "parts": [
      {
        "inlineData": {
          "mimeType": "image/jpeg",
          "data": "base64_encoded_image_data"
        }
      },
      {
        "text": "Describe this image"
      }
    ]
  }]
}
```

## 4. Response Format

### Non-streaming Response
```json
{
  "candidates": [
    {
      "content": {
        "role": "model",
        "parts": [
          {
            "text": "Once upon a time..."
          }
        ]
      },
      "finishReason": "STOP",
      "index": 0,
      "safetyRatings": [...],
      "citationMetadata": {...}
    }
  ],
  "promptFeedback": {
    "safetyRatings": [...]
  },
  "usageMetadata": {
    "promptTokenCount": 123,
    "candidatesTokenCount": 456,
    "totalTokenCount": 579
  }
}
```

### Streaming Response
Each SSE chunk contains a JSON object:

```json
// Chunk 1
{
  "candidates": [{
    "content": {
      "role": "model",
      "parts": [{"text": "Once"}]
    },
    "index": 0
  }]
}

// Chunk 2
{
  "candidates": [{
    "content": {
      "parts": [{"text": " upon"}]
    },
    "index": 0
  }]
}

// Final chunk with usage
{
  "candidates": [{
    "content": {
      "parts": [{"text": " a time..."}]
    },
    "finishReason": "STOP",
    "index": 0
  }],
  "usageMetadata": {
    "promptTokenCount": 123,
    "candidatesTokenCount": 456,
    "totalTokenCount": 579
  }
}
```

### Function Call Response
```json
{
  "candidates": [{
    "content": {
      "role": "model",
      "parts": [{
        "functionCall": {
          "name": "get_weather",
          "args": {
            "location": "London",
            "unit": "celsius"
          }
        }
      }]
    },
    "finishReason": "STOP"
  }]
}
```

## 5. Error Responses

```json
{
  "error": {
    "code": 400,
    "message": "Invalid value at 'contents' (type.googleapis.com/google.ai.generativelanguage.v1beta.Content), \"Invalid content format\"",
    "status": "INVALID_ARGUMENT",
    "details": [...]
  }
}
```

## 6. Thinking/Reasoning Configuration

```json
// Basic thinking enabled
{
  "thoughtConfig": {
    "type": "enabled"
  }
}

// Thinking with token budget
{
  "thoughtConfig": {
    "type": "enabled",
    "budget_tokens": 12288  // Medium reasoning (12k tokens)
  }
}

// Token budgets by level:
// - low: 4096 tokens
// - medium: 12288 tokens
// - high: 24576 tokens
```

## 7. Model Types

```
Text Generation:
- gemini-2.5-flash
- gemini-2.5-flash-lite
- gemini-2.5-pro

Thinking/Reasoning:
- gemini-2.0-flash-thinking
- gemini-2.5-pro-thinking

Long Context:
- gemini-2.5-pro-long  // Up to 2M tokens
```

## 8. Finish Reasons

```
STOP - Natural completion
MAX_TOKENS - Reached token limit
SAFETY - Safety filters triggered
RECITATION - Recitation detected
OTHER - Other reason
```

## 9. Rate Limits

```
Default Limits:
- Requests per minute (RPM): 60
- Tokens per minute (TPM): 240,000
- Maximum request size: 5MB
- Maximum response size: 5MB
```

## 10. Best Practices

1. **Token Management**
   - Use countTokens endpoint before large requests
   - Monitor usageMetadata in responses
   - Stay within TPM limits

2. **Error Handling**
   - Implement exponential backoff for rate limits
   - Handle streaming disconnections gracefully
   - Validate content format before sending

3. **Performance**
   - Use streaming for real-time responses
   - Batch related requests when possible
   - Cache responses when appropriate

4. **Safety**
   - Check safetyRatings in responses
   - Implement content filtering if needed
   - Monitor promptFeedback for issues

