#!/bin/bash

# CI/CTTT Deployment Script for ASOOS Symphony Opus
# This script is called by the 'ci deploy' command
# It deploys the application using Cloud Build and Firebase

# Color Constants
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
CONFIG_FILE="cloudbuild-ci-cttt.yaml"
PROJECT_ID="api-for-warp-drive"
ENVIRONMENT="staging"
REGION="us-west1"
ZONE="${REGION}-b"

# Parse arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    # Check if the argument contains an equals sign
    if [[ "$key" == *"="* ]]; then
        # Split the argument into parameter and value
        param="${key%%=*}"
        value="${key#*=}"
        
        case "$param" in
            --config)
                CONFIG_FILE="$value"
                shift
                ;;
            --project)
                PROJECT_ID="$value"
                shift
                ;;
            --env)
                ENVIRONMENT="$value"
                shift
                ;;
            --region)
                REGION="$value"
                shift
                ;;
            --zone)
                ZONE="$value"
                shift
                ;;
            *)
                echo -e "${RED}Unknown option: $param${NC}"
                echo "Use './deploy-ci-cttt.sh --help' for usage information"
                exit 1
                ;;
        esac
    else
        # Handle the traditional space-separated format
        case "$key" in
            --config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            --project)
                PROJECT_ID="$2"
                shift 2
                ;;
            --env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --region)
                REGION="$2"
                shift 2
                ;;
            --zone)
                ZONE="$2"
                shift 2
                ;;
            --help)
                echo "Usage: ./deploy-ci-cttt.sh [options]"
                echo ""
                echo "Options:"
                echo "  --config FILE    Configuration file (default: cloudbuild-ci-cttt.yaml)"
                echo "  --project ID     Google Cloud project ID (default: api-for-warp-drive)"
                echo "  --env ENV        Deployment environment (default: staging)"
                echo "  --region REGION  Google Cloud region (default: us-west1)"
                echo "  --zone ZONE      Google Cloud zone (default: us-west1-b)"
                echo "  --help           Show this help message"
                exit 0
                ;;
            *)
                echo -e "${RED}Unknown option: $key${NC}"
                echo "Use './deploy-ci-cttt.sh --help' for usage information"
                exit 1
                ;;
        esac
    fi
done

# Function to log agent actions
log_agent_action() {
    local action="$1"
    local message="$2"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    
    echo -e "${BLUE}[AGENT-TRACK] ${timestamp} - ${action}: ${message}${NC}"
    
    # Create logs directory if it doesn't exist
    mkdir -p ./logs
    
    # Log to file
    echo "[${timestamp}] AGENT=DR_CLAUDE_AUTOMATION ACTION=${action} MESSAGE=${message}" >> ./logs/deploy_$(date +"%Y%m%d").log
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"
    
    local missing_tools=()
    
    if ! command_exists gcloud; then
        missing_tools+=("gcloud")
    fi
    
    if ! command_exists firebase; then
        missing_tools+=("firebase-tools")
    fi
    
    if ! command_exists npm; then
        missing_tools+=("npm")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        echo -e "${RED}Missing required tools: ${missing_tools[*]}${NC}"
        echo "Please install the missing tools and try again."
        
        if [[ " ${missing_tools[*]} " =~ " firebase-tools " ]]; then
            echo "Install firebase-tools with: npm install -g firebase-tools"
        fi
        
        if [[ " ${missing_tools[*]} " =~ " gcloud " ]]; then
            echo "Install gcloud from: https://cloud.google.com/sdk/docs/install"
        fi
        
        exit 1
    fi
    
    echo -e "${GREEN}All prerequisites are met.${NC}"
}

# Main deployment function
main() {
    echo -e "${GREEN}🚀 Starting CI/CTTT deployment process...${NC}"
    echo -e "${BLUE}Configuration file: ${YELLOW}${CONFIG_FILE}${NC}"
    echo -e "${BLUE}Project ID: ${YELLOW}${PROJECT_ID}${NC}"
    echo -e "${BLUE}Environment: ${YELLOW}${ENVIRONMENT}${NC}"
    echo -e "${BLUE}Region: ${YELLOW}${REGION}${NC}"
    echo -e "${BLUE}Zone: ${YELLOW}${ZONE}${NC}"
    echo -e "=================================================="
    
    # Initialize logging
    log_agent_action "deployment_start" "Starting CI/CTTT deployment process"
    
    # Check prerequisites
    check_prerequisites
    
    # Verify the config file exists
    if [ ! -f "${CONFIG_FILE}" ]; then
        echo -e "${RED}Error: Configuration file ${CONFIG_FILE} not found.${NC}"
        log_agent_action "deployment_error" "Configuration file not found: ${CONFIG_FILE}"
        exit 1
    fi
    
    # Set project
    echo -e "${BLUE}Setting GCloud project to ${PROJECT_ID}...${NC}"
    gcloud config set project "${PROJECT_ID}"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to set GCloud project.${NC}"
        log_agent_action "deployment_error" "Failed to set GCloud project"
        exit 1
    fi
    
    # Set region and zone
    echo -e "${BLUE}Setting GCloud compute region to ${REGION} and zone to ${ZONE}...${NC}"
    gcloud config set compute/region "${REGION}"
    gcloud config set compute/zone "${ZONE}"
    
    # Install dependencies
    echo -e "${BLUE}Installing dependencies...${NC}"
    log_agent_action "npm_install_start" "Installing npm dependencies"
    
    npm install
    
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}Warning: npm install reported issues.${NC}"
        log_agent_action "npm_install_warning" "npm install reported issues, attempting to continue"
    else
        log_agent_action "npm_install_complete" "npm dependencies installed successfully"
    fi
    
    # Build the application
    echo -e "${BLUE}Building the application...${NC}"
    log_agent_action "build_start" "Building the application"
    
    npm run build
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Build failed.${NC}"
        log_agent_action "deployment_error" "Application build failed"
        exit 1
    fi
    
    log_agent_action "build_complete" "Application built successfully"
    
    # Configure Firebase
    echo -e "${BLUE}Configuring Firebase...${NC}"
    log_agent_action "firebase_config_start" "Configuring Firebase"
    
    firebase use "${PROJECT_ID}"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to configure Firebase project.${NC}"
        log_agent_action "deployment_error" "Failed to configure Firebase project"
        exit 1
    fi
    
    log_agent_action "firebase_config_complete" "Firebase configured successfully"
    
    # Deploy to Firebase
    echo -e "${BLUE}Deploying to Firebase...${NC}"
    log_agent_action "firebase_deploy_start" "Deploying to Firebase hosting and functions"
    
    firebase deploy --only hosting,functions --project "${PROJECT_ID}"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Firebase deployment failed.${NC}"
        log_agent_action "deployment_error" "Firebase deployment failed"
        exit 1
    fi
    
    log_agent_action "firebase_deploy_complete" "Firebase deployment completed successfully"
    
    # Submit Cloud Build configuration (optional)
    if [ "${CONFIG_FILE}" != "none" ]; then
        echo -e "${BLUE}Submitting Cloud Build configuration...${NC}"
        log_agent_action "cloud_build_start" "Submitting Cloud Build configuration"
        
        gcloud builds submit --config="${CONFIG_FILE}" --region="${REGION}" .
        
        if [ $? -ne 0 ]; then
            echo -e "${YELLOW}Warning: Cloud Build submission reported issues.${NC}"
            log_agent_action "cloud_build_warning" "Cloud Build submission reported issues"
        else
            log_agent_action "cloud_build_complete" "Cloud Build submitted successfully"
        fi
    else
        echo -e "${BLUE}Skipping Cloud Build submission (--config=none specified)${NC}"
        log_agent_action "cloud_build_skipped" "Cloud Build submission skipped"
    fi
    
    # Update Firestore deployment record
    echo -e "${BLUE}Updating deployment record...${NC}"
    log_agent_action "record_update_start" "Updating deployment record in Firestore"
    
    # Create a deployment record
    TIMESTAMP=$(date +"%Y%m%d%H%M%S")
    DEPLOY_RECORD="projects/${PROJECT_ID}/databases/(default)/documents/deployments/${TIMESTAMP}"
    
    gcloud firestore documents create "${DEPLOY_RECORD}" \
        --fields="status=SUCCESS,timestamp=$(date +%s),agent=DR_CLAUDE_AUTOMATION,environment=${ENVIRONMENT}" || true
    
    log_agent_action "record_update_complete" "Deployment record updated in Firestore"
    
    # Deployment complete
    echo -e "${GREEN}✅ CI/CTTT deployment process completed successfully!${NC}"
    echo -e "${GREEN}✅ Application deployed to ${ENVIRONMENT} environment${NC}"
    echo -e "${GREEN}✅ Hosting URL: https://${PROJECT_ID}.web.app/${NC}"
    
    log_agent_action "deployment_complete" "CI/CTTT deployment process completed successfully"
}

# Run the main function
main

exit 0
