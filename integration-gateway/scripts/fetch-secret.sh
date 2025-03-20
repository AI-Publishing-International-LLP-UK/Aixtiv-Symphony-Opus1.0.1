#!/bin/bash

# Specify the secret name stored in Google Cloud Secret Manager
SECRET_NAME="${1:-dr_lucy_automation_token}"
ENV_VAR_NAME="${2:-SECRET}"

# Create secure temporary file
TEMP_FILE=$(mktemp)
# Ensure cleanup on exit
trap "rm -f $TEMP_FILE" EXIT

echo "🔐 Fetching secret '$SECRET_NAME' from Google Cloud Secret Manager..."

# Fetch the secret with timeout
timeout 30s gcloud secrets versions access latest --secret="$SECRET_NAME" > "$TEMP_FILE" 2>/dev/null

# Check if the command was successful
if [ $? -eq 0 ] && [ -s "$TEMP_FILE" ]; then
    # Success - add to GitHub environment variables without exposing value
    echo "$ENV_VAR_NAME=$(cat $TEMP_FILE)" >> $GITHUB_ENV
    
    # Indicate success
    echo "✅ Secret successfully added to GitHub environment as $ENV_VAR_NAME."
else
    # If the secret retrieval fails
    echo "❌ Failed to retrieve secret '$SECRET_NAME' from Secret Manager."
    exit 1
fi
