#!/bin/bash

# Exit on error
set -e

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    while IFS= read -r line || [ -n "$line" ]; do
        if [[ $line && ! $line =~ ^[[:space:]]*# ]]; then
            export "$line"
        fi
    done < .env
fi

# Default values
PROJECT_ID=${PROJECT_ID:-"your-project-id"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME=${SERVICE_NAME:-"webhook-api-service"}

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "gcloud could not be found. Please install Google Cloud SDK"
    exit 1
fi

# Authenticate with Google Cloud
if [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
    echo "Please set GOOGLE_APPLICATION_CREDENTIALS environment variable"
    exit 1
fi
gcloud auth activate-service-account --key-file="$GOOGLE_APPLICATION_CREDENTIALS"

# Set project
gcloud config set project $PROJECT_ID

# Build the container
echo "Building container..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars="PROJECT_ID=$PROJECT_ID" \
    --set-env-vars="GOOGLE_CLOUD_PROJECT=$PROJECT_ID" \
    --memory=512Mi \
    --cpu=1 \
    --port=8080

echo "Deployment complete! Service URL:"
gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)'

