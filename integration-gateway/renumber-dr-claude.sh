#!/bin/bash

# 🔄 Dr. Claude Renumbering Script
# Rename existing instances to correct infrastructure roles

set -e

PROJECT_ID="api-for-warp-drive"
REGION="us-west1"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔄 Dr. Claude Renumbering Plan:${NC}"
echo ""
echo "Current → New Role:"
echo "dr-claude → dr-claude-06b (Timerpressers and RIX/QRIX) *Uses orchestration experience*"
echo "dr-claude-01 → dr-claude-06a (Timeliners and CRX)"
echo "dr-claude-02 → dr-claude-07 (MOCOA-A Client Interface)"
echo "dr-claude-03 → dr-claude-08 (MOCOA-B Client Interface)"
echo ""

gcloud config set project "$PROJECT_ID" --quiet

# Function to rename service
rename_service() {
    local old_name="$1"
    local new_name="$2"
    local role="$3"
    
    echo -e "${BLUE}🔄 Renaming ${old_name} → ${new_name} (${role})...${NC}"
    
    # Get current image
    local current_image=$(gcloud run services describe "$old_name" \
        --region="$REGION" \
        --format="value(spec.template.spec.template.spec.containers[0].image)" 2>/dev/null)
    
    if [ -n "$current_image" ]; then
        echo -e "${YELLOW}Found image: ${current_image}${NC}"
        
        # Deploy with new name
        gcloud run deploy "$new_name" \
            --image="$current_image" \
            --region="$REGION" \
            --platform=managed \
            --allow-unauthenticated \
            --memory=2Gi \
            --cpu=4 \
            --min-instances=2 \
            --max-instances=20 \
            --set-env-vars="ANTHROPIC_MODEL=claude-4-sonnet,CLAUDE_VERSION=4.0-sonnet,DR_CLAUDE_ROLE=${role//[^a-zA-Z0-9_-]/_},AI_PROVIDER=anthropic" \
            --labels="claude-version=4-0-sonnet,dr-claude=true,anthropic-direct=true" \
            --quiet
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Successfully created ${new_name}${NC}"
            
            # Delete old service
            echo -e "${YELLOW}Deleting old service ${old_name}...${NC}"
            gcloud run services delete "$old_name" --region="$REGION" --quiet
            
            echo -e "${GREEN}✅ Renaming complete: ${old_name} → ${new_name}${NC}"
        else
            echo -e "${RED}❌ Failed to create ${new_name}${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️ Service ${old_name} not found or no image available${NC}"
        return 1
    fi
}

read -p "Proceed with renumbering? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Renumbering cancelled."
    exit 0
fi

echo ""
echo -e "${BLUE}🚀 Starting renumbering process...${NC}"

# Rename in order - start with the experienced orchestrator
rename_service "dr-claude" "dr-claude-06b" "Timerpressers and RIX/QRIX"
echo ""
rename_service "dr-claude-01" "dr-claude-06a" "Timeliners and CRX"
echo ""
rename_service "dr-claude-02" "dr-claude-07" "MOCOA-A Client Interface"  
echo ""
rename_service "dr-claude-03" "dr-claude-08" "MOCOA-B Client Interface"

echo ""
echo -e "${GREEN}🎉 Renumbering complete!${NC}"
echo ""
echo "Updated infrastructure:"
echo "• dr-claude-06a: Timeliners/CRX (us-west1)"
echo "• dr-claude-06b: Timerpressers/RIX/QRIX (us-west1) *Experienced orchestrator*"
echo "• dr-claude-07: MOCOA-A Client Interface (us-west1)"
echo "• dr-claude-08: MOCOA-B Client Interface (us-west1)"
echo ""
echo "Still needed:"
echo "• dr-claude-01→05: Master orchestration (us-central1)"
echo "• dr-claude-09: EU GDPR (europe-west1)"
