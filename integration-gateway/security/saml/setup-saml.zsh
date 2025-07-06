#!/bin/zsh

# Multi-Provider SAML Configuration Setup
setopt ERR_EXIT

# Configuration variables
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
ZONE="us-west1-b"
ADMIN_EMAIL="pr@coaching2100.com"

# Provider configurations
provider_names=(
    "slack"
    "openai"
    "anthropic"
    "github"
    "gitlab"
    "atlassian"
)

provider_urls=(
    "https://slack.com/saml/metadata"
    "https://auth0.openai.com/samlp/metadata"
    "https://console.anthropic.com"
    "https://github.com/orgs/asoos/saml/metadata"
    "https://gitlab.com"
    "https://api.atlassian.com/saml/metadata/AIXTIV"
)

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

# Helper functions
log_info() {
    print -P "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    print -P "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    print -P "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v $1 > /dev/null; then
        log_error "$1 is required but not installed."
        return 1
    fi
}

# Check required tools
check_command "gcloud"
check_command "jq"

log_info "Multi-Provider SAML Configuration Setup"
log_info "------------------------------------"

# Set GCP project and region
log_info "Setting GCP project to ${PROJECT_ID} in ${REGION}..."
gcloud config set project ${PROJECT_ID}
gcloud config set compute/region ${REGION}
gcloud config set compute/zone ${ZONE}

# Verify authentication
log_info "Verifying GCP authentication..."
if ! gcloud auth list --filter=account:${ADMIN_EMAIL} --format="value(account)" | grep -q ${ADMIN_EMAIL}; then
    log_error "Not authenticated as ${ADMIN_EMAIL}. Please run 'gcloud auth login' first."
    exit 1
}

# Configure each provider
integer i
for ((i=1; i<=${#provider_names}; i++)); do
    provider=$provider_names[$i]
    provider_url=$provider_urls[$i]
    log_info "Configuring SAML for ${provider}..."
    
    # Create provider-specific directories
    mkdir -p "config/${provider}"
    mkdir -p "certificates/${provider}"
    
    # Create workload identity pool
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
--issuer-uri="$provider_url"
    fi

    # Generate provider metadata
    cat > "config/${provider}/metadata.json" << EOF
{
"entityID": "$provider_url",
    "assertionConsumerService": "$provider_url/callback",
    "singleSignOnService": "https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky",
    "nameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    "workloadIdentityPool": "${POOL_ID}",
    "workloadIdentityProvider": "${PROVIDER_ID}"
}
EOF

    log_info "${(C)provider} SAML configuration complete."
done

# Generate documentation
log_info "Generating integration documentation..."
mkdir -p docs

# Create documentation content
doc_content="# SAML Integration Guide\n\n## Provider Configurations\n\n"
integer i
for ((i=1; i<=${#provider_names}; i++)); do
    provider=$provider_names[$i]
    provider_url=$provider_urls[$i]
    doc_content+="### ${(C)provider}\n\n"
doc_content+="- Entity ID: $provider_url\n"
    doc_content+="- SSO URL: https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky\n"
    doc_content+="- Certificate: See \`certificates/${provider}/${provider}.crt\`\n"
    doc_content+="- Workload Identity Pool: ${provider}-federation-pool\n"
    doc_content+="- Workload Identity Provider: ${provider}-saml-provider\n\n"
done

doc_content+="## Implementation Steps\n\n"
doc_content+="1. Configure your application to use the provided SAML metadata\n"
doc_content+="2. Set up user attribute mapping\n"
doc_content+="3. Test the integration\n"
doc_content+="4. Monitor the authentication flow\n\n"
doc_content+="For detailed provider-specific instructions, see \`docs/providers/setup.md\`\n"

print -r -- $doc_content > docs/saml-integration-guide.md

# Create monitoring dashboard
log_info "Creating monitoring dashboard..."
cp oauth2-cli/saml-visualization/index.html docs/saml-dashboard.html 2>/dev/null || true

log_info "SAML Integration Setup Complete!"
log_info "Next steps:"
log_info "1. Review the generated configuration in config/"
log_info "2. Follow the integration guide in docs/saml-integration-guide.md"
log_info "3. Test each provider's integration"
log_info "4. Monitor the authentication flows in the dashboard"

