#!/usr/bin/env node

/**
 * Service Account Key Manager
 *
 * This script automates the process of updating Google Cloud service account keys
 * in the integration-gateway. It performs the following tasks:
 *
 * 1. Checks for changes between the current service account key and a new one
 * 2. Copies the new key to the proper location in the integration-gateway directory
 * 3. Stages the changes in git
 * 4. Commits the changes
 * 5. Pushes to production
 *
 * Usage:
 *   node service-account-key-manager.js [path-to-new-key-file]
 *
 * If no path is provided, it will use the path specified in GOOGLE_APPLICATION_CREDENTIALS
 * environment variable.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const chalk = require('chalk');

// Configuration
const CONFIG = {
  // Default target location for the service account key
  targetKeyPath: path.resolve(__dirname, '..', 'service-account-key.json'),

  // Backup directory for old keys
  backupDir: path.resolve(__dirname, '..', '.key-backups'),

  // Git related config
  git: {
    commitMessage: 'Update service account key',
    branchName: 'main', // Change this to your main branch name if different
  },

  // Environment variable that might contain key path
  envKeyPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
};

/**
 * Calculate SHA-256 hash of a file
 * @param {string} filePath - Path to the file
 * @returns {string} - Hex digest of hash
 */
function calculateFileHash(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

/**
 * Validate that the file contains a valid service account key
 * @param {string} filePath - Path to the service account key file
 * @returns {boolean} - True if valid, false otherwise
 */
function validateServiceAccountKey(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(chalk.red(`File not found: ${filePath}`));
    return false;
  }

  try {
    const keyData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Check for required fields in a Google service account key
    const requiredFields = [
      'type',
      'project_id',
      'private_key_id',
      'private_key',
      'client_email',
    ];

    for (const field of requiredFields) {
      if (!keyData[field]) {
        console.error(
          chalk.red(`Invalid service account key: missing ${field}`)
        );
        return false;
      }
    }

    // Additional check for the correct type
    if (keyData.type !== 'service_account') {
      console.error(
        chalk.red(
          `Invalid key type: ${keyData.type}. Expected: service_account`
        )
      );
      return false;
    }

    console.log(
      chalk.green(`✅ Valid service account key for: ${keyData.client_email}`)
    );
    return true;
  } catch (error) {
    console.error(
      chalk.red(`Error validating service account key: ${error.message}`)
    );
    return false;
  }
}

/**
 * Create a backup of the current key
 * @param {string} currentKeyPath - Path to the current key
 * @returns {boolean} - True if backup successful, false otherwise
 */
function backupCurrentKey(currentKeyPath) {
  if (!fs.existsSync(currentKeyPath)) {
    console.log(chalk.yellow('No existing key file to backup.'));
    return true;
  }

  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(CONFIG.backupDir)) {
      fs.mkdirSync(CONFIG.backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupPath = path.join(
      CONFIG.backupDir,
      `service-account-key.${timestamp}.json.bak`
    );

    fs.copyFileSync(currentKeyPath, backupPath);
    console.log(chalk.green(`✅ Created backup at: ${backupPath}`));
    return true;
  } catch (error) {
    console.error(chalk.red(`Error creating backup: ${error.message}`));
    return false;
  }
}

/**
 * Run a git command and return the output
 * @param {string} command - Git command to run
 * @returns {string} - Command output
 */
function runGitCommand(command) {
  try {
    const output = execSync(command, {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
    });
    return output.trim();
  } catch (error) {
    throw new Error(`Git command failed: ${error.message}`);
  }
}

/**
 * Check if the working directory is clean (ignoring .DS_Store files)
 * @returns {boolean} - True if clean, false otherwise
 */
function isGitWorkingDirClean() {
  try {
    const status = runGitCommand('git status --porcelain');

    // If status is empty, directory is clean
    if (status === '') {
      return true;
    }

    // Split by lines and check if there are changes other than .DS_Store files
    const lines = status.split('\n');
    for (const line of lines) {
      // If this line doesn't mention .DS_Store, there are non-DS_Store changes
      if (line !== '' && !line.includes('.DS_Store')) {
        return false;
      }
    }

    // Only .DS_Store files were changed/untracked, consider it clean
    console.log(
      chalk.yellow('⚠️ Note: Ignoring .DS_Store files in git status')
    );
    return true;
  } catch (error) {
    console.error(chalk.red(`Error checking git status: ${error.message}`));
    return false;
  }
}

/**
 * Commit and push the changes
 * @returns {boolean} - True if successful, false otherwise
 */
function commitAndPushChanges() {
  try {
    console.log(chalk.blue('🔄 Staging changes...'));
    runGitCommand(`git add ${CONFIG.targetKeyPath}`);

    console.log(chalk.blue('🔄 Committing changes...'));
    const timestamp = new Date().toISOString();
    runGitCommand(`git commit -m "${CONFIG.git.commitMessage} [${timestamp}]"`);

    console.log(chalk.blue('🔄 Pushing to remote...'));
    runGitCommand(`git push origin ${CONFIG.git.branchName}`);

    console.log(chalk.green('✅ Changes pushed to production'));
    return true;
  } catch (error) {
    console.error(chalk.red(`Error in git operations: ${error.message}`));
    return false;
  }
}

/**
 * Main function to update the service account key
 * @param {string} newKeyPath - Path to the new key file
 */
function updateServiceAccountKey(newKeyPath) {
  console.log(chalk.blue('🔑 Service Account Key Manager'));
  console.log(chalk.blue('===========================\n'));

  // Validate parameters
  if (!newKeyPath) {
    console.error(
      chalk.red('Error: No path provided for the new service account key.')
    );
    console.log(
      chalk.yellow(
        'Usage: node service-account-key-manager.js [path-to-new-key-file]'
      )
    );
    process.exit(1);
  }

  console.log(chalk.blue(`Source key: ${newKeyPath}`));
  console.log(chalk.blue(`Target key: ${CONFIG.targetKeyPath}\n`));

  // Check if new key exists and is valid
  if (!validateServiceAccountKey(newKeyPath)) {
    console.error(chalk.red('Error: Invalid service account key.'));
    process.exit(1);
  }

  // Check if the target directory is in a git repository
  try {
    runGitCommand('git rev-parse --is-inside-work-tree');
  } catch (error) {
    console.error(chalk.red('Error: Not in a git repository.'));
    process.exit(1);
  }

  // Check if the working directory is clean
  if (!isGitWorkingDirClean()) {
    console.error(
      chalk.red(
        'Error: Git working directory is not clean. Please commit or stash changes before updating the key.'
      )
    );
    process.exit(1);
  }

  // Calculate hashes for comparison
  const currentKeyHash = calculateFileHash(CONFIG.targetKeyPath);
  const newKeyHash = calculateFileHash(newKeyPath);

  // Check if key has changed
  if (currentKeyHash && currentKeyHash === newKeyHash) {
    console.log(
      chalk.yellow(
        '⚠️ The new key is identical to the current key. No update needed.'
      )
    );
    process.exit(0);
  }

  console.log(chalk.blue('🔄 Updating service account key...'));

  // Backup the current key
  if (currentKeyHash && !backupCurrentKey(CONFIG.targetKeyPath)) {
    console.error(chalk.red('Error: Failed to backup current key.'));
    process.exit(1);
  }

  // Copy the new key to the target location
  try {
    fs.copyFileSync(newKeyPath, CONFIG.targetKeyPath);
    // Set appropriate permissions (600 - owner read/write only)
    fs.chmodSync(CONFIG.targetKeyPath, 0o600);
    console.log(chalk.green('✅ Service account key updated successfully'));
  } catch (error) {
    console.error(chalk.red(`Error copying key file: ${error.message}`));
    process.exit(1);
  }

  // Commit and push the changes
  if (!commitAndPushChanges()) {
    console.error(chalk.red('Error: Failed to commit and push changes.'));
    process.exit(1);
  }

  // Update environment variable in .zshrc if necessary
  try {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const zshrcPath = path.join(homeDir, '.zshrc');

    if (fs.existsSync(zshrcPath)) {
      let zshrcContent = fs.readFileSync(zshrcPath, 'utf8');
      const envVarRegex = /export GOOGLE_APPLICATION_CREDENTIALS="[^"]+"/g;

      if (envVarRegex.test(zshrcContent)) {
        zshrcContent = zshrcContent.replace(
          envVarRegex,
          `export GOOGLE_APPLICATION_CREDENTIALS="${CONFIG.targetKeyPath}"`
        );
        fs.writeFileSync(zshrcPath, zshrcContent, 'utf8');
        console.log(
          chalk.green('✅ Updated GOOGLE_APPLICATION_CREDENTIALS in .zshrc')
        );
      }
    }
  } catch (error) {
    console.warn(
      chalk.yellow(`Warning: Could not update .zshrc: ${error.message}`)
    );
  }

  console.log(
    chalk.green('\n✅ Service account key management completed successfully!')
  );

  console.log(chalk.blue('\nRemember to run:'));
  console.log(chalk.cyan('  source ~/.zshrc'));
  console.log(
    chalk.blue(
      'to refresh your environment variables in the current terminal session.'
    )
  );
}

// Program entry point
(function main() {
  // Get the new key path from command line arguments or environment variable
  const newKeyPath = process.argv[2] || CONFIG.envKeyPath;
  updateServiceAccountKey(newKeyPath);
})();
