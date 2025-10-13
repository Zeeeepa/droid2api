#!/usr/bin/env python3
"""
🧪 droid2api v2.0 - Anthropic Format Test
Tests Anthropic Messages API format
"""

import os
from anthropic import Anthropic

# Configuration
PORT = os.getenv("PORT", "3000")
BASE_URL = f"http://localhost:{PORT}"
API_KEY = os.getenv("AUTH_TOKEN", "any")
MODEL = os.getenv("MODEL", "glm-4.6")

print("=" * 50)
print("🧪 Testing Anthropic Messages Format")
print("=" * 50)
print(f"Base URL: {BASE_URL}")
print(f"Model: {MODEL}")
print("=" * 50)
print()

# Initialize client
client = Anthropic(
    base_url=BASE_URL,
    api_key=API_KEY
)

try:
    print("Sending request to /v1/messages...")
    print()
    
    # Non-streaming request
    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": "What is Python? Answer in one sentence."
        }]
    )
    
    print("Response received!")
    print()
    print("─" * 50)
    print("Response Content:")
    print("─" * 50)
    print(response.content[0].text)
    print("─" * 50)
    print()
    
    # Print metadata
    print("Response Metadata:")
    print(f"  ID: {response.id}")
    print(f"  Model: {response.model}")
    print(f"  Role: {response.role}")
    print(f"  Stop Reason: {response.stop_reason}")
    
    if response.usage:
        print(f"  Tokens Used:")
        print(f"    Input: {response.usage.input_tokens}")
        print(f"    Output: {response.usage.output_tokens}")
    
    print()
    print("✅ Anthropic format test PASSED!")
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
    print("Streaming response:")
    print("─" * 50)
    
    with client.messages.stream(
        model=MODEL,
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": "Count from 1 to 5, one number per line."
        }]
    ) as stream:
        for text in stream.text_stream:
            print(text, end="", flush=True)
    
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

# Test multi-turn conversation
print("=" * 50)
print("Testing multi-turn conversation...")
print("=" * 50)
print()

try:
    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": "What is 2 + 2?"
            },
            {
                "role": "assistant",
                "content": "2 + 2 equals 4."
            },
            {
                "role": "user",
                "content": "What about 3 + 3?"
            }
        ]
    )
    
    print("Response:")
    print("─" * 50)
    print(response.content[0].text)
    print("─" * 50)
    print()
    print("✅ Multi-turn conversation test PASSED!")
    print()

except Exception as e:
    print()
    print(f"⚠️  Multi-turn test FAILED: {e}")
    print()

print("=" * 50)
print("🎉 Anthropic format tests complete!")
print("=" * 50)

