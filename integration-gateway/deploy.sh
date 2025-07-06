#!/bin/bash
# Unified Deployment Script for Coaching2100 Network Infrastructure

# =================================================================
# STEP 3: CONFIGURE ENVIRONMENT VARIABLES FOR BUILD AND DEPLOYMENT
# =================================================================

# Source environment configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"  && pwd)"
source "$SCRIPT_DIR/scripts/setup-environment.sh" 2>/dev/null || {
    echo "Warning: Environment setup script not found, setting basic configuration"
    # Basic configuration fallback
    export GOOGLE_PROJECT_ID="api-for-warp-drive"
    export REGION="us-west1"
    export ZONE="us-west1-b"
}

# Function to get secrets from Google Secret Manager
get-secret() {
    local secret_name="$1"
    gcloud secrets versions access latest --secret="$secret_name" --project="$GOOGLE_PROJECT_ID" 2>/dev/null || {
        echo "Error: Failed to retrieve secret: $secret_name" >&2
        return 1
    }
}

# Set up required environment variables
export CLOUDFLARE_API_TOKEN=$(get-secret cloudflare-api-token)
export SALLYPORT_ENABLED=true
export SALLYPORT_CLOUDFLARE_BRIDGE=true
export GOOGLE_PROJECT_ID=api-for-warp-drive

# Color Constants for Enhanced Logging
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging Utility with Color
log() {
    local level="$1"
    local message="$2"
    local color="${3:-$NC}"
    
    echo -e "${color}[DEPLOY:${level}] $(date +'%Y-%m-%d %H:%M:%S') - ${message}${NC}"
}

# Main Deployment Workflow
main() {
    # Start Deployment
    log "START" "Initiating Comprehensive Network Infrastructure Deployment" "$GREEN"

    # Set Google Cloud Project
    log "CONFIG" "Configuring Google Cloud Project" "$YELLOW"
    gcloud config set project "api-for-warp-drive"

    # Set Quota Project
    log "QUOTA" "Configuring Application Default Quota" "$YELLOW"
    gcloud auth application-default set-quota-project "warp-drive"

    # Trigger Cloud Build
    log "BUILD" "Submitting Cloud Build Configuration" "$GREEN"
    gcloud builds submit --config=cloudbuild-network-evolution.yaml .

    # Authenticate and Set Cluster Context
    log "AUTH" "Authenticating with Kubernetes Cluster" "$GREEN"
    gcloud container clusters get-credentials private-cluster-auto \
        --zone us-west1 \
        --project api-for-warp-drive

    # Run Connectivity Tests
    log "TEST" "Performing Connectivity Verification" "$YELLOW"
    kubectl run connectivity-test \
        --image=busybox \
        --rm -it \
        --restart=Never \
        -- wget -q -O- http://super-claude-staging || \
        log "ERROR" "Connectivity Test Failed" "$RED"

    # Deployment Completion
    log "COMPLETE" "Network Infrastructure Deployment Successfully Completed" "$GREEN"
}

# Execute Main Function
main