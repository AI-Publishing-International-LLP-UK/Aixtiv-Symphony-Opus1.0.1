#!/bin/bash

#==============================================================================
# Europe Region Deployment Script for Drive Integration
# 
# This script deploys the Europe region version of the Drive Integration function.
# 
# Author: Aixtiv Symphony Team
# Copyright: 2025 AI Publishing International LLP
# Version: 1.0.0
#==============================================================================

set -e

# Text formatting
BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
RED="\033[31m"
RESET="\033[0m"

echo -e "${BOLD}${BLUE}=======================================${RESET}"
echo -e "${BOLD}${BLUE}  Europe Region Drive Integration Deploy   ${RESET}"
echo -e "${BOLD}${BLUE}=======================================${RESET}"

# Check Firebase CLI
if ! command -v firebase &> /dev/null; then
  echo -e "${RED}Firebase CLI not found. Please install with: npm install -g firebase-tools${RESET}"
  exit 1
fi

# Step 1: Install dependencies
echo -e "${BLUE}Installing dependencies...${RESET}"
cd "$(dirname "$0")/functions"
npm install

# Step 2: Deploy Europe functions only
echo -e "${BLUE}Deploying Europe Region Firebase Functions...${RESET}"
cd ..
firebase deploy --only functions:euDriveIntegrationTrigger,functions:euDriveIntegrationHealth

echo -e "\n${BOLD}${GREEN}=======================================${RESET}"
echo -e "${BOLD}${GREEN}  Europe Region Deployment Complete!       ${RESET}"
echo -e "${BOLD}${GREEN}=======================================${RESET}"

# List deployed functions
echo -e "${BLUE}Deployed Functions:${RESET}"
firebase functions:list | grep -i eu

exit 0

