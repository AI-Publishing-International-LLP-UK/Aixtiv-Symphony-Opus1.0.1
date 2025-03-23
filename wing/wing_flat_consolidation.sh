#!/bin/bash

# Wing Flat Consolidation Plan
# This script performs a complete consolidation of all content
# into a flat, properly structured Wing directory without nesting

# Set up logging
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="wing_flat_consolidation_${TIMESTAMP}.log"
BACKUP_DIR="wing_backup_${TIMESTAMP}"

# Define directories
SOURCE_DIR="/Users/as/asoos/wing"
GIT_DIR="${SOURCE_DIR}/WingRepo"

# Start logging
echo "Wing Flat Consolidation Plan - Started at $(date)" | tee -a "$LOG_FILE"
echo "=======================================================" | tee -a "$LOG_FILE"

# STEP 1: Create backup of everything
echo "STEP 1: Creating backup of current directory structure" | tee -a "$LOG_FILE"
mkdir -p "$BACKUP_DIR"
find "$SOURCE_DIR" -not -path "*/$BACKUP_DIR/*" -not -path "$BACKUP_DIR/*" | cpio -pdm "$BACKUP_DIR" 2>/dev/null
echo "Backup created at: $BACKUP_DIR" | tee -a "$LOG_FILE"
echo "-------------------------------------------------------" | tee -a "$LOG_FILE"

# STEP 2: Create Git repository 
echo "STEP 2: Setting up Git repository structure" | tee -a "$LOG_FILE"
mkdir -p "$GIT_DIR"

# Initialize Git repository
echo "  Initializing Git repository in $GIT_DIR" | tee -a "$LOG_FILE"
cd "$GIT_DIR" && git init

# Create basic directories for flat structure
mkdir -p "$GIT_DIR/docs"
mkdir -p "$GIT_DIR/src"
mkdir -p "$GIT_DIR/config"
mkdir -p "$GIT_DIR/scripts"
mkdir -p "$GIT_DIR/assets"

echo "  Created flat directory structure" | tee -a "$LOG_FILE"
echo "-------------------------------------------------------" | tee -a "$LOG_FILE"

# STEP 3: Find all unique files
echo "STEP 3: Finding all unique files for consolidation" | tee -a "$LOG_FILE"

# Create a temporary directory for deduplication
TEMP_DIR="${SOURCE_DIR}/temp_dedup_${TIMESTAMP}"
mkdir -p "$TEMP_DIR"

# Find all files excluding backup and git directory
echo "  Finding all files..." | tee -a "$LOG_FILE"
find "$SOURCE_DIR" -type f \
  -not -path "*/$BACKUP_DIR/*" \
  -not -path "$BACKUP_DIR/*" \
  -not -path "*/$TEMP_DIR/*" \
  -not -path "$TEMP_DIR/*" \
  -not -path "$GIT_DIR/*" \
  -not -path "*/\.*" \
  > "${LOG_FILE}.all_files"

TOTAL_FILES=$(wc -l < "${LOG_FILE}.all_files")
echo "  Found ${TOTAL_FILES} total files" | tee -a "$LOG_FILE"

# Deduplicate files based on content
echo "  Deduplicating files based on content..." | tee -a "$LOG_FILE"

> "${LOG_FILE}.unique_files"
> "${LOG_FILE}.duplicate_files"

# Process each file
while IFS= read -r file; do
  # Skip empty or non-existent files
  if [[ ! -s "$file" ]]; then
    continue
  fi
  
  # Generate hash of file content
  file_hash=$(md5 -q "$file")
  
  # Check if we've seen this hash before
  if [ ! -f "${TEMP_DIR}/${file_hash}" ]; then
    # New unique file - save it
    cp "$file" "${TEMP_DIR}/${file_hash}"
    echo "$file" >> "${LOG_FILE}.unique_files"
    # Store the original file path with the hash
    echo "$file" > "${TEMP_DIR}/${file_hash}.source"
  else
    # Duplicate file - log it
    original=$(cat "${TEMP_DIR}/${file_hash}.source")
    echo "$file -> duplicate of -> $original" >> "${LOG_FILE}.duplicate_files"
  fi
done < "${LOG_FILE}.all_files"

UNIQUE_FILES=$(wc -l < "${LOG_FILE}.unique_files")
DUPLICATE_FILES=$((TOTAL_FILES - UNIQUE_FILES))
echo "  Found ${UNIQUE_FILES} unique files and ${DUPLICATE_FILES} duplicates" | tee -a "$LOG_FILE"
echo "-------------------------------------------------------" | tee -a "$LOG_FILE"

# STEP 4: Organize unique files into flat structure
echo "STEP 4: Organizing unique files into flat structure" | tee -a "$LOG_FILE"

> "${LOG_FILE}.plan"

# Process each unique file
while IFS= read -r file; do
  # Get filename
  filename=$(basename "$file")
  ext="${filename##*.}"
  
  # Determine appropriate target directory based on file extension/type
  if [[ "$ext" == "md" || "$ext" == "txt" || "$ext" == "pdf" || "$filename" == *"README"* ]]; then
    target="${GIT_DIR}/docs/${filename}"
    category="docs"
  elif [[ "$ext" == "py" || "$ext" == "js" || "$ext" == "ts" || "$ext" == "jsx" || "$ext" == "tsx" ]]; then
    target="${GIT_DIR}/src/${filename}"
    category="src"
  elif [[ "$ext" == "json" || "$ext" == "yaml" || "$ext" == "yml" || "$ext" == "ini" || "$ext" == "conf" || "$filename" == *"config"* ]]; then
    target="${GIT_DIR}/config/${filename}"
    category="config"
  elif [[ "$ext" == "sh" || "$ext" == "bash" || "$filename" == *"script"* ]]; then
    target="${GIT_DIR}/scripts/${filename}"
    category="scripts"
  elif [[ "$ext" == "jpg" || "$ext" == "png" || "$ext" == "gif" || "$ext" == "svg" || "$ext" == "ico" ]]; then
    target="${GIT_DIR}/assets/${filename}"
    category="assets"
  else
    # Handle potential filename conflicts
    dir_path=$(dirname "${file#$SOURCE_DIR/}")
    safe_name="${dir_path//\//_}_${filename}"
    safe_name="${safe_name//[^a-zA-Z0-9._-]/_}"
    target="${GIT_DIR}/src/${safe_name}"
    category="src"
  fi
  
  # Check for name conflicts
  if [ -f "$target" ]; then
    dir_path=$(dirname "${file#$SOURCE_DIR/}")
    safe_name="${dir_path//\//_}_${filename}"
    safe_name="${safe_name//[^a-zA-Z0-9._-]/_}"
    target="${GIT_DIR}/${category}/${safe_name}"
  fi
  
  # Add copy command to plan
  echo "cp \"${file}\" \"${target}\"" >> "${LOG_FILE}.plan"
  
  # Log the mapping
  echo "  ${file} -> ${target}" >> "${LOG_FILE}.map"
done < "${LOG_FILE}.unique_files"

# Count operations
OP_COUNT=$(grep -c "cp " "${LOG_FILE}.plan")
echo "  Created consolidation plan with ${OP_COUNT} file operations" | tee -a "$LOG_FILE"
echo "-------------------------------------------------------" | tee -a "$LOG_FILE"

# STEP 5: Execute the consolidation
echo "STEP 5: Ready to execute consolidation" | tee -a "$LOG_FILE"
echo "To execute the consolidation plan, run:" | tee -a "$LOG_FILE" 
echo "  bash ${LOG_FILE}.plan" | tee -a "$LOG_FILE"
echo "-------------------------------------------------------" | tee -a "$LOG_FILE"

# STEP 6: Git repository setup
echo "STEP 6: Git repository finalization steps" | tee -a "$LOG_FILE"
echo "After executing the plan, run these commands to set up the Git repository:" | tee -a "$LOG_FILE"
echo "  cd \"${GIT_DIR}\"" | tee -a "$LOG_FILE"
echo "  git add ." | tee -a "$LOG_FILE"
echo "  git commit -m \"Initial commit with consolidated files\"" | tee -a "$LOG_FILE"
echo "-------------------------------------------------------" | tee -a "$LOG_FILE"

# STEP 7: Cleanup
echo "STEP 7: Cleanup recommendations" | tee -a "$LOG_FILE"
echo "After confirming everything is properly consolidated:" | tee -a "$LOG_FILE"
echo "  rm -rf \"${TEMP_DIR}\"  # Remove temporary deduplication directory" | tee -a "$LOG_FILE"
echo "-------------------------------------------------------" | tee -a "$LOG_FILE"

# Generate summary
echo "=======================================================" | tee -a "$LOG_FILE"
echo "CONSOLIDATION SUMMARY:" | tee -a "$LOG_FILE"
echo "  - Total files examined: ${TOTAL_FILES}" | tee -a "$LOG_FILE"
echo "  - Unique files for consolidation: ${UNIQUE_FILES}" | tee -a "$LOG_FILE"
echo "  - Duplicate files identified: ${DUPLICATE_FILES}" | tee -a "$LOG_FILE"
echo "  - Backup created: ${BACKUP_DIR}" | tee -a "$LOG_FILE"
echo "  - Consolidation plan: ${LOG_FILE}.plan" | tee -a "$LOG_FILE"
echo "  - Detailed mapping: ${LOG_FILE}.map" | tee -a "$LOG_FILE"
echo "  - Duplicate file list: ${LOG_FILE}.duplicate_files" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "To review the consolidation mapping:" | tee -a "$LOG_FILE"
echo "  less ${LOG_FILE}.map" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "To execute the consolidation:" | tee -a "$LOG_FILE"
echo "  bash ${LOG_FILE}.plan" | tee -a "$LOG_FILE"
echo "=======================================================" | tee -a "$LOG_FILE"

# Make the plan executable
chmod +x "${LOG_FILE}.plan"

# Clean up temp directory when done
rm -rf "$TEMP_DIR"

echo "Wing Flat Consolidation Plan is ready!"
echo "To review the plan, see: ${LOG_FILE}"
