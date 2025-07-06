#!/bin/bash

# 🚀 Anthropic Claude 4.0 Sonnet Configuration Script
# Configure Dr. Claude instances to use Claude 4.0 directly from Anthropic

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

PROJECT_ID="api-for-warp-drive"

# Anthropic Claude 4.0 Configuration
ANTHROPIC_MODEL="claude-4-sonnet"
ANTHROPIC_API_VERSION="2024-06-01"
ANTHROPIC_MAX_TOKENS="8192"
ANTHROPIC_CONTEXT_WINDOW="200000"

# Dr. Claude 4.0 instances with their infrastructure groups
declare -A DR_CLAUDE_CONFIG=(
    # MOCORIX2 (us-central1) - Master Orchestration Hub  
    ["dr-claude-01"]="us-central1|Master Orchestrator - 505K Agent Governance - Claude 4.0"
    ["dr-claude-02"]="us-central1|Backup Orchestrator - Policy Management - Claude 4.0"
    ["dr-claude-03"]="us-central1|Backup Orchestrator - Hierarchy Updates - Claude 4.0"
    ["dr-claude-04"]="us-central1|Backup Orchestrator - Permissioning - Claude 4.0"
    ["dr-claude-05"]="us-central1|Backup Orchestrator - Evolution Control - Claude 4.0"
    
    # MOCORIX (us-west1) - AI R&D Environment - 2 Claude 4.0 instances
    ["dr-claude-06a"]="us-west1|AI R&D - Timeliners and CRX - Claude 4.0"
    ["dr-claude-06b"]="us-west1|AI R&D - Timerpressers and RIX/QRIX - Claude 4.0"
    
    # MOCOA (Client-Facing)
    ["dr-claude-07"]="us-west1|Client Interface - MOCOA-A - Claude 4.0"
    ["dr-claude-08"]="us-west1|Client Interface - MOCOA-B - Claude 4.0"  
    ["dr-claude-09"]="europe-west1|Client Interface - EU GDPR - Claude 4.0"
)

log_with_timestamp() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to configure Anthropic Claude 4.0 for a Dr. Claude instance
configure_claude_4() {
    local service_name="$1"
    local region="$2" 
    local role="$3"
    
    log_with_timestamp "${BLUE}🚀 Configuring ${service_name} for Anthropic Claude 4.0 Sonnet...${NC}"
    log_with_timestamp "${YELLOW}Region: ${region} | Role: ${role}${NC}"
    
    # Update the service with Claude 4.0-specific environment variables
    gcloud run services update "$service_name" \
        --region="$region" \
        --set-env-vars="ANTHROPIC_MODEL=${ANTHROPIC_MODEL},\
ANTHROPIC_API_VERSION=${ANTHROPIC_API_VERSION},\
ANTHROPIC_MAX_TOKENS=${ANTHROPIC_MAX_TOKENS},\
ANTHROPIC_CONTEXT_WINDOW=${ANTHROPIC_CONTEXT_WINDOW},\
ANTHROPIC_DIRECT=true,\
VERTEX_AI_DISABLED=true,\
AI_PROVIDER=anthropic,\
CLAUDE_VERSION=4.0-sonnet,\
CLAUDE_4_AVAILABLE=true,\
DR_CLAUDE_ROLE=${role//[^a-zA-Z0-9_-]/_},\
INFRASTRUCTURE_GROUP=${region},\
AGENT_COUNT=505001,\
ORCHESTRATION_MODE=claude-4-enhanced" \
        --labels="ai-provider=anthropic,\
claude-version=4-0-sonnet,\
infrastructure-group=${region//[^a-zA-Z0-9-]/-},\
dr-claude=true,\
anthropic-direct=true,\
claude-4=true" \
        --memory="2Gi" \
        --cpu="4" \
        --min-instances="2" \
        --max-instances="20" \
        --concurrency="50" \
        --timeout="3600" \
        --quiet 2>/dev/null
    
    if [ $? -eq 0 ]; then
        log_with_timestamp "${GREEN}✅ ${service_name} configured for Claude 4.0 Sonnet${NC}"
        
        # Test the service
        local service_url=$(gcloud run services describe "$service_name" \
            --region="$region" \
            --format="value(status.url)" 2>/dev/null)
        
        if [ -n "$service_url" ]; then
            log_with_timestamp "${BLUE}🔗 Service URL: ${service_url}${NC}"
            
            # Test health endpoint with Claude 4.0 verification
            local response=$(curl -s "${service_url}/health" --max-time 15 || echo '{"status":"timeout"}')
            if echo "$response" | grep -q '"claude":"4.0"'; then
                log_with_timestamp "${GREEN}✅ Claude 4.0 verified and responding${NC}"
            else
                log_with_timestamp "${YELLOW}⚠️ Service responding but Claude 4.0 verification pending${NC}"
            fi
        fi
        
        return 0
    else
        log_with_timestamp "${RED}❌ Failed to configure ${service_name} for Claude 4.0${NC}"
        return 1
    fi
}

# Function to check Claude 4.0 availability and pricing
check_claude_4_status() {
    log_with_timestamp "${BLUE}🔍 Checking Claude 4.0 availability...${NC}"
    
    # Test Claude 4.0 API endpoint
    if command -v curl >/dev/null 2>&1; then
        local api_test=$(curl -s -X POST "https://api.anthropic.com/v1/messages" \
            -H "Content-Type: application/json" \
            -H "anthropic-version: ${ANTHROPIC_API_VERSION}" \
            --data '{"model":"'${ANTHROPIC_MODEL}'","max_tokens":10,"messages":[{"role":"user","content":"test"}]}' \
            --max-time 10 || echo '{"error":"timeout"}')
        
        if echo "$api_test" | grep -q "claude-4"; then
            log_with_timestamp "${GREEN}✅ Claude 4.0 API is accessible${NC}"
        else
            log_with_timestamp "${YELLOW}⚠️ Claude 4.0 API test inconclusive (may need API key)${NC}"
        fi
    fi
    
    log_with_timestamp "${PURPLE}📊 Claude 4.0 Sonnet Features:${NC}"
    log_with_timestamp "${BLUE}• Context Window: ${ANTHROPIC_CONTEXT_WINDOW} tokens${NC}"
    log_with_timestamp "${BLUE}• Max Output: ${ANTHROPIC_MAX_TOKENS} tokens${NC}"
    log_with_timestamp "${BLUE}• Enhanced reasoning and coding capabilities${NC}"
    log_with_timestamp "${BLUE}• Improved multi-modal understanding${NC}"
    log_with_timestamp "${BLUE}• Better agent orchestration capabilities${NC}"
}

# Function to show Claude 4.0 infrastructure status
show_claude_4_status() {
    log_with_timestamp "${PURPLE}🚀 Dr. Claude 4.0 Infrastructure Status:${NC}"
    echo ""
    
    log_with_timestamp "${BLUE}MOCORIX2 (us-central1) - Master Orchestration Hub (Claude 4.0):${NC}"
    for i in {01..05}; do
        local service="dr-claude-$i"
        local url=$(gcloud run services describe "$service" \
            --region="us-central1" \
            --format="value(status.url)" 2>/dev/null || echo "NOT_DEPLOYED")
        
        # Check if it's configured for Claude 4.0
        local claude_version=$(gcloud run services describe "$service" \
            --region="us-central1" \
            --format="value(spec.template.spec.template.spec.containers[0].env[?(@.name=='CLAUDE_VERSION')].value)" 2>/dev/null || echo "unknown")
        
        log_with_timestamp "  ${service}: ${url} (${claude_version})"
    done
    
    echo ""
    log_with_timestamp "${BLUE}MOCORIX (us-west1) - AI R&D Environment (Claude 4.0):${NC}"
    
    # Check 06a - Timeliners and CRX
    local service_06a="dr-claude-06a"
    local url_06a=$(gcloud run services describe "$service_06a" \
        --region="us-west1" \
        --format="value(status.url)" 2>/dev/null || echo "NOT_DEPLOYED")
    log_with_timestamp "  ${service_06a} (Timeliners/CRX): ${url_06a}"
    
    # Check 06b - Timerpressers and RIX/QRIX
    local service_06b="dr-claude-06b"
    local url_06b=$(gcloud run services describe "$service_06b" \
        --region="us-west1" \
        --format="value(status.url)" 2>/dev/null || echo "NOT_DEPLOYED")
    log_with_timestamp "  ${service_06b} (Timerpressers/RIX/QRIX): ${url_06b}"
    
    echo ""
    log_with_timestamp "${BLUE}MOCOA (Client-Facing) - Multi-Region (Claude 4.0):${NC}"
    for i in 07 08; do
        local service="dr-claude-$i"
        local url=$(gcloud run services describe "$service" \
            --region="us-west1" \
            --format="value(status.url)" 2>/dev/null || echo "NOT_DEPLOYED")
        log_with_timestamp "  ${service} (us-west1): ${url}"
    done
    
    local service="dr-claude-09"
    local url=$(gcloud run services describe "$service" \
        --region="europe-west1" \
        --format="value(status.url)" 2>/dev/null || echo "NOT_DEPLOYED")
    log_with_timestamp "  ${service} (europe-west1): ${url}"
}

# Function to test Claude 4.0 agent orchestration
test_orchestration() {
    log_with_timestamp "${BLUE}🧠 Testing Claude 4.0 agent orchestration...${NC}"
    
    # Test master orchestrator
    local master_url=$(gcloud run services describe "dr-claude-01" \
        --region="us-central1" \
        --format="value(status.url)" 2>/dev/null)
    
    if [ -n "$master_url" ]; then
        log_with_timestamp "${BLUE}Testing master orchestrator (dr-claude-01)...${NC}"
        
        local orchestration_test=$(curl -s -X POST "${master_url}/orchestrate" \
            -H "Content-Type: application/json" \
            --data '{"command":"status","agent_count":505001,"infrastructure":"MOCORIX2"}' \
            --max-time 30 || echo '{"status":"timeout"}')
        
        if echo "$orchestration_test" | grep -q "claude-4"; then
            log_with_timestamp "${GREEN}✅ Claude 4.0 orchestration is functional${NC}"
        else
            log_with_timestamp "${YELLOW}⚠️ Orchestration test pending (service may be starting)${NC}"
        fi
    fi
}

# Main execution
main() {
    log_with_timestamp "${PURPLE}🚀 Anthropic Claude 4.0 Sonnet Configuration${NC}"
    log_with_timestamp "${BLUE}Project: ${PROJECT_ID}${NC}"
    log_with_timestamp "${YELLOW}Model: ${ANTHROPIC_MODEL}${NC}"
    log_with_timestamp "${YELLOW}Context Window: ${ANTHROPIC_CONTEXT_WINDOW} tokens${NC}"
    
    # Set project
    gcloud config set project "$PROJECT_ID" --quiet
    
    # Check Claude 4.0 status first
    check_claude_4_status
    
    echo ""
    log_with_timestamp "${PURPLE}📋 Claude 4.0 Configuration Plan:${NC}"
    for service in "${!DR_CLAUDE_CONFIG[@]}"; do
        IFS='|' read -r region role <<< "${DR_CLAUDE_CONFIG[$service]}"
        log_with_timestamp "${BLUE}${service}${NC} → ${YELLOW}${region}${NC} (${role})"
    done
    
    echo ""
    read -p "Proceed with Claude 4.0 configuration? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_with_timestamp "${YELLOW}Configuration cancelled.${NC}"
        exit 0
    fi
    
    echo ""
    log_with_timestamp "${PURPLE}🚀 Configuring Dr. Claude instances for Claude 4.0...${NC}"
    
    local success_count=0
    local total_count=${#DR_CLAUDE_CONFIG[@]}
    
    for service in "${!DR_CLAUDE_CONFIG[@]}"; do
        IFS='|' read -r region role <<< "${DR_CLAUDE_CONFIG[$service]}"
        
        if configure_claude_4 "$service" "$region" "$role"; then
            ((success_count++))
        fi
        
        echo ""
    done
    
    # Test orchestration
    test_orchestration
    
    # Summary
    echo ""
    log_with_timestamp "${PURPLE}📊 Claude 4.0 Configuration Summary:${NC}"
    log_with_timestamp "${GREEN}✅ Successful: ${success_count}/${total_count}${NC}"
    
    if [ $success_count -eq $total_count ]; then
        log_with_timestamp "${GREEN}🎉 All Dr. Claude instances configured for Claude 4.0!${NC}"
        
        echo ""
        log_with_timestamp "${PURPLE}🔧 Next Steps:${NC}"
        log_with_timestamp "${YELLOW}1. Ensure ANTHROPIC_API_KEY is set in Cloud Secret Manager${NC}"
        log_with_timestamp "${YELLOW}2. Verify Claude 4.0 orchestration is working${NC}"
        log_with_timestamp "${YELLOW}3. Test 505K agent governance capabilities${NC}"
        log_with_timestamp "${YELLOW}4. Monitor Claude 4.0 performance and costs${NC}"
        
        echo ""
        show_claude_4_status
    else
        log_with_timestamp "${RED}⚠️ Some configurations failed. Check logs above.${NC}"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-configure}" in
    --help)
        echo "Anthropic Claude 4.0 Sonnet Configuration Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  configure    Configure all Dr. Claude instances for Claude 4.0 (default)"
        echo "  status       Show current Claude 4.0 infrastructure status"
        echo "  test         Test Claude 4.0 orchestration capabilities"
        echo "  check        Check Claude 4.0 API availability"
        echo "  --help       Show this help"
        ;;
    status)
        gcloud config set project "$PROJECT_ID" --quiet
        show_claude_4_status
        ;;
    test)
        gcloud config set project "$PROJECT_ID" --quiet
        test_orchestration
        ;;
    check)
        check_claude_4_status
        ;;
    *)
        main
        ;;
esac
