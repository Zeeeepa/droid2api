#!/usr/bin/env python3
"""
🧪 droid2api v2.0 - Gemini Format Test
Tests Google Gemini GenerativeAI API format
"""

import os
import google.generativeai as genai

# Configuration
PORT = os.getenv("PORT", "3000")
BASE_URL = f"http://localhost:{PORT}"
API_KEY = os.getenv("AUTH_TOKEN", "any")
MODEL_NAME = os.getenv("MODEL", "glm-4.6")

print("=" * 50)
print("🧪 Testing Gemini GenerateContent Format")
print("=" * 50)
print(f"Base URL: {BASE_URL}")
print(f"Model: {MODEL_NAME}")
print("=" * 50)
print()

# Configure Gemini client with custom base URL
genai.configure(
    api_key=API_KEY,
    transport="rest",
    client_options={"api_endpoint": BASE_URL}
)

try:
    print("Initializing Gemini model...")
    model = genai.GenerativeModel(MODEL_NAME)
    
    print("Sending request to /v1/generateContent...")
    print()
    
    # Non-streaming request
    response = model.generate_content("What is Python? Answer in one sentence.")
    
    print("Response received!")
    print()
    print("─" * 50)
    print("Response Content:")
    print("─" * 50)
    print(response.text)
    print("─" * 50)
    print()
    
    # Print metadata
    print("Response Metadata:")
    if hasattr(response, 'candidates') and response.candidates:
        candidate = response.candidates[0]
        print(f"  Finish Reason: {candidate.finish_reason}")
        if hasattr(candidate, 'safety_ratings'):
            print(f"  Safety Ratings: {len(candidate.safety_ratings)} categories")
    
    if hasattr(response, 'usage_metadata'):
        usage = response.usage_metadata
        print(f"  Tokens Used:")
        print(f"    Prompt: {usage.prompt_token_count}")
        print(f"    Candidates: {usage.candidates_token_count}")
        print(f"    Total: {usage.total_token_count}")
    
    print()
    print("✅ Gemini format test PASSED!")
    print()

except Exception as e:
    print()
    print(f"❌ Test FAILED: {e}")
    print()
    exit(1)

# Test streaming
print("=" * 50)
print("Testing streaming response...")
print("=" * 50)
print()

try:
    response = model.generate_content(
        "Count from 1 to 5, one number per line.",
        stream=True
    )
    
    print("Streaming response:")
    print("─" * 50)
    for chunk in response:
        if chunk.text:
            print(chunk.text, end="", flush=True)
    print()
    print("─" * 50)
    print()
    print("✅ Streaming test PASSED!")
    print()

except Exception as e:
    print()
    print(f"⚠️  Streaming test FAILED: {e}")
    print("(Streaming might not be supported yet)")
    print()

# Test multi-turn chat
print("=" * 50)
print("Testing multi-turn chat...")
print("=" * 50)
print()

try:
    chat = model.start_chat(history=[
        {
            "role": "user",
            "parts": ["What is 2 + 2?"]
        },
        {
            "role": "model",
            "parts": ["2 + 2 equals 4."]
        }
    ])
    
    response = chat.send_message("What about 3 + 3?")
    
    print("Response:")
    print("─" * 50)
    print(response.text)
    print("─" * 50)
    print()
    print("✅ Multi-turn chat test PASSED!")
    print()

except Exception as e:
    print()
    print(f"⚠️  Multi-turn chat test FAILED: {e}")
    print()

# Test with system instruction
print("=" * 50)
print("Testing with system instruction...")
print("=" * 50)
print()

try:
    model_with_system = genai.GenerativeModel(
        MODEL_NAME,
        system_instruction="You are a helpful assistant that always responds in rhyme."
    )
    
    response = model_with_system.generate_content("Tell me about Python programming.")
    
    print("Response:")
    print("─" * 50)
    print(response.text)
    print("─" * 50)
    print()
    print("✅ System instruction test PASSED!")
    print()

except Exception as e:
    print()
    print(f"⚠️  System instruction test FAILED: {e}")
    print()

print("=" * 50)
print("🎉 Gemini format tests complete!")
print("=" * 50)

