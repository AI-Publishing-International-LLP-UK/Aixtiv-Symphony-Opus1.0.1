#!/bin/bash

echo "🤖 Deploying Dr. Claude Squadron 04 Instances"
echo "============================================="

PROJECT_ID="api-for-warp-drive"
REGION="us-west1"

# Deploy dr-claude-01 through dr-claude-05
for i in {01..05}; do
  echo "Deploying dr-claude-${i}..."
  
  # Create Cloud Function for each instance
  gcloud functions deploy "dr-claude-${i}" \
    --gen2 \
    --runtime=nodejs20 \
    --region=${REGION} \
    --source=. \
    --entry-point=drClaude \
    --trigger-http \
    --allow-unauthenticated \
    --set-env-vars="INSTANCE_ID=${i},SQUADRON=04,PILOT_TYPE=DR_CLAUDE_RIX"
    
  echo "✅ dr-claude-${i} deployed"
done

echo "🎯 All Dr. Claude Squadron 04 instances deployed!"
