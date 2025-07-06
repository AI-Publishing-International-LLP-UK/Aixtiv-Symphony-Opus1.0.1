#!/bin/bash
# export-env.sh - Export environment variables for build and deployment
# Step 3: Configure environment variables for build and deployment

# =================================================================
# ENVIRONMENT VARIABLE EXPORT SCRIPT
# For use in build/deployment scripts and CI/CD pipelines
# =================================================================

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Exporting environment variables for Integration Gateway...${NC}"

# Function to get secrets from Google Secret Manager
get-secret() {
    local secret_name="$1"
    gcloud secrets versions access latest --secret="$secret_name" --project="api-for-warp-drive" 2>/dev/null || {
        echo "Warning: Failed to retrieve secret: $secret_name" >&2
        return 1
    }
}

# Set up export of Cloudflare API Token using secret manager
export CLOUDFLARE_API_TOKEN=$(get-secret cloudflare-api-token)

# SallyPort configuration
export SALLYPORT_ENABLED=true
export SALLYPORT_CLOUDFLARE_BRIDGE=true

# Google Cloud Project configuration
export GOOGLE_PROJECT_ID=api-for-warp-drive

# Ensure us-west1 region for all relevant Google Cloud variables
export GOOGLE_CLOUD_REGION=us-west1
export GOOGLE_CLOUD_ZONE=us-west1-b
export GCP_REGION=us-west1
export GCP_ZONE=us-west1-b
export REGION=us-west1
export ZONE=us-west1-b

# Additional project configuration
export PROJECT_ID=api-for-warp-drive
export GCP_PROJECT_ID=api-for-warp-drive

# SallyPort specific settings
export SALLYPORT_PROJECT_ID="$GOOGLE_PROJECT_ID"
export SALLYPORT_REGION="$GOOGLE_CLOUD_REGION"

# Cloudflare Bridge configuration
export CLOUDFLARE_BRIDGE_ENABLED="$SALLYPORT_CLOUDFLARE_BRIDGE"
export CLOUDFLARE_PROJECT_ID="$GOOGLE_PROJECT_ID"

# Environment type
export ENVIRONMENT="${ENVIRONMENT:-production}"
export DEPLOYMENT_REGION="$GOOGLE_CLOUD_REGION"

# Validation
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
    echo "Error: CLOUDFLARE_API_TOKEN not set or empty" >&2
    exit 1
fi

echo -e "${GREEN}✓ Environment variables exported successfully${NC}"
echo -e "${GREEN}✓ Cloudflare API Token: ${#CLOUDFLARE_API_TOKEN} characters${NC}"
echo -e "${GREEN}✓ SallyPort Enabled: $SALLYPORT_ENABLED${NC}"
echo -e "${GREEN}✓ SallyPort Cloudflare Bridge: $SALLYPORT_CLOUDFLARE_BRIDGE${NC}"
echo -e "${GREEN}✓ Google Project ID: $GOOGLE_PROJECT_ID${NC}"
echo -e "${GREEN}✓ Region: $GOOGLE_CLOUD_REGION${NC}"
echo -e "${GREEN}✓ Zone: $GOOGLE_CLOUD_ZONE${NC}"

# Write environment to temp file for sourcing
ENV_FILE="/tmp/integration-gateway-exports.sh"
cat > "$ENV_FILE" << 'EOF'
#!/bin/bash
# Environment exports for Integration Gateway
# Source this file to load all environment variables

# Function to get secrets from Google Secret Manager
get-secret() {
    local secret_name="$1"
    gcloud secrets versions access latest --secret="$secret_name" --project="api-for-warp-drive" 2>/dev/null || {
        echo "Error: Failed to retrieve secret: $secret_name" >&2
        return 1
    }
}

# Export environment variables
export CLOUDFLARE_API_TOKEN=$(get-secret cloudflare-api-token)
export SALLYPORT_ENABLED=true
export SALLYPORT_CLOUDFLARE_BRIDGE=true
export GOOGLE_PROJECT_ID=api-for-warp-drive
export GOOGLE_CLOUD_REGION=us-west1
export GOOGLE_CLOUD_ZONE=us-west1-b
export GCP_REGION=us-west1
export GCP_ZONE=us-west1-b
export REGION=us-west1
export ZONE=us-west1-b
export PROJECT_ID=api-for-warp-drive
export GCP_PROJECT_ID=api-for-warp-drive
export SALLYPORT_PROJECT_ID="$GOOGLE_PROJECT_ID"
export SALLYPORT_REGION="$GOOGLE_CLOUD_REGION"
export CLOUDFLARE_BRIDGE_ENABLED="$SALLYPORT_CLOUDFLARE_BRIDGE"
export CLOUDFLARE_PROJECT_ID="$GOOGLE_PROJECT_ID"
export ENVIRONMENT="${ENVIRONMENT:-production}"
export DEPLOYMENT_REGION="$GOOGLE_CLOUD_REGION"
EOF

chmod +x "$ENV_FILE"
echo -e "${GREEN}✓ Environment exports saved to: $ENV_FILE${NC}"
echo -e "${BLUE}To use: source $ENV_FILE${NC}"
