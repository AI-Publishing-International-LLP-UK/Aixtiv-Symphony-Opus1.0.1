#!/bin/bash

#==============================================================================
# ASOOS Frontend Build Script
# 
# This script copies JavaScript files from src/components to public/js
# with the appropriate directory structure and naming conventions.
# 
# Usage: ./build-frontend.sh
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
SOURCE_DIR="${PROJECT_ROOT}/src/components"
TARGET_DIR="${PROJECT_ROOT}/public/js"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
LOG_FILE="${PROJECT_ROOT}/logs/frontend-build-$(date +%Y%m%d-%H%M%S).log"

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
echo -e "${BOLD}${BLUE}  ASOOS Frontend Build Script${RESET}"
echo -e "${BOLD}${BLUE}  Log: ${LOG_FILE}${RESET}"
echo -e "${BOLD}${BLUE}=======================================${RESET}"

# Verify we're in the project root
if [ ! -d "${SOURCE_DIR}" ]; then
  log "ERROR" "${RED}Source directory not found: ${SOURCE_DIR}${RESET}"
  exit 1
fi

# Function to handle errors
handle_error() {
  local exit_code=$?
  log "ERROR" "${RED}Build failed with exit code ${exit_code}${RESET}"
  log "ERROR" "${RED}See log file for details: ${LOG_FILE}${RESET}"
  exit $exit_code
}

# Set up error handling
trap handle_error ERR

# Step 1: Create directory structure
log "INFO" "${BLUE}Creating directory structure...${RESET}"
mkdir -p "${TARGET_DIR}/core"
mkdir -p "${TARGET_DIR}/components"
mkdir -p "${TARGET_DIR}/views"
log "SUCCESS" "${GREEN}Directory structure created successfully${RESET}"

# Step 2: Define file mappings
log "INFO" "${BLUE}Setting up file mappings...${RESET}"

# Define source-to-target mappings without associative arrays
SOURCE_FILES=(
  "asoos-sallyport-auth.js"
  "asoos-app-state.js"
  "asoos-integration-gateway.js"
  "asoos-header-component.js"
  "asoos-footer-component.js"
  "asoos-developer-panel.js"
  "asoos-symphony-view.js"
  "asoos-router.js"
  "asoos-app2-js.js"
)

TARGET_FILES=(
  "core/sallyport-auth.js"
  "core/app-state.js"
  "core/integration-gateway.js"
  "components/header.js"
  "components/footer.js"
  "components/developer-panel.js"
  "views/symphony-view.js"
  "core/router.js"
  "app.js"
)

# Step 3: Copy files according to mappings
log "INFO" "${BLUE}Copying files according to mappings...${RESET}"

# Process the mappings
for i in "${!SOURCE_FILES[@]}"; do
  source_file="${SOURCE_FILES[$i]}"
  target_file="${TARGET_FILES[$i]}"
  source_path="${SOURCE_DIR}/${source_file}"
  target_path="${TARGET_DIR}/${target_file}"
  
  if [ -f "$source_path" ]; then
    # Create target directory if it doesn't exist (for app.js which is in the root)
    mkdir -p "$(dirname "$target_path")"
    
    # Copy the file
    cp "$source_path" "$target_path"
    log "SUCCESS" "${GREEN}Copied: ${source_file} -> ${target_file}${RESET}"
  else
    log "WARNING" "${YELLOW}Source file not found: ${source_file}${RESET}"
  fi
done

# Step 4: Handle files with "view" in the name
log "INFO" "${BLUE}Processing view files...${RESET}"
for view_file in "${SOURCE_DIR}"/*view*.js; do
  if [ -f "$view_file" ]; then
    # Skip if already processed in explicit mappings
    filename=$(basename "$view_file")
    already_processed=0
    
    # Check if this file was already processed in our explicit mappings
    for source in "${SOURCE_FILES[@]}"; do
      if [ "$source" = "$filename" ]; then
        already_processed=1
        break
      fi
    done
    
    # Skip if already processed
    if [ $already_processed -eq 1 ]; then
      continue
    fi
    
    # Generate target filename (remove 'asoos-' prefix and potentially rename)
    target_filename=$(basename "$view_file" | sed 's/^asoos-//')
    
    # If not already ending with '-view.js', adjust formatting
    if [[ ! "$target_filename" =~ -view\.js$ ]]; then
      target_filename=$(echo "$target_filename" | sed 's/\.js/-view.js/')
    fi
    
    target_path="${TARGET_DIR}/views/${target_filename}"
    
    # Copy the file
    cp "$view_file" "$target_path"
    log "SUCCESS" "${GREEN}Copied view: ${filename} -> views/${target_filename}${RESET}"
  fi
done

# Step 5: Copy any remaining JavaScript files from component-structure-interface.js pattern
log "INFO" "${BLUE}Processing additional interface files...${RESET}"
if [ -f "${SOURCE_DIR}/component-structure-interface.js" ]; then
  cp "${SOURCE_DIR}/component-structure-interface.js" "${TARGET_DIR}/components/structure.js"
  log "SUCCESS" "${GREEN}Copied: component-structure-interface.js -> components/structure.js${RESET}"
fi

# Check for greenscreen view specifically (mentioned in HTML)
if [ ! -f "${TARGET_DIR}/views/greenscreen-view.js" ]; then
  log "WARNING" "${YELLOW}Missing file required by HTML: views/greenscreen-view.js${RESET}"
  
  # Check if we can find a source file that might match
  for potential_source in "${SOURCE_DIR}"/*green*screen*.js; do
    if [ -f "$potential_source" ]; then
      cp "$potential_source" "${TARGET_DIR}/views/greenscreen-view.js"
      log "SUCCESS" "${GREEN}Copied potential match: $(basename "$potential_source") -> views/greenscreen-view.js${RESET}"
      break
    fi
  done
fi

# Summary of files
total_copied=$(find "${TARGET_DIR}" -type f | wc -l)

# Display results
echo -e "\n${BOLD}${GREEN}=======================================${RESET}"
echo -e "${BOLD}${GREEN}  ASOOS Frontend Build Complete!${RESET}"
echo -e "${BOLD}${GREEN}  Files copied: ${total_copied}${RESET}"
echo -e "${BOLD}${GREEN}  Timestamp: ${TIMESTAMP}${RESET}"
echo -e "${BOLD}${GREEN}  Log: ${LOG_FILE}${RESET}"
echo -e "${BOLD}${GREEN}=======================================${RESET}"

log "INFO" "Build completed successfully"

echo -e "\n${BOLD}${YELLOW}Next steps:${RESET}"
echo -e "1. Deploy to Firebase with: firebase deploy --only hosting"
echo -e "2. Access your application at the configured Firebase Hosting URL"

exit 0

