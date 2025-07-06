#!/bin/bash

# 🏛️ MOCOA Owner Interface Quick Deploy Script
# Deploy your owner interface to MOCOA infrastructure behind Cloudflare

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
SERVICE_NAME="mocoa-owner-interface"
IMAGE_NAME="gcr.io/${PROJECT_ID}/mocoa-owner-interface"
COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "manual-$(date +%Y%m%d%H%M%S)")

echo -e "${PURPLE}🏛️ MOCOA Owner Interface Deployment${NC}"
echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}Project: ${YELLOW}${PROJECT_ID}${NC}"
echo -e "${BLUE}Region: ${YELLOW}${REGION}${NC}"
echo -e "${BLUE}Service: ${YELLOW}${SERVICE_NAME}${NC}"
echo -e "${BLUE}Version: ${YELLOW}${COMMIT_SHA}${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
missing_tools=()

if ! command_exists gcloud; then
    missing_tools+=("gcloud")
fi

if ! command_exists docker; then
    missing_tools+=("docker")
fi

if [ ${#missing_tools[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing required tools: ${missing_tools[*]}${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met${NC}"

# Check if we're in the right directory
if [ ! -d "private/owner-interface" ]; then
    echo -e "${RED}❌ private/owner-interface directory not found!${NC}"
    echo -e "${YELLOW}Please run this script from the integration-gateway root directory.${NC}"
    exit 1
fi

# Set project
echo -e "${BLUE}⚙️ Setting up Google Cloud project...${NC}"
gcloud config set project "${PROJECT_ID}"

# Create deployment directory
echo -e "${BLUE}📦 Preparing deployment package...${NC}"
rm -rf deploy/owner-interface
mkdir -p deploy/owner-interface

# Copy interface files
cp -r private/owner-interface/* deploy/owner-interface/

# Create deployment metadata
cat > deploy/owner-interface/deployment-info.json << EOF
{
  "version": "${COMMIT_SHA}",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "production",
  "themes": ["dark", "light"],
  "mocoa_version": "v99",
  "security_level": "DIAMOND_SAO"
}
EOF

# Create health check endpoint
cat > deploy/owner-interface/health.json << EOF
{
  "status": "healthy",
  "mocoa": "v99",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "${COMMIT_SHA}",
  "service": "owner-interface"
}
EOF

# Create Dockerfile
echo -e "${BLUE}🐳 Creating container image...${NC}"
cat > Dockerfile.owner-interface << 'EOF'
FROM nginx:alpine

# Copy interface files
COPY deploy/owner-interface /usr/share/nginx/html

# Create custom nginx config for MOCOA
RUN cat > /etc/nginx/conf.d/default.conf << 'NGINX_EOF'
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    
    # Security headers for MOCOA
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;" always;
    add_header X-MOCOA-Version "v99" always;
    
    # Theme routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /light {
        try_files /light.html =404;
    }
    
    location /dark {
        try_files /index.html =404;
    }
    
    location /diamond-sao {
        try_files /dsao.html =404;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        try_files /health.json =404;
        add_header Content-Type application/json;
    }
    
    # API proxy (for future backend integration)
    location /api/ {
        proxy_pass https://diamond-sao-v31-yutylytffa-uw.a.run.app/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_EOF

EXPOSE 8080
EOF

# Build Docker image
echo -e "${BLUE}🔨 Building Docker image for amd64/linux...${NC}"
docker build --platform linux/amd64 -f Dockerfile.owner-interface -t "${IMAGE_NAME}:${COMMIT_SHA}" .
docker tag "${IMAGE_NAME}:${COMMIT_SHA}" "${IMAGE_NAME}:latest"

# Configure Docker for GCR
echo -e "${BLUE}🔐 Configuring Docker authentication...${NC}"
gcloud auth configure-docker --quiet

# Push to Container Registry
echo -e "${BLUE}🚢 Pushing to Google Container Registry...${NC}"
docker push "${IMAGE_NAME}:${COMMIT_SHA}"
docker push "${IMAGE_NAME}:latest"

# Deploy to Cloud Run
echo -e "${BLUE}🏛️ Deploying to MOCOA Cloud Run...${NC}"
gcloud run deploy "${SERVICE_NAME}" \
    --image "${IMAGE_NAME}:${COMMIT_SHA}" \
    --region "${REGION}" \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 1 \
    --max-instances 5 \
    --set-env-vars="MOCOA_VERSION=v99,ENVIRONMENT=production,VERSION=${COMMIT_SHA}" \
    --labels="mocoa=v99,interface=owner,security=diamond-sao,deployed-by=manual"

# Get service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --region="${REGION}" --format='value(status.url)')

# Test deployment
echo -e "${BLUE}🧪 Testing deployment...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICE_URL}/health")

if [ "${HTTP_STATUS}" -eq 200 ]; then
    echo -e "${GREEN}✅ Health check passed (${HTTP_STATUS})${NC}"
else
    echo -e "${YELLOW}⚠️ Health check returned ${HTTP_STATUS}${NC}"
fi

# Cleanup
echo -e "${BLUE}🧹 Cleaning up...${NC}"
rm -f Dockerfile.owner-interface
rm -rf deploy/

# Success summary
echo -e "${GREEN}🎉 MOCOA Owner Interface deployed successfully!${NC}"
echo ""
echo -e "${PURPLE}📋 Deployment Summary:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Service URL:${NC} ${SERVICE_URL}"
echo -e "${BLUE}Dark Theme:${NC} ${SERVICE_URL}/"
echo -e "${BLUE}Light Theme:${NC} ${SERVICE_URL}/light"
echo -e "${BLUE}Diamond SAO:${NC} ${SERVICE_URL}/diamond-sao"
echo -e "${BLUE}Health Check:${NC} ${SERVICE_URL}/health"
echo -e "${BLUE}API Proxy:${NC} ${SERVICE_URL}/api/*"
echo ""
echo -e "${PURPLE}🔗 Next Steps:${NC}"
echo -e "${BLUE}1.${NC} Configure Cloudflare DNS to point owner.2100.cool to:"
echo -e "   ${SERVICE_URL}"
echo -e "${BLUE}2.${NC} Set up SallyPort authentication"
echo -e "${BLUE}3.${NC} Test both themes and Diamond SAO interface"
echo ""
echo -e "${GREEN}✅ Ready for Cloudflare integration!${NC}"
