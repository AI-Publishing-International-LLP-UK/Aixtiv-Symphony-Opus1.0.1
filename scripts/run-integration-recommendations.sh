#!/bin/bash
# ============================================================================
# Integration Gateway Recommendations Implementation
# 
# This script executes the chosen tasks from the integration gateway analysis
# recommendations:
# 
# 1. Generating firebase.json for multi-site hosting
# 2. Handling special character domains
# 3. Enhanced batch processing with error recovery
# 4. Domain verification and SSL monitoring
#
# Usage: ./run-integration-recommendations.sh [--all|--firebase|--domains|--batch|--monitor]
# ============================================================================

# Set strict error handling
set -e

# Configuration
PROJECT_ID="api-for-warp-drive"
REGION="us-west1"
ZONE="us-west1-b"
DOMAINS_DIR="./domains"
DOMAINS_FILE="${DOMAINS_DIR}/active-domains.txt"
BATCH_SIZE=5

# Color output
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# Print header
echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}  Integration Gateway Recommendations${NC}"
echo -e "${BLUE}============================================${NC}\n"

# Check for script location and current directory
if [[ ! -f "./firebase.json" ]]; then
  echo -e "${RED}Error: Script must be run from the integration-gateway directory${NC}"
  echo "Current directory: $(pwd)"
  exit 1
fi

# Create domains directory if it doesn't exist
if [[ ! -d "$DOMAINS_DIR" ]]; then
  echo -e "${YELLOW}Creating domains directory...${NC}"
  mkdir -p "$DOMAINS_DIR"
fi

# Check/create the active domains file if it doesn't exist
if [[ ! -f "$DOMAINS_FILE" ]]; then
  echo -e "${YELLOW}Creating sample domains file at ${DOMAINS_FILE}...${NC}"
  cat > "$DOMAINS_FILE" << EOF
# Active Domains for Aixtiv Symphony
# One domain per line, comments start with #

# Primary domains
aixtiv.com
coaching2100.com
2100.cool
asoos.2100.cool

# Special character test domains (if any)
café.example.com
prepárate.org

# Add your domains below
EOF
  echo -e "${GREEN}Created sample domains file. Please edit ${DOMAINS_FILE} with your actual domains.${NC}"
fi

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check for required dependencies
echo "Checking dependencies..."
MISSING_DEPS=0

for cmd in node firebase jq curl; do
  if ! command_exists "$cmd"; then
    echo -e "${RED}Missing dependency: ${cmd}${NC}"
    MISSING_DEPS=1
  fi
done

if [ $MISSING_DEPS -eq 1 ]; then
  echo -e "${RED}Please install the missing dependencies and try again.${NC}"
  exit 1
fi

# Check Firebase login status
echo "Checking Firebase login status..."
if ! firebase projects:list > /dev/null 2>&1; then
  echo -e "${YELLOW}You need to log in to Firebase CLI${NC}"
  firebase login
else
  echo -e "${GREEN}Firebase logged in${NC}"
fi

# Check current project
CURRENT_PROJECT=$(firebase use --json | jq -r '.current')
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
  echo -e "${YELLOW}Setting Firebase project to $PROJECT_ID${NC}"
  firebase use "$PROJECT_ID"
else
  echo -e "${GREEN}Using Firebase project: $PROJECT_ID${NC}"
fi

# Function for firebase.json generation task
run_firebase_json_generator() {
  echo -e "\n${BLUE}Task 1: Firebase.json Generator${NC}"
  echo "Generating firebase.json for multi-site hosting..."
  
  # Backup existing firebase.json
  if [[ -f "./firebase.json" ]]; then
    cp ./firebase.json ./firebase.json.$(date +"%Y%m%d%H%M%S").bak
    echo "Backed up existing firebase.json"
  fi
  
  # Run the generator script
  node firebase-json-generator.js --input="${DOMAINS_FILE}" --project="${PROJECT_ID}"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Successfully generated firebase.json${NC}"
  else
    echo -e "${RED}Error generating firebase.json${NC}"
    exit 1
  fi
}

# Function for special character domains task
run_domain_mapping() {
  echo -e "\n${BLUE}Task 2: Special Character Domain Mapping${NC}"
  echo "Creating ASCII-compatible site IDs for special character domains..."
  
  # Run the domain mapping script
  node domain-site-id-mapper.js --mode=generate --input="${DOMAINS_FILE}"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Successfully generated domain mappings${NC}"
    
    # Check for special characters
    node domain-site-id-mapper.js --mode=check
    
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}Mapping validated successfully${NC}"
      
      # Apply mapping to .firebaserc
      node domain-site-id-mapper.js --mode=apply
      
      if [ $? -eq 0 ]; then
        echo -e "${GREEN}Successfully applied mappings to Firebase configuration${NC}"
      else
        echo -e "${RED}Error applying mappings${NC}"
        exit 1
      fi
    else
      echo -e "${RED}Error validating mappings${NC}"
      exit 1
    fi
  else
    echo -e "${RED}Error generating domain mappings${NC}"
    exit 1
  fi
}

# Function for enhanced batch processing
run_batch_processor() {
  echo -e "\n${BLUE}Task 3: Enhanced Batch Processing${NC}"
  echo "Running enhanced batch processor with error recovery..."
  
  # Run the batch processor script
  node enhanced-batch-processor.js --input="${DOMAINS_FILE}" --project="${PROJECT_ID}" --batchSize="${BATCH_SIZE}"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Batch processing completed successfully${NC}"
  else
    echo -e "${RED}Error in batch processing${NC}"
    exit 1
  fi
}

# Function for domain monitoring
run_domain_monitoring() {
  echo -e "\n${BLUE}Task 4: Domain Verification and SSL Monitoring${NC}"
  echo "Setting up domain verification and SSL certificate monitoring..."
  
  # Run verification first
  echo "Running initial verification..."
  node domain-monitoring.js --mode=verify --domains="${DOMAINS_FILE}" --project="${PROJECT_ID}"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Initial verification completed${NC}"
    
    # Generate report
    echo "Generating comprehensive report..."
    node domain-monitoring.js --mode=report --domains="${DOMAINS_FILE}" --project="${PROJECT_ID}"
    
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}Report generated successfully${NC}"
      echo -e "${YELLOW}To start continuous monitoring:${NC}"
      echo "  node domain-monitoring.js --mode=monitor"
    else
      echo -e "${RED}Error generating report${NC}"
      exit 1
    fi
  else
    echo -e "${RED}Error in domain verification${NC}"
    exit 1
  fi
}

# Process command-line arguments
if [ "$#" -eq 0 ] || [ "$1" = "--all" ]; then
  # Run all tasks
  run_firebase_json_generator
  run_domain_mapping
  run_batch_processor
  run_domain_monitoring
else
  # Run specific tasks
  for arg in "$@"; do
    case $arg in
      --firebase)
        run_firebase_json_generator
        ;;
      --domains)
        run_domain_mapping
        ;;
      --batch)
        run_batch_processor
        ;;
      --monitor)
        run_domain_monitoring
        ;;
      *)
        echo -e "${RED}Unknown option: $arg${NC}"
        echo "Usage: ./run-integration-recommendations.sh [--all|--firebase|--domains|--batch|--monitor]"
        exit 1
        ;;
    esac
  done
fi

# Print completion message
echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}  Integration Gateway Tasks Completed${NC}"
echo -e "${GREEN}============================================${NC}\n"

echo "The following tasks were implemented:"
echo "1. Firebase.json generation for multi-site hosting"
echo "2. Special character domain handling with site ID mapping"
echo "3. Enhanced batch processing with error recovery"
echo "4. Domain verification and SSL certificate monitoring"

echo -e "\n${BLUE}Next Steps:${NC}"
echo "1. Review the generated configuration files"
echo "2. Deploy changes with 'firebase deploy'"
echo "3. Start continuous monitoring with 'node domain-monitoring.js --mode=monitor'"
echo "4. Set up a cron job for regular domain verification"

# Suggest cron job for monitoring
echo -e "\n${YELLOW}Suggested cron job for daily monitoring:${NC}"
echo "0 0 * * * cd $(pwd) && node domain-monitoring.js --mode=verify --alert=email --email=admin@aixtiv.com"

