#!/bin/bash
# Script to clean up and reinstall dependencies with correct versions
# This fixes version mismatches between package.json and installed modules

# Set colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Starting dependency cleanup and reinstallation...${NC}"

# Step 1: Remove node_modules directory
echo -e "${YELLOW}Removing node_modules directory...${NC}"
rm -rf node_modules
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Successfully removed node_modules directory${NC}"
else
  echo -e "${RED}Failed to remove node_modules directory${NC}"
  exit 1
fi

# Step 2: Remove package-lock.json
echo -e "${YELLOW}Removing package-lock.json...${NC}"
rm -f package-lock.json
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Successfully removed package-lock.json${NC}"
else
  echo -e "${RED}Failed to remove package-lock.json${NC}"
  exit 1
fi

# Step 3: Clear npm cache
echo -e "${YELLOW}Clearing npm cache...${NC}"
npm cache clean --force
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Successfully cleared npm cache${NC}"
else
  echo -e "${RED}Failed to clear npm cache${NC}"
  # Continue anyway
fi

# Step 4: Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Successfully installed dependencies${NC}"
else
  echo -e "${RED}Failed to install dependencies${NC}"
  exit 1
fi

# Step 5: Verify installations
echo -e "${YELLOW}Verifying installations...${NC}"
npm list --depth=0 | grep -i "invalid"
if [ $? -eq 1 ]; then
  echo -e "${GREEN}All dependencies are correctly installed!${NC}"
else
  echo -e "${RED}Some dependencies still have version issues. Please check package.json.${NC}"
  exit 1
fi

echo -e "${GREEN}Dependency cleanup and reinstallation completed successfully!${NC}"
