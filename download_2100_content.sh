#!/bin/zsh

# Script to download content from asoos.2100.cool
# This script downloads the main landing page and common subpages
# Saves all downloaded content to the downloaded_content directory

# Base URL
BASE_URL="https://asoos.2100.cool"

# Target directory
TARGET_DIR="downloaded_content"

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"
echo -e "${GREEN}Using target directory: $TARGET_DIR${NC}"

# Function to download a page
download_page() {
    local path=$1
    local filename=$2
    local full_url="${BASE_URL}${path}"
    local output_file="${TARGET_DIR}/${filename}"
    
    echo -e "${YELLOW}Downloading ${full_url} to ${output_file}...${NC}"
    
    # Download the page with curl
    if curl -s -L "$full_url" --output "$output_file"; then
        # Check if the file size is > 0
        if [[ -s "$output_file" ]]; then
            echo -e "${GREEN}✓ Successfully downloaded ${filename}${NC}"
        else
            echo -e "${YELLOW}⚠ Downloaded file is empty: ${filename}${NC}"
        fi
    else
        echo -e "${RED}✗ Failed to download ${filename} from ${full_url}${NC}"
        return 1
    fi
    
    return 0
}

# Array of common pages to download
declare -a pages=(
    "/"
    "/about"
    "/contact"
    "/services"
    "/pricing"
    "/login"
    "/register"
    "/dashboard"
    "/profile"
)

# Keep track of successful and failed downloads
successful=0
failed=0

# Download the pages
echo -e "${GREEN}Starting download of content from ${BASE_URL}${NC}"
echo "------------------------------------------------------"

for path in "${pages[@]}"; do
    # Create filename from path
    filename=$(echo "${path}" | sed 's/^\///;s/\/$//;s/\//_/g')
    if [[ -z "$filename" ]]; then
        filename="index"
    fi
    filename="${filename}.html"
    
    if download_page "$path" "$filename"; then
        ((successful++))
    else
        ((failed++))
    fi
    
    echo "------------------------------------------------------"
done

# Download any assets referenced in the main page (CSS, JS, images)
echo -e "${YELLOW}Checking for assets in the downloaded HTML files...${NC}"
for html_file in "$TARGET_DIR"/*.html; do
    if [[ -f "$html_file" ]]; then
        # Extract CSS files
        css_files=$(grep -o 'href="[^"]*\.css"' "$html_file" | sed 's/href="//;s/"$//')
        for css in $css_files; do
            # Check if it's a full URL or relative path
            if [[ "$css" == http* ]]; then
                css_url="$css"
                css_file=$(basename "$css")
            else
                css_url="${BASE_URL}${css#/}"
                css_file=$(basename "$css")
            fi
            
            echo -e "${YELLOW}Downloading CSS: ${css_file}${NC}"
            curl -s -L "$css_url" --output "${TARGET_DIR}/${css_file}" && \
                echo -e "${GREEN}✓ Downloaded ${css_file}${NC}" || \
                echo -e "${RED}✗ Failed to download ${css_file}${NC}"
        done
        
        # Extract JS files
        js_files=$(grep -o 'src="[^"]*\.js"' "$html_file" | sed 's/src="//;s/"$//')
        for js in $js_files; do
            # Check if it's a full URL or relative path
            if [[ "$js" == http* ]]; then
                js_url="$js"
                js_file=$(basename "$js")
            else
                js_url="${BASE_URL}${js#/}"
                js_file=$(basename "$js")
            fi
            
            echo -e "${YELLOW}Downloading JS: ${js_file}${NC}"
            curl -s -L "$js_url" --output "${TARGET_DIR}/${js_file}" && \
                echo -e "${GREEN}✓ Downloaded ${js_file}${NC}" || \
                echo -e "${RED}✗ Failed to download ${js_file}${NC}"
        done
    fi
done

# Print summary
echo "========================================================"
echo -e "${GREEN}Download Summary:${NC}"
echo -e "Total pages attempted: ${#pages[@]}"
echo -e "Successfully downloaded: ${GREEN}${successful}${NC}"
if [[ $failed -gt 0 ]]; then
    echo -e "Failed downloads: ${RED}${failed}${NC}"
fi
echo -e "${GREEN}Content saved to: ${TARGET_DIR}/${NC}"
echo "========================================================"

# Check if we successfully downloaded any content
if [[ $successful -gt 0 ]]; then
    echo -e "${GREEN}✓ Content download completed. You can now use the downloaded files.${NC}"
else
    echo -e "${RED}✗ No content was successfully downloaded. Please check if the domain is accessible.${NC}"
    exit 1
fi

# List all the downloaded files
echo -e "${YELLOW}Files downloaded:${NC}"
ls -la "$TARGET_DIR"

