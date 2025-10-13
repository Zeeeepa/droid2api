# Gemini API Integration Guide

## Overview
This guide covers the complete Gemini API integration in droid2api, enabling OpenAI-compatible access to Google's Gemini models.

## Supported Models

| Model Name | Model ID | Reasoning Support | Use Case |
|-----------|----------|-------------------|----------|
| Gemini 2.5 Flash | `gemini-2.5-flash` | Off | Fast responses, general tasks |
| Gemini 2.5 Flash Lite | `gemini-2.5-flash-lite` | Off | Lightweight, high-speed tasks |
| Gemini 2.5 Pro | `gemini-2.5-pro` | Auto | Complex reasoning, advanced tasks |
| Gemini 2.0 Flash Thinking | `gemini-2.0-flash-thinking` | Medium | Balanced thinking mode |
| Gemini 2.5 Pro Thinking | `gemini-2.5-pro-thinking` | High | Deep reasoning, complex problems |

## Configuration

### Environment Setup
```bash
# Set your Gemini API key
export GEMINI_API_KEY="your-api-key-here"

# Or use in .env file
GEMINI_API_KEY=your-api-key-here
```

### Model Configuration (config.json)
```json
{
  "endpoint": [
    {
      "name": "gemini",
      "base_url": "https://generativelanguage.googleapis.com/v1beta/models"
    }
  ],
  "models": [
    {
      "name": "Gemini 2.5 Flash",
      "id": "gemini-2.5-flash",
      "type": "gemini",
      "reasoning": "off"
    }
  ]
}
```

## Usage Examples

### Basic Chat Completion
```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GEMINI_API_KEY" \
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      {"role": "user", "content": "Explain quantum computing in simple terms"}
    ],
    "max_tokens": 500
  }'
```

### Streaming Response
```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GEMINI_API_KEY" \
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      {"role": "user", "content": "Write a short story about AI"}
    ],
    "stream": true
  }'
```

### With Thinking/Reasoning
```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GEMINI_API_KEY" \
  -d '{
    "model": "gemini-2.5-pro-thinking",
    "messages": [
      {"role": "user", "content": "Solve this logic puzzle: ..."}
    ],
    "reasoning_effort": "high",
    "max_tokens": 2000
  }'
```

### With Image Input
```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GEMINI_API_KEY" \
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      {
        "role": "user",
        "content": [
          {"type": "text", "text": "What is in this image?"},
          {
            "type": "image_url",
            "image_url": {
              "url": "https://example.com/image.jpg"
            }
          }
        ]
      }
    ]
  }'
```

### Function Calling
```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GEMINI_API_KEY" \
  -d '{
    "model": "gemini-2.5-pro",
    "messages": [
      {"role": "user", "content": "What is the weather in San Francisco?"}
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "Get current weather for a location",
          "parameters": {
            "type": "object",
            "properties": {
              "location": {
                "type": "string",
                "description": "City name"
              }
            },
            "required": ["location"]
          }
        }
      }
    ]
  }'
```

## Python SDK Example

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="your-gemini-api-key"
)

# Basic completion
response = client.chat.completions.create(
    model="gemini-2.5-flash",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)
print(response.choices[0].message.content)

# Streaming
stream = client.chat.completions.create(
    model="gemini-2.5-flash",
    messages=[{"role": "user", "content": "Count to 10"}],
    stream=True
)
for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

## JavaScript/TypeScript Example

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
    baseURL: 'http://localhost:3000/v1',
    apiKey: process.env.GEMINI_API_KEY
});

async function main() {
    // Basic completion
    const completion = await client.chat.completions.create({
        model: 'gemini-2.5-flash',
        messages: [{ role: 'user', content: 'Hello!' }]
    });
    console.log(completion.choices[0].message.content);

    // Streaming
    const stream = await client.chat.completions.create({
        model: 'gemini-2.5-flash',
        messages: [{ role: 'user', content: 'Count to 10' }],
        stream: true
    });
    
    for await (const chunk of stream) {
        process.stdout.write(chunk.choices[0]?.delta?.content || '');
    }
}

main();
```

## Feature Support Matrix

| Feature | Supported | Notes |
|---------|-----------|-------|
| Text completion | ✅ | Full support |
| Streaming | ✅ | Server-sent events |
| Function calling | ✅ | OpenAI format converted to Gemini tools |
| Image input | ✅ | URLs automatically converted to base64 |
| System messages | ✅ | Converted to systemInstruction |
| Thinking/Reasoning | ✅ | Via thoughtConfig |
| Temperature | ✅ | 0.0 - 2.0 |
| Max tokens | ✅ | Maps to maxOutputTokens |
| Stop sequences | ✅ | Maps to stopSequences |
| Top-p | ✅ | Maps to topP |
| Top-k | ✅ | Gemini-specific parameter |

## Reasoning Levels

The `reasoning` configuration in model definitions controls thinking behavior:

- **`off`**: No explicit reasoning, fastest responses
- **`auto`**: Automatic reasoning when beneficial
- **`low`**: Light thinking, token budget ~1K
- **`medium`**: Balanced thinking, token budget ~5K
- **`high`**: Deep reasoning, token budget ~10K+

When making requests, you can override this with the `reasoning_effort` parameter:

```json
{
  "model": "gemini-2.5-pro",
  "messages": [...],
  "reasoning_effort": "high"  // Overrides model default
}
```

## Error Handling

The integration includes comprehensive error handling:

```javascript
try {
    const response = await client.chat.completions.create({...});
} catch (error) {
    if (error.status === 400) {
        console.error('Invalid request:', error.message);
    } else if (error.status === 401) {
        console.error('Invalid API key');
    } else if (error.status === 429) {
        console.error('Rate limit exceeded');
    }
}
```

## Rate Limits

Gemini API has the following limits:
- Free tier: 15 RPM (requests per minute)
- Paid tier: Varies by model and subscription

The proxy automatically includes proper headers and handles rate limit responses.

## Debugging

Enable debug mode to see request/response transformation:

```bash
export DEBUG=true
npm start
```

This will log:
- Original OpenAI-format requests
- Transformed Gemini requests
- Raw Gemini responses
- Transformed OpenAI-format responses

## Architecture Notes

### Request Flow
1. Client sends OpenAI-format request
2. `transformToGemini()` converts to Gemini format
3. URL constructed with model name: `/{model}:generateContent`
4. Request sent to Gemini API
5. Response transformed back to OpenAI format

### Key Components
- **`transformers/request-gemini.js`**: OpenAI → Gemini conversion
- **`transformers/response-gemini.js`**: Gemini → OpenAI conversion
- **`routes.js`**: Request routing and URL construction
- **`config.json`**: Model and endpoint configuration

## Troubleshooting

### API Key Issues
```bash
# Verify API key is set
echo $GEMINI_API_KEY

# Test directly with Gemini API
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

### Model Not Found
- Verify model ID matches exactly in config.json
- Check that model type is set to "gemini"
- Ensure endpoint is configured correctly

### Streaming Issues
- Gemini uses `streamGenerateContent` endpoint for streaming
- Verify Content-Type is `text/event-stream`
- Check that transformer is properly handling chunks

## Performance Tips

1. **Use Flash models for speed**: `gemini-2.5-flash` is fastest
2. **Enable streaming**: Better user experience for long responses
3. **Optimize reasoning**: Use lower levels for simple tasks
4. **Cache system messages**: Reduces repeated instructions
5. **Batch requests**: Use concurrent requests when possible

## Comparison with Other Models

| Aspect | Gemini 2.5 Pro | Claude Opus 4.1 | GPT-4 |
|--------|---------------|-----------------|-------|
| Speed | Fast | Medium | Medium |
| Reasoning | Excellent | Excellent | Very Good |
| Cost | Low | High | Medium |
| Context | 2M tokens | 200K tokens | 128K tokens |
| Vision | Yes | Yes | Yes |

## Future Enhancements

Planned improvements:
- [ ] Caching support for repeated prompts
- [ ] Automatic retry with exponential backoff
- [ ] Request queuing for rate limit management
- [ ] Token usage analytics
- [ ] Response caching
- [ ] Multi-region endpoint support

## Related Documentation

- [Gemini API Specification](./GEMINI_API_SPEC.md)
- [OpenAI to Gemini Mapping](./OPENAI_TO_GEMINI_MAPPING.md)
- [Main README](../README.md)

