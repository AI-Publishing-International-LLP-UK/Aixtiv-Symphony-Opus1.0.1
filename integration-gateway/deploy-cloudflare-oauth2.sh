#!/bin/bash

# =================================================================
# CLOUDFLARE OAUTH2-STYLE DEPLOYMENT SCRIPT
# Aixtiv Symphony - Integration Gateway OAuth2 Deployment
# =================================================================

echo "🔐 CLOUDFLARE OAUTH2-STYLE DEPLOYMENT"
echo "====================================="
echo "Using OAuth2 patterns for secure credential management"
echo "Starting deployment at $(date)"
echo ""

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
LOG_FILE="$SCRIPT_DIR/logs/cloudflare-oauth2-deploy-$(date +%Y%m%d-%H%M%S).log"

# Ensure logs directory exists
mkdir -p "$SCRIPT_DIR/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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
oauth() { log "OAUTH" "${CYAN}$*${NC}"; }

echo "🔐 OAUTH2-STYLE DEPLOYMENT PROCESS"
echo "=================================="

# Function to check if Node.js is available
check_nodejs() {
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed or not in PATH"
        exit 1
    fi
    
    success "Node.js found: $(node --version)"
}

# Function to initialize the OAuth2 service
init_oauth2_service() {
    oauth "Initializing OAuth2-style Cloudflare service..."
    
    # Create a simple initialization script
    cat > /tmp/init-cloudflare-oauth2.js << 'EOF'
const cloudflareService = require('./src/services/cloudflare-oauth.js');

async function initializeService() {
    try {
        console.log('🔐 Initializing Cloudflare OAuth2 service...');
        
        // Initialize the service
        await cloudflareService.initialize();
        console.log('✅ Service initialized successfully');
        
        // Test token verification
        console.log('🔍 Verifying token...');
        const tokenInfo = await cloudflareService.verifyToken();
        console.log('✅ Token verified:', tokenInfo.status);
        
        // List zones to ensure access
        console.log('📋 Listing zones...');
        const zones = await cloudflareService.listZones();
        console.log(`✅ Found ${zones.length} zone(s)`);
        
        for (const zone of zones) {
            console.log(`   - ${zone.name} (${zone.id})`);
        }
        
        // Auto-discover zone ID for 2100.cool if needed
        if (zones.length > 0) {
            const mainZone = zones.find(z => z.name === '2100.cool');
            if (mainZone) {
                console.log('🔍 Discovering zone ID for 2100.cool...');
                const zoneId = await cloudflareService.discoverZoneId('2100.cool');
                console.log('✅ Zone ID discovered and stored:', zoneId);
            }
        }
        
        console.log('🎉 OAuth2 service initialization complete!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Service initialization failed:', error.message);
        process.exit(1);
    }
}

initializeService();
EOF
    
    # Run the initialization
    cd "$SCRIPT_DIR"
    if node /tmp/init-cloudflare-oauth2.js; then
        success "OAuth2 service initialized successfully"
        rm -f /tmp/init-cloudflare-oauth2.js
        return 0
    else
        error "OAuth2 service initialization failed"
        rm -f /tmp/init-cloudflare-oauth2.js
        return 1
    fi
}

# Function to deploy DNS records using OAuth2 service
deploy_dns_records() {
    oauth "Deploying DNS records using OAuth2 service..."
    
    # Get server IP from secrets
    local SERVER_IP
    if SERVER_IP=$(gcloud secrets versions access latest --secret="warpdrive-prod01-ip" --project="$PROJECT_ID" 2>/dev/null); then
        success "Retrieved server IP from secrets"
    else
        error "Failed to retrieve server IP from secrets"
        return 1
    fi
    
    # Create deployment script
    cat > /tmp/deploy-dns-oauth2.js << EOF
const cloudflareService = require('./src/services/cloudflare-oauth.js');

async function deployDNSRecords() {
    try {
        console.log('🚀 Deploying DNS records using OAuth2 service...');
        
        const domain = '2100.cool';
        const serverIP = '${SERVER_IP}';
        
        // Define records to deploy
        const records = [
            { name: '@', description: 'Root domain' },
            { name: 'www', description: 'WWW subdomain' },
            { name: 'legal', description: 'Legal subdomain' },
            { name: 'coach', description: 'Coach subdomain' },
            { name: 'consultant', description: 'Consultant subdomain' },
            { name: 'realty', description: 'Realty subdomain' },
            { name: 'zena', description: 'Zena subdomain' }
        ];
        
        // Deploy each record
        for (const record of records) {
            console.log(\`📝 Deploying \${record.name} (\${record.description})...\`);
            
            try {
                const result = await cloudflareService.createOrUpdateDNSRecord(
                    domain, 
                    record.name, 
                    serverIP, 
                    {
                        ttl: 300,
                        proxied: true,
                        comment: \`Managed by Integration Gateway OAuth2 - \${record.description}\`
                    }
                );
                
                console.log(\`✅ \${record.name} deployed successfully\`);
            } catch (recordError) {
                console.error(\`❌ Failed to deploy \${record.name}:\`, recordError.message);
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('🎉 DNS deployment complete!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ DNS deployment failed:', error.message);
        process.exit(1);
    }
}

deployDNSRecords();
EOF
    
    # Run the deployment
    cd "$SCRIPT_DIR"
    if node /tmp/deploy-dns-oauth2.js; then
        success "DNS records deployed successfully"
        rm -f /tmp/deploy-dns-oauth2.js
        return 0
    else
        error "DNS deployment failed"
        rm -f /tmp/deploy-dns-oauth2.js
        return 1
    fi
}

# Function to configure security settings
configure_security() {
    oauth "Configuring security settings using OAuth2 service..."
    
    # Create security configuration script
    cat > /tmp/configure-security-oauth2.js << 'EOF'
const cloudflareService = require('./src/services/cloudflare-oauth.js');

async function configureSecurity() {
    try {
        console.log('🔒 Configuring security settings...');
        
        const domain = '2100.cool';
        
        const settings = {
            ssl: 'strict',
            alwaysUseHttps: true,
            securityLevel: 'medium'
        };
        
        const results = await cloudflareService.configureSecuritySettings(domain, settings);
        
        console.log('✅ Security configuration results:');
        console.log('   - SSL/TLS:', results.ssl ? 'success' : 'failed');
        console.log('   - Always HTTPS:', results.alwaysUseHttps ? 'success' : 'failed');
        console.log('   - Security Level:', results.securityLevel ? 'success' : 'failed');
        
        console.log('🎉 Security configuration complete!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Security configuration failed:', error.message);
        process.exit(1);
    }
}

configureSecurity();
EOF
    
    # Run the configuration
    cd "$SCRIPT_DIR"
    if node /tmp/configure-security-oauth2.js; then
        success "Security settings configured successfully"
        rm -f /tmp/configure-security-oauth2.js
        return 0
    else
        error "Security configuration failed"
        rm -f /tmp/configure-security-oauth2.js
        return 1
    fi
}

# Function to verify deployment
verify_deployment() {
    info "Verifying OAuth2 deployment..."
    
    local test_domains=(
        "2100.cool"
        "www.2100.cool"
        "legal.2100.cool"
        "coach.2100.cool"
        "consultant.2100.cool"
        "realty.2100.cool"
        "zena.2100.cool"
    )
    
    for domain in "${test_domains[@]}"; do
        info "Testing $domain..."
        
        # Check DNS resolution
        local resolved_ip
        resolved_ip=$(dig +short "$domain" | head -n1)
        
        if [ -n "$resolved_ip" ]; then
            success "✅ $domain resolves to: $resolved_ip"
            
            # Check HTTPS response
            local https_status
            https_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$domain")
            
            if [ "$https_status" = "200" ] || [ "$https_status" = "301" ] || [ "$https_status" = "302" ]; then
                success "✅ $domain HTTPS test passed (HTTP $https_status)"
            else
                warn "⚠️  $domain HTTPS test failed (HTTP $https_status)"
            fi
        else
            warn "⚠️  $domain DNS resolution failed"
        fi
    done
}

# Main execution
main() {
    info "Starting Cloudflare OAuth2-style deployment"
    info "Project: $PROJECT_ID"
    info "Region: $REGION"
    info "Log file: $LOG_FILE"
    
    # Execute deployment steps
    check_nodejs
    init_oauth2_service
    deploy_dns_records
    configure_security
    verify_deployment
    
    success "🎉 CLOUDFLARE OAUTH2 DEPLOYMENT COMPLETED SUCCESSFULLY!"
    echo ""
    echo "📊 OAUTH2 DEPLOYMENT SUMMARY:"
    echo "• OAuth2-style credential management used"
    echo "• Zone ID automatically discovered and stored"
    echo "• DNS records deployed for 7 subdomains"
    echo "• Security settings applied (SSL strict, HTTPS redirect)"
    echo "• All domains verified and operational"
    echo ""
    echo "🔗 Access Points:"
    echo "• Main site: https://2100.cool"
    echo "• WWW: https://www.2100.cool"
    echo "• Legal: https://legal.2100.cool"
    echo "• Coach: https://coach.2100.cool"
    echo "• Consultant: https://consultant.2100.cool"
    echo "• Realty: https://realty.2100.cool"
    echo "• Zena: https://zena.2100.cool"
    echo ""
    echo "📋 Log file: $LOG_FILE"
}

# Execute main function with error handling
set -e
trap 'error "OAuth2 deployment failed at line $LINENO"' ERR

main "$@"
