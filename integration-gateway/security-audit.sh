#!/bin/bash

# =================================================================
# SECURITY AUDIT SCRIPT FOR CLOUDFLARE DEPLOYMENT
# Aixtiv Symphony - Integration Gateway Security Verification
# =================================================================

echo "🔒 SECURITY AUDIT REPORT"
echo "========================"
echo "Auditing Cloudflare deployment security configuration"
echo "Starting audit at $(date)"
echo ""

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/security-audit-$(date +%Y%m%d-%H%M%S).log"

# Ensure logs directory exists
mkdir -p "$SCRIPT_DIR/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

info() { log "INFO" "${BLUE}$*${NC}"; }
warn() { log "WARN" "${YELLOW}$*${NC}"; }
error() { log "ERROR" "${RED}$*${NC}"; }
success() { log "SUCCESS" "${GREEN}$*${NC}"; }

# Test domains
declare -a domains=(
    "2100.cool"
    "legal.2100.cool"
    "coach.2100.cool"
    "consultant.2100.cool"
    "realty.2100.cool"
    "zena.2100.cool"
)

# Function to check SSL certificate
check_ssl_certificate() {
    local domain=$1
    info "Checking SSL certificate for $domain"
    
    # Check certificate validity
    local cert_info
    cert_info=$(echo | openssl s_client -connect "$domain:443" -servername "$domain" 2>/dev/null | openssl x509 -noout -text 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        success "$domain SSL certificate is valid"
        
        # Check certificate expiration
        local expiry
        expiry=$(echo | openssl s_client -connect "$domain:443" -servername "$domain" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep "notAfter" | cut -d= -f2)
        
        if [ -n "$expiry" ]; then
            info "$domain SSL expires: $expiry"
        fi
    else
        error "$domain SSL certificate check failed"
    fi
}

# Function to check security headers
check_security_headers() {
    local domain=$1
    info "Checking security headers for $domain"
    
    local headers
    headers=$(curl -s -I "https://$domain" --max-time 10)
    
    if [ $? -eq 0 ]; then
        # Check for essential security headers
        if echo "$headers" | grep -qi "strict-transport-security"; then
            success "$domain has HSTS enabled"
        else
            warn "$domain missing HSTS header"
        fi
        
        if echo "$headers" | grep -qi "x-frame-options"; then
            success "$domain has X-Frame-Options set"
        else
            warn "$domain missing X-Frame-Options header"
        fi
        
        if echo "$headers" | grep -qi "x-content-type-options"; then
            success "$domain has X-Content-Type-Options set"
        else
            warn "$domain missing X-Content-Type-Options header"
        fi
        
        if echo "$headers" | grep -qi "content-security-policy"; then
            success "$domain has Content-Security-Policy set"
        else
            warn "$domain missing Content-Security-Policy header"
        fi
    else
        error "$domain security header check failed"
    fi
}

# Function to check HTTPS redirection
check_https_redirect() {
    local domain=$1
    info "Checking HTTPS redirection for $domain"
    
    local http_response
    http_response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://$domain")
    
    if [ "$http_response" = "301" ] || [ "$http_response" = "302" ]; then
        success "$domain properly redirects HTTP to HTTPS"
    else
        warn "$domain HTTP redirection may not be configured (HTTP $http_response)"
    fi
}

# Function to check GCP secrets security
check_gcp_secrets_security() {
    info "Auditing GCP Secret Manager configuration"
    
    # Check secret access permissions
    local secrets=(
        "cloudflare-api-token"
        "cloudflare-zone-id"
        "cloudflare-email"
        "warpdrive-prod01-ip"
        "warpdrive-prod01-backup-ip"
    )
    
    for secret in "${secrets[@]}"; do
        info "Checking security for secret: $secret"
        
        # Check if secret exists
        if gcloud secrets describe "$secret" >/dev/null 2>&1; then
            success "Secret $secret exists and is accessible"
            
            # Check secret version count (should have at least 1)
            local version_count
            version_count=$(gcloud secrets versions list "$secret" --format="value(name)" | wc -l)
            
            if [ "$version_count" -gt 0 ]; then
                success "Secret $secret has $version_count version(s)"
            else
                error "Secret $secret has no versions"
            fi
        else
            error "Secret $secret is not accessible or does not exist"
        fi
    done
}

# Function to validate deployment configuration files
check_configuration_security() {
    info "Auditing configuration file security"
    
    # Check Cloudflare configuration
    local cloudflare_config="$SCRIPT_DIR/cloudflare.json"
    if [ -f "$cloudflare_config" ]; then
        success "Cloudflare configuration file exists"
        
        # Check for security headers configuration
        if grep -q "Content-Security-Policy" "$cloudflare_config"; then
            success "CSP configuration found in cloudflare.json"
        else
            warn "CSP configuration not found in cloudflare.json"
        fi
        
        if grep -q "Strict-Transport-Security" "$cloudflare_config"; then
            success "HSTS configuration found in cloudflare.json"
        else
            warn "HSTS configuration not found in cloudflare.json"
        fi
    else
        error "Cloudflare configuration file not found"
    fi
    
    # Check DNS configuration
    local dns_config="$SCRIPT_DIR/configs/domain/cloudflare-dns-config.json"
    if [ -f "$dns_config" ]; then
        success "DNS configuration file exists"
        
        # Check for security settings
        if grep -q '"ssl"' "$dns_config"; then
            success "SSL configuration found in DNS config"
        else
            warn "SSL configuration not found in DNS config"
        fi
    else
        error "DNS configuration file not found"
    fi
}

# Function to check file permissions
check_file_permissions() {
    info "Checking file permissions security"
    
    # Check script permissions
    local scripts=("deploy-cloudflare-secure.sh" "deploy-cloudflare-demo.sh" "test-cloudflare-deployment.sh")
    
    for script in "${scripts[@]}"; do
        if [ -f "$script" ]; then
            local perms
            perms=$(stat -f "%Mp%Lp" "$script" 2>/dev/null || stat -c "%a" "$script" 2>/dev/null)
            
            if [[ "$perms" =~ ^.*75[0-5]$ ]] || [[ "$perms" =~ ^.*rwx.*r.x.*r.x$ ]]; then
                success "$script has secure permissions ($perms)"
            else
                warn "$script permissions may be too permissive ($perms)"
            fi
        else
            warn "Script $script not found"
        fi
    done
    
    # Check log directory permissions
    if [ -d "logs" ]; then
        local log_perms
        log_perms=$(stat -f "%Mp%Lp" "logs" 2>/dev/null || stat -c "%a" "logs" 2>/dev/null)
        success "Logs directory permissions: $log_perms"
    fi
}

# Function to check deployment logs for security issues
check_deployment_logs() {
    info "Analyzing deployment logs for security issues"
    
    # Check latest deployment log
    local latest_log
    latest_log=$(ls -t logs/cloudflare-*-deploy-*.log 2>/dev/null | head -n1)
    
    if [ -n "$latest_log" ]; then
        success "Found latest deployment log: $latest_log"
        
        # Check for successful secret retrieval
        if grep -q "Retrieved secret:" "$latest_log"; then
            success "Secret retrieval logged successfully"
        else
            warn "No secret retrieval logs found"
        fi
        
        # Check for successful cleanup
        if grep -q "Environment cleanup completed" "$latest_log"; then
            success "Environment cleanup completed successfully"
        else
            warn "Environment cleanup not confirmed in logs"
        fi
        
        # Check for any error patterns
        local error_count
        error_count=$(grep -c "ERROR\|FAILED\|FAIL" "$latest_log" || echo "0")
        
        if [ "$error_count" -eq 0 ]; then
            success "No errors found in deployment logs"
        else
            warn "Found $error_count error(s) in deployment logs"
        fi
    else
        warn "No deployment logs found"
    fi
}

# Main execution
main() {
    info "Starting comprehensive security audit"
    info "Log file: $LOG_FILE"
    echo ""
    
    # GCP Secrets Security Audit
    echo "🔐 GCP SECRETS SECURITY AUDIT"
    echo "============================="
    check_gcp_secrets_security
    echo ""
    
    # Configuration Security Audit
    echo "📋 CONFIGURATION SECURITY AUDIT"
    echo "==============================="
    check_configuration_security
    echo ""
    
    # File Permissions Audit
    echo "📁 FILE PERMISSIONS AUDIT"
    echo "========================="
    check_file_permissions
    echo ""
    
    # Deployment Logs Audit
    echo "📊 DEPLOYMENT LOGS AUDIT"
    echo "========================"
    check_deployment_logs
    echo ""
    
    # Domain Security Audit
    echo "🌐 DOMAIN SECURITY AUDIT"
    echo "========================"
    for domain in "${domains[@]}"; do
        echo "Auditing: $domain"
        echo "-------------------"
        check_ssl_certificate "$domain"
        check_security_headers "$domain"
        check_https_redirect "$domain"
        echo ""
    done
    
    success "🎉 SECURITY AUDIT COMPLETED!"
    echo ""
    echo "📊 AUDIT SUMMARY:"
    echo "• GCP Secret Manager configuration verified"
    echo "• Configuration files security checked"
    echo "• File permissions audited"
    echo "• Deployment logs analyzed"
    echo "• Domain security validated for ${#domains[@]} domains"
    echo ""
    echo "📋 Detailed audit log: $LOG_FILE"
}

# Execute main function
main "$@"
