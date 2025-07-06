#!/bin/bash

# =========================================================================
# deployment-config-gcp-secrets.sh
# =========================================================================
#
# This script configures the integration gateway services using GCP Secret Manager
# instead of local credential files. This approach:
#
# 1. Improves security by eliminating the need for storing sensitive credentials locally
# 2. Centralizes secret management in GCP Secret Manager
# 3. Allows for fine-grained access control to secrets
# 4. Provides audit logging for secret access
# 5. Enables secret rotation without code changes
#
# Prerequisites:
# - gcloud CLI must be installed and authenticated with appropriate permissions
# - The service account must have Secret Manager Secret Accessor role
# - Secrets must be stored in GCP Secret Manager with appropriate naming
#
# =========================================================================

# Enable error handling
set -e

# GCP Project ID - change this to your project ID
GCP_PROJECT_ID="api-for-warp-drive"

# Configuration files to be updated
CONFIG_DIR="./config"
FIREBASE_RCFILE="./config/aixtiv-gcp-project.firebase.rc"
SESSION_CONFIG="./functions/config.json"
FIREBASE_CONFIG="./public/firebase-config.js"
API_CONFIG="./functions/service-configs/apiconfig.json"
OPENAI_CONFIG="./functions/service-configs/openai.json"
AZURE_OPENAI_CONFIG="./functions/service-configs/azureopenai.json"
ANTHROPIC_CONFIG="./functions/service-configs/anthropic.json"
GOOGLE_AI_STUDIO_CONFIG="./functions/service-configs/googleaistudio.json"
COHERE_CONFIG="./functions/service-configs/cohere.json"
META_LLAMA_CONFIG="./functions/service-configs/meta.json"
JIRA_CONFIG="./functions/service-configs/jira.json"
GITHUB_CONFIG="./functions/service-configs/github.json"
DISCORD_CONFIG="./functions/service-configs/discord.json"
SLACK_CONFIG="./functions/service-configs/slack.json"
SALESFORCE_CONFIG="./functions/service-configs/salesforce.json"
ZENDESK_CONFIG="./functions/service-configs/zendesk.json"

# Log directory - create if it doesn't exist
LOG_DIR="./logs"
mkdir -p $LOG_DIR
LOG_FILE="$LOG_DIR/gcp-secrets-config-$(date +%Y%m%d-%H%M%S).log"

# Function to log messages
log() {
  local message="$1"
  local level="${2:-INFO}"
  local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
  echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Function to fetch secret from GCP Secret Manager
get_secret() {
  local secret_name="$1"
  local default_value="${2:-}"
  
  log "Fetching secret: $secret_name"
  
  # Get the secret using gcloud command
  local secret_value=""
  if secret_value=$(gcloud secrets versions access latest --project="$GCP_PROJECT_ID" --secret="$secret_name" 2>/dev/null); then
    log "Successfully retrieved secret: $secret_name"
    echo "$secret_value"
  else
    if [ -n "$default_value" ]; then
      log "Failed to retrieve secret: $secret_name, using default value" "WARN"
      echo "$default_value"
    else
      log "Failed to retrieve secret: $secret_name" "ERROR"
      return 1
    fi
  fi
}

# Function to update JSON configuration files
update_json_config() {
  local config_file="$1"
  local jq_filter="$2"
  local temp_file="${config_file}.tmp"
  
  log "Updating configuration file: $config_file"
  
  if [ ! -f "$config_file" ]; then
    # Create the file if it doesn't exist with empty JSON
    echo "{}" > "$config_file"
    log "Created new configuration file: $config_file"
  fi
  
  # Apply the jq filter to update the configuration
  if jq "$jq_filter" "$config_file" > "$temp_file"; then
    mv "$temp_file" "$config_file"
    log "Successfully updated: $config_file"
  else
    log "Failed to update: $config_file" "ERROR"
    return 1
  fi
}

# Function to update Firebase configuration file (JS file with object)
update_firebase_config() {
  local config_file="$1"
  local config_content="$2"
  
  log "Updating Firebase configuration file: $config_file"
  
  # Create or replace the file
  echo "$config_content" > "$config_file"
  
  if [ $? -eq 0 ]; then
    log "Successfully updated: $config_file"
  else
    log "Failed to update: $config_file" "ERROR"
    return 1
  fi
}

# Main process starts here
log "Starting deployment configuration with GCP Secret Manager" "INFO"

# Create directory structure if not exists
mkdir -p $(dirname "$FIREBASE_RCFILE") 2>/dev/null || true
mkdir -p $(dirname "$SESSION_CONFIG") 2>/dev/null || true
mkdir -p $(dirname "$FIREBASE_CONFIG") 2>/dev/null || true
mkdir -p $(dirname "$API_CONFIG") 2>/dev/null || true
mkdir -p $(dirname "$OPENAI_CONFIG") 2>/dev/null || true
mkdir -p $(dirname "$AZURE_OPENAI_CONFIG") 2>/dev/null || true
mkdir -p $(dirname "$ANTHROPIC_CONFIG") 2>/dev/null || true
mkdir -p $(dirname "$GOOGLE_AI_STUDIO_CONFIG") 2>/dev/null || true
mkdir -p $(dirname "$COHERE_CONFIG") 2>/dev/null || true
mkdir -p $(dirname "$META_LLAMA_CONFIG") 2>/dev/null || true
mkdir -p $(dirname "$JIRA_CONFIG") 2>/dev/null || true
mkdir -p $(dirname "$GITHUB_CONFIG") 2>/dev/null || true
mkdir -p $(dirname "$DISCORD_CONFIG") 2>/dev/null || true
mkdir -p $(dirname "$SLACK_CONFIG") 2>/dev/null || true
mkdir -p $(dirname "$SALESFORCE_CONFIG") 2>/dev/null || true
mkdir -p $(dirname "$ZENDESK_CONFIG") 2>/dev/null || true

# Get Firebase configuration
log "Configuring Firebase setup"
FIREBASE_API_KEY=$(get_secret "firebase-api-key")
FIREBASE_AUTH_DOMAIN=$(get_secret "firebase-auth-domain" "api-for-warp-drive.firebaseapp.com")
FIREBASE_PROJECT_ID=$(get_secret "firebase-project-id" "api-for-warp-drive")
FIREBASE_STORAGE_BUCKET=$(get_secret "firebase-storage-bucket" "api-for-warp-drive.appspot.com")
FIREBASE_MESSAGING_SENDER_ID=$(get_secret "firebase-messaging-sender-id")
FIREBASE_APP_ID=$(get_secret "firebase-app-id")

# Create Firebase RC file
log "Setting up Firebase RC file at $FIREBASE_RCFILE"
cat > "$FIREBASE_RCFILE" << EOF
{
  "projects": {
    "default": "$FIREBASE_PROJECT_ID"
  }
}
EOF

# Create Firebase config.js file
log "Setting up Firebase configuration at $FIREBASE_CONFIG"
FIREBASE_CONFIG_CONTENT="
const firebaseConfig = {
  apiKey: \"$FIREBASE_API_KEY\",
  authDomain: \"$FIREBASE_AUTH_DOMAIN\",
  projectId: \"$FIREBASE_PROJECT_ID\",
  storageBucket: \"$FIREBASE_STORAGE_BUCKET\",
  messagingSenderId: \"$FIREBASE_MESSAGING_SENDER_ID\",
  appId: \"$FIREBASE_APP_ID\"
};
"
update_firebase_config "$FIREBASE_CONFIG" "$FIREBASE_CONFIG_CONTENT"

# Update session configuration
log "Setting up session configuration"
SESSION_SECRET=$(get_secret "session-secret-key")
update_json_config "$SESSION_CONFIG" ".secretKey = \"$SESSION_SECRET\""

# Configure API keys
log "Setting up API configuration"

# OpenAI Configuration
log "Configuring OpenAI integration"
OPENAI_API_KEY=$(get_secret "openai-api-key")
update_json_config "$OPENAI_CONFIG" ".apiKey = \"$OPENAI_API_KEY\""

# Azure OpenAI Configuration
log "Configuring Azure OpenAI integration"
AZURE_OPENAI_API_KEY=$(get_secret "azure-openai-api-key")
AZURE_OPENAI_ENDPOINT=$(get_secret "azure-openai-endpoint")
update_json_config "$AZURE_OPENAI_CONFIG" ".apiKey = \"$AZURE_OPENAI_API_KEY\" | .endpoint = \"$AZURE_OPENAI_ENDPOINT\""

# Anthropic Configuration
log "Configuring Anthropic integration"
ANTHROPIC_API_KEY=$(get_secret "anthropic-api-key")
update_json_config "$ANTHROPIC_CONFIG" ".apiKey = \"$ANTHROPIC_API_KEY\""

# Google AI Studio Configuration
log "Configuring Google AI Studio integration"
GOOGLE_AI_API_KEY=$(get_secret "google-ai-api-key")
update_json_config "$GOOGLE_AI_STUDIO_CONFIG" ".apiKey = \"$GOOGLE_AI_API_KEY\""

# Cohere Configuration
log "Configuring Cohere integration"
COHERE_API_KEY=$(get_secret "cohere-api-key")
update_json_config "$COHERE_CONFIG" ".apiKey = \"$COHERE_API_KEY\""

# Meta Llama Configuration
log "Configuring Meta Llama integration"
META_LLAMA_API_KEY=$(get_secret "meta-llama-api-key")
update_json_config "$META_LLAMA_CONFIG" ".apiKey = \"$META_LLAMA_API_KEY\""

# JIRA Configuration
log "Configuring JIRA integration"
JIRA_API_KEY=$(get_secret "jira-api-key")
JIRA_USER_EMAIL=$(get_secret "jira-user-email")
JIRA_SERVER_URL=$(get_secret "jira-server-url")
update_json_config "$JIRA_CONFIG" ".apiKey = \"$JIRA_API_KEY\" | .userEmail = \"$JIRA_USER_EMAIL\" | .serverUrl = \"$JIRA_SERVER_URL\""

# GitHub Configuration
log "Configuring GitHub integration"
GITHUB_API_KEY=$(get_secret "github-api-key")
update_json_config "$GITHUB_CONFIG" ".apiKey = \"$GITHUB_API_KEY\""

# Discord Configuration
log "Configuring Discord integration"
DISCORD_BOT_TOKEN=$(get_secret "discord-bot-token")
update_json_config "$DISCORD_CONFIG" ".botToken = \"$DISCORD_BOT_TOKEN\""

# Slack Configuration
log "Configuring Slack integration"
SLACK_BOT_TOKEN=$(get_secret "slack-bot-token")
SLACK_APP_TOKEN=$(get_secret "slack-app-token")
update_json_config "$SLACK_CONFIG" ".botToken = \"$SLACK_BOT_TOKEN\" | .appToken = \"$SLACK_APP_TOKEN\""

# Salesforce Configuration
log "Configuring Salesforce integration"
SALESFORCE_CLIENT_ID=$(get_secret "salesforce-client-id")
SALESFORCE_CLIENT_SECRET=$(get_secret "salesforce-client-secret")
SALESFORCE_INSTANCE_URL=$(get_secret "salesforce-instance-url")
update_json_config "$SALESFORCE_CONFIG" ".clientId = \"$SALESFORCE_CLIENT_ID\" | .clientSecret = \"$SALESFORCE_CLIENT_SECRET\" | .instanceUrl = \"$SALESFORCE_INSTANCE_URL\""

# Zendesk Configuration
log "Configuring Zendesk integration"
ZENDESK_API_KEY=$(get_secret "zendesk-api-key")
ZENDESK_USER_EMAIL=$(get_secret "zendesk-user-email")
ZENDESK_DOMAIN=$(get_secret "zendesk-domain")
update_json_config "$ZENDESK_CONFIG" ".apiKey = \"$ZENDESK_API_KEY\" | .userEmail = \"$ZENDESK_USER_EMAIL\" | .domain = \"$ZENDESK_DOMAIN\""

log "===================================================="
log "Configuration completed successfully!"
log "All services configured using GCP Secret Manager"
log "See log file for details: $LOG_FILE"
log "===================================================="

# Make script executable
chmod +x "$0"

