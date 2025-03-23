#!/bin/bash

# Define source and destination directories
SOURCE_DIR="/Users/as/aixtiv-symphony-opus1.0.1"
DEST_DIR="/Users/as/asoos/wing"

# Specific subdirectories to focus on
FOCUS_DIRS=("Wing" "Agents" "Pilots")

# Create log file
LOG_FILE="wing_cleanup_$(date +%Y%m%d_%H%M%S).log"

echo "Starting Wing cleanup audit at $(date)" > "$LOG_FILE"
echo "Source: $SOURCE_DIR" >> "$LOG_FILE"
echo "Destination: $DEST_DIR" >> "$LOG_FILE"
echo "Focus areas: ${FOCUS_DIRS[*]}" >> "$LOG_FILE"
echo "----------------------------------------------" >> "$LOG_FILE"

# Counter for statistics
total_empty=0
found_in_dest=0
dest_has_files=0
dirs_to_delete=0

# List of extensions to check before deleting
important_extensions=("txt" "md" "py" "js" "ts" "java" "c" "cpp" "h" "hpp" "cs" "go" "rb" "php" "html" "css" "json" "xml" "yaml" "yml" "sh" "bat" "ps1" "doc" "docx" "pdf" "readme")

# Function to check if any files with important extensions exist
has_important_files() {
    local dir=$1
    local found=0
    
    for ext in "${important_extensions[@]}"; do
        if find "$dir" -type f -name "*.$ext" 2>/dev/null | grep -q .; then
            echo "  - WARNING: Found .$ext file(s) in $dir" >> "$LOG_FILE"
            found=1
        fi
    done
    
    # Also check for README files (case insensitive)
    if find "$dir" -type f -name "README*" -o -name "readme*" 2>/dev/null | grep -q .; then
        echo "  - WARNING: Found README file(s) in $dir" >> "$LOG_FILE"
        found=1
    fi
    
    return $found
}

# Process each focus directory
for focus in "${FOCUS_DIRS[@]}"; do
    echo "----------------------------------------------" >> "$LOG_FILE"
    echo "Processing focus area: $focus" >> "$LOG_FILE"
    
    # Check if the focus directory exists in source
    if [ ! -d "$SOURCE_DIR/$focus" ]; then
        echo "  - Focus directory does not exist in source: $focus" >> "$LOG_FILE"
        continue
    fi
    
    # Find all directories in this focus area
    # Start from the deepest directories (sort in reverse)
    find "$SOURCE_DIR/$focus" -type d 2>/dev/null | sort -r | while read -r source_dir; do
        # Skip the focus directory itself
        if [ "$source_dir" = "$SOURCE_DIR/$focus" ]; then
            continue
        fi
        
        # Get relative path from source root
        rel_path="${source_dir#$SOURCE_DIR/}"
        
        echo "----------------------------------------------" >> "$LOG_FILE"
        echo "Checking directory: $rel_path" >> "$LOG_FILE"
        
        # Check if directory is empty
        if [ -z "$(ls -A "$source_dir" 2>/dev/null)" ]; then
            echo "  - Directory is completely empty" >> "$LOG_FILE"
            total_empty=$((total_empty + 1))
            
            # Check if corresponding directory exists in destination
            dest_path="$DEST_DIR/$rel_path"
            if [ -d "$dest_path" ]; then
                found_in_dest=$((found_in_dest + 1))
                echo "  - Found in destination: YES" >> "$LOG_FILE"
                
                # Check if destination has files
                if [ -n "$(ls -A "$dest_path" 2>/dev/null)" ]; then
                    dest_has_files=$((dest_has_files + 1))
                    echo "  - Destination has content: YES" >> "$LOG_FILE"
                    echo "  - Safe to delete source directory" >> "$LOG_FILE"
                    echo "$source_dir" >> "$LOG_FILE.delete_list"
                    dirs_to_delete=$((dirs_to_delete + 1))
                else
                    echo "  - Destination has content: NO" >> "$LOG_FILE"
                    echo "  - Both directories empty, can delete source" >> "$LOG_FILE"
                    echo "$source_dir" >> "$LOG_FILE.delete_list"
                    dirs_to_delete=$((dirs_to_delete + 1))
                fi
            else
                echo "  - Found in destination: NO" >> "$LOG_FILE"
                echo "  - Source directory empty and not in destination, can delete" >> "$LOG_FILE"
                echo "$source_dir" >> "$LOG_FILE.delete_list"
                dirs_to_delete=$((dirs_to_delete + 1))
            fi
        else
            # Check if directory contains only subdirectories (no files)
            if [ -z "$(find "$source_dir" -type f -maxdepth 1 2>/dev/null)" ]; then
                echo "  - Directory contains only subdirectories, no files" >> "$LOG_FILE"
                # Will be handled later if those subdirectories are empty and deleted
            else
                # Directory has files, check if they're important
                if has_important_files "$source_dir"; then
                    echo "  - Contains important files, DO NOT DELETE" >> "$LOG_FILE"
                else
                    echo "  - Contains only unimportant files, can be deleted after review" >> "$LOG_FILE"
                    echo "$source_dir" >> "$LOG_FILE.review_list"
                fi
            fi
        fi
    done
done

# Summary
echo "----------------------------------------------" >> "$LOG_FILE"
echo "CLEANUP SUMMARY" >> "$LOG_FILE"
echo "Total empty directories found: $total_empty" >> "$LOG_FILE"
echo "Empty directories found in destination: $found_in_dest" >> "$LOG_FILE"
echo "Destinations with files: $dest_has_files" >> "$LOG_FILE"
echo "Directories safe to delete: $dirs_to_delete" >> "$LOG_FILE"
echo "----------------------------------------------" >> "$LOG_FILE"

# Generate cleanup commands
if [ -f "$LOG_FILE.delete_list" ]; then
    echo "" >> "$LOG_FILE"
    echo "CLEANUP COMMANDS" >> "$LOG_FILE"
    echo "# To delete all safe empty directories, run:" >> "$LOG_FILE"
    echo "cat \"$LOG_FILE.delete_list\" | xargs rmdir" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    echo "# To move any remaining files from source to destination:" >> "$LOG_FILE"
    echo "# (Run this before deleting directories)" >> "$LOG_FILE"
    echo "for dir in \$(cat \"$LOG_FILE.review_list\" 2>/dev/null); do" >> "$LOG_FILE"
    echo "  rel_path=\${dir#$SOURCE_DIR/}" >> "$LOG_FILE"
    echo "  dest_path=\"$DEST_DIR/\$rel_path\"" >> "$LOG_FILE"
    echo "  mkdir -p \"\$dest_path\"" >> "$LOG_FILE"
    echo "  find \"\$dir\" -type f -exec cp {} \"\$dest_path/\" \\;" >> "$LOG_FILE"
    echo "done" >> "$LOG_FILE"
    
    echo "Wing cleanup analysis completed. Found $dirs_to_delete directories safe to delete."
    echo "To review results: less \"$LOG_FILE\""
    echo "To delete all safe directories, run: cat \"$LOG_FILE.delete_list\" | xargs rmdir"
else
    echo "No directories were found safe to delete."
fi

if [ -f "$LOG_FILE.review_list" ]; then
    echo "Found directories that need manual review before deletion."
    echo "Review them in: \"$LOG_FILE.review_list\""
fi
