#!/bin/bash

# GitHub SAML Authentication Setup for GCP
# ----------------------------------------
# This script configures workload identity federation between GitHub and GCP
# enabling SAML-based authentication for GitHub Actions workflows.

set -e

# Configuration variables
PROJECT_ID="api-for-warp-drive"
POOL_ID="github-federation-pool"
PROVIDER_ID="github-saml-provider"
LOCATION="global"
SERVICE_ACCOUNT="github-actions-deploy"
ADMIN_EMAIL="pr@coaching2100.com"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper functions
function log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

function log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

function log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

function check_command() {
  if ! command -v $1 &> /dev/null; then
    log_error "$1 is required but not installed."
    exit 1
  fi
}

# Check for required tools
check_command "gcloud"
check_command "jq"

log_info "GitHub SAML Federation Setup for GCP"
log_info "-----------------------------------"

# Step 1: Set GCP project
log_info "Setting GCP project to ${PROJECT_ID}..."
gcloud config set project ${PROJECT_ID}

# Step 2: Verify authentication
log_info "Verifying GCP authentication..."
gcloud auth list --filter=account:${ADMIN_EMAIL} --format="value(account)" | grep -q ${ADMIN_EMAIL} || {
  log_error "Not authenticated as ${ADMIN_EMAIL}. Please run 'gcloud auth login' first."
  exit 1
}

# Step 3: Create workload identity pool if it doesn't exist
log_info "Creating workload identity pool (${POOL_ID})..."
if ! gcloud iam workload-identity-pools describe ${POOL_ID} \
     --project=${PROJECT_ID} \
     --location=${LOCATION} &>/dev/null; then
  gcloud iam workload-identity-pools create ${POOL_ID} \
    --project=${PROJECT_ID} \
    --location=${LOCATION} \
    --display-name="GitHub Actions Federation Pool"
  log_info "Workload identity pool created successfully."
else
  log_warn "Workload identity pool ${POOL_ID} already exists."
fi

# Step 4: Create SAML provider
log_info "Creating SAML provider (${PROVIDER_ID})..."
if ! gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
     --project=${PROJECT_ID} \
     --location=${LOCATION} \
     --workload-identity-pool=${POOL_ID} &>/dev/null; then
  gcloud iam workload-identity-pools providers create-saml ${PROVIDER_ID} \
    --project=${PROJECT_ID} \
    --location=${LOCATION} \
    --workload-identity-pool=${POOL_ID} \
    --attribute-mapping="google.subject=assertion.sub,google.groups=assertion.groups,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
    --display-name="GitHub SAML Provider" \
    --issuer-uri="https://token.actions.githubusercontent.com"
  log_info "SAML provider created successfully."
else
  log_warn "SAML provider ${PROVIDER_ID} already exists."
fi

# Step 5: Create service account if it doesn't exist
log_info "Setting up service account (${SERVICE_ACCOUNT})..."
if ! gcloud iam service-accounts describe ${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com &>/dev/null; then
  gcloud iam service-accounts create ${SERVICE_ACCOUNT} \
    --display-name="GitHub Actions Service Account"
  log_info "Service account created successfully."
else
  log_warn "Service account ${SERVICE_ACCOUNT} already exists."
fi

# Step 6: Grant IAM permissions
log_info "Granting IAM permissions to service account..."
# Get current workload identity pool ID
WORKLOAD_POOL_ID=$(gcloud iam workload-identity-pools describe ${POOL_ID} \
  --project=${PROJECT_ID} \
  --location=${LOCATION} \
  --format="value(name)")

# Grant permission to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding ${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WORKLOAD_POOL_ID}/attribute.repository/C2100-PR/AIXTIV-SYMPHONY"

# Grant roles to the service account (adjust as needed)
log_info "Granting necessary roles to service account..."
ROLES=(
  "roles/compute.admin"
  "roles/cloudbuild.builds.editor"
  "roles/storage.admin"
  "roles/secretmanager.secretAccessor"
  "roles/run.admin"
  "roles/firebase.admin"
)

for ROLE in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="${ROLE}"
  log_info "Granted ${ROLE} to service account."
done

# Step 7: Generate OIDC token for testing
log_info "Generating configuration for GitHub Actions..."
WORKLOAD_PROVIDER=$(gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
  --project=${PROJECT_ID} \
  --location=${LOCATION} \
  --workload-identity-pool=${POOL_ID} \
  --format="value(name)")

cat << EOF > github-oidc-config.json
{
  "name": "google",
  "config": {
    "workload_identity_provider": "${WORKLOAD_PROVIDER}",
    "service_account": "${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com",
    "audience": "https://iam.googleapis.com/${WORKLOAD_POOL_ID}",
    "token_format": "access_token"
  }
}
EOF

log_info "GitHub OIDC configuration saved to github-oidc-config.json"

# Step 8: Verify setup
log_info "Verifying configuration..."
log_info "Workload Identity Pool:"
gcloud iam workload-identity-pools describe ${POOL_ID} \
  --project=${PROJECT_ID} \
  --location=${LOCATION}

log_info "SAML Provider:"
gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
  --project=${PROJECT_ID} \
  --location=${LOCATION} \
  --workload-identity-pool=${POOL_ID}

log_info "Service Account:"
gcloud iam service-accounts describe ${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com

# Step 9: Generate GitHub workflow template
log_info "Generating GitHub workflow template..."
mkdir -p ../github-templates

cat << EOF > ../github-templates/gcp-auth-workflow-example.yml
name: Example GCP Authentication Workflow

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: 'read'
      id-token: 'write'

    steps:
    - uses: 'actions/checkout@v3'

    - id: 'auth'
      name: 'Authenticate to Google Cloud'
      uses: 'google-github-actions/auth@v1'
      with:
        workload_identity_provider: '${{ secrets.WORKLOAD_IDENTITY_PROVIDER }}'
        service_account: '${{ secrets.SERVICE_ACCOUNT }}'

    - name: 'Set up Cloud SDK'
      uses: 'google-github-actions/setup-gcloud@v1'

    - name: 'Test authentication'
      run: 'gcloud info'
EOF

log_info "GitHub workflow template saved to ../github-templates/gcp-auth-workflow-example.yml"

# Step 10: Instructions for GitHub repository setup
log_info "GitHub SAML Federation Setup Complete!"
log_info "-----------------------------------"
log_info "Next steps:"
log_info "1. Add the following secrets to your GitHub repository:"
log_info "   - WORKLOAD_IDENTITY_PROVIDER: ${WORKLOAD_PROVIDER}"
log_info "   - SERVICE_ACCOUNT: ${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com"
log_info "2. Update your GitHub Actions workflows to use OIDC authentication"
log_info "   (See ../github-templates/gcp-auth-workflow-example.yml for an example)"
log_info "3. Test the integration by triggering a workflow"

log_info "Done! GitHub SAML authentication with GCP has been configured successfully."

