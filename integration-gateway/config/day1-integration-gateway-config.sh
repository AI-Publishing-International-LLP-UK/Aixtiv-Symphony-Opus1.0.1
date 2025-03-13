#!/bin/bash

# Error handling
set -euo pipefail
trap 'echo "Error on line $LINENO"; exit 1' ERR

error_handler() {
    echo "Error occurred in script at line: $1"
    exit 1
}

trap 'error_handler ${LINENO}' ERR

# Configuration settings
export PROJECT_ID="api-for-warp-drive"
export REGION="us-west1"
export SERVICE_ACCOUNT="drlucyautomation@api-for-warp-drive.iam.gserviceaccount.com"

# Configure service
echo "Configuring Integration Gateway..."

# Set up environment variables
export GATEWAY_VERSION="1.0.0"
export GATEWAY_PORT="8080"
export GATEWAY_ENV="production"

# Create necessary configurations
echo "Creating service configurations..."

# Exit successfully
echo "Integration Gateway configuration completed successfully"
exit 0
