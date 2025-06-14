#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Color Constants for Enhanced Logging
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    local message="$2"
    local color="${3:-$NC}"
    
    echo -e "${color}[FIREBASE:${level}] $(date +'%Y-%m-%d %H:%M:%S') - ${message}${NC}"
}

# Main deployment function
deploy_firebase() {
    log "START" "Starting Firebase deployment process" "$GREEN"
    
    # Check if firebase CLI is installed
    if ! command -v firebase &> /dev/null; then
        log "ERROR" "Firebase CLI not found. Please install it first with 'npm install -g firebase-tools'" "$RED"
        exit 1
    fi
    
    # Set project ID
    local project_id="api-for-warp-drive"
    log "CONFIG" "Using Firebase project: $project_id" "$YELLOW"
    
    # Login to Firebase (if needed)
    log "AUTH" "Checking Firebase authentication..." "$YELLOW"
    firebase use --add "$project_id" || {
        log "AUTH" "Need to login to Firebase" "$YELLOW"
        firebase login
        firebase use --add "$project_id"
    }
    
    # Deploy to Firebase
    log "DEPLOY" "Deploying to Firebase Hosting..." "$GREEN"
    firebase deploy --only hosting || {
        log "ERROR" "Firebase deployment failed" "$RED"
        exit 1
    }
    
    log "SUCCESS" "Firebase deployment completed successfully!" "$GREEN"
}

# Run the main function
deploy_firebase
