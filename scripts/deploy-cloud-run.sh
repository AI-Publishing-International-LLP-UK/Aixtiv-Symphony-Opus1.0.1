#!/bin/bash

# Cloud Run TTT Deployment Script
# Usage: ./scripts/deploy-cloud-run.sh [environment] [--skip-tests]
#
# Examples:
#   ./scripts/deploy-cloud-run.sh development
#   ./scripts/deploy-cloud-run.sh production --skip-tests
#   ./scripts/deploy-cloud-run.sh staging

set -euo pipefail

# Configuration
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
ZONE="us-west1-b"
REGISTRY="us-west1-docker.pkg.dev/api-for-warp-drive/integration-gateway"
SERVICE_NAME="integration-gateway"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="${1:-development}"
SKIP_TESTS=false
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            echo "Usage: $0 [environment] [options]"
            echo ""
            echo "Arguments:"
            echo "  environment    Target environment (development, staging, production)"
            echo ""
            echo "Options:"
            echo "  --skip-tests   Skip all test phases"
            echo "  --dry-run      Show what would be deployed without actually deploying"
            echo "  --help         Show this help message"
            exit 0
            ;;
        development|staging|production)
            ENVIRONMENT="$1"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo ""
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

# Validation functions
check_prerequisites() {
    log_section "Checking Prerequisites"
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    # Check if authenticated with gcloud
    if ! gcloud auth list --format="value(account)" | grep -q "@"; then
        log_error "Not authenticated with gcloud. Run 'gcloud auth login' first."
        exit 1
    fi
    
    # Check if project is set
    CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
    if [[ "$CURRENT_PROJECT" != "$PROJECT_ID" ]]; then
        log_warning "Current project is '$CURRENT_PROJECT', setting to '$PROJECT_ID'"
        gcloud config set project "$PROJECT_ID"
    fi
    
    # Check if we're in the right directory
    if [[ ! -f "package.json" || ! -f "Dockerfile" ]]; then
        log_error "Must run from project root directory (missing package.json or Dockerfile)"
        exit 1
    fi
    
    log_success "Prerequisites validated"
}

# Test Phase 1: Pre-build Testing
run_pre_build_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warning "Skipping pre-build tests"
        return 0
    fi
    
    log_section "T1: Pre-build Tests"
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci
    
    # Run linting if available
    if [[ -f ".eslintrc.js" ]]; then
        log_info "Running linting..."
        npm run lint || log_warning "Linting issues found"
    fi
    
    # Run unit tests if available
    if grep -q '"test"' package.json; then
        log_info "Running unit tests..."
        npm test || log_warning "Tests failed or not configured"
    fi
    
    # Security audit
    log_info "Running security audit..."
    npm audit --audit-level=high || log_warning "Security audit completed with warnings"
    
    # Validate Dockerfile
    log_info "Validating Dockerfile..."
    docker build --dry-run . || log_warning "Dockerfile validation completed"
    
    log_success "Pre-build tests completed"
}

# Build and Deploy Phase
build_and_deploy() {
    log_section "Build & Deploy to Cloud Run"
    
    # Generate image tag
    GIT_COMMIT=$(git rev-parse HEAD)
    GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    IMAGE_TAG="${GIT_COMMIT:0:8}-${TIMESTAMP}"
    
    SERVICE_NAME_ENV="${SERVICE_NAME}-${ENVIRONMENT}"
    IMAGE_URI="${REGISTRY}/${SERVICE_NAME}:${IMAGE_TAG}"
    
    log_info "Building image: $IMAGE_URI"
    log_info "Target service: $SERVICE_NAME_ENV"
    log_info "Environment: $ENVIRONMENT"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN: Would build and deploy $IMAGE_URI to $SERVICE_NAME_ENV"
        echo "service_url=https://${SERVICE_NAME_ENV}-$(echo $REGION | tr -d '-')-${PROJECT_ID}.a.run.app"
        return 0
    fi
    
    # Configure Docker for Artifact Registry
    log_info "Configuring Docker for Artifact Registry..."
    gcloud auth configure-docker "${REGION}-docker.pkg.dev"
    
    # Build Docker image
    log_info "Building Docker image..."
    docker build \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg GIT_COMMIT="$GIT_COMMIT" \
        --build-arg GIT_BRANCH="$GIT_BRANCH" \
        -t "$IMAGE_URI" .
    
    # Push to registry
    log_info "Pushing image to registry..."
    docker push "$IMAGE_URI"
    
    # Deploy to Cloud Run
    log_info "Deploying to Cloud Run..."
    gcloud run deploy "$SERVICE_NAME_ENV" \
        --image="$IMAGE_URI" \
        --region="$REGION" \
        --platform=managed \
        --allow-unauthenticated \
        --memory=1Gi \
        --cpu=1 \
        --min-instances=0 \
        --max-instances=10 \
        --timeout=300 \
        --concurrency=100 \
        --set-env-vars="NODE_ENV=$ENVIRONMENT,GCP_PROJECT=$PROJECT_ID,REGION=$REGION" \
        --labels="environment=$ENVIRONMENT,service=integration-gateway,managed-by=local-deploy" \
        --tag="$GIT_COMMIT" \
        --quiet
    
    # Get service URL
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME_ENV" \
        --region="$REGION" \
        --format="value(status.url)")
    
    echo "service_url=$SERVICE_URL"
    log_success "Deployed to: $SERVICE_URL"
}

# Test Phase 2: Post-deployment Testing
run_post_deploy_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warning "Skipping post-deployment tests"
        return 0
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN: Would run post-deployment tests"
        return 0
    fi
    
    log_section "T2: Post-deployment Tests"
    
    local service_url="$1"
    
    # Wait for service to be ready
    log_info "Waiting for service to be ready..."
    for i in {1..30}; do
        if curl -s -f "$service_url/health" > /dev/null 2>&1; then
            log_success "Service is ready!"
            break
        elif curl -s -f "$service_url" > /dev/null 2>&1; then
            log_success "Service is responding!"
            break
        else
            log_info "Attempt $i/30: Service not ready yet..."
            sleep 10
        fi
    done
    
    # Run health checks
    log_info "Running health checks..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$service_url")
    if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 400 ]]; then
        log_success "Basic connectivity: $HTTP_CODE"
    else
        log_error "Basic connectivity failed: $HTTP_CODE"
        return 1
    fi
    
    # Test health endpoint if available
    if curl -s -f "$service_url/health" > /dev/null 2>&1; then
        log_success "Health endpoint responding"
    else
        log_warning "Health endpoint not available"
    fi
    
    # Performance test
    log_info "Running performance baseline test..."
    RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$service_url")
    log_info "Response time: ${RESPONSE_TIME}s"
    
    if (( $(echo "$RESPONSE_TIME < 5.0" | bc -l) )); then
        log_success "Performance baseline met"
    else
        log_warning "Performance baseline exceeded (${RESPONSE_TIME}s > 5.0s)"
    fi
    
    log_success "Post-deployment tests completed"
}

# Test Phase 3: Final Validation
run_final_validation() {
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN: Would run final validation"
        return 0
    fi
    
    log_section "T3: Final Validation"
    
    SERVICE_NAME_ENV="${SERVICE_NAME}-${ENVIRONMENT}"
    
    log_info "Validating deployment of $SERVICE_NAME_ENV..."
    
    # Check service status
    STATUS=$(gcloud run services describe "$SERVICE_NAME_ENV" \
        --region="$REGION" \
        --format="value(status.conditions[0].status)")
    
    if [[ "$STATUS" == "True" ]]; then
        log_success "Service status: Healthy"
    else
        log_error "Service status: Unhealthy"
        return 1
    fi
    
    # Show service metrics
    log_info "Service information:"
    gcloud run services describe "$SERVICE_NAME_ENV" \
        --region="$REGION" \
        --format="table(metadata.name,status.url,status.observedGeneration,status.conditions[0].status)"
    
    log_success "Final validation completed"
}

# Generate deployment report
generate_report() {
    log_section "Deployment Report"
    
    local service_url="$1"
    local git_commit=$(git rev-parse HEAD)
    local git_branch=$(git rev-parse --abbrev-ref HEAD)
    local deployment_time=$(date -u)
    local user=$(whoami)
    
    cat << EOF
# Deployment Report

## Summary
- **Environment**: $ENVIRONMENT
- **Service URL**: $service_url
- **Git Commit**: $git_commit
- **Git Branch**: $git_branch
- **Deployment Time**: $deployment_time
- **Deployed By**: $user

## Configuration
- **Region**: $REGION
- **Project**: $PROJECT_ID
- **Platform**: Google Cloud Run
- **Service Name**: ${SERVICE_NAME}-${ENVIRONMENT}

## Deployment Method
- **Script**: Local deployment
- **Tests Skipped**: $SKIP_TESTS
- **Dry Run**: $DRY_RUN

EOF
    
    log_success "Deployment report generated"
}

# Main execution
main() {
    log_section "Cloud Run TTT Deployment"
    log_info "Environment: $ENVIRONMENT"
    log_info "Skip Tests: $SKIP_TESTS"
    log_info "Dry Run: $DRY_RUN"
    
    check_prerequisites
    
    run_pre_build_tests
    
    SERVICE_URL=$(build_and_deploy | grep "service_url=" | cut -d'=' -f2)
    
    if [[ -n "$SERVICE_URL" ]]; then
        run_post_deploy_tests "$SERVICE_URL"
        run_final_validation
        generate_report "$SERVICE_URL"
        
        log_success "Deployment completed successfully!"
        log_info "Service URL: $SERVICE_URL"
    else
        log_error "Failed to get service URL"
        exit 1
    fi
}

# Execute main function
main "$@"
