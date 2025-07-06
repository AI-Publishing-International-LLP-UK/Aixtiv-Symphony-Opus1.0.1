#!/bin/bash
# setup-environment.sh - Configure environment variables for build and deployment
# Step 3: Configure environment variables for build and deployment

# =================================================================
# ENVIRONMENT SETUP FOR AIXTIV SYMPHONY INTEGRATION GATEWAY
# =================================================================

set -euo pipefail

# Color constants for enhanced logging
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
ZONE="us-west1-b"

log_info "Setting up environment variables for Integration Gateway"
log_info "Project: $PROJECT_ID"
log_info "Region: $REGION"
log_info "Zone: $ZONE"

# Function to safely retrieve secrets from Google Secret Manager
get_secret() {
    local secret_name="$1"
    local description="${2:-$secret_name}"
    
    log_info "Retrieving secret: $secret_name ($description)"
    
    if secret_value=$(gcloud secrets versions access latest --secret="$secret_name" --project="$PROJECT_ID" 2>/dev/null); then
        log_success "Successfully retrieved: $secret_name"
        echo "$secret_value"
        return 0
    else
        log_error "Failed to retrieve secret: $secret_name"
        return 1
    fi
}

# Export Cloudflare API Token using Secret Manager
log_info "Configuring Cloudflare credentials..."
export CLOUDFLARE_API_TOKEN=$(get_secret "cloudflare-api-token" "Cloudflare API Token")

# Verify the token is retrieved successfully
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
    log_error "Failed to retrieve Cloudflare API Token"
    exit 1
fi

log_success "Cloudflare API Token configured (${#CLOUDFLARE_API_TOKEN} characters)"

# Set SallyPort configuration
log_info "Configuring SallyPort settings..."
export SALLYPORT_ENABLED=true
export SALLYPORT_CLOUDFLARE_BRIDGE=true

log_success "SallyPort configuration set:"
log_success "  - SALLYPORT_ENABLED: $SALLYPORT_ENABLED"
log_success "  - SALLYPORT_CLOUDFLARE_BRIDGE: $SALLYPORT_CLOUDFLARE_BRIDGE"

# Set Google Cloud Project configuration
log_info "Configuring Google Cloud Project settings..."
export GOOGLE_PROJECT_ID="api-for-warp-drive"
export GCP_PROJECT_ID="api-for-warp-drive"
export PROJECT_ID="api-for-warp-drive"

# MOCO Global Infrastructure - Multi-Continental Setup
# Primary regions for MOCOA, MOCORIX, and MOCORIX2

# MOCOA (Client-facing deployment & live services)
export MOCOA_REGION_PRIMARY="us-west1"
export MOCOA_ZONE_A="us-west1-a"
export MOCOA_ZONE_B="us-west1-b"
export MOCOA_REGION_EU="eu-west1"
export MOCOA_ZONE_EU="eu-west1-b"

# MOCORIX (AI R&D and model training)
export MOCORIX_REGION="us-west1"
export MOCORIX_ZONE="us-west1-c"

# MOCORIX2 (Master orchestration hub)
export MOCORIX2_REGION="us-central1"
export MOCORIX2_ZONE="us-central1-a"

# Set primary region and zone (us-west1 for primary operations)
export GOOGLE_CLOUD_REGION="us-west1"
export GOOGLE_CLOUD_ZONE="us-west1-b"
export REGION="us-west1"
export ZONE="us-west1-b"
export GCP_REGION="us-west1"
export GCP_ZONE="us-west1-b"

# Additional zones for us-west1
export GCP_ZONE_A="us-west1-a"
export GCP_ZONE_B="us-west1-b"
export GCP_ZONE_C="us-west1-c"

log_success "Google Cloud configuration set:"
log_success "  - GOOGLE_PROJECT_ID: $GOOGLE_PROJECT_ID"
log_success "  - GOOGLE_CLOUD_REGION: $GOOGLE_CLOUD_REGION"
log_success "  - GOOGLE_CLOUD_ZONE: $GOOGLE_CLOUD_ZONE"

# Additional environment variables for comprehensive deployment
export ENVIRONMENT="${ENVIRONMENT:-production}"
export DEPLOYMENT_TIMESTAMP="$(date -u +'%Y%m%d-%H%M%S')"

# SallyPort specific configuration
export SALLYPORT_PROJECT_ID="$GOOGLE_PROJECT_ID"
export SALLYPORT_REGION="$GOOGLE_CLOUD_REGION"
export SALLYPORT_BASE_URL="https://sallyport-cloudflare-auth-859242575175.us-west1.run.app"
export SALLYPORT_BACKUP_URL="https://integration-gateway-859242575175.us-west1.run.app"

# Cloudflare Bridge configuration
export CLOUDFLARE_BRIDGE_ENABLED="$SALLYPORT_CLOUDFLARE_BRIDGE"
export CLOUDFLARE_PROJECT_ID="$GOOGLE_PROJECT_ID"

log_success "Additional configuration set:"
log_success "  - ENVIRONMENT: $ENVIRONMENT"
log_success "  - DEPLOYMENT_TIMESTAMP: $DEPLOYMENT_TIMESTAMP"
log_success "  - SALLYPORT_PROJECT_ID: $SALLYPORT_PROJECT_ID"
log_success "  - CLOUDFLARE_BRIDGE_ENABLED: $CLOUDFLARE_BRIDGE_ENABLED"

# Function to validate all required environment variables
validate_environment() {
    log_info "Validating environment configuration..."
    
    local required_vars=(
        "CLOUDFLARE_API_TOKEN"
        "SALLYPORT_ENABLED"
        "SALLYPORT_CLOUDFLARE_BRIDGE"
        "GOOGLE_PROJECT_ID"
        "GOOGLE_CLOUD_REGION"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            log_error "  - $var"
        done
        return 1
    fi
    
    log_success "All required environment variables are set"
    return 0
}

# Function to export variables to a file for sourcing
export_to_file() {
    local export_file="${1:-/tmp/integration-gateway-env.sh}"
    
    log_info "Exporting environment variables to: $export_file"
    
    cat > "$export_file" << 'EOF'
#!/bin/bash
# Environment variables for Integration Gateway build and deployment
# Generated automatically by setup-environment.sh

# Function to get secrets from Google Secret Manager
get-secret() {
    local secret_name="$1"
    gcloud secrets versions access latest --secret="$secret_name" --project="api-for-warp-drive" 2>/dev/null || {
        echo "Error: Failed to retrieve secret: $secret_name" >&2
        return 1
    }
}

# Cloudflare configuration
export CLOUDFLARE_API_TOKEN=$(get-secret cloudflare-api-token)

# SallyPort configuration
export SALLYPORT_ENABLED=true
export SALLYPORT_CLOUDFLARE_BRIDGE=true

# Google Cloud Project configuration
export GOOGLE_PROJECT_ID=api-for-warp-drive
export GCP_PROJECT_ID=api-for-warp-drive
export PROJECT_ID=api-for-warp-drive

# Region configuration (us-west1)
export GOOGLE_CLOUD_REGION=us-west1
export GOOGLE_CLOUD_ZONE=us-west1-b
export REGION=us-west1
export ZONE=us-west1-b
export GCP_REGION=us-west1
export GCP_ZONE=us-west1-b

# Additional configuration
export ENVIRONMENT="${ENVIRONMENT:-production}"
export SALLYPORT_PROJECT_ID="$GOOGLE_PROJECT_ID"
export SALLYPORT_REGION="$GOOGLE_CLOUD_REGION"
export CLOUDFLARE_BRIDGE_ENABLED="$SALLYPORT_CLOUDFLARE_BRIDGE"
export CLOUDFLARE_PROJECT_ID="$GOOGLE_PROJECT_ID"

EOF
    
    chmod +x "$export_file"
    log_success "Environment variables exported to: $export_file"
    log_info "To use: source $export_file"
}

# Validate configuration
if validate_environment; then
    log_success "Environment setup completed successfully!"
    
    # Export to file for use in other scripts
    export_to_file "/tmp/integration-gateway-env.sh"
    
    echo ""
    log_success "=== ENVIRONMENT SUMMARY ==="
    log_success "Cloudflare API Token: ✓ Retrieved from Secret Manager"
    log_success "SallyPort Configuration: ✓ Enabled with Cloudflare Bridge"
    log_success "Google Cloud Project: ✓ $GOOGLE_PROJECT_ID"
    log_success "Region/Zone: ✓ $GOOGLE_CLOUD_REGION / $GOOGLE_CLOUD_ZONE"
    log_success "All environment variables are properly configured for us-west1!"
    echo ""
else
    log_error "Environment setup failed - missing required variables"
    exit 1
fi

# Display usage instructions
cat << 'EOF'

📋 USAGE INSTRUCTIONS:

1. Source this script to set environment variables:
   source scripts/setup-environment.sh

2. Use the exported environment file in other scripts:
   source /tmp/integration-gateway-env.sh

3. Required variables are now available:
   - $CLOUDFLARE_API_TOKEN (from Secret Manager)
   - $SALLYPORT_ENABLED (true)
   - $SALLYPORT_CLOUDFLARE_BRIDGE (true)  
   - $GOOGLE_PROJECT_ID (api-for-warp-drive)
   - All regional variables set to us-west1

4. Use in build/deploy scripts:
   export CLOUDFLARE_API_TOKEN=$(get-secret cloudflare-api-token)

EOF
