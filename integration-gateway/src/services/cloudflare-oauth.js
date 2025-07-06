/**
 * Cloudflare OAuth2-Compatible Service
 * 
 * Handles Cloudflare integration using OAuth2 patterns for the Integration Gateway.
 * While Cloudflare doesn't support OAuth2 directly, this service manages
 * Cloudflare API tokens using OAuth2-style security patterns and Secret Manager.
 * 
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Developed with assistance from the Pilots of Vision Lake and
 * Claude Code Generator. This is Human Driven and 100% Human Project
 * Amplified by attributes of AI Technology.
 */

const secretManager = require('./secrets/secret-manager');
const axios = require('axios');
const admin = require('firebase-admin');

/**
 * Cloudflare service using OAuth2-style patterns
 */
class CloudflareOAuth2Service {
  constructor() {
    this.baseURL = 'https://api.cloudflare.com/client/v4';
    this.initialized = false;
    this.db = null;
    
    // Cache for tokens and zone info
    this.cache = new Map();
  }
  
  /**
   * Initialize the service
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Initialize Firestore if not already initialized
      if (!admin.apps.length) {
        admin.initializeApp();
      }
      this.db = admin.firestore();
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Cloudflare OAuth2 service:', error.message);
      throw error;
    }
  }
  
  /**
   * Get Cloudflare credentials using OAuth2-style security patterns
   * @returns {Promise<{token: string, email: string}>}
   */
  async getCredentials() {
    await this.initialize();
    
    try {
      // Use OAuth2-style secret retrieval
      let token = await secretManager.getSecret('cloudflare-api-token');
      let email = await secretManager.getSecret('cloudflare-email');
      
      if (!token || !email) {
        throw new Error('Cloudflare credentials not found in Secret Manager');
      }
      
      // Clean the token - remove any whitespace or newlines
      token = token.trim();
      email = email.trim();
      
      return { token, email };
    } catch (error) {
      console.error('Failed to get Cloudflare credentials:', error.message);
      throw error;
    }
  }
  
  /**
   * Store Cloudflare credentials using OAuth2-style patterns
   * @param {string} token - Cloudflare API token
   * @param {string} email - Cloudflare account email
   * @returns {Promise<void>}
   */
  async storeCredentials(token, email) {
    await this.initialize();
    
    try {
      // Store credentials in Secret Manager (OAuth2-style)
      await secretManager.createOrUpdateSecret('cloudflare-api-token', token);
      await secretManager.createOrUpdateSecret('cloudflare-email', email);
      
      // Store metadata in Firestore (without actual credentials)
      await this.db.collection('cloudflare_credentials').doc('main').set({
        hasToken: true,
        email,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('Cloudflare credentials stored securely');
    } catch (error) {
      console.error('Failed to store Cloudflare credentials:', error.message);
      throw error;
    }
  }
  
  /**
   * Discover and store Zone ID for a domain
   * @param {string} domain - Domain name (e.g., '2100.cool')
   * @returns {Promise<string>} Zone ID
   */
  async discoverZoneId(domain) {
    await this.initialize();
    
    try {
      const { token } = await this.getCredentials();
      
      // Call Cloudflare API to find zone
      const response = await axios.get(`${this.baseURL}/zones`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          name: domain
        }
      });
      
      if (!response.data.success) {
        throw new Error(`Cloudflare API error: ${JSON.stringify(response.data.errors)}`);
      }
      
      if (response.data.result.length === 0) {
        throw new Error(`Domain ${domain} not found in Cloudflare account`);
      }
      
      const zoneId = response.data.result[0].id;
      
      // Store zone ID using OAuth2-style patterns
      await secretManager.createOrUpdateSecret('cloudflare-zone-id', zoneId);
      
      // Store metadata in Firestore
      await this.db.collection('cloudflare_zones').doc(domain).set({
        zoneId,
        domain,
        discoveredAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active'
      });
      
      // Cache the zone ID
      this.cache.set(`zone_${domain}`, zoneId);
      
      console.log(`Zone ID discovered and stored for ${domain}: ${zoneId}`);
      return zoneId;
      
    } catch (error) {
      console.error(`Failed to discover zone ID for ${domain}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Get Zone ID for a domain
   * @param {string} domain - Domain name
   * @returns {Promise<string>} Zone ID
   */
  async getZoneId(domain) {
    await this.initialize();
    
    // Check cache first
    const cacheKey = `zone_${domain}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      // Try to get from Secret Manager first
      const zoneId = await secretManager.getSecret('cloudflare-zone-id');
      
      if (zoneId && zoneId !== 'null' && zoneId !== domain) {
        this.cache.set(cacheKey, zoneId);
        return zoneId;
      }
      
      // If not found or invalid, discover it
      return await this.discoverZoneId(domain);
      
    } catch (error) {
      console.error(`Failed to get zone ID for ${domain}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Create or update DNS record
   * @param {string} domain - Base domain (e.g., '2100.cool')
   * @param {string} name - Record name (e.g., 'www', '@')
   * @param {string} content - Record content (IP address)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} API response
   */
  async createOrUpdateDNSRecord(domain, name, content, options = {}) {
    await this.initialize();
    
    try {
      const { token } = await this.getCredentials();
      const zoneId = await this.getZoneId(domain);
      
      const recordData = {
        type: options.type || 'A',
        name: name === '@' ? domain : name,
        content,
        ttl: options.ttl || 300,
        proxied: options.proxied !== undefined ? options.proxied : true,
        comment: options.comment || 'Managed by Integration Gateway'
      };
      
      // Check if record exists
      const existingRecords = await axios.get(`${this.baseURL}/zones/${zoneId}/dns_records`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          name: recordData.name,
          type: recordData.type
        }
      });
      
      if (!existingRecords.data.success) {
        throw new Error(`Failed to check existing records: ${JSON.stringify(existingRecords.data.errors)}`);
      }
      
      let response;
      
      if (existingRecords.data.result.length > 0) {
        // Update existing record
        const recordId = existingRecords.data.result[0].id;
        response = await axios.put(`${this.baseURL}/zones/${zoneId}/dns_records/${recordId}`, recordData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`Updated DNS record: ${recordData.name} -> ${content}`);
      } else {
        // Create new record
        response = await axios.post(`${this.baseURL}/zones/${zoneId}/dns_records`, recordData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`Created DNS record: ${recordData.name} -> ${content}`);
      }
      
      if (!response.data.success) {
        throw new Error(`DNS record operation failed: ${JSON.stringify(response.data.errors)}`);
      }
      
      return response.data;
      
    } catch (error) {
      console.error(`Failed to create/update DNS record for ${name}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Configure security settings for the zone
   * @param {string} domain - Domain name
   * @param {Object} settings - Security settings
   * @returns {Promise<Object>} Results
   */
  async configureSecuritySettings(domain, settings = {}) {
    await this.initialize();
    
    try {
      const { token } = await this.getCredentials();
      const zoneId = await this.getZoneId(domain);
      
      const results = {};
      
      // SSL/TLS mode
      if (settings.ssl !== undefined) {
        const sslResponse = await axios.patch(`${this.baseURL}/zones/${zoneId}/settings/ssl`, {
          value: settings.ssl || 'strict'
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        results.ssl = sslResponse.data.success;
      }
      
      // Always Use HTTPS
      if (settings.alwaysUseHttps !== undefined) {
        const httpsResponse = await axios.patch(`${this.baseURL}/zones/${zoneId}/settings/always_use_https`, {
          value: settings.alwaysUseHttps ? 'on' : 'off'
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        results.alwaysUseHttps = httpsResponse.data.success;
      }
      
      // Security level
      if (settings.securityLevel !== undefined) {
        const securityResponse = await axios.patch(`${this.baseURL}/zones/${zoneId}/settings/security_level`, {
          value: settings.securityLevel || 'medium'
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        results.securityLevel = securityResponse.data.success;
      }
      
      console.log(`Security settings configured for ${domain}`);
      return results;
      
    } catch (error) {
      console.error(`Failed to configure security settings for ${domain}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Verify token and get account info
   * @returns {Promise<Object>} Account information
   */
  async verifyToken() {
    await this.initialize();
    
    try {
      const { token } = await this.getCredentials();
      
      const response = await axios.get(`${this.baseURL}/user/tokens/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.data.success) {
        throw new Error(`Token verification failed: ${JSON.stringify(response.data.errors)}`);
      }
      
      return response.data.result;
      
    } catch (error) {
      console.error('Failed to verify Cloudflare token:', error.message);
      throw error;
    }
  }
  
  /**
   * List all zones in the account
   * @returns {Promise<Array>} List of zones
   */
  async listZones() {
    await this.initialize();
    
    try {
      const { token } = await this.getCredentials();
      
      const response = await axios.get(`${this.baseURL}/zones`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.data.success) {
        throw new Error(`Failed to list zones: ${JSON.stringify(response.data.errors)}`);
      }
      
      return response.data.result;
      
    } catch (error) {
      console.error('Failed to list Cloudflare zones:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new CloudflareOAuth2Service();
