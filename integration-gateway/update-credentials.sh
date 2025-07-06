#!/bin/bash

# Simple script to update production credentials
echo "🔐 UPDATING PRODUCTION CREDENTIALS"
echo "=================================="
echo ""

PROJECT_ID="api-for-warp-drive"

echo "Please provide your Cloudflare credentials:"
echo ""

# Get API Token
echo -n "Paste your Cloudflare API Token: "
read -s CLOUDFLARE_API_TOKEN
echo ""

# Get Zone ID  
echo -n "Enter your Zone ID for 2100.cool: "
read CLOUDFLARE_ZONE_ID

echo ""
echo "Updating GCP Secret Manager..."

# Update API Token
echo "$CLOUDFLARE_API_TOKEN" | gcloud secrets versions add cloudflare-api-token --data-file=-
echo "✅ Updated API Token"

# Update Zone ID
echo "$CLOUDFLARE_ZONE_ID" | gcloud secrets versions add cloudflare-zone-id --data-file=-
echo "✅ Updated Zone ID"

# Update Email
echo "pr@coaching2100.com" | gcloud secrets versions add cloudflare-email --data-file=-
echo "✅ Updated Email"

# Update production IPs
echo "199.36.158.100" | gcloud secrets versions add warpdrive-prod01-ip --data-file=-
echo "✅ Updated Primary IP"

echo "199.36.158.100" | gcloud secrets versions add warpdrive-prod01-backup-ip --data-file=-
echo "✅ Updated Backup IP"

echo ""
echo "🎉 All credentials updated! Testing connection..."

# Test the connection
API_TOKEN=$(gcloud secrets versions access latest --secret="cloudflare-api-token" --project="$PROJECT_ID")
ZONE_ID=$(gcloud secrets versions access latest --secret="cloudflare-zone-id" --project="$PROJECT_ID")

response=$(curl -s -X GET "https://api.cloudflare.com/v4/zones/$ZONE_ID" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json")

if echo "$response" | jq -e '.success' >/dev/null 2>&1; then
    zone_name=$(echo "$response" | jq -r '.result.name')
    echo "✅ SUCCESS! Connected to zone: $zone_name"
else
    echo "❌ ERROR: Could not connect to Cloudflare API"
    echo "Response: $response"
fi
