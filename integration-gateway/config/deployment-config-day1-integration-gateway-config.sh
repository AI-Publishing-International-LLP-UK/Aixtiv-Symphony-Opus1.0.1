#!/bin/bash
# Integration Gateway Configuration Setup
# This script updates all placeholder values in the integration gateway with actual credentials
# Usage: ./integration-gateway-config.sh

set -e

INTEGRATION_DIR="./deployment/node"
CREDENTIALS_FILE="./scripts-secure-credentials.json"  # Path to your secured credentials file

echo "=== INTEGRATION GATEWAY CONFIGURATION SETUP ==="
echo "Starting configuration of Integration Gateway components"
echo "Timestamp: $(date)"

# Function to check if directory exists
check_dir() {
  if [ ! -d "$1" ]; then
    echo "ERROR: Directory $1 does not exist!"
    echo "Please make sure the correct path is specified."
    exit 1
  fi
}

# Check if integration gateway directory exists
check_dir "$INTEGRATION_DIR"

# Check if credentials file exists
if [ ! -f "$CREDENTIALS_FILE" ]; then
  echo "ERROR: Credentials file not found at $CREDENTIALS_FILE"
  echo "Please provide the path to your secure credentials storage."
  exit 1
fi

# Load credentials
echo "Loading credentials from secure storage..."
CREDENTIALS=$(cat "$CREDENTIALS_FILE")

# Extract values from credentials
GCP_PROJECT_ID=$(echo $CREDENTIALS | jq -r '.gcp.projectId')
FIREBASE_API_KEY=$(echo $CREDENTIALS | jq -r '.firebase.apiKey')
FIREBASE_APP_ID=$(echo $CREDENTIALS | jq -r '.firebase.appId')
FIREBASE_MESSAGING_SENDER_ID=$(echo $CREDENTIALS | jq -r '.firebase.messagingSenderId')
FIREBASE_STORAGE_BUCKET=$(echo $CREDENTIALS | jq -r '.firebase.storageBucket')
FIREBASE_AUTH_DOMAIN="$GCP_PROJECT_ID.firebaseapp.com"

DREAM_COMMANDER_API_KEY=$(echo $CREDENTIALS | jq -r '.dreamCommander.apiKey')
VISION_LAKE_API_KEY=$(echo $CREDENTIALS | jq -r '.visionLake.apiKey')
SERPEW_API_KEY=$(echo $CREDENTIALS | jq -r '.serpew.apiKey')
HOBMDIHO_API_KEY=$(echo $CREDENTIALS | jq -r '.hobmdiho.apiKey')

STRIPE_API_KEY=$(echo $CREDENTIALS | jq -r '.stripe.apiKey')
STRIPE_SECRET_KEY=$(echo $CREDENTIALS | jq -r '.stripe.secretKey')
STRIPE_WEBHOOK_SECRET=$(echo $CREDENTIALS | jq -r '.stripe.webhookSecret')

PAYPAL_CLIENT_ID=$(echo $CREDENTIALS | jq -r '.paypal.clientId')
PAYPAL_SECRET=$(echo $CREDENTIALS | jq -r '.paypal.secret')

# Update firebase-config.js files
update_firebase_config() {
  local config_file="$1"
  if [ -f "$config_file" ]; then
    echo "Updating Firebase config in $config_file"
    sed -i "s/YOUR_API_KEY/$FIREBASE_API_KEY/g" "$config_file"
    sed -i "s/api-for-warp-drive/$GCP_PROJECT_ID/g" "$config_file"
    sed -i "s/YOUR_MESSAGING_SENDER_ID/$FIREBASE_MESSAGING_SENDER_ID/g" "$config_file"
    sed -i "s/YOUR_APP_ID/$FIREBASE_APP_ID/g" "$config_file"
  else
    echo "Warning: File $config_file not found"
  fi
}

# Update environment files
update_env_file() {
  local env_file="$1"
  if [ -f "$env_file" ]; then
    echo "Updating environment configuration in $env_file"
    
    # Create backup of original file
    cp "$env_file" "${env_file}.bak"
    
    # Update values
    sed -i "s/GCP_PROJECT_ID=.*/GCP_PROJECT_ID=$GCP_PROJECT_ID/g" "$env_file"
    sed -i "s/FIREBASE_API_KEY=.*/FIREBASE_API_KEY=$FIREBASE_API_KEY/g" "$env_file"
    sed -i "s/FIREBASE_APP_ID=.*/FIREBASE_APP_ID=$FIREBASE_APP_ID/g" "$env_file"
    sed -i "s/FIREBASE_MESSAGING_SENDER_ID=.*/FIREBASE_MESSAGING_SENDER_ID=$FIREBASE_MESSAGING_SENDER_ID/g" "$env_file"
    sed -i "s/FIREBASE_STORAGE_BUCKET=.*/FIREBASE_STORAGE_BUCKET=$FIREBASE_STORAGE_BUCKET/g" "$env_file"
    sed -i "s/FIREBASE_AUTH_DOMAIN=.*/FIREBASE_AUTH_DOMAIN=$FIREBASE_AUTH_DOMAIN/g" "$env_file"
    
    sed -i "s/DREAM_COMMANDER_API_KEY=.*/DREAM_COMMANDER_API_KEY=$DREAM_COMMANDER_API_KEY/g" "$env_file"
    sed -i "s/VISION_LAKE_API_KEY=.*/VISION_LAKE_API_KEY=$VISION_LAKE_API_KEY/g" "$env_file"
    sed -i "s/SERPEW_API_KEY=.*/SERPEW_API_KEY=$SERPEW_API_KEY/g" "$env_file"
    sed -i "s/HOBMDIHO_API_KEY=.*/HOBMDIHO_API_KEY=$HOBMDIHO_API_KEY/g" "$env_file"
    
    sed -i "s/STRIPE_API_KEY=.*/STRIPE_API_KEY=$STRIPE_API_KEY/g" "$env_file"
    sed -i "s/STRIPE_SECRET_KEY=.*/STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY/g" "$env_file"
    sed -i "s/STRIPE_WEBHOOK_SECRET=.*/STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET/g" "$env_file"
    
    sed -i "s/PAYPAL_CLIENT_ID=.*/PAYPAL_CLIENT_ID=$PAYPAL_CLIENT_ID/g" "$env_file"
    sed -i "s/PAYPAL_SECRET=.*/PAYPAL_SECRET=$PAYPAL_SECRET/g" "$env_file"
  else
    echo "Warning: File $env_file not found"
  fi
}

# Update JSON configuration files
update_json_config() {
  local config_file="$1"
  local field_path="$2"
  local new_value="$3"
  
  if [ -f "$config_file" ]; then
    echo "Updating $field_path in $config_file"
    # Using temporary file for compatibility
    jq "$field_path = \"$new_value\"" "$config_file" > "${config_file}.tmp" && mv "${config_file}.tmp" "$config_file"
  else
    echo "Warning: File $config_file not found"
  fi
}

echo "Updating Firebase configurations..."
# Find and update all firebase-config.js files
find "$INTEGRATION_DIR" -name "firebase-config.js" -type f -exec bash -c "update_firebase_config {}" \;

echo "Updating environment files..."
# Find and update all .env files
find "$INTEGRATION_DIR" -name ".env" -type f -exec bash -c 'source "$0"; update_env_file "$1"' "$0" {} \;
find "$INTEGRATION_DIR" -name ".env.production" -type f -exec bash -c 'source "$0"; update_env_file "$1"' "$0" {} \;
find "$INTEGRATION_DIR" -name ".env.local" -type f -exec bash -c 'source "$0"; update_env_file "$1"' "$0" {} \;

echo "Updating API integration configurations..."
# Update Dream Commander integration
if [ -f "$INTEGRATION_DIR/config/dream-commander.json" ]; then
  update_json_config "$INTEGRATION_DIR/config/dream-commander.json" ".apiKey" "$DREAM_COMMANDER_API_KEY"
  update_json_config "$INTEGRATION_DIR/config/dream-commander.json" ".projectId" "$GCP_PROJECT_ID"
fi

# Update Vision Lake integration
if [ -f "$INTEGRATION_DIR/config/vision-lake.json" ]; then
  update_json_config "$INTEGRATION_DIR/config/vision-lake.json" ".apiKey" "$VISION_LAKE_API_KEY"
  update_json_config "$INTEGRATION_DIR/config/vision-lake.json" ".projectId" "$GCP_PROJECT_ID"
fi

# Update SERPEW integration
if [ -f "$INTEGRATION_DIR/config/serpew.json" ]; then
  update_json_config "$INTEGRATION_DIR/config/serpew.json" ".apiKey" "$SERPEW_API_KEY"
fi

# Update HOBMDIHO integration
if [ -f "$INTEGRATION_DIR/config/hobmdiho.json" ]; then
  update_json_config "$INTEGRATION_DIR/config/hobmdiho.json" ".apiKey" "$HOBMDIHO_API_KEY"
fi

# Update payment gateway integrations
if [ -f "$INTEGRATION_DIR/config/payment-gateways.json" ]; then
  update_json_config "$INTEGRATION_DIR/config/payment-gateways.json" ".stripe.apiKey" "$STRIPE_API_KEY"
  update_json_config "$INTEGRATION_DIR/config/payment-gateways.json" ".stripe.secretKey" "$STRIPE_SECRET_KEY"
  update_json_config "$INTEGRATION_DIR/config/payment-gateways.json" ".stripe.webhookSecret" "$STRIPE_WEBHOOK_SECRET"
  update_json_config "$INTEGRATION_DIR/config/payment-gateways.json" ".paypal.clientId" "$PAYPAL_CLIENT_ID"
  update_json_config "$INTEGRATION_DIR/config/payment-gateways.json" ".paypal.secret" "$PAYPAL_SECRET"
fi

# Update service account key if it exists as a placeholder
if [ -f "$INTEGRATION_DIR/config/service-account.json" ]; then
  echo "Replacing service account key file with actual credentials..."
  SERVICE_ACCOUNT_KEY=$(echo $CREDENTIALS | jq -r '.gcp.serviceAccountKey')
  echo "$SERVICE_ACCOUNT_KEY" > "$INTEGRATION_DIR/config/service-account.json"
fi

echo "Verifying configurations..."
# Count number of files still containing placeholders
placeholder_count=$(grep -r "YOUR_" "$INTEGRATION_DIR" | wc -l)

if [ "$placeholder_count" -gt 0 ]; then
  echo "WARNING: $placeholder_count files still contain placeholder values!"
  echo "The following files need manual inspection:"
  grep -r "YOUR_" "$INTEGRATION_DIR" -l
else
  echo "✅ All placeholders have been replaced successfully!"
fi

echo "Configuration update completed at $(date)"
echo "=== INTEGRATION GATEWAY CONFIGURATION COMPLETE ==="
