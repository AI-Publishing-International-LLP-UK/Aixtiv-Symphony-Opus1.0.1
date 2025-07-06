#!/bin/bash

# Deploy Model Context Protocol (MCP) server to api-for-warp-drive
# This script uses Firebase to deploy to the api-for-warp-drive project
# Note: The aixtiv.js steps have been skipped due to dependency issues

echo "🚀 Deploying Model Context Protocol (MCP) server to api-for-warp-drive..."

# Step 1: Verify domain configuration
echo "Verifying api-for-warp-drive project configuration..."
# Commenting out domain verification as we're using project ID instead
# ./bin/aixtiv.js domain verify drclaude.live

# Step 2: Use Claude Automation to prepare repository (SKIPPED)
# echo "Using Dr. Claude Automation to prepare and sync deployment..."
# ./bin/aixtiv.js claude:automation:github \
#   --repository "Dr-Claude-Automation" \
#   --action "sync" \
#   --branch "main" \
#   --organization "AI-Publishing-International-LLP-UK"
echo "Skipping Dr. Claude Automation GitHub sync step due to dependency issues..."

# Step 2: Configure firebase project for api-for-warp-drive
echo "Configuring Firebase project for api-for-warp-drive..."
firebase use api-for-warp-drive

# Step 3: Deploy to Firebase hosting and functions
echo "Deploying to Firebase hosting and functions..."
firebase deploy --only hosting,functions --project api-for-warp-drive

echo "✅ Model Context Protocol server deployment complete!"
echo "Your MCP server is now available at: https://api-for-warp-drive.web.app/"
