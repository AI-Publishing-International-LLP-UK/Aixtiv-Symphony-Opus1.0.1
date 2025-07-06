#!/bin/bash

# 💰 Custom Cost Calculation: 6 Haikus + 3 Sonnets
# Based on your optimized strategy

export PATH="/opt/homebrew/opt/bc/bin:$PATH"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}💰 Your Optimized Dr. Claude Cost Strategy${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Cost per instance (from previous calculation)
haiku_cost=262.50
sonnet_cost=3150.00

# Your configuration
haiku_instances=6
sonnet_instances=3

echo -e "${BLUE}📋 Your Configuration:${NC}"
echo "• ${haiku_instances} Haiku instances @ \$${haiku_cost} each"
echo "• ${sonnet_instances} Sonnet instances @ \$${sonnet_cost} each"
echo ""

# Calculate costs
total_haiku_cost=$(echo "scale=2; $haiku_cost * $haiku_instances" | bc)
total_sonnet_cost=$(echo "scale=2; $sonnet_cost * $sonnet_instances" | bc)
total_anthropic_cost=$(echo "scale=2; $total_haiku_cost + $total_sonnet_cost" | bc)

# Cloud Run costs
cloud_run_per_instance=75
total_cloud_run=$(echo "scale=2; $cloud_run_per_instance * 9" | bc)

# Total infrastructure cost
total_monthly_cost=$(echo "scale=2; $total_anthropic_cost + $total_cloud_run" | bc)

echo -e "${PURPLE}💰 Monthly Cost Breakdown:${NC}"
echo ""
echo -e "${YELLOW}Anthropic API Costs:${NC}"
echo "• 6 Haiku instances:  \$${total_haiku_cost}"
echo "• 3 Sonnet instances: \$${total_sonnet_cost}"
echo "• Anthropic Total:    \$${total_anthropic_cost}"
echo ""
echo -e "${YELLOW}Google Cloud Run:${NC}"
echo "• 9 instances @ \$${cloud_run_per_instance}: \$${total_cloud_run}"
echo ""
echo -e "${GREEN}🎯 Total Monthly Cost: \$${total_monthly_cost}${NC}"
echo ""

# Show instance assignments
echo -e "${PURPLE}🏛️ Suggested Instance Assignments:${NC}"
echo ""
echo -e "${BLUE}6 Haiku Instances (Cost-Effective):${NC}"
echo "• dr-claude-02: Backup Orchestrator - Policy Management"
echo "• dr-claude-03: Backup Orchestrator - Hierarchy Updates" 
echo "• dr-claude-04: Backup Orchestrator - Permissioning"
echo "• dr-claude-05: Backup Orchestrator - Evolution Control"
echo "• dr-claude-06a: Timeliners/CRX"
echo "• dr-claude-09: EU GDPR Client Interface"
echo ""
echo -e "${BLUE}3 Sonnet Instances (High Performance):${NC}"
echo "• dr-claude-01: Master Orchestrator (505K Agent Governance)"
echo "• dr-claude-06b: Timerpressers/RIX/QRIX (Your experienced orchestrator)"
echo "• dr-claude-07: MOCOA-A Client Interface"
echo ""
echo "Missing: dr-claude-08 (MOCOA-B) - Would you like this as Haiku or Sonnet?"
echo ""

# Cost comparison
echo -e "${PURPLE}💡 Cost Comparison:${NC}"
echo "• Your strategy: \$${total_monthly_cost}/month"
echo "• All Haiku:     \$$(echo "scale=2; ($haiku_cost * 11) + ($cloud_run_per_instance * 11)" | bc)/month"
echo "• All Sonnet:    \$$(echo "scale=2; ($sonnet_cost * 11) + ($cloud_run_per_instance * 11)" | bc)/month"
echo ""
echo -e "${GREEN}✅ Your strategy saves \$$(echo "scale=2; (($sonnet_cost * 11) + ($cloud_run_per_instance * 11)) - $total_monthly_cost" | bc) vs all Sonnet!${NC}"
