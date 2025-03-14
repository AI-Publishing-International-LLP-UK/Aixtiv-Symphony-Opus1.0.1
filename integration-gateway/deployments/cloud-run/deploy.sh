#!/bin/bash
# Cloud Run deployment script
set -eo pipefail

# Default values
ENVIRONMENT="dev"
PROJECT_ID="your-gcp-project-id"
REGION="us-central1"
REPOSITORY="integration-gateway-images"
SERVICE_ACCOUNT="integration-gateway-sa@${PROJECT_ID}.iam.gserviceaccount.com"
SERVICE_NAME="integration-gateway"

# Print usage information
function show_help {
  echo "Usage: $0 [options]"
  echo "Options:"
  echo "  --env=ENVIRONMENT    Deployment environment (dev, staging, prod)"
  echo "  --project=PROJECT_ID GCP project ID"
  echo "  --region=REGION      GCP region"
  echo "  --help               Show this help message"
  exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env=*)
      ENVIRONMENT="${1#*=}"
      shift
      ;;
    --project=*)
      PROJECT_ID="${1#*=}"
      shift
      ;;
    --region=*)
      REGION="${1#*=}"
      shift
      ;;
    --help)
      show_help
      ;;
    *)
      echo "Unknown option: $1"
      show_help
      ;;
  esac
done

# Load environment-specific variables if available
ENV_FILE="./deployments/cloud-run/environments/${ENVIRONMENT}.env"
if [[ -f "$ENV_FILE" ]]; then
  echo "Loading environment variables from $ENV_FILE"
  source "$ENV_FILE"
else
  echo "Environment file not found: $ENV_FILE"
  echo "Continuing with default values..."
fi

# Generate a unique tag based on timestamp and git commit
TAG=$(date +%Y%m%d-%H%M%S)
if command -v git &> /dev/null && git rev-parse --is-inside-work-tree &> /dev/null; then
  TAG="${TAG}-$(git rev-parse --short HEAD)"
fi

IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE_NAME}:${TAG}"

echo "===== Cloud Run Deployment ====="
echo "Environment: ${ENVIRONMENT}"
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"
echo "Image: ${IMAGE_URL}"
echo "==============================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
  echo "Error: gcloud CLI not found"
  echo "Please install the Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
  echo "Error: docker not found"
  echo "Please install Docker: https://docs.docker.com/get-docker/"
  exit 1
fi

# Ensure authenticated with GCP
echo "Verifying gcloud authentication..."
gcloud auth print-access-token &> /dev/null || {
  echo "Not authenticated with GCP. Please run: gcloud auth login"
  exit 1
}

# Ensure correct project is set
echo "Setting GCP project to ${PROJECT_ID}..."
gcloud config set project "${PROJECT_ID}"

# Build image
echo "Building Docker image..."
docker build --platform=linux/amd64 -t "${IMAGE_URL}" .

# Configure Docker for Artifact Registry
echo "Configuring Docker for Artifact Registry..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

# Push to Artifact Registry
echo "Pushing image to Artifact Registry..."
docker push "${IMAGE_URL}"

# Substitute variables in service.yaml
echo "Preparing service configuration..."
export IMAGE_URL ENVIRONMENT SERVICE_ACCOUNT
TEMP_SERVICE_FILE=$(mktemp)
envsubst < ./deployments/cloud-run/service.yaml > "${TEMP_SERVICE_FILE}"

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run services replace "${TEMP_SERVICE_FILE}" \
  --region="${REGION}" \
  --platform=managed \
  --project="${PROJECT_ID}"

# Add revision tag for easier rollback
echo "Tagging deployment revision..."
REVISION_TAG="${ENVIRONMENT}-$(date +%Y%m%d)"
gcloud run services update-traffic ${SERVICE_NAME} \
  --platform=managed \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --update-tags="${REVISION_TAG}"

# Clean up temporary file
rm "${TEMP_SERVICE_FILE}"

echo "Deployment completed successfully!"
echo "Service URL: $(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format='value(status.url)')"

