# 🧪 droid2api v2.0 Testing Guide

Complete testing suite for the Universal API Gateway supporting OpenAI, Anthropic, and Gemini formats.

---

## 📋 Test Suite Overview

| Test File | Format | Tool | What It Tests |
|-----------|--------|------|---------------|
| `test_all_endpoints.sh` | All 3 | Bash/cURL | Core API endpoints with JSON validation |
| `test_openai.py` | OpenAI | Python SDK | OpenAI SDK integration & streaming |
| `test_anthropic.py` | Anthropic | Python SDK | Anthropic SDK integration & multi-turn |
| `test_gemini.py` | Gemini | Python SDK | Gemini SDK integration & chat |
| `run_all_tests.sh` | All 3 | Master Runner | Runs all tests in sequence |

---

## 🚀 Quick Start

### Option 1: Run All Tests

```bash
# Install Python dependencies
pip install -r test_requirements.txt

# Run complete test suite
chmod +x run_all_tests.sh
./run_all_tests.sh
```

### Option 2: Run Individual Tests

```bash
# Bash/cURL tests
chmod +x test_all_endpoints.sh
./test_all_endpoints.sh

# OpenAI Python SDK
python3 test_openai.py

# Anthropic Python SDK
python3 test_anthropic.py

# Gemini Python SDK
python3 test_gemini.py
```

---

## 📦 Prerequisites

### Required

- **Node.js** 18+ (for running droid2api)
- **Bash** (for shell scripts)
- **curl** (for HTTP requests)
- **jq** (for JSON parsing)

```bash
# Install jq on Ubuntu/Debian
sudo apt-get install jq

# Install jq on macOS
brew install jq
```

### Optional (for Python tests)

- **Python 3.8+**
- **pip** (Python package manager)

```bash
# Install Python dependencies
pip install -r test_requirements.txt

# Or install individually
pip install openai anthropic google-generativeai
```

---

## 🔧 Configuration

All tests use environment variables for configuration:

```bash
# Port (default: 3000)
export PORT=3000

# Model to test (default: glm-4.6)
export MODEL=glm-4.6

# Authentication token (default: any)
export AUTH_TOKEN=your_token_here
```

**Example:**
```bash
export PORT=3000
export MODEL=claude-sonnet-4
export AUTH_TOKEN=my-secret-token

./run_all_tests.sh
```

---

## 📋 Test 1: Bash/cURL Tests

**File**: `test_all_endpoints.sh`

Tests all endpoints using raw HTTP requests with cURL.

### What It Tests

1. ✅ **OpenAI format** - `/v1/chat/completions`
2. ✅ **Anthropic format** - `/v1/messages`
3. ✅ **Gemini format** - `/v1/generateContent`
4. ✅ **Models endpoint** - `/v1/models`

### Run

```bash
chmod +x test_all_endpoints.sh
./test_all_endpoints.sh
```

### Example Output

```
=========================================
🧪 Testing droid2api Universal Gateway
=========================================
Base URL: http://localhost:3000
Model: glm-4.6
=========================================

✓ Server is running

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Test 1: OpenAI Chat Completions Format
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Endpoint: POST /v1/chat/completions
Expected Response: OpenAI format

Response:
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Python is a high-level programming language."
    },
    "finish_reason": "stop"
  }],
  "usage": {...}
}

✓ OpenAI format validated
✓ Response content: Python is a high-level programming language.

[... more tests ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 All tests passed! Universal Gateway is working!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🐍 Test 2: OpenAI Python SDK

**File**: `test_openai.py`

Tests using the official OpenAI Python SDK.

### What It Tests

1. ✅ **Non-streaming chat** - Basic request/response
2. ✅ **Streaming response** - Real-time token streaming
3. ✅ **Response metadata** - Usage stats, finish reason
4. ✅ **SDK compatibility** - Works with official SDK

### Run

```bash
python3 test_openai.py
```

### Example Code

```python
from openai import OpenAI

client = OpenAI(
    base_url=f"http://localhost:{PORT}/v1",
    api_key="any"
)

response = client.chat.completions.create(
    model="glm-4.6",
    messages=[{
        "role": "user",
        "content": "What is Python?"
    }],
    stream=False
)

print(response.choices[0].message.content)
```

### Example Output

```
==================================================
🧪 Testing OpenAI Chat Completions Format
==================================================
Base URL: http://localhost:3000/v1
Model: glm-4.6
==================================================

Sending request to /v1/chat/completions...

Response received!

──────────────────────────────────────────────────
Response Content:
──────────────────────────────────────────────────
Python is a high-level, interpreted programming language.
──────────────────────────────────────────────────

Response Metadata:
  ID: chatcmpl-123
  Model: glm-4.6
  Finish Reason: stop
  Tokens Used:
    Prompt: 15
    Completion: 12
    Total: 27

✅ OpenAI format test PASSED!

[... streaming test ...]

==================================================
🎉 OpenAI format tests complete!
==================================================
```

---

## 🐍 Test 3: Anthropic Python SDK

**File**: `test_anthropic.py`

Tests using the official Anthropic Python SDK.

### What It Tests

1. ✅ **Non-streaming messages** - Basic request/response
2. ✅ **Streaming response** - Real-time token streaming
3. ✅ **Multi-turn conversation** - Context handling
4. ✅ **Response metadata** - Token usage, stop reason

### Run

```bash
python3 test_anthropic.py
```

### Example Code

```python
from anthropic import Anthropic

client = Anthropic(
    base_url=f"http://localhost:{PORT}",
    api_key="any"
)

response = client.messages.create(
    model="glm-4.6",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": "What is Python?"
    }]
)

print(response.content[0].text)
```

### Example Output

```
==================================================
🧪 Testing Anthropic Messages Format
==================================================
Base URL: http://localhost:3000
Model: glm-4.6
==================================================

Sending request to /v1/messages...

Response received!

──────────────────────────────────────────────────
Response Content:
──────────────────────────────────────────────────
Python is a high-level, interpreted programming language.
──────────────────────────────────────────────────

Response Metadata:
  ID: msg_123
  Model: glm-4.6
  Role: assistant
  Stop Reason: end_turn
  Tokens Used:
    Input: 15
    Output: 12

✅ Anthropic format test PASSED!

[... streaming and multi-turn tests ...]

==================================================
🎉 Anthropic format tests complete!
==================================================
```

---

## 🐍 Test 4: Gemini Python SDK

**File**: `test_gemini.py`

Tests using the official Google Gemini SDK.

### What It Tests

1. ✅ **Non-streaming generation** - Basic request/response
2. ✅ **Streaming response** - Real-time chunk streaming
3. ✅ **Multi-turn chat** - Conversation history
4. ✅ **System instructions** - Role-based responses

### Run

```bash
python3 test_gemini.py
```

### Example Code

```python
import google.generativeai as genai

genai.configure(
    api_key="any",
    transport="rest",
    client_options={"api_endpoint": f"http://localhost:{PORT}"}
)

model = genai.GenerativeModel("glm-4.6")
response = model.generate_content("What is Python?")

print(response.text)
```

### Example Output

```
==================================================
🧪 Testing Gemini GenerateContent Format
==================================================
Base URL: http://localhost:3000
Model: glm-4.6
==================================================

Initializing Gemini model...
Sending request to /v1/generateContent...

Response received!

──────────────────────────────────────────────────
Response Content:
──────────────────────────────────────────────────
Python is a high-level, interpreted programming language.
──────────────────────────────────────────────────

Response Metadata:
  Finish Reason: STOP
  Safety Ratings: 4 categories
  Tokens Used:
    Prompt: 15
    Candidates: 12
    Total: 27

✅ Gemini format test PASSED!

[... streaming, chat, and system instruction tests ...]

==================================================
🎉 Gemini format tests complete!
==================================================
```

---

## 🎯 Complete Test Suite

**File**: `run_all_tests.sh`

Master test runner that executes all tests in sequence.

### Features

- ✅ Runs all bash and Python tests
- ✅ Checks for dependencies
- ✅ Provides detailed error reporting
- ✅ Color-coded output
- ✅ Final summary with pass/fail status

### Run

```bash
chmod +x run_all_tests.sh
./run_all_tests.sh
```

### Example Output

```
=========================================
🧪 droid2api v2.0 Complete Test Suite
=========================================

✓ Python 3 found: Python 3.10.12
✓ All dependencies installed

Configuration:
  Port: 3000
  Model: glm-4.6
  Auth Token: any

=========================================

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Running Bash/cURL Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[... bash tests output ...]

✓ Bash tests completed successfully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🐍 Running OpenAI Python SDK Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[... OpenAI tests output ...]

✓ OpenAI tests completed successfully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🐍 Running Anthropic Python SDK Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[... Anthropic tests output ...]

✓ Anthropic tests completed successfully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🐍 Running Gemini Python SDK Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[... Gemini tests output ...]

✓ Gemini tests completed successfully

=========================================
📊 Complete Test Summary
=========================================

✓ Bash/cURL Tests: PASSED
✓ OpenAI Python SDK Tests: PASSED
✓ Anthropic Python SDK Tests: PASSED
✓ Gemini Python SDK Tests: PASSED

=========================================
🎉 ALL TESTS PASSED!
Universal Gateway is working perfectly!
=========================================
```

---

## 🐛 Troubleshooting

### Issue: "Server is not running"

**Solution:**
```bash
# Start droid2api first
npm start

# Then run tests in another terminal
./run_all_tests.sh
```

---

### Issue: "jq: command not found"

**Solution:**
```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq

# Windows (WSL)
sudo apt-get install jq
```

---

### Issue: "Module not found: openai"

**Solution:**
```bash
# Install Python dependencies
pip install -r test_requirements.txt

# Or install individually
pip install openai anthropic google-generativeai
```

---

### Issue: Connection refused

**Cause:** droid2api not running or wrong port

**Solution:**
```bash
# Check if server is running
curl http://localhost:3000/v1/models

# If not, start it
npm start

# Check port
export PORT=3000  # Or your custom port
```

---

### Issue: Authentication errors

**Cause:** Backend requires valid auth token

**Solution:**
```bash
# Set your auth token
export AUTH_TOKEN=your_real_token_here

# Then run tests
./run_all_tests.sh
```

---

## 📊 CI/CD Integration

### GitHub Actions

```yaml
name: Test droid2api

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      
      - name: Install dependencies
        run: |
          npm install
          pip install -r test_requirements.txt
          sudo apt-get install -y jq
      
      - name: Start droid2api
        run: npm start &
        env:
          PORT: 3000
      
      - name: Wait for server
        run: sleep 5
      
      - name: Run tests
        run: ./run_all_tests.sh
        env:
          PORT: 3000
          MODEL: glm-4.6
          AUTH_TOKEN: test-token
```

---

## 🎯 Test Coverage

### Endpoints Tested

- ✅ `GET /v1/models` - List available models
- ✅ `POST /v1/chat/completions` - OpenAI format
- ✅ `POST /v1/messages` - Anthropic format
- ✅ `POST /v1/generateContent` - Gemini format

### Features Tested

- ✅ Non-streaming responses
- ✅ Streaming responses (where supported)
- ✅ Multi-turn conversations
- ✅ System instructions
- ✅ Token usage metadata
- ✅ Error handling
- ✅ Format validation
- ✅ SDK compatibility

### Response Format Validation

- ✅ OpenAI `choices[0].message.content`
- ✅ Anthropic `content[0].text`
- ✅ Gemini `candidates[0].content.parts[0].text`
- ✅ Usage metadata for all formats
- ✅ Proper HTTP status codes

---

## 💡 Pro Tips

### Tip 1: Test Different Models

```bash
# Test with different models
export MODEL=claude-sonnet-4
./run_all_tests.sh

export MODEL=gpt-4
./run_all_tests.sh

export MODEL=gemini-2.5-pro
./run_all_tests.sh
```

### Tip 2: Test Different Ports

```bash
# Test on different port
export PORT=8080
npm start &

export PORT=8080
./run_all_tests.sh
```

### Tip 3: Run Specific Test

```bash
# Only test OpenAI
python3 test_openai.py

# Only test bash endpoints
./test_all_endpoints.sh
```

### Tip 4: Verbose Output

```bash
# Enable debug output
export DEBUG=1
./run_all_tests.sh
```

---

## 🚀 Next Steps

After all tests pass:

1. ✅ **Deploy to production** - Tests confirm gateway works
2. ✅ **Add to CI/CD** - Automate testing on every commit
3. ✅ **Monitor in production** - Watch for format issues
4. ✅ **Add custom tests** - Test your specific use cases

**Your Universal API Gateway is production-ready!** 🎉

