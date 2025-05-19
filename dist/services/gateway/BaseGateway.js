/**
 * Base Gateway class for Aixtiv Symphony Integration Gateway
 * Provides common authentication functionality for all gateway implementations
 */

const logger = require('../common/logger');

/**
 * BaseGateway abstract class
 * All gateway implementations should extend this class
 */
class BaseGateway {
  /**
   * BaseGateway constructor
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.sallyPortVerifier = options.sallyPortVerifier;
    
    // Ensure this class is not instantiated directly
    if (this.constructor === BaseGateway) {
      throw new Error('BaseGateway is an abstract class and cannot be instantiated directly');
    }
  }

  /**
   * Authenticate a request context
   * @param {Object} context - Authentication context including user credentials
   * @returns {Promise<Object>} Authentication result
   */
  async authenticate(context) {
    try {
      this.logger.info('Beginning authentication', { 
        requestId: context.requestId,
        gateway: this.constructor.name 
      });
      
      // Call the implementation-specific authentication method
      const result = await this._performAuthentication(context);
      
      // Log success or failure
      if (result.success) {
        this.logger.info('Authentication successful', { 
          requestId: context.requestId,
          userId: context.userId 
        });
      } else {
        this.logger.warn('Authentication failed', { 
          requestId: context.requestId,
          userId: context.userId,
          status: result.status,
          errorCode: result.error?.code 
        });
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Unhandled error during authentication: ${error.message}`, { 
        requestId: context.requestId,
        error 
      });
      
      return {
        success: false,
        status: 500,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during authentication'
        }
      };
    }
  }

  /**
   * Abstract method for performing authentication
   * Must be implemented by subclasses
   * @param {Object} context - Authentication context
   * @returns {Promise<Object>} Authentication result
   * @protected
   */
  async _performAuthentication(context) {
    throw new Error('_performAuthentication must be implemented by subclass');
  }
}

module.exports = BaseGateway;

