#!/bin/bash

#==============================================================================
# ASOOS Simplified Deployment Script
# 
# This script deploys the simplified ASOOS components to Firebase.
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
echo -e "${BOLD}${BLUE}  ASOOS Simplified Deployment Script   ${RESET}"
echo -e "${BOLD}${BLUE}=======================================${RESET}"

# Check Firebase CLI
if ! command -v firebase &> /dev/null; then
  echo -e "${RED}Firebase CLI not found. Please install with: npm install -g firebase-tools${RESET}"
  exit 1
fi

# Check node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}Node.js not found. Please install Node.js${RESET}"
  exit 1
fi

# Step 1: Install dependencies
echo -e "${BLUE}Installing dependencies...${RESET}"
cd "$(dirname "$0")/functions"
npm install

# Step 2: Deploy Firebase Functions
echo -e "${BLUE}Deploying Firebase Functions...${RESET}"
cd ..
firebase deploy --only functions

# Step 3: Seed Firestore database
echo -e "${BLUE}Seeding Firestore database...${RESET}"
node ../scripts/firestore/schema_seed.js

echo -e "\n${BOLD}${GREEN}=======================================${RESET}"
echo -e "${BOLD}${GREEN}  ASOOS Deployment Complete!            ${RESET}"
echo -e "${BOLD}${GREEN}=======================================${RESET}"

# List deployed functions
echo -e "${BLUE}Deployed Functions:${RESET}"
firebase functions:list

exit 0

