#!/bin/bash

echo "🤖 Deploying Anthropic Claude Squadron 04 Instances"
echo "=================================================="

PROJECT_ID="api-for-warp-drive"
REGION="us-west1"

# Deploy dr-claude-01 through dr-claude-05 using Anthropic Claude API
for i in {01..05}; do
  echo "Deploying dr-claude-${i} with Anthropic integration..."
  
  # Create Cloud Function that uses Anthropic Claude API
  gcloud functions deploy "dr-claude-${i}" \
    --gen2 \
    --runtime=nodejs20 \
    --region=${REGION} \
    --trigger-http \
    --set-env-vars="ANTHROPIC_API_KEY=your-api-key,INSTANCE_ID=${i},SQUADRON=04,PILOT_TYPE=DR_CLAUDE_RIX,PROVIDER=ANTHROPIC,HRAICRMS_ENABLED=true" \
    --source=https://github.com/anthropics/anthropic-sdk-javascript
    
  echo "✅ dr-claude-${i} deployed with Anthropic integration"
done

echo "🎯 All Dr. Claude Squadron 04 instances deployed from Anthropic!"
