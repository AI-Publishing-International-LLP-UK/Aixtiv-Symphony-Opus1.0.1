#!/bin/bash

# 💰 Realistic Usage Cost Calculator
# Calculate costs with different usage scenarios

export PATH="/opt/homebrew/opt/bc/bin:$PATH"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${PURPLE}💰 Realistic Dr. Claude Usage Cost Analysis${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Function to calculate costs for different usage levels
calculate_usage_costs() {
    local usage_name="$1"
    local daily_requests="$2"
    local avg_input_tokens="$3"
    local avg_output_tokens="$4"
    
    echo -e "${BLUE}📊 ${usage_name} Usage Scenario:${NC}"
    echo "• Daily requests per instance: $(printf "%'d" $daily_requests)"
    echo "• Average input tokens: $avg_input_tokens"
    echo "• Average output tokens: $avg_output_tokens"
    echo ""
    
    # Calculate monthly totals
    local monthly_requests=$((daily_requests * 30))
    local monthly_input_tokens=$((monthly_requests * avg_input_tokens))
    local monthly_output_tokens=$((monthly_requests * avg_output_tokens))
    
    # Haiku costs
    local haiku_input_cost=$(echo "scale=2; ($monthly_input_tokens/1000000) * 0.25" | bc)
    local haiku_output_cost=$(echo "scale=2; ($monthly_output_tokens/1000000) * 1.25" | bc)
    local haiku_total=$(echo "scale=2; $haiku_input_cost + $haiku_output_cost" | bc)
    
    # Sonnet costs
    local sonnet_input_cost=$(echo "scale=2; ($monthly_input_tokens/1000000) * 3.00" | bc)
    local sonnet_output_cost=$(echo "scale=2; ($monthly_output_tokens/1000000) * 15.00" | bc)
    local sonnet_total=$(echo "scale=2; $sonnet_input_cost + $sonnet_output_cost" | bc)
    
    # Opus costs
    local opus_input_cost=$(echo "scale=2; ($monthly_input_tokens/1000000) * 15.00" | bc)
    local opus_output_cost=$(echo "scale=2; ($monthly_output_tokens/1000000) * 75.00" | bc)
    local opus_total=$(echo "scale=2; $opus_input_cost + $opus_output_cost" | bc)
    
    echo "Monthly costs per instance:"
    echo "• Haiku:  \$${haiku_total}"
    echo "• Sonnet: \$${sonnet_total}"
    echo "• Opus:   \$${opus_total}"
    echo ""
    
    # Your 6 Haiku + 3 Sonnet strategy
    local your_strategy_cost=$(echo "scale=2; ($haiku_total * 6) + ($sonnet_total * 3) + 675" | bc)
    echo -e "${GREEN}Your Strategy (6 Haiku + 3 Sonnet + Cloud Run): \$${your_strategy_cost}/month${NC}"
    echo ""
    echo "────────────────────────────────────────────────"
    echo ""
}

# Different usage scenarios
echo -e "${PURPLE}🎯 Usage Scenarios Comparison:${NC}"
echo ""

# Light usage - getting started
calculate_usage_costs "🌱 Light Usage (Getting Started)" 100 500 200

# Moderate usage - normal operations
calculate_usage_costs "⚖️ Moderate Usage (Normal Operations)" 1000 800 300

# Heavy usage - full production
calculate_usage_costs "🚀 Heavy Usage (Full Production)" 5000 1200 500

# Very light usage - minimal testing
calculate_usage_costs "🧪 Minimal Usage (Testing/Development)" 50 300 100

echo -e "${PURPLE}💡 Key Insights:${NC}"
echo ""
echo "1. Start with LIGHT usage to test your infrastructure (~\$200-500/month)"
echo "2. Scale up to MODERATE as you gain users (~\$1,000-2,000/month)"
echo "3. The original HIGH usage estimate was very conservative"
echo "4. Haiku is incredibly cost-effective for most tasks"
echo "5. You can always upgrade individual instances to Sonnet/Opus as needed"
echo ""
echo -e "${GREEN}💰 Recommended Starting Point: \$500-1,000/month${NC}"
echo -e "${YELLOW}This gives you room to grow without breaking the bank!${NC}"
