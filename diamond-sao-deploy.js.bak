#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const chalk = require('chalk');

/**
 * Diamond SAO Deployment Accessor
 * Reads deployment commands from the Diamond SAO filing manifest
 * and executes ASOOS.2100.Cool deployments
 */

const MANIFEST_PATH = path.join(__dirname, 'Diamond_SAO_Filing_Manifest_20250621.json');

/**
 * Load Diamond SAO deployment configuration
 */
function loadDiamondSAOConfig() {
  try {
    const manifestData = fs.readFileSync(MANIFEST_PATH, 'utf8');
    const manifest = JSON.parse(manifestData);
    
    if (!manifest.diamond_sao_deployment_commands) {
      throw new Error('No deployment commands found in Diamond SAO manifest');
    }
    
    return manifest;
  } catch (error) {
    throw new Error(`Failed to load Diamond SAO configuration: ${error.message}`);
  }
}

/**
 * Execute deployment command
 */
function executeDeploymentCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(chalk.blue(`🚀 Executing: ${command}`));
    console.log();
    
    const process = spawn('bash', ['-c', command], {
      stdio: 'inherit'
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    process.on('error', (error) => {
      reject(new Error(`Failed to execute command: ${error.message}`));
    });
  });
}

/**
 * Display available deployment commands
 */
function displayCommands(manifest) {
  console.log(chalk.yellow('💎 Diamond SAO - ASOOS.2100.Cool Deployment Commands'));
  console.log(chalk.gray('─'.repeat(60)));
  
  const commands = manifest.diamond_sao_deployment_commands.asoos_2100_cool;
  
  Object.entries(commands).forEach(([action, command]) => {
    console.log(`${chalk.cyan(action.padEnd(12))}: ${chalk.dim(command)}`);
  });
  
  console.log();
  console.log(chalk.blue('📋 SAO-21 Patent Information:'));
  const sao21 = manifest.patents.find(p => p.patent_id === 'SAO-21');
  if (sao21) {
    console.log(`${chalk.cyan('Title:')} ${sao21.title}`);
    console.log(`${chalk.cyan('Lead Agent:')} ${sao21.lead_agent}`);
    console.log(`${chalk.cyan('Domain:')} ${sao21.deployment_config.domain}`);
    console.log(`${chalk.cyan('Firebase Site:')} ${sao21.deployment_config.firebase_site}`);
  }
  console.log();
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const action = args[0];
  
  try {
    console.log(chalk.magenta('💎 Diamond SAO Deployment System'));
    console.log();
    
    // Load configuration
    const manifest = loadDiamondSAOConfig();
    
    // If no action specified, show available commands
    if (!action) {
      displayCommands(manifest);
      console.log(chalk.yellow('Usage: node diamond-sao-deploy.js <action>'));
      console.log(chalk.dim('Available actions: full_deploy, sync_only, test_only, backup, rollback'));
      return;
    }
    
    // Get command for the specified action
    const commands = manifest.diamond_sao_deployment_commands.asoos_2100_cool;
    const command = commands[action];
    
    if (!command) {
      console.error(chalk.red(`❌ Unknown action: ${action}`));
      console.log(chalk.yellow('Available actions:'), Object.keys(commands).join(', '));
      process.exit(1);
    }
    
    // Execute the command
    console.log(chalk.blue(`🎯 Diamond SAO Action: ${action}`));
    await executeDeploymentCommand(command);
    
    console.log();
    console.log(chalk.green('🎉 Diamond SAO deployment completed successfully!'));
    console.log(chalk.cyan('🌐 Access your site at: https://asoos.2100.cool'));
    
  } catch (error) {
    console.error(chalk.red('❌ Diamond SAO deployment failed:'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main();
}

module.exports = {
  loadDiamondSAOConfig,
  executeDeploymentCommand,
  displayCommands
};
