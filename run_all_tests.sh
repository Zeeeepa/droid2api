#!/bin/bash

# 🧪 droid2api v2.0 - Complete Test Suite Runner
# Runs both bash and Python tests for all 3 API formats

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================="
echo "🧪 droid2api v2.0 Complete Test Suite"
echo "========================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    echo "Install Python 3 to run Python tests"
    echo ""
    SKIP_PYTHON=true
else
    echo -e "${GREEN}✓ Python 3 found: $(python3 --version)${NC}"
    SKIP_PYTHON=false
fi

# Check Python dependencies
if [ "$SKIP_PYTHON" = false ]; then
    echo -n "Checking Python dependencies... "
    
    MISSING_DEPS=()
    
    if ! python3 -c "import openai" 2>/dev/null; then
        MISSING_DEPS+=("openai")
    fi
    
    if ! python3 -c "import anthropic" 2>/dev/null; then
        MISSING_DEPS+=("anthropic")
    fi
    
    if ! python3 -c "import google.generativeai" 2>/dev/null; then
        MISSING_DEPS+=("google-generativeai")
    fi
    
    if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
        echo -e "${YELLOW}Missing dependencies${NC}"
        echo ""
        echo -e "${YELLOW}Install with:${NC}"
        echo "  pip install -r test_requirements.txt"
        echo ""
        echo -e "${YELLOW}Or install individually:${NC}"
        for dep in "${MISSING_DEPS[@]}"; do
            echo "  pip install $dep"
        done
        echo ""
        echo -e "${YELLOW}Continuing with bash tests only...${NC}"
        SKIP_PYTHON=true
    else
        echo -e "${GREEN}✓ All dependencies installed${NC}"
    fi
fi

echo ""
echo "========================================="
echo ""

# Configuration
export PORT=${PORT:-3000}
export MODEL=${MODEL:-"glm-4.6"}
export AUTH_TOKEN=${AUTH_TOKEN:-"any"}

echo "Configuration:"
echo "  Port: $PORT"
echo "  Model: $MODEL"
echo "  Auth Token: $AUTH_TOKEN"
echo ""
echo "========================================="
echo ""

# Test 1: Bash curl tests
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 Running Bash/cURL Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -f "test_all_endpoints.sh" ]; then
    chmod +x test_all_endpoints.sh
    if ./test_all_endpoints.sh; then
        echo -e "${GREEN}✓ Bash tests completed successfully${NC}"
        BASH_TESTS_PASSED=true
    else
        echo -e "${RED}✗ Bash tests failed${NC}"
        BASH_TESTS_PASSED=false
    fi
else
    echo -e "${RED}✗ test_all_endpoints.sh not found${NC}"
    BASH_TESTS_PASSED=false
fi

echo ""

# Exit early if skipping Python tests
if [ "$SKIP_PYTHON" = true ]; then
    echo "========================================="
    echo "📊 Test Summary"
    echo "========================================="
    
    if [ "$BASH_TESTS_PASSED" = true ]; then
        echo -e "${GREEN}✓ Bash/cURL Tests: PASSED${NC}"
        echo -e "${YELLOW}⊘ Python Tests: SKIPPED (dependencies not installed)${NC}"
        echo ""
        echo "Install Python dependencies to run all tests:"
        echo "  pip install -r test_requirements.txt"
    else
        echo -e "${RED}✗ Bash/cURL Tests: FAILED${NC}"
        echo -e "${YELLOW}⊘ Python Tests: SKIPPED${NC}"
        exit 1
    fi
    
    exit 0
fi

# Test 2: OpenAI Python SDK
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🐍 Running OpenAI Python SDK Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -f "test_openai.py" ]; then
    chmod +x test_openai.py
    if python3 test_openai.py; then
        echo -e "${GREEN}✓ OpenAI tests completed successfully${NC}"
        OPENAI_TESTS_PASSED=true
    else
        echo -e "${RED}✗ OpenAI tests failed${NC}"
        OPENAI_TESTS_PASSED=false
    fi
else
    echo -e "${RED}✗ test_openai.py not found${NC}"
    OPENAI_TESTS_PASSED=false
fi

echo ""

# Test 3: Anthropic Python SDK
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🐍 Running Anthropic Python SDK Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -f "test_anthropic.py" ]; then
    chmod +x test_anthropic.py
    if python3 test_anthropic.py; then
        echo -e "${GREEN}✓ Anthropic tests completed successfully${NC}"
        ANTHROPIC_TESTS_PASSED=true
    else
        echo -e "${RED}✗ Anthropic tests failed${NC}"
        ANTHROPIC_TESTS_PASSED=false
    fi
else
    echo -e "${RED}✗ test_anthropic.py not found${NC}"
    ANTHROPIC_TESTS_PASSED=false
fi

echo ""

# Test 4: Gemini Python SDK
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🐍 Running Gemini Python SDK Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -f "test_gemini.py" ]; then
    chmod +x test_gemini.py
    if python3 test_gemini.py; then
        echo -e "${GREEN}✓ Gemini tests completed successfully${NC}"
        GEMINI_TESTS_PASSED=true
    else
        echo -e "${RED}✗ Gemini tests failed${NC}"
        GEMINI_TESTS_PASSED=false
    fi
else
    echo -e "${RED}✗ test_gemini.py not found${NC}"
    GEMINI_TESTS_PASSED=false
fi

echo ""

# Final Summary
echo "========================================="
echo "📊 Complete Test Summary"
echo "========================================="
echo ""

ALL_PASSED=true

if [ "$BASH_TESTS_PASSED" = true ]; then
    echo -e "${GREEN}✓ Bash/cURL Tests: PASSED${NC}"
else
    echo -e "${RED}✗ Bash/cURL Tests: FAILED${NC}"
    ALL_PASSED=false
fi

if [ "$OPENAI_TESTS_PASSED" = true ]; then
    echo -e "${GREEN}✓ OpenAI Python SDK Tests: PASSED${NC}"
else
    echo -e "${RED}✗ OpenAI Python SDK Tests: FAILED${NC}"
    ALL_PASSED=false
fi

if [ "$ANTHROPIC_TESTS_PASSED" = true ]; then
    echo -e "${GREEN}✓ Anthropic Python SDK Tests: PASSED${NC}"
else
    echo -e "${RED}✗ Anthropic Python SDK Tests: FAILED${NC}"
    ALL_PASSED=false
fi

if [ "$GEMINI_TESTS_PASSED" = true ]; then
    echo -e "${GREEN}✓ Gemini Python SDK Tests: PASSED${NC}"
else
    echo -e "${RED}✗ Gemini Python SDK Tests: FAILED${NC}"
    ALL_PASSED=false
fi

echo ""
echo "========================================="

if [ "$ALL_PASSED" = true ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}Universal Gateway is working perfectly!${NC}"
    echo "========================================="
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo "Please review the errors above"
    echo "========================================="
    exit 1
fi

