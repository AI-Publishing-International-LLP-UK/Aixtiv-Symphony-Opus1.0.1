#!/bin/bash

# This script will roll back all patch-related changes in WarpApp
# Only run this if something breaks or needs restoration

echo "Rolling back WarpApp lockdown patch..."

git restore .gitignore .gitattributes README.md
rm -rf .github/workflows/warp-guardian.yml

echo "Patch rollback complete. Run the following to commit and push the changes:"
echo "  git add .gitignore .gitattributes README.md .github"
echo "  git commit -m 'Rollback WarpApp lockdown patch'"
echo "  git push"
