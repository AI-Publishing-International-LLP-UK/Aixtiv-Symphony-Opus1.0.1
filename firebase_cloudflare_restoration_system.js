#!/usr/bin/env node
/**
 * Firebase to Cloudflare Migration and File Restoration System
 * This script handles:
 * 1. Creating missing Cloudflare equivalent files
 * 2. Identifying Firebase files for archival
 * 3. Finding erroneously deleted system files
 * 4. Generating lists of files that remain deleted
 *
 * NO HARDCODED SECRETS - Uses environment variables and secret managers
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ===== CONFIGURATION =====
const WORKSPACE_ROOT = '/Users/as/asoos';
const FIREBASE_ARCHIVE_DIR = 'DEPRECATED_FIREBASE_FILES';
const R2_ARCHIVE_CONTAINER = process.env.CLOUDFLARE_R2_ARCHIVE_BUCKET || 'asoos-firebase-archive';

// ===== FIREBASE FILES INVENTORY =====
const FIREBASE_FILES_INVENTORY = [
  // Already in DEPRECATED_FIREBASE_FILES directory
  './DEPRECATED_FIREBASE_FILES/firebase-monitoring.sh',
  './DEPRECATED_FIREBASE_FILES/cloudbase-debug.log.DEPRECATED',
  './DEPRECATED_FIREBASE_FILES/firebase-alert.log',
  './DEPRECATED_FIREBASE_FILES/.firebase/hosting.ZG93bmxvYWRlZF9jb250ZW50.cache',
  './DEPRECATED_FIREBASE_FILES/.firebase/hosting.cHVibGljL2RvY3RvcnMtbGl2ZQ.cache',
  './DEPRECATED_FIREBASE_FILES/.firebase/hosting.cHVibGlj.cache',

  // Active Firebase files that need archival
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

// ===== FILES WITH FIREBASE REFERENCES THAT NEED CLOUDFLARE EQUIVALENTS =====
const FILES_WITH_FIREBASE_REFERENCES = [
  './connectors/as-general-ai-connector.js',
  './integration-gateway/connectors/as-general-ai-connector.js',
  './integration-gateway/middleware/enhanced-auth-middleware.js',
  './integration-gateway/middleware/sallyport-cloudflare-auth.js',
  './integration-gateway/PHASE_2A_MASTER_IMPLEMENTATION_STRATEGY.md',
  './integration-gateway/deploy-sallyport-cloudflare-auth.sh',
];

// ===== CLOUDFLARE EQUIVALENTS MAPPING =====
const CLOUDFLARE_EQUIVALENTS = {
  'firebase.json': 'wrangler.toml',
  '.firebaserc': 'wrangler.toml', // Project config consolidates to wrangler.toml
  'firebase-pre-deploy-helper.mjs': 'cloudflare-pre-deploy-helper.mjs',
  'firebase-pre-deploy-helper.js': 'cloudflare-pre-deploy-helper.js',
  'firebase-monitoring.sh': 'cloudflare-monitoring.sh',
  'firebase_deploy.sh': 'cloudflare_deploy.sh',
  'firebase-alert.log': 'cloudflare-alert.log',
  'firebase-mcp.json': 'cloudflare-mcp.json',
  'firebase.js': 'cloudflare.js',
};

// ===== SYSTEM FILES THAT WERE ERRONEOUSLY DELETED =====
const ERRONEOUSLY_DELETED_SYSTEM_FILES = [
  // Core system configuration files
  './package.json',
  './tsconfig.json',
  './README.md',
  './docker-compose.yml',
  './Dockerfile',

  // Integration gateway core files
  './integration-gateway/package.json',
  './integration-gateway/tsconfig.json',
  './integration-gateway/README.md',
  './integration-gateway/docker-compose.yml',

  // Authentication and middleware files
  './integration-gateway/middleware/auth.js',
  './integration-gateway/middleware/cors.js',
  './integration-gateway/middleware/rate-limiting.js',

  // Core service files
  './integration-gateway/services/logger.js',
  './integration-gateway/services/database.js',
  './integration-gateway/services/cache.js',

  // Configuration files
  './integration-gateway/config/development.json',
  './integration-gateway/config/production.json',
  './integration-gateway/config/staging.json',

  // Deployment scripts
  './integration-gateway/scripts/deploy.sh',
  './integration-gateway/scripts/setup.sh',
  './integration-gateway/scripts/backup.sh',
];

// ===== FILES THAT REMAIN AS DELETED =====
const FILES_REMAIN_DELETED = [
  // These are files that should stay deleted or archived
  './firebase-admin-sdk-service-account.json', // Contains secrets, should use env vars
  './google-services.json', // Android config, deprecated
  './GoogleService-Info.plist', // iOS config, deprecated
  './.firebaserc', // Root firebase config, replaced by wrangler.toml
  './firebase.json', // Root firebase config, replaced by wrangler.toml
  './firestore.rules', // Firestore rules, replaced by Cloudflare D1 schemas
  './firestore.indexes.json', // Firestore indexes, replaced by D1 indexes
  './storage.rules', // Firebase storage rules, replaced by R2 policies

  // Firebase functions - replaced by Cloudflare Workers
  './functions/index.js',
  './functions/package.json',
  './functions/.eslintrc.js',

  // Firebase hosting - replaced by Cloudflare Pages
  './public/index.html', // If it was just Firebase hosting default
  './public/404.html', // If it was just Firebase hosting default

  // Firebase-specific CI/CD files
  './.github/workflows/firebase-deploy.yml',
  './.github/workflows/firebase-hosting-merge.yml',
  './.github/workflows/firebase-hosting-pull-request.yml',
];

// ===== UTILITY FUNCTIONS =====

function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function fileExists(filePath) {
  return fs.existsSync(path.join(WORKSPACE_ROOT, filePath));
}

function createFileFromTemplate(templatePath, targetPath, replacements = {}) {
  ensureDirectoryExists(path.join(WORKSPACE_ROOT, targetPath));

  let content = '';
  if (fs.existsSync(templatePath)) {
    content = fs.readFileSync(templatePath, 'utf8');
  }

  // Apply replacements
  Object.keys(replacements).forEach(key => {
    const regex = new RegExp(key, 'g');
    content = content.replace(regex, replacements[key]);
  });

  fs.writeFileSync(path.join(WORKSPACE_ROOT, targetPath), content);
}

// ===== MAIN FUNCTIONS =====

function checkCloudflareEquivalents() {
  console.log('🔍 Checking for missing Cloudflare equivalent files...\n');

  const missingEquivalents = [];
  const existingEquivalents = [];

  FIREBASE_FILES_INVENTORY.forEach(firebaseFile => {
    const fileName = path.basename(firebaseFile);
    const dirName = path.dirname(firebaseFile);

    // Skip cache files and deprecated directory files
    if (fileName.includes('.cache') || dirName.includes('DEPRECATED_FIREBASE_FILES')) {
      return;
    }

    // Check if we have a Cloudflare equivalent defined
    const cleanFileName = fileName.replace('.DISABLED', '');
    const cloudflareEquivalent = CLOUDFLARE_EQUIVALENTS[cleanFileName];

    if (cloudflareEquivalent) {
      const cloudflareFilePath = path.join(dirName, cloudflareEquivalent);

      if (!fileExists(cloudflareFilePath)) {
        missingEquivalents.push({
          firebase: firebaseFile,
          cloudflare: cloudflareFilePath,
          needed: true,
        });
      } else {
        existingEquivalents.push({
          firebase: firebaseFile,
          cloudflare: cloudflareFilePath,
          exists: true,
        });
      }
    }
  });

  return { missingEquivalents, existingEquivalents };
}

function validateNoHardcodedSecrets() {
  console.log('\n🔐 Validating no hardcoded secrets...\n');

  const secretPatterns = [
    { name: 'Google API Key', pattern: /AIza[0-9A-Za-z-_]{35}/g },
    { name: 'OAuth Token', pattern: /ya29\.[0-9A-Za-z\-_]+/g },
    { name: 'Project ID in JSON', pattern: /"project_id":\s*"[^"]+"/g },
    { name: 'API Key in JSON', pattern: /"api_key":\s*"[^"]+"/g },
    { name: 'Hardcoded Credentials', pattern: /GOOGLE_APPLICATION_CREDENTIALS.*=.*[^$]/g },
    { name: 'Firebase Config Object', pattern: /const\s+firebaseConfig\s*=\s*{[^}]+}/g },
  ];

  const riskyFiles = [];

  [...FIREBASE_FILES_INVENTORY, ...FILES_WITH_FIREBASE_REFERENCES].forEach(filePath => {
    const fullPath = path.join(WORKSPACE_ROOT, filePath);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');

        secretPatterns.forEach((patternInfo, index) => {
          const matches = content.match(patternInfo.pattern);
          if (matches) {
            riskyFiles.push({
              file: filePath,
              patternName: patternInfo.name,
              patternIndex: index,
              matches: matches.length,
              firstMatch: matches[0].substring(0, 50) + '...',
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

function checkErroneouslyDeletedFiles() {
  console.log('\n📁 Checking for erroneously deleted system files...\n');

  const deletedSystemFiles = [];
  const existingSystemFiles = [];

  ERRONEOUSLY_DELETED_SYSTEM_FILES.forEach(filePath => {
    if (!fileExists(filePath)) {
      deletedSystemFiles.push(filePath);
    } else {
      existingSystemFiles.push(filePath);
    }
  });

  return { deletedSystemFiles, existingSystemFiles };
}

function generateRestorationPlan() {
  console.log('\n📋 Generating comprehensive restoration plan...\n');

  const plan = {
    cloudflareEquivalents: checkCloudflareEquivalents(),
    secretValidation: validateNoHardcodedSecrets(),
    systemFiles: checkErroneouslyDeletedFiles(),
    archivalPlan: FIREBASE_FILES_INVENTORY.filter(file => fileExists(file)),
    deletionPlan: FILES_REMAIN_DELETED,
  };

  return plan;
}

function createCloudflareEquivalentFiles(missingEquivalents) {
  console.log('\n🛠️  Creating missing Cloudflare equivalent files...\n');

  const templates = {
    'wrangler.toml': `name = "{{PROJECT_NAME}}"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
name = "{{PROJECT_NAME}}-prod"

[env.staging]
name = "{{PROJECT_NAME}}-staging"

[[kv_namespaces]]
binding = "KV_NAMESPACE"
id = "{{KV_NAMESPACE_ID}}"

[[d1_databases]]
binding = "DB"
database_name = "{{DATABASE_NAME}}"
database_id = "{{DATABASE_ID}}"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "{{BUCKET_NAME}}"`,

    'cloudflare-pre-deploy-helper.js': `#!/usr/bin/env node
/**
 * Cloudflare Pre-Deploy Helper
 * Replaced Firebase equivalent - handles Cloudflare Workers deployment
 * Uses environment variables for all secrets
 */

const { execSync } = require('child_process');

// Environment variables - NO HARDCODED SECRETS
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const PROJECT_NAME = process.env.PROJECT_NAME || 'asoos-integration';

if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
  console.error('❌ Missing required environment variables:');
  console.error('   CLOUDFLARE_ACCOUNT_ID');
  console.error('   CLOUDFLARE_API_TOKEN');
  process.exit(1);
}

console.log('🚀 Starting Cloudflare pre-deployment checks...');

// Pre-deployment validation
try {
  // Check wrangler auth
  execSync('wrangler whoami', { stdio: 'inherit' });
  
  // Validate configuration
  execSync('wrangler publish --dry-run', { stdio: 'inherit' });
  
  console.log('✅ Pre-deployment checks passed');
} catch (error) {
  console.error('❌ Pre-deployment checks failed:', error.message);
  process.exit(1);
}`,

    'cloudflare-monitoring.sh': `#!/bin/bash
# Cloudflare Monitoring Script
# Replaced Firebase monitoring - monitors Cloudflare Workers and services
# Uses environment variables for authentication

echo "🔍 Cloudflare Monitoring Check - $(date)"
echo "=============================================="

# Check Cloudflare Workers status
echo "1. Checking Cloudflare Workers status..."
if command -v wrangler > /dev/null 2>&1; then
    echo "✅ Wrangler CLI available"
    wrangler deployments list --name "$PROJECT_NAME" 2>/dev/null | head -5
else
    echo "❌ Wrangler CLI not found"
fi

# Check KV storage
echo ""
echo "2. Checking KV storage..."
if [ -n "$CLOUDFLARE_KV_NAMESPACE_ID" ]; then
    echo "✅ KV namespace configured: $CLOUDFLARE_KV_NAMESPACE_ID"
else
    echo "⚠️  KV namespace not configured"
fi

# Check D1 database
echo ""
echo "3. Checking D1 database..."
if [ -n "$CLOUDFLARE_D1_DATABASE_ID" ]; then
    echo "✅ D1 database configured: $CLOUDFLARE_D1_DATABASE_ID"
else
    echo "⚠️  D1 database not configured"
fi

# Check R2 storage
echo ""
echo "4. Checking R2 storage..."
if [ -n "$CLOUDFLARE_R2_BUCKET_NAME" ]; then
    echo "✅ R2 bucket configured: $CLOUDFLARE_R2_BUCKET_NAME"
else
    echo "⚠️  R2 bucket not configured"
fi

echo ""
echo "✅ Cloudflare monitoring complete"`,

    'cloudflare.js': `/**
 * Cloudflare Integration Module
 * Replaces Firebase functionality with Cloudflare equivalents
 * NO HARDCODED SECRETS - Uses environment variables
 */

class CloudflareIntegration {
  constructor() {
    // Environment variables - NO HARDCODED SECRETS
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN;
    this.kvNamespaceId = process.env.CLOUDFLARE_KV_NAMESPACE_ID;
    this.d1DatabaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
    this.r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    
    if (!this.accountId || !this.apiToken) {
      throw new Error('Missing required Cloudflare environment variables');
    }
  }

  async getKVValue(key) {
    // KV storage equivalent to Firebase Firestore document reads
    const response = await fetch(
      \`https://api.cloudflare.com/client/v4/accounts/\${this.accountId}/storage/kv/namespaces/\${this.kvNamespaceId}/values/\${key}\`,
      {
        headers: {
          'Authorization': \`Bearer \${this.apiToken}\`,
          'Content-Type': 'application/json'
        }
      }
    );
    return await response.text();
  }

  async setKVValue(key, value) {
    // KV storage equivalent to Firebase Firestore document writes
    const response = await fetch(
      \`https://api.cloudflare.com/client/v4/accounts/\${this.accountId}/storage/kv/namespaces/\${this.kvNamespaceId}/values/\${key}\`,
      {
        method: 'PUT',
        headers: {
          'Authorization': \`Bearer \${this.apiToken}\`,
          'Content-Type': 'text/plain'
        },
        body: value
      }
    );
    return await response.json();
  }

  async queryD1(sql, params = []) {
    // D1 database equivalent to Firebase Firestore queries
    const response = await fetch(
      \`https://api.cloudflare.com/client/v4/accounts/\${this.accountId}/d1/database/\${this.d1DatabaseId}/query\`,
      {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${this.apiToken}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql, params })
      }
    );
    return await response.json();
  }

  async uploadToR2(key, data) {
    // R2 storage equivalent to Firebase Storage uploads
    const response = await fetch(
      \`https://api.cloudflare.com/client/v4/accounts/\${this.accountId}/r2/buckets/\${this.r2BucketName}/objects/\${key}\`,
      {
        method: 'PUT',
        headers: {
          'Authorization': \`Bearer \${this.apiToken}\`,
          'Content-Type': 'application/octet-stream'
        },
        body: data
      }
    );
    return await response.json();
  }
}

module.exports = { CloudflareIntegration };`,
  };

  let createdCount = 0;
  missingEquivalents.forEach(item => {
    const fileName = path.basename(item.cloudflare);
    const template = templates[fileName] || templates[fileName.split('.')[0] + '.js'] || '';

    if (template) {
      try {
        createFileFromTemplate('', item.cloudflare, {
          '{{PROJECT_NAME}}': process.env.PROJECT_NAME || 'asoos-integration',
          '{{KV_NAMESPACE_ID}}': process.env.CLOUDFLARE_KV_NAMESPACE_ID || 'your-kv-namespace-id',
          '{{DATABASE_NAME}}': process.env.DATABASE_NAME || 'asoos-db',
          '{{DATABASE_ID}}': process.env.CLOUDFLARE_D1_DATABASE_ID || 'your-database-id',
          '{{BUCKET_NAME}}': process.env.CLOUDFLARE_R2_BUCKET_NAME || 'asoos-storage',
        });

        // Write the template content
        fs.writeFileSync(path.join(WORKSPACE_ROOT, item.cloudflare), template);
        console.log(`✅ Created: ${item.cloudflare}`);
        createdCount++;
      } catch (error) {
        console.error(`❌ Failed to create ${item.cloudflare}: ${error.message}`);
      }
    } else {
      console.log(`⚠️  No template available for: ${fileName}`);
    }
  });

  console.log(`\n📊 Created ${createdCount} Cloudflare equivalent files`);
}

// ===== MAIN EXECUTION =====
if (require.main === module) {
  console.log('🚀 Firebase to Cloudflare Migration and Restoration System\n');
  console.log('===========================================================\n');

  const plan = generateRestorationPlan();

  // Display results
  console.log('📊 SYSTEM ANALYSIS RESULTS');
  console.log('===========================\n');

  console.log(`🔥 Firebase files to archive: ${plan.archivalPlan.length}`);
  console.log(`☁️  Missing Cloudflare equivalents: ${plan.cloudflareEquivalents.missingEquivalents.length}`);
  console.log(`✅ Existing Cloudflare equivalents: ${plan.cloudflareEquivalents.existingEquivalents.length}`);
  console.log(`📁 Erroneously deleted system files: ${plan.systemFiles.deletedSystemFiles.length}`);
  console.log(`🔒 Files with potential secrets: ${plan.secretValidation.length}`);
  console.log(`🗑️  Files that remain deleted: ${plan.deletionPlan.length}\n`);

  // Show missing Cloudflare equivalents
  if (plan.cloudflareEquivalents.missingEquivalents.length > 0) {
    console.log('❌ MISSING CLOUDFLARE EQUIVALENTS:');
    plan.cloudflareEquivalents.missingEquivalents.forEach(item => {
      console.log(`   ${item.firebase} → ${item.cloudflare}`);
    });
    console.log('');
  }

  // Show erroneously deleted system files
  if (plan.systemFiles.deletedSystemFiles.length > 0) {
    console.log('🚨 ERRONEOUSLY DELETED SYSTEM FILES:');
    plan.systemFiles.deletedSystemFiles.forEach(file => {
      console.log(`   ${file}`);
    });
    console.log('');
  }

  // Show files with potential secrets
  if (plan.secretValidation.length > 0) {
    console.log('🔐 FILES WITH POTENTIAL HARDCODED SECRETS:');
    plan.secretValidation.forEach(item => {
      console.log(`   ${item.file} (${item.patternName}: ${item.matches} matches)`);
    });
    console.log('');
  }

  // Show files that remain deleted
  console.log('🗑️  FILES THAT REMAIN AS DELETED (BY DESIGN):');
  plan.deletionPlan.forEach(file => {
    console.log(`   ${file}`);
  });
  console.log('');

  // Action prompts
  console.log('🛠️  RECOMMENDED ACTIONS:');
  console.log('========================');

  if (plan.cloudflareEquivalents.missingEquivalents.length > 0) {
    console.log('1. Create missing Cloudflare equivalent files');
    console.log('   Run with --create-cloudflare to execute');
  }

  if (plan.systemFiles.deletedSystemFiles.length > 0) {
    console.log('2. Restore erroneously deleted system files');
    console.log('   Check git history or backups to restore these files');
  }

  if (plan.secretValidation.length > 0) {
    console.log('3. Remove hardcoded secrets and use environment variables');
    console.log('   Update files to use process.env variables instead');
  }

  console.log('4. Archive Firebase files to R2 container');
  console.log('5. Update references to use Cloudflare equivalents\n');

  // Handle command line arguments
  const args = process.argv.slice(2);
  if (args.includes('--create-cloudflare')) {
    createCloudflareEquivalentFiles(plan.cloudflareEquivalents.missingEquivalents);
  }

  // Save detailed report
  const reportPath = path.join(WORKSPACE_ROOT, 'firebase_cloudflare_migration_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(plan, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}`);
}

module.exports = {
  FIREBASE_FILES_INVENTORY,
  FILES_WITH_FIREBASE_REFERENCES,
  CLOUDFLARE_EQUIVALENTS,
  ERRONEOUSLY_DELETED_SYSTEM_FILES,
  FILES_REMAIN_DELETED,
  generateRestorationPlan,
  createCloudflareEquivalentFiles,
};
