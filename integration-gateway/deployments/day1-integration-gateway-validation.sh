#!/bin/bash

set -euo pipefail

# Source the security validation module
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/security/validation.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load environment-specific configuration
if [[ -f "${SCRIPT_DIR}/../.env" ]]; then
    set -a
    source "${SCRIPT_DIR}/../.env"
    set +a
    log "Loaded environment configuration from .env file" "$GREEN"
fi

# Configuration with defaults
API_ENDPOINT="${API_ENDPOINT:-http://localhost:8080}"
MAX_RETRIES="${MAX_RETRIES:-3}"
RATE_LIMIT_THRESHOLD="${RATE_LIMIT_THRESHOLD:-100}"
MONITORING_ENDPOINT="${MONITORING_ENDPOINT:-/metrics}"
ENVIRONMENT="${ENVIRONMENT:-development}"
CONFIG_DIR="${CONFIG_DIR:-${SCRIPT_DIR}/../config/${ENVIRONMENT}}"

log() {
    echo -e "${2:-$NC}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

fail() {
    log "$1" "$RED"
    exit 1
}

# Validate environment
validate_environment() {
    log "Validating environment..." "$YELLOW"
    
    # Check required environment variables
    local required_vars=("PROJECT_ID" "SERVICE_ACCOUNT")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            fail "Required environment variable $var is not set"
        fi
    done
    
    # Verify environment-specific config directory exists
    if [[ ! -d "$CONFIG_DIR" ]]; then
        fail "Environment config directory not found: $CONFIG_DIR"
    fi
    
    log "Environment validation passed" "$GREEN"
}

# Validate configuration files with enhanced security checks
validate_config() {
    log "Validating configuration files..." "$YELLOW"
    
    # Check if required config files exist
    local required_files=("gateway-config.yaml" "security-policy.yaml" "rate-limits.yaml")
    for file in "${required_files[@]}"; do
        local config_path="${CONFIG_DIR}/$file"
        if [[ ! -f "$config_path" ]]; then
            fail "Missing required configuration file: $config_path"
        fi
        
        # Use the secure YAML validation function from the security module
        if ! validateYamlSecurity "$config_path"; then
            fail "Security validation failed for $file"
        fi
    done
    
    # Check for secrets in configuration files
    if ! checkForSecretsInFiles "${CONFIG_DIR}/*.yaml"; then
        fail "Found potential secrets in configuration files"
    fi
    
    log "Configuration validation passed" "$GREEN"
}

# Enhanced security checks
check_security() {
    log "Performing security checks..." "$YELLOW"
    
    # Check TLS configuration
    if ! checkTlsConfiguration "$API_ENDPOINT"; then
        fail "TLS configuration is not secure"
    fi
    
    # Check authentication endpoints
    local auth_response
    auth_response=$(curl -s -o /dev/null -w "%{http_code}" "${API_ENDPOINT}/auth/verify")
    if [[ "$auth_response" != "401" ]]; then
        fail "Authentication endpoint not properly secured"
    fi
    
    # Check CORS configuration
    if ! checkCorsConfiguration "$API_ENDPOINT/api"; then
        fail "CORS headers not properly configured"
    fi
    
    # Check for security headers
    if ! checkSecurityHeaders "$API_ENDPOINT"; then
        fail "Required security headers are missing"
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
    fi
    
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
    if command -v journalctl &>/dev/null; then
        if ! journalctl -u gateway-service --no-pager -n 1 &>/dev/null; then
            log "System logging not configured with journald, checking alternative logs" "$YELLOW"
            if ! grep -q "gateway" /var/log/syslog 2>/dev/null; then
                fail "System logging not properly configured"
            fi
        fi
    else
        log "journalctl not available, skipping systemd log check" "$YELLOW"
    fi
    
    log "Monitoring checks passed" "$GREEN"
}

# Main validation process
main() {
    log "Starting integration gateway validation for environment: $ENVIRONMENT" "$YELLOW"
    
    validate_environment
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
