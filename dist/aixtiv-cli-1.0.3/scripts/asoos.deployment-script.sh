#!/bin/bash
# ASOOS Domain System - Complete Deployment & Maintenance Script
# This script handles deployment, setup, and maintenance of the entire system

set -e

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="api-for-warp-drive"
ROOT_DIR="aixtiv-domains"
NODE_VERSION="18"
ENVIRONMENT=${1:-staging}  # Default to staging if not provided
DOMAIN_SCOPE=${2:-all}     # Default to all domains if not specified

# Logs with timestamp
log() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Check required tools
check_prerequisites() {
  log "Checking prerequisites..."
  
  # Check node.js
  if ! command -v node &> /dev/null; then
    error "Node.js is not installed. Please install Node.js version $NODE_VERSION."
    exit 1
  fi
  
  NODE_CURRENT_VERSION=$(node -v | cut -d 'v' -f 2)
  if [[ "$NODE_CURRENT_VERSION" != "$NODE_VERSION"* ]]; then
    warn "Node.js version mismatch. Expected $NODE_VERSION, got $NODE_CURRENT_VERSION."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi
  
  # Check gcloud
  if ! command -v gcloud &> /dev/null; then
    error "Google Cloud SDK is not installed. Please install it first."
    exit 1
  fi
  
  # Check Firebase CLI
  if ! command -v firebase &> /dev/null; then
    warn "Firebase CLI is not installed. Installing it now..."
    npm install -g firebase-tools
  fi
  
  success "All prerequisites checked."
}

# Authentication with GCP and Firebase
authenticate() {
  log "Authenticating with Google Cloud..."
  
  # Check if already authenticated
  CURRENT_ACCOUNT=$(gcloud config get-value account 2>/dev/null)
  if [[ -z "$CURRENT_ACCOUNT" ]]; then
    gcloud auth login
  else
    log "Already authenticated as $CURRENT_ACCOUNT"
  fi
  
  # Set project
  gcloud config set project "$PROJECT_ID"
  
  # Firebase login
  firebase login --no-localhost
  
  success "Authentication completed."
}

# Setup environment secrets and configurations
setup_environment() {
  log "Setting up $ENVIRONMENT environment..."
  
  # Create environment directories if they don't exist
  mkdir -p "environments/$ENVIRONMENT"
  
  # Copy environment-specific templates
  if [[ -f "environments/templates/$ENVIRONMENT.env" ]]; then
    cp "environments/templates/$ENVIRONMENT.env" ".env.$ENVIRONMENT"
    log "Environment file .env.$ENVIRONMENT created from template."
  else
    warn "No environment template found for $ENVIRONMENT. Using default template."
    cp "environments/templates/default.env" ".env.$ENVIRONMENT"
  fi
  
  # Configure SSO for the environment
  if [[ "$ENVIRONMENT" == "production" ]]; then
    log "Configuring SSO for production environment..."
    # Generate production SSL certificates if needed
    if [[ ! -f "sso-config/certificates/prod/cert.pem" ]]; then
      mkdir -p "sso-config/certificates/prod"
      openssl req -x509 -newkey rsa:4096 -keyout "sso-config/certificates/prod/key.pem" \
        -out "sso-config/certificates/prod/cert.pem" -days 365 -nodes \
        -subj "/CN=integration-gateway.aixtiv.com"
      success "Production SSL certificates generated."
    fi
  else
    log "Configuring SSO for $ENVIRONMENT environment..."
    # Generate development/staging SSL certificates if needed
    if [[ ! -f "sso-config/certificates/$ENVIRONMENT/cert.pem" ]]; then
      mkdir -p "sso-config/certificates/$ENVIRONMENT"
      openssl req -x509 -newkey rsa:4096 -keyout "sso-config/certificates/$ENVIRONMENT/key.pem" \
        -out "sso-config/certificates/$ENVIRONMENT/cert.pem" -days 365 -nodes \
        -subj "/CN=integration-gateway-$ENVIRONMENT.aixtiv.com"
      success "$ENVIRONMENT SSL certificates generated."
    fi
  fi
  
  # Update environment file with appropriate SSO paths
  sed -i.bak "s|SAML_CERT=.*|SAML_CERT=./sso-config/certificates/$ENVIRONMENT/cert.pem|g" ".env.$ENVIRONMENT"
  sed -i.bak "s|SAML_PRIVATE_KEY=.*|SAML_PRIVATE_KEY=./sso-config/certificates/$ENVIRONMENT/key.pem|g" ".env.$ENVIRONMENT"
  
  success "Environment $ENVIRONMENT setup completed."
}

# Initialize the domain registry with all 250 domains
initialize_domain_registry() {
  log "Initializing domain registry..."
  
  # Check if domain registry already exists
  DOMAIN_COUNT=$(firebase firestore:get "domains" --project="$PROJECT_ID" 2>/dev/null | grep -c "Document" || echo "0")
  
  if [[ "$DOMAIN_COUNT" -gt "0" ]]; then
    warn "Domain registry already contains $DOMAIN_COUNT domains."
    read -p "Reinitialize domain registry? This will overwrite existing data. (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      log "Skipping domain registry initialization."
      return
    fi
  fi
  
  # Run the domain initialization script
  log "Running domain registry initialization..."
  NODE_ENV=$ENVIRONMENT npm run initialize:domains
  
  success "Domain registry initialized with 250 domains."
}

# Setup and configure the Copilot system
setup_copilot() {
  log "Setting up Lucy AI Copilot..."
  
  # Create service account if it doesn't exist
  if ! gcloud iam service-accounts describe "drlucyautomation@$PROJECT_ID.iam.gserviceaccount.com" &>/dev/null; then
    log "Creating Lucy service account..."
    gcloud iam service-accounts create drlucyautomation \
      --display-name="Dr. Lucy Automation" \
      --description="Service account for Lucy AI Copilot"
    
    # Grant necessary permissions
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
      --member="serviceAccount:drlucyautomation@$PROJECT_ID.iam.gserviceaccount.com" \
      --role="roles/firebase.admin"
    
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
      --member="serviceAccount:drlucyautomation@$PROJECT_ID.iam.gserviceaccount.com" \
      --role="roles/run.admin"
  else
    log "Lucy service account already exists."
  fi
  
  # Download service account key if needed
  if [[ ! -f "config/service-accounts/drlucyautomation.json" ]]; then
    mkdir -p "config/service-accounts"
    gcloud iam service-accounts keys create "config/service-accounts/drlucyautomation.json" \
      --iam-account="drlucyautomation@$PROJECT_ID.iam.gserviceaccount.com"
    success "Service account key created at config/service-accounts/drlucyautomation.json"
  fi
  
  # Configure WebAuthn for Copilot
  log "Configuring WebAuthn for Lucy Copilot..."
  npm run configure:webauthn -- --env=$ENVIRONMENT
  
  # Setup Copilot delegation framework
  log "Setting up Copilot delegation framework..."
  npm run setup:copilot-delegation -- --env=$ENVIRONMENT
  
  # Setup blockchain integration for governance
  log "Setting up blockchain integration for governance..."
  npm run setup:blockchain -- --env=$ENVIRONMENT
  
  success "Lucy AI Copilot setup completed."
}

# Configure and deploy the Agent-Driven Execution Framework
deploy_agent_framework() {
  log "Deploying Agent-Driven Execution Framework..."
  
  # Build the agent framework
  npm run build:agent-framework
  
  # Deploy to Cloud Run
  gcloud run deploy agent-execution-framework \
    --source . \
    --region=us-central1 \
    --service-account="drlucyautomation@$PROJECT_ID.iam.gserviceaccount.com" \
    --set-env-vars="NODE_ENV=$ENVIRONMENT,GOOGLE_APPLICATION_CREDENTIALS=/app/config/service-accounts/drlucyautomation.json" \
    --allow-unauthenticated
  
  # Configure S2DO Governance Engine
  log "Configuring S2DO Governance Engine..."
  npm run configure:s2do-governance -- --env=$ENVIRONMENT
  
  success "Agent-Driven Execution Framework deployed."
}

# Deploy domains to Firebase and Cloud Run
deploy_domains() {
  log "Deploying domains ($DOMAIN_SCOPE) to $ENVIRONMENT environment..."
  
  # Generate domain content first
  if [[ "$DOMAIN_SCOPE" == "all" ]]; then
    log "Generating content for all domains..."
    npm run generate:all-domains -- --env=$ENVIRONMENT
  else
    log "Generating content for $DOMAIN_SCOPE priority domains..."
    npm run generate:domains -- --priority=$DOMAIN_SCOPE --env=$ENVIRONMENT
  fi
  
  # Optimize SEO for domains
  log "Optimizing SEO for domains..."
  npm run optimize:seo -- --scope=$DOMAIN_SCOPE --env=$ENVIRONMENT
  
  # Deploy to Firebase
  log "Deploying domains to Firebase Hosting..."
  if [[ "$DOMAIN_SCOPE" == "all" ]]; then
    firebase deploy --only hosting --project="$PROJECT_ID"
  else
    # Extract target names based on priority
    TARGETS=$(node -e "const fs=require('fs'); const config=JSON.parse(fs.readFileSync('.firebaserc')); const targets=Object.keys(config.targets['$PROJECT_ID'].hosting).filter(t => t.includes('$DOMAIN_SCOPE')); console.log(targets.join(','))")
    firebase deploy --only hosting:$TARGETS --project="$PROJECT_ID"
  fi
  
  # Deploy to Cloud Run
  log "Deploying domain services to Cloud Run..."
  npm run deploy:domain-services -- --scope=$DOMAIN_SCOPE --env=$ENVIRONMENT
  
  success "Domains deployment completed."
}

# Configure the Secure Secrets Vault
configure_secrets_vault() {
  log "Configuring Secure Secrets Vault..."
  
  # Check if Vault is already initialized
  if ! curl -s "$VAULT_ADDR/v1/sys/health" &>/dev/null; then
    warn "Vault server not reachable at $VAULT_ADDR. Skipping Vault configuration."
    return
  fi
  
  # Configure Vault for the environment
  npm run configure:vault -- --env=$ENVIRONMENT
  
  # Setup secret rotation policies
  log "Setting up secret rotation policies..."
  npm run vault:setup-rotation
  
  success "Secure Secrets Vault configured."
}

# Verify the deployment
verify_deployment() {
  log "Verifying deployment..."
  
  # Verify domain deployments
  log "Verifying domain deployments..."
  npm run verify:domains -- --scope=$DOMAIN_SCOPE --env=$ENVIRONMENT
  
  # Verify Copilot functionality
  log "Verifying Lucy Copilot functionality..."
  npm run verify:copilot -- --env=$ENVIRONMENT
  
  # Verify S2DO compliance
  log "Verifying S2DO compliance..."
  npm run verify:s2do-compliance -- --env=$ENVIRONMENT
  
  # Generate deployment attestation
  log "Generating deployment attestation..."
  npm run generate:attestation -- --env=$ENVIRONMENT
  
  success "Deployment verification completed."
}

# Setup monitoring and alerting
setup_monitoring() {
  log "Setting up monitoring and alerting..."
  
  # Configure Google Cloud Monitoring
  log "Configuring Google Cloud Monitoring..."
  npm run setup:monitoring -- --env=$ENVIRONMENT
  
  # Setup custom metrics
  log "Setting up custom metrics..."
  npm run setup:custom-metrics
  
  # Configure alerts
  log "Configuring alerts..."
  npm run setup:alerts -- --env=$ENVIRONMENT
  
  success "Monitoring and alerting setup completed."
}

# Perform routine maintenance
perform_maintenance() {
  log "Performing routine maintenance..."
  
  # Rotate secrets
  log "Rotating secrets..."
  npm run rotate:secrets -- --env=$ENVIRONMENT
  
  # Cleanup old deployment artifacts
  log "Cleaning up old deployment artifacts..."
  npm run cleanup:artifacts
  
  # Update security policies
  log "Updating security policies..."
  npm run update:security-policies -- --env=$ENVIRONMENT
  
  success "Maintenance completed."
}

# Main deployment function
deploy() {
  log "Starting deployment process for $ENVIRONMENT environment..."
  
  # Run all deployment steps
  check_prerequisites
  authenticate
  setup_environment
  initialize_domain_registry
  setup_copilot
  deploy_agent_framework
  configure_secrets_vault
  deploy_domains
  verify_deployment
  setup_monitoring
  
  success "Deployment completed successfully!"
  log "The system is now available at https://lucy.aixtiv.com and domain-specific URLs."
}

# Help information
show_help() {
  echo "ASOOS Domain System - Deployment Script"
  echo
  echo "Usage: $0 [environment] [domain_scope] [command]"
  echo
  echo "Environments:"
  echo "  development    Development environment"
  echo "  staging        Staging environment (default)"
  echo "  production     Production environment"
  echo
  echo "Domain Scopes:"
  echo "  all            All domains (default)"
  echo "  high-priority  High priority domains only"
  echo "  medium-priority Medium priority domains only"
  echo "  low-priority   Low priority domains only"
  echo
  echo "Commands:"
  echo "  deploy         Full deployment (default)"
  echo "  prerequisites  Check prerequisites only"
  echo "  authenticate   Authentication only"
  echo "  environment    Setup environment only"
  echo "  domains        Initialize and deploy domains only"
  echo "  copilot        Setup Copilot only"
  echo "  agent          Deploy Agent framework only"
  echo "  verify         Verify deployment only"
  echo "  monitor        Setup monitoring only"
  echo "  maintenance    Perform maintenance"
  echo "  help           Show this help information"
}

# Process command argument
case "${3:-deploy}" in
  deploy)
    deploy
    ;;
  prerequisites)
    check_prerequisites
    ;;
  authenticate)
    authenticate
    ;;
  environment)
    setup_environment
    ;;
  domains)
    initialize_domain_registry
    deploy_domains
    ;;
  copilot)
    setup_copilot
    ;;
  agent)
    deploy_agent_framework
    ;;
  verify)
    verify_deployment
    ;;
  monitor)
    setup_monitoring
    ;;
  maintenance)
    perform_maintenance
    ;;
  help|*)
    show_help
    ;;
esac
