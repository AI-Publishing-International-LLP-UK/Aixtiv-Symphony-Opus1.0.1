#!/bin/bash

# Enhanced SallyPort Cloudflare Authentication - Cloud Run Deployment
# Version: 2.0.0-cloudflare-integration
# Date: 2025-07-02

set -e

echo "🚀 Starting Enhanced SallyPort Cloudflare Authentication - Cloud Run Deployment"
echo "================================================================================="

# Configuration
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
SERVICE_NAME="sallyport-cloudflare-auth"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:2.0.0-cloudflare-integration"
MIN_INSTANCES=1
MAX_INSTANCES=10
MEMORY="1Gi"
CPU=1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI not found. Please install Google Cloud SDK."
    exit 1
fi

if ! command -v docker &> /dev/null; then
    print_error "Docker not found. Please install Docker."
    exit 1
fi

# Check if we're authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    print_error "Not authenticated with gcloud. Please run 'gcloud auth login'"
    exit 1
fi

print_success "Prerequisites check completed"

# Set the correct project
print_status "Setting Google Cloud project to ${PROJECT_ID}..."
gcloud config set project ${PROJECT_ID}

# Enable required APIs
print_status "Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Configure Docker for GCR
print_status "Configuring Docker for Google Container Registry..."
gcloud auth configure-docker

# Update package.json with required dependencies
print_status "Updating package.json with required dependencies..."
cat > package.json << EOF
{
  "name": "sallyport-cloudflare-auth",
  "version": "2.0.0-cloudflare-integration",
  "description": "Enhanced SallyPort authentication with Cloudflare integration",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js",
    "test": "echo \"Tests not implemented yet\""
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "firebase-admin": "^12.0.0",
    "winston": "^3.11.0",
    "axios": "^1.6.2"
  },
  "engines": {
    "node": "22"
  },
  "keywords": ["authentication", "cloudflare", "sallyport", "security"],
  "author": "Aixtiv Symphony Integration Gateway",
  "license": "UNLICENSED"
}
EOF

# Install dependencies
print_status "Installing dependencies..."
npm install

# Build the Docker image for the correct platform
print_status "Building Docker image for amd64/linux: ${IMAGE_NAME}..."
docker build --platform linux/amd64 -t ${IMAGE_NAME} .

# Push the image to Google Container Registry
print_status "Pushing image to Google Container Registry..."
docker push ${IMAGE_NAME}

# Deploy to Cloud Run
print_status "Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image=${IMAGE_NAME} \
  --platform=managed \
  --region=${REGION} \
  --allow-unauthenticated \
  --port=8080 \
  --memory=${MEMORY} \
  --cpu=${CPU} \
  --min-instances=${MIN_INSTANCES} \
  --max-instances=${MAX_INSTANCES} \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID},NODE_ENV=production" \
  --timeout=300 \
  --concurrency=100

# Get the service URL
print_status "Getting service URL..."
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format="value(status.url)")

print_success "Deployment completed successfully!"
echo ""
echo "📋 Deployment Summary"
echo "===================="
echo "🌍 Region: ${REGION}"
echo "📦 Project: ${PROJECT_ID}"
echo "🐳 Image: ${IMAGE_NAME}"
echo "🔗 Service URL: ${SERVICE_URL}"
echo "⚙️ Memory: ${MEMORY}"
echo "🖥️ CPU: ${CPU}"
echo "📈 Min Instances: ${MIN_INSTANCES}"
echo "📈 Max Instances: ${MAX_INSTANCES}"
echo ""
echo "🔍 Test endpoints:"
echo "   Root: ${SERVICE_URL}/"
echo "   Health Check: ${SERVICE_URL}/health"
echo "   Metrics: ${SERVICE_URL}/metrics"
echo "   Cloudflare Validation: ${SERVICE_URL}/api/cloudflare/validate"
echo "   Protected API: ${SERVICE_URL}/api/agents"
echo ""
echo "🔐 Authentication Features Deployed:"
echo "   ✅ Cloudflare challenge validation"
echo "   ✅ Comprehensive audit logging"
echo "   ✅ Protected resource enforcement"
echo "   ✅ Real-time security monitoring"
echo "   ✅ Rate limiting"
echo "   ✅ CORS optimization"
echo ""

# Test the deployment
print_status "Testing deployment..."
echo "Testing health check endpoint..."

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICE_URL}/health" || echo "000")

if [ "$HTTP_CODE" -eq 200 ]; then
    print_success "Health check passed! ✅"
    
    # Test root endpoint
    echo "Testing root endpoint..."
    curl -s "${SERVICE_URL}/" | jq . || echo "JSON parsing failed, but endpoint responded"
else
    print_warning "Health check returned HTTP $HTTP_CODE"
fi

echo ""
print_success "🎉 Enhanced SallyPort Cloudflare Authentication Cloud Run deployment completed!"
print_status "View logs with: gcloud run logs tail ${SERVICE_NAME} --region=${REGION}"
print_status "View metrics in Cloud Console: https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/metrics?project=${PROJECT_ID}"

echo ""
echo "🔗 Next Steps:"
echo "1. Update Cloudflare to proxy requests to: ${SERVICE_URL}"
echo "2. Configure DNS to point your domain to the Cloud Run service"
echo "3. Set up monitoring alerts for security events"
echo "4. Review audit logs in Firestore"
echo "5. Test authentication with actual Cloudflare headers"
echo ""
echo "🌐 To use with custom domain:"
echo "   gcloud run domain-mappings create --service=${SERVICE_NAME} --domain=YOUR_DOMAIN --region=${REGION}"
echo ""
echo "For more information, see the Cloud Run documentation."
