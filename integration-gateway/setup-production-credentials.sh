#!/bin/bash

# =================================================================
# PRODUCTION CREDENTIALS SETUP SCRIPT
# Aixtiv Symphony - Integration Gateway Production Deployment
# =================================================================

echo "🔐 PRODUCTION CREDENTIALS SETUP"
echo "==============================="
echo "Setting up production Cloudflare credentials"
echo "Starting setup at $(date)"
echo ""

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID="api-for-warp-drive"
LOG_FILE="$SCRIPT_DIR/logs/production-setup-$(date +%Y%m%d-%H%M%S).log"

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

echo "📋 PRODUCTION SETUP PROCESS"
echo "==========================="

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

# Function to update production secrets
update_production_secrets() {
    info "Setting up production Cloudflare credentials..."
    
    echo ""
    echo "🔑 CLOUDFLARE CREDENTIALS REQUIRED"
    echo "=================================="
    echo ""
    echo "To proceed with production deployment, please provide:"
    echo "1. Cloudflare API Token (from Cloudflare dashboard -> My Profile -> API Tokens)"
    echo "2. Cloudflare Zone ID for 2100.cool (from Cloudflare dashboard -> Domain overview)"
    echo "3. Cloudflare Account Email"
    echo ""
    
    # Check if user wants to proceed
    read -p "Do you have your Cloudflare credentials ready? (y/n): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warn "Production setup cancelled. Please gather your Cloudflare credentials and run this script again."
        echo ""
        echo "📋 HOW TO GET CLOUDFLARE CREDENTIALS:"
        echo "======================================"
        echo "1. API Token: Login to Cloudflare -> My Profile -> API Tokens -> Create Token"
        echo "   - Template: Custom Token"
        echo "   - Permissions: Zone:Edit, DNS:Edit"
        echo "   - Zone Resources: Include - All zones"
        echo ""
        echo "2. Zone ID: Go to your domain (2100.cool) -> Overview -> API section (right sidebar)"
        echo ""
        echo "3. Account Email: Your Cloudflare login email"
        echo ""
        exit 0
    fi
    
    echo ""
    info "Please enter your production Cloudflare credentials:"
    echo ""
    
    # Get API Token
    echo -n "Cloudflare API Token: "
    read -s CLOUDFLARE_API_TOKEN
    echo ""
    
    # Get Zone ID
    echo -n "Cloudflare Zone ID for 2100.cool: "
    read CLOUDFLARE_ZONE_ID
    
    # Get Email
    echo -n "Cloudflare Account Email: "
    read CLOUDFLARE_EMAIL
    
    echo ""
    
    # Validate inputs
    if [ -z "$CLOUDFLARE_API_TOKEN" ] || [ -z "$CLOUDFLARE_ZONE_ID" ] || [ -z "$CLOUDFLARE_EMAIL" ]; then
        error "All credentials are required. Please run the script again."
        exit 1
    fi
    
    # Update secrets in GCP Secret Manager
    info "Updating GCP Secret Manager with production credentials..."
    
    # Update API Token
    echo "$CLOUDFLARE_API_TOKEN" | gcloud secrets versions add cloudflare-api-token --data-file=-
    if [ $? -eq 0 ]; then
        success "Updated cloudflare-api-token"
    else
        error "Failed to update cloudflare-api-token"
        exit 1
    fi
    
    # Update Zone ID
    echo "$CLOUDFLARE_ZONE_ID" | gcloud secrets versions add cloudflare-zone-id --data-file=-
    if [ $? -eq 0 ]; then
        success "Updated cloudflare-zone-id"
    else
        error "Failed to update cloudflare-zone-id"
        exit 1
    fi
    
    # Update Email
    echo "$CLOUDFLARE_EMAIL" | gcloud secrets versions add cloudflare-email --data-file=-
    if [ $? -eq 0 ]; then
        success "Updated cloudflare-email"
    else
        error "Failed to update cloudflare-email"
        exit 1
    fi
    
    # Update production IPs from .env.cloudflare
    source "$SCRIPT_DIR/.env.cloudflare"
    
    echo "$WARPDRIVE_PROD01_IP" | gcloud secrets versions add warpdrive-prod01-ip --data-file=-
    if [ $? -eq 0 ]; then
        success "Updated warpdrive-prod01-ip with production IP: $WARPDRIVE_PROD01_IP"
    else
        error "Failed to update warpdrive-prod01-ip"
        exit 1
    fi
    
    echo "$WARPDRIVE_PROD01_BACKUP_IP" | gcloud secrets versions add warpdrive-prod01-backup-ip --data-file=-
    if [ $? -eq 0 ]; then
        success "Updated warpdrive-prod01-backup-ip with production IP: $WARPDRIVE_PROD01_BACKUP_IP"
    else
        error "Failed to update warpdrive-prod01-backup-ip"
        exit 1
    fi
    
    success "All production credentials updated successfully!"
}

# Function to test production credentials
test_production_credentials() {
    info "Testing production Cloudflare API connectivity..."
    
    # Fetch the credentials from secret manager
    local api_token
    api_token=$(gcloud secrets versions access latest --secret="cloudflare-api-token" --project="$PROJECT_ID" 2>/dev/null)
    
    local zone_id
    zone_id=$(gcloud secrets versions access latest --secret="cloudflare-zone-id" --project="$PROJECT_ID" 2>/dev/null)
    
    if [ -z "$api_token" ] || [ -z "$zone_id" ]; then
        error "Failed to retrieve credentials from Secret Manager"
        exit 1
    fi
    
    # Test API connectivity
    local response
    response=$(curl -s -X GET "https://api.cloudflare.com/v4/zones/$zone_id" \
        -H "Authorization: Bearer $api_token" \
        -H "Content-Type: application/json")
    
    if echo "$response" | jq -e '.success' >/dev/null 2>&1; then
        local zone_name
        zone_name=$(echo "$response" | jq -r '.result.name')
        success "✅ Production Cloudflare API test successful!"
        success "✅ Connected to zone: $zone_name"
        
        # Check zone status
        local zone_status
        zone_status=$(echo "$response" | jq -r '.result.status')
        success "✅ Zone status: $zone_status"
        
    else
        error "❌ Production Cloudflare API test failed!"
        echo "Response: $response"
        exit 1
    fi
}

# Function to create production deployment script
create_production_deployment() {
    info "Creating production deployment script..."
    
    # Create production version of deployment script
    cp "$SCRIPT_DIR/deploy-cloudflare-secure.sh" "$SCRIPT_DIR/deploy-cloudflare-production.sh"
    
    # Update the script to use production mode
    sed -i '' 's/DEMO_MODE=true/DEMO_MODE=false/g' "$SCRIPT_DIR/deploy-cloudflare-production.sh" 2>/dev/null || \
    sed -i 's/DEMO_MODE=true/DEMO_MODE=false/g' "$SCRIPT_DIR/deploy-cloudflare-production.sh"
    
    chmod +x "$SCRIPT_DIR/deploy-cloudflare-production.sh"
    
    success "Production deployment script created: deploy-cloudflare-production.sh"
}

# Main execution
main() {
    info "Starting production credentials setup"
    info "Project: $PROJECT_ID"
    info "Log file: $LOG_FILE"
    echo ""
    
    # Execute setup steps
    validate_gcp_auth
    update_production_secrets
    test_production_credentials
    create_production_deployment
    
    success "🎉 PRODUCTION CREDENTIALS SETUP COMPLETED!"
    echo ""
    echo "📊 SETUP SUMMARY:"
    echo "• Production Cloudflare credentials configured"
    echo "• GCP Secret Manager updated with real values"
    echo "• Production API connectivity verified"
    echo "• Production deployment script created"
    echo ""
    echo "🚀 NEXT STEPS:"
    echo "1. Run: ./deploy-cloudflare-production.sh"
    echo "2. Verify all domains are working"
    echo "3. Review security headers configuration"
    echo ""
    echo "📋 Log file: $LOG_FILE"
}

# Execute main function with error handling
set -e
trap 'error "Production setup failed at line $LINENO"' ERR

main "$@"
