/**
 * Aixtiv Symphony Opus1 Integration Gateway System
 * 
 * A multi-tiered gateway architecture supporting 5 levels of access and integration:
 * 1. Owner Subscriber - Individual content creators and publishers
 * 2. Team - Small collaborative groups within an organization
 * 3. Group - Department level or medium-sized organizational divisions
 * 4. Practitioner - Professional service providers integrating with Aixtiv Symphony Opus1
 * 5. Enterprise - Organization-wide deployment with advanced integration needs
 * 
 * This system handles authentication, authorization, secrets management, and gateway 
 * interactions across the entire Aixtiv Symphony Opus1 ecosystem.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { SecretManager } = require('../utils/secret-manager');
const { Logger } = require('../utils/logger');
const { DatabaseService } = require('./database-service');
const { OnboardingService } = require('./onboarding-service');

/**
 * Enum for Gateway Tiers
 * @readonly
 * @enum {string}
 */
const GatewayTier = {
  OWNER_SUBSCRIBER: 'owner_subscriber',
  TEAM: 'team',
  GROUP: 'group',
  PRACTITIONER: 'practitioner',
  ENTERPRISE: 'enterprise'
};

/**
 * Enum for Secret Scopes
 * @readonly
 * @enum {string}
 */
const SecretScope = {
  GLOBAL: 'global',
  TIER_SPECIFIC: 'tier_specific',
  INSTANCE: 'instance'
};

/**
 * Base Integration Gateway class that all tier-specific gateways extend
 */
class IntegrationGateway {
  /**
   * @param {Object} config - Gateway configuration
   * @param {string} config.gatewayId - Unique identifier for this gateway instance
   * @param {GatewayTier} config.tier - The tier this gateway belongs to
   * @param {string} config.ownerId - ID of the entity that owns this gateway
   */
  constructor(config) {
    this.gatewayId = config.gatewayId || crypto.randomUUID();
    this.tier = config.tier;
    this.ownerId = config.ownerId;
    this.secretManager = new SecretManager(this.tier, this.ownerId);
    this.db = new DatabaseService();
    this.logger = new Logger(`gateway-${this.tier}-${this.gatewayId.substring(0,8)}`);
    
    // Gateway-specific cache for frequently accessed data
    this.cache = new Map();
    
    // Initialize events systems
    this.events = [];
    this.eventListeners = new Map();
    
    this.logger.info(`Initialized ${this.tier} gateway [${this.gatewayId}]`);
  }
  
  /**
   * Authenticate a request to this gateway
   * @param {Object} credentials - Authentication credentials
   * @returns {Promise<Object>} Authentication result with tokens
   */
  async authenticate(credentials) {
    try {
      // Base authentication logic
      const authResult = await this._performAuthentication(credentials);
      
      if (!authResult.success) {
        this.logger.warn(`Authentication failed for ${credentials.username || 'unknown user'}`);
        return { success: false, error: 'Invalid credentials' };
      }
      
      // Generate JWT token
      const token = this._generateToken(authResult.user);
      
      this.logger.info(`User ${authResult.user.username} authenticated successfully`);
      return {
        success: true,
        token,
        user: {
          id: authResult.user.id,
          username: authResult.user.username,
          tier: this.tier,
          permissions: authResult.user.permissions
        }
      };
    } catch (error) {
      this.logger.error(`Authentication error: ${error.message}`);
      return { success: false, error: 'Authentication failed' };
    }
  }
  
  /**
   * Authorize an operation based on the user's permissions
   * @param {Object} user - Authenticated user
   * @param {string} action - Action being performed
   * @param {Object} resource - Resource being accessed
   * @returns {boolean} Whether the operation is authorized
   */
  authorize(user, action, resource) {
    // Check if the user has the required permission
    const hasPermission = user.permissions.some(permission => {
      return (
        permission.action === action || 
        permission.action === '*'
      ) && (
        permission.resource === resource.type || 
        permission.resource === '*'
      );
    });
    
    if (!hasPermission) {
      this.logger.warn(`Authorization failed: ${user.username} attempted ${action} on ${resource.type}`);
      return false;
    }
    
    // Additional tier-specific authorization logic
    const tierAuthorized = this._tierSpecificAuthorization(user, action, resource);
    
    this.logger.info(`User ${user.username} ${tierAuthorized ? 'authorized' : 'denied'} for ${action} on ${resource.type}`);
    return tierAuthorized;
  }
  
  /**
   * Get a secret by key, respecting the secret scope hierarchy
   * @param {string} key - Secret key
   * @param {SecretScope} scope - Scope of the secret
   * @returns {Promise<string>} The secret value
   */
  async getSecret(key, scope = SecretScope.TIER_SPECIFIC) {
    let secret;
    
    // Try to get tier-specific or instance-specific secret first
    if (scope === SecretScope.TIER_SPECIFIC || scope === SecretScope.INSTANCE) {
      secret = await this.secretManager.getSecret(key, scope);
    }
    
    // Fall back to global secret if not found and not explicitly instance-scoped
    if (!secret && scope !== SecretScope.INSTANCE) {
      secret = await this.secretManager.getSecret(key, SecretScope.GLOBAL);
    }
    
    return secret;
  }
  
  /**
   * Store a secret in the appropriate scope
   * @param {string} key - Secret key
   * @param {string} value - Secret value
   * @param {SecretScope} scope - Scope of the secret
   * @returns {Promise<boolean>} Success status
   */
  async setSecret(key, value, scope = SecretScope.TIER_SPECIFIC) {
    // Only allow setting global secrets from higher-tier gateways
    if (scope === SecretScope.GLOBAL && 
        ![GatewayTier.ENTERPRISE, GatewayTier.PRACTITIONER].includes(this.tier)) {
      this.logger.warn(`Unauthorized attempt to set global secret from ${this.tier} gateway`);
      return false;
    }
    
    try {
      await this.secretManager.setSecret(key, value, scope);
      this.logger.info(`Secret ${key} stored in ${scope} scope`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to store secret: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Perform onboarding for a new user through this gateway
   * @param {Object} userData - User data for onboarding
   * @param {string} mode - Onboarding mode ('quick_start', 'guided', 'template')
   * @returns {Promise<Object>} Onboarding result
   */
  async onboard(userData, mode = 'guided') {
    const onboarding = new OnboardingService(this.tier);
    
    this.logger.info(`Starting ${mode} onboarding for new ${this.tier} user`);
    
    try {
      // Apply tier-specific onboarding logic
      const onboardingResult = await this._customizeOnboarding(onboarding, userData, mode);
      
      if (onboardingResult.success) {
        // Register the new user with the gateway
        await this._registerUser(onboardingResult.user);
        
        // Set up initial tier-specific resources
        await this._setupInitialResources(onboardingResult.user);
        
        this.logger.info(`Onboarding completed successfully for ${onboardingResult.user.username}`);
      }
      
      return onboardingResult;
    } catch (error) {
      this.logger.error(`Onboarding error: ${error.message}`);
      return { 
        success: false, 
        error: 'Failed to complete onboarding process',
        details: error.message
      };
    }
  }
  
  /**
   * Register this gateway with parent gateways in the hierarchy
   * @param {IntegrationGateway} parentGateway - Parent gateway to register with
   * @returns {Promise<boolean>} Registration success
   */
  async registerWithParent(parentGateway) {
    try {
      // Verify that the parent gateway is of a higher tier
      if (!this._isValidParentTier(parentGateway.tier)) {
        this.logger.warn(`Invalid parent tier: ${parentGateway.tier} for ${this.tier} gateway`);
        return false;
      }
      
      // Exchange credentials and establish trust
      const registrationData = {
        gatewayId: this.gatewayId,
        tier: this.tier,
        ownerId: this.ownerId,
        capabilities: this._getCapabilities(),
        publicKey: await this.secretManager.getPublicKey()
      };
      
      const result = await parentGateway.acceptChildGateway(registrationData);
      
      if (result.success) {
        // Store parent gateway reference
        this.parentGateway = {
          id: parentGateway.gatewayId,
          tier: parentGateway.tier,
          connectionToken: result.connectionToken
        };
        
        // Store shared secrets for secure communication
        await this.setSecret(`parent_gateway_${parentGateway.gatewayId}`, 
                            result.sharedSecret, 
                            SecretScope.INSTANCE);
        
        this.logger.info(`Registered with ${parentGateway.tier} gateway [${parentGateway.gatewayId}]`);
        return true;
      } else {
        this.logger.warn(`Failed to register with parent gateway: ${result.error}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Parent registration error: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Accept a child gateway registration request
   * @param {Object} registrationData - Data from the child gateway
   * @returns {Promise<Object>} Registration result
   */
  async acceptChildGateway(registrationData) {
    try {
      // Verify the child's tier is valid to register under this gateway
      if (!this._isValidChildTier(registrationData.tier)) {
        return { 
          success: false, 
          error: `${registrationData.tier} gateways cannot register with ${this.tier} gateways` 
        };
      }
      
      // Generate shared secret for secure communication
      const sharedSecret = crypto.randomBytes(32).toString('hex');
      
      // Store child gateway information
      const childId = registrationData.gatewayId;
      await this.db.storeChildGateway({
        id: childId,
        tier: registrationData.tier,
        ownerId: registrationData.ownerId,
        capabilities: registrationData.capabilities,
        publicKey: registrationData.publicKey,
        parentId: this.gatewayId,
        createdAt: new Date()
      });
      
      // Store the shared secret for this child
      await this.setSecret(`child_gateway_${childId}`, 
                          sharedSecret, 
                          SecretScope.INSTANCE);
      
      // Generate a connection token
      const connectionToken = this._generateConnectionToken(registrationData);
      
      this.logger.info(`Accepted ${registrationData.tier} child gateway [${childId}]`);
      
      return {
        success: true,
        connectionToken,
        sharedSecret,
        parentCapabilities: this._getCapabilities()
      };
    } catch (error) {
      this.logger.error(`Error accepting child gateway: ${error.message}`);
      return { success: false, error: 'Failed to register child gateway' };
    }
  }
  
  /**
   * Delegate a request to a parent gateway when this gateway cannot fulfill it
   * @param {string} action - Action to delegate
   * @param {Object} params - Parameters for the action
   * @returns {Promise<Object>} Result from parent gateway
   */
  async delegateToParent(action, params) {
    if (!this.parentGateway) {
      return { success: false, error: 'No parent gateway registered' };
    }
    
    try {
      // Get the shared secret for secure communication
      const sharedSecret = await this.getSecret(
        `parent_gateway_${this.parentGateway.id}`, 
        SecretScope.INSTANCE
      );
      
      if (!sharedSecret) {
        return { success: false, error: 'Missing shared secret for parent gateway' };
      }
      
      // Create a signed request
      const timestamp = Date.now();
      const signature = this._createSignature(action, params, timestamp, sharedSecret);
      
      // Simulate HTTP request to parent gateway
      this.logger.info(`Delegating ${action} to parent ${this.parentGateway.tier} gateway`);
      
      // In a real implementation, this would be an actual API call
      // For this example, we're simulating the response
      return {
        success: true,
        delegated: true,
        result: `${action} processed by parent gateway`,
        parentTier: this.parentGateway.tier
      };
    } catch (error) {
      this.logger.error(`Delegation error: ${error.message}`);
      return { success: false, error: 'Failed to delegate to parent gateway' };
    }
  }
  
  /**
   * Handle a request that was delegated from a child gateway
   * @param {string} childGatewayId - ID of the child gateway
   * @param {string} action - Action requested
   * @param {Object} params - Action parameters
   * @param {string} signature - Request signature
   * @param {number} timestamp - Request timestamp
   * @returns {Promise<Object>} Request result
   */
  async handleDelegatedRequest(childGatewayId, action, params, signature, timestamp) {
    try {
      // Get the child gateway record
      const childGateway = await this.db.getChildGateway(childGatewayId);
      
      if (!childGateway) {
        return { success: false, error: 'Unknown child gateway' };
      }
      
      // Get the shared secret for this child
      const sharedSecret = await this.getSecret(
        `child_gateway_${childGatewayId}`, 
        SecretScope.INSTANCE
      );
      
      if (!sharedSecret) {
        return { success: false, error: 'Missing shared secret for child gateway' };
      }
      
      // Verify the signature
      const expectedSignature = this._createSignature(action, params, timestamp, sharedSecret);
      if (signature !== expectedSignature) {
        this.logger.warn(`Invalid signature from child gateway ${childGatewayId}`);
        return { success: false

