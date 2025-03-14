#!/bin/bash

# Integration Gateway Validation Script
# This script validates the Integration Gateway configuration and connections

set -e
set -u

echo "Starting Integration Gateway validation..."

# Load configuration
source ./day1-integration-gateway-config.sh

# Function to validate endpoint
validate_endpoint() {
    local endpoint=$1
    local expected_status=$2
    echo "Validating endpoint: $endpoint"
    
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" || echo "failed")
    
    if [ "$status_code" = "$expected_status" ]; then
        echo "✅ Endpoint $endpoint is valid (Status: $status_code)"
        return 0
    else
        echo "❌ Endpoint $endpoint validation failed (Expected: $expected_status, Got: $status_code)"
        return 1
    fi
}

# Validate GCP configuration
echo "Validating GCP configuration..."
if gcloud projects describe "$GCP_PROJECT_ID" > /dev/null 2>&1; then
    echo "✅ GCP project configuration is valid"
else
    echo "❌ GCP project configuration validation failed"
    exit 1
fi

# Validate Firebase configuration
echo "Validating Firebase configuration..."
if firebase projects:list | grep -q "$FIREBASE_PROJECT_ID"; then
    echo "✅ Firebase configuration is valid"
else
    echo "❌ Firebase configuration validation failed"
    exit 1
fi

# Validate service account permissions
echo "Validating service account permissions..."
if gcloud iam service-accounts get-iam-policy "$SERVICE_ACCOUNT_EMAIL" > /dev/null 2>&1; then
    echo "✅ Service account permissions are valid"
else
    echo "❌ Service account permissions validation failed"
    exit 1
fi

# Validate Cloud Run configuration
echo "Validating Cloud Run configuration..."
if gcloud run services list --platform managed > /dev/null 2>&1; then
    echo "✅ Cloud Run configuration is valid"
else
    echo "❌ Cloud Run configuration validation failed"
    exit 1
fi

# Validate domain endpoints
echo "Validating domain endpoints..."
validate_endpoint "https://$DOMAIN_API/health" "200"
validate_endpoint "https://$DOMAIN_APP/health" "200"

echo "Integration Gateway validation complete."

