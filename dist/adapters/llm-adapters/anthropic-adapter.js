/**
 * Anthropic Service Adapter for AIXTIV Integration Gateway
 * 
 * This adapter handles communication with Anthropic's API,
 * including authentication, retries, rate limiting, and error handling.
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { ServiceAdapter } = require('./openai-adapter');

/**
 * Anthropic Service Adapter
 */
class AnthropicAdapter extends ServiceAdapter {
  constructor(config) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
    this.apiVersion = config.apiVersion || '2023-06-01';
    this.defaultModel = config.defaultModel || 'claude-3-7-sonnet-20250219';
    this.defaultMaxTokens = config.defaultMaxTokens || 2000;
    this.defaultTemp = config.defaultTemp || 0.7;
    this.defaultTopP = config.defaultTopP || 1.0;
    this.httpClient = null;
    this.rateLimits = {
      requestsPerMin: config.rateLimits?.requestsPerMin || 50, // Default, adjust based on your Anthropic tier
      tokensPerMin: config.rateLimits?.tokensPerMin || 100000  // Default, adjust based on your Anthropic tier
    };
    this.modelMapping = config.modelMapping || {
      'claude': { name: 'claude-3-opus-20240229', max_tokens: 200000, default_tokens: 4096 },
      'claude-3': { name: 'claude-3-opus-20240229', max_tokens: 200000, default_tokens: 4096 },
      'claude-3-opus': { name: 'claude-3-opus-20240229', max_tokens: 200000, default_tokens: 4096 },
      'claude-3-5-sonnet': { name: 'claude-3-5-sonnet-20240620', max_tokens: 200000, default_tokens: 4096 }, 
      'claude-3-7-sonnet': { name: 'claude-3-7-sonnet-20250219', max_tokens: 200000, default_tokens: 4096 },
      'claude-2': { name: 'claude-2.0', max_tokens: 100000, default_tokens: 4096 },
      'claude-instant': { name: 'claude-instant-1.2', max_tokens: 100000, default_tokens: 4096 }
    };
    this.supportsWebhooks = false;
    this.serviceName = 'Anthropic';
  }

  /**
   * Connect to Anthropic
   * @param {Object} credentials - Authentication credentials
   * @returns {Promise<Object>} Connection information
   */
  async connect(credentials) {
    try {
      console.log(`Connecting to Anthropic service (${this.serviceId})...`);
      
      if (!credentials.apiKey) {
        throw new Error('API key is required for Anthropic connection');
      }
      
      // Initialize HTTP client
      this.httpClient = axios.create({
        baseURL: this.baseUrl,
        headers: {
          'x-api-key': credentials.apiKey,
          'anthropic-version': this.apiVersion,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });
      
      // Test connection with a small request
      const testResult = await this.healthCheck({ credentials });
      
      if (!testResult.status === 'healthy') {
        throw new Error(`Connection test failed: ${testResult.message}`);
      }
      
      console.log(`Successfully connected to Anthropic (${this.serviceId})`);
      
      // Return connection details
      return {
        status: 'connected',
        serviceId: this.serviceId,
        connectedAt: new Date(),
        rateLimits: this.rateLimits,
        models: Object.keys(this.modelMapping),
        apiVersion: this.apiVersion
      };
    } catch (error) {
      console.error(`Failed to connect to Anthropic (${this.serviceId}):`, error);
      
      // Format Anthropic specific errors
      const errorMessage = this._formatAnthropicError(error);
      
      throw new Error(`Anthropic connection failed: ${errorMessage}`);
    }
  }

  /**
   * Check Anthropic service health
   * @param {Object} connection - Connection information
   * @returns {Promise<Object>} Health status
   */
  async healthCheck(connection) {
    try {
      const startTime = Date.now();
      
      // Create client if not already created
      if (!this.httpClient && connection.credentials) {
        this.httpClient = axios.create({
          baseURL: this.baseUrl,
          headers: {
            'x-api-key': connection.credentials.apiKey,
            'anthropic-version': this.apiVersion,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // Lower timeout for health checks
        });
      }
      
      if (!this.httpClient) {
        throw new Error('HTTP client not initialized');
      }
      
      // Use a small completion request as a health check
      // Anthropic doesn't have a dedicated health or models endpoint
      const response = await this.httpClient.post('/v1/complete', {
        model: 'claude-instant-1.2',
        prompt: '\n\nHuman: Hello\n\nAssistant:',
        max_tokens_to_sample: 5
      });
      
      const latency = Date.now() - startTime;
      
      // Since we got a valid response, assume service is healthy
      return {
        status: 'healthy',
        message: 'Anthropic API is responding normally',
        latency,
        models: Object.keys(this.modelMapping),
        version: this.apiVersion
      };
    } catch (error) {
      console.error(`Anthropic health check failed (${this.serviceId}):`, error);
      
      // Format Anthropic specific errors
      const errorMessage = this._formatAnthropicError(error);
      
      return {
        status: 'unhealthy',
        message: `Health check failed: ${errorMessage}`,
        latency: 0,
        error: errorMessage
      };
    }
  }

  /**
   * Generate completion using Anthropic
   * @param {Object} params - Completion parameters
   * @param {Object} connection - Connection information
   * @returns {Promise<Object>} Completion result
   */
  async generateCompletion(params, connection) {
    const startTime = Date.now();
    const requestId = uuidv4();
    
    try {
      console.log(`Generating completion (${requestId}) with Anthropic (${this.serviceId})...`);
      
      // Map model if needed
      let model = params.model || this.defaultModel;
      let mappedModel;
      
      if (this.modelMapping[model]) {
        mappedModel = this.modelMapping[model].name;
      } else {
        // If model not found in mapping, use as-is
        