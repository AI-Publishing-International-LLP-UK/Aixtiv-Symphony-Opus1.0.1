/**
 * GatewayFactory Class
 *
 * Responsible for instantiating the appropriate integration gateway
 * based on the user's tier type: owner subscriber, team, group,
 * practitioner, or enterprise.
 */

const Logger = require('../utils/logger');
const SecretManager = require('../utils/secret-manager');
const {
  OwnerSubscriberGateway,
  TeamGateway,
  GroupGateway,
  PractitionerGateway,
  EnterpriseGateway,
} = require('./gateway-implementations');

// Tier types enum for validation
const TIER_TYPES = {
  OWNER_SUBSCRIBER: 'owner_subscriber',
  TEAM: 'team',
  GROUP: 'group',
  PRACTITIONER: 'practitioner',
  ENTERPRISE: 'enterprise',
};

class GatewayFactory {
  constructor() {
    this.logger = new Logger('GatewayFactory');
    this.secretManager = new SecretManager();
    this.cachedGateways = new Map();
  }

  /**
   * Get the appropriate gateway instance based on user tier
   *
   * @param {string} userTier - The user's subscription tier
   * @param {Object} options - Configuration options for gateway initialization
   * @returns {Object} The appropriate gateway instance
   * @throws {Error} If tier is invalid or gateway initialization fails
   */
  getGateway(userTier, options = {}) {
    try {
      this.logger.info(`Retrieving gateway for tier: ${userTier}`);

      // Validate the tier type
      if (!this._isValidTier(userTier)) {
        throw new Error(`Invalid tier type: ${userTier}`);
      }

      // Check if we have a cached instance for this tier+userId combination
      const cacheKey = this._generateCacheKey(userTier, options.userId);
      if (this.cachedGateways.has(cacheKey) && !options.forceNew) {
        this.logger.debug(`Using cached gateway for ${cacheKey}`);
        return this.cachedGateways.get(cacheKey);
      }

      // Initialize a new gateway based on tier type
      const gateway = this._initializeGateway(userTier, options);

      // Cache the gateway instance if caching is enabled
      if (options.cacheable !== false && options.userId) {
        this.logger.debug(`Caching gateway for ${cacheKey}`);
        this.cachedGateways.set(cacheKey, gateway);
      }

      return gateway;
    } catch (error) {
      this.logger.error(`Failed to get gateway for tier ${userTier}`, error);
      throw error;
    }
  }

  /**
   * Validates if the provided tier type is supported
   * @private
   */
  _isValidTier(tierType) {
    return Object.values(TIER_TYPES).includes(tierType.toLowerCase());
  }

  /**
   * Generates a unique cache key for gateway instances
   * @private
   */
  _generateCacheKey(tierType, userId) {
    return `${tierType}_${userId || 'anonymous'}`;
  }

  /**
   * Initialize the appropriate gateway based on tier type
   * @private
   */
  _initializeGateway(tierType, options) {
    const { userId, onboardingPreferences, customConfig = {} } = options;

    // Load tier-specific secrets
    const secrets = this._loadTierSecrets(tierType);

    // Base config for all gateways
    const baseConfig = {
      secretManager: this.secretManager,
      userId,
      tierType,
      secrets,
      onboardingPreferences,
      ...customConfig,
    };

    // Initialize the appropriate gateway based on tier type
    switch (tierType.toLowerCase()) {
      case TIER_TYPES.OWNER_SUBSCRIBER:
        this.logger.info(
          `Initializing Owner Subscriber Gateway for user: ${userId}`
        );
        return new OwnerSubscriberGateway(baseConfig);

      case TIER_TYPES.TEAM:
        this.logger.info(`Initializing Team Gateway for user: ${userId}`);
        return new TeamGateway(baseConfig);

      case TIER_TYPES.GROUP:
        this.logger.info(`Initializing Group Gateway for user: ${userId}`);
        return new GroupGateway(baseConfig);

      case TIER_TYPES.PRACTITIONER:
        this.logger.info(
          `Initializing Practitioner Gateway for user: ${userId}`
        );
        return new PractitionerGateway(baseConfig);

      case TIER_TYPES.ENTERPRISE:
        this.logger.info(`Initializing Enterprise Gateway for user: ${userId}`);
        return new EnterpriseGateway(baseConfig);

      default:
        // This should never be reached due to validation check
        throw new Error(`Unsupported tier type: ${tierType}`);
    }
  }

  /**
   * Loads secrets specific to the tier type
   * @private
   */
  _loadTierSecrets(tierType) {
    try {
      // Load global secrets applicable to all tiers
      const globalSecrets = this.secretManager.getGlobalSecrets();

      // Load tier-specific secrets
      const tierSecrets = this.secretManager.getTierSecrets(tierType);

      // Merge global and tier-specific secrets
      return { ...globalSecrets, ...tierSecrets };
    } catch (error) {
      this.logger.error(`Failed to load secrets for tier ${tierType}`, error);
      throw new Error(
        `Secret initialization failed for tier ${tierType}: ${error.message}`
      );
    }
  }

  /**
   * Clear cached gateway instances
   */
  clearCache() {
    this.logger.info('Clearing gateway cache');
    this.cachedGateways.clear();
  }

  /**
   * Clear a specific cached gateway instance
   */
  clearCacheFor(tierType, userId) {
    const cacheKey = this._generateCacheKey(tierType, userId);
    this.logger.info(`Clearing cached gateway for ${cacheKey}`);
    this.cachedGateways.delete(cacheKey);
  }
}

module.exports = GatewayFactory;
