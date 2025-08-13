#!/usr/bin/env node
/**
 * Firebase to Cloudflare Migration Script
 * This script inventories all Firebase files and ensures Cloudflare equivalents exist
 * NO HARDCODED SECRETS - All secrets referenced via environment variables or secret managers
 */

const fs = require('fs');
const path = require('path');

// Array of all Firebase files found in the workspace
const FIREBASE_FILES_INVENTORY = [
  // Already in DEPRECATED_FIREBASE_FILES directory
  './DEPRECATED_FIREBASE_FILES/firebase-monitoring.sh',
  './DEPRECATED_FIREBASE_FILES/cloudbase-debug.log.DEPRECATED',
  './DEPRECATED_FIREBASE_FILES/firebase-alert.log',
  './DEPRECATED_FIREBASE_FILES/.firebase/hosting.ZG93bmxvYWRlZF9jb250ZW50.cache',
  './DEPRECATED_FIREBASE_FILES/.firebase/hosting.cHVibGljL2RvY3RvcnMtbGl2ZQ.cache',
  './DEPRECATED_FIREBASE_FILES/.firebase/hosting.cHVibGlj.cache',

  // Active Firebase files that need to be archived
  './integration-gateway/vls/solutions/dr-memoria-anthology-launch/firebase.json.DISABLED',
  './integration-gateway/vls/solutions/dr-memoria-anthology-launch/.firebaserc.DISABLED',
  './integration-gateway/vls/solutions/dr-memoria-anthology-launch/functions/config/firebase.js',
  './integration-gateway/firebase.json.DISABLED',
  './integration-gateway/config/firebase.json.DISABLED',
  './integration-gateway/firebase-mcp.json',
  './integration-gateway/.firebaserc.DISABLED',
  './integration-gateway/utils/firebase-pre-deploy-helper.mjs',
  './integration-gateway/utils/firebase-pre-deploy-helper.js',
  './integration-gateway/docs/FIREBASE_DOMAIN_AUTOSCALING.md',
  './integration-gateway/docs/firebase/firebase-career-trajectory-system.md',
  './integration-gateway/docs/firebase/anti-prisma-firebase-career-trajectory-system.md',
  './integration-gateway/docs/firebase/firebase-workflow.md',
  './integration-gateway/asoos-deploy/firebase.json.DISABLED',
  './integration-gateway/asoos-deploy/.firebaserc.DISABLED',
  './integration-gateway/firebase_deploy.sh.DISABLED',
];

// Files that contain Firebase references but may need Cloudflare equivalents
const FILES_WITH_FIREBASE_REFERENCES = [
  './connectors/as-general-ai-connector.js',
  './integration-gateway/connectors/as-general-ai-connector.js',
  './integration-gateway/middleware/enhanced-auth-middleware.js',
  './integration-gateway/middleware/sallyport-cloudflare-auth.js',
  './integration-gateway/PHASE_2A_MASTER_IMPLEMENTATION_STRATEGY.md',
  './integration-gateway/deploy-sallyport-cloudflare-auth.sh',
];

// Cloudflare equivalent files that should exist
const CLOUDFLARE_EQUIVALENTS = {
  'firebase.json': 'wrangler.toml',
  '.firebaserc': 'wrangler.toml', // Project config goes in wrangler.toml
  'firebase-pre-deploy-helper.mjs': 'cloudflare-pre-deploy-helper.mjs',
  'firebase-pre-deploy-helper.js': 'cloudflare-pre-deploy-helper.js',
  'firebase-monitoring.sh': 'cloudflare-monitoring.sh',
  'firebase_deploy.sh': 'cloudflare_deploy.sh',
  'firebase-alert.log': 'cloudflare-alert.log',
  'firebase-mcp.json': 'cloudflare-mcp.json',
};

// Function to check if Cloudflare equivalents exist
function checkCloudflareEquivalents() {
  console.log('🔍 Checking for Cloudflare equivalent files...\n');

  const missingEquivalents = [];

  FIREBASE_FILES_INVENTORY.forEach(firebaseFile => {
    const fileName = path.basename(firebaseFile);
    const dirName = path.dirname(firebaseFile);

    // Skip cache files and deprecated directory files
    if (fileName.includes('.cache') || dirName.includes('DEPRECATED_FIREBASE_FILES')) {
      return;
    }

    // Check if we have a Cloudflare equivalent defined
    const cloudflareEquivalent = CLOUDFLARE_EQUIVALENTS[fileName.replace('.DISABLED', '')];

    if (cloudflareEquivalent) {
      const cloudflareFilePath = path.join(dirName, cloudflareEquivalent);

      if (!fs.existsSync(cloudflareFilePath)) {
        missingEquivalents.push({
          firebase: firebaseFile,
          cloudflare: cloudflareFilePath,
          needed: true,
        });
      } else {
        console.log(`✅ ${cloudflareEquivalent} exists for ${fileName}`);
      }
    }
  });

  return missingEquivalents;
}

// Function to validate no hardcoded secrets
function validateNoHardcodedSecrets() {
  console.log('\n🔐 Validating no hardcoded secrets...\n');

  const secretPatterns = [
    /AIza[0-9A-Za-z-_]{35}/g, // Google API keys
    /ya29\.[0-9A-Za-z\-_]+/g, // OAuth tokens
    /"project_id":\s*"[^"]+"/g, // Project IDs in JSON
    /"api_key":\s*"[^"]+"/g, // API keys in JSON
    /GOOGLE_APPLICATION_CREDENTIALS.*=.*[^$]/g, // Hardcoded credentials paths
  ];

  const riskyFiles = [];

  [...FIREBASE_FILES_INVENTORY, ...FILES_WITH_FIREBASE_REFERENCES].forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');

        secretPatterns.forEach((pattern, index) => {
          const matches = content.match(pattern);
          if (matches) {
            riskyFiles.push({
              file: filePath,
              pattern: index,
              matches: matches.length,
            });
          }
        });
      } catch (error) {
        console.log(`⚠️  Could not read ${filePath}: ${error.message}`);
      }
    }
  });

  return riskyFiles;
}

// Main execution
if (require.main === module) {
  console.log('🚀 Firebase to Cloudflare Migration Analysis\n');
  console.log(`📊 Total Firebase files found: ${FIREBASE_FILES_INVENTORY.length}`);
  console.log(`🔍 Files with Firebase references: ${FILES_WITH_FIREBASE_REFERENCES.length}\n`);

  const missingEquivalents = checkCloudflareEquivalents();
  const riskyFiles = validateNoHardcodedSecrets();

  if (missingEquivalents.length > 0) {
    console.log('\n❌ Missing Cloudflare equivalents:');
    missingEquivalents.forEach(item => {
      console.log(`   ${item.firebase} -> ${item.cloudflare}`);
    });
  }

  if (riskyFiles.length > 0) {
    console.log('\n🚨 Files with potential hardcoded secrets:');
    riskyFiles.forEach(item => {
      console.log(`   ${item.file} (${item.matches} matches)`);
    });
  } else {
    console.log('\n✅ No hardcoded secrets detected');
  }

  console.log('\n📋 Next steps:');
  console.log('1. Create missing Cloudflare equivalent files');
  console.log('2. Move all Firebase files to R2 archive container');
  console.log('3. Update references to use Cloudflare equivalents');
  console.log('4. Verify all secrets use environment variables or secret managers');
}

module.exports = {
  FIREBASE_FILES_INVENTORY,
  FILES_WITH_FIREBASE_REFERENCES,
  CLOUDFLARE_EQUIVALENTS,
  checkCloudflareEquivalents,
  validateNoHardcodedSecrets,
};
