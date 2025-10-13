#!/bin/bash

# 🧪 droid2api v2.0 - Universal API Gateway Test Suite
# Tests all 3 API formats: OpenAI, Anthropic, Gemini

set -e  # Exit on error

# Configuration
PORT=${PORT:-3000}
BASE_URL="http://localhost:${PORT}"
MODEL=${MODEL:-"glm-4.6"}
AUTH_TOKEN=${AUTH_TOKEN:-"any"}

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "========================================="
echo "🧪 Testing droid2api Universal Gateway"
echo "========================================="
echo "Base URL: $BASE_URL"
echo "Model: $MODEL"
echo "========================================="
echo ""

# Function to print test headers
print_test_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Function to check if server is running
check_server() {
    echo -n "Checking if server is running... "
    if curl -s "$BASE_URL/v1/models" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Server is running${NC}"
        return 0
    else
        echo -e "${RED}✗ Server is not running${NC}"
        echo ""
        echo "Please start droid2api first:"
        echo "  npm start"
        echo ""
        exit 1
    fi
}

# Check server
check_server
echo ""

#############################################
# Test 1: OpenAI Format
#############################################
print_test_header "📋 Test 1: OpenAI Chat Completions Format"

echo "Endpoint: POST /v1/chat/completions"
echo "Expected Response: OpenAI format"
echo ""

OPENAI_RESPONSE=$(curl -s -X POST "${BASE_URL}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d "{
    \"model\": \"${MODEL}\",
    \"messages\": [{
      \"role\": \"user\",
      \"content\": \"What is Python? Answer in one sentence.\"
    }],
    \"stream\": false
  }")

echo "Response:"
echo "$OPENAI_RESPONSE" | jq -C '.' 2>/dev/null || echo "$OPENAI_RESPONSE"

# Validate OpenAI format
if echo "$OPENAI_RESPONSE" | jq -e '.choices[0].message.content' > /dev/null 2>&1; then
    CONTENT=$(echo "$OPENAI_RESPONSE" | jq -r '.choices[0].message.content')
    echo ""
    echo -e "${GREEN}✓ OpenAI format validated${NC}"
    echo -e "${GREEN}✓ Response content: $CONTENT${NC}"
else
    echo ""
    echo -e "${RED}✗ Invalid OpenAI format${NC}"
    exit 1
fi

#############################################
# Test 2: Anthropic Format
#############################################
print_test_header "📋 Test 2: Anthropic Messages Format"

echo "Endpoint: POST /v1/messages"
echo "Expected Response: Anthropic format"
echo ""

ANTHROPIC_RESPONSE=$(curl -s -X POST "${BASE_URL}/v1/messages" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -H "x-api-key: ${AUTH_TOKEN}" \
  -d "{
    \"model\": \"${MODEL}\",
    \"max_tokens\": 1024,
    \"messages\": [{
      \"role\": \"user\",
      \"content\": \"What is Python? Answer in one sentence.\"
    }]
  }")

echo "Response:"
echo "$ANTHROPIC_RESPONSE" | jq -C '.' 2>/dev/null || echo "$ANTHROPIC_RESPONSE"

# Validate Anthropic format
if echo "$ANTHROPIC_RESPONSE" | jq -e '.content[0].text' > /dev/null 2>&1; then
    CONTENT=$(echo "$ANTHROPIC_RESPONSE" | jq -r '.content[0].text')
    echo ""
    echo -e "${GREEN}✓ Anthropic format validated${NC}"
    echo -e "${GREEN}✓ Response content: $CONTENT${NC}"
else
    echo ""
    echo -e "${RED}✗ Invalid Anthropic format${NC}"
    exit 1
fi

#############################################
# Test 3: Gemini Format
#############################################
print_test_header "📋 Test 3: Gemini GenerateContent Format"

echo "Endpoint: POST /v1/generateContent"
echo "Expected Response: Gemini format"
echo ""

GEMINI_RESPONSE=$(curl -s -X POST "${BASE_URL}/v1/generateContent" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: ${AUTH_TOKEN}" \
  -d "{
    \"model\": \"${MODEL}\",
    \"contents\": [{
      \"role\": \"user\",
      \"parts\": [{
        \"text\": \"What is Python? Answer in one sentence.\"
      }]
    }]
  }")

echo "Response:"
echo "$GEMINI_RESPONSE" | jq -C '.' 2>/dev/null || echo "$GEMINI_RESPONSE"

# Validate Gemini format
if echo "$GEMINI_RESPONSE" | jq -e '.candidates[0].content.parts[0].text' > /dev/null 2>&1; then
    CONTENT=$(echo "$GEMINI_RESPONSE" | jq -r '.candidates[0].content.parts[0].text')
    echo ""
    echo -e "${GREEN}✓ Gemini format validated${NC}"
    echo -e "${GREEN}✓ Response content: $CONTENT${NC}"
else
    echo ""
    echo -e "${RED}✗ Invalid Gemini format${NC}"
    exit 1
fi

#############################################
# Test 4: Models Endpoint
#############################################
print_test_header "📋 Test 4: List Models Endpoint"

echo "Endpoint: GET /v1/models"
echo ""

MODELS_RESPONSE=$(curl -s "${BASE_URL}/v1/models" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

echo "Response:"
echo "$MODELS_RESPONSE" | jq -C '.' 2>/dev/null || echo "$MODELS_RESPONSE"

if echo "$MODELS_RESPONSE" | jq -e '.data[0].id' > /dev/null 2>&1; then
    MODEL_COUNT=$(echo "$MODELS_RESPONSE" | jq -r '.data | length')
    echo ""
    echo -e "${GREEN}✓ Models endpoint working${NC}"
    echo -e "${GREEN}✓ Available models: $MODEL_COUNT${NC}"
else
    echo ""
    echo -e "${RED}✗ Invalid models response${NC}"
    exit 1
fi

#############################################
# Summary
#############################################
print_test_header "📊 Test Summary"

echo -e "${GREEN}✓ OpenAI Format Test: PASSED${NC}"
echo -e "${GREEN}✓ Anthropic Format Test: PASSED${NC}"
echo -e "${GREEN}✓ Gemini Format Test: PASSED${NC}"
echo -e "${GREEN}✓ Models Endpoint Test: PASSED${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 All tests passed! Universal Gateway is working!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

