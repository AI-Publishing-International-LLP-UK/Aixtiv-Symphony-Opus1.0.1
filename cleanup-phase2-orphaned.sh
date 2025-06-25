#!/bin/bash

# Repository Cleanup Phase 2: Orphaned Repository Analysis
# Generated: 2025-06-22

set -e  # Exit on any error

echo "🔍 Repository Cleanup Phase 2: Orphaned Repository Analysis"
echo "==========================================================="
echo

echo "📋 Analyzing repositories with no remote tracking..."
echo

# Function to analyze an orphaned repository
analyze_orphaned() {
    local repo_path="$1"
    local repo_name=$(basename "$repo_path")
    
    echo "=== 📁 $repo_name ==="
    echo "Path: $repo_path"
    
    cd "$repo_path" 2>/dev/null || return
    
    # Check if it has commits
    commit_count=$(git rev-list --count HEAD 2>/dev/null || echo "0")
    echo "Commits: $commit_count"
    
    if [ "$commit_count" -gt 0 ]; then
        last_commit=$(git log -1 --format="%cr" 2>/dev/null || echo "unknown")
        echo "Last commit: $last_commit"
        
        # Show recent activity
        echo "Recent files:"
        git ls-files | head -5 | while read file; do
            echo "  - $file"
        done
        if [ $(git ls-files | wc -l) -gt 5 ]; then
            total_files=$(git ls-files | wc -l)
            echo "  ... and $((total_files - 5)) more files"
        fi
    else
        echo "Status: Empty repository (no commits)"
    fi
    
    echo "Actions available:"
    echo "  1. Connect to existing remote repository"
    echo "  2. Create new GitHub repository"
    echo "  3. Merge into parent repository"
    echo "  4. Remove (if empty/unnecessary)"
    echo
    
    read -p "Choose action (1-4, or 's' to skip): " action
    
    case $action in
        1)
            echo "🔗 Connect to existing remote:"
            read -p "  Enter GitHub repository URL: " remote_url
            if [ -n "$remote_url" ]; then
                git remote add origin "$remote_url"
                echo "  ✅ Remote added. You can now push with: git push -u origin main"
            fi
            ;;
        2)
            echo "🆕 Create new repository:"
            echo "  You'll need to manually create the GitHub repository first"
            echo "  Suggested name: $repo_name"
            read -p "  Press Enter when repository is created, then provide URL: " remote_url
            if [ -n "$remote_url" ]; then
                git remote add origin "$remote_url"
                echo "  ✅ Remote added. You can now push with: git push -u origin main"
            fi
            ;;
        3)
            echo "📦 Merge into parent - manual action required"
            echo "  Consider moving files to parent directory and removing .git"
            ;;
        4)
            echo "🗑️ Remove repository:"
            read -p "  Are you sure? This cannot be undone (y/N): " confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                rm -rf "$repo_path"
                echo "  ✅ Repository removed"
            else
                echo "  ⏭️ Removal cancelled"
            fi
            ;;
        s|S)
            echo "  ⏭️ Skipped for now"
            ;;
        *)
            echo "  ❌ Invalid option, skipped"
            ;;
    esac
    echo
}

# Find orphaned repositories (no remotes, not in backup directories)
echo "🔎 Scanning for orphaned repositories..."
echo

orphaned_repos=()
while IFS= read -r -d '' gitdir; do
    repo_dir=$(dirname "$gitdir")
    
    # Skip backup directories
    if echo "$repo_dir" | grep -q "backup\|build/backups"; then
        continue
    fi
    
    cd "$repo_dir" 2>/dev/null || continue
    
    # Check if it has remotes
    remote_count=$(git remote | wc -l 2>/dev/null || echo "0")
    
    if [ "$remote_count" -eq 0 ]; then
        orphaned_repos+=("$repo_dir")
    fi
done < <(find /Users/as/asoos -name ".git" -type d -print0)

if [ ${#orphaned_repos[@]} -eq 0 ]; then
    echo "✅ No orphaned repositories found!"
else
    echo "📊 Found ${#orphaned_repos[@]} orphaned repositories:"
    echo
    
    for repo in "${orphaned_repos[@]}"; do
        analyze_orphaned "$repo"
    done
fi

echo "🏁 Phase 2 Complete!"
echo
echo "📋 Next Steps:"
echo "   1. Run: ./cleanup-phase3-standardize.sh"
echo "   2. Review: repository-cleanup-plan.md"
