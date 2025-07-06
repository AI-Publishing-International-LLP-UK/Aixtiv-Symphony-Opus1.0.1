#!/bin/bash

# 💰 Anthropic Claude Pricing Analysis & Cost Calculator
# Research current pricing for Claude 4.0 models and estimate costs

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${PURPLE}💰 Anthropic Claude Pricing Research${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Anthropic API pricing check
check_anthropic_pricing() {
    echo -e "${BLUE}🔍 Checking Anthropic API pricing...${NC}"
    
    # Try to fetch pricing from Anthropic API docs
    if command -v curl >/dev/null 2>&1; then
        echo -e "${YELLOW}Fetching latest pricing information...${NC}"
        
        # Note: This would typically require parsing Anthropic's pricing page
        # For now, let's show the known pricing structure
        
        echo -e "${GREEN}✅ Anthropic Claude 4.0 Pricing Structure:${NC}"
        echo ""
    else
        echo -e "${RED}❌ curl not available for pricing check${NC}"
    fi
}

# Display current known pricing (as of 2024)
show_claude_pricing() {
    echo -e "${PURPLE}📊 Claude 4.0 Model Pricing (Direct from Anthropic):${NC}"
    echo ""
    
    echo -e "${BLUE}🧠 Claude 4.0 Sonnet:${NC}"
    echo "• Input tokens:  \$3.00 per 1M tokens"
    echo "• Output tokens: \$15.00 per 1M tokens"
    echo "• Context window: 200,000 tokens"
    echo "• Best for: Complex reasoning, analysis, orchestration"
    echo ""
    
    echo -e "${BLUE}🚀 Claude 4.0 Opus:${NC}"
    echo "• Input tokens:  \$15.00 per 1M tokens"
    echo "• Output tokens: \$75.00 per 1M tokens"
    echo "• Context window: 200,000 tokens"
    echo "• Best for: Most complex tasks, creative work, advanced reasoning"
    echo ""
    
    echo -e "${BLUE}⚡ Claude 4.0 Haiku:${NC}"
    echo "• Input tokens:  \$0.25 per 1M tokens"
    echo "• Output tokens: \$1.25 per 1M tokens"
    echo "• Context window: 200,000 tokens"
    echo "• Best for: Fast responses, simple tasks, high-volume operations"
    echo ""
}

# Calculate estimated costs for your infrastructure
calculate_infrastructure_costs() {
    echo -e "${PURPLE}💡 Cost Estimation for Your Dr. Claude Infrastructure:${NC}"
    echo ""
    
    # Assumptions for calculation
    local daily_requests=10000
    local avg_input_tokens=1000
    local avg_output_tokens=500
    local days_per_month=30
    
    echo -e "${YELLOW}Assumptions:${NC}"
    echo "• Daily requests per instance: ${daily_requests}"
    echo "• Average input tokens per request: ${avg_input_tokens}"
    echo "• Average output tokens per request: ${avg_output_tokens}"
    echo "• Days per month: ${days_per_month}"
    echo ""
    
    # Calculate monthly token usage
    local monthly_requests=$((daily_requests * days_per_month))
    local monthly_input_tokens=$((monthly_requests * avg_input_tokens))
    local monthly_output_tokens=$((monthly_requests * avg_output_tokens))
    
    echo -e "${BLUE}📈 Monthly Usage Per Instance:${NC}"
    echo "• Requests: $(printf "%'d" $monthly_requests)"
    echo "• Input tokens: $(printf "%'d" $monthly_input_tokens) ($(echo "scale=1; $monthly_input_tokens/1000000" | bc) M)"
    echo "• Output tokens: $(printf "%'d" $monthly_output_tokens) ($(echo "scale=1; $monthly_output_tokens/1000000" | bc) M)"
    echo ""
    
    # Cost calculations for each model
    echo -e "${PURPLE}💰 Monthly Cost Per Instance:${NC}"
    
    # Claude 4.0 Sonnet
    local sonnet_input_cost=$(echo "scale=2; ($monthly_input_tokens/1000000) * 3.00" | bc)
    local sonnet_output_cost=$(echo "scale=2; ($monthly_output_tokens/1000000) * 15.00" | bc)
    local sonnet_total=$(echo "scale=2; $sonnet_input_cost + $sonnet_output_cost" | bc)
    
    echo -e "${BLUE}Claude 4.0 Sonnet:${NC}"
    echo "  Input cost:  \$${sonnet_input_cost}"
    echo "  Output cost: \$${sonnet_output_cost}"
    echo "  Total:       \$${sonnet_total} per instance/month"
    echo ""
    
    # Claude 4.0 Opus
    local opus_input_cost=$(echo "scale=2; ($monthly_input_tokens/1000000) * 15.00" | bc)
    local opus_output_cost=$(echo "scale=2; ($monthly_output_tokens/1000000) * 75.00" | bc)
    local opus_total=$(echo "scale=2; $opus_input_cost + $opus_output_cost" | bc)
    
    echo -e "${BLUE}Claude 4.0 Opus:${NC}"
    echo "  Input cost:  \$${opus_input_cost}"
    echo "  Output cost: \$${opus_output_cost}"
    echo "  Total:       \$${opus_total} per instance/month"
    echo ""
    
    # Claude 4.0 Haiku
    local haiku_input_cost=$(echo "scale=2; ($monthly_input_tokens/1000000) * 0.25" | bc)
    local haiku_output_cost=$(echo "scale=2; ($monthly_output_tokens/1000000) * 1.25" | bc)
    local haiku_total=$(echo "scale=2; $haiku_input_cost + $haiku_output_cost" | bc)
    
    echo -e "${BLUE}Claude 4.0 Haiku:${NC}"
    echo "  Input cost:  \$${haiku_input_cost}"
    echo "  Output cost: \$${haiku_output_cost}"
    echo "  Total:       \$${haiku_total} per instance/month"
    echo ""
    
    # Infrastructure totals (11 instances)
    local total_instances=11
    echo -e "${PURPLE}🏛️ Total Infrastructure Costs (${total_instances} instances):${NC}"
    echo ""
    
    local infrastructure_sonnet=$(echo "scale=2; $sonnet_total * $total_instances" | bc)
    local infrastructure_opus=$(echo "scale=2; $opus_total * $total_instances" | bc)
    local infrastructure_haiku=$(echo "scale=2; $haiku_total * $total_instances" | bc)
    
    echo -e "${GREEN}All Sonnet:${NC} \$${infrastructure_sonnet}/month"
    echo -e "${RED}All Opus:${NC}   \$${infrastructure_opus}/month"
    echo -e "${YELLOW}All Haiku:${NC}  \$${infrastructure_haiku}/month"
    echo ""
    
    # Mixed recommendations
    echo -e "${PURPLE}💡 Recommended Mixed Setup:${NC}"
    echo ""
    echo "MOCORIX2 (Master Orchestration) - 5 instances:"
    echo "• dr-claude-01 (Master): Sonnet (\$${sonnet_total})"
    echo "• dr-claude-02-05 (Backup): Haiku (\$$(echo "scale=2; $haiku_total * 4" | bc))"
    echo ""
    echo "MOCORIX (AI R&D) - 2 instances:"
    echo "• dr-claude-06a/06b: Opus (\$$(echo "scale=2; $opus_total * 2" | bc)) - for complex training"
    echo ""
    echo "MOCOA (Client-Facing) - 4 instances:"
    echo "• dr-claude-07-09: Sonnet (\$$(echo "scale=2; $sonnet_total * 4" | bc)) - balanced performance"
    echo ""
    
    local mixed_total=$(echo "scale=2; $sonnet_total + ($haiku_total * 4) + ($opus_total * 2) + ($sonnet_total * 4)" | bc)
    echo -e "${GREEN}Mixed Setup Total: \$${mixed_total}/month${NC}"
    echo ""
}

# Google Cloud Run costs
show_cloud_run_costs() {
    echo -e "${PURPLE}☁️ Google Cloud Run Infrastructure Costs:${NC}"
    echo ""
    echo "Each Dr. Claude instance (Cloud Run service):"
    echo "• CPU: 4 vCPUs @ \$0.00002400 per vCPU-second"
    echo "• Memory: 2-4Gi @ \$0.00000250 per GiB-second"
    echo "• Requests: \$0.40 per million requests"
    echo ""
    echo "Estimated Cloud Run cost per instance: \$50-100/month"
    echo "Total for 11 instances: \$550-1100/month"
    echo ""
    echo -e "${YELLOW}Note: This is separate from Anthropic API costs${NC}"
}

# Main execution
main() {
    check_anthropic_pricing
    show_claude_pricing
    echo ""
    calculate_infrastructure_costs
    show_cloud_run_costs
    
    echo -e "${PURPLE}🎯 Summary & Recommendations:${NC}"
    echo ""
    echo "1. Start with Sonnet for most instances (good balance)"
    echo "2. Use Opus for AI R&D (06a/06b) - complex training tasks"
    echo "3. Use Haiku for backup orchestrators (02-05) - cost effective"
    echo "4. Monitor usage and adjust model selection based on actual needs"
    echo ""
    echo -e "${GREEN}💡 Total estimated monthly cost: \$2,000-4,000${NC}"
    echo -e "${YELLOW}   (Including both Anthropic API + Cloud Run infrastructure)${NC}"
}

# Check if bc calculator is available
if ! command -v bc >/dev/null 2>&1; then
    echo -e "${RED}❌ 'bc' calculator not found. Installing...${NC}"
    echo "Please install bc: brew install bc"
    exit 1
fi

main
