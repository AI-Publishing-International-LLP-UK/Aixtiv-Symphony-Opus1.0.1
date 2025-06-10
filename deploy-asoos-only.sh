#!/bin/bash

#==============================================================================
# ASOOS Frontend Build and Deploy Script
# 
# This script builds the frontend assets and deploys to Firebase Hosting.
# It ensures JavaScript files are copied from src/components to public/js.
# 
# Usage: ./deploy-with-frontend.sh
#
# Author: Aixtiv Symphony Team
# Copyright: 2025 AI Publishing International LLP
# Version: 1.0.0
#==============================================================================

# Strict error handling
set -e

# Text formatting
BOLD="\033[1m"
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
RESET="\033[0m"

# Default values
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
LOG_FILE="${PROJECT_ROOT}/logs/deploy-$(date +%Y%m%d-%H%M%S).log"

# Create logs directory if it doesn't exist
mkdir -p "${PROJECT_ROOT}/logs"

# Log function
log() {
  local level=$1
  local message=$2
  echo -e "[${TIMESTAMP}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

# Banner
echo -e "${BOLD}${BLUE}=======================================${RESET}"
echo -e "${BOLD}${BLUE}  ASOOS Interface Deployment Script${RESET}"
echo -e "${BOLD}${BLUE}  Log: ${LOG_FILE}${RESET}"
echo -e "${BOLD}${BLUE}=======================================${RESET}"

# Verify we're in the project root
if [ ! -f "${PROJECT_ROOT}/firebase.json" ]; then
  log "ERROR" "${RED}Must be run from project root directory${RESET}"
  exit 1
fi

# Function to handle errors
handle_error() {
  local exit_code=$?
  log "ERROR" "${RED}Deployment failed with exit code ${exit_code}${RESET}"
  log "ERROR" "${RED}See log file for details: ${LOG_FILE}${RESET}"
  exit $exit_code
}

# Set up error handling
trap handle_error ERR

# Step 1: Check for prerequisites
log "INFO" "${BLUE}Checking prerequisites...${RESET}"

# Check for Firebase CLI
if ! command -v firebase &> /dev/null; then
  log "ERROR" "${RED}Firebase CLI not found. Please install with: npm install -g firebase-tools${RESET}"
  exit 1
fi

# Check for jq (used for JSON parsing)
if ! command -v jq &> /dev/null; then
  log "ERROR" "${RED}jq command not found. Please install with: brew install jq${RESET}"
  exit 1
fi

# Check for build-frontend.sh script
if [ ! -f "${PROJECT_ROOT}/build-frontend.sh" ]; then
  log "ERROR" "${RED}build-frontend.sh script not found in ${PROJECT_ROOT}${RESET}"
  exit 1
fi

# Check if build-frontend.sh is executable
if [ ! -x "${PROJECT_ROOT}/build-frontend.sh" ]; then
  log "INFO" "${YELLOW}Making build-frontend.sh executable...${RESET}"
  chmod +x "${PROJECT_ROOT}/build-frontend.sh"
fi

# Step 2: Check Firebase login status
log "INFO" "${BLUE}Checking Firebase login status...${RESET}"
firebase login:list | grep -q "No" && {
  log "WARN" "${YELLOW}Not logged in to Firebase. Initiating login...${RESET}"
  firebase login
}

# Step 3: Run the build-frontend.sh script
log "INFO" "${BLUE}Building frontend assets...${RESET}"
echo -e "${BOLD}${YELLOW}Running build-frontend.sh...${RESET}"

if "${PROJECT_ROOT}/build-frontend.sh" 2>&1 | tee -a "${LOG_FILE}"; then
  log "SUCCESS" "${GREEN}Frontend assets built successfully!${RESET}"
else
  log "ERROR" "${RED}Frontend build failed!${RESET}"
  exit 1
fi

# Step 4: Verify public/js directory exists and has content
log "INFO" "${BLUE}Verifying public/js directory...${RESET}"
if [ ! -d "${PROJECT_ROOT}/public/js" ]; then
  log "ERROR" "${RED}public/js directory not found after build!${RESET}"
  exit 1
fi

js_file_count=$(find "${PROJECT_ROOT}/public/js" -type f -name "*.js" | wc -l)
if [ "$js_file_count" -eq 0 ]; then
  log "ERROR" "${RED}No JavaScript files found in public/js directory!${RESET}"
  exit 1
fi

log "SUCCESS" "${GREEN}Found ${js_file_count} JavaScript files in public/js${RESET}"

# Step 5: Configure Firebase targets if needed
log "INFO" "${BLUE}Checking Firebase hosting targets...${RESET}"

# Get the current Firebase project
FIREBASE_PROJECT=$(firebase use --json | jq -r '.default')
if [ -z "$FIREBASE_PROJECT" ]; then
  log "ERROR" "${RED}Could not determine current Firebase project.${RESET}"
  exit 1
fi
log "INFO" "${BLUE}Using Firebase project: ${FIREBASE_PROJECT}${RESET}"

# Check if targets are configured
log "INFO" "${BLUE}Checking target configurations...${RESET}"

# Function to check and configure a target
configure_target() {
  local target_name=$1
  local site_name=$2

  # Check if target exists
  if ! firebase target:get hosting $target_name > /dev/null 2>&1; then
    log "INFO" "${YELLOW}Target '$target_name' not configured. Setting up...${RESET}"
    
    # First, check if the site exists
    if ! firebase hosting:sites:get $site_name > /dev/null 2>&1; then
      log "INFO" "${YELLOW}Creating site '$site_name'...${RESET}"
      if ! firebase hosting:sites:create $site_name 2>&1 | tee -a "${LOG_FILE}"; then
        log "WARN" "${YELLOW}Could not create site. It may already exist in another project.${RESET}"
      fi
    fi
    
    # Apply the target
    if firebase target:apply hosting $target_name $site_name 2>&1 | tee -a "${LOG_FILE}"; then
      log "SUCCESS" "${GREEN}Target '$target_name' configured successfully!${RESET}"
    else
      log "ERROR" "${RED}Failed to configure target '$target_name'!${RESET}"
      return 1
    fi
  else
    log "SUCCESS" "${GREEN}Target '$target_name' already configured.${RESET}"
  fi
  return 0
}

# Configure both targets
configure_target "drclaude-live" "drclaude-live" || exit 1
configure_target "asoos.2100.cool" "asoos-2100-cool" || exit 1

# Step 6: Deploy to Firebase Hosting
log "INFO" "${BLUE}Deploying to Firebase Hosting...${RESET}"
echo -e "${BOLD}${YELLOW}Running firebase deploy...${RESET}"

if firebase deploy --only hosting 2>&1 | tee -a "${LOG_FILE}"; then
  log "SUCCESS" "${GREEN}Firebase Hosting deployment successful!${RESET}"
else
  log "ERROR" "${RED}Firebase Hosting deployment failed!${RESET}"
  exit 1
fi

# Step 7: Success message
echo -e "\n${BOLD}${GREEN}=======================================${RESET}"
echo -e "${BOLD}${GREEN}  ASOOS Deployment Complete!${RESET}"
echo -e "${BOLD}${GREEN}  Timestamp: ${TIMESTAMP}${RESET}"
echo -e "${BOLD}${GREEN}  Log: ${LOG_FILE}${RESET}"
echo -e "${BOLD}${GREEN}=======================================${RESET}"

echo -e "\n${BOLD}${BLUE}Your application is now available at:${RESET}"
echo -e "• ${YELLOW}Dr. Claude:${RESET} https://drclaude-live.web.app"
echo -e "• ${YELLOW}ASOOS:${RESET} https://asoos-2100-cool.web.app"

log "INFO" "Deployment completed successfully"

exit 0

