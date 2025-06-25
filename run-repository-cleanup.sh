#!/bin/bash

# Master Repository Cleanup Script
# Generated: 2025-06-22

set -e  # Exit on any error

echo "🚀 Repository Cleanup & Standardization Master Script"
echo "====================================================="
echo
echo "This script will guide you through the complete repository cleanup process:"
echo "  Phase 1: Remove backup directories (safe)"
echo "  Phase 2: Handle orphaned repositories"
echo "  Phase 3: Standardize remote configurations"
echo "  Bonus: Audit C2100-PR repositories"
echo

# Check prerequisites
echo "🔍 Checking prerequisites..."
echo

# Check if we're in the right directory
if [ ! -f "repository-cleanup-plan.md" ]; then
    echo "❌ Please run this script from the integration-gateway directory"
    echo "   Current: $(pwd)"
    echo "   Expected: /Users/as/asoos/integration-gateway"
    exit 1
fi

# Check if GitHub CLI is available
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is required but not installed"
    echo "   Install with: brew install gh"
    exit 1
fi

# Check if authenticated with GitHub
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI"
    echo "   Run: gh auth login"
    exit 1
fi

echo "✅ All prerequisites met"
echo

# Show current repository status
echo "📊 Current Repository Status:"
echo "============================"
repo_count=$(find /Users/as/asoos -name ".git" -type d | wc -l)
backup_count=$(find /Users/as/asoos -path "*/backup*" -name ".git" -type d | wc -l)
orphaned_count=0

# Count orphaned repos
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
        orphaned_count=$((orphaned_count + 1))
    fi
done < <(find /Users/as/asoos -name ".git" -type d -print0)

echo "  Total repositories: $repo_count"
echo "  Backup repositories: $backup_count"
echo "  Orphaned repositories: $orphaned_count"
echo "  C2100-PR remote repos: 276"
echo "  AI-Publishing remote repos: 15"
echo

# Main menu
while true; do
    echo "🎯 Choose cleanup phase:"
    echo "======================="
    echo "  1. Phase 1: Remove backup directories ($backup_count repos)"
    echo "  2. Phase 2: Handle orphaned repositories ($orphaned_count repos)"
    echo "  3. Phase 3: Standardize remote configurations"
    echo "  4. Audit C2100-PR repositories (276 repos)"
    echo "  5. View cleanup plan"
    echo "  6. Show current status"
    echo "  7. Exit"
    echo
    
    read -p "Select option (1-7): " choice
    echo
    
    case $choice in
        1)
            echo "🧹 Starting Phase 1: Backup Directory Cleanup"
            echo "============================================="
            if [ -x "./cleanup-phase1-backups.sh" ]; then
                ./cleanup-phase1-backups.sh
            else
                echo "❌ cleanup-phase1-backups.sh not found or not executable"
            fi
            echo
            ;;
        2)
            echo "🔍 Starting Phase 2: Orphaned Repository Analysis"
            echo "================================================"
            if [ -x "./cleanup-phase2-orphaned.sh" ]; then
                ./cleanup-phase2-orphaned.sh
            else
                echo "❌ cleanup-phase2-orphaned.sh not found or not executable"
            fi
            echo
            ;;
        3)
            echo "🔧 Starting Phase 3: Remote Standardization"
            echo "==========================================="
            if [ -x "./cleanup-phase3-standardize.sh" ]; then
                ./cleanup-phase3-standardize.sh
            else
                echo "❌ cleanup-phase3-standardize.sh not found or not executable"
            fi
            echo
            ;;
        4)
            echo "📊 Starting C2100-PR Repository Audit"
            echo "====================================="
            if [ -x "./audit-c2100-pr-repos.sh" ]; then
                ./audit-c2100-pr-repos.sh
            else
                echo "❌ audit-c2100-pr-repos.sh not found or not executable"
            fi
            echo
            ;;
        5)
            echo "📋 Repository Cleanup Plan"
            echo "=========================="
            if [ -f "repository-cleanup-plan.md" ]; then
                cat repository-cleanup-plan.md
            else
                echo "❌ repository-cleanup-plan.md not found"
            fi
            echo
            ;;
        6)
            echo "📊 Current Repository Status"
            echo "==========================="
            
            # Refresh counts
            repo_count=$(find /Users/as/asoos -name ".git" -type d | wc -l)
            backup_count=$(find /Users/as/asoos -path "*/backup*" -name ".git" -type d | wc -l)
            active_count=$((repo_count - backup_count))
            
            echo "  Total repositories: $repo_count"
            echo "  Active repositories: $active_count"
            echo "  Backup repositories: $backup_count"
            echo
            
            echo "Active repositories:"
            find /Users/as/asoos -maxdepth 2 -name ".git" -type d | while read gitdir; do
                repo_dir=$(dirname "$gitdir")
                repo_name=$(basename "$repo_dir")
                
                # Skip backup directories
                if echo "$repo_dir" | grep -q "backup\|build/backups"; then
                    continue
                fi
                
                cd "$repo_dir" 2>/dev/null || continue
                
                remote_count=$(git remote | wc -l 2>/dev/null || echo "0")
                
                if [ "$remote_count" -gt 0 ]; then
                    primary_remote=$(git remote -v | head -1 | awk '{print $2}' | sed 's/.*github.com[:/]\([^/]*\).*/\1/')
                    echo "  ✅ $repo_name ($primary_remote)"
                else
                    echo "  ⚠️  $repo_name (no remotes)"
                fi
            done
            echo
            ;;
        7)
            echo "👋 Cleanup session ended"
            echo
            echo "📋 Summary of available tools:"
            echo "  • repository-cleanup-plan.md - Complete cleanup strategy"
            echo "  • cleanup-phase1-backups.sh - Remove backup directories"
            echo "  • cleanup-phase2-orphaned.sh - Handle orphaned repos"
            echo "  • cleanup-phase3-standardize.sh - Fix remote configurations"
            echo "  • audit-c2100-pr-repos.sh - Analyze GitHub repositories"
            echo
            echo "✅ All tools are ready for future use"
            break
            ;;
        *)
            echo "❌ Invalid option. Please choose 1-7."
            echo
            ;;
    esac
done
