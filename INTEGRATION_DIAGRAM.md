# 🎨 Visual Integration Architecture

## System Architecture Overview

```
                                    ┌──────────────────────┐
                                    │                      │
                                    │   Developer using    │
                                    │    Claude Code       │
                                    │                      │
                                    └──────────┬───────────┘
                                               │
                                               │ HTTP/WebSocket
                                               │
                                    ┌──────────▼───────────┐
                                    │                      │
┌───────────────────────────────────┤ claude-code-router   │
│  Smart Routing Layer              │   (Port 3456)        │
│                                   │                      │
│  ┌─────────────────────────────┐  └──────────┬───────────┘
│  │ Router Intelligence         │             │
│  ├─────────────────────────────┤             │
│  │ • Token counting            │             │
│  │ • Context analysis          │             │
│  │ • Model selection           │             │
│  │ • Session tracking          │             │
│  └─────────────────────────────┘             │
│                                               │
│  ┌─────────────────────────────┐             │
│  │ Routing Rules               │             │
│  ├─────────────────────────────┤             │
│  │ • tokens < 10k → fast model │             │
│  │ • tokens > 60k → long ctx   │             │
│  │ • thinking → reasoner       │             │
│  │ • background → cheap model  │             │
│  └─────────────────────────────┘             │
└───────────────────────────────────────────────┘
                                                │
                                                │ Routed request
                                                │ (provider,model)
                                                │
                                    ┌───────────▼───────────┐
┌───────────────────────────────────┤    droid2api          │
│  API Normalization Layer          │   (Port 3000)         │
│                                   │                       │
│  ┌─────────────────────────────┐  └───────────┬───────────┘
│  │ Authentication              │              │
│  ├─────────────────────────────┤              │
│  │ 1. FACTORY_API_KEY          │              │
│  │ 2. REFRESH_TOKEN (auto)     │              │
│  │ 3. ~/.factory/auth.json     │              │
│  │ 4. Client Authorization     │              │
│  └─────────────────────────────┘              │
│                                                │
│  ┌─────────────────────────────┐              │
│  │ Format Transformation       │              │
│  ├─────────────────────────────┤              │
│  │ OpenAI ↔️ Anthropic          │              │
│  │ OpenAI ↔️ Common             │              │
│  │ Streaming transformers      │              │
│  └─────────────────────────────┘              │
│                                                │
│  ┌─────────────────────────────┐              │
│  │ Reasoning Control           │              │
│  ├─────────────────────────────┤              │
│  │ OpenAI: effort parameter    │              │
│  │ Anthropic: budget_tokens    │              │
│  │ Levels: off/low/med/high    │              │
│  └─────────────────────────────┘              │
└────────────────────────────────────────────────┘
                                                 │
                            ┌────────────────────┼────────────────────┐
                            │                    │                    │
                ┌───────────▼──────────┐ ┌──────▼────────┐ ┌─────────▼────────┐
                │                      │ │               │ │                  │
                │  Anthropic API       │ │  OpenAI API   │ │  Other LLMs      │
                │  (Claude models)     │ │  (GPT models) │ │  (DeepSeek, etc) │
                │                      │ │               │ │                  │
                └──────────────────────┘ └───────────────┘ └──────────────────┘
```

## Request Flow Example

### Scenario: User asks Claude Code to "explain this function"

```
Step 1: Claude Code sends request
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST http://localhost:3456/v1/messages
{
  "model": "claude-3-5-sonnet",
  "messages": [{
    "role": "user",
    "content": "explain this function..."
  }],
  "thinking": true
}


Step 2: claude-code-router analyzes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Token count: 5,234 tokens
• Has "thinking": true
• Decision: Route to think model
• Selected: "droid2api,deepseek-reasoner"


Step 3: claude-code-router forwards to droid2api
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST http://localhost:3000/v1/chat/completions
{
  "model": "deepseek-reasoner",
  "messages": [{
    "role": "user",
    "content": "explain this function..."
  }],
  "stream": true
}


Step 4: droid2api transforms request
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Model type: "common" (DeepSeek API)
• Add reasoning level: "high"
• Add auth header from FACTORY_API_KEY
• Transform OpenAI format → DeepSeek format


Step 5: droid2api calls DeepSeek API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST https://api.deepseek.com/chat/completions
Headers:
  Authorization: Bearer sk-xxx
  Content-Type: application/json
Body:
  {
    "model": "deepseek-reasoner",
    "messages": [...],
    "stream": true
  }


Step 6: droid2api streams response back
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• DeepSeek SSE → OpenAI SSE format
• Add thinking blocks to reasoning field
• Track token usage
• Stream to claude-code-router


Step 7: claude-code-router forwards to Claude Code
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Pass-through streaming
• Log model used and tokens
• Update session cache


Step 8: Claude Code displays to user
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Response rendered
📊 Model: deepseek-reasoner (via droid2api)
💰 Cost: $0.005 (vs $0.30 with Claude Opus)
⚡ Response time: 2.3s
```

## Token Flow & Cost Optimization

```
Context Size Analysis & Routing Decision Tree
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Input: User request arrives at claude-code-router
  │
  ├─ Count tokens (tiktoken)
  │
  ├─ Check last session usage
  │
  └─ Analyze request context
      │
      ├─ Has "thinking"? ────────┐
      │                          │
      ├─ Is background task? ────┼────┐
      │                          │    │
      └─ Token count > 60k? ─────┼────┼────┐
                                 │    │    │
                                 ▼    ▼    ▼
                            ┌────┴────┴────┴────┐
                            │  Routing Matrix   │
                            └────┬────┬────┬────┘
                                 │    │    │
         ┌───────────────────────┘    │    └────────────────────┐
         │                            │                          │
         ▼                            ▼                          ▼
┌────────────────┐         ┌──────────────────┐      ┌──────────────────┐
│ thinking=true  │         │ background task  │      │ tokens > 60k     │
│                │         │                  │      │                  │
│ Route to:      │         │ Route to:        │      │ Route to:        │
│ deepseek-      │         │ gpt-5-mini       │      │ gemini-2.5-pro   │
│ reasoner       │         │                  │      │                  │
│                │         │                  │      │                  │
│ Cost: $0.55/1M │         │ Cost: $0.60/1M   │      │ Cost: Free       │
└────────┬───────┘         └────────┬─────────┘      └────────┬─────────┘
         │                          │                          │
         └──────────────┬───────────┴──────────────────────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │   Forward to        │
              │   droid2api         │
              │   with model ID     │
              └─────────┬───────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │ droid2api           │
              │ • Transforms format │
              │ • Adds reasoning    │
              │ • Manages auth      │
              │ • Calls provider    │
              └─────────┬───────────┘
                        │
                        ▼
                   LLM Provider
```

## Configuration Relationship

```
┌─────────────────────────────────────────────────────────────┐
│               ~/.claude.json (Claude Code)                  │
├─────────────────────────────────────────────────────────────┤
│ {                                                           │
│   "baseURL": "http://localhost:3456",  ←──────┐            │
│   "apiKey": "dummy-key"                        │            │
│ }                                              │            │
└────────────────────────────────────────────────┼────────────┘
                                                 │
                                                 │ Points to
                                                 │
┌────────────────────────────────────────────────▼────────────┐
│      ~/.claude-code-router/config.json (Router)             │
├─────────────────────────────────────────────────────────────┤
│ {                                                           │
│   "PORT": 3456,                                             │
│   "Router": {                                               │
│     "default": "droid2api,claude-opus-4",  ←────┐           │
│     "background": "droid2api,gpt-5-mini",       │           │
│     "think": "droid2api,deepseek-reasoner"      │ Refers to │
│   },                                            │ provider  │
│   "Providers": [                                │ below     │
│     {                                           │           │
│       "name": "droid2api",  ←───────────────────┘           │
│       "api_base_url": "http://localhost:3000/v1/...",  ←─┐  │
│       "api_key": "dummy",                                │  │
│       "models": ["claude-opus-4", "gpt-5-mini", ...]     │  │
│     }                                                    │  │
│   ]                                                      │  │
│ }                                                        │  │
└──────────────────────────────────────────────────────────┼──┘
                                                           │
                                                           │ Points to
                                                           │
┌──────────────────────────────────────────────────────────▼──┐
│           /path/to/droid2api/config.json                    │
├─────────────────────────────────────────────────────────────┤
│ {                                                           │
│   "port": 3000,                                             │
│   "models": [                                               │
│     {                                                       │
│       "id": "claude-opus-4",      ←───┐                     │
│       "type": "anthropic",            │ Model definitions   │
│       "reasoning": "high"             │                     │
│     },                                │                     │
│     {                                 │                     │
│       "id": "gpt-5-mini",         ←───┘                     │
│       "type": "openai",                                     │
│       "reasoning": "low"                                    │
│     }                                                       │
│   ],                                                        │
│   "endpoints": [                                            │
│     {                                                       │
│       "type": "anthropic",                                  │
│       "base_url": "https://api.anthropic.com/v1/messages"  │
│     },                                                      │
│     {                                                       │
│       "type": "openai",                                     │
│       "base_url": "https://api.openai.com/v1/..."          │
│     }                                                       │
│   ]                                                         │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
```

## Cost Savings Visualization

```
Traditional Setup (Direct API calls)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Daily Usage:
• 50 interactive coding tasks      → Claude Opus 4    → $7.50
• 200 background checks            → Claude Opus 4    → $30.00
• 30 deep reasoning tasks          → Claude Opus 4    → $4.50
• 20 long context reads            → Claude Opus 4    → $3.00
                                      ─────────────────────
                                      Daily Total: $45.00
                                      Monthly: $1,350


Optimized Setup (Smart Routing via ccr + droid2api)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Daily Usage:
• 50 interactive coding tasks      → Claude Opus 4    → $7.50
• 200 background checks            → GPT-5-mini       → $1.20
• 30 deep reasoning tasks          → DeepSeek-R1     → $0.50
• 20 long context reads            → Gemini 2.5 Pro  → $0.00
                                      ─────────────────────
                                      Daily Total: $9.20
                                      Monthly: $276

💰 Savings: $1,074/month (79.6% reduction!)


Visual Cost Comparison:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Traditional:  ████████████████████████████████ $1,350
              │
              │
Optimized:    ██████ $276
              │
              └─ 79.6% savings

Cost per task type:

Interactive:  ████ $7.50 ──┬── Same quality
              ████ $7.50 ──┘   (no sacrifice)

Background:   ████████████████ $30.00 ──┬
              █ $1.20 ─────────────────┘── 96% savings!

Reasoning:    ███ $4.50 ──┬
              █ $0.50 ────┘────────────── 89% savings!

Long Context: ██ $3.00 ──┬
              FREE ──────┘───────────────── 100% savings!
```

## Monitoring Dashboard Layout

```
┌──────────────────────────────────────────────────────────────────┐
│                  claude-code-router Dashboard                    │
│                    http://localhost:3456/ui                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Total Requests │  │   Token Usage   │  │  Cost Today     │ │
│  │                 │  │                 │  │                 │ │
│  │      1,247      │  │   2.4M tokens   │  │     $9.20       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Requests by Model (Last 24h)                │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  claude-opus-4:     ████████ 50 (interactive)           │   │
│  │  gpt-5-mini:        ████████████████████ 200 (bg)       │   │
│  │  deepseek-reasoner: ██████ 30 (thinking)                │   │
│  │  gemini-2.5-pro:    ████ 20 (long context)              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Routing Decisions                      │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  17:42:15  tokens=5234    → think        → deepseek-r1  │   │
│  │  17:41:03  tokens=145678  → longContext  → gemini-pro   │   │
│  │  17:40:21  tokens=892     → background   → gpt-5-mini   │   │
│  │  17:39:45  tokens=3421    → default      → claude-opus  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Active Sessions & Token Usage               │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  Session abc123: 45,234 tokens  (claude-opus-4)         │   │
│  │  Session def456: 123,567 tokens (gemini-2.5-pro)        │   │
│  │  Session ghi789: 8,901 tokens   (gpt-5-mini)            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Error Handling & Failover

```
Request Flow with Error Handling
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Request arrives at claude-code-router
   │
   ├─ Try primary model: "droid2api,claude-opus-4"
   │  │
   │  └─ Forward to droid2api ──┐
   │                             │
2. droid2api receives request   │
   │                             │
   ├─ Check auth ────────────────┘
   │  ├─ Try FACTORY_API_KEY
   │  ├─ Try refresh_token (auto-refresh if expired)
   │  ├─ Try ~/.factory/auth.json
   │  └─ Fallback to client auth
   │
   ├─ Transform request format
   │
   ├─ Call Anthropic API ──────┐
   │                            │
   └─ Handle errors:            │
      │                         │
      ├─ 429 Rate Limit ────────┼─→ Retry with backoff
      │                         │
      ├─ 401 Auth Error ────────┼─→ Refresh token
      │                         │   Try again
      │                         │
      ├─ 503 Service Unavail ───┼─→ Return error to
      │                         │   claude-code-router
      │                         │
      └─ Timeout ───────────────┘

3. claude-code-router handles failover
   │
   ├─ Primary failed (Anthropic)
   │
   ├─ Try fallback: "droid2api,gpt-5"
   │  │
   │  └─ Forward to droid2api again
   │     │
   │     └─ Now routes to OpenAI endpoint
   │        │
   │        └─ Success! ──→ Return response
   │
   └─ If fallback also fails:
      └─ Try emergency: "droid2api,deepseek-v3"
         └─ Log failure, return to user

Failover Priority Chain:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Priority 1: claude-opus-4 (Anthropic)  ← Primary
Priority 2: gpt-5 (OpenAI)             ← Fallback
Priority 3: deepseek-v3 (DeepSeek)     ← Emergency
Priority 4: Return error to user       ← Last resort
```

---

**Diagram Legend**:
- `→` : Data flow direction
- `├─` : Decision branch
- `▼` : Process flow
- `━` : Section separator
- `█` : Visual bar chart element
