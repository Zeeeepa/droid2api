# 🏗️ droid2api Architecture & Services Analysis

## Executive Summary

**droid2api** is an **OpenAI-compatible API proxy** that bridges AI coding assistants (like Claude Code, Cursor, Continue) to **Factory.ai's droid service** using **WorkOS OAuth authentication**. It provides a unified, standardized interface for accessing multiple LLM providers while handling authentication, reasoning level control, and format transformation.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client Applications                          │
│  Claude Code | Cursor | Continue | OpenAI SDK Compatible Tools  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        droid2api                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Authentication Layer (WorkOS OAuth)                     │   │
│  │  • Token refresh (every 6 hours)                         │   │
│  │  • Multi-tier auth (Factory Key > Refresh > Client)     │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  API Proxy Layer (OpenAI Compatible)                    │   │
│  │  • Format transformation                                 │   │
│  │  • Reasoning level control                              │   │
│  │  • Stream handling                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Factory.ai Droid Service                       │
│  • Model routing (OpenAI, Anthropic, etc.)                      │
│  • Codebase understanding                                        │
│  • Tool integrations (Jira, Notion, Slack)                      │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      LLM Providers                                │
│  OpenAI | Anthropic | Custom Models | Open Source Models         │
└──────────────────────────────────────────────────────────────────┘
```

---

## 1. Factory.ai Service

### What is Factory.ai?

**Factory.ai** is an **enterprise AI development platform** that provides:

- **`droid` CLI tool**: An AI coding agent that operates from your terminal
- **End-to-end feature development**: From planning → implementation → testing
- **Deep codebase understanding**: Learns from your organization's codebases, documentation, and issue tracking
- **Engineering system integration**: Native integrations with Jira, Notion, Slack, GitHub, etc.
- **Model flexibility**: Not locked to a single AI provider - routes tasks to the best model

### Key Features

| Feature | Description |
|---------|-------------|
| **Autonomous Development** | Handles complete feature implementation while keeping you in control |
| **Context Awareness** | Maintains memory across conversations and understands project conventions |
| **Tool Integration** | Connects to your existing development workflow |
| **Production Ready** | Enterprise security (SOC-2), on-premise deployment, air-gapped environments |
| **Model Agnostic** | Use OpenAI, Anthropic, custom models, or local models |

### How Factory.ai Works

1. **Developer installs CLI**: `curl -fsSL https://app.factory.ai/cli | sh`
2. **Authenticates via WorkOS**: OAuth flow connects to Factory.ai account
3. **Starts droid session**: `droid` command in project directory
4. **Agent operates**: Reads code, makes changes, runs tests, creates PRs
5. **Maintains context**: Remembers project structure, conventions, and history

### Factory.ai API Endpoints

```
Base URL: https://api.factory.ai

Key endpoints used by droid2api:
- POST /v1/chat/completions  (OpenAI format)
- POST /v1/messages          (Anthropic format)
- POST /v1/responses         (Claude Code format)
```

---

## 2. WorkOS Service

### What is WorkOS?

**WorkOS** is a **B2B authentication and user management platform** that provides:

- **OAuth 2.0 Authentication**: Industry-standard authentication protocol
- **Token Management**: Automatic token refresh and expiration handling
- **User Management API**: Profile management, session control, audit logs
- **AuthKit**: Hosted authentication UI (optional)
- **Enterprise SSO**: SAML, OIDC for enterprise customers

### Authentication Flow

```
┌─────────┐                                    ┌──────────┐
│  User   │                                    │  WorkOS  │
└────┬────┘                                    └────┬─────┘
     │                                              │
     │  1. Login Request                            │
     ├─────────────────────────────────────────────►│
     │                                              │
     │  2. OAuth Authorization                      │
     │◄─────────────────────────────────────────────┤
     │                                              │
     │  3. User Credentials                         │
     ├─────────────────────────────────────────────►│
     │                                              │
     │  4. Access Token + Refresh Token             │
     │◄─────────────────────────────────────────────┤
     │                                              │
┌────▼────┐                                    ┌────▼─────┐
│ droid2api│                                   │  Factory │
│  Proxy  │                                    │   API    │
└────┬────┘                                    └────┬─────┘
     │                                              │
     │  5. API Request (with Access Token)          │
     ├─────────────────────────────────────────────►│
     │                                              │
     │  6. Validate Token with WorkOS               │
     │                      ┌────────────────────────┤
     │                      │                        │
     │                      └───────────────────────►│
     │                                              │
     │  7. Return Response                          │
     │◄─────────────────────────────────────────────┤
     │                                              │
```

### Token Lifecycle

```javascript
// Token Structure
{
  "access_token": "eyJhbGc...",     // Valid for ~8 hours
  "refresh_token": "refresh_...",   // Valid for ~1 year
  "expires_in": 28800,              // 8 hours in seconds
  "token_type": "Bearer",
  "user": {
    "id": "user_01...",
    "email": "developer@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "organization_id": "org_01..."
}
```

### WorkOS Integration in droid2api

**File: `auth.js`**

The authentication module implements:

1. **Three-tier auth priority**:
   ```javascript
   Priority 1: FACTORY_API_KEY env var (fixed, no refresh)
   Priority 2: DROID_REFRESH_KEY env var or ~/.factory/auth.json
   Priority 3: Client authorization header (passthrough)
   ```

2. **Automatic token refresh** (every 6 hours):
   ```javascript
   // Refresh URL
   POST https://api.workos.com/user_management/authenticate
   
   // Payload
   {
     "grant_type": "refresh_token",
     "refresh_token": "refresh_...",
     "client_id": "client_01..."
   }
   ```

3. **Token persistence**:
   - Saves to `~/.factory/auth.json` or `./auth.json`
   - Preserves user data and timestamps
   - Handles file permissions securely

---

## 3. droid2api Architecture

### Core Purpose

droid2api serves as a **unified API gateway** that:

✅ **Standardizes access** - Provides OpenAI-compatible interface for all LLM providers
✅ **Handles authentication** - Manages WorkOS OAuth tokens automatically
✅ **Controls reasoning** - Allows tuning of AI model "thinking" intensity
✅ **Transforms formats** - Converts between OpenAI, Anthropic, and Gemini API formats
✅ **Supports streaming** - Real-time token-by-token responses
✅ **Claude Code compatible** - Direct integration with Anthropic's Claude Code CLI

### Directory Structure

```
droid2api/
├── gateway/                          # Universal API gateway (NEW)
│   ├── routes.js                     # Main request routing
│   ├── format-detector.js            # Detect API format
│   ├── backend-selector.js           # Select backend (Factory/Router)
│   └── backend-handlers.js           # Backend-specific logic
├── utils/
│   └── transformers/                 # Format transformers
│       ├── gemini-to-openai.js       # Gemini → OpenAI
│       ├── anthropic-to-openai.js    # Anthropic → OpenAI
│       ├── openai-to-gemini.js       # OpenAI → Gemini
│       ├── openai-to-anthropic.js    # OpenAI → Anthropic
│       ├── stream-to-gemini.js       # Stream transformer
│       └── stream-to-anthropic.js    # Stream transformer
├── transformers/                     # Legacy transformers
│   ├── anthropic.js                  # Anthropic transformations
│   ├── common.js                     # Common utilities
│   └── openai.js                     # OpenAI transformations
├── auth.js                           # WorkOS OAuth integration
├── config.js                         # Configuration loader
├── config.json                       # Model & endpoint definitions
├── logger.js                         # Structured logging
├── routes.js                         # Legacy API routes
├── server.js                         # Express server
└── package.json                      # Dependencies & scripts
```

### Request Flow

```
1. Client Request
   ↓
   POST http://localhost:3000/v1/chat/completions
   Headers: {
     "Authorization": "Bearer xxx",
     "Content-Type": "application/json",
     "x-reasoning-level": "medium"
   }
   Body: {
     "model": "claude-opus-4",
     "messages": [{"role": "user", "content": "Hello"}]
   }

2. Authentication (auth.js)
   ↓
   - Check FACTORY_API_KEY env var
   - OR check refresh token and auto-refresh if needed
   - OR use client authorization header

3. Format Detection (gateway/format-detector.js)
   ↓
   - Detect: OpenAI, Anthropic, or Gemini format
   - Current: OpenAI format

4. Normalization (utils/transformers/)
   ↓
   - Convert to internal OpenAI format
   - Already OpenAI, no transformation needed

5. Backend Selection (gateway/backend-selector.js)
   ↓
   - Check for Claude Code backend (ANTHROPIC_BASE_URL)
   - Check for claude-code-router (OPENAI_BASE_URL)
   - Fallback to config-based routing

6. Request Transformation (transformers/)
   ↓
   - Apply reasoning level control
   - Add system prompts
   - Transform to backend-specific format

7. Proxy to Backend
   ↓
   POST https://api.factory.ai/v1/chat/completions
   Headers: {
     "Authorization": "Bearer <factory_token>",
     "x-reasoning-level": "medium",
     "x-client-id": "droid2api"
   }

8. Response Transformation
   ↓
   - Transform backend response to requested format
   - Handle streaming if enabled

9. Client Response
   ↓
   {
     "id": "chatcmpl-...",
     "choices": [{
       "message": {"role": "assistant", "content": "..."}
     }],
     "usage": {...}
   }
```

---

## 4. Root Files Analysis

### **package.json**
```json
{
  "name": "droid2api",
  "version": "2.0.0",
  "type": "module",  // ES modules enabled
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",              // Web server framework
    "node-fetch": "^3.3.2",            // HTTP client
    "@anthropic-ai/claude-code": "^2.0.14",      // Claude Code integration
    "@musistudio/claude-code-router": "^1.0.60"  // Router integration
  }
}
```

**Purpose**:
- Defines project metadata
- Specifies ES module usage (`"type": "module"`)
- Lists dependencies (now includes Claude Code & Router integrations)
- Provides start script

---

### **config.json**
```json
{
  "port": 3000,
  "dev": true,
  "models": [
    {
      "name": "Claude Opus 4",
      "id": "claude-opus-4-1-20250805",
      "type": "anthropic",
      "reasoning": "high"
    },
    {
      "name": "GPT-5",
      "id": "gpt-5-2025-08-07",
      "type": "openai",
      "reasoning": "medium"
    }
  ],
  "endpoints": [
    {
      "type": "anthropic",
      "base_url": "https://api.factory.ai/v1/messages"
    },
    {
      "type": "openai",
      "base_url": "https://api.factory.ai/v1/chat/completions"
    }
  ],
  "system_prompt": "You are Droid, an AI assistant powered by Factory.ai..."
}
```

**Purpose**:
- Configures available models
- Maps model types to endpoints
- Sets reasoning levels per model
- Defines system prompt identity

---

### **.env.example**
```bash
# Authentication (Priority: 1 > 2 > 3)

# 1. Fixed API Key (Highest Priority)
FACTORY_API_KEY=your_factory_api_key_here

# 2. Refresh Token
DROID_REFRESH_KEY=your_refresh_token_here

# 3. Client Authorization (Fallback - no config needed)

# Claude Code Backend (Optional)
ANTHROPIC_MODEL=glm-4.6
ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
ANTHROPIC_AUTH_TOKEN=your_token

# claude-code-router Backend (Optional)
OPENAI_API_KEY=your_key
OPENAI_BASE_URL=http://localhost:7000/v1
OPENAI_MODEL=MBZUAI-IFM/K2-Think

# Server Configuration
PORT=3000
DEBUG=true
```

**Purpose**:
- Documents environment variables
- Shows authentication options
- Provides backend configuration examples

---

### **auth.js** (Already analyzed)
**Purpose**:
- Implements WorkOS OAuth integration
- Handles token refresh (every 6 hours)
- Manages three-tier authentication priority
- Persists tokens to filesystem

---

### **config.js**
```javascript
export function loadConfig() {
  // Load config.json
  // Parse environment variables
  // Merge configurations
}

export function getModelById(id) {
  // Find model configuration by ID
}

export function getEndpointByType(type) {
  // Get API endpoint for model type
}
```

**Purpose**:
- Loads and validates config.json
- Provides configuration access functions
- Handles environment variable overrides

---

### **logger.js**
```javascript
export function logInfo(message, data) {
  console.log(`[INFO] ${timestamp} - ${message}`);
}

export function logError(message, error) {
  console.error(`[ERROR] ${timestamp} - ${message}`);
}

export function logDebug(message, data) {
  if (DEBUG) console.log(`[DEBUG] ${timestamp} - ${message}`);
}
```

**Purpose**:
- Structured logging utility
- Timestamp-prefixed messages
- Debug mode support
- Error tracking

---

### **server.js**
```javascript
import express from 'express';
import gatewayRouter from './gateway/routes.js';
import { initializeAuth } from './auth.js';

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Initialize auth on startup
await initializeAuth();

// Use universal gateway routes
app.use(gatewayRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Purpose**:
- Express server setup
- Middleware configuration
- Auth initialization
- Route mounting
- Server startup

---

## 5. Key Integration Points

### Factory.ai ↔ droid2api

**How they connect**:

1. **Authentication**: droid2api uses Factory API keys obtained via WorkOS
2. **API Endpoints**: droid2api proxies requests to `https://api.factory.ai`
3. **Request Format**: Transforms client requests to Factory-compatible format
4. **Headers**: Adds Factory-specific headers (reasoning level, client ID)

**Request Headers**:
```javascript
{
  "Authorization": "Bearer <factory_access_token>",
  "x-reasoning-level": "auto|off|low|medium|high",
  "x-client-id": "droid2api",
  "Content-Type": "application/json"
}
```

**Reasoning Levels**:
- `auto`: Respect client's original request
- `off`: No extended reasoning
- `low`: Quick responses (effort: low, budget_tokens: 4096)
- `medium`: Balanced reasoning (effort: medium, budget_tokens: 12288)
- `high`: Deep analysis (effort: high, budget_tokens: 24576)

---

### WorkOS ↔ droid2api

**How they connect**:

1. **OAuth Flow**: WorkOS handles user authentication
2. **Token Exchange**: WorkOS issues access/refresh tokens
3. **Token Refresh**: droid2api calls WorkOS every 6 hours to refresh
4. **User Data**: WorkOS provides user profile (email, name, org)

**Token Refresh Process**:
```javascript
// Every 6 hours
POST https://api.workos.com/user_management/authenticate
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
refresh_token=refresh_...
client_id=client_01...

// Response
{
  "access_token": "new_token...",
  "refresh_token": "new_refresh...",
  "user": {...},
  "organization_id": "org_..."
}
```

---

### droid2api ↔ Client Tools

**Compatible Tools**:

| Tool | Protocol | Format |
|------|----------|--------|
| Claude Code | HTTP | Anthropic Messages API |
| Cursor | HTTP | OpenAI Chat Completions |
| Continue | HTTP | OpenAI Chat Completions |
| Windsurf | HTTP | OpenAI Chat Completions |
| Any OpenAI SDK | HTTP | OpenAI Chat Completions |

**Example Integration**:

```javascript
// Using OpenAI SDK with droid2api
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:3000/v1',
  apiKey: 'dummy' // Not needed with droid2api
});

const response = await client.chat.completions.create({
  model: 'claude-opus-4',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

---

## 6. Use Cases

### Use Case 1: Claude Code Integration
```bash
# Set Factory authentication
export FACTORY_API_KEY=your_key

# Start droid2api
npm start

# Claude Code uses droid2api automatically
# Endpoints: /v1/responses, /v1/messages
```

### Use Case 2: Cursor/Continue Integration
```json
// settings.json
{
  "openai.apiBase": "http://localhost:3000/v1",
  "openai.apiKey": "dummy"
}
```

### Use Case 3: Multi-Backend Routing
```bash
# Option A: Factory.ai backend
export FACTORY_API_KEY=factory_key

# Option B: Custom claude-code-router
export OPENAI_API_KEY=router_key
export OPENAI_BASE_URL=http://localhost:7000/v1

# droid2api automatically selects backend
npm start
```

---

## 7. Security Considerations

### Authentication Security

✅ **Three-tier auth priority** - Graceful degradation
✅ **Automatic token refresh** - Reduces exposure window
✅ **Secure token storage** - File permissions (600)
✅ **No hardcoded secrets** - Environment variables only

### API Security

✅ **CORS enabled** - Cross-origin request support
✅ **Request validation** - Schema validation before proxying
✅ **Error sanitization** - No internal details leaked
✅ **Rate limiting** - (Recommended for production)

### Recommended Improvements

⚠️ **Add rate limiting** - Prevent abuse
⚠️ **Implement request signing** - Verify request integrity
⚠️ **Add circuit breakers** - Handle backend failures gracefully
⚠️ **Enable request logging** - Audit trail for debugging

---

## 8. Deployment Options

### Local Development
```bash
npm install
export FACTORY_API_KEY=your_key
npm start
```

### Docker Deployment
```bash
docker build -t droid2api .
docker run -p 3000:3000 \
  -e FACTORY_API_KEY=your_key \
  droid2api
```

### Docker Compose
```yaml
version: '3.8'
services:
  droid2api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - FACTORY_API_KEY=${FACTORY_API_KEY}
      - PORT=3000
    restart: unless-stopped
```

---

## Conclusion

**droid2api** is a well-architected proxy that:

✅ **Unifies access** to Factory.ai's droid service through a standard OpenAI-compatible API
✅ **Handles authentication** via WorkOS OAuth with automatic token refresh
✅ **Supports multiple formats** (OpenAI, Anthropic, Gemini) for maximum compatibility
✅ **Enables flexibility** with backend routing (Factory.ai, claude-code-router, custom)
✅ **Production-ready** with Docker support, logging, and error handling

**Key Benefits**:

1. **Drop-in replacement** for OpenAI API in any tool
2. **No vendor lock-in** - Switch between providers easily
3. **Intelligent routing** - Reasoning level control
4. **Enterprise-grade auth** - WorkOS OAuth
5. **Developer-friendly** - Simple configuration and setup

This architecture enables teams to use Factory.ai's powerful coding agents through familiar tools like Claude Code, Cursor, and Continue without vendor lock-in or complex authentication flows.

