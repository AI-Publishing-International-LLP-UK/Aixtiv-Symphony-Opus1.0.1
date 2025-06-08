#!/bin/bash

# WarpApp Structure Validator
# This script checks that all required WarpApp security files are in place

echo "Validating WarpApp security structure..."

# Files that should exist
REQUIRED_FILES=(
  ".gitignore"
  ".gitattributes"
  ".github/workflows/warp-guardian.yml"
  "README.md"
  "rollback-warpapp.sh"
  "publish-release.sh"
  "tag-next-release.sh"
)

# Check each file
MISSING_FILES=0
for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file exists"
  elif [ -d "$file" ]; then
    echo "✅ $file exists (directory)"
  else
    echo "❌ $file is missing"
    MISSING_FILES=$((MISSING_FILES+1))
  fi
done

# Check for executable permissions on scripts
SCRIPT_FILES=(
  "rollback-warpapp.sh"
  "publish-release.sh"
  "tag-next-release.sh"
)

for script in "${SCRIPT_FILES[@]}"; do
  if [ -f "$script" ]; then
    if [ -x "$script" ]; then
      echo "✅ $script is executable"
    else
      echo "❌ $script is not executable - fixing..."
      chmod +x "$script"
      echo "✅ $script permissions fixed"
    fi
  fi
done

# Check GitHub workflow structure
if [ -f ".github/workflows/warp-guardian.yml" ]; then
  if grep -q "name: Warp Guardian" ".github/workflows/warp-guardian.yml"; then
    echo "✅ Warp Guardian workflow is properly configured"
  else
    echo "⚠️ Warp Guardian workflow might be misconfigured"
  fi
fi

# Summary
if [ $MISSING_FILES -eq 0 ]; then
  echo -e "\n✅ WarpApp security structure validation PASSED"
  echo "All required files are present and properly configured."
else
  echo -e "\n❌ WarpApp security structure validation FAILED"
  echo "$MISSING_FILES required files are missing."
  echo "Please run the WarpApp security patch script to fix these issues."
  exit 1
fi
