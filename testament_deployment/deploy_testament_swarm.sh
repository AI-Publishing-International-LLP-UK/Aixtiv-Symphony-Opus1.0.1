#!/bin/bash

# Testament Swarm Deployment Wrapper Script
# Executes the Python testament swarm deployment with proper environment setup

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    local message="$2"
    local color="$3"
    echo -e "${color}[TESTAMENT-SWARM:${level}] $(date +'%Y-%m-%d %H:%M:%S') - ${message}${NC}"
}

# Main execution function
main() {
    log "START" "🌟 Initiating Testament Swarm Deployment..." "$BLUE"
    
    # Check if we're in the right directory
    if [[ ! -f "testament_swarm.py" ]]; then
        log "ERROR" "❌ testament_swarm.py not found. Please run from testament_deployment directory." "$RED"
        exit 1
    fi
    
    # Validate Python environment
    log "VALIDATE" "🐍 Checking Python environment..." "$YELLOW"
    if ! command -v python3 &> /dev/null; then
        log "ERROR" "❌ Python3 is not installed or not in PATH" "$RED"
        exit 1
    fi
    
    # Check for required Google Cloud authentication
    log "AUTH" "🔐 Validating Google Cloud authentication..." "$YELLOW"
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1 &> /dev/null; then
        log "ERROR" "❌ No active Google Cloud authentication found" "$RED"
        log "INFO" "ℹ️  Please run: gcloud auth login" "$YELLOW"
        exit 1
    fi
    
    # Set environment variables for us-west1 region
    export PROJECT_ID="api-for-warp-drive"
    export REGION="us-west1"
    export ZONE_PRIMARY="us-west1-b"
    export ZONE_SECONDARY="us-west1-a"
    
    log "CONFIG" "⚙️  Environment configured for region: $REGION" "$GREEN"
    log "CONFIG" "⚙️  Primary zone: $ZONE_PRIMARY, Secondary zone: $ZONE_SECONDARY" "$GREEN"
    
    # Execute the Python deployment script
    log "DEPLOY" "🚀 Executing Testament Swarm Python deployment..." "$GREEN"
    python3 testament_swarm.py "$@"
    
    # Capture exit code
    exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
        log "SUCCESS" "✅ Testament Swarm deployment completed successfully!" "$GREEN"
        log "INFO" "📄 Check the generated report file for deployment details" "$BLUE"
    else
        log "ERROR" "❌ Testament Swarm deployment failed with exit code: $exit_code" "$RED"
    fi
    
    return $exit_code
}

# Show usage information
show_usage() {
    echo "Testament Swarm Deployment Script"
    echo "Usage: $0 [options]"
    echo ""
    echo "This script deploys the complete Testament Swarm for Vision Lake Solutions"
    echo "including all VLS agents, testament verification, and swarm coordination."
    echo ""
    echo "Prerequisites:"
    echo "  - Google Cloud SDK (gcloud) installed and authenticated"
    echo "  - Firebase CLI installed"
    echo "  - kubectl installed"
    echo "  - Python 3.7+ with required packages"
    echo ""
    echo "The script will:"
    echo "  1. Validate environment and prerequisites"
    echo "  2. Setup Google Cloud infrastructure"
    echo "  3. Deploy VLS agents (Dr. agents, RIX, CRX, Co-pilots, Wing agents)"
    echo "  4. Verify testament swarm integrity"
    echo "  5. Deploy Firebase Cloud Functions"
    echo "  6. Generate comprehensive deployment report"
    echo ""
    echo "Region: us-west1 (zones: us-west1-a, us-west1-b)"
    echo "Project: api-for-warp-drive"
}

# Handle command line arguments
case "${1:-}" in
    -h|--help|help)
        show_usage
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
