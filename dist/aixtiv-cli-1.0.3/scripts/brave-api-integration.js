#!/usr/bin/env node

/**
 * Brave API Integration Script
 * 
 * This script helps integrate with the Brave API by:
 * 1. Guiding through the Brave API registration process
 * 2. Setting up the API key in the integration gateway
 * 3. Storing the API key in Secret Manager
 * 
 * Usage: node brave-api-integration.js
 */

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  project: 'api-for-warp-drive',
  email: 'pr@coaching2100.com',
  region: 'us-west1',
  zone: 'us-west1-b',
  secretName: 'brave-api-key',
  mcpServer: 'mcp-server',
  integrationConfigPath: path.join(__dirname, '..', 'backend', 'integration-gateways', 'core', 'integration-config.json'),
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Executes a shell command and returns the output
 */
function executeCommand(command, silent = false) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' });
  } catch (error) {
    if (!silent) {
      console.error(`Error executing command: ${command}`);
      console.error(error.message);
    }
    return null;
  }
}

/**
 * Checks if user is authenticated with Google Cloud
 */
function checkGcloudAuth() {
  try {
    const account = execSync('gcloud config get-value account', { encoding: 'utf8', stdio: 'pipe' }).trim();
    if (!account || account === '(unset)') {
      console.log('⚠️  You are not logged in to Google Cloud.');
      console.log('Please run: gcloud auth login');
      return false;
    }
    console.log(`✅ Authenticated as: ${account}`);
    
    // Check if the project is set correctly
    const project = execSync('gcloud config get-value project', { encoding: 'utf8', stdio: 'pipe' }).trim();
    if (project !== CONFIG.project) {
      console.log(`⚠️  Current project is set to: ${project}`);
      console.log(`Setting project to: ${CONFIG.project}`);
      execSync(`gcloud config set project ${CONFIG.project}`, { stdio: 'inherit' });
    }
    return true;
  } catch (error) {
    console.error('Error checking gcloud authentication:', error.message);
    return false;
  }
}

/**
 * Guide the user through Brave API registration
 */
async function guideBraveApiRegistration() {
  return new Promise((resolve) => {
    console.log('\n===== Brave API Registration Guide =====');
    console.log('Follow these steps to register with the Brave API:');
    console.log('1. Visit https://brave.com/search/api/');
    console.log('2. Sign in with your email account: ' + CONFIG.email);
    console.log('3. Complete the registration process');
    console.log('4. Copy the API key provided by Brave');
    console.log('-------------------------------------------\n');
    
    rl.question('Have you completed the registration and obtained an API key? (yes/no): ', (answer) => {
      if (answer.toLowerCase() === 'yes') {
        rl.question('Please enter your Brave API key: ', (apiKey) => {
          if (!apiKey || apiKey.trim() === '') {
            console.log('⚠️  API key cannot be empty. Please try again.');
            resolve(null);
          } else {
            console.log('✅ API key received.');
            resolve(apiKey.trim());
          }
        });
      } else {
        console.log('⚠️  Please complete the Brave API registration before continuing.');
        resolve(null);
      }
    });
  });
}

/**
 * Store the API key in Secret Manager
 */
function storeApiKeyInSecretManager(apiKey) {
  console.log('\n===== Storing API Key in Secret Manager =====');
  
  try {
    // Check if the secret already exists
    const secretExists = executeCommand(`gcloud secrets describe ${CONFIG.secretName} --project=${CONFIG.project}`, true);
    
    if (secretExists) {
      console.log(`Updating existing secret: ${CONFIG.secretName}`);
      executeCommand(`echo "${apiKey}" | gcloud secrets versions add ${CONFIG.secretName} --data-file=- --project=${CONFIG.project}`);
    } else {
      console.log(`Creating new secret: ${CONFIG.secretName}`);
      executeCommand(`echo "${apiKey}" | gcloud secrets create ${CONFIG.secretName} --data-file=- --replication-policy=automatic --project=${CONFIG.project}`);
    }
    
    // Ensure the compute service account has access to the secret
    const computeServiceAccount = `${CONFIG.project.split('-').join('')}-compute@developer.gserviceaccount.com`;
    console.log(`Granting access to service account: ${computeServiceAccount}`);
    executeCommand(`gcloud secrets add-iam-policy-binding ${CONFIG.secretName} --member=serviceAccount:${computeServiceAccount} --role=roles/secretmanager.secretAccessor --project=${CONFIG.project}`);
    
    console.log('✅ API key successfully stored in Secret Manager.');
    return true;
  } catch (error) {
    console.error('❌ Failed to store API key in Secret Manager:', error.message);
    return false;
  }
}

/**
 * Set up Brave API integration in the gateway
 */
function setupIntegrationGateway(apiKey) {
  console.log('\n===== Setting Up Integration Gateway =====');
  
  try {
    // Check if integration config exists
    if (!fs.existsSync(CONFIG.integrationConfigPath)) {
      console.error(`❌ Integration config file not found at: ${CONFIG.integrationConfigPath}`);
      return false;
    }
    
    // Read the existing config
    const configData = fs.readFileSync(CONFIG.integrationConfigPath, 'utf8');
    let config;
    try {
      config = JSON.parse(configData);
    } catch (error) {
      console.error('❌ Failed to parse integration config:', error.message);
      return false;
    }
    
    // Check if Brave API integration point already exists
    const braveIntegrationIndex = config.integration_points.findIndex(
      point => point.name === 'Brave Search API'
    );
    
    // Create the Brave API integration point
    const braveIntegration = {
      name: 'Brave Search API',
      endpoint: 'https://api.search.brave.com/res/v1/web/search',
      method: 'GET',
      expected_status: 200,
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': `${apiKey}`,
        'Content-Type': 'application/json'
      },
      validation_criteria: {
        type: 'json_path',
        path: 'type',
        expected_value: 'search'
      }
    };
    
    // Add or update the integration point
    if (braveIntegrationIndex >= 0) {
      config.integration_points[braveIntegrationIndex] = braveIntegration;
      console.log('Updating existing Brave API integration point');
    } else {
      config.integration_points.push(braveIntegration);
      console.log('Adding new Brave API integration point');
    }
    
    // Write the updated config back to file
    fs.writeFileSync(CONFIG.integrationConfigPath, JSON.stringify(config, null, 2), 'utf8');
    console.log(`✅ Integration gateway configured at: ${CONFIG.integrationConfigPath}`);
    
    // Create a backup of the configuration
    const backupPath = `${CONFIG.integrationConfigPath}.bak`;
    fs.writeFileSync(backupPath, configData, 'utf8');
    console.log(`📦 Backup of original configuration saved to: ${backupPath}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to set up integration gateway:', error.message);
    return false;
  }
}

/**
 * Restart the MCP server services to apply changes
 */
function restartMcpServices() {
  console.log('\n===== Restarting MCP Server Services =====');
  
  try {
    console.log(`Restarting services on ${CONFIG.mcpServer} in ${CONFIG.zone}...`);
    executeCommand(`gcloud compute ssh ${CONFIG.mcpServer} --zone=${CONFIG.zone} --project=${CONFIG.project} --command="sudo systemctl restart mcp-server-brave.service" --tunnel-through-iap`);
    console.log('✅ MCP server services restarted successfully.');
    return true;
  } catch (error) {
    console.error('❌ Failed to restart MCP server services:', error.message);
    console.log('Please manually restart the services with:');
    console.log(`gcloud compute ssh ${CONFIG.mcpServer} --zone=${CONFIG.zone} --project=${CONFIG.project} --command="sudo systemctl restart mcp-server-brave.service" --tunnel-through-iap`);
    return false;
  }
}

/**
 * Verify that the MCP server can access the secret
 */
async function verifyMcpAccess() {
  console.log('\n===== Verifying MCP Server Access =====');
  
  try {
    // Check if the MCP server is running
    const statusOutput = executeCommand(
      `gcloud compute ssh ${CONFIG.mcpServer} --zone=${CONFIG.zone} --project=${CONFIG.project} --command="sudo systemctl status mcp-server-brave.service" --tunnel-through-iap`,
      true
    );
    
    if (statusOutput && statusOutput.includes('Active: active (running)')) {
      console.log('✅ MCP server is running and active.');
      return true;
    } else {
      console.log('⚠️  MCP server service is not running or could not be verified.');
      console.log('Please check the service status manually with:');
      console.log(`gcloud compute ssh ${CONFIG.mcpServer} --zone=${CONFIG.zone} --project=${CONFIG.project} --command="sudo systemctl status mcp-server-brave.service" --tunnel-through-iap`);
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to verify MCP server access:', error.message);
    return false;
  }
}

/**
 * Main function to orchestrate the integration process
 */
async function main() {
  console.log('🚀 Starting Brave API Integration...');
  
  // Check Google Cloud authentication
  if (!checkGcloudAuth()) {
    console.log('❌ Authentication failed. Please authenticate with Google Cloud first.');
    rl.close();
    return;
  }
  
  // Guide user through Brave API registration
  const apiKey = await guideBraveApiRegistration();
  if (!apiKey) {
    console.log('❌ API key not provided. Exiting.');
    rl.close();
    return;
  }
  
  // Store API key in Secret Manager
  const secretStored = storeApiKeyInSecretManager(apiKey);
  if (!secretStored) {
    rl.close();
    return;
  }
  
  // Set up integration gateway
  const integrationSetup = setupIntegrationGateway(apiKey);
  if (!integrationSetup) {
    rl.close();
    return;
  }
  
  // Restart MCP services
  const servicesRestarted = restartMcpServices();
  
  // Verify MCP access
  const accessVerified = await verifyMcpAccess();
  
  console.log('\n===== Integration Summary =====');
  console.log(`API Key Storage: ${secretStored ? '✅ Success' : '❌ Failed'}`);
  console.log(`Integration Setup: ${integrationSetup ? '✅ Success' : '❌ Failed'}`);
  console.log(`MCP Services Restart: ${servicesRestarted ? '✅ Success' : '❌ Failed'}`);
  console.log(`MCP Access Verification: ${accessVerified ? '✅ Success' : '❌ Failed'}`);
  
  if (secretStored && integrationSetup && servicesRestarted && accessVerified) {
    console.log('\n🎉 Brave API Integration completed successfully!');
  } else {
    console.log('\n⚠️  Brave API Integration completed with some issues. Please review the logs above.');
  }
  
  rl.close();
}

// Execute the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  rl.close();
});

