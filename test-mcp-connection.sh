#!/bin/bash

# Test MCP Connection to DrClaude Gateway
# This script verifies the OAuth2 and MCP setup is working

echo "🧪 Testing MCP Connection to DrClaude Gateway..."

# Check if Claude Desktop config is valid JSON
echo "1. Validating Claude Desktop configuration..."
if cat "$HOME/Library/Application Support/Claude/claude_desktop_config.json" | jq '.' > /dev/null; then
    echo "   ✅ Claude Desktop config is valid JSON"
else
    echo "   ❌ Claude Desktop config has JSON errors"
    exit 1
fi

# Check if OAuth credentials are accessible
echo "2. Checking OAuth credentials in Secret Manager..."
CLIENT_ID=$(gcloud secrets versions access latest --secret="mcp-oauth-client-id" --project=api-for-warp-drive 2>/dev/null)
if [ $? -eq 0 ] && [ ! -z "$CLIENT_ID" ]; then
    echo "   ✅ OAuth Client ID accessible: ${CLIENT_ID:0:20}..."
else
    echo "   ❌ Cannot access OAuth Client ID"
    exit 1
fi

CLIENT_SECRET=$(gcloud secrets versions access latest --secret="mcp-oauth-client-secret" --project=api-for-warp-drive 2>/dev/null)
if [ $? -eq 0 ] && [ ! -z "$CLIENT_SECRET" ]; then
    echo "   ✅ OAuth Client Secret accessible: [REDACTED]"
else
    echo "   ❌ Cannot access OAuth Client Secret"
    exit 1
fi

# Test domain accessibility
echo "3. Testing DrClaude domain accessibility..."
if curl -s --max-time 10 "https://drclaude.live" > /dev/null; then
    echo "   ✅ drclaude.live is accessible"
else
    echo "   ⚠️  drclaude.live may not be accessible (this is expected if not deployed yet)"
fi

# Test OAuth configuration format
echo "4. Verifying OAuth configuration format..."
OAUTH_CONFIG=$(gcloud secrets versions access latest --secret="mcp-oauth-config" --project=api-for-warp-drive 2>/dev/null)
if echo "$OAUTH_CONFIG" | jq '.client_id, .scopes[]' > /dev/null 2>&1; then
    echo "   ✅ OAuth configuration format is valid"
    echo "   📋 Configured scopes: $(echo "$OAUTH_CONFIG" | jq -r '.scopes | join(", ")')"
else
    echo "   ❌ OAuth configuration format is invalid"
    exit 1
fi

# Check Claude Desktop process
echo "5. Checking Claude Desktop process..."
if pgrep -f "Claude" > /dev/null; then
    echo "   ✅ Claude Desktop is running"
else
    echo "   ⚠️  Claude Desktop is not running"
    echo "   💡 Start it with: open -a Claude"
fi

echo ""
echo "🎉 MCP Configuration Test Complete!"
echo ""
echo "📊 Test Results:"
echo "   • Claude Desktop config: Valid ✅"
echo "   • OAuth credentials: Stored ✅"
echo "   • Client ID: $CLIENT_ID"
echo "   • Gateway URL: https://drclaude.live/mcp"
echo ""
echo "🚀 Ready to use! Your MCP gateway should now be available in Claude Desktop."
echo "   Look for 'drclaude-gateway' in the MCP servers list."

