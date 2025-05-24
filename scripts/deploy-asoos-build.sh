#!/bin/bash

#==============================================================================
# ASOOS Deployment Script
# 
# This script deploys the ASOOS components to Firebase and seeds the database.
# It handles both the Firebase Functions deployment and Firestore initialization.
# 
# Usage: ./scripts/deploy-asoos-build.sh [project-id]
#   project-id: Optional Firebase project ID (defaults to api-for-warp-drive)
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
PROJECT_ID=${1:-"api-for-warp-drive"}
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
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
echo -e "${BOLD}${BLUE}  ASOOS Deployment Script${RESET}"
echo -e "${BOLD}${BLUE}  Project ID: ${PROJECT_ID}${RESET}"
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

# Check for Firebase CLI
if ! command -v firebase &> /dev/null; then
  log "ERROR" "${RED}Firebase CLI not found. Please install with: npm install -g firebase-tools${RESET}"
  exit 1
fi

# Step 1: Check Firebase login status
log "INFO" "${BLUE}Checking Firebase login status...${RESET}"
firebase login:list | grep -q "No" && {
  log "WARN" "${YELLOW}Not logged in to Firebase. Initiating login...${RESET}"
  firebase login
}

# Step 2: Deploy Firebase Functions
log "INFO" "${BLUE}Deploying Firebase Functions...${RESET}"
log "INFO" "Project ID: ${PROJECT_ID}"

echo -e "${BOLD}${YELLOW}Deploying functions to Firebase...${RESET}"
if firebase deploy --only functions --project=${PROJECT_ID} 2>&1 | tee -a "${LOG_FILE}"; then
  log "SUCCESS" "${GREEN}Firebase Functions deployed successfully!${RESET}"
else
  log "ERROR" "${RED}Firebase Functions deployment failed!${RESET}"
  exit 1
fi

# Step 3: Seed Firestore database
log "INFO" "${BLUE}Seeding Firestore database...${RESET}"
echo -e "${BOLD}${YELLOW}Running Firestore seed script...${RESET}"

if node "${PROJECT_ROOT}/scripts/firestore/schema_seed.js" 2>&1 | tee -a "${LOG_FILE}"; then
  log "SUCCESS" "${GREEN}Firestore database seeded successfully!${RESET}"
else
  log "ERROR" "${RED}Firestore database seeding failed!${RESET}"
  exit 1
fi

# Step 4: Verify deployment
log "INFO" "${BLUE}Verifying deployment...${RESET}"
echo -e "${BOLD}${YELLOW}Checking function status...${RESET}"

if firebase functions:list --project=${PROJECT_ID} 2>&1 | tee -a "${LOG_FILE}"; then
  log "SUCCESS" "${GREEN}Functions verified successfully!${RESET}"
else
  log "ERROR" "${RED}Function verification failed!${RESET}"
  exit 1
fi

# Deployment summary
echo -e "\n${BOLD}${GREEN}=======================================${RESET}"
echo -e "${BOLD}${GREEN}  ASOOS Deployment Complete!${RESET}"
echo -e "${BOLD}${GREEN}  Project ID: ${PROJECT_ID}${RESET}"
echo -e "${BOLD}${GREEN}  Timestamp: ${TIMESTAMP}${RESET}"
echo -e "${BOLD}${GREEN}  Log: ${LOG_FILE}${RESET}"
echo -e "${BOLD}${GREEN}=======================================${RESET}"
echo -e "\n${BOLD}${BLUE}Available Functions:${RESET}"
firebase functions:list --project=${PROJECT_ID} | grep -E 'syncMessage|delegateToClaude'

log "INFO" "Deployment completed successfully"

exit 0

