#!/bin/bash

# Wing 360 Consolidation Plan
# This script performs a complete consolidation of all content
# into a properly structured Wing directory

# Set up logging
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="wing_consolidation_${TIMESTAMP}.log"
BACKUP_DIR="wing_backup_${TIMESTAMP}"

# Define directories
SOURCE_DIR="/Users/as/asoos/wing"
TARGET_DIR="${SOURCE_DIR}/Wing"

# Key subdirectories we want to maintain in Wing
declare -a WING_DIRS=(
  "academy"
  "agencies"
  "pilots"
  "logs"
  "config"
  "workflows"
)

# Start logging
echo "Wing 360 Consolidation Plan - Started at $(date)" | tee -a "$LOG_FILE"
echo "=======================================================" | tee -a "$LOG_FILE"

# STEP 1: Create backup of everything
echo "STEP 1: Creating backup of current directory structure" | tee -a "$LOG_FILE"
mkdir -p "$BACKUP_DIR"
find "$SOURCE_DIR" -not -path "*/$BACKUP_DIR/*" -not -path "$BACKUP_DIR/*" | cpio -pdm "$BACKUP_DIR" 2>/dev/null
echo "Backup created at: $BACKUP_DIR" | tee -a "$LOG_FILE"
echo "-------------------------------------------------------" | tee -a "$LOG_FILE"

# STEP 2: Ensure Wing directory exists with proper structure
echo "STEP 2: Creating Wing directory structure" | tee -a "$LOG_FILE"
mkdir -p "$TARGET_DIR"
for dir in "${WING_DIRS[@]}"; do
  mkdir -p "${TARGET_DIR}/${dir}"
  echo "  Created: ${TARGET_DIR}/${dir}" | tee -a "$LOG_FILE"
done
echo "-------------------------------------------------------" | tee -a "$LOG_FILE"

# STEP 3: Identify consolidation paths
echo "STEP 3: Analyzing directory structure for consolidation" | tee -a "$LOG_FILE"

# Find all files excluding those already in Wing directory and backup
echo "  Finding files to consolidate..." | tee -a "$LOG_FILE"
find "$SOURCE_DIR" -type f \
  -not -path "${TARGET_DIR}/*" \
  -not -path "*/$BACKUP_DIR/*" \
  -not -path "$BACKUP_DIR/*" \
  -not -path "*/\.*" \
  > "${LOG_FILE}.files"

# Count total files
FILE_COUNT=$(wc -l < "${LOG_FILE}.files")
echo "  Found ${FILE_COUNT} files to consolidate" | tee -a "$LOG_FILE"

# STEP 4: Consolidation planning
echo "STEP 4: Creating consolidation plan" | tee -a "$LOG_FILE"

# Generate consolidation map
> "${LOG_FILE}.plan"

# Process each file
while IFS= read -r file; do
  # Get relative path from source
  rel_path="${file#$SOURCE_DIR/}"
  
  # Skip if it's a backup file or in the Wing directory
  if [[ "$rel_path" == "$BACKUP_DIR"/* ]] || [[ "$rel_path" == "Wing/"* ]]; then
    continue
  fi
  
  # Determine target location based on file path
  if [[ "$rel_path" == "logs/"* ]]; then
    target="${TARGET_DIR}/logs/$(basename "$file")"
  elif [[ "$rel_path" == "pilots/"* || "$rel_path" == "Pilots/"* ]]; then
    pilot_path="${rel_path#*/}"  # Remove the first directory
    target="${TARGET_DIR}/pilots/${pilot_path}"
  elif [[ "$rel_path" == "config/"* || "$rel_path" == "Config/"* ]]; then
    config_path="${rel_path#*/}"  # Remove the first directory
    target="${TARGET_DIR}/config/${config_path}"
  elif [[ "$rel_path" == "workflows/"* || "$rel_path" == "Workflows/"* ]]; then
    workflow_path="${rel_path#*/}"  # Remove the first directory
    target="${TARGET_DIR}/workflows/${workflow_path}"
  elif [[ "$rel_path" == "wing/"* ]]; then
    # For files in lowercase "wing" directory, move to proper Wing subdirectories
    wing_path="${rel_path#wing/}"
    
    if [[ "$wing_path" == "academy/"* ]]; then
      academy_path="${wing_path#academy/}"
      target="${TARGET_DIR}/academy/${academy_path}"
    elif [[ "$wing_path" == "pilots/"* ]]; then
      pilot_path="${wing_path#pilots/}"
      target="${TARGET_DIR}/pilots/${pilot_path}"
    elif [[ "$wing_path" == "rollback/"* ]]; then
      rollback_path="${wing_path#rollback/}"
      target="${TARGET_DIR}/workflows/rollback/${rollback_path}"
    else
      # Default for other files in wing directory
      target="${TARGET_DIR}/${wing_path}"
    fi
  else
    # For other files, put in appropriate subdirectory based on extension or content
    filename=$(basename "$rel_path")
    ext="${filename##*.}"
    
    if [[ "$ext" == "py" || "$ext" == "js" || "$ext" == "ts" ]]; then
      target="${TARGET_DIR}/scripts/${filename}"
    elif [[ "$ext" == "md" || "$filename" == *"README"* ]]; then
      target="${TARGET_DIR}/docs/${filename}"
    else
      # Default location
      target="${TARGET_DIR}/other/${filename}"
    fi
  fi
  
  # Ensure target directory exists
  target_dir=$(dirname "$target")
  echo "mkdir -p \"${target_dir}\"" >> "${LOG_FILE}.plan"
  
  # Add copy command to plan
  echo "cp \"${file}\" \"${target}\"" >> "${LOG_FILE}.plan"
  
  # Log the mapping
  echo "  ${file} -> ${target}" >> "${LOG_FILE}.map"
done < "${LOG_FILE}.files"

# Count operations
OP_COUNT=$(grep -c "cp " "${LOG_FILE}.plan")
echo "  Created consolidation plan with ${OP_COUNT} file operations" | tee -a "$LOG_FILE"

# STEP 5: Execute the consolidation
echo "STEP 5: Ready to execute consolidation" | tee -a "$LOG_FILE"
echo "To execute the consolidation plan, run:" | tee -a "$LOG_FILE"
echo "  bash ${LOG_FILE}.plan" | tee -a "$LOG_FILE"

# STEP 6: Cleanup recommendation
echo "STEP 6: Cleanup recommendation (after consolidation)" | tee -a "$LOG_FILE"
echo "After confirming all files are correctly consolidated, run:" | tee -a "$LOG_FILE"
echo "  find \"${SOURCE_DIR}\" -type d -not -path \"${TARGET_DIR}/*\" -not -path \"*/${BACKUP_DIR}/*\" -empty -delete" | tee -a "$LOG_FILE"
echo "This will remove all empty directories outside the Wing directory" | tee -a "$LOG_FILE"

# Generate summary
echo "=======================================================" | tee -a "$LOG_FILE"
echo "CONSOLIDATION SUMMARY:" | tee -a "$LOG_FILE"
echo "  - Total files to move: ${FILE_COUNT}" | tee -a "$LOG_FILE"
echo "  - Backup created: ${BACKUP_DIR}" | tee -a "$LOG_FILE"
echo "  - Consolidation plan: ${LOG_FILE}.plan" | tee -a "$LOG_FILE"
echo "  - Detailed mapping: ${LOG_FILE}.map" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "To review the full consolidation mapping:" | tee -a "$LOG_FILE"
echo "  less ${LOG_FILE}.map" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "To execute the consolidation:" | tee -a "$LOG_FILE"
echo "  bash ${LOG_FILE}.plan" | tee -a "$LOG_FILE"
echo "=======================================================" | tee -a "$LOG_FILE"

# Make the plan executable
chmod +x "${LOG_FILE}.plan"

echo "Wing 360 Consolidation Plan is ready!"
echo "To review the plan, see: ${LOG_FILE}"
