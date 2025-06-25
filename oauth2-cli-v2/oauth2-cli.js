#!/usr/bin/env node

// oauth2-cli.js - A simple OAuth2 tool for Google service accounts

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const COMMAND_HELP = 'help';
const COMMAND_AUTH = 'auth';
const COMMAND_TOKEN = 'token';

// Show help message
function showHelp() {
  console.log('OAuth2 CLI - A simple OAuth2 tool for Google service accounts');
  console.log('');
  console.log('Usage:');
  console.log('  oauth2-cli help                       Show this help message');
  console.log('  oauth2-cli auth <keyfile>             Authenticate with a service account key file');
  console.log('  oauth2-cli token <keyfile> [scope]    Get an access token using a service account');
  console.log('');
  console.log('Examples:');
  console.log('  oauth2-cli auth ./key.json');
  console.log('  oauth2-cli token ./key.json https://www.googleapis.com/auth/cloud-platform');
}

// Authenticate with a service account key file
async function authenticate(keyfilePath) {
  try {
    // Check if key file exists
    if (!fs.existsSync(keyfilePath)) {
      console.error(`Error: Key file '${keyfilePath}' not found`);
      process.exit(1);
    }

    // Read key file
    const keyFile = JSON.parse(fs.readFileSync(keyfilePath, 'utf8'));
    
    // Create JWT client
    const jwtClient = new google.auth.JWT(
      keyFile.client_email,
      null,
      keyFile.private_key,
      ['https://www.googleapis.com/auth/cloud-platform'],
      null
    );

    // Authenticate
    await jwtClient.authorize();
    
    console.log('Authentication successful!');
    console.log(`Service Account: ${keyFile.client_email}`);
    console.log(`Project ID: ${keyFile.project_id}`);
    
    return jwtClient;
  } catch (error) {
    console.error('Authentication failed:', error.message);
    process.exit(1);
  }
}

// Get an access token using a service account
async function getToken(keyfilePath, scope = 'https://www.googleapis.com/auth/cloud-platform') {
  try {
    // Authenticate
    const auth = await authenticate(keyfilePath);
    
    // Request token with specific scope
    const token = await auth.getAccessToken();
    
    console.log('Token acquired successfully!');
    console.log(`Scope: ${scope}`);
    console.log(`Token: ${token.token}`);
    console.log(`Expires: ${new Date(token.res.data.expiry_date).toISOString()}`);
    
    return token;
  } catch (error) {
    console.error('Failed to get token:', error.message);
    process.exit(1);
  }
}

// Main function
async function main() {
  const command = process.argv[2] || COMMAND_HELP;
  
  switch (command) {
    case COMMAND_HELP:
      showHelp();
      break;
      
    case COMMAND_AUTH:
      const keyfilePath = process.argv[3];
      if (!keyfilePath) {
        console.error('Error: Key file path is required');
        showHelp();
        process.exit(1);
      }
      await authenticate(keyfilePath);
      break;
      
    case COMMAND_TOKEN:
      const tokenKeyfilePath = process.argv[3];
      const scope = process.argv[4];
      if (!tokenKeyfilePath) {
        console.error('Error: Key file path is required');
        showHelp();
        process.exit(1);
      }
      await getToken(tokenKeyfilePath, scope);
      break;
      
    default:
      console.error(`Error: Unknown command '${command}'`);
      showHelp();
      process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
