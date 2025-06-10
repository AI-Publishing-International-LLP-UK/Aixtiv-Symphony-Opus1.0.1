#!/bin/bash

echo "🧹 Cleaning embedded git repositories from ASOOS..."

# Step 1: Remove .git directories inside embedded repositories
rm -rf domain-management/domain-strategy-overview/.git
rm -rf vls/.git

# Step 2: Unstage those directories if previously added as embedded repos
git rm --cached domain-management/domain-strategy-overview
git rm --cached vls

# Step 3: Re-add as regular folders
git add domain-management/domain-strategy-overview
git add vls

# Step 4: Add remaining directories
git add wing/ academy/ integration-gateway/ repo-manifest.yaml

# Step 5: Commit the changes
git commit -m "🔧 Cleaned embedded repos and staged unified ASOOS components"

# Step 6: Push to GitHub main branch
git push origin main

echo "✅ Clean & Push Complete"
