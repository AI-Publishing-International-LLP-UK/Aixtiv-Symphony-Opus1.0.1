/**
 * GCP Secrets Client
 * 
 * Higher-level client for working with GCP Secrets Manager,
 * providing a simplified interface for common operations
 */

const GCPSecretsManager = require('./gcp-secrets-manager');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Default configuration
const DEFAULT_CONFIG = {
  projectId: process.env.GCP_PROJECT_ID,
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  cache: {
    enabled: true,
    ttl: 3600 // 1 hour
  }
};

/**
 * Singleton instance of the secrets manager
 */
let secretsManagerInstance = null;

/**
 * Get the secrets manager instance
 * @param {Object} config Configuration overrides
 * @returns {GCPSecretsManager} Secrets manager instance
 */
function getSecretsManager(config = {}) {
  if (!secretsManagerInstance) {
    // Merge with default config
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    // If no key file specified in config or env var, look for default locations
    if (!mergedConfig.keyFile) {
      const possibleKeyPaths = [
        path.join(process.cwd(), 'service-account-key.json'),
        path.join(os.homedir(), '.gcp', 'service-account-key.json'),
        path.join(process.cwd(), 'secrets',

