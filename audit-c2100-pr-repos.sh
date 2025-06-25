#!/bin/bash

# C2100-PR Repository Audit Script
# Generated: 2025-06-22

set -e  # Exit on any error

echo "🔍 C2100-PR Repository Audit"
echo "============================"
echo

echo "📊 Analyzing 276 repositories in C2100-PR organization..."
echo "   This will help identify which repositories to keep, archive, or delete"
echo

# Get detailed repository information
echo "📋 Generating detailed repository list..."

gh repo list C2100-PR --limit 276 --json name,description,isPrivate,updatedAt,pushedAt,url,isArchived,isEmpty,isTemplate \
  --template '{{range .}}{{.name}}|{{.description}}|{{.isPrivate}}|{{.updatedAt}}|{{.pushedAt}}|{{.url}}|{{.isArchived}}|{{.isEmpty}}|{{.isTemplate}}
{{end}}' > /tmp/c2100-pr-repos.txt

echo "✅ Repository data collected"
echo

# Analysis categories
echo "🏷️ Categorizing repositories..."
echo

current_date=$(date +%s)
three_months_ago=$(date -d "3 months ago" +%s 2>/dev/null || date -v-3m +%s)
six_months_ago=$(date -d "6 months ago" +%s 2>/dev/null || date -v-6m +%s)

active_repos=()
inactive_repos=()
archived_repos=()
empty_repos=()
template_repos=()

while IFS='|' read -r name desc private updated pushed url archived empty template; do
    # Skip empty lines
    [ -z "$name" ] && continue
    
    # Parse date (simplified - using updated date)
    repo_date=$(date -d "$updated" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$updated" +%s 2>/dev/null || echo "$current_date")
    
    # Categorize
    if [ "$archived" = "true" ]; then
        archived_repos+=("$name")
    elif [ "$empty" = "true" ]; then
        empty_repos+=("$name")
    elif [ "$template" = "true" ]; then
        template_repos+=("$name")
    elif [ "$repo_date" -gt "$three_months_ago" ]; then
        active_repos+=("$name")
    else
        inactive_repos+=("$name")
    fi
    
done < /tmp/c2100-pr-repos.txt

# Display analysis
echo "📊 Analysis Results:"
echo "===================="
echo
echo "✅ Active (updated within 3 months): ${#active_repos[@]}"
echo "⏸️  Inactive (3+ months old): ${#inactive_repos[@]}"
echo "📦 Already archived: ${#archived_repos[@]}"
echo "🗳️  Empty repositories: ${#empty_repos[@]}"
echo "📄 Template repositories: ${#template_repos[@]}"
echo

# Show active repositories
if [ ${#active_repos[@]} -gt 0 ]; then
    echo "✅ ACTIVE REPOSITORIES (${#active_repos[@]}):"
    echo "   These should be kept and possibly consolidated"
    echo
    for repo in "${active_repos[@]}"; do
        echo "   • $repo"
    done | head -20
    
    if [ ${#active_repos[@]} -gt 20 ]; then
        echo "   ... and $((${#active_repos[@]} - 20)) more"
    fi
    echo
fi

# Show recommendations
echo "🎯 RECOMMENDATIONS:"
echo "=================="
echo

echo "1. 🗑️  SAFE TO DELETE (Empty repositories):"
if [ ${#empty_repos[@]} -gt 0 ]; then
    echo "   These repositories are empty and can be safely deleted:"
    for repo in "${empty_repos[@]}"; do
        echo "   • $repo"
    done | head -10
    
    if [ ${#empty_repos[@]} -gt 10 ]; then
        echo "   ... and $((${#empty_repos[@]} - 10)) more"
    fi
else
    echo "   ✅ No empty repositories found"
fi
echo

echo "2. 📦 CONSIDER ARCHIVING (Inactive repositories):"
if [ ${#inactive_repos[@]} -gt 0 ]; then
    echo "   These haven't been updated in 3+ months:"
    for repo in "${inactive_repos[@]}"; do
        echo "   • $repo"
    done | head -15
    
    if [ ${#inactive_repos[@]} -gt 15 ]; then
        echo "   ... and $((${#inactive_repos[@]} - 15)) more"
    fi
else
    echo "   ✅ No inactive repositories found"
fi
echo

echo "3. ✅ KEEP ACTIVE (Current development):"
echo "   Focus on these ${#active_repos[@]} repositories for active development"
echo

# Generate action scripts
echo "🔧 Generating cleanup scripts..."
echo

# Script to delete empty repositories
cat > /tmp/delete-empty-repos.sh << 'EOF'
#!/bin/bash
echo "⚠️  DANGER: This will permanently delete empty repositories!"
echo "   Press Ctrl+C within 10 seconds to cancel..."
sleep 10

EOF

if [ ${#empty_repos[@]} -gt 0 ]; then
    for repo in "${empty_repos[@]}"; do
        echo "echo \"Deleting empty repo: $repo\"" >> /tmp/delete-empty-repos.sh
        echo "gh repo delete C2100-PR/$repo --confirm" >> /tmp/delete-empty-repos.sh
    done
fi

# Script to archive inactive repositories
cat > /tmp/archive-inactive-repos.sh << 'EOF'
#!/bin/bash
echo "📦 Archiving inactive repositories..."
echo "   This preserves them but marks them as archived"
echo

EOF

if [ ${#inactive_repos[@]} -gt 0 ]; then
    for repo in "${inactive_repos[@]}"; do
        echo "echo \"Archiving inactive repo: $repo\"" >> /tmp/archive-inactive-repos.sh
        echo "gh repo edit C2100-PR/$repo --archived=true" >> /tmp/archive-inactive-repos.sh
    done
fi

chmod +x /tmp/delete-empty-repos.sh /tmp/archive-inactive-repos.sh

echo "📝 Generated cleanup scripts:"
echo "   /tmp/delete-empty-repos.sh    - Delete ${#empty_repos[@]} empty repositories"
echo "   /tmp/archive-inactive-repos.sh - Archive ${#inactive_repos[@]} inactive repositories"
echo

echo "⚠️  WARNING: Review the scripts before running them!"
echo

echo "💡 NEXT STEPS:"
echo "=============="
echo
echo "1. Review the generated scripts in /tmp/"
echo "2. Identify which active repositories to consolidate"
echo "3. Run cleanup scripts after careful review"
echo "4. Focus development on core active repositories"
echo

echo "🎯 FOCUS REPOSITORIES:"
echo "====================="
echo "   Consider consolidating development into these key areas:"
echo "   • aixtiv-cli (Command interface)"
echo "   • website-build (Deployment infrastructure)"
echo "   • DrLucy-5.0-Framework (Core framework)"
echo "   • Domain and infrastructure automation tools"
echo

# Summary statistics
total_repos=$((${#active_repos[@]} + ${#inactive_repos[@]} + ${#archived_repos[@]} + ${#empty_repos[@]} + ${#template_repos[@]}))
cleanup_potential=$((${#empty_repos[@]} + ${#inactive_repos[@]}))

echo "📊 CLEANUP POTENTIAL:"
echo "===================="
echo "   Total repositories: $total_repos"
echo "   Can be cleaned up: $cleanup_potential ($((cleanup_potential * 100 / total_repos))%)"
echo "   Would remain: $((total_repos - cleanup_potential))"
echo

# Cleanup temp file
rm -f /tmp/c2100-pr-repos.txt

echo "✅ Audit complete!"
