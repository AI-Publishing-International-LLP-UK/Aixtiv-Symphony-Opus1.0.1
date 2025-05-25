#!/bin/bash

# Set strict error handling
set -euo pipefail

# Configure logging
LOGFILE="vertex_ai_setup.log"
exec 1> >(tee -a "$LOGFILE") 2>&1

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    log "ERROR: $1"
    exit 1
}

# Check for required environment variables
[[ -z "${PROJECT_ID:-}" ]] && error "PROJECT_ID environment variable is required"
[[ -z "${REGION:-}" ]] && error "REGION environment variable is required"
[[ -z "${HUGGINGFACE_API_KEY:-}" ]] && error "HUGGINGFACE_API_KEY environment variable is required"
[[ -z "${CLAUDE_API_KEY:-}" ]] && error "CLAUDE_API_KEY environment variable is required"

# Check for required tools
command -v gcloud >/dev/null 2>&1 || error "gcloud is required but not installed"

# Verify authentication
log "Verifying GCP authentication..."
gcloud auth list --filter=status:ACTIVE --format="value(account)" || error "Not authenticated with GCloud"

# Set project and region
log "Setting up project configuration..."
gcloud config set project "$PROJECT_ID"
gcloud config set compute/region "$REGION"

# Enable required APIs
log "Enabling required APIs..."
gcloud services enable aiplatform.googleapis.com

# Create endpoints
create_endpoint() {
    local endpoint_id="$1"
    local display_name="$2"
    
    log "Creating endpoint: $display_name"
    gcloud ai endpoints create \
        --display-name="$display_name" \
        --project="$PROJECT_ID" \
        --region="$REGION" \
        --endpoint-id="$endpoint_id" || error "Failed to create endpoint $endpoint_id"
}

# Deploy models with specified configurations
deploy_model() {
    local endpoint_id="$1"
    local huggingface_weight="$2"
    local claude_weight="$3"
    
    log "Deploying models to endpoint: $endpoint_id"
    gcloud ai endpoints deploy-model "$endpoint_id" \
        --model="huggingface-model" \
        --traffic-split="huggingface=$huggingface_weight,claude=$claude_weight" \
        --project="$PROJECT_ID" \
        --region="$REGION" || error "Failed to deploy models to endpoint $endpoint_id"
}

# Main execution
log "Starting Vertex AI setup for dr-match..."

# Create endpoints
create_endpoint "dr-match-endpoint-01" "DR Match Endpoint 01"
create_endpoint "dr-match-endpoint-02" "DR Match Endpoint 02"
create_endpoint "dr-match-endpoint-03" "DR Match Endpoint 03"

# Deploy models with specified weights
log "Deploying models with specified configurations..."
deploy_model "dr-match-endpoint-01" "100" "0"     # Standard configuration
deploy_model "dr-match-endpoint-02" "50" "50"     # 50-50 split
deploy_model "dr-match-endpoint-03" "70" "30"     # 70-30 split

log "Setting up monitoring and logging..."
gcloud ai endpoints describe "dr-match-endpoint-03" \
    --project="$PROJECT_ID" \
    --region="$REGION"

log "Vertex AI setup completed successfully!"

# Make the script executable
chmod +x setup_vertex_ai.sh

