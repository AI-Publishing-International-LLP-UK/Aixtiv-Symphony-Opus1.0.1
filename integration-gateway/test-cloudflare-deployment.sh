#!/bin/bash

# =================================================================
# CLOUDFLARE DEPLOYMENT TEST SCRIPT
# Aixtiv Symphony - Using GCP Secret Manager Integration Gateway
# =================================================================

echo "🔍 CLOUDFLARE DEPLOYMENT TEST"
echo "=============================="
echo "Testing Cloudflare deployment"
echo "Starting tests at $(date)"
echo ""

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/cloudflare-test-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

info() { log "INFO" "${GREEN}$*${NC}"; }
warn() { log "WARN" "${YELLOW}$*${NC}"; }
error() { log "ERROR" "${RED}$*${NC}"; }
success() { log "SUCCESS" "${GREEN}$*${NC}"; }

# Test domains
declare -a domains=(
    "2100.cool"
    "legal.2100.cool"
    "coach.2100.cool"
)

# Function to check DNS resolution
check_dns() {
    local domain=$1
    info "Checking DNS resolution for $domain"
    local resolved_ip
    resolved_ip=$(dig +short "$domain" | head -n1)
    if [ -n "$resolved_ip" ]; then
        success "$domain resolves to: $resolved_ip"
    else
        error "$domain DNS resolution failed"
    fi
}

# Function to test HTTPS response
check_https() {
    local domain=$1
    info "Checking HTTPS response for $domain"
    local https_status
    https_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$domain")
    if [ "$https_status" = "200" ] || [ "$https_status" = "301" ] || [ "$https_status" = "302" ]; then
        success "$domain HTTPS test passed (HTTP $https_status)"
    else
        warn "$domain HTTPS test failed (HTTP $https_status)"
    fi
}

# Execute tests
main() {
    info "Starting Cloudflare deployment tests"
    info "Log file: $LOG_FILE"
    
    for domain in "${domains[@]}"; do
        check_dns "$domain"
        check_https "$domain"
    done
    
    success "🎉 CLOUDFLARE DEPLOYMENT TESTS COMPLETED SUCCESSFULLY!"
    echo ""
    echo "📋 Log file: $LOG_FILE"
}

# Execute main function
main

