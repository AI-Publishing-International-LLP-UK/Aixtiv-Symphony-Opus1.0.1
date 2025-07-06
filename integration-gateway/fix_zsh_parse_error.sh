#!/bin/bash
# Fix for zsh parse error
# This script demonstrates how to properly escape curly braces in zsh

# Method 1: Using single quotes
echo 'Example with curly braces in single quotes: for folder, files in project_structure.items(): { print(files) }'

# Method 2: Escaping the curly braces
echo "Example with escaped curly braces: for folder, files in project_structure.items(): \{ print(files) \}"

# Method 3: Using a heredoc for multiline Python code
cat << 'PYTHON_CODE'
import zipfile
import os

# Define the structure for the fallback Firebase deployment project
project_structure = {
    "aixtiv-firebase-deploy/": [
        ".firebaserc",
        "firebase.json",
        "public/index.html",
        "public/style.css",
        "deploy.sh"
    ]
}

# Create ZIP archive
with zipfile.ZipFile("output.zip", 'w') as zipf:
    for folder, files in project_structure.items():
        for file in files:
            zipf.write(file, arcname=os.path.join(folder, os.path.basename(file)))
PYTHON_CODE

echo "Script completed successfully!"
