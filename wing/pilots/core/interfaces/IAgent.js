/**
 * @interface IAgent
 * @description Interface definition for all agent implementations
 */
class IAgent {
  /**
   * Initializes the agent with the provided configuration
   * @param {Object} config - Agent configuration
   * @returns {Promise<void>}
   */
  async initialize(config) {
    throw new Error('Method not implemented: initialize');
  }

  /**
   * Processes a request and generates a response
   * @param {Object} request - The request object to process
   * @param {Object} context - Additional context information
   * @returns {Promise<Object>} The response from the agent
   */
  async process(request, context) {
    throw new Error('Method not implemented: process');
  }

  /**
   * Handles graceful shutdown of the agent
   * @returns {Promise<void>}
   */
  async shutdown() {
    throw new Error('Method not implemented: shutdown');
  }

  /**
   * Retrieves agent metadata
   * @returns {Object} Agent metadata
   */
  getMetadata() {
    throw new Error('Method not implemented: getMetadata');
  }

  /**
   * Validates if the agent can handle a specific request
   * @param {Object} request - The request to validate
   * @returns {Boolean} True if the agent can handle the request, false otherwise
   */
  canHandle(request) {
    throw new Error('Method not implemented: canHandle');
  }

  /**
   * Registers event handlers for the agent
   * @param {Object} eventBus - The event bus to register handlers with
   * @returns {void}
   */
  registerEventHandlers(eventBus) {
    throw new Error('Method not implemented: registerEventHandlers');
  }

  /**
   * Updates the agent's configuration
   * @param {Object} config - The new configuration to apply
   * @returns {Promise<void>}
   */
  async updateConfig(config) {
    throw new Error('Method not implemented: updateConfig');
  }

  /**
   * Reports the agent's health status
   * @returns {Object} Health status information
   */
  getHealthStatus() {
    throw new Error('Method not implemented: getHealthStatus');
  }
}

module.exports = IAgent;

