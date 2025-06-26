#!/bin/bash
# CI/CD Deployment Script for ASOOS.2100.Cool
# Deploys asoos.2100.cool to Firebase Hosting outside of regular CI/CD pipeline

set -euo pipefail

# Color Constants
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration for ASOOS.2100.Cool
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
FIREBASE_SITE="asoos-2100-cool"
TARGET_NAME="2100-cool-c624d"
DOMAIN="asoos.2100.cool"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Logging function
log() {
    local level="$1"
    local message="$2"
    local color="${3:-$NC}"
    echo -e "${color}[${level}] $(date +'%Y-%m-%d %H:%M:%S') - ${message}${NC}"
}

# Error handling
error_exit() {
    log "ERROR" "$1" "$RED"
    exit 1
}

# Success logging
success() {
    log "SUCCESS" "$1" "$GREEN"
}

# Info logging
info() {
    log "INFO" "$1" "$BLUE"
}

# Warning logging
warn() {
    log "WARN" "$1" "$YELLOW"
}

# Check prerequisites for Firebase deployment
check_prerequisites() {
    info "Checking prerequisites for ASOOS.2100.Cool deployment..."
    
    # Check if Firebase CLI is installed
    if ! command -v firebase &> /dev/null; then
        error_exit "Firebase CLI is not installed. Install with: npm install -g firebase-tools"
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error_exit "Node.js is not installed"
    fi
    
    # Check if we're authenticated with Firebase
    if ! firebase projects:list &> /dev/null; then
        error_exit "Not authenticated with Firebase. Run 'firebase login'"
    fi
    
    # Check if project is accessible
    if ! firebase use "$PROJECT_ID" &> /dev/null; then
        error_exit "Firebase project '$PROJECT_ID' not accessible"
    fi
    
    # Check if source HTML file exists
    if [[ ! -f "$SCRIPT_DIR/public/index.html" ]]; then
        error_exit "Source HTML file not found: $SCRIPT_DIR/public/index.html"
    fi
    
    success "Prerequisites check passed"
}

# Validate and fix HTML content
validate_html() {
    info "Validating and fixing HTML content..."
    
    python3 -c "
import html
import sys

try:
    with open('$SCRIPT_DIR/public/index.html', 'r') as f:
        content = f.read()
    
    # Check for HTML entities that need to be decoded
    if '&lt;' in content or '&gt;' in content:
        print('Fixing HTML entities...')
        decoded_content = html.unescape(content)
        with open('$SCRIPT_DIR/public/index.html', 'w') as f:
            f.write(decoded_content)
        print('HTML entities fixed')
    
    # Basic HTML validation
    if not content.strip().startswith('<!DOCTYPE html>'):
        print('Missing DOCTYPE declaration')
        sys.exit(1)
    
    if '<html' not in content or '</html>' not in content:
        print('Missing HTML tags')
        sys.exit(1)
    
    print('HTML validation passed')
    
except Exception as e:
    print(f'Validation failed: {e}')
    sys.exit(1)
" || error_exit "HTML validation failed"
    
    success "HTML validation and fixing completed"
}

# Sync content to target directory
sync_content() {
    info "Syncing content to target directory..."
    
    # Create target directory
    mkdir -p "$SCRIPT_DIR/public/asoos-2100-cool"
    
    # Copy main index.html to target directory
    cp "$SCRIPT_DIR/public/index.html" "$SCRIPT_DIR/public/asoos-2100-cool/index.html"
    
    # Validate target content
    if [[ -f "$SCRIPT_DIR/public/asoos-2100-cool/index.html" ]]; then
        local size=$(wc -c < "$SCRIPT_DIR/public/asoos-2100-cool/index.html" | tr -d ' ')
        info "Content synced: ${size} bytes"
        success "Content synchronization completed"
    else
        error_exit "Content sync failed"
    fi
}

# Setup Firebase configuration
setup_firebase() {
    info "Setting up Firebase configuration..."
    
    cd "$SCRIPT_DIR"
    
    # Set project
    firebase use "$PROJECT_ID" || error_exit "Failed to set Firebase project"
    
    # Apply hosting targets
    firebase target:apply hosting "$TARGET_NAME" "$FIREBASE_SITE" || error_exit "Failed to apply Firebase targets"
    
    success "Firebase configuration completed"
}

# Deploy to Firebase Hosting
deploy_firebase() {
    local environment=${1:-production}
    local message="CI deployment of asoos.2100.cool - $(date '+%Y-%m-%d %H:%M:%S')"
    
    info "Deploying ASOOS.2100.Cool to Firebase Hosting ($environment)..."
    
    cd "$SCRIPT_DIR"
    
    # Deploy hosting only for the specific target
    if firebase deploy --only "hosting:$TARGET_NAME" --message "$message"; then
        success "Firebase deployment successful!"
        return 0
    else
        error_exit "Firebase deployment failed"
    fi
}

# Run post-deployment verification
verify_deployment() {
    info "Running post-deployment verification..."
    
    local urls=(
        "https://asoos-2100-cool.web.app/"
        "https://asoos.2100.cool/"
    )
    
    local success_count=0
    
    for url in "${urls[@]}"; do
        info "Testing: $url"
        if curl -f -s -o /dev/null --connect-timeout 10 --max-time 30 "$url"; then
            success "✅ $url is accessible"
            ((success_count++))
        else
            warn "⚠️  $url may not be accessible yet (DNS propagation)"
        fi
    done
    
    if [[ $success_count -gt 0 ]]; then
        success "At least one URL is accessible - deployment verified"
    else
        warn "No URLs are accessible yet - this may be normal for DNS propagation"
    fi
}

# Run additional content checks
run_content_checks() {
    info "Running content validation checks..."
    
    local test_url="https://asoos-2100-cool.web.app/"
    
    # Check if the page contains expected content
    if curl -s "$test_url" | grep -q "ASOOS.2100.Cool"; then
        success "Page contains expected ASOOS content"
    else
        warn "Page may not contain expected content"
    fi
    
    # Check if the page loads without errors
    if curl -f -s "$test_url" > /dev/null; then
        success "Page loads without HTTP errors"
    else
        warn "Page returned HTTP error"
    fi
    
    success "Content checks completed"
}

# Display deployment information
show_deployment_info() {
    echo
    log "INFO" "=== ASOOS.2100.Cool DEPLOYMENT COMPLETED ===" "$PURPLE"
    echo
    echo "🚀 ASOOS.2100.Cool Website Details:"
    echo "   Site Name:    $FIREBASE_SITE"
    echo "   Target Name:  $TARGET_NAME"
    echo "   Project:      $PROJECT_ID"
    echo "   Region:       $REGION"
    echo
    echo "🌐 Live URLs:"
    echo "   Primary:      https://$DOMAIN/"
    echo "   Firebase:     https://asoos-2100-cool.web.app/"
    echo
    echo "📁 Source Files:"
    echo "   Main HTML:    $SCRIPT_DIR/public/index.html"
    echo "   Target Dir:   $SCRIPT_DIR/public/asoos-2100-cool/"
    echo
    echo "🔧 Management:"
    echo "   Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID/hosting/sites"
    echo "   Target Config:    firebase.json (hosting target: $TARGET_NAME)"
    echo
    echo "📋 Next Steps:"
    echo "   1. Verify the website loads correctly at https://$DOMAIN"
    echo "   2. Test all interactive features"
    echo "   3. Monitor Firebase hosting logs"
    echo "   4. Update DNS if using custom domain"
    echo
}

# Backup current deployment
backup_current() {
    info "Creating backup of current deployment..."
    
    local backup_dir="$SCRIPT_DIR/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    if [[ -f "$SCRIPT_DIR/public/asoos-2100-cool/index.html" ]]; then
        cp "$SCRIPT_DIR/public/asoos-2100-cool/index.html" "$backup_dir/index.html"
        success "Backup created: $backup_dir"
    else
        info "No existing deployment to backup"
    fi
}

# Rollback to previous version
rollback() {
    info "Checking for available backups..."
    
    local backups_dir="$SCRIPT_DIR/backups"
    if [[ -d "$backups_dir" ]]; then
        local latest_backup=$(ls -1t "$backups_dir" | head -1)
        if [[ -n "$latest_backup" && -f "$backups_dir/$latest_backup/index.html" ]]; then
            info "Rolling back to: $latest_backup"
            cp "$backups_dir/$latest_backup/index.html" "$SCRIPT_DIR/public/asoos-2100-cool/index.html"
            deploy_firebase "rollback"
            success "Rollback completed"
        else
            error_exit "No valid backup found for rollback"
        fi
    else
        error_exit "No backups directory found"
    fi
}

# Main deployment function
main() {
    log "START" "🚀 Starting ASOOS.2100.Cool CI Deployment" "$GREEN"
    echo
    
    # Run all deployment steps
    check_prerequisites
    validate_html
    backup_current
    sync_content
    setup_firebase
    deploy_firebase
    verify_deployment
    run_content_checks
    
    echo
    show_deployment_info
    
    success "🎉 ASOOS.2100.Cool deployment completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    "test")
        info "Running verification tests only..."
        verify_deployment
        run_content_checks
        ;;
    "sync")
        info "Syncing content only..."
        check_prerequisites
        validate_html
        sync_content
        ;;
    "deploy")
        info "Deploying only..."
        check_prerequisites
        setup_firebase
        deploy_firebase
        ;;
    "backup")
        info "Creating backup only..."
        backup_current
        ;;
    "rollback")
        info "Rolling back to previous version..."
        rollback
        ;;
    "validate")
        info "Validating HTML only..."
        validate_html
        ;;
    "full")
        # Run full deployment
        main
        ;;
    "")
        # Run full deployment
        main
        ;;
    *)
        echo "Usage: $0 [command]"
        echo "Commands:"
        echo "  test      Run verification tests only"
        echo "  sync      Sync content only"
        echo "  deploy    Deploy to Firebase only"
        echo "  backup    Create backup only"
        echo "  rollback  Rollback to previous version"
        echo "  validate  Validate HTML only"
        echo "  full      Run full deployment pipeline"
        echo "  (no args) Run full deployment pipeline"
        echo ""
        echo "Examples:"
        echo "  $0                # Full deployment"
        echo "  $0 sync          # Sync content only"
        echo "  $0 test          # Run tests only"
        echo "  $0 rollback      # Rollback deployment"
        exit 1
        ;;
esac
