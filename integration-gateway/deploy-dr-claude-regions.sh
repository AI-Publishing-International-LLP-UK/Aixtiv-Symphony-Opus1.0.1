#!/bin/bash

# 🧠 Dr. Claude Multi-Region Deployment Script
# Deploy Dr. Claude instances to correct infrastructure groups

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

PROJECT_ID="api-for-warp-drive"

# Dr. Claude Infrastructure Map
declare -A DR_CLAUDE_REGIONS=(
    # MOCORIX2 (us-central1) - Master Orchestration Hub
    ["dr-claude-01"]="us-central1"  # Main orchestrator
    ["dr-claude-02"]="us-central1"  # Backup orchestrator
    ["dr-claude-03"]="us-central1"  # Backup orchestrator
    ["dr-claude-04"]="us-central1"  # Backup orchestrator
    ["dr-claude-05"]="us-central1"  # Backup orchestrator
    
    # MOCORIX (us-west1-c) - AI R&D
    ["dr-claude-06"]="us-west1"     # QRIX/RIX/CRX training
    
    # MOCOA (Client-Facing)
    ["dr-claude-07"]="us-west1"     # Client interface (us-west1-a)
    ["dr-claude-08"]="us-west1"     # Client interface (us-west1-b)
    ["dr-claude-09"]="europe-west1" # GDPR compliance
)

declare -A DR_CLAUDE_ROLES=(
    ["dr-claude-01"]="Master Orchestrator - 505K Agent Governance - Claude 4.0 Sonnet"
    ["dr-claude-02"]="Backup Orchestrator - Policy Management - Claude 4.0 Sonnet"
    ["dr-claude-03"]="Backup Orchestrator - Hierarchy Updates - Claude 4.0 Sonnet"
    ["dr-claude-04"]="Backup Orchestrator - Permissioning - Claude 4.0 Sonnet"
    ["dr-claude-05"]="Backup Orchestrator - Evolution Control - Claude 4.0 Sonnet"
    ["dr-claude-06"]="AI R&D - RIX/QRIX/CRX Training - Claude 4.0 Sonnet"
    ["dr-claude-07"]="Client Interface - MOCOA-A - Delivery Integration Training KPI Defin - Claude 4.0 Sonnet"
    ["dr-claude-08"]="Client Interface - MOCOA-B - Observation, Montioring, Adjustment Re-Instal Support Sales Claude 4.0 Sonnet"
    ["dr-claude-09"]="Client Interface - EU GDPR - KPI Rating and Recharging Reintegration Claude 4.0 Sonnet"
)

declare -A DR_CLAUDE_RESOURCES=(
    ["dr-claude-01"]="memory=2Gi,cpu=4,min=3,max=20"      # Master needs high resources
    ["dr-claude-02"]="memory=1Gi,cpu=2,min=2,max=10"     # Backup orchestrators
    ["dr-claude-03"]="memory=1Gi,cpu=2,min=2,max=10"
    ["dr-claude-04"]="memory=1Gi,cpu=2,min=2,max=10"
    ["dr-claude-05"]="memory=1Gi,cpu=2,min=2,max=10"
    ["dr-claude-06"]="memory=2Gi,cpu=4,min=2,max=15"     # AI R&D needs high resources
    ["dr-claude-07"]="memory=1Gi,cpu=2,min=2,max=10"     # Client-facing
    ["dr-claude-08"]="memory=1Gi,cpu=2,min=2,max=10"
    ["dr-claude-09"]="memory=1Gi,cpu=2,min=2,max=10"
)

log_with_timestamp() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to get current image for a service
get_current_image() {
    local service_name="$1"
    local current_region="$2"
    
    gcloud run services describe "$service_name" \
        --region="$current_region" \
        --format="value(spec.template.spec.template.spec.containers[0].image)" 2>/dev/null || echo ""
}

# Function to deploy Dr Claude instance to specific region
deploy_dr_claude() {
    local service_name="$1"
    local target_region="$2"
    local role="$3"
    local resources="$4"
    
    log_with_timestamp "${BLUE}🧠 Deploying ${service_name} to ${target_region}...${NC}"
    log_with_timestamp "${YELLOW}Role: ${role}${NC}"
    
    # Parse resources
    IFS=',' read -ra RESOURCE_PARTS <<< "$resources"
    local memory cpu min_instances max_instances
    for part in "${RESOURCE_PARTS[@]}"; do
        IFS='=' read -r key value <<< "$part"
        case $key in
            memory) memory="$value" ;;
            cpu) cpu="$value" ;;
            min) min_instances="$value" ;;
            max) max_instances="$value" ;;
        esac
    done
    
    # Try to get existing image from us-west1 first
    local current_image=$(get_current_image "$service_name" "us-west1")
    
    # If not found in us-west1, try us-central1
    if [ -z "$current_image" ]; then
        current_image=$(get_current_image "$service_name" "us-central1")
    fi
    
    # If still not found, use default Dr Claude image
    if [ -z "$current_image" ]; then
        current_image="gcr.io/${PROJECT_ID}/dr-claude:latest"
        log_with_timestamp "${YELLOW}⚠️ Using default image: ${current_image}${NC}"
    else
        log_with_timestamp "${GREEN}✅ Using existing image: ${current_image}${NC}"
    fi
    
    # Deploy to target region
    gcloud run deploy "$service_name" \
        --image="$current_image" \
        --region="$target_region" \
        --platform=managed \
        --allow-unauthenticated \
        --port=8080 \
        --memory="$memory" \
        --cpu="$cpu" \
        --min-instances="$min_instances" \
        --max-instances="$max_instances" \
        --concurrency=100 \
        --timeout=3600 \
        --set-env-vars="ROLE=${role//[^a-zA-Z0-9_-]/_},REGION=${target_region},DR_CLAUDE_ID=${service_name}" \
        --labels="infrastructure-group=${target_region//[^a-zA-Z0-9-]/-},dr-claude=true,role=${role//[^a-zA-Z0-9-]/-}" \
        --quiet
    
    if [ $? -eq 0 ]; then
        log_with_timestamp "${GREEN}✅ ${service_name} deployed successfully to ${target_region}${NC}"
        
        # Get service URL
        local service_url=$(gcloud run services describe "$service_name" \
            --region="$target_region" \
            --format="value(status.url)")
        
        log_with_timestamp "${BLUE}🔗 URL: ${service_url}${NC}"
        
        # Test deployment
        local http_status=$(curl -s -o /dev/null -w "%{http_code}" "$service_url" --max-time 10 || echo "000")
        if [ "$http_status" = "200" ] || [ "$http_status" = "404" ] || [ "$http_status" = "403" ]; then
            log_with_timestamp "${GREEN}✅ ${service_name} is responding (${http_status})${NC}"
        else
            log_with_timestamp "${YELLOW}⚠️ ${service_name} returned ${http_status}${NC}"
        fi
    else
        log_with_timestamp "${RED}❌ Failed to deploy ${service_name} to ${target_region}${NC}"
        return 1
    fi
}

# Function to clean up old deployments in wrong regions
cleanup_old_deployments() {
    log_with_timestamp "${BLUE}🧹 Cleaning up old deployments in wrong regions...${NC}"
    
    # Check for Dr Claude services in us-west1 that should be in us-central1
    for service in dr-claude-01 dr-claude-02 dr-claude-03 dr-claude-04 dr-claude-05; do
        if gcloud run services describe "$service" --region="us-west1" --quiet 2>/dev/null; then
            log_with_timestamp "${YELLOW}🗑️ Removing ${service} from us-west1 (should be in us-central1)${NC}"
            gcloud run services delete "$service" --region="us-west1" --quiet || true
        fi
    done
}

# Main deployment function
main() {
    log_with_timestamp "${PURPLE}🧠 Dr. Claude Multi-Region Deployment Starting...${NC}"
    log_with_timestamp "${BLUE}Project: ${PROJECT_ID}${NC}"
    
    # Set project
    gcloud config set project "$PROJECT_ID" --quiet
    
    echo ""
    log_with_timestamp "${PURPLE}📋 Deployment Plan:${NC}"
    echo ""
    
    # Show deployment plan
    for service in "${!DR_CLAUDE_REGIONS[@]}"; do
        local region="${DR_CLAUDE_REGIONS[$service]}"
        local role="${DR_CLAUDE_ROLES[$service]}"
        log_with_timestamp "${BLUE}${service}${NC} → ${YELLOW}${region}${NC} (${role})"
    done
    
    echo ""
    read -p "Proceed with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_with_timestamp "${YELLOW}Deployment cancelled.${NC}"
        exit 0
    fi
    
    echo ""
    log_with_timestamp "${PURPLE}🚀 Starting deployments...${NC}"
    
    # Deploy in order: orchestrators first, then R&D, then client-facing
    local deployment_order=(
        "dr-claude-01" "dr-claude-02" "dr-claude-03" "dr-claude-04" "dr-claude-05"  # Orchestrators
        "dr-claude-06"  # R&D
        "dr-claude-07" "dr-claude-08" "dr-claude-09"  # Client-facing
    )
    
    local success_count=0
    local total_count=${#deployment_order[@]}
    
    for service in "${deployment_order[@]}"; do
        local region="${DR_CLAUDE_REGIONS[$service]}"
        local role="${DR_CLAUDE_ROLES[$service]}"
        local resources="${DR_CLAUDE_RESOURCES[$service]}"
        
        if deploy_dr_claude "$service" "$region" "$role" "$resources"; then
            ((success_count++))
        fi
        
        echo ""
    done
    
    # Cleanup old deployments
    cleanup_old_deployments
    
    # Summary
    echo ""
    log_with_timestamp "${PURPLE}📊 Deployment Summary:${NC}"
    log_with_timestamp "${GREEN}✅ Successful: ${success_count}/${total_count}${NC}"
    
    if [ $success_count -eq $total_count ]; then
        log_with_timestamp "${GREEN}🎉 All Dr. Claude instances deployed successfully!${NC}"
        
        echo ""
        log_with_timestamp "${PURPLE}🧭 Infrastructure Groups Status:${NC}"
        log_with_timestamp "${BLUE}MOCORIX2 (us-central1):${NC} Master Orchestration Hub"
        log_with_timestamp "${BLUE}MOCORIX (us-west1-c):${NC} AI R&D Environment"  
        log_with_timestamp "${BLUE}MOCOA (multi-region):${NC} Client Interface Layer"
        
        echo ""
        log_with_timestamp "${GREEN}✅ Dr. Claude orchestration architecture is now properly distributed!${NC}"
    else
        log_with_timestamp "${RED}⚠️ Some deployments failed. Check logs above.${NC}"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-deploy}" in
    --help)
        echo "Dr. Claude Multi-Region Deployment Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  deploy    Deploy all Dr. Claude instances (default)"
        echo "  status    Show current deployment status"
        echo "  cleanup   Clean up old deployments"
        echo "  --help    Show this help"
        ;;
    status)
        log_with_timestamp "${PURPLE}📊 Dr. Claude Deployment Status:${NC}"
        for service in "${!DR_CLAUDE_REGIONS[@]}"; do
            local region="${DR_CLAUDE_REGIONS[$service]}"
            local url=$(gcloud run services describe "$service" --region="$region" --format="value(status.url)" 2>/dev/null || echo "NOT_DEPLOYED")
            log_with_timestamp "${BLUE}${service}${NC} (${region}): ${url}"
        done
        ;;
    cleanup)
        cleanup_old_deployments
        ;;
    *)
        main
        ;;
esac
