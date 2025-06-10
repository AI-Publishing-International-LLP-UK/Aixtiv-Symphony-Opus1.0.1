/**
 * SecretManager - Utility class for managing secrets in Dr. Memoria's Integration Gateway
 * 
 * Handles two types of secrets:
 * 1. Global secrets - Available to all gateway tiers
 * 2. Tier-specific secrets - Available only to specific gateway tiers
 * 
 * Gateway Tiers: Owner Subscriber, Team, Group, Practitioner, Enterprise
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

// Encryption settings
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

class SecretManager {
  constructor(options = {}) {
    this.encryptionKey = options.encryptionKey || process.env.SECRET_ENCRYPTION_KEY;
    this.secretsBasePath = options.secretsBasePath || path.join(process.cwd(), 'secrets');
    this.cacheExpiry = options.cacheExpiry || 3600000; // 1 hour default
    this.inMemoryCache = {
      global: new Map(),
      tiers: {
        ownerSubscriber: new Map(),
        team: new Map(),
        group: new Map(), 
        practitioner: new Map(),
        enterprise: new Map()
      }
    };
    this.cacheTTL = {
      global: new Map(),
      tiers: {
        ownerSubscriber: new Map(),
        team: new Map(),
        group: new Map(),
        practitioner: new Map(),
        enterprise: new Map()
      }
    };
  }

  /**
   * Get a global secret (available to all gateway tiers)
   * @param {string} secretName - The name of the secret
   * @returns {Promise<string|null>} - Resolved with secret value or null if not found
   */
  async getGlobalSecret(secretName) {
    // Check cache first
    if (this._isCachedAndValid('global', secretName)) {
      return this.inMemoryCache.global.get(secretName);
    }

    try {
      const secretPath = path.join(this.secretsBasePath, 'global', `${secretName}.enc`);
      const encryptedSecret = await fs.readFile(secretPath, 'utf8');
      const decryptedValue = this._decrypt(encryptedSecret);
      
      // Cache the result
      this._cacheValue('global', secretName, decryptedValue);
      return decryptedValue;
    } catch (error) {
      console.error(`Error retrieving global secret ${secretName}:`, error.message);
      return null;
    }
  }

  /**
   * Get a tier-specific secret
   * @param {string} tier - Gateway tier (ownerSubscriber, team, group, practitioner, enterprise)
   * @param {string} secretName - The name of the secret
   * @param {string} [entityId] - Optional entity ID for tier-specific access
   * @returns {Promise<string|null>} - Resolved with secret value or null if not found
   */
  async getTierSecret(tier, secretName, entityId = null) {
    if (!this._isValidTier(tier)) {
      throw new Error(`Invalid tier: ${tier}`);
    }

    // Check cache first
    const cacheKey = entityId ? `${secretName}:${entityId}` : secretName;
    if (this._isCachedAndValid('tiers', tier, cacheKey)) {
      return this.inMemoryCache.tiers[tier].get(cacheKey);
    }

    try {
      // Determine the path based on whether an entityId is provided
      let secretPath;
      if (entityId) {
        secretPath = path.join(this.secretsBasePath, 'tiers', tier, entityId, `${secretName}.enc`);
      } else {
        secretPath = path.join(this.secretsBasePath, 'tiers', tier, `${secretName}.enc`);
      }

      const encryptedSecret = await fs.readFile(secretPath, 'utf8');
      const decryptedValue = this._decrypt(encryptedSecret);
      
      // Cache the result
      this._cacheValue('tiers', tier, cacheKey, decryptedValue);
      return decryptedValue;
    } catch (error) {
      console.error(`Error retrieving ${tier} secret ${secretName}:`, error.message);
      return null;
    }
  }

  /**
   * Set a global secret
   * @param {string} secretName - The name of the secret
   * @param {string} secretValue - The value to encrypt and store
   * @returns {Promise<boolean>} - True if successful
   */
  async setGlobalSecret(secretName, secretValue) {
    try {
      // Encrypt the secret
      const encryptedSecret = this._encrypt(secretValue);
      
      // Ensure directory exists
      const secretDir = path.join(this.secretsBasePath, 'global');
      await fs.mkdir(secretDir, { recursive: true });
      
      // Write the encrypted secret
      const secretPath = path.join(secretDir, `${secretName}.enc`);
      await fs.writeFile(secretPath, encryptedSecret, 'utf8');
      
      // Update cache
      this._cacheValue('global', secretName, secretValue);
      
      return true;
    } catch (error) {
      console.error(`Error setting global secret ${secretName}:`, error.message);
      return false;
    }
  }

  /**
   * Set a tier-specific secret
   * @param {string} tier - Gateway tier (ownerSubscriber, team, group, practitioner, enterprise)
   * @param {string} secretName - The name of the secret
   * @param {string} secretValue - The value to encrypt and store
   * @param {string} [entityId] - Optional entity ID for tier-specific access
   * @returns {Promise<boolean>} - True if successful
   */
  async setTierSecret(tier, secretName, secretValue, entityId = null) {
    if (!this._isValidTier(tier)) {
      throw new Error(`Invalid tier: ${tier}`);
    }

    try {
      // Encrypt the secret
      const encryptedSecret = this._encrypt(secretValue);
      
      // Determine the directory path based on whether an entityId is provided
      let secretDir;
      if (entityId) {
        secretDir = path.join(this.secretsBasePath, 'tiers', tier, entityId);
      } else {
        secretDir = path.join(this.secretsBasePath, 'tiers', tier);
      }
      
      // Ensure directory exists
      await fs.mkdir(secretDir, { recursive: true });
      
      // Write the encrypted secret
      const secretPath = path.join(secretDir, `${secretName}.enc`);
      await fs.writeFile(secretPath, encryptedSecret, 'utf8');
      
      // Update cache
      const cacheKey = entityId ? `${secretName}:${entityId}` : secretName;
      this._cacheValue('tiers', tier, cacheKey, secretValue);
      
      return true;
    } catch (error) {
      console.error(`Error setting ${tier} secret ${secretName}:`, error.message);
      return false;
    }
  }

  /**
   * Delete a global secret
   * @param {string} secretName - The name of the secret to delete
   * @returns {Promise<boolean>} - True if successful
   */
  async deleteGlobalSecret(secretName) {
    try {
      const secretPath = path.join(this.secretsBasePath, 'global', `${secretName}.enc`);
      await fs.unlink(secretPath);
      
      // Remove from cache
      this.inMemoryCache.global.delete(secretName);
      this.cacheTTL.global.delete(secretName);
      
      return true;
    } catch (error) {
      console.error(`Error deleting global secret ${secretName}:`, error.message);
      return false;
    }
  }

  /**
   * Delete a tier-specific secret
   * @param {string} tier - Gateway tier
   * @param {string} secretName - The name of the secret to delete
   * @param {string} [entityId] - Optional entity ID
   * @returns {Promise<boolean>} - True if successful
   */
  async deleteTierSecret(tier, secretName, entityId = null) {
    if (!this._isValidTier(tier)) {
      throw new Error(`Invalid tier: ${tier}`);
    }

    try {
      // Determine the path based on whether an entityId is provided
      let secretPath;
      if (entityId) {
        secretPath = path.join(this.secretsBasePath, 'tiers', tier, entityId, `${secretName}.enc`);
      } else {
        secretPath = path.join(this.secretsBasePath, 'tiers', tier, `${secretName}.enc`);
      }
      
      await fs.unlink(secretPath);
      
      // Remove from cache
      const cacheKey = entityId ? `${secretName}:${entityId}` : secretName;
      this.inMemoryCache.tiers[tier].delete(cacheKey);
      this.cacheTTL.tiers[tier].delete(cacheKey);
      
      return true;
    } catch (error) {
      console.error(`Error deleting ${tier} secret ${secretName}:`, error.message);
      return false;
    }
  }

  /**
   * List all available global secrets (names only, not values)
   * @returns {Promise<string[]>} - Array of secret names
   */
  async listGlobalSecrets() {
    try {
      const secretDir = path.join(this.secretsBasePath, 'global');
      const files = await fs.readdir(secretDir);
      return files
        .filter(file => file.endsWith('.enc'))
        .map(file => file.replace('.enc', ''));
    } catch (error) {
      console.error('Error listing global secrets:', error.message);
      return [];
    }
  }

  /**
   * List all available tier-specific secrets (names only, not values)
   * @param {string} tier - Gateway tier
   * @param {string} [entityId] - Optional entity ID
   * @returns {Promise<string[]>} - Array of secret names
   */
  async listTierSecrets(tier, entityId = null) {
    if (!this._isValidTier(tier)) {
      throw new Error(`Invalid tier: ${tier}`);
    }

    try {
      let secretDir;
      if (entityId) {
        secretDir = path.join(this.secretsBasePath, 'tiers', tier, entityId);
      } else {
        secretDir = path.join(this.secretsBasePath, 'tiers', tier);
      }
      
      const files = await fs.readdir(secretDir);
      return files
        .filter(file => file.endsWith('.enc'))
        .map(file => file.replace('.enc', ''));
    } catch (error) {
      console.error(`Error listing ${tier} secrets:`, error.message);
      return [];
    }
  }

  /**
   * Rotate the encryption key and re-encrypt all secrets
   * @param {string} newEncryptionKey - The new encryption key
   * @returns {Promise<boolean>} - True if successful
   */
  async rotateEncryptionKey(newEncryptionKey) {
    if (!newEncryptionKey || newEncryptionKey.length < KEY_LENGTH) {
      throw new Error(`Encryption key must be at least ${KEY_LENGTH} bytes long`);
    }

    const oldKey = this.encryptionKey;
    
    try {
      // Backup old key for rollback
      this.encryptionKey = newEncryptionKey;
      
      // Re-encrypt global secrets
      const globalSecrets = await this.listGlobalSecrets();
      for (const secretName of globalSecrets) {
        // Temporarily reset to old key to decrypt
        this.encryptionKey = oldKey;
        const secretValue = await this.getGlobalSecret(secretName);
        
        // Set to new key to encrypt
        this.encryptionKey = newEncryptionKey;
        await this.setGlobalSecret(secretName, secretValue);
      }
      
      // Re-encrypt tier-specific secrets
      const tiers = ['ownerSubscriber', 'team', 'group', 'practitioner', 'enterprise'];
      for (const tier of tiers) {
        const tierSecretDirs = await this._listTierDirectories(tier);
        
        // Handle tier-level secrets
        this.encryptionKey = oldKey;
        const tierSecrets = await this.listTierSecrets(tier);
        this.encryptionKey = newEncryptionKey;
        
        for (const secretName of tierSecrets) {
          this.encryptionKey = oldKey;
          const secretValue = await this.getTierSecret(tier, secretName);
          this.encryptionKey = newEncryptionKey;
          await this.setTierSecret(tier, secretName, secretValue);
        }
        
        // Handle entity-specific secrets
        for (const entityId of tierSecretDirs) {
          this.encryptionKey = oldKey;
          const entitySecrets = await this.listTierSecrets(tier, entityId);
          this.encryptionKey = newEncryptionKey;
          
          for (const secretName of entitySecrets) {
            this.encryptionKey = oldKey;
            const secretValue = await this.getTierSecret(tier, secretName, entityId);
            this.encryptionKey = newEncryptionKey;
            await this.setTierSecret(tier, secretName, secretValue, entityId);
          }
        }
      }
      
      return true;
    } catch (error) {
      // Rollback to old key in case of error
      this.encryptionKey = oldKey;
      console.error('Error rotating encryption key:', error.message);
      return false;
    }
  }

  /**
   * Validate the integrity of all stored secrets
   * @returns {Promise<{valid: boolean, invalidSecrets: string[]}>}
   */
  async validateSecretIntegrity() {
    const invalidSecrets = [];
    
    try {
      // Validate global secrets
      const globalSecrets = await this.listGlobalSecrets();
      for (const secretName of globalSecrets) {
        try {
          await this.getGlobalSecret(secretName);
        } catch (error) {
          invalidSecrets.push(`global:${secretName}`);
        }
      }
      
      // Validate tier-specific secrets
      const tiers = ['ownerSubscriber', 'team', 'group', 'practitioner', 'enterprise'];
      for (const tier of tiers) {
        // Tier-level secrets
        const tierSecrets = await this.listTierSecrets(tier);
        for (const secretName of tierSecrets) {
          try {
            await this.getTierSecret(tier, secretName);
          } catch (error) {
            invalidSecrets.push(`${tier}:${secretName}`);
          }
        }
        
        // Entity-specific secrets
        const tierSecretDirs = await this._listTierDirectories(

