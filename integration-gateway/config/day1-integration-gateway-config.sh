#!/bin/bash

# Exit on error
set -e

# Error handling
error_handler() {
    local line_no=$1
    local error_code=$2
    echo "Error occurred in script at line: ${line_no}, with error code: ${error_code}"
    cleanup
    exit ${error_code}
}

trap 'error_handler ${LINENO} $?' ERR

# Environment Variables
export GCP_PROJECT_ID="api-for-warp-drive"
export GCP_REGION="us-west1"
export CLOUD_RUN_REGION="us-west1"
export SERVICE_ACCOUNT_EMAIL="drlucyautomation@api-for-warp-drive.iam.gserviceaccount.com"
export FIREBASE_PROJECT_ID="api-for-warp-drive"
export FIREBASE_SITE_DESKTOP="website-builds"
export FIREBASE_SITE_MOBILE="app-2100-cool"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Cleanup function
cleanup() {
    log "Performing cleanup..."
    # Remove temporary files if any
    rm -f /tmp/temp_* 2>/dev/null || true
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        log "Error: gcloud CLI not found"
        return 1
    }

    # Check if firebase is installed
    if ! command -v firebase &> /dev/null; then
        log "Error: firebase CLI not found"
        return 1
    }

    # Verify authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log "Error: Not authenticated with gcloud"
        return 1
    }

    log "Prerequisites check passed"
    return 0
}

# Configure GCP services
configure_gcp() {
    log "Configuring GCP services..."
    
    # Set project
    gcloud config set project ${GCP_PROJECT_ID}
    
    # Set default region
    gcloud config set compute/region ${GCP_REGION}
    
    # Enable required APIs
    gcloud services enable cloudrun.googleapis.com
    gcloud services enable cloudbuild.googleapis.com
    gcloud services enable firestore.googleapis.com
    
    log "GCP services configured successfully"
}

# Configure Firebase
configure_firebase() {
    log "Configuring Firebase..."
    
    # Use correct project
    firebase use ${FIREBASE_PROJECT_ID}
    
    # Configure hosting targets
    firebase target:apply hosting desktop ${FIREBASE_SITE_DESKTOP}
    firebase target:apply hosting mobile ${FIREBASE_SITE_MOBILE}
    
    log "Firebase configured successfully"
}

# Configure integration gateway
configure_gateway() {
    log "Configuring integration gateway..."
    
    # Create service account key if not exists
    if [[ ! -f "service-account-key.json" ]]; then
        gcloud iam service-accounts keys create service-account-key.json \
            --iam-account=${SERVICE_ACCOUNT_EMAIL}
    fi
    
    # Set up environment variables from service account
    export GCP_PRIVATE_KEY=$(cat service-account-key.json | jq -r '.private_key')
    export GCP_CLIENT_ID=$(cat service-account-key.json | jq -r '.client_id')
    export GCP_KEY_ID=$(cat service-account-key.json | jq -r '.private_key_id')
    
    log "Integration gateway configured successfully"
}

# Validate configuration
validate_config() {
    log "Validating configuration..."
    
    # Check if service account key exists
    if [[ ! -f "service-account-key.json" ]]; then
        log "Error: Service account key not found"
        return 1
    }
    
    # Validate GCP configuration
    if ! gcloud projects describe ${GCP_PROJECT_ID} &>/dev/null; then
        log "Error: Invalid GCP project configuration"
        return 1
    }
    
    # Validate Firebase configuration
    if ! firebase projects:list | grep -q ${FIREBASE_PROJECT_ID}; then
        log "Error: Invalid Firebase project configuration"
        return 1
    }
    
    log "Configuration validated successfully"
    return 0
}

# Main execution
main() {
    log "Starting integration gateway configuration..."
    
    # Run configuration steps
    check_prerequisites || { log "Prerequisites check failed"; exit 1; }
    configure_gcp || { log "GCP configuration failed"; exit 1; }
    configure_firebase || { log "Firebase configuration failed"; exit 1; }
    configure_gateway || { log "Gateway configuration failed"; exit 1; }
    validate_config || { log "Configuration validation failed"; exit 1; }
    
    log "Integration gateway configuration completed successfully"
}

# Execute main function
main


#!/bin/bash

# Exit on any error
set -e

# ====================================
# Environment Variables
# ====================================
export FIREBASE_PROJECT_ID="api-for-warp-drive"
export FIREBASE_SITE_DESKTOP="website-builds"
export FIREBASE_SITE_MOBILE="app-2100-cool"
export GCP_PROJECT_ID="api-for-warp-drive"
export GCP_REGION="us-west1"
export CLOUD_RUN_REGION="us-west1"
export SERVICE_ACCOUNT_EMAIL="drlucyautomation@api-for-warp-drive.iam.gserviceaccount.com"

# ====================================
# Error Handling
# ====================================
handle_error() {
    local exit_code=$?
    local line_number=$1
    echo "Error occurred in script at line: $line_number"
    echo "Exit code: $exit_code"
    cleanup
    exit $exit_code
}

trap 'handle_error ${LINENO}' ERR

# ====================================
# Utility Functions
# ====================================
log_info() {
    echo "[INFO] $1"
}

log_error() {
    echo "[ERROR] $1" >&2
}

log_warning() {
    echo "[WARNING] $1" >&2
}

cleanup() {
    log_info "Performing cleanup..."
    # Remove temporary files if any
    rm -f /tmp/ig_*.tmp 2>/dev/null || true
}

# ====================================
# Validation Functions
# ====================================
validate_environment() {
    log_info "Validating environment configuration..."
    
    if [[ -z "$FIREBASE_PROJECT_ID" ]]; then
        log_error "FIREBASE_PROJECT_ID is not set"
        return 1
    fi
    
    if [[ -z "$GCP_PROJECT_ID" ]]; then
        log_error "GCP_PROJECT_ID is not set"
        return 1
    fi
    
    if [[ -z "$SERVICE_ACCOUNT_EMAIL" ]]; then
        log_error "SERVICE_ACCOUNT_EMAIL is not set"
        return 1
    fi
    
    log_info "Environment validation completed successfully"
    return 0
}

validate_gcp_auth() {
    log_info "Validating GCP authentication..."
    
    if ! gcloud auth list 2>&1 | grep -q "$SERVICE_ACCOUNT_EMAIL"; then
        log_error "Not authenticated with correct service account"
        return 1
    fi
    
    if ! gcloud config get-value project 2>/dev/null | grep -q "$GCP_PROJECT_ID"; then
        log_error "GCP project not correctly configured"
        return 1
    fi
    
    log_info "GCP authentication validated successfully"
    return 0
}

# ====================================
# Configuration Functions
# ====================================
configure_firebase() {
    log_info "Configuring Firebase..."
    
    if ! firebase use "$FIREBASE_PROJECT_ID"; then
        log_error "Failed to set Firebase project"
        return 1
    fi
    
    log_info "Firebase configuration completed successfully"
    return 0
}

configure_gcp() {
    log_info "Configuring GCP..."
    
    if ! gcloud config set project "$GCP_PROJECT_ID"; then
        log_error "Failed to set GCP project"
        return 1
    fi
    
    if ! gcloud config set compute/region "$GCP_REGION"; then
        log_error "Failed to set GCP region"
        return 1
    fi
    
    log_info "GCP configuration completed successfully"
    return 0
}

# ====================================
# Integration Gateway Configuration
# ====================================
configure_integration_gateway() {
    log_info "Configuring Integration Gateway..."
    
    # Create necessary configuration directories
    mkdir -p config
    
    # Generate service account key if not exists
    if [[ ! -f "config/service-account-key.json" ]]; then
        log_info "Generating service account key..."
        gcloud iam service-accounts keys create config/service-account-key.json \
            --iam-account="$SERVICE_ACCOUNT_EMAIL"
    fi
    
    # Configure environment for service
    log_info "Updating service configuration..."
    {
        echo "FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID"
        echo "GCP_PROJECT_ID=$GCP_PROJECT_ID"
        echo "GCP_REGION=$GCP_REGION"
        echo "CLOUD_RUN_REGION=$CLOUD_RUN_REGION"
        echo "SERVICE_ACCOUNT_EMAIL=$SERVICE_ACCOUNT_EMAIL"
    } > config/.env
    
    log_info "Integration Gateway configuration completed successfully"
    return 0
}

# ====================================
# Main Execution
# ====================================
main() {
    log_info "Starting Integration Gateway configuration..."
    
    # Validate environment and authentication
    validate_environment || exit 1
    validate_gcp_auth || exit 1
    
    # Configure cloud services
    configure_firebase || exit 1
    configure_gcp || exit 1
    
    # Configure Integration Gateway
    configure_integration_gateway || exit 1
    
    log_info "Integration Gateway configuration completed successfully"
    return 0
}

# Execute main function
main "$@"

#!/bin/bash

# Integration Gateway Configuration
# -------------------------------
# This script configures the Integration Gateway for Day 1 initialization.
# It sets up environment variables, configures GCP and Firebase services,
# and performs necessary validations.

# Exit on any error
set -e

# Error handling function
handle_error() {
    local exit_code=$?
    echo "Error occurred in script at line: ${1}" >&2
    exit $exit_code
}

# Set error handler
trap 'handle_error ${LINENO}' ERR

# Environment Variables
# -------------------
export FIREBASE_PROJECT_ID="api-for-warp-drive"
export FIREBASE_SITE_DESKTOP="website-builds"
export FIREBASE_SITE_MOBILE="app-2100-cool"
export GCP_PROJECT_ID="api-for-warp-drive"
export GCP_REGION="us-west1"
export CLOUD_RUN_REGION="us-west1"
export SERVICE_ACCOUNT_EMAIL="drlucyautomation@api-for-warp-drive.iam.gserviceaccount.com"

# Domain configuration
# ------------------
export PRIMARY_DOMAIN="app.2100.cool"
export API_DOMAIN="api.2100.cool"
export BACKEND_DOMAIN="fireback.2100.cool"

# Project configuration
# -------------------
export PROJECT_NUMBER="859242575175"
export OWNER_EMAIL="pr@coaching2100.com"

# Validation function
validate_environment() {
    local required_vars=(
        "FIREBASE_PROJECT_ID"
        "GCP_PROJECT_ID"
        "GCP_REGION"
        "SERVICE_ACCOUNT_EMAIL"
        "PRIMARY_DOMAIN"
    )

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo "Error: Required environment variable $var is not set" >&2
            exit 1
        fi
    done
}

# Service Configuration Function
configure_services() {
    echo "Configuring GCP services..."
    gcloud config set project "$GCP_PROJECT_ID"
    gcloud config set compute/region "$GCP_REGION"
    
    echo "Configuring Firebase project..."
    firebase use "$FIREBASE_PROJECT_ID"
}

# Main execution
main() {
    echo "Starting Integration Gateway configuration..."
    
    # Validate environment
    validate_environment
    
    # Configure services
    configure_services
    
    echo "Integration Gateway configuration completed successfully."
}

# Execute main function
main

#!/bin/bash

# Integration Gateway Configuration Script
# This script sets up the initial configuration for the Integration Gateway

set -e
set -u

# Configuration variables
export GCP_PROJECT_ID="api-for-warp-drive"
export GCP_REGION="us-west1"
export CLOUD_RUN_REGION="us-west1"
export SERVICE_ACCOUNT_EMAIL="drlucyautomation@api-for-warp-drive.iam.gserviceaccount.com"

# Firebase configuration
export FIREBASE_PROJECT_ID="api-for-warp-drive"
export FIREBASE_SITE_DESKTOP="website-builds"
export FIREBASE_SITE_MOBILE="app-2100-cool"

# Domain configuration
export DOMAIN_MAIN="2100.cool"
export DOMAIN_API="api.2100.cool"
export DOMAIN_APP="app.2100.cool"

# Integration Gateway setup
echo "Setting up Integration Gateway configuration..."

# Verify GCP authentication
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "^${SERVICE_ACCOUNT_EMAIL}$"; then
    echo "Authenticating with GCP service account..."
    gcloud auth activate-service-account "$SERVICE_ACCOUNT_EMAIL" --key-file=service-account-key.json
fi

# Set project configuration
gcloud config set project "$GCP_PROJECT_ID"
gcloud config set run/region "$CLOUD_RUN_REGION"

# Initialize Firebase configuration
echo "Initializing Firebase configuration..."
if ! command -v firebase &> /dev/null; then
    echo "Installing Firebase CLI..."
    npm install -g firebase-tools
fi

firebase use "$FIREBASE_PROJECT_ID"

# Set up Cloud Run service
echo "Configuring Cloud Run service..."
gcloud services enable run.googleapis.com

# Create necessary directories
mkdir -p config/secrets
mkdir -p config/endpoints

# Set permissions
chmod 700 config/secrets

echo "Integration Gateway configuration complete."

#!/bin/bash

# Integration Gateway Configuration Script
# This script initializes and configures the Integration Gateway with all necessary
# components and settings.

set -e  # Exit on any error
set -u  # Exit on undefined variable

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'  # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Environment Setup
setup_environment() {
    log "Setting up environment variables..."
    
    # Load environment variables from domain-secret-env-file.txt if it exists
    if [[ -f /Users/as/Downloads/domain-secret-env-file.txt ]]; then
        source /Users/as/Downloads/domain-secret-env-file.txt
    else
        error "domain-secret-env-file.txt not found"
    fi

    # Required environment variables check
    required_vars=(
        "FIREBASE_PROJECT_ID"
        "FIREBASE_SITE_DESKTOP"
        "FIREBASE_SITE_MOBILE"
        "GCP_PROJECT_ID"
        "GCP_REGION"
        "CLOUD_RUN_REGION"
        "SERVICE_ACCOUNT_EMAIL"
    )

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done

    log "Environment variables successfully configured"
}

# Configuration Validation
validate_configuration() {
    log "Validating configurations..."

    # Check GCP authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "${SERVICE_ACCOUNT_EMAIL}"; then
        error "Service account ${SERVICE_ACCOUNT_EMAIL} is not authenticated"
    fi

    # Validate project configuration
    if [[ "$(gcloud config get-value project)" != "${GCP_PROJECT_ID}" ]]; then
        log "Setting GCP project to ${GCP_PROJECT_ID}"
        gcloud config set project "${GCP_PROJECT_ID}"
    fi

    # Verify Firebase project
    if ! firebase projects:list --project "${FIREBASE_PROJECT_ID}" >/dev/null 2>&1; then
        error "Firebase project ${FIREBASE_PROJECT_ID} not accessible"
    fi

    log "Configuration validation completed successfully"
}

# Authentication Setup
setup_authentication() {
    log "Setting up authentication..."

    # Generate service account key if not exists
    if [[ ! -f service-account-key.json ]]; then
        log "Generating new service account key..."
        gcloud iam service-accounts keys create service-account-key.json \
            --iam-account="${SERVICE_ACCOUNT_EMAIL}" || error "Failed to create service account key"
    fi

    # Set up application default credentials
    export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/service-account-key.json"

    # Verify Firebase authentication
    firebase use "${FIREBASE_PROJECT_ID}" || error "Failed to set Firebase project"

    log "Authentication setup completed successfully"
}

# Endpoint Configuration
configure_endpoints() {
    log "Configuring endpoints..."

    # Define endpoints configuration file
    cat > endpoints.json << EOF
{
    "cloud_run": {
        "region": "${CLOUD_RUN_REGION}",
        "service_name": "integration-gateway",
        "min_instances": 1,
        "max_instances": 10
    },
    "firebase": {
        "desktop_site": "${FIREBASE_SITE_DESKTOP}",
        "mobile_site": "${FIREBASE_SITE_MOBILE}"
    },
    "monitoring": {
        "enabled": true,
        "log_level": "info"
    }
}
EOF

    # Configure Cloud Run service
    if ! gcloud run services describe integration-gateway --region="${CLOUD_RUN_REGION}" >/dev/null 2>&1; then
        log "Setting up Cloud Run service..."
        # Cloud Run service configuration would go here
        # This is a placeholder for actual service deployment
        warn "Cloud Run service deployment is not implemented in this script"
    fi

    log "Endpoint configuration completed successfully"
}

# Main execution flow
main() {
    log "Starting Integration Gateway configuration..."

    setup_environment
    validate_configuration
    setup_authentication
    configure_endpoints

    log "Integration Gateway configuration completed successfully"
}

# Execute main function
main "$@"

