#!/bin/bash

# ASOOS.2100.Cool Manual Deployment Script
# This script handles manual deployment of asoos.2100.cool to Firebase

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="api-for-warp-drive"
FIREBASE_SITE="asoos-2100-cool"
TARGET_NAME="2100-cool-c624d"
REGION="us-west1"

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${PURPLE}🚀 ASOOS.2100.Cool Deployment Script${NC}"
echo "=================================================="

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"
    
    # Check if Firebase CLI is installed
    if ! command -v firebase &> /dev/null; then
        echo -e "${RED}❌ Firebase CLI not found. Install with: npm install -g firebase-tools${NC}"
        exit 1
    fi
    
    # Check if logged into Firebase
    if ! firebase projects:list &> /dev/null; then
        echo -e "${RED}❌ Not logged into Firebase. Run: firebase login${NC}"
        exit 1
    fi
    
    # Check if project exists
    if ! firebase use "$PROJECT_ID" &> /dev/null; then
        echo -e "${RED}❌ Firebase project '$PROJECT_ID' not accessible${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All prerequisites met${NC}"
}

# Function to run content sync
run_content_sync() {
    echo -e "${YELLOW}🔄 Running content synchronization...${NC}"
    
    if [[ -f "$SCRIPT_DIR/sync-asoos-content.sh" ]]; then
        bash "$SCRIPT_DIR/sync-asoos-content.sh"
    else
        echo -e "${YELLOW}⚠️  Sync script not found, manually syncing...${NC}"
        mkdir -p "$PROJECT_ROOT/public/asoos-2100-cool"
        cp "$PROJECT_ROOT/public/index.html" "$PROJECT_ROOT/public/asoos-2100-cool/index.html"
        echo -e "${GREEN}✅ Manual sync completed${NC}"
    fi
}

# Function to set Firebase targets
set_firebase_targets() {
    echo -e "${YELLOW}🎯 Setting Firebase targets...${NC}"
    
    cd "$PROJECT_ROOT"
    firebase use "$PROJECT_ID"
    firebase target:apply hosting "$TARGET_NAME" "$FIREBASE_SITE"
    
    echo -e "${GREEN}✅ Firebase targets configured${NC}"
}

# Function to deploy to Firebase
deploy_to_firebase() {
    local environment=${1:-production}
    local message="Manual deployment of asoos.2100.cool - $(date '+%Y-%m-%d %H:%M:%S')"
    
    echo -e "${YELLOW}🚀 Deploying to Firebase ($environment)...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Deploy hosting only for the specific target
    if firebase deploy --only "hosting:$TARGET_NAME" --message "$message"; then
        echo -e "${GREEN}✅ Deployment successful!${NC}"
        return 0
    else
        echo -e "${RED}❌ Deployment failed${NC}"
        return 1
    fi
}

# Function to verify deployment
verify_deployment() {
    echo -e "${YELLOW}🔍 Verifying deployment...${NC}"
    
    local urls=(
        "https://asoos-2100-cool.web.app/"
        "https://asoos.2100.cool/"
    )
    
    for url in "${urls[@]}"; do
        echo -e "${BLUE}Testing: $url${NC}"
        if curl -f -s -o /dev/null --connect-timeout 10 --max-time 30 "$url"; then
            echo -e "${GREEN}✅ $url is accessible${NC}"
        else
            echo -e "${YELLOW}⚠️  $url may not be accessible yet (DNS propagation)${NC}"
        fi
    done
}

# Function to display deployment info
display_deployment_info() {
    echo ""
    echo -e "${BLUE}=================================================="
    echo -e "${GREEN}🎉 ASOOS.2100.Cool Deployment Complete!${NC}"
    echo -e "${BLUE}=================================================="
    echo ""
    echo -e "${PURPLE}🌐 Live URLs:${NC}"
    echo -e "   Primary: ${GREEN}https://asoos.2100.cool/${NC}"
    echo -e "   Firebase: ${BLUE}https://asoos-2100-cool.web.app/${NC}"
    echo ""
    echo -e "${PURPLE}📊 Project Info:${NC}"
    echo -e "   Project ID: ${BLUE}$PROJECT_ID${NC}"
    echo -e "   Firebase Site: ${BLUE}$FIREBASE_SITE${NC}"
    echo -e "   Target Name: ${BLUE}$TARGET_NAME${NC}"
    echo -e "   Region: ${BLUE}$REGION${NC}"
    echo ""
    echo -e "${PURPLE}🔧 Management:${NC}"
    echo -e "   Firebase Console: ${BLUE}https://console.firebase.google.com/project/$PROJECT_ID/hosting/sites${NC}"
    echo -e "   Source File: ${BLUE}$PROJECT_ROOT/public/index.html${NC}"
    echo -e "   Target Directory: ${BLUE}$PROJECT_ROOT/public/asoos-2100-cool/${NC}"
    echo ""
}

# Function to show usage
show_usage() {
    echo -e "${BLUE}Usage: $0 [options]${NC}"
    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo "  -h, --help       Show this help message"
    echo "  -s, --sync-only  Only sync content, don't deploy"
    echo "  -d, --dry-run    Show what would be deployed without deploying"
    echo "  -v, --verify     Only verify current deployment"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0                  # Full deployment"
    echo "  $0 --sync-only      # Only sync content"
    echo "  $0 --verify         # Only verify deployment"
    echo ""
}

# Main execution
main() {
    local sync_only=false
    local dry_run=false
    local verify_only=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -s|--sync-only)
                sync_only=true
                shift
                ;;
            -d|--dry-run)
                dry_run=true
                shift
                ;;
            -v|--verify)
                verify_only=true
                shift
                ;;
            *)
                echo -e "${RED}❌ Unknown option: $1${NC}"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Verify only mode
    if [[ "$verify_only" == true ]]; then
        verify_deployment
        exit 0
    fi
    
    # Check prerequisites
    check_prerequisites
    
    # Run content sync
    run_content_sync
    
    # Sync only mode
    if [[ "$sync_only" == true ]]; then
        echo -e "${GREEN}✅ Content sync completed. Use without --sync-only to deploy.${NC}"
        exit 0
    fi
    
    # Dry run mode
    if [[ "$dry_run" == true ]]; then
        echo -e "${YELLOW}🔍 DRY RUN: Would deploy to $PROJECT_ID hosting target $TARGET_NAME${NC}"
        echo -e "${YELLOW}Source: $PROJECT_ROOT/public/asoos-2100-cool/${NC}"
        exit 0
    fi
    
    # Set Firebase targets
    set_firebase_targets
    
    # Deploy to Firebase
    if deploy_to_firebase; then
        echo ""
        echo -e "${YELLOW}⏳ Waiting for deployment to propagate...${NC}"
        sleep 10
        
        # Verify deployment
        verify_deployment
        
        # Display deployment info
        display_deployment_info
    else
        echo -e "${RED}❌ Deployment failed. Check the logs above for details.${NC}"
        exit 1
    fi
}

# Run main function
main "$@"
