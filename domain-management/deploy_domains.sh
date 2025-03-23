#!/bin/bash

# Script to deploy domains one by one with intervals
# First tests the final group, then deploys all other groups

set -e  # Exit immediately if a command fails

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting domain deployment process...${NC}"

# Test the final group (group 24) first
echo -e "${YELLOW}Testing the final group (group 24)...${NC}"
# Process domains one by one in the test group
success=true
while IFS= read -r domain
do
    echo -e "${YELLOW}Testing domain: ${domain}${NC}"
    if ! node --max-old-space-size=12288 ./scripts/domain-all-in-one-cli.js batch-deploy <(echo "$domain") --site specialty-domains --no-cloud-run; then
        echo -e "${RED}Failed to deploy domain: ${domain}${NC}"
        success=false
        break
    fi
    echo -e "${GREEN}Successfully deployed: ${domain}${NC}"
    echo -e "${YELLOW}Waiting 10 seconds before next domain...${NC}"
    sleep 10
done < domain_group_24

if $success; then
    echo -e "${GREEN}Final group test was successful!${NC}"
    echo -e "${YELLOW}Proceeding with deployment of all other groups...${NC}"
    
    # Deploy all other groups with 3-minute intervals
    for i in $(seq -f "%02g" 0 23); do
        echo -e "${YELLOW}Processing group ${i}...${NC}"
        
        # Process domains one by one in this group
        while IFS= read -r domain
        do
            echo -e "${YELLOW}Deploying domain: ${domain}${NC}"
            if ! node --max-old-space-size=12288 ./scripts/domain-all-in-one-cli.js batch-deploy <(echo "$domain") --site specialty-domains --no-cloud-run; then
                echo -e "${RED}Error deploying domain: ${domain}${NC}"
                echo -e "${RED}Deployment process stopped due to errors.${NC}"
                exit 1
            fi
            echo -e "${GREEN}Successfully deployed: ${domain}${NC}"
            echo -e "${YELLOW}Waiting 10 seconds before next domain...${NC}"
            sleep 10
        done < domain_group_${i}
        
        echo -e "${GREEN}Group ${i} processed successfully!${NC}"
        
        if [ "$i" != "23" ]; then
            echo -e "${YELLOW}Waiting 3 minutes before processing the next group...${NC}"
            sleep 180
        fi
    done
    
    echo -e "${GREEN}All domain groups have been deployed successfully!${NC}"
else
    echo -e "${RED}Final group test failed!${NC}"
    echo -e "${RED}Fix the issues before attempting deployment of all groups.${NC}"
    exit 1
fi

