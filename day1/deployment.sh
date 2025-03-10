#!/bin/bash

# Exit on error
set -e

echo "=== Starting deployment to Cloud Run ==="

# Set variables
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
CONFIG_FILE="./deployment/symphony-admin-core-cloudbuild.yaml"
SERVICE_ACCOUNT="drlucyautomation@api-for-warp-drive.iam.gserviceaccount.com"

# Ensure we're using the correct service account
echo "=== Setting active service account ==="
gcloud config set account $SERVICE_ACCOUNT

# Ensure we're using the correct project
echo "=== Setting active project ==="
gcloud config set project $PROJECT_ID

# Submit the build to Cloud Build
echo "=== Submitting build to Cloud Build ==="
echo "Using configuration file: $CONFIG_FILE"
gcloud builds submit --config=$CONFIG_FILE

echo "=== Deployment to Cloud Run completed ==="

