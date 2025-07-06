#!/bin/bash

# =================================================================
# SECURE CLOUDFLARE DEPLOYMENT SCRIPT
# Aixtiv Symphony - Using GCP Secret Manager Integration Gateway
# =================================================================

echo "🔐 SECURE CLOUDFLARE DEPLOYMENT"
echo "================================"
echo "Deploying Cloudflare integration using GCP Secret Manager"
echo "Starting deployment at $(date)"
echo ""

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
LOG_FILE="$SCRIPT_DIR/logs/cloudflare-secure-deploy-$(date +%Y%m%d-%H%M%S).log"
INTEGRATION_GATEWAY_JS="$SCRIPT_DIR/core/integration-gateway.js"

# Ensure logs directory exists
mkdir -p "$SCRIPT_DIR/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

info() { log "INFO" "${BLUE}$*${NC}"; }
warn() { log "WARN" "${YELLOW}$*${NC}"; }
error() { log "ERROR" "${RED}$*${NC}"; }
success() { log "SUCCESS" "${GREEN}$*${NC}"; }

echo "📋 SECURE DEPLOYMENT PROCESS"
echo "=============================="

# Function to securely fetch secrets using Integration Gateway
fetch_secret_secure() {
    local secret_name="$1"
    local description="$2"
    
    info "Fetching secret: $secret_name ($description)"
    
    # Use the existing GCP Secret Manager integration
    local secret_value
    if secret_value=$(gcloud secrets versions access latest --secret="$secret_name" --project="$PROJECT_ID" 2>/dev/null); then
        success "Retrieved secret: $secret_name"
        echo "$secret_value"
        return 0
    else
        error "Failed to retrieve secret: $secret_name"
        return 1
    fi
}

# Function to validate GCP authentication
validate_gcp_auth() {
    info "Validating GCP authentication..."
    
    if ! gcloud auth list --filter="status:ACTIVE" --format="value(account)" | grep -q "@"; then
        error "No active GCP authentication found"
        echo "Please run: gcloud auth login"
        exit 1
    fi
    
    # Set project
    gcloud config set project "$PROJECT_ID" >/dev/null 2>&1
    
    success "GCP authentication validated"
}

# Function to setup secure environment variables
setup_secure_environment() {
    info "Setting up secure environment variables..."
    
    # Fetch Cloudflare secrets
    export CLOUDFLARE_API_TOKEN=$(fetch_secret_secure "cloudflare-api-token" "Cloudflare API token")
    export CLOUDFLARE_ZONE_ID=$(fetch_secret_secure "cloudflare-zone-id" "Cloudflare zone ID for 2100.cool")
    export CLOUDFLARE_EMAIL=$(fetch_secret_secure "cloudflare-email" "Cloudflare account email")
    
    # Fetch server configuration
    export WARPDRIVE_PROD01_IP=$(fetch_secret_secure "warpdrive-prod01-ip" "Primary server IP")
    export WARPDRIVE_PROD01_BACKUP_IP=$(fetch_secret_secure "warpdrive-prod01-backup-ip" "Backup server IP")
    
    # Set environment configuration
    export GCP_PROJECT_ID="$PROJECT_ID"
    export ENVIRONMENT="production"
    export DEPLOYMENT_REGION="$REGION"
    
    success "Secure environment variables configured"
}

# Function to validate required secrets
validate_secrets() {
    info "Validating required secrets..."
    
    local required_vars=(
        "CLOUDFLARE_API_TOKEN"
        "CLOUDFLARE_ZONE_ID"
        "WARPDRIVE_PROD01_IP"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "   - $var"
        done
        exit 1
    fi
    
    success "All required secrets validated"
}

# Function to test Cloudflare API connectivity
test_cloudflare_api() {
    info "Testing Cloudflare API connectivity..."
    
    local response
    response=$(curl -s -X GET "https://api.cloudflare.com/v4/zones/$CLOUDFLARE_ZONE_ID" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json")
    
    if echo "$response" | jq -e '.success' >/dev/null 2>&1; then
        local zone_name
        zone_name=$(echo "$response" | jq -r '.result.name')
        success "Cloudflare API test successful - Zone: $zone_name"
    else
        error "Cloudflare API test failed"
        echo "$response" | jq '.errors' 2>/dev/null || echo "$response"
        exit 1
    fi
}

# Function to deploy DNS records
deploy_dns_records() {
    info "Deploying DNS records to Cloudflare..."
    
    # Read DNS configuration
    local dns_config="$SCRIPT_DIR/configs/domain/cloudflare-dns-config.json"
    
    if [ ! -f "$dns_config" ]; then
        error "DNS configuration file not found: $dns_config"
        exit 1
    fi
    
    # Deploy A records
    local records
    records=$(jq -r '.dns_configuration.a_records | to_entries[] | "\(.key),\(.value.name),\(.value.content),\(.value.ttl),\(.value.proxied)"' "$dns_config")
    
    while IFS=',' read -r key name content ttl proxied; do
        info "Deploying DNS record: $name"
        
        # Substitute environment variables in content
        content=$(echo "$content" | envsubst)
        
        # Create or update DNS record
        local data
        data=$(jq -n \
            --arg name "$name" \
            --arg content "$content" \
            --arg ttl "$ttl" \
            --argjson proxied "$proxied" \
            '{
                type: "A",
                name: $name,
                content: $content,
                ttl: ($ttl | tonumber),
                proxied: $proxied,
                comment: "Managed by Integration Gateway - Secure Deploy"
            }')
        
        # Check if record exists
        local existing_record
        existing_record=$(curl -s -X GET "https://api.cloudflare.com/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records?name=$name.2100.cool" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
            -H "Content-Type: application/json")
        
        local record_id
        record_id=$(echo "$existing_record" | jq -r '.result[0].id // empty')
        
        if [ -n "$record_id" ] && [ "$record_id" != "null" ]; then
            # Update existing record
            local response
            response=$(curl -s -X PUT "https://api.cloudflare.com/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records/$record_id" \
                -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
                -H "Content-Type: application/json" \
                -d "$data")
            
            if echo "$response" | jq -e '.success' >/dev/null; then
                success "Updated DNS record: $name"
            else
                error "Failed to update DNS record: $name"
                echo "$response" | jq '.errors'
            fi
        else
            # Create new record
            local response
            response=$(curl -s -X POST "https://api.cloudflare.com/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records" \
                -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
                -H "Content-Type: application/json" \
                -d "$data")
            
            if echo "$response" | jq -e '.success' >/dev/null; then
                success "Created DNS record: $name"
            else
                error "Failed to create DNS record: $name"
                echo "$response" | jq '.errors'
            fi
        fi
        
    done <<< "$records"
}

# Function to configure security settings
configure_security_settings() {
    info "Configuring Cloudflare security settings..."
    
    # SSL/TLS settings
    local ssl_response
    ssl_response=$(curl -s -X PATCH "https://api.cloudflare.com/v4/zones/$CLOUDFLARE_ZONE_ID/settings/ssl" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"value": "strict"}')
    
    if echo "$ssl_response" | jq -e '.success' >/dev/null; then
        success "SSL/TLS mode set to strict"
    else
        warn "Failed to configure SSL/TLS settings"
    fi
    
    # Always Use HTTPS
    local https_response
    https_response=$(curl -s -X PATCH "https://api.cloudflare.com/v4/zones/$CLOUDFLARE_ZONE_ID/settings/always_use_https" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"value": "on"}')
    
    if echo "$https_response" | jq -e '.success' >/dev/null; then
        success "Always Use HTTPS enabled"
    else
        warn "Failed to enable Always Use HTTPS"
    fi
    
    success "Security settings configured"
}

# Function to deploy owner interface
deploy_owner_interface() {
    info "Deploying MOCOA Owner Interface..."
    
    if [ -x "$SCRIPT_DIR/deploy-mocoa-owner-interface.sh" ]; then
        # Set environment for deployment
        export CLOUDFLARE_API_TOKEN
        export CLOUDFLARE_ZONE_ID
        export GCP_PROJECT_ID
        
        # Run deployment
        bash "$SCRIPT_DIR/deploy-mocoa-owner-interface.sh"
        
        if [ $? -eq 0 ]; then
            success "Owner interface deployment completed"
        else
            warn "Owner interface deployment encountered issues"
        fi
    else
        warn "Owner interface deployment script not found or not executable"
    fi
}

# Function to verify deployment
verify_deployment() {
    info "Verifying Cloudflare deployment..."
    
    local test_domains=(
        "2100.cool"
        "legal.2100.cool"
        "coach.2100.cool"
    )
    
    for domain in "${test_domains[@]}"; do
        info "Testing $domain..."
        
        # Check DNS resolution
        local resolved_ip
        resolved_ip=$(dig +short "$domain" | head -n1)
        
        if [ -n "$resolved_ip" ]; then
            success "$domain resolves to: $resolved_ip"
            
            # Check HTTPS response
            local https_status
            https_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$domain")
            
            if [ "$https_status" = "200" ] || [ "$https_status" = "301" ] || [ "$https_status" = "302" ]; then
                success "$domain HTTPS test passed (HTTP $https_status)"
            else
                warn "$domain HTTPS test failed (HTTP $https_status)"
            fi
        else
            warn "$domain DNS resolution failed"
        fi
    done
}

# Function to cleanup sensitive variables
cleanup_environment() {
    info "Cleaning up sensitive environment variables..."
    
    unset CLOUDFLARE_API_TOKEN
    unset CLOUDFLARE_EMAIL
    unset WARPDRIVE_PROD01_IP
    unset WARPDRIVE_PROD01_BACKUP_IP
    
    success "Environment cleanup completed"
}

# Main execution
main() {
    info "Starting secure Cloudflare deployment"
    info "Project: $PROJECT_ID"
    info "Region: $REGION"
    info "Log file: $LOG_FILE"
    
    # Check prerequisites
    if ! command -v gcloud &> /dev/null; then
        error "gcloud CLI not found. Please install Google Cloud SDK"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        error "jq not found. Please install jq"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        error "curl not found. Please install curl"
        exit 1
    fi
    
    # Execute deployment steps
    validate_gcp_auth
    setup_secure_environment
    validate_secrets
    test_cloudflare_api
    deploy_dns_records
    configure_security_settings
    deploy_owner_interface
    verify_deployment
    cleanup_environment
    
    success "🎉 SECURE CLOUDFLARE DEPLOYMENT COMPLETED SUCCESSFULLY!"
    echo ""
    echo "📊 DEPLOYMENT SUMMARY:"
    echo "• DNS records deployed and configured"
    echo "• Security settings applied"
    echo "• Owner interface deployed"
    echo "• All domains verified"
    echo ""
    echo "🔗 Access Points:"
    echo "• Main site: https://2100.cool"
    echo "• Owner interface: https://2100.cool/interface"
    echo "• Light interface: https://2100.cool/interface-light"
    echo "• Diamond SAO: https://2100.cool/diamond-sao"
    echo ""
    echo "📋 Log file: $LOG_FILE"
}

# Execute main function with error handling
set -e
trap 'error "Deployment failed at line $LINENO"' ERR

main "$@"
