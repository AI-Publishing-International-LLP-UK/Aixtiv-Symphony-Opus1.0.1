#!/bin/bash

echo "🔧 ZONE ID UPDATE HELPER"
echo "========================"
echo ""
echo "Please enter the Zone ID from your Cloudflare dashboard:"
echo "It should be a long string like: 1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p"
echo ""
echo -n "Zone ID: "
read ZONE_ID

if [ -z "$ZONE_ID" ]; then
    echo "❌ No Zone ID provided"
    exit 1
fi

if [ ${#ZONE_ID} -lt 20 ]; then
    echo "⚠️  Warning: Zone ID seems too short. Are you sure this is correct?"
    echo "Zone IDs are typically 32 characters long."
    echo -n "Continue anyway? (y/n): "
    read confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "❌ Cancelled"
        exit 1
    fi
fi

echo "📝 Updating Zone ID secret..."
echo "$ZONE_ID" | gcloud secrets versions add cloudflare-zone-id --data-file=- --project="api-for-warp-drive"

if [ $? -eq 0 ]; then
    echo "✅ Zone ID secret updated successfully!"
    echo ""
    echo "🚀 Ready to run production deployment?"
    echo -n "Run ./deploy-production-final.sh now? (y/n): "
    read run_deploy
    if [[ "$run_deploy" =~ ^[Yy]$ ]]; then
        echo ""
        echo "🚀 Starting production deployment..."
        ./deploy-production-final.sh
    else
        echo "✅ Zone ID updated. Run './deploy-production-final.sh' when ready."
    fi
else
    echo "❌ Failed to update Zone ID secret"
    exit 1
fi
