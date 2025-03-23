#!/bin/bash

# Wing Git Repository Initialization
# This script creates a Git repository with a flat structure

# Set up logging
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="wing_git_init_${TIMESTAMP}.log"

# Define directories
SOURCE_DIR="/Users/as/asoos/wing"
GIT_DIR="${SOURCE_DIR}/WingRepo"

# Start logging
echo "Wing Git Repository Initialization - Started at $(date)" | tee -a "$LOG_FILE"
echo "=======================================================" | tee -a "$LOG_FILE"

# STEP 1: Create Git repository structure
echo "STEP 1: Setting up Git repository" | tee -a "$LOG_FILE"
mkdir -p "$GIT_DIR"

# Initialize Git repository
echo "  Initializing Git repository in $GIT_DIR" | tee -a "$LOG_FILE"
cd "$GIT_DIR" && git init

# Create flat directory structure
mkdir -p "$GIT_DIR/docs"
mkdir -p "$GIT_DIR/src"
mkdir -p "$GIT_DIR/config"
mkdir -p "$GIT_DIR/scripts"
mkdir -p "$GIT_DIR/assets"

echo "  Created flat directory structure" | tee -a "$LOG_FILE"
echo "  - docs: Documentation files (.md, .txt, etc.)" | tee -a "$LOG_FILE"
echo "  - src: Source code files (.js, .py, etc.)" | tee -a "$LOG_FILE"
echo "  - config: Configuration files (.json, .yaml, etc.)" | tee -a "$LOG_FILE"
echo "  - scripts: Script files (.sh, etc.)" | tee -a "$LOG_FILE"
echo "  - assets: Media and asset files (.jpg, .png, etc.)" | tee -a "$LOG_FILE"
echo "-------------------------------------------------------" | tee -a "$LOG_FILE"

# STEP 2: Create README and .gitignore
echo "STEP 2: Creating basic repository files" | tee -a "$LOG_FILE"

# Create README.md
cat > "$GIT_DIR/README.md" << 'README_EOF'
# Wing Project

This repository contains the consolidated Wing project files.

## Directory Structure

- `docs/`: Documentation files
- `src/`: Source code files
- `config/`: Configuration files
- `scripts/`: Script files
- `assets/`: Media and asset files

## Getting Started

1. Clone this repository
2. Navigate to the project directory
3. Review the documentation in the `docs/` directory

## Guidelines

- Maintain flat directory structure
- Avoid nesting repositories
- Follow the established file organization
README_EOF

# Create .gitignore
cat > "$GIT_DIR/.gitignore" << 'GITIGNORE_EOF'
# System files
.DS_Store
Thumbs.db

# Editor files
.idea/
.vscode/
*.swp
*.swo

# Log files
*.log

# Temporary files
tmp/
temp/

# Backup files
*.bak
*~
GITIGNORE_EOF

echo "  Created README.md and .gitignore" | tee -a "$LOG_FILE"
echo "-------------------------------------------------------" | tee -a "$LOG_FILE"

# STEP 3: Initial commit
echo "STEP 3: Creating initial commit" | tee -a "$LOG_FILE"
cd "$GIT_DIR"
git add .
git commit -m "Initial repository setup with directory structure"

echo "  Created initial commit" | tee -a "$LOG_FILE"
echo "-------------------------------------------------------" | tee -a "$LOG_FILE"

# STEP 4: Display next steps
echo "STEP 4: Next steps" | tee -a "$LOG_FILE"
echo "Git repository has been initialized at: $GIT_DIR" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "To add files to this repository:" | tee -a "$LOG_FILE"
echo "1. Copy or move your important files to the appropriate directories" | tee -a "$LOG_FILE"
echo "2. Use git add and git commit to track changes" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Example:" | tee -a "$LOG_FILE"
echo "  cp /path/to/important/file.js $GIT_DIR/src/" | tee -a "$LOG_FILE"
echo "  cd $GIT_DIR" | tee -a "$LOG_FILE"
echo "  git add src/file.js" | tee -a "$LOG_FILE"
echo "  git commit -m \"Add important file\"" | tee -a "$LOG_FILE"
echo "-------------------------------------------------------" | tee -a "$LOG_FILE"

echo "Wing Git Repository has been initialized successfully!"
echo "See $LOG_FILE for details"
