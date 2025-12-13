#!/bin/bash

echo "=== Testing Authentication Flow ==="
echo ""

# Step 1: Login to get token
echo "1. Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

echo "Login Response: $LOGIN_RESPONSE"
echo ""

# Extract token from response (requires jq)
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token. Login may have failed."
  exit 1
fi

echo "✅ Token obtained: ${TOKEN:0:20}..."
echo ""

# Step 2: Try to delete post WITHOUT token (should fail)
echo "2. Attempting DELETE without token (should fail)..."
curl -s -X DELETE http://localhost:5000/api/posts/6 \
  -H "Content-Type: application/json" | jq '.'
echo ""

# Step 3: Try to delete post WITH token (should succeed)
echo "3. Attempting DELETE with token (should succeed)..."
curl -s -X DELETE http://localhost:5000/api/posts/6 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

echo "=== Test Complete ==="
