#!/bin/bash

# ==============================================================================
# VOICE OAUTH2 PRODUCTION READINESS VALIDATION
# ==============================================================================

set -euo pipefail

# Colors
readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Configuration
readonly PROJECT_ID="api-for-warp-drive"
readonly REGION="us-west1"
readonly STAGING_SERVICE="voice-session-manager-staging"

log() {
    local level="$1"
    local message="$2"
    local color="${3:-$NC}"
    echo -e "${color}[VALIDATION:${level}] ${message}${NC}"
}

check_gcp_auth() {
    log "AUTH" "Checking GCP authentication..." "$YELLOW"
    
    if gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "."; then
        local account=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
        log "AUTH" "✓ Authenticated as: $account" "$GREEN"
        return 0
    else
        log "AUTH" "✗ No active authentication" "$RED"
        return 1
    fi
}

check_project_config() {
    log "PROJECT" "Checking project configuration..." "$YELLOW"
    
    local current_project=$(gcloud config get-value project)
    if [[ "$current_project" == "$PROJECT_ID" ]]; then
        log "PROJECT" "✓ Project set to: $PROJECT_ID" "$GREEN"
        return 0
    else
        log "PROJECT" "✗ Project mismatch. Current: $current_project, Expected: $PROJECT_ID" "$RED"
        return 1
    fi
}

check_staging_health() {
    log "STAGING" "Checking staging service health..." "$YELLOW"
    
    if gcloud run services describe "$STAGING_SERVICE" --region="$REGION" --project="$PROJECT_ID" &>/dev/null; then
        local staging_url=$(gcloud run services describe "$STAGING_SERVICE" --region="$REGION" --project="$PROJECT_ID" --format="value(status.url)")
        
        if curl -sf "${staging_url}/health" | grep -q "healthy"; then
            log "STAGING" "✓ Staging service healthy: $staging_url" "$GREEN"
            return 0
        else
            log "STAGING" "✗ Staging service unhealthy" "$RED"
            return 1
        fi
    else
        log "STAGING" "✗ Staging service not found" "$RED"
        return 1
    fi
}

check_voice_session_manager() {
    log "CODE" "Checking voice-session-manager code..." "$YELLOW"
    
    if [[ -d "voice-session-manager" ]]; then
        if [[ -f "voice-session-manager/main.go" ]]; then
            log "CODE" "✓ Voice session manager source found" "$GREEN"
            return 0
        else
            log "CODE" "✗ main.go not found in voice-session-manager" "$RED"
            return 1
        fi
    else
        log "CODE" "✗ voice-session-manager directory not found" "$RED"
        return 1
    fi
}

check_docker_permissions() {
    log "DOCKER" "Checking Docker repository permissions..." "$YELLOW"
    
    # Test if we can list images (requires read access)
    if gcloud container images list --repository="us-west1-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy" &>/dev/null; then
        log "DOCKER" "✓ Docker repository access confirmed" "$GREEN"
        return 0
    else
        log "DOCKER" "✗ Cannot access Docker repository" "$RED"
        return 1
    fi
}

run_all_checks() {
    log "START" "🔍 STARTING PRODUCTION READINESS VALIDATION" "$BLUE"
    
    local passed=0
    local total=5
    
    check_gcp_auth && ((passed++)) || true
    check_project_config && ((passed++)) || true
    check_staging_health && ((passed++)) || true
    check_voice_session_manager && ((passed++)) || true
    check_docker_permissions && ((passed++)) || true
    
    echo ""
    log "SUMMARY" "Validation Results: $passed/$total checks passed" "$BLUE"
    
    if [[ $passed -eq $total ]]; then
        log "READY" "🚀 SYSTEM READY FOR PRODUCTION LAUNCH!" "$GREEN"
        echo ""
        echo "To launch production, run:"
        echo "  ./launch-voice-oauth2-production.sh"
        return 0
    else
        log "NOT_READY" "❌ System not ready. Fix issues above before launching." "$RED"
        return 1
    fi
}

# Run all validation checks
run_all_checks
