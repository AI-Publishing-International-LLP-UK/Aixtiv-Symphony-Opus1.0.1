#!/bin/bash

# Repository Cleanup Phase 1: Safe Backup Removal
# Generated: 2025-06-22

set -e  # Exit on any error

echo "🧹 Repository Cleanup Phase 1: Backup Directory Removal"
echo "======================================================="
echo

# Function to safely remove a directory after confirmation
safe_remove() {
    local dir_path="$1"
    local description="$2"
    
    if [ -d "$dir_path" ]; then
        echo "📁 Found: $description"
        echo "   Path: $dir_path"
        
        # Show size
        size=$(du -sh "$dir_path" 2>/dev/null | cut -f1 || echo "unknown")
        echo "   Size: $size"
        
        # Count git repos inside
        git_count=$(find "$dir_path" -name ".git" -type d 2>/dev/null | wc -l)
        echo "   Git repos: $git_count"
        
        echo "   ⚠️  This will be permanently deleted!"
        echo
        
        read -p "   Remove this directory? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            echo "   🗑️  Removing $dir_path..."
            rm -rf "$dir_path"
            echo "   ✅ Successfully removed"
        else
            echo "   ⏭️  Skipped"
        fi
    else
        echo "📁 Not found: $description ($dir_path)"
    fi
    echo
}

echo "🎯 Target directories for removal:"
echo "   These contain old backups and duplicated git repositories"
echo "   Original work is preserved in the main directories"
echo

# Backup directories to remove
safe_remove "/Users/as/asoos/build/backups" "Build backups directory"
safe_remove "/Users/as/asoos/backups/20250524_222827_opus_backup" "Opus backup from May 2025"
safe_remove "/Users/as/asoos/vls-original-backup" "VLS original backup"

echo "🏁 Phase 1 Complete!"
echo
echo "📊 Summary:"
echo "   - Removed old backup directories"
echo "   - Preserved all active repositories"
echo "   - Reduced repository clutter"
echo
echo "📋 Next Steps:"
echo "   1. Run: ./cleanup-phase2-orphaned.sh"
echo "   2. Run: ./cleanup-phase3-standardize.sh"
echo "   3. Review: repository-cleanup-plan.md"
