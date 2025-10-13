#!/bin/bash

# ============================================================================
# Gemini API Support Installer for droid2api
# ============================================================================
# This script upgrades routes.js to add native Gemini API support
# ============================================================================

set -e

echo "=============================================="
echo "  🔧 Installing Gemini API Support"
echo "=============================================="
echo ""

# Check if routes.js exists
if [ ! -f "routes.js" ]; then
    echo "❌ Error: routes.js not found in current directory"
    echo "Please run this script from the droid2api root directory"
    exit 1
fi

# Check if transformers exist
if [ ! -f "transformers/request-gemini.js" ] || [ ! -f "transformers/response-gemini.js" ]; then
    echo "❌ Error: Gemini transformers not found"
    echo "Please ensure request-gemini.js and response-gemini.js are in transformers/"
    exit 1
fi

# Check if already installed
if grep -q "request-gemini" routes.js; then
    echo "⚠️  Gemini support appears to be already installed"
    read -p "Do you want to reinstall? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled"
        exit 0
    fi
fi

echo "📦 Creating backup of routes.js..."
cp routes.js routes.js.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backup created"
echo ""

echo "🔍 Analyzing routes.js structure..."

# Find the position to insert imports (after existing imports)
IMPORT_LINE=$(grep -n "^import.*from.*'./transformers" routes.js | tail -1 | cut -d: -f1)

if [ -z "$IMPORT_LINE" ]; then
    echo "❌ Error: Could not find transformer imports in routes.js"
    exit 1
fi

echo "📝 Adding Gemini imports after line $IMPORT_LINE..."

# Create temp file with new imports
head -n "$IMPORT_LINE" routes.js > routes.js.tmp
cat >> routes.js.tmp << 'EOF'
import { geminiToOpenAI, openaiToGemini } from './transformers/request-gemini.js';
import { GeminiResponseTransformer } from './transformers/response-gemini.js';
EOF
tail -n +$((IMPORT_LINE + 1)) routes.js >> routes.js.tmp

# Find where to insert the Gemini route (before export default)
EXPORT_LINE=$(grep -n "^export default router" routes.js.tmp | head -1 | cut -d: -f1)

if [ -z "$EXPORT_LINE" ]; then
    echo "❌ Error: Could not find 'export default router' in routes.js"
    rm routes.js.tmp
    exit 1
fi

echo "📝 Adding Gemini endpoint before line $EXPORT_LINE..."

# Create final file with Gemini route
head -n $((EXPORT_LINE - 1)) routes.js.tmp > routes.js.new
cat >> routes.js.new << 'GEMINIROUTE'

// ============================================================================
// Gemini API Format Handler
// ============================================================================
router.post('/v1/generateContent', async (req, res) => {
  logInfo('Gemini API request received');
  
  try {
    // Convert Gemini request to OpenAI format internally
    const openaiRequest = geminiToOpenAI(req.body);
    
    // Use existing processing logic
    const { backendRequest, selectedModel } = await processRequest(
      openaiRequest, 
      req.headers.authorization
    );

    logInfo('Processed Gemini request', { model: selectedModel.id });

    // Handle streaming
    if (backendRequest.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        const backendResponse = await forwardRequest(backendRequest, selectedModel);
        const transformer = new GeminiResponseTransformer(selectedModel.id);

        for await (const chunk of transformer.transformStream(backendResponse.body)) {
          res.write(chunk);
        }

        res.end();
      } catch (error) {
        logError('Gemini streaming error', error);
        res.status(500).json({
          error: {
            message: error.message,
            type: 'internal_error'
          }
        });
      }
    } else {
      // Non-streaming response
      const backendResponse = await forwardRequest(backendRequest, selectedModel);
      const openaiResponse = await backendResponse.json();

      // Convert OpenAI response back to Gemini format
      const geminiResponse = openaiToGemini(openaiResponse);
      
      res.json(geminiResponse);
    }
  } catch (error) {
    logError('Gemini request processing error', error);
    res.status(error.status || 500).json({
      error: {
        message: error.message || 'Internal server error',
        type: 'internal_error'
      }
    });
  }
});

GEMINIROUTE

tail -n +$EXPORT_LINE routes.js.tmp >> routes.js.new

# Replace original with new version
mv routes.js.new routes.js
rm routes.js.tmp

echo "✅ Gemini support installed successfully!"
echo ""
echo "=============================================="
echo "  📋 Installation Summary"
echo "=============================================="
echo ""
echo "✓ Added Gemini transformer imports"
echo "✓ Added /v1/generateContent endpoint"
echo "✓ Backup saved to routes.js.backup.*"
echo ""
echo "🎯 Gemini API is now available at:"
echo "   POST /v1/generateContent"
echo ""
echo "📖 Supported Gemini features:"
echo "   • contents/parts structure"
echo "   • systemInstruction"
echo "   • generationConfig"
echo "   • Streaming responses"
echo "   • Multi-modal (text + images)"
echo "   • Tool/function calling"
echo ""
echo "🚀 Restart droid2api to activate:"
echo "   npm start"
echo ""
echo "Done! 🎉"

