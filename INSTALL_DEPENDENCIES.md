# 📦 Installing droid2api v2.0 Dependencies

## Required Global Dependencies

droid2api v2.0 can route through **Claude Code** and **claude-code-router** as backends. These must be installed globally.

---

## 🔧 Quick Installation

```bash
# Install both dependencies at once
npm install -g @anthropic-ai/claude-code @musistudio/claude-code-router

# Or use droid2api's helper script
npm run install-deps
```

---

## 📦 Individual Installation

### 1. Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

**Verify installation:**
```bash
claude-code --version
```

**What it provides:**
- Anthropic Claude API client
- Claude Code features and functions
- Authentication with Anthropic backends

---

### 2. claude-code-router

```bash
npm install -g @musistudio/claude-code-router
```

**Verify installation:**
```bash
ccr --version
# or
claude-code-router --version
```

**What it provides:**
- Smart routing based on request characteristics
- Token counting and analysis
- Cost optimization
- Model selection intelligence

---

## 🎯 Usage Scenarios

### Scenario 1: Use Claude Code as Backend

**Configuration:**
```bash
# Set environment variables
export ANTHROPIC_MODEL=glm-4.6
export ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
export ANTHROPIC_AUTH_TOKEN=665b963943b647dc9501dff942afb877.A47LrMc7sgGjyfBJ

# Start droid2api
npm start
```

**What happens:**
```
Client (any format) 
  → droid2api 
  → Claude Code 
  → Z.ai backend 
  → Response in original format
```

**Benefits:**
- Direct Claude Code integration
- Anthropic-compatible API
- Simple configuration

---

### Scenario 2: Use claude-code-router as Backend

**Configuration:**
```bash
# Start claude-code-router first
export OPENAI_API_KEY="sk-k2think-proxy-1760386095"
export OPENAI_BASE_URL="http://localhost:7000/v1"
export OPENAI_MODEL="MBZUAI-IFM/K2-Think"

ccr start  # Starts on port 7000

# Configure droid2api to use router
export OPENAI_BASE_URL="http://localhost:7000/v1"

# Start droid2api
npm start  # Starts on port 3000
```

**What happens:**
```
Client (any format)
  → droid2api (port 3000)
  → claude-code-router (port 7000)
    ├─ Token analysis
    ├─ Model selection
    └─ Smart routing
  → Selected backend
  → Response in original format
```

**Benefits:**
- Intelligent model selection
- Cost optimization
- Token-based routing
- Background task detection
- Thinking model routing

---

### Scenario 3: Use Both (Recommended)

**Configuration:**
```bash
# Install both
npm install -g @anthropic-ai/claude-code @musistudio/claude-code-router

# Start router
ccr start

# Configure droid2api with router as backend
export OPENAI_BASE_URL="http://localhost:7000/v1"
export ANTHROPIC_BASE_URL="http://localhost:7000/v1"

# Start droid2api
npm start
```

**Benefits:**
- Best of both worlds
- Router intelligence + Claude Code features
- Maximum flexibility
- Automatic optimization

---

## 🔍 Dependency Check

Run this script to verify all dependencies are installed:

```bash
#!/bin/bash

echo "Checking droid2api v2.0 dependencies..."
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js: Not installed"
    echo "   Install from: https://nodejs.org/"
fi

# Check npm
if command -v npm &> /dev/null; then
    echo "✅ npm: $(npm --version)"
else
    echo "❌ npm: Not installed"
fi

echo ""
echo "Checking global dependencies..."
echo ""

# Check Claude Code
if npm list -g @anthropic-ai/claude-code &> /dev/null; then
    echo "✅ @anthropic-ai/claude-code: Installed"
else
    echo "❌ @anthropic-ai/claude-code: Not installed"
    echo "   Install: npm install -g @anthropic-ai/claude-code"
fi

# Check claude-code-router
if npm list -g @musistudio/claude-code-router &> /dev/null; then
    echo "✅ @musistudio/claude-code-router: Installed"
else
    echo "❌ @musistudio/claude-code-router: Not installed"
    echo "   Install: npm install -g @musistudio/claude-code-router"
fi

echo ""
echo "Checking optional commands..."
echo ""

# Check claude-code command
if command -v claude-code &> /dev/null; then
    echo "✅ claude-code command: Available"
else
    echo "⚠️  claude-code command: Not in PATH (might still work)"
fi

# Check ccr command
if command -v ccr &> /dev/null; then
    echo "✅ ccr command: Available"
else
    echo "⚠️  ccr command: Not in PATH (might still work)"
fi

echo ""
echo "Checking droid2api..."
echo ""

# Check if in droid2api directory
if [ -f "package.json" ]; then
    PKG_NAME=$(node -p "require('./package.json').name")
    if [ "$PKG_NAME" = "droid2api" ]; then
        echo "✅ droid2api: Found in current directory"
        PKG_VERSION=$(node -p "require('./package.json').version")
        echo "   Version: $PKG_VERSION"
    else
        echo "⚠️  package.json found but not droid2api"
    fi
else
    echo "⚠️  Not in droid2api directory"
fi

echo ""
echo "Check complete!"
```

Save as `check-deps.sh` and run:
```bash
chmod +x check-deps.sh
./check-deps.sh
```

---

## 🐛 Troubleshooting

### Issue: "command not found: claude-code"

**Cause**: Global npm bin directory not in PATH

**Solution:**
```bash
# Find npm global bin directory
npm config get prefix

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$PATH:$(npm config get prefix)/bin"

# Reload shell
source ~/.bashrc  # or source ~/.zshrc
```

---

### Issue: "Cannot find module '@anthropic-ai/claude-code'"

**Cause**: Package not installed globally

**Solution:**
```bash
# Install globally (not locally!)
npm install -g @anthropic-ai/claude-code

# Verify
npm list -g @anthropic-ai/claude-code
```

---

### Issue: "ccr: command not found"

**Cause**: Router not installed or not in PATH

**Solution:**
```bash
# Install globally
npm install -g @musistudio/claude-code-router

# Try alternate command
claude-code-router --help

# Add to PATH if needed
export PATH="$PATH:$(npm config get prefix)/bin"
```

---

### Issue: "Port 7000 already in use"

**Cause**: Another process using router's default port

**Solution:**
```bash
# Option 1: Stop other process
lsof -ti:7000 | xargs kill

# Option 2: Use different port
export PORT=7001
ccr start

# Update droid2api config
export OPENAI_BASE_URL="http://localhost:7001/v1"
```

---

## 🔄 Upgrade Existing Installation

If you already have older versions installed:

```bash
# Uninstall old versions
npm uninstall -g @anthropic-ai/claude-code
npm uninstall -g @musistudio/claude-code-router

# Clear npm cache
npm cache clean --force

# Install latest versions
npm install -g @anthropic-ai/claude-code@latest
npm install -g @musistudio/claude-code-router@latest

# Verify
npm list -g --depth=0
```

---

## 📋 Version Requirements

| Dependency | Minimum Version | Recommended |
|------------|----------------|-------------|
| Node.js | 18.x | 20.x or later |
| npm | 9.x | 10.x or later |
| @anthropic-ai/claude-code | 1.0.0 | latest |
| @musistudio/claude-code-router | 1.0.0 | latest |

---

## 🎯 Next Steps

After installing dependencies:

1. ✅ **Verify installation** - Run `check-deps.sh`
2. ✅ **Configure backends** - Set environment variables
3. ✅ **Start services** - Start router if using it
4. ✅ **Test droid2api** - Run `npm start`
5. ✅ **Test all formats** - Use test scripts

See **UPGRADE_v2.md** for complete usage guide!

---

## 💡 Pro Tips

### Tip 1: Use nvm for Node.js versions

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install latest Node.js LTS
nvm install --lts
nvm use --lts

# Verify
node --version
npm --version
```

### Tip 2: Use npm global prefix

```bash
# Set custom global directory (avoids permission issues)
mkdir ~/.npm-global
npm config set prefix ~/.npm-global

# Add to PATH in ~/.bashrc or ~/.zshrc
export PATH=~/.npm-global/bin:$PATH

# Install globals without sudo
npm install -g @anthropic-ai/claude-code
```

### Tip 3: Check for updates

```bash
# Check for outdated global packages
npm outdated -g

# Update specific package
npm update -g @anthropic-ai/claude-code

# Update all global packages
npm update -g
```

---

## 🚀 Quick Start After Installation

```bash
# 1. Verify dependencies
./check-deps.sh

# 2. Start router (optional)
ccr start

# 3. Configure droid2api
export ANTHROPIC_MODEL=glm-4.6
export ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
export ANTHROPIC_AUTH_TOKEN=your_token

# 4. Start droid2api
npm start

# 5. Test
curl http://localhost:3000/v1/models
```

**You're ready to go!** 🎉

