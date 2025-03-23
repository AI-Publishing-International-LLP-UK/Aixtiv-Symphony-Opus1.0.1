#!/bin/bash

# Define source and destination directories
SOURCE_DIR="/Users/as/aixtiv-symphony-opus1.0.1"
DEST_DIR="/Users/as/asoos/wing"

# Create audit log file
AUDIT_LOG="consolidation_audit_$(date +%Y%m%d_%H%M%S).log"

echo "Starting consolidation audit at $(date)" > "$AUDIT_LOG"
echo "Source: $SOURCE_DIR" >> "$AUDIT_LOG"
echo "Destination: $DEST_DIR" >> "$AUDIT_LOG"
echo "----------------------------------------------" >> "$AUDIT_LOG"

# Find empty directories in source
echo "Finding empty directories in source..." >> "$AUDIT_LOG"

# Counter for statistics
total_empty=0
found_in_dest=0
has_files_in_dest=0
has_duplicates=0
files_moved=0
dirs_deleted=0

# Step 1: Audit and move files if needed
echo "PHASE 1: Auditing and moving files" >> "$AUDIT_LOG"
echo "----------------------------------------------" >> "$AUDIT_LOG"

# Create a temporary file for source directories to process
temp_file=$(mktemp)
find "$SOURCE_DIR" -type d -not -path "*/\.*" > "$temp_file"

# Process each directory
while read -r source_dir; do
    # Get relative path
    rel_path="${source_dir#$SOURCE_DIR/}"
    if [[ -z "$rel_path" ]]; then
        continue # Skip the root directory
    fi
    
    # Check if this is an empty directory or has files to move
    file_count=$(find "$source_dir" -type f -not -path "*/\.*" | wc -l)
    
    echo "----------------------------------------------" >> "$AUDIT_LOG"
    echo "Processing directory: $rel_path" >> "$AUDIT_LOG"
    echo "  - Files count: $file_count" >> "$AUDIT_LOG"
    
    # Check if directory exists in destination
    dest_path="$DEST_DIR/$rel_path"
    
    # If directory has files, we need to process them
    if [ "$file_count" -gt 0 ]; then
        echo "  - Contains files to examine" >> "$AUDIT_LOG"
        
        # Create destination directory if it doesn't exist
        if [ ! -d "$dest_path" ]; then
            mkdir -p "$dest_path"
            echo "  - Created destination directory" >> "$AUDIT_LOG"
        fi
        
        # Process each file
        find "$source_dir" -type f -not -path "*/\.*" | while read -r file; do
            filename=$(basename "$file")
            dest_file="$dest_path/$filename"
            
            # Check if file already exists in destination
            if [ -f "$dest_file" ]; then
                echo "  - File already exists in destination: $filename" >> "$AUDIT_LOG"
                
                # Compare files to see if they're identical
                if cmp -s "$file" "$dest_file"; then
                    echo "    - Files are identical, can delete source" >> "$AUDIT_LOG"
                else
                    echo "    - WARNING: Files differ! Keeping both" >> "$AUDIT_LOG"
                    # Rename source file to avoid overwriting
                    cp "$file" "$dest_path/${filename}.source"
                    echo "    - Copied source as ${filename}.source" >> "$AUDIT_LOG"
                    files_moved=$((files_moved + 1))
                fi
            else
                # Move the file to destination
                cp "$file" "$dest_file"
                echo "  - Moved file: $filename" >> "$AUDIT_LOG"
                files_moved=$((files_moved + 1))
            fi
        done
    else
        # This is an empty directory
        total_empty=$((total_empty + 1))
        echo "  - This is an empty directory" >> "$AUDIT_LOG"
        
        # Check if directory exists in destination
        if [ -d "$dest_path" ]; then
            found_in_dest=$((found_in_dest + 1))
            echo "  - Found in destination: YES" >> "$AUDIT_LOG"
            
            # Check if it has files
            dest_file_count=$(find "$dest_path" -type f 2>/dev/null | wc -l)
            if [ "$dest_file_count" -gt 0 ]; then
                has_files_in_dest=$((has_files_in_dest + 1))
                echo "  - Has files in destination: YES ($dest_file_count files)" >> "$AUDIT_LOG"
            else
                echo "  - Has files in destination: NO" >> "$AUDIT_LOG"
            fi
        else
            echo "  - Found in destination: NO" >> "$AUDIT_LOG"
        fi
    fi
done < "$temp_file"

# Clean up
rm "$temp_file"

# Step 2: After audit, delete empty directories that can be safely removed
echo "----------------------------------------------" >> "$AUDIT_LOG"
echo "PHASE 2: Cleaning up empty directories" >> "$AUDIT_LOG"
echo "----------------------------------------------" >> "$AUDIT_LOG"

# Find all empty directories that don't contain important files
find "$SOURCE_DIR" -type d -empty -not -path "*/\.*" | while read -r empty_dir; do
    # Skip root directory
    if [ "$empty_dir" = "$SOURCE_DIR" ]; then
        continue
    fi
    
    rel_path="${empty_dir#$SOURCE_DIR/}"
    echo "Empty directory to clean: $rel_path" >> "$AUDIT_LOG"
    
    # Check if corresponding directory in destination has content
    dest_path="$DEST_DIR/$rel_path"
    if [ -d "$dest_path" ]; then
        dest_file_count=$(find "$dest_path" -type f 2>/dev/null | wc -l)
        if [ "$dest_file_count" -gt 0 ]; then
            echo "  - Corresponding destination has $dest_file_count files, safe to delete source" >> "$AUDIT_LOG"
            echo "  - Would delete: $empty_dir" >> "$AUDIT_LOG"
            dirs_deleted=$((dirs_deleted + 1))
            # Uncomment to actually delete
            # rmdir "$empty_dir"
        else
            echo "  - Both source and destination are empty, would delete source" >> "$AUDIT_LOG"
            echo "  - Would delete: $empty_dir" >> "$AUDIT_LOG"
            dirs_deleted=$((dirs_deleted + 1))
            # Uncomment to actually delete
            # rmdir "$empty_dir"
        fi
    else
        echo "  - No corresponding destination directory, would delete source" >> "$AUDIT_LOG"
        echo "  - Would delete: $empty_dir" >> "$AUDIT_LOG"
        dirs_deleted=$((dirs_deleted + 1))
        # Uncomment to actually delete
        # rmdir "$empty_dir"
    fi
done

# Summary
echo "----------------------------------------------" >> "$AUDIT_LOG"
echo "AUDIT SUMMARY" >> "$AUDIT_LOG"
echo "Total empty directories in source: $total_empty" >> "$AUDIT_LOG"
echo "Directories found in destination: $found_in_dest" >> "$AUDIT_LOG"
echo "Directories with files in destination: $has_files_in_dest" >> "$AUDIT_LOG"
echo "Total files moved: $files_moved" >> "$AUDIT_LOG"
echo "Empty directories that would be deleted: $dirs_deleted" >> "$AUDIT_LOG"
echo "----------------------------------------------" >> "$AUDIT_LOG"
echo "Audit completed at $(date)" >> "$AUDIT_LOG"
echo "NOTE: Directory deletion is commented out by default for safety." >> "$AUDIT_LOG"
echo "To actually delete directories, uncomment the rmdir lines in the script." >> "$AUDIT_LOG"

echo "Audit completed. Results saved to $AUDIT_LOG"
echo "Statistics:"
echo "- Total empty directories in source: $total_empty"
echo "- Directories found in destination: $found_in_dest"
echo "- Directories with files in destination: $has_files_in_dest"
echo "- Total files moved: $files_moved"
echo "- Empty directories that would be deleted: $dirs_deleted"
echo ""
echo "NOTE: This was a dry run. No directories were actually deleted."
echo "To perform the actual deletion, edit the script and uncomment the rmdir commands."
