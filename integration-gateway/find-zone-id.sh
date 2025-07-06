#!/bin/bash

# Script to help find the Zone ID for 2100.cool
echo "🔍 CLOUDFLARE ZONE ID FINDER"
echo "============================"

# Get the API token from secrets
CLOUDFLARE_API_TOKEN=$(gcloud secrets versions access latest --secret="cloudflare-api-token" --project="api-for-warp-drive" 2>/dev/null)

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ Could not retrieve Cloudflare API token from secrets"
    exit 1
fi

echo "✅ Found Cloudflare API token"
echo ""
echo "🔍 Looking up Zone ID for 2100.cool..."

# Try to find the zone ID
response=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=2100.cool" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json")

# Check if successful
if echo "$response" | jq -e '.success' >/dev/null 2>&1; then
    zone_id=$(echo "$response" | jq -r '.result[0].id // empty')
    zone_name=$(echo "$response" | jq -r '.result[0].name // empty')
    
    if [ -n "$zone_id" ] && [ "$zone_id" != "null" ]; then
        echo "✅ Found Zone ID!"
        echo ""
        echo "📋 Zone Information:"
        echo "   Domain: $zone_name"
        echo "   Zone ID: $zone_id"
        echo ""
        echo "🔧 Would you like to update the secret with this Zone ID? (y/n)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            echo "$zone_id" | gcloud secrets versions add cloudflare-zone-id --data-file=-
            echo "✅ Zone ID secret updated successfully!"
        fi
    else
        echo "❌ Zone not found. Please check:"
        echo "   1. Domain is added to your Cloudflare account"
        echo "   2. API token has zone read permissions"
    fi
else
    echo "❌ API request failed. Error details:"
    echo "$response" | jq '.errors' 2>/dev/null || echo "$response"
    echo ""
    echo "💡 Please manually get the Zone ID from your Cloudflare dashboard:"
    echo "   1. Go to: https://dash.cloudflare.com"
    echo "   2. Click on: 2100.cool"
    echo "   3. Find 'Zone ID' in the right sidebar under 'API' section"
    echo "   4. Copy the long alphanumeric string (not the domain name)"
fi
