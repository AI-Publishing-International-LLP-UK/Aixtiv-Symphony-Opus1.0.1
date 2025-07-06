#!/bin/zsh

# Multi-Provider SAML Configuration Setup
# ------------------------------------

set -e

# Configuration variables
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
ZONE="us-west1-b"
ADMIN_EMAIL="pr@coaching2100.com"

# Provider configurations - use array for zsh compatibility
typeset -A PROVIDERS
PROVIDERS[
  slack]="https://slack.com/saml/metadata"
PROVIDERS[
  openai]="https://auth0.openai.com/samlp/metadata"
PROVIDERS[
  anthropic]="https://console.anthropic.com"
PROVIDERS[
  github]="https://github.com/orgs/asoos/saml/metadata"
PROVIDERS[
  gitlab]="https://gitlab.com"
PROVIDERS[
  atlassian]="https://api.atlassian.com/saml/metadata/AIXTIV"

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

log_info "Multi-Provider SAML Configuration Setup"
log_info "------------------------------------"

# Step 1: Set GCP project and region
log_info "Setting GCP project to ${PROJECT_ID} in ${REGION}..."
gcloud config set project ${PROJECT_ID}
gcloud config set compute/region ${REGION}
gcloud config set compute/zone ${ZONE}

# Step 2: Verify authentication
log_info "Verifying GCP authentication..."
gcloud auth list --filter=account:${ADMIN_EMAIL} --format="value(account)" | grep -q ${ADMIN_EMAIL} || {
  log_error "Not authenticated as ${ADMIN_EMAIL}. Please run 'gcloud auth login' first."
  exit 1
}

# Step 3: Configure each provider
for provider in ${(k)PROVIDERS}; do
  log_info "Configuring SAML for ${provider}..."
  
  # Create provider-specific directories
  mkdir -p "config/${provider}"
  mkdir -p "certificates/${provider}"
  
  # Create workload identity pool for provider if it doesn't exist
  POOL_ID="${provider}-federation-pool"
  if ! gcloud iam workload-identity-pools describe ${POOL_ID} \
       --project=${PROJECT_ID} \
       --location=global &>/dev/null; then
    gcloud iam workload-identity-pools create ${POOL_ID} \
      --project=${PROJECT_ID} \
      --location=global \
      --display-name="${(C)provider} Federation Pool"
  fi

  # Create SAML provider
  PROVIDER_ID="${provider}-saml-provider"
  if ! gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
       --project=${PROJECT_ID} \
       --location=global \
       --workload-identity-pool=${POOL_ID} &>/dev/null; then
    gcloud iam workload-identity-pools providers create-saml ${PROVIDER_ID} \
      --project=${PROJECT_ID} \
      --location=global \
      --workload-identity-pool=${POOL_ID} \
      --attribute-mapping="google.subject=assertion.sub,attribute.email=assertion.email,attribute.groups=assertion.groups" \
      --display-name="${(C)provider} SAML Provider" \
      --issuer-uri="${PROVIDERS[$provider]}"
  fi

  # Generate provider metadata
  cat << EOF > "config/${provider}/metadata.json"
{
  "entityID": "${PROVIDERS[$provider]}",
  "assertionConsumerService": "${PROVIDERS[$provider]}/callback",
  "singleSignOnService": "https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky",
  "nameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
  "workloadIdentityPool": "${POOL_ID}",
  "workloadIdentityProvider": "${PROVIDER_ID}"
}
EOF

  log_info "${(C)provider} SAML configuration complete."
done

# Step 4: Generate integration documentation
log_info "Generating integration documentation..."
mkdir -p docs

# Generate documentation
cat << EOF > docs/saml-integration-guide.md
# SAML Integration Guide

## Provider Configurations
$(for provider in ${(k)PROVIDERS}; do
cat << INNEREOF
### ${(C)provider}

- Entity ID: ${PROVIDERS[$provider]}
- SSO URL: https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky
- Certificate: See \`certificates/${provider}/${provider}.crt\`
- Workload Identity Pool: ${provider}-federation-pool
- Workload Identity Provider: ${provider}-saml-provider

INNEREOF
done)

## Implementation Steps

1. Configure your application to use the provided SAML metadata
2. Set up user attribute mapping
3. Test the integration
4. Monitor the authentication flow

For detailed provider-specific instructions, see \`docs/providers/${provider}-setup.md\`
EOF

# Create monitoring dashboard
log_info "Creating monitoring dashboard..."
cp oauth2-cli/saml-visualization/index.html docs/saml-dashboard.html 2>/dev/null || true

log_info "SAML Integration Setup Complete!"
log_info "Next steps:"
log_info "1. Review the generated configuration in config/"
log_info "2. Follow the integration guide in docs/saml-integration-guide.md"
log_info "3. Test each provider's integration"
log_info "4. Monitor the authentication flows in the dashboard"

#!/bin/bash

# Multi-Provider SAML Configuration Setup
# ------------------------------------

set -e

# Configuration variables
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
ZONE="us-west1-b"
ADMIN_EMAIL="pr@coaching2100.com"

# Provider configurations
declare -a PROVIDERS=(
  "slack https://slack.com/saml/metadata"
  "openai https://auth0.openai.com/samlp/metadata"
  "anthropic https://console.anthropic.com"
  "github https://github.com/orgs/asoos/saml/metadata"
  "gitlab https://gitlab.com"
  "atlassian https://api.atlassian.com/saml/metadata/AIXTIV"
)

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

log_info "Multi-Provider SAML Configuration Setup"
log_info "------------------------------------"

# Step 1: Set GCP project and region
log_info "Setting GCP project to ${PROJECT_ID} in ${REGION}..."
gcloud config set project ${PROJECT_ID}
gcloud config set compute/region ${REGION}
gcloud config set compute/zone ${ZONE}

# Step 2: Verify authentication
log_info "Verifying GCP authentication..."
gcloud auth list --filter=account:${ADMIN_EMAIL} --format="value(account)" | grep -q ${ADMIN_EMAIL} || {
  log_error "Not authenticated as ${ADMIN_EMAIL}. Please run 'gcloud auth login' first."
  exit 1
}

# Step 3: Configure each provider
for provider_info in "${PROVIDERS[@]}"; do
  provider=$(echo $provider_info | cut -d' ' -f1)
  provider_url=$(echo $provider_info | cut -d' ' -f2)
  
  log_info "Configuring SAML for ${provider}..."
  
  # Create provider-specific directories
  mkdir -p "config/${provider}"
  mkdir -p "certificates/${provider}"
  
  # Create workload identity pool for provider if it doesn't exist
  POOL_ID="${provider}-federation-pool"
  if ! gcloud iam workload-identity-pools describe ${POOL_ID} \
       --project=${PROJECT_ID} \
       --location=global &>/dev/null; then
    gcloud iam workload-identity-pools create ${POOL_ID} \
      --project=${PROJECT_ID} \
      --location=global \
      --display-name="${provider^} Federation Pool"
  fi

  # Create SAML provider
  PROVIDER_ID="${provider}-saml-provider"
  if ! gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
       --project=${PROJECT_ID} \
       --location=global \
       --workload-identity-pool=${POOL_ID} &>/dev/null; then
    gcloud iam workload-identity-pools providers create-saml ${PROVIDER_ID} \
      --project=${PROJECT_ID} \
      --location=global \
      --workload-identity-pool=${POOL_ID} \
      --attribute-mapping="google.subject=assertion.sub,attribute.email=assertion.email,attribute.groups=assertion.groups" \
      --display-name="${provider^} SAML Provider" \
      --issuer-uri="${provider_url}"
  fi

  # Generate provider metadata
  cat << EOF > "config/${provider}/metadata.json"
{
  "entityID": "${provider_url}",
  "assertionConsumerService": "${provider_url}/callback",
  "singleSignOnService": "https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky",
  "nameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
  "workloadIdentityPool": "${POOL_ID}",
  "workloadIdentityProvider": "${PROVIDER_ID}"
}
EOF

  log_info "${provider^} SAML configuration complete."
done

# Step 4: Generate integration documentation
log_info "Generating integration documentation..."
mkdir -p docs

# Generate documentation
cat << EOF > docs/saml-integration-guide.md
# SAML Integration Guide

## Provider Configurations

$(for provider_info in "${PROVIDERS[@]}"; do
  provider=$(echo $provider_info | cut -d' ' -f1)
  provider_url=$(echo $provider_info | cut -d' ' -f2)
  echo "### ${provider^}

- Entity ID: ${provider_url}
- SSO URL: https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky
- Certificate: See \`certificates/${provider}/${provider}.crt\`
- Workload Identity Pool: ${provider}-federation-pool
- Workload Identity Provider: ${provider}-saml-provider
"
done)

## Implementation Steps

1. Configure your application to use the provided SAML metadata
2. Set up user attribute mapping
3. Test the integration
4. Monitor the authentication flow

For detailed provider-specific instructions, see \`docs/providers/${provider}-setup.md\`
EOF

# Create monitoring dashboard
log_info "Creating monitoring dashboard..."
cp oauth2-cli/saml-visualization/index.html docs/saml-dashboard.html 2>/dev/null || true

log_info "SAML Integration Setup Complete!"
log_info "Next steps:"
log_info "1. Review the generated configuration in config/"
log_info "2. Follow the integration guide in docs/saml-integration-guide.md"
log_info "3. Test each provider's integration"
log_info "4. Monitor the authentication flows in the dashboard"

#!/bin/bash

# Multi-Provider SAML Configuration Setup
# ------------------------------------

set -e

# Configuration variables
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
ZONE="us-west1-b"
ADMIN_EMAIL="pr@coaching2100.com"

# Provider configurations
declare -a PROVIDERS=(
  "slack https://slack.com/saml/metadata"
  "openai https://auth0.openai.com/samlp/metadata"
  "anthropic https://console.anthropic.com"
  "github https://github.com/orgs/asoos/saml/metadata"
  "gitlab https://gitlab.com"
  "atlassian https://api.atlassian.com/saml/metadata/AIXTIV"
)

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

log_info "Multi-Provider SAML Configuration Setup"
log_info "------------------------------------"

# Step 1: Set GCP project and region
log_info "Setting GCP project to ${PROJECT_ID} in ${REGION}..."
gcloud config set project ${PROJECT_ID}
gcloud config set compute/region ${REGION}
gcloud config set compute/zone ${ZONE}

# Step 2: Verify authentication
log_info "Verifying GCP authentication..."
gcloud auth list --filter=account:${ADMIN_EMAIL} --format="value(account)" | grep -q ${ADMIN_EMAIL} || {
  log_error "Not authenticated as ${ADMIN_EMAIL}. Please run 'gcloud auth login' first."
  exit 1
}

# Step 3: Configure each provider
for provider_info in "${PROVIDERS[@]}"; do
  provider=$(echo $provider_info | cut -d' ' -f1)
  provider_url=$(echo $provider_info | cut -d' ' -f2)
  
  log_info "Configuring SAML for ${provider}..."
  
  # Create provider-specific directories
  mkdir -p "config/${provider}"
  mkdir -p "certificates/${provider}"
  
  # Create workload identity pool for provider if it doesn't exist
  POOL_ID="${provider}-federation-pool"
  if ! gcloud iam workload-identity-pools describe ${POOL_ID} \
       --project=${PROJECT_ID} \
       --location=global &>/dev/null; then
    gcloud iam workload-identity-pools create ${POOL_ID} \
      --project=${PROJECT_ID} \
      --location=global \
      --display-name="${provider^} Federation Pool"
  fi

  # Create SAML provider
  PROVIDER_ID="${provider}-saml-provider"
  if ! gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
       --project=${PROJECT_ID} \
       --location=global \
       --workload-identity-pool=${POOL_ID} &>/dev/null; then
    gcloud iam workload-identity-pools providers create-saml ${PROVIDER_ID} \
      --project=${PROJECT_ID} \
      --location=global \
      --workload-identity-pool=${POOL_ID} \
      --attribute-mapping="google.subject=assertion.sub,attribute.email=assertion.email,attribute.groups=assertion.groups" \
      --display-name="${provider^} SAML Provider" \
      --issuer-uri="${provider_url}"
  fi

  # Generate provider metadata
  cat << EOF > "config/${provider}/metadata.json"
{
  "entityID": "${provider_url}",
  "assertionConsumerService": "${provider_url}/callback",
  "singleSignOnService": "https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky",
  "nameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
  "workloadIdentityPool": "${POOL_ID}",
  "workloadIdentityProvider": "${PROVIDER_ID}"
}
EOF

  log_info "${provider^} SAML configuration complete."
done

# Step 4: Generate integration documentation
log_info "Generating integration documentation..."
mkdir -p docs

# Generate documentation
cat << EOF > docs/saml-integration-guide.md
# SAML Integration Guide

## Provider Configurations

$(for provider_info in "${PROVIDERS[@]}"; do
  provider=$(echo $provider_info | cut -d' ' -f1)
  provider_url=$(echo $provider_info | cut -d' ' -f2)
  echo "### ${provider^}

- Entity ID: ${provider_url}
- SSO URL: https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky
- Certificate: See \`certificates/${provider}/${provider}.crt\`
- Workload Identity Pool: ${provider}-federation-pool
- Workload Identity Provider: ${provider}-saml-provider
"
done)

## Implementation Steps

1. Configure your application to use the provided SAML metadata
2. Set up user attribute mapping
3. Test the integration
4. Monitor the authentication flow

For detailed provider-specific instructions, see \`docs/providers/${provider}-setup.md\`
EOF

# Create monitoring dashboard
log_info "Creating monitoring dashboard..."
cp oauth2-cli/saml-visualization/index.html docs/saml-dashboard.html 2>/dev/null || true

log_info "SAML Integration Setup Complete!"
log_info "Next steps:"
log_info "1. Review the generated configuration in config/"
log_info "2. Follow the integration guide in docs/saml-integration-guide.md"
log_info "3. Test each provider's integration"
log_info "4. Monitor the authentication flows in the dashboard"

#!/bin/bash

# Multi-Provider SAML Configuration Setup
# ------------------------------------

set -e

# Configuration variables
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
ZONE="us-west1-b"
ADMIN_EMAIL="pr@coaching2100.com"

# Provider configurations
declare -a PROVIDERS=(
  "slack https://slack.com/saml/metadata"
  "openai https://auth0.openai.com/samlp/metadata"
  "anthropic https://console.anthropic.com"
  "github https://github.com/orgs/asoos/saml/metadata"
  "gitlab https://gitlab.com"
  "atlassian https://api.atlassian.com/saml/metadata/AIXTIV"
)

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

log_info "Multi-Provider SAML Configuration Setup"
log_info "------------------------------------"

# Step 1: Set GCP project and region
log_info "Setting GCP project to ${PROJECT_ID} in ${REGION}..."
gcloud config set project ${PROJECT_ID}
gcloud config set compute/region ${REGION}
gcloud config set compute/zone ${ZONE}

# Step 2: Verify authentication
log_info "Verifying GCP authentication..."
gcloud auth list --filter=account:${ADMIN_EMAIL} --format="value(account)" | grep -q ${ADMIN_EMAIL} || {
  log_error "Not authenticated as ${ADMIN_EMAIL}. Please run 'gcloud auth login' first."
  exit 1
}

# Step 3: Configure each provider
for provider_info in "${PROVIDERS[@]}"; do
  provider=$(echo $provider_info | cut -d' ' -f1)
  provider_url=$(echo $provider_info | cut -d' ' -f2)
  
  log_info "Configuring SAML for ${provider}..."
  
  # Create provider-specific directories
  mkdir -p "config/${provider}"
  mkdir -p "certificates/${provider}"
  
  # Create workload identity pool for provider if it doesn't exist
  POOL_ID="${provider}-federation-pool"
  if ! gcloud iam workload-identity-pools describe ${POOL_ID} \
       --project=${PROJECT_ID} \
       --location=global &>/dev/null; then
    gcloud iam workload-identity-pools create ${POOL_ID} \
      --project=${PROJECT_ID} \
      --location=global \
      --display-name="${provider^} Federation Pool"
  fi

  # Create SAML provider
  PROVIDER_ID="${provider}-saml-provider"
  if ! gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
       --project=${PROJECT_ID} \
       --location=global \
       --workload-identity-pool=${POOL_ID} &>/dev/null; then
    gcloud iam workload-identity-pools providers create-saml ${PROVIDER_ID} \
      --project=${PROJECT_ID} \
      --location=global \
      --workload-identity-pool=${POOL_ID} \
      --attribute-mapping="google.subject=assertion.sub,attribute.email=assertion.email,attribute.groups=assertion.groups" \
      --display-name="${provider^} SAML Provider" \
      --issuer-uri="${provider_url}"
  fi

  # Generate provider metadata
  cat << EOF > "config/${provider}/metadata.json"
{
  "entityID": "${provider_url}",
  "assertionConsumerService": "${provider_url}/callback",
  "singleSignOnService": "https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky",
  "nameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
  "workloadIdentityPool": "${POOL_ID}",
  "workloadIdentityProvider": "${PROVIDER_ID}"
}
EOF

  log_info "${provider^} SAML configuration complete."
done

# Step 4: Generate integration documentation
log_info "Generating integration documentation..."
mkdir -p docs

# Generate documentation
cat << EOF > docs/saml-integration-guide.md
# SAML Integration Guide

## Provider Configurations

$(for provider_info in "${PROVIDERS[@]}"; do
  provider=$(echo $provider_info | cut -d' ' -f1)
  provider_url=$(echo $provider_info | cut -d' ' -f2)
  echo "### ${provider^}

- Entity ID: ${provider_url}
- SSO URL: https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky
- Certificate: See \`certificates/${provider}/${provider}.crt\`
- Workload Identity Pool: ${provider}-federation-pool
- Workload Identity Provider: ${provider}-saml-provider
"
done)

## Implementation Steps

1. Configure your application to use the provided SAML metadata
2. Set up user attribute mapping
3. Test the integration
4. Monitor the authentication flow

For detailed provider-specific instructions, see \`docs/providers/${provider}-setup.md\`
EOF

# Create monitoring dashboard
log_info "Creating monitoring dashboard..."
cp oauth2-cli/saml-visualization/index.html docs/saml-dashboard.html 2>/dev/null || true

log_info "SAML Integration Setup Complete!"
log_info "Next steps:"
log_info "1. Review the generated configuration in config/"
log_info "2. Follow the integration guide in docs/saml-integration-guide.md"
log_info "3. Test each provider's integration"
log_info "4. Monitor the authentication flows in the dashboard"

#!/bin/bash

# Multi-Provider SAML Configuration Setup
# ------------------------------------

set -e

# Configuration variables
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
ZONE="us-west1-b"
ADMIN_EMAIL="pr@coaching2100.com"

# Provider configurations
declare -a PROVIDERS=(
  "slack https://slack.com/saml/metadata"
  "openai https://auth0.openai.com/samlp/metadata"
  "anthropic https://console.anthropic.com"
  "github https://github.com/orgs/asoos/saml/metadata"
  "gitlab https://gitlab.com"
  "atlassian https://api.atlassian.com/saml/metadata/AIXTIV"
)

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

log_info "Multi-Provider SAML Configuration Setup"
log_info "------------------------------------"

# Step 1: Set GCP project and region
log_info "Setting GCP project to ${PROJECT_ID} in ${REGION}..."
gcloud config set project ${PROJECT_ID}
gcloud config set compute/region ${REGION}
gcloud config set compute/zone ${ZONE}

# Step 2: Verify authentication
log_info "Verifying GCP authentication..."
gcloud auth list --filter=account:${ADMIN_EMAIL} --format="value(account)" | grep -q ${ADMIN_EMAIL} || {
  log_error "Not authenticated as ${ADMIN_EMAIL}. Please run 'gcloud auth login' first."
  exit 1
}

# Step 3: Configure each provider
for provider_info in "${PROVIDERS[@]}"; do
  provider=$(echo $provider_info | cut -d' ' -f1)
  provider_url=$(echo $provider_info | cut -d' ' -f2)
  
  log_info "Configuring SAML for ${provider}..."
  
  # Create provider-specific directories
  mkdir -p "config/${provider}"
  mkdir -p "certificates/${provider}"
  
  # Create workload identity pool for provider if it doesn't exist
  POOL_ID="${provider}-federation-pool"
  if ! gcloud iam workload-identity-pools describe ${POOL_ID} \
       --project=${PROJECT_ID} \
       --location=global &>/dev/null; then
    gcloud iam workload-identity-pools create ${POOL_ID} \
      --project=${PROJECT_ID} \
      --location=global \
      --display-name="${provider^} Federation Pool"
  fi

  # Create SAML provider
  PROVIDER_ID="${provider}-saml-provider"
  if ! gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
       --project=${PROJECT_ID} \
       --location=global \
       --workload-identity-pool=${POOL_ID} &>/dev/null; then
    gcloud iam workload-identity-pools providers create-saml ${PROVIDER_ID} \
      --project=${PROJECT_ID} \
      --location=global \
      --workload-identity-pool=${POOL_ID} \
      --attribute-mapping="google.subject=assertion.sub,attribute.email=assertion.email,attribute.groups=assertion.groups" \
      --display-name="${provider^} SAML Provider" \
      --issuer-uri="${provider_url}"
  fi

  # Generate provider metadata
  cat << EOF > "config/${provider}/metadata.json"
{
  "entityID": "${provider_url}",
  "assertionConsumerService": "${provider_url}/callback",
  "singleSignOnService": "https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky",
  "nameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
  "workloadIdentityPool": "${POOL_ID}",
  "workloadIdentityProvider": "${PROVIDER_ID}"
}
EOF

  log_info "${provider^} SAML configuration complete."
done

# Step 4: Generate integration documentation
log_info "Generating integration documentation..."
mkdir -p docs

# Generate documentation
cat << EOF > docs/saml-integration-guide.md
# SAML Integration Guide

## Provider Configurations

$(for provider_info in "${PROVIDERS[@]}"; do
  provider=$(echo $provider_info | cut -d' ' -f1)
  provider_url=$(echo $provider_info | cut -d' ' -f2)
  echo "### ${provider^}

- Entity ID: ${provider_url}
- SSO URL: https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky
- Certificate: See \`certificates/${provider}/${provider}.crt\`
- Workload Identity Pool: ${provider}-federation-pool
- Workload Identity Provider: ${provider}-saml-provider
"
done)

## Implementation Steps

1. Configure your application to use the provided SAML metadata
2. Set up user attribute mapping
3. Test the integration
4. Monitor the authentication flow

For detailed provider-specific instructions, see \`docs/providers/${provider}-setup.md\`
EOF

# Create monitoring dashboard
log_info "Creating monitoring dashboard..."
cp oauth2-cli/saml-visualization/index.html docs/saml-dashboard.html 2>/dev/null || true

log_info "SAML Integration Setup Complete!"
log_info "Next steps:"
log_info "1. Review the generated configuration in config/"
log_info "2. Follow the integration guide in docs/saml-integration-guide.md"
log_info "3. Test each provider's integration"
log_info "4. Monitor the authentication flows in the dashboard"

#!/bin/bash

# Multi-Provider SAML Configuration Setup
# ------------------------------------

set -e

# Configuration variables
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
ZONE="us-west1-b"
ADMIN_EMAIL="pr@coaching2100.com"

# Provider configurations
declare -a PROVIDERS=(
  "slack https://slack.com/saml/metadata"
  "openai https://auth0.openai.com/samlp/metadata"
  "anthropic https://console.anthropic.com"
  "github https://github.com/orgs/asoos/saml/metadata"
  "gitlab https://gitlab.com"
  "atlassian https://api.atlassian.com/saml/metadata/AIXTIV"
)

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

log_info "Multi-Provider SAML Configuration Setup"
log_info "------------------------------------"

# Step 1: Set GCP project and region
log_info "Setting GCP project to ${PROJECT_ID} in ${REGION}..."
gcloud config set project ${PROJECT_ID}
gcloud config set compute/region ${REGION}
gcloud config set compute/zone ${ZONE}

# Step 2: Verify authentication
log_info "Verifying GCP authentication..."
gcloud auth list --filter=account:${ADMIN_EMAIL} --format="value(account)" | grep -q ${ADMIN_EMAIL} || {
  log_error "Not authenticated as ${ADMIN_EMAIL}. Please run 'gcloud auth login' first."
  exit 1
}

# Step 3: Configure each provider
for provider_info in "${PROVIDERS[@]}"; do
  provider=$(echo $provider_info | cut -d' ' -f1)
  provider_url=$(echo $provider_info | cut -d' ' -f2)
  
  log_info "Configuring SAML for ${provider}..."
  
  # Create provider-specific directories
  mkdir -p "config/${provider}"
  mkdir -p "certificates/${provider}"
  
  # Create workload identity pool for provider if it doesn't exist
  POOL_ID="${provider}-federation-pool"
  if ! gcloud iam workload-identity-pools describe ${POOL_ID} \
       --project=${PROJECT_ID} \
       --location=global &>/dev/null; then
    gcloud iam workload-identity-pools create ${POOL_ID} \
      --project=${PROJECT_ID} \
      --location=global \
      --display-name="${provider^} Federation Pool"
  fi

  # Create SAML provider
  PROVIDER_ID="${provider}-saml-provider"
  if ! gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
       --project=${PROJECT_ID} \
       --location=global \
       --workload-identity-pool=${POOL_ID} &>/dev/null; then
    gcloud iam workload-identity-pools providers create-saml ${PROVIDER_ID} \
      --project=${PROJECT_ID} \
      --location=global \
      --workload-identity-pool=${POOL_ID} \
      --attribute-mapping="google.subject=assertion.sub,attribute.email=assertion.email,attribute.groups=assertion.groups" \
      --display-name="${provider^} SAML Provider" \
      --issuer-uri="${provider_url}"
  fi

  # Generate provider metadata
  cat << EOF > "config/${provider}/metadata.json"
{
  "entityID": "${provider_url}",
  "assertionConsumerService": "${provider_url}/callback",
  "singleSignOnService": "https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky",
  "nameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
  "workloadIdentityPool": "${POOL_ID}",
  "workloadIdentityProvider": "${PROVIDER_ID}"
}
EOF

  log_info "${provider^} SAML configuration complete."
done

# Step 4: Generate integration documentation
log_info "Generating integration documentation..."
mkdir -p docs

# Generate documentation
cat << EOF > docs/saml-integration-guide.md
# SAML Integration Guide

## Provider Configurations

$(for provider_info in "${PROVIDERS[@]}"; do
  provider=$(echo $provider_info | cut -d' ' -f1)
  provider_url=$(echo $provider_info | cut -d' ' -f2)
  echo "### ${provider^}

- Entity ID: ${provider_url}
- SSO URL: https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky
- Certificate: See \`certificates/${provider}/${provider}.crt\`
- Workload Identity Pool: ${provider}-federation-pool
- Workload Identity Provider: ${provider}-saml-provider
"
done)

## Implementation Steps

1. Configure your application to use the provided SAML metadata
2. Set up user attribute mapping
3. Test the integration
4. Monitor the authentication flow

For detailed provider-specific instructions, see \`docs/providers/${provider}-setup.md\`
EOF

# Create monitoring dashboard
log_info "Creating monitoring dashboard..."
cp oauth2-cli/saml-visualization/index.html docs/saml-dashboard.html 2>/dev/null || true

log_info "SAML Integration Setup Complete!"
log_info "Next steps:"
log_info "1. Review the generated configuration in config/"
log_info "2. Follow the integration guide in docs/saml-integration-guide.md"
log_info "3. Test each provider's integration"
log_info "4. Monitor the authentication flows in the dashboard"

#!/bin/bash

# Multi-Provider SAML Configuration Setup
# ------------------------------------

set -e

# Configuration variables
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
ZONE="us-west1-b"
ADMIN_EMAIL="pr@coaching2100.com"

# Provider configurations
declare -a PROVIDERS=(
  "slack https://slack.com/saml/metadata"
  "openai https://auth0.openai.com/samlp/metadata"
  "anthropic https://console.anthropic.com"
  "github https://github.com/orgs/asoos/saml/metadata"
  "gitlab https://gitlab.com"
  "atlassian https://api.atlassian.com/saml/metadata/AIXTIV"
)

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

log_info "Multi-Provider SAML Configuration Setup"
log_info "------------------------------------"

# Step 1: Set GCP project and region
log_info "Setting GCP project to ${PROJECT_ID} in ${REGION}..."
gcloud config set project ${PROJECT_ID}
gcloud config set compute/region ${REGION}
gcloud config set compute/zone ${ZONE}

# Step 2: Verify authentication
log_info "Verifying GCP authentication..."
gcloud auth list --filter=account:${ADMIN_EMAIL} --format="value(account)" | grep -q ${ADMIN_EMAIL} || {
  log_error "Not authenticated as ${ADMIN_EMAIL}. Please run 'gcloud auth login' first."
  exit 1
}

# Step 3: Configure each provider
for provider_info in "${PROVIDERS[@]}"; do
  provider=$(echo $provider_info | cut -d' ' -f1)
  provider_url=$(echo $provider_info | cut -d' ' -f2)
  
  log_info "Configuring SAML for ${provider}..."
  
  # Create provider-specific directories
  mkdir -p "config/${provider}"
  mkdir -p "certificates/${provider}"
  
  # Create workload identity pool for provider if it doesn't exist
  POOL_ID="${provider}-federation-pool"
  if ! gcloud iam workload-identity-pools describe ${POOL_ID} \
       --project=${PROJECT_ID} \
       --location=global &>/dev/null; then
    gcloud iam workload-identity-pools create ${POOL_ID} \
      --project=${PROJECT_ID} \
      --location=global \
      --display-name="${provider^} Federation Pool"
  fi

  # Create SAML provider
  PROVIDER_ID="${provider}-saml-provider"
  if ! gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
       --project=${PROJECT_ID} \
       --location=global \
       --workload-identity-pool=${POOL_ID} &>/dev/null; then
    gcloud iam workload-identity-pools providers create-saml ${PROVIDER_ID} \
      --project=${PROJECT_ID} \
      --location=global \
      --workload-identity-pool=${POOL_ID} \
      --attribute-mapping="google.subject=assertion.sub,attribute.email=assertion.email,attribute.groups=assertion.groups" \
      --display-name="${provider^} SAML Provider" \
      --issuer-uri="${provider_url}"
  fi

  # Generate provider metadata
  cat << EOF > "config/${provider}/metadata.json"
{
  "entityID": "${provider_url}",
  "assertionConsumerService": "${provider_url}/callback",
  "singleSignOnService": "https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky",
  "nameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
  "workloadIdentityPool": "${POOL_ID}",
  "workloadIdentityProvider": "${PROVIDER_ID}"
}
EOF

  log_info "${provider^} SAML configuration complete."
done

# Step 4: Generate integration documentation
log_info "Generating integration documentation..."
mkdir -p docs

# Generate documentation
cat << EOF > docs/saml-integration-guide.md
# SAML Integration Guide

## Provider Configurations

$(for provider_info in "${PROVIDERS[@]}"; do
  provider=$(echo $provider_info | cut -d' ' -f1)
  provider_url=$(echo $provider_info | cut -d' ' -f2)
  echo "### ${provider^}

- Entity ID: ${provider_url}
- SSO URL: https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky
- Certificate: See \`certificates/${provider}/${provider}.crt\`
- Workload Identity Pool: ${provider}-federation-pool
- Workload Identity Provider: ${provider}-saml-provider
"
done)

## Implementation Steps

1. Configure your application to use the provided SAML metadata
2. Set up user attribute mapping
3. Test the integration
4. Monitor the authentication flow

For detailed provider-specific instructions, see \`docs/providers/${provider}-setup.md\`
EOF

# Create monitoring dashboard
log_info "Creating monitoring dashboard..."
cp oauth2-cli/saml-visualization/index.html docs/saml-dashboard.html 2>/dev/null || true

log_info "SAML Integration Setup Complete!"
log_info "Next steps:"
log_info "1. Review the generated configuration in config/"
log_info "2. Follow the integration guide in docs/saml-integration-guide.md"
log_info "3. Test each provider's integration"
log_info "4. Monitor the authentication flows in the dashboard"

#!/bin/bash

# Multi-Provider SAML Configuration Setup
# ------------------------------------

set -e

# Configuration variables
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
ZONE="us-west1-b"
ADMIN_EMAIL="pr@coaching2100.com"

# Provider configurations
declare -a PROVIDERS=(
  "slack https://slack.com/saml/metadata"
  "openai https://auth0.openai.com/samlp/metadata"
  "anthropic https://console.anthropic.com"
  "github https://github.com/orgs/asoos/saml/metadata"
  "gitlab https://gitlab.com"
  "atlassian https://api.atlassian.com/saml/metadata/AIXTIV"
)

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

log_info "Multi-Provider SAML Configuration Setup"
log_info "------------------------------------"

# Step 1: Set GCP project and region
log_info "Setting GCP project to ${PROJECT_ID} in ${REGION}..."
gcloud config set project ${PROJECT_ID}
gcloud config set compute/region ${REGION}
gcloud config set compute/zone ${ZONE}

# Step 2: Verify authentication
log_info "Verifying GCP authentication..."
gcloud auth list --filter=account:${ADMIN_EMAIL} --format="value(account)" | grep -q ${ADMIN_EMAIL} || {
  log_error "Not authenticated as ${ADMIN_EMAIL}. Please run 'gcloud auth login' first."
  exit 1
}

# Step 3: Configure each provider
for provider_info in "${PROVIDERS[@]}"; do
  provider=$(echo $provider_info | cut -d' ' -f1)
  provider_url=$(echo $provider_info | cut -d' ' -f2)
  
  log_info "Configuring SAML for ${provider}..."
  
  # Create provider-specific directories
  mkdir -p "config/${provider}"
  mkdir -p "certificates/${provider}"
  
  # Create workload identity pool for provider if it doesn't exist
  POOL_ID="${provider}-federation-pool"
  if ! gcloud iam workload-identity-pools describe ${POOL_ID} \
       --project=${PROJECT_ID} \
       --location=global &>/dev/null; then
    gcloud iam workload-identity-pools create ${POOL_ID} \
      --project=${PROJECT_ID} \
      --location=global \
      --display-name="${provider^} Federation Pool"
  fi

  # Create SAML provider
  PROVIDER_ID="${provider}-saml-provider"
  if ! gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
       --project=${PROJECT_ID} \
       --location=global \
       --workload-identity-pool=${POOL_ID} &>/dev/null; then
    gcloud iam workload-identity-pools providers create-saml ${PROVIDER_ID} \
      --project=${PROJECT_ID} \
      --location=global \
      --workload-identity-pool=${POOL_ID} \
      --attribute-mapping="google.subject=assertion.sub,attribute.email=assertion.email,attribute.groups=assertion.groups" \
      --display-name="${provider^} SAML Provider" \
      --issuer-uri="${provider_url}"
  fi

  # Generate provider metadata
  cat << EOF > "config/${provider}/metadata.json"
{
  "entityID": "${provider_url}",
  "assertionConsumerService": "${provider_url}/callback",
  "singleSignOnService": "https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky",
  "nameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
  "workloadIdentityPool": "${POOL_ID}",
  "workloadIdentityProvider": "${PROVIDER_ID}"
}
EOF

  log_info "${provider^} SAML configuration complete."
done

# Step 4: Generate integration documentation
log_info "Generating integration documentation..."
mkdir -p docs

# Generate documentation
cat << EOF > docs/saml-integration-guide.md
# SAML Integration Guide

## Provider Configurations

$(for provider_info in "${PROVIDERS[@]}"; do
  provider=$(echo $provider_info | cut -d' ' -f1)
  provider_url=$(echo $provider_info | cut -d' ' -f2)
  echo "### ${provider^}

- Entity ID: ${provider_url}
- SSO URL: https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky
- Certificate: See \`certificates/${provider}/${provider}.crt\`
- Workload Identity Pool: ${provider}-federation-pool
- Workload Identity Provider: ${provider}-saml-provider
"
done)

## Implementation Steps

1. Configure your application to use the provided SAML metadata
2. Set up user attribute mapping
3. Test the integration
4. Monitor the authentication flow

For detailed provider-specific instructions, see \`docs/providers/${provider}-setup.md\`
EOF

# Create monitoring dashboard
log_info "Creating monitoring dashboard..."
cp oauth2-cli/saml-visualization/index.html docs/saml-dashboard.html 2>/dev/null || true

log_info "SAML Integration Setup Complete!"
log_info "Next steps:"
log_info "1. Review the generated configuration in config/"
log_info "2. Follow the integration guide in docs/saml-integration-guide.md"
log_info "3. Test each provider's integration"
log_info "4. Monitor the authentication flows in the dashboard"

#!/bin/bash

# Multi-Provider SAML Configuration Setup
# ------------------------------------

set -e

# Configuration variables
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
ZONE="us-west1-b"
ADMIN_EMAIL="pr@coaching2100.com"

# Provider configurations
declare -a PROVIDERS=(
  "slack https://slack.com/saml/metadata"
  "openai https://auth0.openai.com/samlp/metadata"
  "anthropic https://console.anthropic.com"
  "github https://github.com/orgs/asoos/saml/metadata"
  "gitlab https://gitlab.com"
  "atlassian https://api.atlassian.com/saml/metadata/AIXTIV"
)

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

log_info "Multi-Provider SAML Configuration Setup"
log_info "------------------------------------"

# Step 1: Set GCP project and region
log_info "Setting GCP project to ${PROJECT_ID} in ${REGION}..."
gcloud config set project ${PROJECT_ID}
gcloud config set compute/region ${REGION}
gcloud config set compute/zone ${ZONE}

# Step 2: Verify authentication
log_info "Verifying GCP authentication..."
gcloud auth list --filter=account:${ADMIN_EMAIL} --format="value(account)" | grep -q ${ADMIN_EMAIL} || {
  log_error "Not authenticated as ${ADMIN_EMAIL}. Please run 'gcloud auth login' first."
  exit 1
}

# Step 3: Configure each provider
for provider_info in "${PROVIDERS[@]}"; do
  provider=$(echo $provider_info | cut -d' ' -f1)
  provider_url=$(echo $provider_info | cut -d' ' -f2)
  
  log_info "Configuring SAML for ${provider}..."
  
  # Create provider-specific directories
  mkdir -p "config/${provider}"
  mkdir -p "certificates/${provider}"
  
  # Create workload identity pool for provider if it doesn't exist
  POOL_ID="${provider}-federation-pool"
  if ! gcloud iam workload-identity-pools describe ${POOL_ID} \
       --project=${PROJECT_ID} \
       --location=global &>/dev/null; then
    gcloud iam workload-identity-pools create ${POOL_ID} \
      --project=${PROJECT_ID} \
      --location=global \
      --display-name="${provider^} Federation Pool"
  fi

  # Create SAML provider
  PROVIDER_ID="${provider}-saml-provider"
  if ! gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
       --project=${PROJECT_ID} \
       --location=global \
       --workload-identity-pool=${POOL_ID} &>/dev/null; then
    gcloud iam workload-identity-pools providers create-saml ${PROVIDER_ID} \
      --project=${PROJECT_ID} \
      --location=global \
      --workload-identity-pool=${POOL_ID} \
      --attribute-mapping="google.subject=assertion.sub,attribute.email=assertion.email,attribute.groups=assertion.groups" \
      --display-name="${provider^} SAML Provider" \
      --issuer-uri="${provider_url}"
  fi

  # Generate provider metadata
  cat << EOF > "config/${provider}/metadata.json"
{
  "entityID": "${provider_url}",
  "assertionConsumerService": "${provider_url}/callback",
  "singleSignOnService": "https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky",
  "nameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
  "workloadIdentityPool": "${POOL_ID}",
  "workloadIdentityProvider": "${PROVIDER_ID}"
}
EOF

  log_info "${provider^} SAML configuration complete."
done

# Step 4: Generate integration documentation
log_info "Generating integration documentation..."
mkdir -p docs

# Generate documentation
cat << EOF > docs/saml-integration-guide.md
# SAML Integration Guide

## Provider Configurations

$(for provider_info in "${PROVIDERS[@]}"; do
  provider=$(echo $provider_info | cut -d' ' -f1)
  provider_url=$(echo $provider_info | cut -d' ' -f2)
  echo "### ${provider^}

- Entity ID: ${provider_url}
- SSO URL: https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky
- Certificate: See \`certificates/${provider}/${provider}.crt\`
- Workload Identity Pool: ${provider}-federation-pool
- Workload Identity Provider: ${provider}-saml-provider
"
done)

## Implementation Steps

1. Configure your application to use the provided SAML metadata
2. Set up user attribute mapping
3. Test the integration
4. Monitor the authentication flow

For detailed provider-specific instructions, see \`docs/providers/${provider}-setup.md\`
EOF

# Create monitoring dashboard
log_info "Creating monitoring dashboard..."
cp oauth2-cli/saml-visualization/index.html docs/saml-dashboard.html 2>/dev/null || true

log_info "SAML Integration Setup Complete!"
log_info "Next steps:"
log_info "1. Review the generated configuration in config/"
log_info "2. Follow the integration guide in docs/saml-integration-guide.md"
log_info "3. Test each provider's integration"
log_info "4. Monitor the authentication flows in the dashboard"

#!/bin/bash

# Multi-Provider SAML Configuration Setup
# ------------------------------------

set -e

# Configuration variables
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
ZONE="us-west1-b"
ADMIN_EMAIL="admin@asoos.cool"

# Provider configurations
declare -a PROVIDERS=(
  "slack https://slack.com/saml/metadata"
  "openai https://auth0.openai.com/samlp/metadata"
  "anthropic https://console.anthropic.com"
  "github https://github.com/orgs/asoos/saml/metadata"
  "gitlab https://gitlab.com"
  "atlassian https://api.atlassian.com/saml/metadata/AIXTIV"
)

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

log_info "Multi-Provider SAML Configuration Setup"
log_info "------------------------------------"

# Step 1: Set GCP project and region
log_info "Setting GCP project to ${PROJECT_ID} in ${REGION}..."
gcloud config set project ${PROJECT_ID}
gcloud config set compute/region ${REGION}
gcloud config set compute/zone ${ZONE}

# Step 2: Verify authentication
log_info "Verifying GCP authentication..."
gcloud auth list --filter=account:${ADMIN_EMAIL} --format="value(account)" | grep -q ${ADMIN_EMAIL} || {
  log_error "Not authenticated as ${ADMIN_EMAIL}. Please run 'gcloud auth login' first."
  exit 1
}

# Step 3: Configure each provider
for provider_info in "${PROVIDERS[@]}"; do
  provider=$(echo $provider_info | cut -d' ' -f1)
  provider_url=$(echo $provider_info | cut -d' ' -f2)
  log_info "Configuring SAML for ${provider}..."
  
  # Create provider-specific directories
  mkdir -p "config/${provider}"
  mkdir -p "certificates/${provider}"
  
  # Create workload identity pool for provider if it doesn't exist
  POOL_ID="${provider}-federation-pool"
  if ! gcloud iam workload-identity-pools describe ${POOL_ID} \
       --project=${PROJECT_ID} \
       --location=global &>/dev/null; then
    gcloud iam workload-identity-pools create ${POOL_ID} \
      --project=${PROJECT_ID} \
      --location=global \
      --display-name="${provider^} Federation Pool"
  fi

  # Create SAML provider
  PROVIDER_ID="${provider}-saml-provider"
  if ! gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
       --project=${PROJECT_ID} \
       --location=global \
       --workload-identity-pool=${POOL_ID} &>/dev/null; then
    gcloud iam workload-identity-pools providers create-saml ${PROVIDER_ID} \
      --project=${PROJECT_ID} \
      --location=global \
      --workload-identity-pool=${POOL_ID} \
      --attribute-mapping="google.subject=assertion.sub,attribute.email=assertion.email,attribute.groups=assertion.groups" \
      --display-name="${provider^} SAML Provider" \
      --issuer-uri="${PROVIDERS[$provider]}"
  fi

  # Generate provider metadata
  cat << EOF > "config/${provider}/metadata.json"
{
  "entityID": "${PROVIDERS[$provider]}",
  "assertionConsumerService": "${PROVIDERS[$provider]}/callback",
  "singleSignOnService": "https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky",
  "nameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
  "workloadIdentityPool": "${POOL_ID}",
  "workloadIdentityProvider": "${PROVIDER_ID}"
}
EOF

  log_info "${provider^} SAML configuration complete."
done

# Step 4: Generate integration documentation
log_info "Generating integration documentation..."
mkdir -p docs

cat << EOF > docs/saml-integration-guide.md
# SAML Integration Guide

## Provider Configurations

$(for provider in "${!PROVIDERS[@]}"; do
echo "### ${provider^}

- Entity ID: ${PROVIDERS[$provider]}
- SSO URL: https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky
- Certificate: See \`certificates/${provider}/${provider}.crt\`
- Workload Identity Pool: ${provider}-federation-pool
- Workload Identity Provider: ${provider}-saml-provider
"
done)

## Implementation Steps

1. Configure your application to use the provided SAML metadata
2. Set up user attribute mapping
3. Test the integration
4. Monitor the authentication flow

For detailed provider-specific instructions, see \`docs/providers/${provider}-setup.md\`

EOF

# Create monitoring dashboard
log_info "Creating monitoring dashboard..."
cp oauth2-cli/saml-visualization/index.html docs/saml-dashboard.html 2>/dev/null || true

log_info "SAML Integration Setup Complete!"
log_info "Next steps:"
log_info "1. Review the generated configuration in config/"
log_info "2. Follow the integration guide in docs/saml-integration-guide.md"
log_info "3. Test each provider's integration"
log_info "4. Monitor the authentication flows in the dashboard"

#!/bin/bash

# Multi-Provider SAML Configuration Setup
# ------------------------------------

set -e

# Configuration variables
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
ZONE="us-west1-b"
ADMIN_EMAIL="admin@asoos.cool"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Provider configurations
declare -A PROVIDERS=(
  ["slack"]="https://slack.com/saml/metadata"
  ["openai"]="https://auth0.openai.com/samlp/metadata"
  ["anthropic"]="https://console.anthropic.com"
  ["github"]="https://github.com/orgs/asoos/saml/metadata"
  ["gitlab"]="https://gitlab.com"
  ["atlassian"]="https://api.atlassian.com/saml/metadata/AIXTIV"
)

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

log_info "Multi-Provider SAML Configuration Setup"
log_info "------------------------------------"

# Step 1: Set GCP project and region
log_info "Setting GCP project to ${PROJECT_ID} in ${REGION}..."
gcloud config set project ${PROJECT_ID}
gcloud config set compute/region ${REGION}
gcloud config set compute/zone ${ZONE}

# Step 2: Verify authentication
log_info "Verifying GCP authentication..."
gcloud auth list --filter=account:${ADMIN_EMAIL} --format="value(account)" | grep -q ${ADMIN_EMAIL} || {
  log_error "Not authenticated as ${ADMIN_EMAIL}. Please run 'gcloud auth login' first."
  exit 1
}

# Step 3: Configure each provider
for provider in "${!PROVIDERS[@]}"; do
  log_info "Configuring SAML for ${provider}..."
  
  # Create provider-specific configuration
  mkdir -p "config/${provider}"
  
  # Generate provider metadata
  cat << EOF > "config/${provider}/metadata.json"
{
  "entityID": "${PROVIDERS[$provider]}",
  "assertionConsumerService": "${PROVIDERS[$provider]}/callback",
  "singleSignOnService": "https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky",
  "nameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
}
EOF

  # Apply configuration
  log_info "Applying ${provider} SAML configuration..."
  
  # Create workload identity pool for provider if it doesn't exist
  POOL_ID="${provider}-federation-pool"
  if ! gcloud iam workload-identity-pools describe ${POOL_ID} \
       --project=${PROJECT_ID} \
       --location=global &>/dev/null; then
    gcloud iam workload-identity-pools create ${POOL_ID} \
      --project=${PROJECT_ID} \
      --location=global \
      --display-name="${provider^} Federation Pool"
  fi

  # Create SAML provider
  PROVIDER_ID="${provider}-saml-provider"
  if ! gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
       --project=${PROJECT_ID} \
       --location=global \
       --workload-identity-pool=${POOL_ID} &>/dev/null; then
    gcloud iam workload-identity-pools providers create-saml ${PROVIDER_ID} \
      --project=${PROJECT_ID} \
      --location=global \
      --workload-identity-pool=${POOL_ID} \
      --attribute-mapping="google.subject=assertion.sub,attribute.user=assertion.user" \
      --display-name="${provider^} SAML Provider" \
      --issuer-uri="${PROVIDERS[$provider]}"
  fi

  log_info "${provider^} SAML configuration complete."
done

# Step 4: Generate integration documentation
log_info "Generating integration documentation..."
mkdir -p docs

cat << EOF > docs/saml-integration-guide.md
# SAML Integration Guide

## Provider Configurations

$(for provider in "${!PROVIDERS[@]}"; do
echo "### ${provider^}

- Entity ID: ${PROVIDERS[$provider]}
- SSO URL: https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky
- Certificate: See \`security/saml/certificates/${provider}.crt\`
"
done)

## Implementation Steps

1. Configure your application to use the provided SAML metadata
2. Set up user attribute mapping
3. Test the integration
4. Monitor the authentication flow

For detailed provider-specific instructions, see \`docs/providers/${provider}-setup.md\`

EOF

log_info "SAML Integration Setup Complete!"
log_info "Next steps:"
log_info "1. Review the generated configuration in config/"
log_info "2. Follow the integration guide in docs/saml-integration-guide.md"
log_info "3. Test each provider's integration"
log_info "4. Monitor the authentication flows in GCP Console"

