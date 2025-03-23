const fs = require('fs');
const path = require('path');

/**
 * Updates the .env file with GoDaddy API credentials from godaddy_api_key.txt
 */
async function updateEnvFile() {
  try {
    console.log('Reading GoDaddy API credentials from godaddy_api_key.txt...');
    
    // Read the godaddy_api_key.txt file
    const apiKeyFilePath = path.resolve('./godaddy_api_key.txt');
    const apiKeyContent = fs.readFileSync(apiKeyFilePath, 'utf8').trim();
    
    // Parse the API key and secret
    const [apiKey, apiSecretWithPossibleSpecialChars] = apiKeyContent.split(':');
    
    if (!apiKey || !apiSecretWithPossibleSpecialChars) {
      throw new Error('Invalid format in godaddy_api_key.txt. Expected format: apiKey:apiSecret');
    }
    
    // Clean the secret (remove non-alphanumeric characters)
    const apiSecret = apiSecretWithPossibleSpecialChars.replace(/[^a-zA-Z0-9]/g, '');
    
    console.log('Successfully parsed API credentials.');
    console.log(`API Key length: ${apiKey.length} characters`);
    console.log(`API Secret length: ${apiSecret.length} characters`);
    
    // Read the .env file
    console.log('Reading .env file...');
    const envFilePath = path.resolve('./.env');
    const envContent = fs.readFileSync(envFilePath, 'utf8');
    
    // Process .env file to handle duplicate entries
    console.log('Removing duplicate GoDaddy API credential entries...');
    const lines = envContent.split('\n');
    let updatedLines = [];
    let hasApiKey = false;
    let hasApiSecret = false;
    
    // Filter out duplicate entries while preserving comments and other variables
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Skip duplicate GoDaddy API credential entries
      if (trimmedLine.startsWith('GODADDY_API_KEY=')) {
        if (!hasApiKey) {
          // Keep the first occurrence to maintain position in file
          updatedLines.push(`GODADDY_API_KEY=${apiKey}`);
          hasApiKey = true;
        }
        // Skip this line (duplicate)
      } else if (trimmedLine.startsWith('GODADDY_API_SECRET=')) {
        if (!hasApiSecret) {
          // Keep the first occurrence to maintain position in file
          updatedLines.push(`GODADDY_API_SECRET=${apiSecret}`);
          hasApiSecret = true;
        }
        // Skip this line (duplicate)
      } else {
        // Keep all other lines (comments, empty lines, other variables)
        updatedLines.push(line);
      }
    });
    
    // Add the credentials if they weren't in the file
    if (!hasApiKey) {
      updatedLines.push(`GODADDY_API_KEY=${apiKey}`);
    }
    if (!hasApiSecret) {
      updatedLines.push(`GODADDY_API_SECRET=${apiSecret}`);
    }
    
    const updatedEnvContent = updatedLines.join('\n');
    
    // Write the updated content back to the .env file
    console.log('Updating .env file with GoDaddy API credentials...');
    fs.writeFileSync(envFilePath, updatedEnvContent, 'utf8');
    
    console.log('Successfully updated .env file with GoDaddy API credentials!');
  } catch (error) {
    console.error('Error updating .env file:', error.message);
    process.exit(1);
  }
}

// Run the update function
updateEnvFile();

