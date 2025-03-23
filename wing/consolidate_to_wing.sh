#!/bin/bash

# Define the Wing directory as the destination
WING_DIR="/Users/as/asoos/wing/Wing"

# Define the source directory (the parent directory)
SOURCE_DIR="/Users/as/asoos/wing"

# Create log file
LOG_FILE="consolidate_to_wing_$(date +%Y%m%d_%H%M%S).log"

echo "Starting Wing consolidation audit at $(date)" > "$LOG_FILE"
echo "Target Wing directory: $WING_DIR" >> "$LOG_FILE"
echo "Source directory: $SOURCE_DIR" >> "$LOG_FILE"
echo "----------------------------------------------" >> "$LOG_FILE"

# List of important extensions to check for
important_extensions=("txt" "md" "py" "js" "ts" "java" "c" "cpp" "h" "hpp" "cs" "go" "rb" "php" "html" "css" "json" "xml" "yaml" "yml" "sh" "bat" "ps1" "doc" "docx" "pdf" "readme")

# Function to check if directory contains important files
has_important_files() {
    local dir=$1
    local found=0
    
    for ext in "${important_extensions[@]}"; do
        if find "$dir" -type f -name "*.$ext" 2>/dev/null | grep -q .; then
            echo "  - Found .$ext file(s) in $dir" >> "$LOG_FILE"
            found=1
        fi
    done
    
    # Also check for README files (case insensitive)
    if find "$dir" -type f -name "README*" -o -name "readme*" 2>/dev/null | grep -q .; then
        echo "  - Found README file(s) in $dir" >> "$LOG_FILE"
        found=1
    fi
    
    return $found
}

# Find all directories in the source directory, excluding the Wing directory itself
find "$SOURCE_DIR" -type d -not -path "$WING_DIR*" -not -path "$SOURCE_DIR/Wing*" 2>/dev/null | sort | while read -r dir; do
    # Skip the source directory itself
    if [ "$dir" = "$SOURCE_DIR" ]; then
        continue
    fi
    
    # Get relative path from source root
    rel_path="${dir#$SOURCE_DIR/}"
    
    echo "----------------------------------------------" >> "$LOG_FILE"
    echo "Checking directory: $rel_path" >> "$LOG_FILE"
    
    # Check if directory is empty
    if [ -z "$(ls -A "$dir" 2>/dev/null)" ]; then
        echo "  - Directory is completely empty" >> "$LOG_FILE"
        echo "$dir" >> "$LOG_FILE.empty_dirs"
    else
        # Check if directory contains only subdirectories (no files)
        if [ -z "$(find "$dir" -type f -maxdepth 1 2>/dev/null)" ]; then
            echo "  - Directory contains only subdirectories, no files" >> "$LOG_FILE"
        else
            # Directory has files, check if they're important
            if has_important_files "$dir"; then
                echo "  - Contains important files that should be consolidated" >> "$LOG_FILE"
                
                # Suggested Wing target directory (maintain original structure)
                wing_target="$WING_DIR/$rel_path"
                echo "  - Suggested Wing target: $wing_target" >> "$LOG_FILE"
                
                # Add to consolidation list
                echo "$dir|$wing_target" >> "$LOG_FILE.consolidate_list"
            else
                echo "  - Contains only non-important files" >> "$LOG_FILE"
                echo "$dir" >> "$LOG_FILE.review_list"
            fi
        fi
    fi
done

# Count totals
empty_dirs_count=$(test -f "$LOG_FILE.empty_dirs" && wc -l < "$LOG_FILE.empty_dirs" || echo 0)
consolidate_count=$(test -f "$LOG_FILE.consolidate_list" && wc -l < "$LOG_FILE.consolidate_list" || echo 0)
review_count=$(test -f "$LOG_FILE.review_list" && wc -l < "$LOG_FILE.review_list" || echo 0)

# Summary
echo "----------------------------------------------" >> "$LOG_FILE"
echo "CONSOLIDATION SUMMARY" >> "$LOG_FILE"
echo "Empty directories: $empty_dirs_count" >> "$LOG_FILE"
echo "Directories with important files to consolidate: $consolidate_count" >> "$LOG_FILE"
echo "Directories with non-important files for review: $review_count" >> "$LOG_FILE"
echo "----------------------------------------------" >> "$LOG_FILE"

# Generate consolidation commands
if [ -f "$LOG_FILE.consolidate_list" ] && [ "$consolidate_count" -gt 0 ]; then
    echo "" >> "$LOG_FILE"
    echo "CONSOLIDATION COMMANDS" >> "$LOG_FILE"
    echo "# To consolidate all important files into the Wing directory:" >> "$LOG_FILE"
    echo "while IFS='|' read -r source_dir target_dir; do" >> "$LOG_FILE"
    echo "  mkdir -p \"\$target_dir\"" >> "$LOG_FILE"
    echo "  find \"\$source_dir\" -type f -exec cp {} \"\$target_dir/\" \\;" >> "$LOG_FILE"
    echo "  echo \"Copied files from \$source_dir to \$target_dir\"" >> "$LOG_FILE"
    echo "done < \"$LOG_FILE.consolidate_list\"" >> "$LOG_FILE"
    
    echo "" >> "$LOG_FILE"
    echo "# After confirming files were copied correctly, to clean up:" >> "$LOG_FILE"
    echo "# Empty directories:" >> "$LOG_FILE"
    echo "test -f \"$LOG_FILE.empty_dirs\" && cat \"$LOG_FILE.empty_dirs\" | xargs rmdir 2>/dev/null" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    echo "# Directories with important files (after consolidation):" >> "$LOG_FILE"
    echo "while IFS='|' read -r source_dir _; do" >> "$LOG_FILE"
    echo "  rm -rf \"\$source_dir\"" >> "$LOG_FILE"
    echo "  echo \"Removed \$source_dir after consolidation\"" >> "$LOG_FILE"
    echo "done < \"$LOG_FILE.consolidate_list\"" >> "$LOG_FILE"
fi

echo "Wing consolidation analysis completed."
echo "Found $consolidate_count directories with important files to consolidate into Wing."
echo "Found $empty_dirs_count empty directories."
echo "Found $review_count directories with non-important files for manual review."
echo "To review results: less \"$LOG_FILE\""

if [ "$consolidate_count" -gt 0 ]; then
    echo "To consolidate files, run: less \"$LOG_FILE\" # Look for CONSOLIDATION COMMANDS section"
fi
