#!/bin/bash

# Cloudflare + Warpdrive-Prod01 Deployment Script
# Deploy all sites to warpdrive-prod01 in MOCOA (us-west1-a/b)
# Uses OAuth2 authentication and Integration Gateway for secret management
# Author: Integration Gateway Team
# Date: $(date +%Y-%m-%d)

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="${SCRIPT_DIR}/configs/domain"
CLOUDFLARE_CONFIG="${CONFIG_DIR}/cloudflare-dns-config.json"
LOG_FILE="${SCRIPT_DIR}/logs/cloudflare-deployment-$(date +%Y%m%d_%H%M%S).log"
INTEGRATION_GATEWAY_API="${SCRIPT_DIR}/core/integration-gateway.js"
OAUTH2_SERVICE="${SCRIPT_DIR}/src/services/oauth2/index.js"
SECRET_MANAGER="${SCRIPT_DIR}/src/services/secrets/secret-manager.js"

# Operation modes
SIMULATION_MODE="${SIMULATION_MODE:-false}"
TEST_MODE="${TEST_MODE:-false}"
DRY_RUN="${DRY_RUN:-false}"
PRODUCTION_MODE="${PRODUCTION_MODE:-false}"

# Ensure logs directory exists
mkdir -p "${SCRIPT_DIR}/logs"

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local mode_indicator=""
    
    # Add mode indicator
    if [[ "$SIMULATION_MODE" == "true" ]]; then
        mode_indicator="[SIMULATION]"
    elif [[ "$TEST_MODE" == "true" ]]; then
        mode_indicator="[TEST]"
    elif [[ "$DRY_RUN" == "true" ]]; then
        mode_indicator="[DRY-RUN]"
    elif [[ "$PRODUCTION_MODE" == "true" ]]; then
        mode_indicator="[PRODUCTION]"
    fi
    
    echo -e "[${timestamp}] ${mode_indicator} [${level}] ${message}" | tee -a "${LOG_FILE}"
}

info() { log "INFO" "${BLUE}$*${NC}"; }
warn() { log "WARN" "${YELLOW}$*${NC}"; }
error() { log "ERROR" "${RED}$*${NC}"; }
success() { log "SUCCESS" "${GREEN}$*${NC}"; }
simulation() { log "SIMULATION" "${MAGENTA}$*${NC}"; }
test_info() { log "TEST" "${CYAN}$*${NC}"; }

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."
    
    # Check if required environment variables are set
    local required_vars=(
        "CLOUDFLARE_API_TOKEN"
        "CLOUDFLARE_ZONE_ID"
        "WARPDRIVE_PROD01_IP"
        "WARPDRIVE_PROD01_BACKUP_IP"
        "GCP_PROJECT_ID"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        error "curl is required but not installed"
        exit 1
    fi
    
    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        error "jq is required but not installed"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Get Cloudflare credentials via Integration Gateway
get_cloudflare_credentials() {
    if [[ "$SIMULATION_MODE" == "true" || "$TEST_MODE" == "true" || "$DRY_RUN" == "true" ]]; then
        simulation "Using mock Cloudflare credentials"
        CLOUDFLARE_API_TOKEN="mock-token-for-testing"
        CLOUDFLARE_ZONE_ID="mock-zone-id"
        return 0
    fi
    
    # Secure credential fetching
    info "Securing credential retrieval via Integration Gateway..."
    
    # Check if secret manager script exists to avoid exposure
    if [[ -f "$SECRET_MANAGER" ]]; then
        CLOUDFLARE_API_TOKEN=$(node -e "const secretManager = require('$SECRET_MANAGER'); secretManager.getProviderCredentials('cloudflare').then(console.log).catch((err) => { console.error(err); process.exit(1); });")
        CLOUDFLARE_ZONE_ID=$(node -e "const secretManager = require('$SECRET_MANAGER'); secretManager.getSecret('cloudflare-zone-id').then(console.log).catch((err) => { console.error(err); process.exit(1); });")
    else
        warn "Secret manager not available. Ensure all credentials are securely handled"
    fi
    
    # Check if credentials are available
    if [[ -z "$CLOUDFLARE_API_TOKEN" || -z "$CLOUDFLARE_ZONE_ID" ]]; then
        error "Failed to retrieve Cloudflare credentials via Integration Gateway"
        return 1
    fi
    
    success "Cloudflare credentials securely retrieved"
}

# Cloudflare API function
cloudflare_api() {
    local method=$1
    local endpoint=$2
    local data=${3:-}
    
    if [[ "$SIMULATION_MODE" == "true" || "$TEST_MODE" == "true" || "$DRY_RUN" == "true" ]]; then
        simulation "Cloudflare API call: $method $endpoint"
        echo '{"success": true, "result": {"id": "mock-record-id"}}'
        return 0
    fi
    
    local url="https://api.cloudflare.com/v4${endpoint}"
    local response
    
    if [[ -n "$data" ]]; then
        response=$(curl -s -X "$method" "$url" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -X "$method" "$url" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
            -H "Content-Type: application/json")
    fi
    
    echo "$response"
}

# Create or update DNS record
update_dns_record() {
    local name=$1
    local content=$2
    local ttl=${3:-300}
    local proxied=${4:-true}
    local comment=${5:-"Managed by Integration Gateway"}
    
    info "Updating DNS record: $name -> $content"
    
    # Check if record exists
    local existing_record
    existing_record=$(cloudflare_api "GET" "/zones/$CLOUDFLARE_ZONE_ID/dns_records?name=$name.2100.cool")
    
    local record_id
    record_id=$(echo "$existing_record" | jq -r '.result[0].id // empty')
    
    local data
    data=$(jq -n \
        --arg name "$name" \
        --arg content "$content" \
        --arg ttl "$ttl" \
        --argjson proxied "$proxied" \
        --arg comment "$comment" \
        '{
            type: "A",
            name: $name,
            content: $content,
            ttl: ($ttl | tonumber),
            proxied: $proxied,
            comment: $comment
        }')
    
    if [[ -n "$record_id" && "$record_id" != "null" ]]; then
        # Update existing record
        local response
        response=$(cloudflare_api "PUT" "/zones/$CLOUDFLARE_ZONE_ID/dns_records/$record_id" "$data")
        
        if echo "$response" | jq -e '.success' > /dev/null; then
            success "Updated DNS record: $name"
        else
            error "Failed to update DNS record: $name"
            echo "$response" | jq '.errors'
            return 1
        fi
    else
        # Create new record
        local response
        response=$(cloudflare_api "POST" "/zones/$CLOUDFLARE_ZONE_ID/dns_records" "$data")
        
        if echo "$response" | jq -e '.success' > /dev/null; then
            success "Created DNS record: $name"
        else
            error "Failed to create DNS record: $name"
            echo "$response" | jq '.errors'
            return 1
        fi
    fi
}

# Configure Cloudflare security settings
configure_security() {
    info "Configuring Cloudflare security settings..."
    
    # SSL/TLS settings
    local ssl_data
    ssl_data=$(jq -n '{
        value: "strict"
    }')
    
    cloudflare_api "PATCH" "/zones/$CLOUDFLARE_ZONE_ID/settings/ssl" "$ssl_data"
    
    # Always Use HTTPS
    local https_data
    https_data=$(jq -n '{
        value: "on"
    }')
    
    cloudflare_api "PATCH" "/zones/$CLOUDFLARE_ZONE_ID/settings/always_use_https" "$https_data"
    
    # Security Level
    local security_data
    security_data=$(jq -n '{
        value: "medium"
    }')
    
    cloudflare_api "PATCH" "/zones/$CLOUDFLARE_ZONE_ID/settings/security_level" "$security_data"
    
    success "Security settings configured"
}

# Configure performance settings
configure_performance() {
    info "Configuring Cloudflare performance settings..."
    
    # Caching level
    local cache_data
    cache_data=$(jq -n '{
        value: "aggressive"
    }')
    
    cloudflare_api "PATCH" "/zones/$CLOUDFLARE_ZONE_ID/settings/cache_level" "$cache_data"
    
    # Auto minify
    local minify_data
    minify_data=$(jq -n '{
        value: {
            css: true,
            html: true,
            js: true
        }
    }')
    
    cloudflare_api "PATCH" "/zones/$CLOUDFLARE_ZONE_ID/settings/minify" "$minify_data"
    
    success "Performance settings configured"
}

# Deploy all sites to warpdrive-prod01
deploy_sites() {
    info "Deploying all sites to warpdrive-prod01..."
    
    # Read DNS configuration
    if [[ ! -f "$CLOUDFLARE_CONFIG" ]]; then
        error "Cloudflare configuration file not found: $CLOUDFLARE_CONFIG"
        exit 1
    fi
    
    # Extract A records from configuration
    local records
    records=$(jq -r '.dns_configuration.a_records | to_entries[] | "\(.key),\(.value.name),\(.value.content),\(.value.ttl),\(.value.proxied),\(.value.comment // \"Managed by Integration Gateway\")"' "$CLOUDFLARE_CONFIG")
    
    while IFS=',' read -r key name content ttl proxied comment; do
        # Substitute environment variables
        content=$(echo "$content" | envsubst)
        
        update_dns_record "$name" "$content" "$ttl" "$proxied" "$comment"
    done <<< "$records"
    
    success "All sites deployed to warpdrive-prod01"
}

# Verify deployment
verify_deployment() {
    info "Verifying deployment..."
    
    local domains=(
        "2100.cool"
        "www.2100.cool"
        "legal.2100.cool"
        "consultant.2100.cool"
        "realty.2100.cool"
        "zena.2100.cool"
        "coach.2100.cool"
    )
    
    for domain in "${domains[@]}"; do
        info "Checking $domain..."
        
        # DNS resolution check
        local resolved_ip
        resolved_ip=$(dig +short "$domain" | head -n1)
        
        if [[ -n "$resolved_ip" ]]; then
            success "$domain resolves to: $resolved_ip"
        else
            warn "$domain does not resolve"
        fi
        
        # HTTP check
        if curl -s --max-time 10 "https://$domain" > /dev/null; then
            success "$domain is accessible via HTTPS"
        else
            warn "$domain is not accessible via HTTPS"
        fi
    done
}

# Main execution
main() {
    info "Starting Cloudflare + Warpdrive-Prod01 deployment..."
    info "Target: warpdrive-prod01 in MOCOA (us-west1-a/b)"
    info "Log file: $LOG_FILE"
    
    check_prerequisites
    configure_security
    configure_performance
    deploy_sites
    verify_deployment
    
    success "Deployment completed successfully!"
    info "All sites are now hosted on warpdrive-prod01 via Cloudflare"
}

# Execute main function
main "$@"
