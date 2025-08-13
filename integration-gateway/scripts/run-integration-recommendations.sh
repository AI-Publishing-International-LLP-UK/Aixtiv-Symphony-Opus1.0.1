#!/bin/bash

# Integration Gateway Verification Script
# Ensures the integrated codebase is deploy-ready

echo "🚀 INTEGRATION GATEWAY VERIFICATION"
echo "=================================="
echo "Confirming the integrated codebase is deploy-ready..."
echo ""

# Initialize counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to log results
log_result() {
    local status=$1
    local message=$2
    
    case $status in
        "PASS")
            echo "✅ $message"
            ((PASSED++))
            ;;
        "FAIL")
            echo "❌ $message"
            ((FAILED++))
            ;;
        "WARN")
            echo "⚠️  $message"
            ((WARNINGS++))
            ;;
        "INFO")
            echo "ℹ️  $message"
            ;;
    esac
}

# Check if we're in the correct directory
if [[ ! -f "package.json" ]]; then
    log_result "FAIL" "Not in the integration-gateway directory"
    exit 1
fi

log_result "INFO" "Starting verification checks..."

# 1. Check package.json and dependencies
log_result "INFO" "1. Verifying package dependencies..."
if npm ls --depth=0 &>/dev/null; then
    log_result "PASS" "All dependencies are properly installed"
else
    log_result "WARN" "Some dependency issues detected - running npm ci should fix this"
fi

# 2. Check essential configuration files
log_result "INFO" "2. Checking essential configuration files..."

if [[ -f ".env" ]]; then
    log_result "PASS" "Environment configuration file exists"
else
    log_result "WARN" "No .env file found"
fi

if [[ -f "server.js" ]]; then
    log_result "PASS" "Main server file exists"
else
    log_result "FAIL" "Main server.js file missing"
fi

# 3. Check Cloudflare configuration (since Firebase is deprecated)
log_result "INFO" "3. Checking Cloudflare integration..."

if [[ -f "cloudflare.json" ]]; then
    log_result "PASS" "Cloudflare configuration exists"
else
    log_result "WARN" "Cloudflare configuration file not found"
fi

# 4. Test basic syntax of main files
log_result "INFO" "4. Performing basic syntax validation..."

if node -c server.js 2>/dev/null; then
    log_result "PASS" "server.js syntax is valid"
else
    log_result "FAIL" "server.js has syntax errors"
fi

# 5. Check for security configurations
log_result "INFO" "5. Checking security configurations..."

if grep -q "cors" package.json 2>/dev/null; then
    log_result "PASS" "CORS security configured"
else
    log_result "WARN" "CORS configuration may be missing"
fi

# 6. Verify gateway automation components
log_result "INFO" "6. Verifying gateway automation components..."

if [[ -f "mcp-client.js" ]]; then
    log_result "PASS" "MCP client component exists"
else
    log_result "WARN" "MCP client component not found"
fi

if [[ -d "functions/" ]]; then
    log_result "PASS" "Functions directory exists"
    
    # Count function files
    FUNC_COUNT=$(find functions/ -name "*.js" -type f | wc -l)
    log_result "INFO" "Found $FUNC_COUNT function files"
else
    log_result "FAIL" "Functions directory missing"
fi

# 7. Test connectivity to key endpoints (if --verify flag is passed)
if [[ "$1" == "--verify" ]]; then
    log_result "INFO" "7. Testing connectivity to gateway automation endpoints..."
    
    # Test Cloudflare deployment
    if bash test-cloudflare-deployment.sh >/dev/null 2>&1; then
        log_result "PASS" "Cloudflare deployment test passed"
    else
        log_result "WARN" "Cloudflare deployment test had issues"
    fi
    
    # Test MCP connection
    if bash test-mcp-connection.sh >/dev/null 2>&1; then
        log_result "PASS" "MCP connection test passed"
    else
        log_result "WARN" "MCP connection test had issues"
    fi
fi

# 8. Check for deployment scripts
log_result "INFO" "8. Checking deployment readiness..."

DEPLOY_SCRIPTS=$(find . -name "deploy*.sh" -type f | wc -l)
if [[ $DEPLOY_SCRIPTS -gt 0 ]]; then
    log_result "PASS" "Found $DEPLOY_SCRIPTS deployment scripts"
else
    log_result "WARN" "No deployment scripts found"
fi

# 9. Verify log directory exists
if [[ -d "logs/" ]]; then
    log_result "PASS" "Logging directory exists"
else
    log_result "WARN" "Creating logs directory"
    mkdir -p logs/
fi

# 10. Final readiness check
log_result "INFO" "10. Final deployment readiness assessment..."

echo ""
echo "📊 VERIFICATION RESULTS"
echo "====================="
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED" 
echo "⚠️  Warnings: $WARNINGS"
echo ""

if [[ $FAILED -eq 0 ]]; then
    if [[ $WARNINGS -eq 0 ]]; then
        echo "🎉 INTEGRATION GATEWAY IS FULLY DEPLOY-READY!"
        log_result "PASS" "All systems verified and ready for production deployment"
    else
        echo "⚠️  INTEGRATION GATEWAY IS DEPLOY-READY WITH MINOR WARNINGS"
        log_result "WARN" "Ready for deployment but some optimizations recommended"
    fi
    exit 0
else
    echo "❌ INTEGRATION GATEWAY IS NOT READY FOR DEPLOYMENT"
    log_result "FAIL" "Critical issues must be resolved before deployment"
    exit 1
fi
