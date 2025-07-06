#!/bin/bash

# ASOOS.2100.Cool Content Synchronization Script
# This script ensures the main index.html is properly synced to the asoos-2100-cool target directory

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Paths
SOURCE_HTML="$PROJECT_ROOT/public/index.html"
TARGET_DIR="$PROJECT_ROOT/public/asoos-2100-cool"
TARGET_HTML="$TARGET_DIR/index.html"

echo -e "${BLUE}🔄 ASOOS.2100.Cool Content Sync${NC}"
echo "=================================================="

# Function to validate HTML syntax
validate_html() {
    local file=$1
    echo -e "${YELLOW}🔍 Validating HTML syntax: $file${NC}"
    
    if ! python3 -c "
import html
import sys

try:
    with open('$file', 'r') as f:
        content = f.read()
    
    # Check for HTML entities that need to be decoded
    if '&lt;' in content or '&gt;' in content:
        print('❌ HTML entities found - fixing...')
        decoded_content = html.unescape(content)
        with open('$file', 'w') as f:
            f.write(decoded_content)
        print('✅ HTML entities fixed')
    
    # Basic HTML validation
    if not content.strip().startswith('<!DOCTYPE html>'):
        print('❌ Missing DOCTYPE declaration')
        sys.exit(1)
    
    if '<html' not in content or '</html>' not in content:
        print('❌ Missing HTML tags')
        sys.exit(1)
    
    print('✅ HTML syntax validation passed')
    
except Exception as e:
    print(f'❌ Validation failed: {e}')
    sys.exit(1)
"; then
        echo -e "${RED}❌ HTML validation failed${NC}"
        return 1
    fi
}

# Function to create target directory
create_target_directory() {
    echo -e "${YELLOW}📁 Creating target directory...${NC}"
    mkdir -p "$TARGET_DIR"
    echo -e "${GREEN}✅ Target directory created: $TARGET_DIR${NC}"
}

# Function to sync content
sync_content() {
    echo -e "${YELLOW}🔄 Syncing content...${NC}"
    
    if [[ ! -f "$SOURCE_HTML" ]]; then
        echo -e "${RED}❌ Source file not found: $SOURCE_HTML${NC}"
        exit 1
    fi
    
    # Validate source HTML
    validate_html "$SOURCE_HTML"
    
    # Create target directory
    create_target_directory
    
    # Copy content
    cp "$SOURCE_HTML" "$TARGET_HTML"
    echo -e "${GREEN}✅ Content synced successfully${NC}"
    
    # Validate target HTML
    validate_html "$TARGET_HTML"
}

# Function to check differences
check_differences() {
    if [[ -f "$TARGET_HTML" ]]; then
        echo -e "${YELLOW}🔍 Checking for differences...${NC}"
        if diff -q "$SOURCE_HTML" "$TARGET_HTML" > /dev/null; then
            echo -e "${GREEN}✅ Files are identical${NC}"
        else
            echo -e "${YELLOW}⚠️  Files differ - will sync${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}ℹ️  Target file doesn't exist - will create${NC}"
        return 1
    fi
}

# Function to display file info
display_file_info() {
    local file=$1
    if [[ -f "$file" ]]; then
        local size=$(wc -c < "$file" | tr -d ' ')
        local lines=$(wc -l < "$file" | tr -d ' ')
        echo -e "${BLUE}📊 File: $(basename "$file")${NC}"
        echo -e "   Size: ${size} bytes"
        echo -e "   Lines: ${lines}"
    fi
}

# Main execution
main() {
    echo -e "${BLUE}📍 Working directory: $PROJECT_ROOT${NC}"
    
    # Check if source file exists
    if [[ ! -f "$SOURCE_HTML" ]]; then
        echo -e "${RED}❌ Source file not found: $SOURCE_HTML${NC}"
        exit 1
    fi
    
    # Display source file info
    display_file_info "$SOURCE_HTML"
    
    # Check if sync is needed
    if ! check_differences; then
        sync_content
        echo -e "${GREEN}🎉 Content synchronization completed successfully!${NC}"
    else
        echo -e "${GREEN}✅ Content is already up to date${NC}"
    fi
    
    # Display target file info
    display_file_info "$TARGET_HTML"
    
    echo "=================================================="
    echo -e "${GREEN}✅ ASOOS.2100.Cool sync completed${NC}"
    echo -e "${BLUE}🌐 Ready for deployment to: https://asoos.2100.cool${NC}"
}

# Run main function
main "$@"
