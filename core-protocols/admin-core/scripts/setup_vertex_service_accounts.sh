#!/bin/bash

# Script to set up service accounts for Vertex AI endpoints
# This script creates service accounts and assigns necessary IAM roles
# for Vertex AI operations and monitoring.

# Set strict error handling
set -euo pipefail

# Configuration
PROJECT_ID=$(gcloud config get-value project)
LOG_FILE="vertex_setup_$(date +%Y%m%d_%H%M%S).log"

# Logging function
log() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
    echo "$message" | tee -a "$LOG_FILE"
}

# Error handling function
handle_error() {
    log "ERROR: An error occurred on line $1"
    exit 1
}

trap 'handle_error $LINENO' ERR

# Check if user has necessary permissions
check_permissions() {
    log "Checking permissions..."
    if ! gcloud projects get-iam-policy "$PROJECT_ID" &>/dev/null; then
        log "Error: Insufficient permissions to manage IAM policies"
        exit 1
    }
}

# Create service account
create_service_account() {
    local endpoint_num=$1
    local sa_name="vertex-ai-endpoint-${endpoint_num}"
    local sa_email="${sa_name}@${PROJECT_ID}.iam.gserviceaccount.com"
    
    log "Creating service account: $sa_name"
    
    if ! gcloud iam service-accounts describe "$sa_email" &>/dev/null; then
        gcloud iam service-accounts create "$sa_name" \
            --display-name="Vertex AI Endpoint ${endpoint_num} Service Account" \
            --description="Service account for Vertex AI endpoint ${endpoint_num}"
    else
        log "Service account $sa_name already exists"
    }
}

# Assign IAM roles
assign_roles() {
    local endpoint_num=$1
    local sa_name="vertex-ai-endpoint-${endpoint_num}"
    local sa_email="${sa_name}@${PROJECT_ID}.iam.gserviceaccount.com"
    
    log "Assigning roles to service account: $sa_name"
    
    # Required roles for Vertex AI
    local roles=(
        "roles/aiplatform.user"
        "roles/monitoring.viewer"
        "roles/logging.logWriter"
        "roles/artifactregistry.reader"
    )
    
    for role in "${roles[@]}"; do
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:$sa_email" \
            --role="$role"
    done
}

main() {
    log "Starting Vertex AI service account setup"
    
    # Check permissions
    check_permissions
    
    # Create service accounts and assign roles for each endpoint
    for endpoint_num in "01" "02" "03"; do
        log "Processing endpoint $endpoint_num"
        create_service_account "$endpoint_num"
        assign_roles "$endpoint_num"
    done
    
    log "Setup completed successfully"
}

# Execute main function
main

