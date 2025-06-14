#!/bin/bash

echo "🧹 Cleaning embedded git repositories from ASOOS..."

# Step 1: Remove any known .git directories inside embedded repositories
rm -rf domain-management/domain-strategy-overview/.git
rm -rf vls/.git
rm -rf wing/WingRepo/.git

# Step 2: Unstage if they were previously tracked as embedded git repos
git rm --cached domain-management/domain-strategy-overview
git rm --cached vls
git rm --cached wing/WingRepo

# Step 3: Re-add those folders as normal directories
git add domain-management/domain-strategy-overview
git add vls
git add wing/WingRepo

# Step 4: Add remaining ASOOS components
git add wing/ academy/ integration-gateway/ repo-manifest.yaml

# Step 5: Commit the changes
git commit -m "🧹 Removed embedded repos and finalized ASOOS alignment"

# Step 6: Push to main branch
git push origin main

echo "✅ ASOOS Clean & Push Complete"
