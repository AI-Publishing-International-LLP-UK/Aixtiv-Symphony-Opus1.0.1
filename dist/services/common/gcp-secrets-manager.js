/**
 * GCP Secrets Manager Service
 * 
 * This module provides a centralized interface for accessing Google Cloud Secret Manager
 * with caching, error handling, and encryption support.
 */

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const NodeCache = require('node-cache');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Secret Manager Service for Google Cloud Secret Manager
 */
class GCPSecretsManager {
  /**
   * Create a new GCP Secrets Manager instance
   * @param {Object} config Configuration options
   * @param {string} config.projectId GCP Project ID
   * @param {Object} config.cache Cache configuration
   * @param {number} config.cache.ttl TTL for cached secrets in seconds (default: 3600)
   * @param {boolean} config.cache.enabled Enable caching (default: true)
   * @param {string} config.keyFile Path to service account key file (optional)
   * @param {string} config.encryptionKey Encryption key for sensitive values (optional)
   */
  constructor(config = {}) {
    this.projectId = config.projectId;
    this.client = null;
    this.initialized = false;
    this.keyFile = config.keyFile;
    this.encryptionKey = config.encryptionKey;
    
    // Cache configuration
    const cacheTtl = config.cache?.ttl || 3600; // Default: 1 hour
    const cacheEnabled = config.cache?.enabled !== false; // Default: true
    this.cache = cacheEnabled ? new NodeCache({ stdTTL: cacheTtl, checkperiod: 120 }) : null;
    
    // Statistics for monitoring
    this.stats = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      lastError: null,
      lastErrorTime: null
    };
    
    this.logger = config.logger || console;
  }

  /**
   * Initialize the secrets manager client
   * @returns {Promise<boolean>} True if successful
   */
  async initialize() {
    try {
      // If already initialized, return early
      if (this.initialized) return true;
      
      const clientOptions = {};
      
      // If a specific key file is provided, use it
      if (this.keyFile) {
        clientOptions.keyFilename = this.keyFile;
      }
      
      this.client = new SecretManagerServiceClient(clientOptions);
      this.initialized = true;
      
      // If project ID wasn't provided, try to get it from the client's configuration
      if (!this.projectId) {
        const [projectId] = await this.client.getProjectId();
        this.projectId = projectId;
      }
      
      this.logger.info(`GCP Secrets Manager initialized for project: ${this.projectId}`);
      return true;
    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error.message;
      this.stats.lastErrorTime = new Date();
      this.logger.error(`Failed to initialize GCP Secrets Manager: ${error.message}`);
      throw new Error(`Failed to initialize GCP Secrets Manager: ${error.message}`);
    }
  }

  /**
   * Get full resource name for a secret
   * @param {string} secretName Secret name
   * @param {string} version Secret version (default: 'latest')
   * @returns {string} Full resource name
   * @private
   */
  _getSecretVersionName(secretName, version = 'latest') {
    return `projects/${this.projectId}/secrets/${secretName}/versions/${version}`;
  }

  /**
   * Encrypt a value using the configured encryption key
   * @param {string} value Value to encrypt
   * @returns {string} Encrypted value as hex string
   * @private
   */
  _encrypt(value) {
    if (!this.encryptionKey) return value;
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', 
      crypto.createHash('sha256').update(this.encryptionKey).digest(), iv);
    
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt a value using the configured encryption key
   * @param {string} encryptedValue Encrypted value
   * @returns {string} Decrypted value
   * @private
   */
  _decrypt(encryptedValue) {
    if (!this.encryptionKey) return encryptedValue;
    
    const [ivHex, encrypted] = encryptedValue.split(':');
    if (!ivHex || !encrypted) return encryptedValue;
    
    try {
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc',
        crypto.createHash('sha256').update(this.encryptionKey).digest(), iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.logger.error(`Failed to decrypt value: ${error.message}`);
      return encryptedValue;
    }
  }

  /**
   * Get a secret value from GCP Secret Manager
   * @param {string} secretName Secret name
   * @param {Object} options Options
   * @param {string} options.version Secret version (default: 'latest')
   * @param {boolean} options.ignoreCache Bypass cache (default: false)
   * @returns {Promise<string>} Secret value
   */
  async getSecret(secretName, options = {}) {
    const version = options.version || 'latest';
    const cacheKey = `${secretName}:${version}`;
    
    this.stats.requests++;
    
    try {
      // Ensure client is initialized
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Check cache first (if enabled and not explicitly bypassed)
      if (this.cache && !options.ignoreCache) {
        const cachedValue = this.cache.get(cacheKey);
        if (cachedValue) {
          this.stats.cacheHits++;
          return this._decrypt(cachedValue);
        }
        this.stats.cacheMisses++;
      }
      
      // Get secret from GCP Secret Manager
      const secretVersionName = this._getSecretVersionName(secretName, version);
      const [response] = await this.client.accessSecretVersion({
        name: secretVersionName,
      });
      
      const secretValue = response.payload.data.toString();
      
      // Cache the encrypted value if caching is enabled
      if (this.cache) {
        const encryptedValue = this._encrypt(secretValue);
        this.cache.set(cacheKey, encryptedValue);
      }
      
      return secretValue;
    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error.message;
      this.stats.lastErrorTime = new Date();
      
      this.logger.error(`Failed to get secret '${secretName}': ${error.message}`);
      throw new Error(`Failed to get secret '${secretName}': ${error.message}`);
    }
  }

  /**
   * List all secrets in the project
   * @returns {Promise<Array<string>>} Array of secret names
   */
  async listSecrets() {
    try {
      // Ensure client is initialized
      if (!this.initialized) {
        await this.initialize();
      }
      
      const parent = `projects/${this.projectId}`;
      const [secrets] = await this.client.listSecrets({ parent });
      
      return secrets.map(secret => {
        const nameParts = secret.name.split('/');
        return nameParts[nameParts.length - 1];
      });
    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error.message;
      this.stats.lastErrorTime = new Date();
      
      this.logger.error(`Failed to list secrets: ${error.message}`);
      throw new Error(`Failed to list secrets: ${error.message}`);
    }
  }

  /**
   * Create or update a secret
   * @param {string} secretName Secret name
   * @param {string} secretValue Secret value
   * @param {Object} options Options
   * @param {Array<string>} options.labels Secret labels
   * @returns {Promise<Object>} Created or updated secret
   */
  async createOrUpdateSecret(secretName, secretValue, options = {}) {
    try {
      // Ensure client is initialized
      if (!this.initialized) {
        await this.initialize();
      }
      
      const parent = `projects/${this.projectId}`;
      
      let secret;
      
      try {
        // Try to get the secret to check if it exists
        const secretPath = `${parent}/secrets/${secretName}`;
        [secret] = await this.client.getSecret({ name: secretPath });
      } catch (error) {
        if (error.code === 5) { // 5 = NOT_FOUND
          // Secret doesn't exist, create it
          [secret] = await this.client.createSecret({
            parent,
            secretId: secretName,
            secret: {
              labels: options.labels || {},
              replication: {
                automatic: {},
              },
            },
          });
        } else {
          throw error;
        }
      }
      
      // Add a new secret version
      const [version] = await this.client.addSecretVersion({
        parent: secret.name,
        payload: {
          data: Buffer.from(secretValue),
        },
      });
      
      // Invalidate cache
      if (this.cache) {
        Object.keys(this.cache.keys()).forEach(key => {
          if (key.startsWith(`${secretName}:`)) {
            this.cache.del(key);
          }
        });
      }
      
      return {
        name: secretName,
        version: version.name.split('/').pop(),
        status: 'created'
      };
    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error.message;
      this.stats.lastErrorTime = new Date();
      
      this.logger.error(`Failed to create/update secret '${secretName}': ${error.message}`);
      throw new Error(`Failed to create/update secret '${secretName}': ${error.message}`);
    }
  }

  /**
   * Delete a secret
   * @param {string} secretName Secret name
   * @returns {Promise<boolean>} True if successful
   */
  async deleteSecret(secretName) {
    try {
      // Ensure client is initialized
      if (!this.initialized) {
        await this.initialize();
      }
      
      const name = `projects/${this.projectId}/secrets/${secretName}`;
      await this.client.deleteSecret({ name });
      
      // Invalidate cache
      if (this.cache) {
        Object.keys(this.cache.keys()).forEach(key => {
          if (key.startsWith(`${secretName}:`)) {
            this.cache.del(key);
          }
        });
      }
      
      return true;
    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error.message;
      this.stats.lastErrorTime = new Date();
      
      this.logger.error(`Failed to delete secret '${secretName}': ${error.message}`);
      throw new Error(`Failed to delete secret '${secretName}': ${error.message}`);
    }
  }

  /**
   * Get statistics about secret manager usage
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheEnabled: !!this.cache,
      cacheSize: this.cache ? Object.keys(this.cache.keys()).length : 0,
      cacheTtl: this.cache ? this.cache.options.stdTTL : 0,
      projectId: this.projectId,
      initialized: this.initialized
    };
  }

  /**
   * Invalidate all cached secrets
   */
  invalidateCache() {
    if (this.cache) {
      this.cache.flushAll();
      this.logger.info('Secret cache invalidated');
    }
  }

  /**
   * Validate that the service account has access to Secret Manager
   * @returns {Promise<boolean>} True if the service account has access
   */
  async validateAccess() {
    try {
      // Ensure client is initialized
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Try to list secrets as a simple access test
      const parent = `projects/${this.projectId}`;
      await this.client.listSecrets({ parent, pageSize: 1 });
      
      return true;
    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error.message;
      this.stats.lastErrorTime = new Date();
      
      this.logger.error(`Secret Manager access validation failed: ${error.message}`);
      return false;
    }
  }
}

module.exports = GCPSecretsManager;

