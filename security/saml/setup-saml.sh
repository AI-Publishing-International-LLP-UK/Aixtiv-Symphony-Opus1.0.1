#!/bin/bash

# Multi-Provider SAML Configuration Setup
set -e

# Configuration
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
ZONE="us-west1-b"
ADMIN_EMAIL="pr@coaching2100.com"

# Color output
GREEN='\033[0;32m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

# Set GCP configuration
log_info "Setting GCP project to ${PROJECT_ID} in ${REGION}..."
gcloud config set project ${PROJECT_ID}
gcloud config set compute/region ${REGION}
gcloud config set compute/zone ${ZONE}

# Verify authentication
log_info "Verifying GCP authentication..."
if ! gcloud auth list --filter=account:${ADMIN_EMAIL} --format="value(account)" | grep -q ${ADMIN_EMAIL}; then
    echo "Not authenticated as ${ADMIN_EMAIL}. Please run 'gcloud auth login' first."
    exit 1
fi

# Configure providers
PROVIDERS=(
    "slack|https://slack.com/saml/metadata"
    "openai|https://auth0.openai.com/samlp/metadata"
    "anthropic|https://console.anthropic.com"
    "github|https://github.com/orgs/asoos/saml/metadata"
    "gitlab|https://gitlab.com"
    "atlassian|https://api.atlassian.com/saml/metadata/AIXTIV"
)

for provider_info in "${PROVIDERS[@]}"; do
    provider=$(echo "$provider_info" | cut -d'|' -f1)
    provider_url=$(echo "$provider_info" | cut -d'|' -f2)
    
    log_info "Configuring SAML for ${provider}..."
    
# Create directories
    mkdir -p "config/${provider}"
    mkdir -p "certificates/${provider}"
    
    # Copy IDP metadata
    cp "/Users/as/Downloads/GoogleIDPMetadata SAML.xml" "config/${provider}/idp-metadata.xml"
    
    # Setup workload identity pool
# Use existing GitHub pool for GitHub, create new ones for others
if [ "$provider" = "github" ]; then
        POOL_ID="github-actions-pool"
    else
        POOL_ID="${provider}-federation-pool"
    fi
    if ! gcloud iam workload-identity-pools describe ${POOL_ID} \
         --project=${PROJECT_ID} \
         --location=global &>/dev/null; then
        gcloud iam workload-identity-pools create ${POOL_ID} \
            --project=${PROJECT_ID} \
            --location=global \
--display-name="$(tr '[:lower:]' '[:upper:]' <<< ${provider:0:1})${provider:1} Federation Pool"
    fi

    # Setup SAML provider
    PROVIDER_ID="${provider}-saml-provider"
    if ! gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
         --project=${PROJECT_ID} \
         --location=global \
         --workload-identity-pool=${POOL_ID} &>/dev/null; then
        gcloud iam workload-identity-pools providers create-saml "${PROVIDER_ID}" \
            --project=${PROJECT_ID} \
            --location=global \
            --workload-identity-pool=${POOL_ID} \
            --idp-metadata-path="config/${provider}/idp-metadata.xml" \
            --attribute-mapping="google.subject=assertion.sub,google.groups=assertion.groups"
    fi

    # Generate metadata
    cat > "config/${provider}/metadata.json" << EOF
{
    "entityID": "${provider_url}",
    "assertionConsumerService": "${provider_url}/callback",
    "singleSignOnService": "https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky",
    "nameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    "workloadIdentityPool": "${POOL_ID}",
    "workloadIdentityProvider": "${PROVIDER_ID}"
}
EOF

    log_info "$(tr '[:lower:]' '[:upper:]' <<< ${provider:0:1})${provider:1} SAML configuration complete."
done

# Generate documentation
log_info "Generating integration documentation..."
mkdir -p docs

# Generate guide content
guide_content="# SAML Integration Guide\n\n## Provider Configurations\n\n"

for provider_info in "${PROVIDERS[@]}"; do
    provider=$(echo "$provider_info" | cut -d'|' -f1)
    provider_url=$(echo "$provider_info" | cut -d'|' -f2)
    guide_content+="### $(tr '[:lower:]' '[:upper:]' <<< ${provider:0:1})${provider:1}\n\n"
    guide_content+="- Entity ID: ${provider_url}\n"
    guide_content+="- SSO URL: https://accounts.google.com/o/saml2/idp?idpid=C04cj3jky\n"
    guide_content+="- Certificate: See \`certificates/${provider}/${provider}.crt\`\n"
    guide_content+="- Workload Identity Pool: ${provider}-federation-pool\n"
    guide_content+="- Workload Identity Provider: ${provider}-saml-provider\n\n"
done

guide_content+="## Implementation Steps\n\n"
guide_content+="1. Configure your application to use the provided SAML metadata\n"
guide_content+="2. Set up user attribute mapping\n"
guide_content+="3. Test the integration\n"
guide_content+="4. Monitor the authentication flow\n\n"
guide_content+="For detailed provider-specific instructions, see \`docs/providers/setup.md\`\n"

# Write guide to file
echo "$guide_content" > docs/saml-integration-guide.md

log_info "SAML Integration Setup Complete!"
log_info "Next steps:"
log_info "1. Review the generated configuration in config/"
log_info "2. Follow the integration guide in docs/saml-integration-guide.md"
log_info "3. Test each provider's integration"
log_info "4. Monitor the authentication flows in the dashboard"

