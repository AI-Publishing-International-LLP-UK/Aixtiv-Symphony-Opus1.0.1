#!/bin/bash

# Firebase Import Replacement Script
# Step 2 of Firebase Migration: Replace imports with shim module

set -e

echo "🔄 Firebase Import Replacement - Step 2"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "firebase-shim" ]; then
    echo -e "${RED}❌ Error: Must be run from ASOOS root directory with firebase-shim created${NC}"
    exit 1
fi

# Statistics
TOTAL_FILES=0
MODIFIED_FILES=0
REPLACED_IMPORTS=0

# Pattern replacements for Firebase imports
echo -e "${YELLOW}📝 Replacing Firebase import patterns...${NC}"

# Find all JavaScript/TypeScript files (excluding node_modules, .git, and shim)
FILES=$(find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \) \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./firebase-shim/*" \
    -not -path "./.wrangler/*" \
    -not -path "./dist/*" \
    -not -path "./build/*")

for file in $FILES; do
    ((TOTAL_FILES++))
    
    # Skip if file doesn't contain firebase references
    if ! grep -q "firebase" "$file" 2>/dev/null; then
        continue
    fi
    
    echo "🔧 Processing: $file"
    
    # Create backup
    cp "$file" "$file.firebase-backup"
    
    # Track if file was modified
    ORIGINAL_CONTENT=$(cat "$file")
    
    # Replace various Firebase import patterns
    
    # Replace: import firebase from 'firebase'
    sed -i "s/import firebase from ['\"]firebase['\"];*/import firebase from '@asoos\/firebase-shim';/g" "$file"
    
    # Replace: import * as firebase from 'firebase'
    sed -i "s/import \* as firebase from ['\"]firebase['\"];*/import * as firebase from '@asoos\/firebase-shim';/g" "$file"
    
    # Replace: import { ... } from 'firebase/...'
    sed -i "s/import {[^}]*} from ['\"]firebase\/[^'\"]*['\"];*/\/\/ DEPRECATED: Firebase import replaced with shim - implement Cloudflare equivalent/g" "$file"
    
    # Replace: import 'firebase/...'
    sed -i "s/import ['\"]firebase\/[^'\"]*['\"];*/\/\/ DEPRECATED: Firebase import replaced with shim - implement Cloudflare equivalent/g" "$file"
    
    # Replace: const firebase = require('firebase')
    sed -i "s/const firebase = require(['\"]firebase['\"])/const firebase = require('@asoos\/firebase-shim')/g" "$file"
    
    # Replace: require('firebase')
    sed -i "s/require(['\"]firebase['\"])/require('@asoos\/firebase-shim')/g" "$file"
    
    # Replace Firebase Admin imports
    sed -i "s/import admin from ['\"]firebase-admin['\"];*/import admin from '@asoos\/firebase-shim\/admin';/g" "$file"
    sed -i "s/import \* as admin from ['\"]firebase-admin['\"];*/import * as admin from '@asoos\/firebase-shim\/admin';/g" "$file"
    sed -i "s/const admin = require(['\"]firebase-admin['\"])/const admin = require('@asoos\/firebase-shim\/admin')/g" "$file"
    sed -i "s/require(['\"]firebase-admin['\"])/require('@asoos\/firebase-shim\/admin')/g" "$file"
    
    # Replace Firebase Functions imports
    sed -i "s/import functions from ['\"]firebase-functions['\"];*/import functions from '@asoos\/firebase-shim\/functions';/g" "$file"
    sed -i "s/import \* as functions from ['\"]firebase-functions['\"];*/import * as functions from '@asoos\/firebase-shim\/functions';/g" "$file"
    sed -i "s/const functions = require(['\"]firebase-functions['\"])/const functions = require('@asoos\/firebase-shim\/functions')/g" "$file"
    sed -i "s/require(['\"]firebase-functions['\"])/require('@asoos\/firebase-shim\/functions')/g" "$file"
    
    # Add deprecation warnings as comments
    if grep -q "@asoos/firebase-shim" "$file"; then
        # Add warning comment at the top if not already present
        if ! grep -q "FIREBASE DEPRECATED" "$file"; then
            temp_file=$(mktemp)
            {
                echo "// ⚠️  FIREBASE DEPRECATED: This file uses Firebase shim. Replace with Cloudflare services ASAP!"
                echo "// TODO: Migrate to Cloudflare Workers, D1, KV, or R2 as appropriate"
                echo ""
                cat "$file"
            } > "$temp_file"
            mv "$temp_file" "$file"
        fi
    fi
    
    # Check if file was actually modified
    if [ "$ORIGINAL_CONTENT" != "$(cat "$file")" ]; then
        ((MODIFIED_FILES++))
        echo -e "${GREEN}  ✅ Modified${NC}"
        
        # Count replacement instances
        IMPORT_COUNT=$(grep -c "@asoos/firebase-shim" "$file" 2>/dev/null || echo "0")
        ((REPLACED_IMPORTS += IMPORT_COUNT))
    else
        # Remove backup if no changes
        rm "$file.firebase-backup"
        echo "  ℹ️  No changes needed"
    fi
done

# Handle specific file types that need special attention

# Update package.json files to include the shim as a dependency
echo -e "${YELLOW}📦 Updating package.json files...${NC}"
for package_file in $(find . -name "package.json" -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./firebase-shim/*"); do
    if grep -q "firebase" "$package_file"; then
        echo "🔧 Processing package.json: $package_file"
        
        # Create backup
        cp "$package_file" "$package_file.firebase-backup"
        
        # Add shim dependency and comment out Firebase packages
        # This is more complex, so we'll use a Node.js script approach
        node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('$package_file', 'utf8'));
        
        // Add shim dependency
        if (!pkg.dependencies) pkg.dependencies = {};
        pkg.dependencies['@asoos/firebase-shim'] = 'file:./firebase-shim';
        
        // Comment out Firebase dependencies by renaming them
        const firebaseDeps = ['firebase', 'firebase-admin', 'firebase-functions'];
        let modified = false;
        
        ['dependencies', 'devDependencies', 'peerDependencies'].forEach(depType => {
            if (!pkg[depType]) return;
            firebaseDeps.forEach(dep => {
                if (pkg[depType][dep]) {
                    pkg[depType]['_deprecated_' + dep] = pkg[depType][dep];
                    delete pkg[depType][dep];
                    modified = true;
                    console.log('Deprecated:', dep, 'in', depType);
                }
            });
        });
        
        if (modified || !pkg.dependencies['@asoos/firebase-shim']) {
            fs.writeFileSync('$package_file', JSON.stringify(pkg, null, 2) + '\n');
            console.log('Updated package.json');
        } else {
            console.log('No Firebase dependencies found');
        }
        " || echo "⚠️  Could not process $package_file with Node.js"
    fi
done

# Generate summary report
echo ""
echo -e "${GREEN}🎯 Firebase Import Replacement Complete!${NC}"
echo "========================================"
echo "📊 Summary:"
echo "  • Total files scanned: $TOTAL_FILES"
echo "  • Files modified: $MODIFIED_FILES"
echo "  • Import statements replaced: $REPLACED_IMPORTS"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Install the shim dependency: npm install"
echo "2. Run build tests to verify no import errors"
echo "3. Replace shimmed code with Cloudflare equivalents"
echo "4. Remove @asoos/firebase-shim once migration is complete"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "• All Firebase imports now use temporary shims"
echo "• Runtime calls will show deprecation warnings"
echo "• Replace with Cloudflare services as soon as possible"
echo "• Backup files created with .firebase-backup extension"

# Verify no direct Firebase imports remain
echo ""
echo -e "${YELLOW}🔍 Verifying no direct Firebase imports remain...${NC}"
if find . -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" | \
   grep -v node_modules | \
   grep -v firebase-shim | \
   xargs grep -l "from ['\"]firebase['\"]" 2>/dev/null | head -5; then
    echo -e "${RED}⚠️  WARNING: Direct Firebase imports still found!${NC}"
    echo "These files may need manual review:"
    find . -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" | \
    grep -v node_modules | \
    grep -v firebase-shim | \
    xargs grep -l "from ['\"]firebase['\"]" 2>/dev/null | head -10
else
    echo -e "${GREEN}✅ No direct Firebase imports detected${NC}"
fi

echo ""
echo -e "${GREEN}🚀 Firebase import replacement completed successfully!${NC}"
echo "Run 'npm run build' to test the changes."
