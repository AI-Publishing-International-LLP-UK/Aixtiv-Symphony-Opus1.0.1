#!/bin/bash

echo "🧼 Starting Large File Cleanup for ASOOS..."

# Step 1: Add patterns to .gitignore
echo "📄 Updating .gitignore..."
cat <<EOL >> .gitignore

# Ignore large binaries and build artifacts
*.node
*.dmg
*.log.plan
node_modules/
backups/
my-academy/
wing_backup_*/
academy/node_modules/
EOL

# Step 2: Remove these files from Git index (but keep them locally)
echo "🧹 Removing large files from Git index..."
git rm --cached -r academy/node_modules/ 2>/dev/null
git rm --cached -r backups/ 2>/dev/null
git rm --cached -r wing_backup_*/ 2>/dev/null
git rm --cached -r my-academy/ 2>/dev/null

# Bulk remove common file types
find . -type f \( -name "*.node" -o -name "*.dmg" -o -name "*.log.plan" \) -exec git rm --cached {} +

# Step 3: Add .gitignore and commit cleanup
echo "✅ Staging .gitignore and committing cleanup..."
git add .gitignore
git commit -m "🧼 Removed oversized files and updated .gitignore to prevent future push failures"

# Step 4: Push to GitHub
echo "🚀 Pushing cleaned state to GitHub..."
git push origin main

echo "✅ Large File Cleanup Complete."
