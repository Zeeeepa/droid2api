#!/usr/bin/env python3
"""
🧪 droid2api v2.0 - OpenAI Format Test
Tests OpenAI API format with chat completions endpoint
"""

import os
from openai import OpenAI

# Configuration
PORT = os.getenv("PORT", "3000")
BASE_URL = f"http://localhost:{PORT}/v1"
API_KEY = os.getenv("AUTH_TOKEN", "any")
MODEL = os.getenv("MODEL", "glm-4.6")

print("=" * 50)
print("🧪 Testing OpenAI Chat Completions Format")
print("=" * 50)
print(f"Base URL: {BASE_URL}")
print(f"Model: {MODEL}")
print("=" * 50)
print()

# Initialize client
client = OpenAI(
    base_url=BASE_URL,
    api_key=API_KEY
)

try:
    print("Sending request to /v1/chat/completions...")
    print()
    
    # Non-streaming request
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{
            "role": "user",
            "content": "What is Python? Answer in one sentence."
        }],
        stream=False
    )
    
    print("Response received!")
    print()
    print("─" * 50)
    print("Response Content:")
    print("─" * 50)
    print(response.choices[0].message.content)
    print("─" * 50)
    print()
    
    # Print metadata
    print("Response Metadata:")
    print(f"  ID: {response.id}")
    print(f"  Model: {response.model}")
    print(f"  Finish Reason: {response.choices[0].finish_reason}")
    
    if response.usage:
        print(f"  Tokens Used:")
        print(f"    Prompt: {response.usage.prompt_tokens}")
        print(f"    Completion: {response.usage.completion_tokens}")
        print(f"    Total: {response.usage.total_tokens}")
    
    print()
    print("✅ OpenAI format test PASSED!")
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
    stream = client.chat.completions.create(
        model=MODEL,
        messages=[{
            "role": "user",
            "content": "Count from 1 to 5, one number per line."
        }],
        stream=True
    )
    
    print("Streaming response:")
    print("─" * 50)
    for chunk in stream:
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end="", flush=True)
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

print("=" * 50)
print("🎉 OpenAI format tests complete!")
print("=" * 50)

