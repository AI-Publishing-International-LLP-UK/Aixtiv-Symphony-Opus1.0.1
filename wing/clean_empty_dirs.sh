#!/bin/bash

# Define source and destination directories
SOURCE_DIR="/Users/as/aixtiv-symphony-opus1.0.1"
DEST_DIR="/Users/as/asoos/wing"

# Create log file
LOG_FILE="empty_dirs_cleanup_$(date +%Y%m%d_%H%M%S).log"

echo "Starting empty directory cleanup at $(date)" > "$LOG_FILE"
echo "Source: $SOURCE_DIR" >> "$LOG_FILE"
echo "Destination: $DEST_DIR" >> "$LOG_FILE"
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
        if find "$dir" -type f -name "*.$ext" | grep -q .; then
            echo "  - WARNING: Found .$ext file(s) in $dir" >> "$LOG_FILE"
            found=1
        fi
    done
    
    # Also check for README files (case insensitive)
    if find "$dir" -type f -name "README*" -o -name "readme*" | grep -q .; then
        echo "  - WARNING: Found README file(s) in $dir" >> "$LOG_FILE"
        found=1
    fi
    
    return $found
}

# Find empty directories or directories with only unimportant files
echo "Finding empty directories in source..." >> "$LOG_FILE"

# Function to process directory
process_dir() {
    local dir=$1
    local rel_path="${dir#$SOURCE_DIR/}"
    
    # Skip if this is the root directory
    if [[ -z "$rel_path" ]]; then
        return
    fi
    
    echo "----------------------------------------------" >> "$LOG_FILE"
    echo "Checking directory: $rel_path" >> "$LOG_FILE"
    
    # Check if directory is completely empty
    if [ -z "$(ls -A "$dir")" ]; then
        echo "  - Directory is completely empty" >> "$LOG_FILE"
        total_empty=$((total_empty + 1))
        
        # Check if directory exists in destination
        local dest_path="$DEST_DIR/$rel_path"
        if [ -d "$dest_path" ]; then
            found_in_dest=$((found_in_dest + 1))
            echo "  - Found in destination: YES" >> "$LOG_FILE"
            
            # Check if destination has files
            if [ -n "$(ls -A "$dest_path")" ]; then
                dest_has_files=$((dest_has_files + 1))
                echo "  - Destination has files: YES" >> "$LOG_FILE"
                echo "  - Safe to delete source directory" >> "$LOG_FILE"
                dirs_to_delete=$((dirs_to_delete + 1))
                echo "$dir" >> "$LOG_FILE.delete_list"
            else
                echo "  - Destination has files: NO" >> "$LOG_FILE"
                echo "  - Both directories empty, can delete source" >> "$LOG_FILE"
                dirs_to_delete=$((dirs_to_delete + 1))
                echo "$dir" >> "$LOG_FILE.delete_list"
            fi
        else
            echo "  - Found in destination: NO" >> "$LOG_FILE"
            echo "  - Source directory empty and not in destination, can delete" >> "$LOG_FILE"
            dirs_to_delete=$((dirs_to_delete + 1))
            echo "$dir" >> "$LOG_FILE.delete_list"
        fi
    else
        # Directory has some content, check if it contains only subdirectories
        if [ -z "$(find "$dir" -type f)" ]; then
            echo "  - Directory contains only subdirectories, no files" >> "$LOG_FILE"
            # We'll handle this after processing all directories
        else
            # Directory has files, check if they're important
            if has_important_files "$dir"; then
                echo "  - Contains important files, DO NOT DELETE" >> "$LOG_FILE"
            else
                echo "  - Contains only unimportant files, can be deleted after review" >> "$LOG_FILE"
                echo "$dir" >> "$LOG_FILE.review_list"
            fi
        fi
    fi
}

# Find all directories and process them (starting from deepest)
find "$SOURCE_DIR" -type d -not -path "*/\.*" | sort -r | while read -r dir; do
    process_dir "$dir"
done

# Create a summary
echo "----------------------------------------------" >> "$LOG_FILE"
echo "CLEANUP SUMMARY" >> "$LOG_FILE"
echo "Total empty directories: $total_empty" >> "$LOG_FILE"
echo "Empty directories found in destination: $found_in_dest" >> "$LOG_FILE"
echo "Destinations with files: $dest_has_files" >> "$LOG_FILE"
echo "Directories safe to delete: $dirs_to_delete" >> "$LOG_FILE"
echo "----------------------------------------------" >> "$LOG_FILE"

# Generate cleanup command
if [ -f "$LOG_FILE.delete_list" ]; then
    echo "" >> "$LOG_FILE"
    echo "CLEANUP COMMAND" >> "$LOG_FILE"
    echo "To delete all safe directories, run:" >> "$LOG_FILE"
    echo "cat \"$LOG_FILE.delete_list\" | xargs rmdir" >> "$LOG_FILE"
    
    echo "Cleanup analysis completed. Found $dirs_to_delete directories safe to delete."
    echo "To review results: less \"$LOG_FILE\""
    echo "To delete all safe directories, run: cat \"$LOG_FILE.delete_list\" | xargs rmdir"
else
    echo "No directories were found safe to delete."
fi

if [ -f "$LOG_FILE.review_list" ]; then
    echo "Found directories that need manual review before deletion."
    echo "Review them in: \"$LOG_FILE.review_list\""
fi
