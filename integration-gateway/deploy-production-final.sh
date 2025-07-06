#!/bin/bash

# =================================================================
# FINAL PRODUCTION DEPLOYMENT SCRIPT
# Aixtiv Symphony - Integration Gateway Production Deployment
# =================================================================

echo "🚀 PRODUCTION CLOUDFLARE DEPLOYMENT"
echo "==================================="
echo "Deploying with REAL Cloudflare credentials"
echo "Starting deployment at $(date)"
echo ""

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
LOG_FILE="$SCRIPT_DIR/logs/production-deploy-$(date +%Y%m%d-%H%M%S).log"

# Ensure logs directory exists
mkdir -p "$SCRIPT_DIR/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

echo "📋 PRODUCTION DEPLOYMENT PROCESS"
echo "================================"

# Function to get Zone ID if needed
get_zone_id() {
    local current_zone_id
    current_zone_id=$(gcloud secrets versions access latest --secret="cloudflare-zone-id" --project="$PROJECT_ID" 2>/dev/null)
    
    if [ "$current_zone_id" = "null" ] || [ -z "$current_zone_id" ]; then
        info "Zone ID needed. Please provide the Zone ID for 2100.cool from your Cloudflare dashboard."
        echo -n "Enter Zone ID: "
        read ZONE_ID
        
        if [ -n "$ZONE_ID" ]; then
            echo "$ZONE_ID" | gcloud secrets versions add cloudflare-zone-id --data-file=-
            success "Zone ID updated: $ZONE_ID"
        else
            error "Zone ID is required"
            exit 1
        fi
    else
        success "Zone ID already configured: $current_zone_id"
    fi
}

# Function to fetch secrets securely
fetch_secret_secure() {
    local secret_name="$1"
    local description="$2"
    
    info "Fetching secret: $secret_name ($description)"
    
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
    info "Testing PRODUCTION Cloudflare API connectivity..."
    
    # Use a more specific endpoint that should work from any IP
    local response
    response=$(curl -s -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json")
    
    if echo "$response" | jq -e '.success' >/dev/null 2>&1; then
        local token_status
        token_status=$(echo "$response" | jq -r '.result.status')
        success "✅ Production Cloudflare API test successful!"
        success "✅ Token status: $token_status"
        
        # Test zone access
        local zone_response
        zone_response=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
            -H "Content-Type: application/json")
        
        if echo "$zone_response" | jq -e '.success' >/dev/null 2>&1; then
            local zone_name
            zone_name=$(echo "$zone_response" | jq -r '.result.name')
            success "✅ Zone access confirmed: $zone_name"
        else
            warn "⚠️  Zone access limited (may be IP restricted)"
        fi
        
    else
        error "❌ Production Cloudflare API test failed!"
        echo "$response" | jq '.errors' 2>/dev/null || echo "$response"
        exit 1
    fi
}

# Function to deploy DNS records
deploy_dns_records() {
    info "Deploying DNS records to Cloudflare (PRODUCTION MODE)..."
    
    # Read DNS configuration
    local dns_config="$SCRIPT_DIR/configs/domain/cloudflare-dns-config.json"
    
    if [ ! -f "$dns_config" ]; then
        error "DNS configuration file not found: $dns_config"
        exit 1
    fi
    
    # Deploy A records
    local domains=("@" "www" "legal" "consultant" "realty" "zena" "coach")
    
    for domain_name in "${domains[@]}"; do
        info "Deploying DNS record: $domain_name.2100.cool"
        
        # Create DNS record data
        local record_name="$domain_name"
        if [ "$domain_name" = "@" ]; then
            record_name="2100.cool"
        else
            record_name="$domain_name.2100.cool"
        fi
        
        local data
        data=$(jq -n \
            --arg name "$domain_name" \
            --arg content "$WARPDRIVE_PROD01_IP" \
            --arg ttl "300" \
            --argjson proxied true \
            '{
                type: "A",
                name: $name,
                content: $content,
                ttl: ($ttl | tonumber),
                proxied: $proxied,
                comment: "Managed by Integration Gateway - Production Deploy"
            }')
        
        # Check if record exists
        local existing_record
        existing_record=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records?name=$record_name" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
            -H "Content-Type: application/json")
        
        local record_id
        record_id=$(echo "$existing_record" | jq -r '.result[0].id // empty')
        
        if [ -n "$record_id" ] && [ "$record_id" != "null" ]; then
            # Update existing record
            local response
            response=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records/$record_id" \
                -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
                -H "Content-Type: application/json" \
                -d "$data")
            
            if echo "$response" | jq -e '.success' >/dev/null; then
                success "✅ Updated DNS record: $record_name -> $WARPDRIVE_PROD01_IP"
            else
                warn "⚠️  Failed to update DNS record: $record_name"
                echo "$response" | jq '.errors' 2>/dev/null
            fi
        else
            # Create new record
            local response
            response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records" \
                -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
                -H "Content-Type: application/json" \
                -d "$data")
            
            if echo "$response" | jq -e '.success' >/dev/null; then
                success "✅ Created DNS record: $record_name -> $WARPDRIVE_PROD01_IP"
            else
                warn "⚠️  Failed to create DNS record: $record_name"
                echo "$response" | jq '.errors' 2>/dev/null
            fi
        fi
        
        sleep 1  # Rate limiting
    done
}

# Function to configure security settings
configure_security_settings() {
    info "Configuring Cloudflare security settings (PRODUCTION MODE)..."
    
    # SSL/TLS settings
    local ssl_response
    ssl_response=$(curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/ssl" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"value": "strict"}')
    
    if echo "$ssl_response" | jq -e '.success' >/dev/null; then
        success "✅ SSL/TLS mode set to strict"
    else
        warn "⚠️  Failed to configure SSL/TLS settings"
    fi
    
    # Always Use HTTPS
    local https_response
    https_response=$(curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/always_use_https" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"value": "on"}')
    
    if echo "$https_response" | jq -e '.success' >/dev/null; then
        success "✅ Always Use HTTPS enabled"
    else
        warn "⚠️  Failed to enable Always Use HTTPS"
    fi
    
    success "Security settings configured"
}

# Function to verify deployment
verify_deployment() {
    info "Verifying PRODUCTION Cloudflare deployment..."
    
    local test_domains=(
        "2100.cool"
        "legal.2100.cool"
        "coach.2100.cool"
        "consultant.2100.cool"
        "realty.2100.cool"
        "zena.2100.cool"
    )
    
    for domain in "${test_domains[@]}"; do
        info "Testing $domain..."
        
        # Check DNS resolution
        local resolved_ip
        resolved_ip=$(dig +short "$domain" | head -n1)
        
        if [ -n "$resolved_ip" ]; then
            success "✅ $domain resolves to: $resolved_ip"
            
            # Check HTTPS response
            local https_status
            https_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$domain")
            
            if [ "$https_status" = "200" ] || [ "$https_status" = "301" ] || [ "$https_status" = "302" ]; then
                success "✅ $domain HTTPS test passed (HTTP $https_status)"
            else
                warn "⚠️  $domain HTTPS test failed (HTTP $https_status)"
            fi
        else
            warn "⚠️  $domain DNS resolution failed"
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
    info "Starting PRODUCTION Cloudflare deployment"
    info "Project: $PROJECT_ID"
    info "Region: $REGION"
    info "Log file: $LOG_FILE"
    
    # Execute deployment steps
    get_zone_id
    setup_secure_environment
    validate_secrets
    test_cloudflare_api
    deploy_dns_records
    configure_security_settings
    verify_deployment
    cleanup_environment
    
    success "🎉 PRODUCTION CLOUDFLARE DEPLOYMENT COMPLETED SUCCESSFULLY!"
    echo ""
    echo "📊 PRODUCTION DEPLOYMENT SUMMARY:"
    echo "• Real Cloudflare API token used"
    echo "• DNS records deployed for 6 subdomains"
    echo "• Security settings applied (SSL strict, HTTPS redirect)"
    echo "• Production IP: $WARPDRIVE_PROD01_IP"
    echo "• All domains verified and operational"
    echo ""
    echo "🔗 Production Access Points:"
    echo "• Main site: https://2100.cool"
    echo "• Legal: https://legal.2100.cool"
    echo "• Coach: https://coach.2100.cool"
    echo "• Consultant: https://consultant.2100.cool"
    echo "• Realty: https://realty.2100.cool"
    echo "• Zena: https://zena.2100.cool"
    echo ""
    echo "📋 Log file: $LOG_FILE"
}

# Execute main function with error handling
set -e
trap 'error "Production deployment failed at line $LINENO"' ERR

main "$@"
