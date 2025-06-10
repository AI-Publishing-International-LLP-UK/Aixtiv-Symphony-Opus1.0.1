#!/bin/bash

# import-files.sh
# Script to import files from Downloads folder to appropriate project directories
# Created for aixtiv-symphony-opus1.0.1 project

# Color definitions
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}   AIXTIV SYMPHONY FILE IMPORT SCRIPT    ${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Define source and destination directories
DOWNLOADS_DIR="/Users/as/Downloads"
PROJECT_DIR="/Users/as/asoos/aixtiv-symphony-opus1.0.1"
COMPONENTS_DIR="${PROJECT_DIR}/src/components"
SCRIPTS_DIR="${PROJECT_DIR}/scripts"
ASSETS_DIR="${PROJECT_DIR}/assets"
HTML_DIR="${PROJECT_DIR}/public"

# Create directories if they don't exist
echo -e "${YELLOW}Creating necessary directories if they don't exist...${NC}"
mkdir -p "${COMPONENTS_DIR}"
mkdir -p "${SCRIPTS_DIR}"
mkdir -p "${ASSETS_DIR}"
mkdir -p "${HTML_DIR}"
echo -e "${GREEN}✓ Directories created/verified${NC}"
echo ""

# Files to process from the command
FILES=(
  "${DOWNLOADS_DIR}/component-structure-interface.js"
  "${DOWNLOADS_DIR}/asoos.deployment-script.sh"
  "${DOWNLOADS_DIR}/asoos-symphony-view.js"
  "${DOWNLOADS_DIR}/asoos-settings-view.js"
  "${DOWNLOADS_DIR}/asoos-sallyport-auth.js"
  "${DOWNLOADS_DIR}/asoos-router.js"
  "${DOWNLOADS_DIR}/asoos-interface.html"
  "${DOWNLOADS_DIR}/asoos-integrations-view.js"
  "${DOWNLOADS_DIR}/asoos-integration-gateway.js"
  "${DOWNLOADS_DIR}/asoos-header-component.js"
  "${DOWNLOADS_DIR}/asoos-footer-component.js"
  "${DOWNLOADS_DIR}/asoos-developer-panel.js"
  "${DOWNLOADS_DIR}/asoos-app2-js.js"
  "${DOWNLOADS_DIR}/asoos-app-state.js"
  "${DOWNLOADS_DIR}/asoos_large_file_cleanup.sh"
  "${DOWNLOADS_DIR}/asoos_clean_and_push.sh"
  "${DOWNLOADS_DIR}/asoos_clean_and_push_v2.sh"
)

# Make all shell scripts executable
echo -e "${YELLOW}Making shell scripts executable...${NC}"
for file in "${FILES[@]}"; do
  if [[ "$file" == *.sh ]]; then
    if [ -f "$file" ]; then
      chmod +x "$file"
      echo -e "${GREEN}✓ Made executable: ${NC}$(basename "$file")"
    else
      echo -e "${RED}✗ File not found: ${NC}$(basename "$file")"
    fi
  fi
done
echo ""

# Copy files to appropriate directories
echo -e "${YELLOW}Copying files to appropriate directories...${NC}"
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    
    # Process based on file extension
    if [[ "$filename" == *.js ]]; then
      cp "$file" "${COMPONENTS_DIR}/"
      echo -e "${GREEN}✓ Copied to components: ${NC}$filename"
    elif [[ "$filename" == *.sh ]]; then
      cp "$file" "${SCRIPTS_DIR}/"
      echo -e "${GREEN}✓ Copied to scripts: ${NC}$filename"
    elif [[ "$filename" == *.html ]]; then
      cp "$file" "${HTML_DIR}/"
      echo -e "${GREEN}✓ Copied to HTML dir: ${NC}$filename"
    else
      cp "$file" "${ASSETS_DIR}/"
      echo -e "${GREEN}✓ Copied to assets: ${NC}$filename"
    fi
  else
    echo -e "${RED}✗ File not found: ${NC}$(basename "$file")"
  fi
done
echo ""

# Summary
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}              SUMMARY                     ${NC}"
echo -e "${BLUE}==========================================${NC}"
echo -e "${GREEN}JavaScript files copied to:${NC} ${COMPONENTS_DIR}"
echo -e "${GREEN}Shell scripts copied to:${NC} ${SCRIPTS_DIR}"
echo -e "${GREEN}HTML files copied to:${NC} ${HTML_DIR}"
echo -e "${GREEN}Other files copied to:${NC} ${ASSETS_DIR}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the imported files in their respective directories"
echo "2. Run shell scripts from the scripts directory"
echo "3. Import the JavaScript components in your application"
echo ""
echo -e "${GREEN}Import complete!${NC}"

