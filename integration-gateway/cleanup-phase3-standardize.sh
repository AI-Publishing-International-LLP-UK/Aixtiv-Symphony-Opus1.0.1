#!/bin/bash

# Repository Cleanup Phase 3: Remote Standardization
# Generated: 2025-06-22

set -e  # Exit on any error

echo "🔧 Repository Cleanup Phase 3: Remote Standardization"
echo "======================================================"
echo

# Function to standardize repository remotes
standardize_remotes() {
    local repo_path="$1"
    local expected_repo_name="$2"
    local expected_url="$3"
    
    echo "=== 📁 $(basename "$repo_path") ==="
    echo "Path: $repo_path"
    echo "Expected: $expected_url"
    
    cd "$repo_path" 2>/dev/null || {
        echo "❌ Cannot access directory"
        echo
        return
    }
    
    # Show current remotes
    echo "Current remotes:"
    if git remote -v 2>/dev/null | head -10; then
        echo
    else
        echo "  No remotes found"
        echo
    fi
    
    # Check if expected remote exists
    if git remote -v 2>/dev/null | grep -q "$expected_url"; then
        echo "✅ Already correctly configured"
        echo
        return
    fi
    
    echo "🔧 Standardization needed"
    echo "Actions:"
    echo "  1. Remove incorrect remotes and add correct one"
    echo "  2. Add correct remote as additional remote"
    echo "  3. Skip (manual configuration needed)"
    echo
    
    read -p "Choose action (1-3): " action
    
    case $action in
        1)
            echo "🔄 Removing existing remotes..."
            git remote -v | awk '{print $1}' | sort -u | while read remote_name; do
                if [ -n "$remote_name" ]; then
                    echo "  Removing: $remote_name"
                    git remote remove "$remote_name" 2>/dev/null || true
                fi
            done
            
            echo "➕ Adding correct remote..."
            git remote add origin "$expected_url"
            echo "✅ Standardization complete"
            
            # Check if we need to create the GitHub repository
            echo "🔍 Testing remote connectivity..."
            if ! git ls-remote origin >/dev/null 2>&1; then
                echo "⚠️  Remote repository doesn't exist or isn't accessible"
                echo "   You may need to create the repository on GitHub first:"
                echo "   $expected_url"
                echo "   Then push with: git push -u origin main"
            else
                echo "✅ Remote repository is accessible"
                echo "   You can push with: git push -u origin main"
            fi
            ;;
        2)
            echo "➕ Adding as additional remote..."
            
            # Find a unique remote name
            remote_name="ai-publishing"
            counter=1
            while git remote | grep -q "^${remote_name}$"; do
                remote_name="ai-publishing-${counter}"
                counter=$((counter + 1))
            done
            
            git remote add "$remote_name" "$expected_url"
            echo "✅ Added as remote: $remote_name"
            echo "   You can push with: git push -u $remote_name main"
            ;;
        3)
            echo "⏭️ Skipped - manual configuration needed"
            echo "   To standardize later, run:"
            echo "   cd $repo_path"
            echo "   git remote add origin $expected_url"
            ;;
        *)
            echo "❌ Invalid option, skipped"
            ;;
    esac
    echo
}

echo "🎯 Repositories requiring standardization:"
echo "   These currently point to wrong remotes or need GitHub repos created"
echo

# Repositories that need standardization
declare -A repos_to_fix=(
    ["/Users/as/asoos/integration-gateway"]="https://github.com/AI-Publishing-International-LLP-UK/integration-gateway.git"
    ["/Users/as/asoos/academy"]="https://github.com/AI-Publishing-International-LLP-UK/academy.git"
    ["/Users/as/asoos/vls"]="https://github.com/AI-Publishing-International-LLP-UK/vls.git"
    ["/Users/as/asoos/wing"]="https://github.com/AI-Publishing-International-LLP-UK/wing.git"
)

echo "📋 Creating missing GitHub repositories..."
echo "   These repositories need to be created in AI-Publishing-International-LLP-UK:"
echo

for repo_path in "${!repos_to_fix[@]}"; do
    repo_name=$(basename "$repo_path")
    expected_url="${repos_to_fix[$repo_path]}"
    
    echo "  - $repo_name ($expected_url)"
done

echo
read -p "Have you created these repositories on GitHub? (y/N): " github_created

if [[ ! $github_created =~ ^[Yy]$ ]]; then
    echo "⚠️  Please create the missing repositories first:"
    echo "   1. Go to https://github.com/AI-Publishing-International-LLP-UK"
    echo "   2. Click 'New repository'"
    echo "   3. Create each repository listed above"
    echo "   4. Set them as 'Private' initially"
    echo "   5. Re-run this script"
    echo
    exit 1
fi

echo "🔧 Proceeding with standardization..."
echo

# Standardize each repository
for repo_path in "${!repos_to_fix[@]}"; do
    if [ -d "$repo_path" ]; then
        repo_name=$(basename "$repo_path")
        expected_url="${repos_to_fix[$repo_path]}"
        standardize_remotes "$repo_path" "$repo_name" "$expected_url"
    else
        echo "❌ Repository not found: $repo_path"
        echo
    fi
done

echo "🏁 Phase 3 Complete!"
echo
echo "📊 Summary:"
echo "   - Standardized remote URLs to AI-Publishing-International-LLP-UK"
echo "   - Removed incorrect remote mappings"
echo "   - Configured proper GitHub integration"
echo
echo "📋 Final Steps:"
echo "   1. Test each repository with: git status"
echo "   2. Push changes with: git push -u origin main"
echo "   3. Review: repository-cleanup-plan.md"
echo "   4. Consider archiving unused C2100-PR repositories"

# Show final repository status
echo
echo "🔍 Final Repository Status:"
echo "=========================="

# Show active repositories and their remotes
find /Users/as/asoos -maxdepth 2 -name ".git" -type d | while read gitdir; do
    repo_dir=$(dirname "$gitdir")
    repo_name=$(basename "$repo_dir")
    
    # Skip if in backup directory
    if echo "$repo_dir" | grep -q "backup\|build/backups"; then
        continue
    fi
    
    echo "📁 $repo_name"
    cd "$repo_dir" 2>/dev/null || continue
    
    remote_count=$(git remote | wc -l 2>/dev/null || echo "0")
    if [ "$remote_count" -gt 0 ]; then
        git remote -v | head -2 | sed 's/^/   /'
    else
        echo "   ⚠️  No remotes configured"
    fi
    echo
done
