#!/bin/bash

# Deploy Integration Gateway to Cloudflare Pages
# This script deploys the SallyPort authentication functions and static files

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() { echo -e "${BLUE}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }

# Check if we're in the right directory
if [[ ! -f "wrangler.toml" ]]; then
    error "wrangler.toml not found. Are you in the integration-gateway directory?"
    exit 1
fi

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    error "Wrangler CLI is not installed. Please install it with: npm install -g wrangler"
    exit 1
fi

info "Starting deployment to Cloudflare Pages..."

# Ensure the functions directory structure exists
info "Checking function directory structure..."
if [[ ! -d "functions/api/sallyport" ]]; then
    error "SallyPort API functions directory not found"
    exit 1
fi

# Verify that key files exist
required_files=(
    "functions/api/sallyport/health.js"
    "functions/api/sallyport/login.js"
    "public/auth-test.html"
    "public/index.html"
)

for file in "${required_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        error "Required file not found: $file"
        exit 1
    fi
done

success "All required files found"

# Check if logged into Wrangler
info "Checking Wrangler authentication..."
if ! wrangler whoami &> /dev/null; then
    warn "Not logged into Wrangler. Please run: wrangler login"
    exit 1
fi

success "Wrangler authentication OK"

# Deploy to Cloudflare Pages
info "Deploying to Cloudflare Pages..."

# Use wrangler pages publish for deployment
wrangler pages deploy public \
    --project-name="integration-gateway-2100-cool" \
    --compatibility-date="2024-07-01" \
    --env="production"

if [[ $? -eq 0 ]]; then
    success "Deployment successful!"
    info "Your site is now live at: https://2100.cool"
    info "SallyPort API endpoints:"
    info "  - Health Check: https://2100.cool/api/sallyport/health"
    info "  - Login: https://2100.cool/api/sallyport/login"
    info "  - Test Page: https://2100.cool/auth-test.html"
else
    error "Deployment failed"
    exit 1
fi

# Test the deployment
info "Testing deployment..."

# Wait a moment for propagation
sleep 10

# Test health endpoint
info "Testing health endpoint..."
if curl -s -f "https://2100.cool/api/sallyport/health" > /dev/null; then
    success "Health endpoint is responding"
else
    warn "Health endpoint may not be ready yet"
fi

# Test main page
info "Testing main page..."
if curl -s -f "https://2100.cool/" > /dev/null; then
    success "Main page is responding"
else
    warn "Main page may not be ready yet"
fi

# Test auth page
info "Testing auth test page..."
if curl -s -f "https://2100.cool/auth-test.html" > /dev/null; then
    success "Auth test page is responding"
else
    warn "Auth test page may not be ready yet"
fi

success "Deployment complete!"
info "You can now test the SallyPort authentication at:"
info "https://2100.cool/auth-test.html"
