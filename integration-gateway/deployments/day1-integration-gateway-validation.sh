#!/bin/bash

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
API_ENDPOINT="${API_ENDPOINT:-http://localhost:8080}"
MAX_RETRIES=3
RATE_LIMIT_THRESHOLD=100
MONITORING_ENDPOINT="${MONITORING_ENDPOINT:-/metrics}"

log() {
    echo -e "${2:-$NC}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

fail() {
    log "$1" "$RED"
    exit 1
}

# Validate configuration files
validate_config() {
    log "Validating configuration files..." "$YELLOW"
    
    # Check if required config files exist
    local required_files=("gateway-config.yaml" "security-policy.yaml" "rate-limits.yaml")
    for file in "${required_files[@]}"; do
        if [[ ! -f "../integration-gateway/$file" ]]; then
            fail "Missing required configuration file: $file"
        fi
    done
    
    # Validate YAML syntax
    for file in "${required_files[@]}"; do
        if ! yamllint "../integration-gateway/$file"; then
            fail "YAML validation failed for $file"
        fi
    done
    
    log "Configuration validation passed" "$GREEN"
}

# Security checks
check_security() {
    log "Performing security checks..." "$YELLOW"
    
    # Check TLS configuration
    if ! curl -sI "${API_ENDPOINT}" | grep -q "Strict-Transport-Security"; then
        fail "HSTS header not configured"
    fi
    
    # Check authentication endpoints
    local auth_response
    auth_response=$(curl -s -o /dev/null -w "%{http_code}" "${API_ENDPOINT}/auth/verify")
    if [[ "$auth_response" != "401" ]]; then
        fail "Authentication endpoint not properly secured"
    fi
    
    # Check CORS configuration
    local cors_response
    cors_response=$(curl -sI -H "Origin: http://example.com" "${API_ENDPOINT}/api")
    if ! echo "$cors_response" | grep -q "Access-Control-Allow-Origin"; then
        fail "CORS headers not properly configured"
    fi
    
    log "Security checks passed" "$GREEN"
}

# Test API endpoints
test_endpoints() {
    log "Testing API endpoints..." "$YELLOW"
    
    local endpoints=("/health" "/api/v1/status" "/metrics")
    for endpoint in "${endpoints[@]}"; do
        local response
        response=$(curl -s -o /dev/null -w "%{http_code}" "${API_ENDPOINT}${endpoint}")
        if [[ "$response" != "200" ]]; then
            fail "Endpoint ${endpoint} returned ${response}, expected 200"
        fi
    done
    
    # Test error handling
    local error_response
    error_response=$(curl -s -o /dev/null -w "%{http_code}" "${API_ENDPOINT}/non-existent")
    if [[ "$error_response" != "404" ]]; then
        fail "Error handling not working correctly"
    }
    
    log "API endpoint tests passed" "$GREEN"
}

# Verify rate limiting
check_rate_limiting() {
    log "Verifying rate limiting..." "$YELLOW"
    
    local count=0
    local response
    
    # Send requests rapidly to trigger rate limiting
    for ((i=0; i<$RATE_LIMIT_THRESHOLD+10; i++)); do
        response=$(curl -s -o /dev/null -w "%{http_code}" "${API_ENDPOINT}/api/test")
        if [[ "$response" == "429" ]]; then
            log "Rate limiting triggered after $i requests" "$GREEN"
            return 0
        fi
    done
    
    fail "Rate limiting not working properly"
}

# Check monitoring setup
verify_monitoring() {
    log "Checking monitoring setup..." "$YELLOW"
    
    # Verify Prometheus metrics endpoint
    local metrics_response
    metrics_response=$(curl -s "${API_ENDPOINT}${MONITORING_ENDPOINT}")
    if ! echo "$metrics_response" | grep -q "gateway_requests_total"; then
        fail "Prometheus metrics not properly configured"
    fi
    
    # Check logging
    if ! journalctl -u gateway-service --no-pager -n 1 &>/dev/null; then
        fail "System logging not properly configured"
    }
    
    log "Monitoring checks passed" "$GREEN"
}

# Main validation process
main() {
    log "Starting integration gateway validation" "$YELLOW"
    
    validate_config
    check_security
    test_endpoints
    check_rate_limiting
    verify_monitoring
    
    log "All validation checks passed successfully!" "$GREEN"
}

# Execute with error handling
if ! main; then
    fail "Validation failed"
fi

