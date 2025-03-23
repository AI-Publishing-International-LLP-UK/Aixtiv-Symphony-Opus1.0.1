
#!/bin/bash

echo "🚀 Initiating Commit & Push Sequence..."

# Define directory and filenames
REPO_DIR="domain-strategy-overview"
ZIP_FILE="Final_Domain_Strategy_Deployment_Bundle.zip"

# Ensure repo directory exists
mkdir -p $REPO_DIR
cp $ZIP_FILE $REPO_DIR/

cd $REPO_DIR

# Initialize git if needed
if [ ! -d ".git" ]; then
    git init
fi

# Set git user info (customize as needed)
git config user.name "Dr. Lucy Automation"
git config user.email "automation@aixtiv.com"

# Add, commit, and push
git add .
git commit -m "🔐 Commit: Final Domain Strategy Overview Bundle"
git branch -M main
git remote remove origin 2>/dev/null
git remote add origin git@bitbucket.org:YOUR_WORKSPACE/YOUR_REPO.git
git push -u origin main

echo "✓ Commit & Push Complete."
