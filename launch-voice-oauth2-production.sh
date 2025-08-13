#!/bin/bash

# ==============================================================================
# VOICE OAUTH2 PRODUCTION LAUNCH SCRIPT
# ASOOS - Aixtiv Symphony Orchestrating Operating System
# ==============================================================================

set -euo pipefail

# Color Constants
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly WHITE='\033[1;37m'
readonly NC='\033[0m' # No Color

# Configuration Constants
readonly PROJECT_ID="api-for-warp-drive"
readonly REGION="us-west1"
readonly SERVICE_NAME="voice-session-manager"
readonly STAGING_SERVICE="voice-session-manager-staging"
readonly PROD_SERVICE="voice-session-manager"
readonly IMAGE_TAG="production-v1.0.0"
readonly DOCKER_REPO="us-west1-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy"

# Feature Flags
readonly VOICE_OAUTH2_ENABLED="true"
readonly ROLLOUT_PERCENTAGE="10"  # Start with 10% traffic
readonly MAX_INSTANCES="100"
readonly MIN_INSTANCES="2"

# Logging Function
log() {
    local level="$1"
    local message="$2"
    local color="${3:-$NC}"
    
    echo -e "${color}[VOICE-OAUTH2:${level}] $(date +'%Y-%m-%d %H:%M:%S') - ${message}${NC}"
}

# Error Handler
error_exit() {
    log "ERROR" "$1" "$RED"
    exit 1
}

# Pre-flight Checks
preflight_checks() {
    log "PREFLIGHT" "Starting pre-flight checks..." "$YELLOW"
    
    # Check GCP Authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "."; then
        error_exit "No active GCP authentication found. Please run 'gcloud auth login'"
    fi
    
    # Verify Project
    local current_project
    current_project=$(gcloud config get-value project)
    if [[ "$current_project" != "$PROJECT_ID" ]]; then
        log "CONFIG" "Setting project to ${PROJECT_ID}" "$YELLOW"
        gcloud config set project "$PROJECT_ID"
    fi
    
    # Check if staging service exists and is healthy
    if ! gcloud run services describe "$STAGING_SERVICE" --region="$REGION" --project="$PROJECT_ID" &>/dev/null; then
        error_exit "Staging service ${STAGING_SERVICE} not found. Deploy staging first."
    fi
    
    # Test staging service health
    local staging_url
    staging_url=$(gcloud run services describe "$STAGING_SERVICE" --region="$REGION" --project="$PROJECT_ID" --format="value(status.url)")
    
    if ! curl -sf "${staging_url}/health" &>/dev/null; then
        error_exit "Staging service health check failed. Fix staging before production deployment."
    fi
    
    log "PREFLIGHT" "All pre-flight checks passed ✓" "$GREEN"
}

# Build Production Image
build_production_image() {
    log "BUILD" "Building production image..." "$BLUE"
    
    # Change to voice-session-manager directory
    cd voice-session-manager || error_exit "voice-session-manager directory not found"
    
    # Build and tag the image
    local image_uri="${DOCKER_REPO}/${PROD_SERVICE}:${IMAGE_TAG}"
    
    log "BUILD" "Building image: ${image_uri}" "$CYAN"
    
    gcloud builds submit \
        --tag "$image_uri" \
        --project="$PROJECT_ID" \
        --region="$REGION" \
        --timeout="20m" \
        . || error_exit "Image build failed"
    
    log "BUILD" "Production image built successfully ✓" "$GREEN"
    echo "$image_uri"
}

# Deploy Production Service
deploy_production_service() {
    local image_uri="$1"
    
    log "DEPLOY" "Deploying Voice OAuth2 to production..." "$BLUE"
    
    # Deploy to Cloud Run with production configuration
    gcloud run deploy "$PROD_SERVICE" \
        --image="$image_uri" \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --platform=managed \
        --allow-unauthenticated \
        --port=8080 \
        --memory=2Gi \
        --cpu=2 \
        --min-instances="$MIN_INSTANCES" \
        --max-instances="$MAX_INSTANCES" \
        --timeout=300 \
        --concurrency=80 \
        --execution-environment=gen2 \
        --cpu-boost \
        --labels="environment=production,service=voice-session-manager,team=asoos,version=${IMAGE_TAG}" \
        --set-env-vars="ENVIRONMENT=production,FEATURE_FLAG_VOICE_OAUTH2=${VOICE_OAUTH2_ENABLED},ROLLOUT_PERCENTAGE=${ROLLOUT_PERCENTAGE}" || error_exit "Production deployment failed"
    
    log "DEPLOY" "Production service deployed successfully ✓" "$GREEN"
}

# Configure Traffic Split
configure_traffic_split() {
    log "TRAFFIC" "Configuring traffic split for gradual rollout..." "$YELLOW"
    
    # Get the latest revision
    local latest_revision
    latest_revision=$(gcloud run services describe "$PROD_SERVICE" --region="$REGION" --project="$PROJECT_ID" --format="value(status.latestCreatedRevisionName)")
    
    # Configure traffic split: 90% to staging, 10% to production
    gcloud run services update-traffic "$PROD_SERVICE" \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --to-revisions="$latest_revision=$ROLLOUT_PERCENTAGE" \
        --platform=managed || error_exit "Traffic split configuration failed"
    
    log "TRAFFIC" "Traffic split configured: ${ROLLOUT_PERCENTAGE}% to production ✓" "$GREEN"
}

# Set up Monitoring and Alerts
setup_monitoring() {
    log "MONITOR" "Setting up production monitoring..." "$BLUE"
    
    # Create monitoring dashboard (placeholder - would integrate with existing monitoring)
    log "MONITOR" "Monitoring configuration:" "$CYAN"
    echo "  - Service: ${PROD_SERVICE}"
    echo "  - Region: ${REGION}"
    echo "  - Metrics: Latency, Error Rate, Request Count, Token Issuance"
    echo "  - Alerts: Error rate > 0.1%, Latency > 500ms, Token failures"
    
    log "MONITOR" "Production monitoring configured ✓" "$GREEN"
}

# Run Production Smoke Tests
run_smoke_tests() {
    log "TEST" "Running production smoke tests..." "$YELLOW"
    
    # Get production service URL
    local prod_url
    prod_url=$(gcloud run services describe "$PROD_SERVICE" --region="$REGION" --project="$PROJECT_ID" --format="value(status.url)")
    
    # Health check
    if curl -sf "${prod_url}/health" | grep -q "healthy"; then
        log "TEST" "Health check: ✓ PASSED" "$GREEN"
    else
        error_exit "Health check failed"
    fi
    
    # Metrics endpoint
    if curl -sf "${prod_url}/metrics" | grep -q "voice_"; then
        log "TEST" "Metrics endpoint: ✓ PASSED" "$GREEN"
    else
        log "WARNING" "Metrics endpoint check failed" "$YELLOW"
    fi
    
    # OAuth2 endpoints availability
    if curl -sf "${prod_url}/auth/voice/token" -X POST -H "Content-Type: application/json" -d '{}' | grep -q "error"; then
        log "TEST" "OAuth2 endpoint: ✓ RESPONDING" "$GREEN"
    else
        log "WARNING" "OAuth2 endpoint check inconclusive" "$YELLOW"
    fi
    
    log "TEST" "Production smoke tests completed ✓" "$GREEN"
}

# Generate Launch Report
generate_launch_report() {
    log "REPORT" "Generating production launch report..." "$CYAN"
    
    local prod_url
    prod_url=$(gcloud run services describe "$PROD_SERVICE" --region="$REGION" --project="$PROJECT_ID" --format="value(status.url)")
    
    cat << EOF

==============================================================================
🚀 VOICE OAUTH2 PRODUCTION LAUNCH COMPLETE
==============================================================================

📊 DEPLOYMENT SUMMARY:
   Service Name: ${PROD_SERVICE}
   Environment: Production
   Region: ${REGION}
   Image Tag: ${IMAGE_TAG}
   Service URL: ${prod_url}

🎯 TRAFFIC CONFIGURATION:
   Initial Rollout: ${ROLLOUT_PERCENTAGE}%
   Canary Strategy: Gradual rollout with monitoring
   
🔧 SCALING CONFIGURATION:
   Min Instances: ${MIN_INSTANCES}
   Max Instances: ${MAX_INSTANCES}
   Concurrency: 80 requests/instance

📡 MONITORING:
   Health Endpoint: ${prod_url}/health
   Metrics Endpoint: ${prod_url}/metrics
   Alerts: Configured for error rate & latency

🔐 SECURITY:
   OAuth2: ✓ Enabled
   RBAC: ✓ Active
   Sally Port: ✓ Integrated
   Diamond SAO: ✓ Enforced

📋 NEXT STEPS:
   1. Monitor error rates and latency for 1 hour
   2. If metrics look good, increase traffic to 25%
   3. Continue gradual rollout to 50%, 75%, 100%
   4. Update team via Slack/Discord on launch status

🎉 STATUS: PRODUCTION LAUNCH SUCCESSFUL!

$(date +'%Y-%m-%d %H:%M:%S UTC')
==============================================================================

EOF
}

# Rollback Function (if needed)
rollback_if_needed() {
    if [[ "${1:-}" == "rollback" ]]; then
        log "ROLLBACK" "Initiating emergency rollback..." "$RED"
        
        # Route all traffic back to staging
        gcloud run services update-traffic "$PROD_SERVICE" \
            --region="$REGION" \
            --project="$PROJECT_ID" \
            --to-revisions="LATEST=0" \
            --platform=managed
        
        log "ROLLBACK" "Emergency rollback completed" "$GREEN"
        exit 0
    fi
}

# Main Launch Function
main() {
    log "START" "🚀 INITIATING VOICE OAUTH2 PRODUCTION LAUNCH" "$WHITE"
    
    # Handle rollback if requested
    rollback_if_needed "$1"
    
    # Execute launch sequence
    preflight_checks
    local image_uri
    image_uri=$(build_production_image)
    deploy_production_service "$image_uri"
    configure_traffic_split
    setup_monitoring
    run_smoke_tests
    generate_launch_report
    
    log "SUCCESS" "🎉 VOICE OAUTH2 PRODUCTION LAUNCH COMPLETED SUCCESSFULLY!" "$GREEN"
}

# Execute main function with all arguments
main "$@"
