#!/bin/bash

# Script to switch between different Claude models
echo "======================================================"
echo "Claude Model Switcher"
echo "======================================================"

# Available models
echo "Available Claude models:"
echo "1) Claude 4.0 (MAX) - claude-3-opus-20240229"
echo "2) Claude 3.5 Sonnet - claude-3-5-sonnet-20240620"
echo "3) Claude 3.7 Sonnet (Google Cloud) - claude-3-7-sonnet-20250219"
echo "4) Super Claude 3 (Google Cloud) - superclaude"

# Ask for selection
echo -n "Select a model (1-4): "
read SELECTION

# Set environment variables based on selection
case $SELECTION in
  1)
    # Claude 4.0 (MAX) via Anthropic API
    echo "Setting up Claude 4.0 (MAX)..."
    
    # Check if CLAUDE_MAX_API_KEY is set
    if [ -z "$CLAUDE_MAX_API_KEY" ]; then
      if [ -f "/Users/as/asoos/integration-gateway/.env" ] && grep -q "CLAUDE_MAX_API_KEY" "/Users/as/asoos/integration-gateway/.env"; then
        source "/Users/as/asoos/integration-gateway/.env"
      else
        # Try to get from GCP Secret Manager
        export CLAUDE_MAX_API_KEY=$(gcloud secrets versions access latest --secret=claude-max-key 2>/dev/null)
        
        if [ -z "$CLAUDE_MAX_API_KEY" ]; then
          echo "Error: CLAUDE_MAX_API_KEY not found. Please run setup-claude-max.sh first."
          exit 1
        fi
      fi
    fi
    
    export ANTHROPIC_API_KEY=$CLAUDE_MAX_API_KEY
    export CLAUDE_MODEL="claude-3-opus-20240229"
    export CLAUDE_MODEL_MAX_TOKENS=200000
    export CLAUDE_API_ENDPOINT="https://api.anthropic.com/v1/messages"
    echo "Using Claude 4.0 (MAX) with 200,000 token limit"
    ;;
  2)
    # Claude 3.5 Sonnet via Anthropic API
    echo "Setting up Claude 3.5 Sonnet..."
    
    # Check if ANTHROPIC_API_KEY is set
    if [ -z "$ANTHROPIC_API_KEY" ]; then
      if [ -f "/Users/as/asoos/integration-gateway/.env" ] && grep -q "ANTHROPIC_API_KEY" "/Users/as/asoos/integration-gateway/.env"; then
        source "/Users/as/asoos/integration-gateway/.env"
      else
        # Try to get from GCP Secret Manager
        export ANTHROPIC_API_KEY=$(gcloud secrets versions access latest --secret=anthropic-admin 2>/dev/null)
        
        if [ -z "$ANTHROPIC_API_KEY" ]; then
          echo "Error: ANTHROPIC_API_KEY not found. Please set this environment variable."
          exit 1
        fi
      fi
    fi
    
    export CLAUDE_MODEL="claude-3-5-sonnet-20240620"
    export CLAUDE_MODEL_MAX_TOKENS=200000
    export CLAUDE_API_ENDPOINT="https://api.anthropic.com/v1/messages"
    echo "Using Claude 3.5 Sonnet with 200,000 token limit"
    ;;
  3)
    # Claude 3.7 Sonnet via Google Cloud
    echo "Setting up Claude 3.7 Sonnet via Google Cloud..."
    
    # Check authentication with GCP
    gcloud auth application-default print-access-token > /dev/null 2>&1 || (
      echo "Not authenticated with GCP. Authenticating..." && 
      gcloud auth application-default login
    )
    
    export CLAUDE_MODEL="claude-3-7-sonnet-20250219"
    export CLAUDE_MODEL_MAX_TOKENS=200000
    export CLAUDE_API_ENDPOINT="https://us-west1-aiplatform.googleapis.com/v1/projects/api-for-warp-drive/locations/us-west1/publishers/anthropic/models/claude-3-7-sonnet@20250219:predict"
    export CLAUDE_PROVIDER="google"
    export CLAUDE_PROJECT_ID="api-for-warp-drive"
    export CLAUDE_REGION="us-west1"
    echo "Using Claude 3.7 Sonnet via Google Cloud"
    ;;
  4)
    # Super Claude 3 via Google Cloud
    echo "Setting up Super Claude 3 via Google Cloud..."
    
    # Check authentication with GCP
    gcloud auth application-default print-access-token > /dev/null 2>&1 || (
      echo "Not authenticated with GCP. Authenticating..." && 
      gcloud auth application-default login
    )
    
    export CLAUDE_MODEL="superclaude"
    export CLAUDE_MODEL_MAX_TOKENS=200000
    export CLAUDE_API_ENDPOINT="https://us-west1-aiplatform.googleapis.com/v1/projects/api-for-warp-drive/locations/us-west1/models/superclaude:predict"
    export CLAUDE_PROVIDER="google"
    export CLAUDE_PROJECT_ID="api-for-warp-drive"
    export CLAUDE_REGION="us-west1"
    echo "Using Super Claude 3 via Google Cloud"
    ;;
  *)
    echo "Invalid selection."
    exit 1
    ;;
esac

# Ask if the user wants to run a command with this model
echo -n "Do you want to run a command with this model? (y/n): "
read RUN_COMMAND

if [ "$RUN_COMMAND" = "y" ] || [ "$RUN_COMMAND" = "Y" ]; then
  echo -n "Enter your task description: "
  read TASK
  
  cd /Users/as/asoos/aixtiv-cli
  if [[ "$SELECTION" == "1" || "$SELECTION" == "2" ]]; then
    # For Anthropic API models
    node bin/aixtiv.js claude:code:generate -t "$TASK"
  else
    # For Google Cloud models
    echo "Using Google Cloud model. This feature is not yet fully implemented."
    echo "Please use the Anthropic API models for now."
  fi
fi

echo ""
echo "======================================================"
echo "Environment variables have been set for the selected Claude model."
echo "You can now use the AIXTIV CLI with this model."
echo "======================================================"

