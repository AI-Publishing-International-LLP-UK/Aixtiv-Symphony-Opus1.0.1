#!/bin/bash
# Integration Gateway Validation Script
# Verifies all integration points are properly configured with actual credentials
# Usage: ./validate-integration-gateway.sh

set -e

INTEGRATION_DIR="as/asoos/integration-gateway"
echo "=== INTEGRATION GATEWAY VALIDATION ==="
echo "Verifying all integration points are properly configured"
echo "Timestamp: $(date)"

# Check if integration gateway directory exists
if [ ! -d "$INTEGRATION_DIR" ]; then
  echo "ERROR: Integration gateway directory not found at $INTEGRATION_DIR"
  exit 1
fi

# Function to check for placeholders in files
check_placeholders() {
  local file="$1"
  local placeholders=$(grep -o "YOUR_[A-Z_]*" "$file" 2>/dev/null || echo "")
  
  if [ -n "$placeholders" ]; then
    echo "❌ $file still contains placeholders:"
    echo "$placeholders" | sort | uniq
    return 1
  else
    echo "✅ $file has all placeholders replaced"
    return 0
  fi
}

# Function to check API key validity
check_api_key_format() {
  local file="$1"
  local key_name="$2"
  
  # Extract the API key value
  if [[ "$file" == *.json ]]; then
    # For JSON files
    local api_key=$(jq -r ".$key_name" "$file" 2>/dev/null)
  elif [[ "$file" == *.js ]]; then
    # For JS files
    local api_key=$(grep "$key_name" "$file" | grep -oP '(?<=\")([a-zA-Z0-9_\-\.]+)(?=\")' | head -1)
  elif [[ "$file" == *.env* ]]; then
    # For env files
    local api_key=$(grep "^$key_name=" "$file" | cut -d '=' -f2)
  else
    echo "Unsupported file type for key validation: $file"
    return 1
  fi
  
  # Check if the API key looks valid (not empty, not placeholder)
  if [ -z "$api_key" ] || [[ "$api_key" == "YOUR_"* ]]; then
    echo "❌ $key_name in $file is invalid or missing"
    return 1
  elif [[ ${#api_key} < 10 ]]; then
    echo "⚠️ $key_name in $file seems too short for an API key"
    return 0
  else
    echo "✅ $key_name in $file appears valid"
    return 0
  fi
}

echo "Checking Firebase configurations..."
firebase_configs=$(find "$INTEGRATION_DIR" -name "firebase-config.js" -type f)
if [ -z "$firebase_configs" ]; then
  echo "⚠️ No Firebase config files found"
else
  for config in $firebase_configs; do
    check_placeholders "$config"
    check_api_key_format "$config" "apiKey"
  done
fi

echo -e "\nChecking environment files..."
env_files=$(find "$INTEGRATION_DIR" -name ".env*" -type f)
if [ -z "$env_files" ]; then
  echo "⚠️ No environment files found"
else
  for env_file in $env_files; do
    check_placeholders "$env_file"
    
    # Check specific API keys
    if grep -q "DREAM_COMMANDER_API_KEY" "$env_file"; then
      check_api_key_format "$env_file" "DREAM_COMMANDER_API_KEY"
    fi
    
    if grep -q "VISION_LAKE_API_KEY" "$env_file"; then
      check_api_key_format "$env_file" "VISION_LAKE_API_KEY"
    fi
    
    if grep -q "STRIPE_API_KEY" "$env_file"; then
      check_api_key_format "$env_file" "STRIPE_API_KEY"
    fi
  done
fi

echo -e "\nChecking API integration configurations..."
# Check Dream Commander integration
if [ -f "$INTEGRATION_DIR/config/dream-commander.json" ]; then
  check_placeholders "$INTEGRATION_DIR/config/dream-commander.json"
  check_api_key_format "$INTEGRATION_DIR/config/dream-commander.json" "apiKey"
else
  echo "⚠️ Dream Commander config not found"
fi

# Check Vision Lake integration
if [ -f "$INTEGRATION_DIR/config/vision-lake.json" ]; then
  check_placeholders "$INTEGRATION_DIR/config/vision-lake.json"
  check_api_key_format "$INTEGRATION_DIR/config/vision-lake.json" "apiKey"
else
  echo "⚠️ Vision Lake config not found"
fi

# Check SERPEW integration
if [ -f "$INTEGRATION_DIR/config/serpew.json" ]; then
  check_placeholders "$INTEGRATION_DIR/config/serpew.json"
  check_api_key_format "$INTEGRATION_DIR/config/serpew.json" "apiKey"
else
  echo "⚠️ SERPEW config not found"
fi

# Check HOBMDIHO integration
if [ -f "$INTEGRATION_DIR/config/hobmdiho.json" ]; then
  check_placeholders "$INTEGRATION_DIR/config/hobmdiho.json"
  check_api_key_format "$INTEGRATION_DIR/config/hobmdiho.json" "apiKey"
else
  echo "⚠️ HOBMDIHO config not found"
fi

# Check payment gateway integrations
if [ -f "$INTEGRATION_DIR/config/payment-gateways.json" ]; then
  check_placeholders "$INTEGRATION_DIR/config/payment-gateways.json"
  check_api_key_format "$INTEGRATION_DIR/config/payment-gateways.json" "stripe.apiKey"
  check_api_key_format "$INTEGRATION_DIR/config/payment-gateways.json" "paypal.clientId"
else
  echo "⚠️ Payment gateway config not found"
fi

# Check service account key
if [ -f "$INTEGRATION_DIR/config/service-account.json" ]; then
  # Verify it's a valid service account key file
  if jq -e '.type == "service_account" and .project_id and .private_key' "$INTEGRATION_DIR/config/service-account.json" > /dev/null 2>&1; then
    echo "✅ Service account key appears valid"
  else
    echo "❌ Service account key seems invalid or incomplete"
  fi
else
  echo "⚠️ Service account key file not found"
fi

# Final check for any remaining placeholders in the entire directory
echo -e "\nPerforming final check for any placeholders in the entire directory..."
remaining_placeholders=$(grep -r "YOUR_" --include="*.js" --include="*.json" --include="*.env*" "$INTEGRATION_DIR" 2>/dev/null || echo "")

if [ -n "$remaining_placeholders" ]; then
  echo -e "\n❌ VALIDATION FAILED: The following files still contain placeholders:"
  echo "$remaining_placeholders" | grep -o ".*YOUR_[A-Z_]*" | sort | uniq
  echo -e "\nPlease replace all placeholder values before deploying!"
  exit 1
else
  echo -e "\n✅ VALIDATION PASSED: No placeholder values found in the integration gateway."
  echo "All integration points appear to be properly configured."
fi

echo "Validation completed at $(date)"
echo "=== INTEGRATION GATEWAY VALIDATION COMPLETE ==="
