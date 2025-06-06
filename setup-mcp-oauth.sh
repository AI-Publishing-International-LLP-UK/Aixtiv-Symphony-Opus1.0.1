#!/bin/bash

# Setup OAuth2 credentials for DrClaude MCP Gateway
# This script creates and configures OAuth2 client credentials

echo "🔐 Setting up OAuth2 credentials for DrClaude MCP Gateway..."

# Check if we're in the right directory
if [ ! -f "./package.json" ]; then
    echo "❌ Please run this script from the integration-gateway directory"
    exit 1
fi

# Source environment variables
if [ -f ".env" ]; then
    source .env
fi

# Generate OAuth2 client credentials
MCP_CLIENT_ID="mcp-claude-$(date +%s)-$(openssl rand -hex 4)"
MCP_CLIENT_SECRET="$(openssl rand -base64 32 | tr -d '=+/' | cut -c1-32)"

echo "Generated OAuth2 credentials:"
echo "Client ID: $MCP_CLIENT_ID"
echo "Client Secret: [REDACTED]"

# Create OAuth2 application configuration
cat > /tmp/mcp-oauth-config.json << EOF
{
  "client_id": "$MCP_CLIENT_ID",
  "client_secret": "$MCP_CLIENT_SECRET",
  "application_name": "DrClaude MCP Gateway",
  "redirect_uris": [
    "https://drclaude.live/oauth/callback",
    "https://drclaude.live/mcp/auth/callback",
    "http://localhost:3000/oauth/callback"
  ],
  "scopes": [
    "mcp:read",
    "mcp:write",
    "mcp:execute"
  ],
  "grant_types": [
    "authorization_code",
    "refresh_token"
  ],
  "token_endpoint_auth_method": "client_secret_post"
}
EOF

# Store credentials in Google Cloud Secret Manager
echo "📦 Storing OAuth2 credentials in Secret Manager..."

echo -n "$MCP_CLIENT_ID" | gcloud secrets create mcp-oauth-client-id \
    --data-file=- \
    --project=api-for-warp-drive \
    --replication-policy="automatic" || \
gcloud secrets versions add mcp-oauth-client-id \
    --data-file=<(echo -n "$MCP_CLIENT_ID") \
    --project=api-for-warp-drive

echo -n "$MCP_CLIENT_SECRET" | gcloud secrets create mcp-oauth-client-secret \
    --data-file=- \
    --project=api-for-warp-drive \
    --replication-policy="automatic" || \
gcloud secrets versions add mcp-oauth-client-secret \
    --data-file=<(echo -n "$MCP_CLIENT_SECRET") \
    --project=api-for-warp-drive

# Store the full OAuth configuration
cat /tmp/mcp-oauth-config.json | gcloud secrets create mcp-oauth-config \
    --data-file=- \
    --project=api-for-warp-drive \
    --replication-policy="automatic" || \
cat /tmp/mcp-oauth-config.json | gcloud secrets versions add mcp-oauth-config \
    --data-file=- \
    --project=api-for-warp-drive

# Update Claude Desktop configuration with real credentials
echo "🔧 Updating Claude Desktop configuration..."

# Backup current config
cp "$HOME/Library/Application Support/Claude/claude_desktop_config.json" \
   "$HOME/Library/Application Support/Claude/claude_desktop_config.json.backup.$(date +%s)"

# Update the config with real credentials
sed -i.tmp "s/YOUR_CLIENT_ID_FROM_GATEWAY/$MCP_CLIENT_ID/g" \
    "$HOME/Library/Application Support/Claude/claude_desktop_config.json"

sed -i.tmp "s/YOUR_CLIENT_SECRET_FROM_GATEWAY/$MCP_CLIENT_SECRET/g" \
    "$HOME/Library/Application Support/Claude/claude_desktop_config.json"

# Clean up temporary files
rm -f "$HOME/Library/Application Support/Claude/claude_desktop_config.json.tmp"
rm -f /tmp/mcp-oauth-config.json

echo "✅ OAuth2 setup complete!"
echo ""
echo "📋 Summary:"
echo "   • OAuth2 client created with ID: $MCP_CLIENT_ID"
echo "   • Credentials stored in GCP Secret Manager"
echo "   • Claude Desktop config updated"
echo "   • Backup created: claude_desktop_config.json.backup.*"
echo ""
echo "🔄 Next steps:"
echo "   1. Restart Claude Desktop to load new configuration"
echo "   2. Test the MCP connection"
echo "   3. Verify OAuth flow works"

echo ""
echo "🚀 To restart Claude Desktop:"
echo "   pkill -f Claude && open -a Claude"

