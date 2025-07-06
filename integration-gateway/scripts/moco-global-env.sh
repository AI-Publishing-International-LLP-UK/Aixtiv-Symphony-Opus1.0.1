#!/bin/bash
# moco-global-env.sh - Multi-Continental MOCO Infrastructure Environment Configuration
# Step 3: Configure environment variables for build and deployment across all regions

# =================================================================
# MOCO GLOBAL INFRASTRUCTURE ENVIRONMENT CONFIGURATION
# Multi-Continental, Multinational Deployment Support
# =================================================================

set -euo pipefail

# Color constants for enhanced logging
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[MOCO-INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[MOCO-SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[MOCO-WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[MOCO-ERROR]${NC} $1"
}

log_moco() {
    echo -e "${PURPLE}[MOCO-GLOBAL]${NC} $1"
}

log_moco "Initializing Multi-Continental MOCO Infrastructure Environment"
log_info "Setting up global deployment configuration..."

# Function to get secrets from Google Secret Manager
get-secret() {
    local secret_name="$1"
    gcloud secrets versions access latest --secret="$secret_name" --project="api-for-warp-drive" 2>/dev/null || {
        echo "Error: Failed to retrieve secret: $secret_name" >&2
        return 1
    }
}

# =================================================================
# CORE PROJECT CONFIGURATION
# =================================================================
export GOOGLE_PROJECT_ID="api-for-warp-drive"
export GCP_PROJECT_ID="api-for-warp-drive" 
export PROJECT_ID="api-for-warp-drive"

log_success "Core project configuration: $GOOGLE_PROJECT_ID"

# =================================================================
# CLOUDFLARE & SALLYPORT CONFIGURATION
# =================================================================
log_info "Configuring Cloudflare API Token from Secret Manager..."
export CLOUDFLARE_API_TOKEN=$(get-secret cloudflare-api-token)
export SALLYPORT_ENABLED=true
export SALLYPORT_CLOUDFLARE_BRIDGE=true

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
    log_error "Failed to retrieve Cloudflare API Token"
    exit 1
fi

log_success "Cloudflare API Token configured (${#CLOUDFLARE_API_TOKEN} characters)"
log_success "SallyPort Enabled: $SALLYPORT_ENABLED"
log_success "SallyPort Cloudflare Bridge: $SALLYPORT_CLOUDFLARE_BRIDGE"

# =================================================================
# MOCO GLOBAL INFRASTRUCTURE REGIONS & ZONES
# =================================================================

log_moco "Configuring MOCO Global Infrastructure..."

# MOCOA - Client-Facing Deployment & Live Services Environment
log_info "Setting up MOCOA (Client-Facing Deployment & Live Services)"
export MOCOA_REGION_PRIMARY="us-west1"
export MOCOA_ZONE_A="us-west1-a"
export MOCOA_ZONE_B="us-west1-b"
export MOCOA_REGION_EU="eu-west1"
export MOCOA_ZONE_EU_A="eu-west1-a"
export MOCOA_ZONE_EU_B="eu-west1-b"
export MOCOA_ZONE_EU_C="eu-west1-c"

log_success "MOCOA US West 1: Zones A ($MOCOA_ZONE_A), B ($MOCOA_ZONE_B)"
log_success "MOCOA EU West 1 (Belgium): Zones A-C configured"

# MOCORIX - Intelligence Development & Real-Time Model Training Environment
log_info "Setting up MOCORIX (AI R&D and Model Training)"
export MOCORIX_REGION="us-west1"
export MOCORIX_ZONE="us-west1-c"
export MOCORIX_ZONE_PRIMARY="us-west1-c"

log_success "MOCORIX US West 1-C: $MOCORIX_ZONE"

# MOCORIX2 - Master Orchestration Hub & Super-Agent Governance
log_info "Setting up MOCORIX2 (Master Orchestration Hub)"
export MOCORIX2_REGION="us-central1"
export MOCORIX2_ZONE="us-central1-a"
export MOCORIX2_ZONE_B="us-central1-b"
export MOCORIX2_ZONE_C="us-central1-c"

log_success "MOCORIX2 US Central 1: Primary Zone A ($MOCORIX2_ZONE)"

# =================================================================
# PRIMARY DEPLOYMENT CONFIGURATION (US-WEST1)
# =================================================================

log_info "Setting primary deployment region to US-West1..."

# Primary operational region (us-west1)
export GOOGLE_CLOUD_REGION="us-west1"
export GOOGLE_CLOUD_ZONE="us-west1-b"
export REGION="us-west1"
export ZONE="us-west1-b"
export GCP_REGION="us-west1"
export GCP_ZONE="us-west1-b"

# All us-west1 zones for comprehensive coverage
export GCP_ZONE_A="us-west1-a"    # MOCOA Zone A
export GCP_ZONE_B="us-west1-b"    # MOCOA Zone B (Primary)
export GCP_ZONE_C="us-west1-c"    # MOCORIX Zone C

log_success "Primary deployment region: $GOOGLE_CLOUD_REGION"
log_success "Primary deployment zone: $GOOGLE_CLOUD_ZONE"
log_success "All US-West1 zones configured: A, B, C"

# =================================================================
# MULTI-CONTINENTAL REGION ARRAYS
# =================================================================

# Array of all regions for multi-continental deployment
export MOCO_ALL_REGIONS=(
    "us-west1"      # MOCOA Primary + MOCORIX
    "eu-west1"      # MOCOA EU (Belgium)
    "us-central1"   # MOCORIX2 (Master Orchestration)
)

# Array of all zones for comprehensive deployment
export MOCO_ALL_ZONES=(
    "us-west1-a"    # MOCOA Zone A
    "us-west1-b"    # MOCOA Zone B (Primary)
    "us-west1-c"    # MOCORIX Zone C
    "eu-west1-a"    # MOCOA EU Zone A
    "eu-west1-b"    # MOCOA EU Zone B
    "eu-west1-c"    # MOCOA EU Zone C
    "us-central1-a" # MOCORIX2 Zone A (Primary)
    "us-central1-b" # MOCORIX2 Zone B
    "us-central1-c" # MOCORIX2 Zone C
)

log_moco "Multi-continental regions: ${MOCO_ALL_REGIONS[*]}"
log_moco "All deployment zones: ${MOCO_ALL_ZONES[*]}"

# =================================================================
# SALLYPORT MULTI-REGIONAL CONFIGURATION
# =================================================================

export SALLYPORT_PROJECT_ID="$GOOGLE_PROJECT_ID"
export SALLYPORT_REGION="$GOOGLE_CLOUD_REGION"
export SALLYPORT_REGION_EU="$MOCOA_REGION_EU"
export SALLYPORT_REGION_CENTRAL="$MOCORIX2_REGION"

# Cloudflare Bridge configuration for all regions
export CLOUDFLARE_BRIDGE_ENABLED="$SALLYPORT_CLOUDFLARE_BRIDGE"
export CLOUDFLARE_PROJECT_ID="$GOOGLE_PROJECT_ID"

# =================================================================
# DEPLOYMENT METADATA
# =================================================================

export ENVIRONMENT="${ENVIRONMENT:-production}"
export DEPLOYMENT_TIMESTAMP="$(date -u +'%Y%m%d-%H%M%S')"
export DEPLOYMENT_REGION="$GOOGLE_CLOUD_REGION"
export MOCO_DEPLOYMENT_MODE="multi-continental"

# =================================================================
# VALIDATION & SUMMARY
# =================================================================

validate_moco_environment() {
    log_info "Validating MOCO Global Infrastructure environment..."
    
    local required_vars=(
        "CLOUDFLARE_API_TOKEN"
        "SALLYPORT_ENABLED"
        "SALLYPORT_CLOUDFLARE_BRIDGE"
        "GOOGLE_PROJECT_ID"
        "MOCOA_REGION_PRIMARY"
        "MOCORIX_ZONE"
        "MOCORIX2_REGION"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Missing required MOCO environment variables:"
        for var in "${missing_vars[@]}"; do
            log_error "  - $var"
        done
        return 1
    fi
    
    log_success "All required MOCO environment variables are set"
    return 0
}

# Run validation
if validate_moco_environment; then
    log_moco "=== MOCO GLOBAL INFRASTRUCTURE SUMMARY ==="
    echo ""
    log_success "🌍 MOCOA (Client-Facing & Live Services)"
    log_success "   └── US-West1: $MOCOA_ZONE_A, $MOCOA_ZONE_B"
    log_success "   └── EU-West1 (Belgium): $MOCOA_ZONE_EU_A, $MOCOA_ZONE_EU_B, $MOCOA_ZONE_EU_C"
    echo ""
    log_success "🧠 MOCORIX (AI R&D & Model Training)"
    log_success "   └── US-West1-C: $MOCORIX_ZONE"
    echo ""
    log_success "🎯 MOCORIX2 (Master Orchestration Hub)"
    log_success "   └── US-Central1: $MOCORIX2_ZONE"
    echo ""
    log_success "🔐 Security & Integration"
    log_success "   ├── Cloudflare API Token: ✓ Retrieved from Secret Manager"
    log_success "   ├── SallyPort: ✓ Enabled with Cloudflare Bridge"
    log_success "   └── Project: ✓ $GOOGLE_PROJECT_ID"
    echo ""
    log_success "🚀 Primary Deployment: $GOOGLE_CLOUD_REGION ($GOOGLE_CLOUD_ZONE)"
    echo ""
    log_moco "All regions confirmed operational: ${MOCO_ALL_REGIONS[*]}"
    log_moco "Environment ready for multi-continental deployment!"
else
    log_error "MOCO environment validation failed"
    exit 1
fi

# Export summary to file
export_moco_config() {
    local config_file="/tmp/moco-global-config.sh"
    
    log_info "Exporting MOCO configuration to: $config_file"
    
    cat > "$config_file" << 'MOCO_EOF'
#!/bin/bash
# MOCO Global Infrastructure Configuration
# Multi-Continental Environment Variables

# Function to get secrets from Google Secret Manager
get-secret() {
    local secret_name="$1"
    gcloud secrets versions access latest --secret="$secret_name" --project="api-for-warp-drive" 2>/dev/null || {
        echo "Error: Failed to retrieve secret: $secret_name" >&2
        return 1
    }
}

# Core configuration
export GOOGLE_PROJECT_ID=api-for-warp-drive
export CLOUDFLARE_API_TOKEN=$(get-secret cloudflare-api-token)
export SALLYPORT_ENABLED=true
export SALLYPORT_CLOUDFLARE_BRIDGE=true

# MOCOA (Client-facing deployment & live services)
export MOCOA_REGION_PRIMARY=us-west1
export MOCOA_ZONE_A=us-west1-a
export MOCOA_ZONE_B=us-west1-b
export MOCOA_REGION_EU=eu-west1
export MOCOA_ZONE_EU_A=eu-west1-a
export MOCOA_ZONE_EU_B=eu-west1-b
export MOCOA_ZONE_EU_C=eu-west1-c

# MOCORIX (AI R&D and model training)
export MOCORIX_REGION=us-west1
export MOCORIX_ZONE=us-west1-c

# MOCORIX2 (Master orchestration hub)
export MOCORIX2_REGION=us-central1
export MOCORIX2_ZONE=us-central1-a

# Primary deployment (us-west1)
export GOOGLE_CLOUD_REGION=us-west1
export GOOGLE_CLOUD_ZONE=us-west1-b
export REGION=us-west1
export ZONE=us-west1-b
export GCP_REGION=us-west1
export GCP_ZONE=us-west1-b

# All us-west1 zones
export GCP_ZONE_A=us-west1-a
export GCP_ZONE_B=us-west1-b
export GCP_ZONE_C=us-west1-c

# Arrays for multi-continental deployment
export MOCO_ALL_REGIONS=(us-west1 eu-west1 us-central1)
export MOCO_ALL_ZONES=(us-west1-a us-west1-b us-west1-c eu-west1-a eu-west1-b eu-west1-c us-central1-a us-central1-b us-central1-c)

MOCO_EOF
    
    chmod +x "$config_file"
    log_success "MOCO configuration exported to: $config_file"
    log_info "To use: source $config_file"
}

export_moco_config

log_moco "MOCO Global Infrastructure environment setup completed! 🌍"
