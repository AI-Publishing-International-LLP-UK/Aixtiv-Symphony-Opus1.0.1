#!/bin/bash

# Deployment Script for Integration Gateway
# Handles environment setup, prerequisite checks, deployment, and validation

# Error handling
set -euo pipefail
trap 'echo "Error on line $LINENO"; exit 1' ERR

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Check if required commands are available
check_prerequisites() {
    log "Checking prerequisites..."
    
    local required_commands=("gcloud" "firebase" "node" "npm" "git")
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "$cmd is required but not installed"
        fi
    done
    
    log "Prerequisites check passed ✓"
}

# Setup environment
setup_environment() {
    log "Setting up environment..."
    
    # Set project configuration
    gcloud config set project api-for-warp-drive || error "Failed to set GCP project"
    firebase use api-for-warp-drive || error "Failed to set Firebase project"
    
    # Set default compute region
    gcloud config set compute/region us-west1 || error "Failed to set compute region"
    
    # Authenticate service account if not already authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "drlucyautomation@api-for-warp-drive.iam.gserviceaccount.com"; then
        warning "Service account not authenticated. Please authenticate using IAM credentials."
        return 1
    fi
    
    log "Environment setup complete ✓"
}

# Deploy Integration Gateway
deploy_integration_gateway() {
    log "Starting Integration Gateway deployment..."
    
    # Navigate to Integration Gateway directory
    cd "$(dirname "$0")/integration-gateway" || error "Failed to navigate to Integration Gateway directory"
    
    # Run configuration script
    if [ -f "./config/day1-integration-gateway-config.sh" ]; then
        bash ./config/day1-integration-gateway-config.sh || error "Failed to configure Integration Gateway"
    else
        error "Integration Gateway configuration script not found"
    fi
    
    # Deploy to Cloud Run
    gcloud run deploy integration-gateway \
        --source . \
        --region us-west1 \
        --service-account drlucyautomation@api-for-warp-drive.iam.gserviceaccount.com \
        --allow-unauthenticated || error "Failed to deploy to Cloud Run"
    
    log "Integration Gateway deployment complete ✓"
}

# Validate deployment
validate_deployment() {
    log "Starting deployment validation..."
    
    # Run validation script
    if [ -f "./config/day1-integration-gateway-validation.sh" ]; then
        bash ./config/day1-integration-gateway-validation.sh || error "Deployment validation failed"
    else
        error "Validation script not found"
    fi
    
    # Check service health
    local service_url=$(gcloud run services describe integration-gateway --format='value(status.url)')
    
    if curl -s -o /dev/null -w "%{http_code}" "$service_url/health" | grep -q "200"; then
        log "Service health check passed ✓"
    else
        error "Service health check failed"
    fi
    
    log "Deployment validation complete ✓"
}

# Main deployment sequence
main() {
    log "Starting deployment process..."
    
    check_prerequisites || error "Prerequisites check failed"
    setup_environment || error "Environment setup failed"
    deploy_integration_gateway || error "Integration Gateway deployment failed"
    validate_deployment || error "Deployment validation failed"
    
    log "Deployment completed successfully ✓"
}

# Execute main function
main "$@"

