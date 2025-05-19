#!/usr/bin/env node

/**
 * Update Dependencies Script
 * 
 * This script adds the required dependencies for GCP Secret Manager integration
 * to both the integration-gateway and aixtiv-cli projects.
 * 
 * Dependencies to add:
 * - @google-cloud/secret-manager
 * - node-cache
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Define constants
const INTEGRATION_GATEWAY_PATH = path.resolve(__dirname, '..');
const AIXTIV_CLI_PATH = path.resolve('/Users/as/asoos/aixtiv-cli');
const DEPENDENCIES_TO_ADD = {
  '@google-cloud/secret-manager': '^6.1.0',
  'node-cache': '^5.1.2'
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt user
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Helper to format output with colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper function to log with colors
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Create or update package.json for integration-gateway
 */
async function updateIntegrationGateway() {
  log('\nUpdating integration-gateway project...', colors.blue);
  
  const packageJsonPath = path.join(INTEGRATION_GATEWAY_PATH, 'package.json');
  let packageJson;
  
  // Check if package.json exists
  if (fs.existsSync(packageJsonPath)) {
    log('Found existing package.json, updating...', colors.green);
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  } else {
    log('No package.json found, creating new file...', colors.yellow);
    packageJson = {
      name: 'integration-gateway',
      version: '1.0.0',
      description: 'Aixtiv Symphony Integration Gateway',
      main: 'index.js',
      scripts: {
        test: 'echo "Error: no test specified" && exit 1'
      },
      keywords: [
        'aixtiv',
        'symphony',
        'gateway',
        'integration'
      ],
      author: '',
      license: 'UNLICENSED',
      dependencies: {},
      devDependencies: {}
    };
  }
  
  // Add dependencies if they don't exist or update them
  if (!packageJson.dependencies) {
    packageJson.dependencies = {};
  }
  
  let dependenciesAdded = false;
  
  for (const [dependency, version] of Object.entries(DEPENDENCIES_TO_ADD)) {
    if (!packageJson.dependencies[dependency] || 
        packageJson.dependencies[dependency] !== version) {
      packageJson.dependencies[dependency] = version;
      dependenciesAdded = true;
      log(`Added/Updated dependency: ${dependency}@${version}`, colors.green);
    } else {
      log(`Dependency already up to date: ${dependency}@${version}`, colors.cyan);
    }
  }
  
  // Write updated package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  log('Saved package.json file', colors.green);
  
  // Install dependencies if any were added/updated
  if (dependenciesAdded) {
    const shouldInstall = await prompt('Install dependencies now? (y/n): ');
    if (shouldInstall.toLowerCase() === 'y') {
      log('Installing dependencies...', colors.blue);
      try {
        execSync('npm install', { cwd: INTEGRATION_GATEWAY_PATH, stdio: 'inherit' });
        log('Dependencies installed successfully', colors.green);
      } catch (error) {
        log(`Error installing dependencies: ${error.message}`, colors.red);
      }
    }
  }
  
  return dependenciesAdded;
}

/**
 * Update package.json for aixtiv-cli
 */
async function updateAixtivCli() {
  log('\nUpdating aixtiv-cli project...', colors.blue);
  
  const packageJsonPath = path.join(AIXTIV_CLI_PATH, 'package.json');
  
  // Check if package.json exists
  if (!fs.existsSync(packageJsonPath)) {
    log('Error: package.json not found in aixtiv-cli project', colors.red);
    return false;
  }
  
  log('Found existing package.json, updating...', colors.green);
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Add dependencies if they don't exist or update them
  if (!packageJson.dependencies) {
    packageJson.dependencies = {};
  }
  
  let dependenciesAdded = false;
  
  for (const [dependency, version] of Object.entries(DEPENDENCIES_TO_ADD)) {
    if (!packageJson.dependencies[dependency] || 
        packageJson.dependencies[dependency] !== version) {
      packageJson.dependencies[dependency] = version;
      dependenciesAdded = true;
      log(`Added/Updated dependency: ${dependency}@${version}`, colors.green);
    } else {
      log(`Dependency already up to date: ${dependency}@${version}`, colors.cyan);
    }
  }
  
  // Write updated package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  log('Saved package.json file', colors.green);
  
  // Install dependencies if any were added/updated
  if (dependenciesAdded) {
    const shouldInstall = await prompt('Install dependencies now? (y/n): ');
    if (shouldInstall.toLowerCase() === 'y') {
      log('Installing dependencies...', colors.blue);
      try {
        execSync('npm install', { cwd: AIXTIV_CLI_PATH, stdio: 'inherit' });
        log('Dependencies installed successfully', colors.green);
      } catch (error) {
        log(`Error installing dependencies: ${error.message}`, colors.red);
      }
    }
  }
  
  return dependenciesAdded;
}

/**
 * Main function
 */
async function main() {
  log('=== GCP Secrets Manager Dependencies Update ===\n', colors.cyan);
  
  try {
    // Update integration-gateway project
    const igUpdated = await updateIntegrationGateway();
    
    // Update aixtiv-cli project
    const acUpdated = await updateAixtivCli();
    
    // Summary
    log('\n=== Update Summary ===', colors.cyan);
    log(`integration-gateway: ${igUpdated ? 'Updated' : 'No changes required'}`, igUpdated ? colors.green : colors.yellow);
    log(`aixtiv-cli: ${acUpdated ? 'Updated' : 'No changes required'}`, acUpdated ? colors.green : colors.yellow);
    
    log('\nDependencies update completed successfully.', colors.green);
    log('\nNext steps:', colors.blue);
    log('1. Run npm install in each project if you haven\'t already');
    log('2. Configure GCP Secret Manager using the aixtiv secrets:init command');
    log('3. Update your code to use the new GCP Secrets Manager integration');
    
  } catch (error) {
    log(`\nAn error occurred: ${error.message}`, colors.red);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
}

