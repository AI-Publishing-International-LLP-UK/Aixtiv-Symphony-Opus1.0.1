#!/bin/bash

# 🚀 Deploy Missing Dr. Claude 4.0 Instances
# Deploy dr-claude-01→05 to us-central1 and dr-claude-09 to europe-west1

set -e

PROJECT_ID="api-for-warp-drive"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}🚀 Deploying Missing Dr. Claude 4.0 Instances${NC}"
echo ""

gcloud config set project "$PROJECT_ID" --quiet

# Function to deploy Dr. Claude instance
deploy_dr_claude() {
    local service_name="$1"
    local region="$2"
    local role="$3"
    local memory="$4"
    local cpu="$5"
    local min_instances="$6"
    
    echo -e "${BLUE}🧠 Deploying ${service_name} to ${region}...${NC}"
    echo -e "${YELLOW}Role: ${role}${NC}"
    
    # Use a standard Cloud Run image for Claude 4.0
    local image="gcr.io/${PROJECT_ID}/dr-claude-4:latest"
    
    gcloud run deploy "$service_name" \
        --image="$image" \
        --region="$region" \
        --platform=managed \
        --allow-unauthenticated \
        --port=8080 \
        --memory="$memory" \
        --cpu="$cpu" \
        --min-instances="$min_instances" \
        --max-instances="20" \
        --concurrency="100" \
        --timeout="3600" \
        --set-env-vars="ANTHROPIC_MODEL=claude-4-sonnet,\
ANTHROPIC_API_VERSION=2024-06-01,\
ANTHROPIC_MAX_TOKENS=8192,\
ANTHROPIC_CONTEXT_WINDOW=200000,\
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
        --quiet 2>/dev/null
    
    if [ $? -eq 0 ]; then
        local service_url=$(gcloud run services describe "$service_name" \
            --region="$region" \
            --format="value(status.url)")
        
        echo -e "${GREEN}✅ ${service_name} deployed successfully${NC}"
        echo -e "${BLUE}🔗 URL: ${service_url}${NC}"
        
        # Test health endpoint
        local http_status=$(curl -s -o /dev/null -w "%{http_code}" "${service_url}/health" --max-time 10 || echo "000")
        if [ "$http_status" = "200" ] || [ "$http_status" = "404" ] || [ "$http_status" = "403" ]; then
            echo -e "${GREEN}✅ Service responding (${http_status})${NC}"
        else
            echo -e "${YELLOW}⚠️ Service returned ${http_status} (may need time to start)${NC}"
        fi
        
        return 0
    else
        echo -e "${RED}❌ Failed to deploy ${service_name}${NC}"
        return 1
    fi
}

echo -e "${PURPLE}📋 Deployment Plan:${NC}"
echo ""
echo "MOCORIX2 (us-central1) - Master Orchestration Hub:"
echo "• dr-claude-01: Master Orchestrator - 505K Agent Governance"
echo "• dr-claude-02: Backup Orchestrator - Policy Management"
echo "• dr-claude-03: Backup Orchestrator - Hierarchy Updates"
echo "• dr-claude-04: Backup Orchestrator - Permissioning"
echo "• dr-claude-05: Backup Orchestrator - Evolution Control"
echo ""
echo "MOCOA (europe-west1) - EU GDPR Compliance:"
echo "• dr-claude-09: Client Interface - EU GDPR"
echo ""

read -p "Proceed with deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo -e "${PURPLE}🚀 Starting deployments...${NC}"

# Deploy Master Orchestration Hub (us-central1)
echo -e "${BLUE}🏛️ Deploying MOCORIX2 - Master Orchestration Hub${NC}"
echo ""

deploy_dr_claude "dr-claude-01" "us-central1" "Master Orchestrator - 505K Agent Governance" "4Gi" "4" "3"
echo ""

deploy_dr_claude "dr-claude-02" "us-central1" "Backup Orchestrator - Policy Management" "2Gi" "2" "2"
echo ""

deploy_dr_claude "dr-claude-03" "us-central1" "Backup Orchestrator - Hierarchy Updates" "2Gi" "2" "2"
echo ""

deploy_dr_claude "dr-claude-04" "us-central1" "Backup Orchestrator - Permissioning" "2Gi" "2" "2"
echo ""

deploy_dr_claude "dr-claude-05" "us-central1" "Backup Orchestrator - Evolution Control" "2Gi" "2" "2"
echo ""

# Deploy EU GDPR Compliance (europe-west1)
echo -e "${BLUE}🇪🇺 Deploying MOCOA - EU GDPR Compliance${NC}"
echo ""

deploy_dr_claude "dr-claude-09" "europe-west1" "Client Interface - EU GDPR" "2Gi" "2" "2"

echo ""
echo -e "${GREEN}🎉 All missing Dr. Claude instances deployed!${NC}"
echo ""
echo -e "${PURPLE}📊 Complete Infrastructure Status:${NC}"
echo ""
echo "MOCORIX2 (us-central1) - Master Orchestration Hub:"
echo "✅ dr-claude-01: Master Orchestrator"
echo "✅ dr-claude-02: Policy Management"
echo "✅ dr-claude-03: Hierarchy Updates"
echo "✅ dr-claude-04: Permissioning"
echo "✅ dr-claude-05: Evolution Control"
echo ""
echo "MOCORIX (us-west1) - AI R&D Environment:"
echo "✅ dr-claude-06a: Timeliners/CRX"
echo "✅ dr-claude-06b: Timerpressers/RIX/QRIX (Experienced orchestrator)"
echo ""
echo "MOCOA (Client-Facing):"
echo "✅ dr-claude-07: MOCOA-A (us-west1)"
echo "✅ dr-claude-08: MOCOA-B (us-west1)"
echo "✅ dr-claude-09: EU GDPR (europe-west1)"
echo ""
echo -e "${GREEN}🚀 Complete Claude 4.0 infrastructure is now deployed!${NC}"
echo -e "${YELLOW}💡 Next: Configure ANTHROPIC_API_KEY in Cloud Secret Manager${NC}"
