/**
 * OpenAI Service Adapter for AIXTIV Integration Gateway
 * 
 * This adapter handles communication with OpenAI's API,
 * including authentication, retries, rate limiting, and error handling.
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * Base Service Adapter class that all service adapters should extend
 */
class ServiceAdapter {
  constructor(config) {
    this.config = config;
    this.serviceId = config.serviceId;
    this.serviceName = config.serviceName || 'Unknown Service';
    this.baseUrl = config.baseUrl;
    this.requestCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.lastRequest = null;
    this.lastError = null;
    this.supportsWebhooks = false;
    this.hasRustImplementation = false;
    this.metrics = {};
  }

  /**
   * Connect to the service
   * @param {Object} credentials - Authentication credentials
   * @returns {Promise<Object>} Connection information
   */
  async connect(credentials) {
    throw new Error('connect() method must be implemented by subclasses');
  }

  /**
   * Perform health check
   * @param {Object} connection - Connection information
   * @returns {Promise<Object>} Health status
   */
  async healthCheck(connection) {
    throw new Error('healthCheck() method must be implemented by subclasses');
  }

  /**
   * Pre-process request parameters
   * @param {string} operation - Operation name
   * @param {Object} params - Operation parameters
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed parameters
   */
  async preprocess(operation, params, options) {
    // Default implementation returns params unchanged
    return params;
  }

  /**
   * Post-process response
   * @param {string} operation - Operation name
   * @param {Object} result - Operation result
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed result
   */
  async postprocess(operation, result, options) {
    // Default implementation returns result unchanged
    return result;
  }

  /**
   * Record metrics for a request
   * @param {string} operation - Operation name
   * @param {boolean} success - Whether the request was successful
   * @param {number} duration - Request duration in milliseconds
   */
  recordMetrics(operation, success, duration) {
    this.requestCount++;
    this.lastRequest = new Date();
    
    if (success) {
      this.successCount++;
    } else {
      this.failureCount++;
      this.lastError = new Date();
    }
    
    // Initialize operation metrics if needed
    if (!this.metrics[operation]) {
      this.metrics[operation] = {
        count: 0,
        success: 0,
        failure: 0,
        totalDuration: 0,
        avgDuration: 0
      };
    }
    
    // Update operation metrics
    const opMetrics = this.metrics[operation];
    opMetrics.count++;
    if (success) {
      opMetrics.success++;
    } else {
      opMetrics.failure++;
    }
    opMetrics.totalDuration += duration;
    opMetrics.avgDuration = opMetrics.totalDuration / opMetrics.count;
  }

  /**
   * Get metrics for this adapter
   * @returns {Object} Metrics
   */
  getMetrics() {
    return {
      serviceId: this.serviceId,
      serviceName: this.serviceName,
      requestCount: this.requestCount,
      successCount: this.successCount,
      failureCount: this.failureCount,
      lastRequest: this.lastRequest,
      lastError: this.lastError,
      operationMetrics: this.metrics
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.requestCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.metrics = {};
  }
}

/**
 * OpenAI Service Adapter
 */
class OpenAIAdapter extends ServiceAdapter {
  constructor(config) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.defaultModel = config.defaultModel || 'gpt-4';
    this.defaultMaxTokens = config.defaultMaxTokens || 2000;
    this.defaultTemp = config.defaultTemp || 0.7;
    this.defaultTopP = config.defaultTopP || 1.0;
    this.httpClient = null;
    this.rateLimits = {
      requestsPerMin: config.rateLimits?.requestsPerMin || 60, // Depends on OpenAI tier
      tokensPerMin: config.rateLimits?.tokensPerMin || 90000    // Depends on OpenAI tier
    };
    this.modelMapping = config.modelMapping || {
      'gpt-4': { name: 'gpt-4-turbo', max_tokens: 8192, default_tokens: 2000 },
      'gpt-4-turbo': { name: 'gpt-4-turbo', max_tokens: 8192, default_tokens: 2000 },
      'gpt-3.5-turbo': { name: 'gpt-3.5-turbo', max_tokens: 4096, default_tokens: 2000 },
      'gpt-3.5-turbo-16k': { name: 'gpt-3.5-turbo-16k', max_tokens: 16384, default_tokens: 4000 },
      'davinci': { name: 'text-davinci-003', max_tokens: 4097, default_tokens: 2000 },
      'text-embedding-ada-002': { name: 'text-embedding-ada-002', max_tokens: 8191, default_tokens: 8191 }
    };
    this.supportsWebhooks = false;
    this.serviceName = 'OpenAI';
  }

  /**
   * Connect to OpenAI
   * @param {Object} credentials - Authentication credentials
   * @returns {Promise<Object>} Connection information
   */
  async connect(credentials) {
    try {
      console.log(`Connecting to OpenAI service (${this.serviceId})...`);
      
      if (!credentials.apiKey) {
        throw new Error('API key is required for OpenAI connection');
      }
      
      // Initialize HTTP client
      this.httpClient = axios.create({
        baseURL: this.baseUrl,
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Organization': credentials.orgId || undefined
        },
        timeout: 30000 // 30 second timeout
      });
      
      // Test connection with a small request
      const testResult = await this.healthCheck({ credentials });
      
      if (!testResult.status === 'healthy') {
        throw new Error(`Connection test failed: ${testResult.message}`);
      }
      
      console.log(`Successfully connected to OpenAI (${this.serviceId})`);
      
      // Return connection details
      return {
        status: 'connected',
        serviceId: this.serviceId,
        connectedAt: new Date(),
        rateLimits: this.rateLimits,
        models: Object.keys(this.modelMapping),
        apiVersion: testResult.version
      };
    } catch (error) {
      console.error(`Failed to connect to OpenAI (${this.serviceId}):`, error);
      
      // Format OpenAI specific errors
      const errorMessage = this._formatOpenAIError(error);
      
      throw new Error(`OpenAI connection failed: ${errorMessage}`);
    }
  }

  /**
   * Check OpenAI service health
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
            'Authorization': `Bearer ${connection.credentials.apiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Organization': connection.credentials.orgId || undefined
          },
          timeout: 10000 // Lower timeout for health checks
        });
      }
      
      if (!this.httpClient) {
        throw new Error('HTTP client not initialized');
      }
      
      // Get OpenAI models as a health check
      const response = await this.httpClient.get('/models');
      
      const latency = Date.now() - startTime;
      
      // Check if we have access to expected models
      let hasExpectedModels = false;
      const availableModels = response.data.data.map(model => model.id);
      
      // Check if we have access to at least one of our expected models
      for (const modelId of Object.keys(this.modelMapping)) {
        const mappedModel = this.modelMapping[modelId].name;
        if (availableModels.includes(mappedModel)) {
          hasExpectedModels = true;
          break;
        }
      }
      
      if (!hasExpectedModels) {
        return {
          status: 'degraded',
          message: 'Connected but missing expected models',
          latency,
          models: availableModels
        };
      }
      
      // Get API version from response headers
      const apiVersion = response.headers['openai-version'] || 'unknown';
      
      return {
        status: 'healthy',
        message: 'OpenAI API is responding normally',
        latency,
        models: availableModels.slice(0, 10), // Just the first 10 to keep response size manageable
        modelCount: availableModels.length,
        version: apiVersion
      };
    } catch (error) {
      console.error(`OpenAI health check failed (${this.serviceId}):`, error);
      
      // Format OpenAI specific errors
      const errorMessage = this._formatOpenAIError(error);
      
      return {
        status: 'unhealthy',
        message: `Health check failed: ${errorMessage}`,
        latency: 0,
        error: errorMessage
      };
    }
  }

  /**
   * Generate completion using OpenAI
   * @param {Object} params - Completion parameters
   * @param {Object} connection - Connection information
   * @returns {Promise<Object>} Completion result
   */
  async generateCompletion(params, connection) {
    const startTime = Date.now();
    const requestId = uuidv4();
    
    try {
      console.log(`Generating completion (${requestId}) with OpenAI (${this.serviceId})...`);
      
      // Map model if needed
      let model = params.model || this.defaultModel;
      let mappedModel;
      
      if (this.modelMapping[model]) {
        mappedModel = this.modelMapping[model].name;
      } else {
        // If model not found in mapping, use as-is
        mappedModel = model;
      }
      
      // Prepare request based on model type
      let apiPath, requestBody;
      
      if (mappedModel.includes('gpt-')) {
        // Chat completion models
        apiPath = '/chat/completions';
        
        // Build messages array
        const messages = [];
        
        // Add system message if provided
        if (params.systemMessage) {
          messages.push({
            role: 'system',
            content: params.systemMessage
          });
        }
        
        // Add user message
        messages.push({
          role: 'user',
          content: params.prompt
        });
        
        requestBody = {
          model: mappedModel,
          messages,
          max_tokens: params.max_tokens || this.defaultMaxTokens,
          temperature: params.temperature ?? this.defaultTemp,
          top_p: params.top_p ?? this.defaultTopP,
          n: 1,
          stream: false,
          presence_penalty: params.presence_penalty || 0,
          frequency_penalty: params.frequency_penalty || 0
        };
        
        // Add stop sequences if provided
        if (params.stop_sequences && params.stop_sequences.length > 0) {
          requestBody.stop = params.stop_sequences;
        }
      } else {
        // Legacy completions API
        apiPath = '/completions';
        
        requestBody = {
          model: mappedModel,
          prompt: params.prompt,
          max_tokens: params.max_tokens || this.defaultMaxTokens,
          temperature: params.temperature ?? this.defaultTemp,
          top_p: params.top_p ?? this.defaultTopP,
          n: 1,
          stream: false,
          presence_penalty: params.presence_penalty || 0,
          frequency_penalty: params.frequency_penalty || 0
        };
        
        // Add stop sequences if provided
        if (params.stop_sequences && params.stop_sequences.length > 0) {
          requestBody.stop = params.stop_sequences;
        }
      }
      
      // Make API request with retry logic
      const maxRetries = 3;
      let retries = 0;
      let response;
      
      while (retries < maxRetries) {
        try {
          response = await this.httpClient.post(apiPath, requestBody);
          break; // Success, exit retry loop
        } catch (error) {
          retries++;
          
          // Check if we should retry
          const shouldRetry = this._shouldRetryRequest(error, retries, maxRetries);
          
          if (!shouldRetry) {
            throw error; // Don't retry, propagate error
          }
          
          // Exponential backoff with jitter
          const backoffTime = Math.min(100 * Math.pow(2, retries) + Math.random() * 100, 2000);
          console.log(`Retrying OpenAI request (attempt ${retries}/${maxRetries}) after ${backoffTime}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
      
      if (!response) {
        throw new Error(`Failed to get response after ${maxRetries} attempts`);
      }
      
      // Process response
      let result;
      
      if (apiPath === '/chat/completions') {
        // Chat completion response
        const choice = response.data.choices[0];
        
        result = {
          text: choice.message.content,
          finish_reason: choice.finish_reason,
          usage: {
            prompt_tokens: response.data.usage.prompt_tokens,
            completion_tokens: response.data.usage.completion_tokens,
            total_tokens: response.data.usage.total_tokens
          },
          model: mappedModel
        };
      } else {
        // Legacy completion response
        const choice = response.data.choices[0];
        
        result = {
          text: choice.text,
          finish_reason: choice.finish_reason,
          usage: {
            prompt_tokens: response.data.usage.prompt_tokens,
            completion_tokens: response.data.usage.completion_tokens,
            total_tokens: response.data.usage.total_tokens
          },
          model: mappedModel
        };
      }
      
      const duration = Date.now() - startTime;
      
      // Record metrics
      this.recordMetrics('generateCompletion', true, duration);
      
      console.log(`OpenAI completion generated (${requestId}) in ${duration}ms`);
      
      return {
        ...result,
        latency_ms: duration,
        provider: 'openai',
        requestId
      };
    } catch (error) {
      console.error(`OpenAI completion failed (${requestId}):`, error);
      
      const duration = Date.now() - startTime;
      this.recordMetrics('generateCompletion', false, duration);
      
      // Format OpenAI specific errors
      const errorMessage = this._formatOpenAIError(error);
      
      throw new Error(`OpenAI completion failed: ${errorMessage}`);
    }
  }

  /**
   * Generate embeddings using OpenAI
   * @param {Object} params - Embedding parameters
   * @param {Object} connection - Connection information
   * @returns {Promise<Object>} Embedding result
   */
  async generateEmbedding(params, connection) {
    const startTime = Date.now();
    const requestId = uuidv4();
    
    try {
      console.log(`Generating embedding (${requestId}) with OpenAI (${this.serviceId})...`);
      
      // Default to Ada embedding model
      const model = params.model || 'text-embedding-ada-002';
      
      // Prepare input
      let input;
      if (Array.isArray(params.texts)) {
        input = params.texts;
      } else {
        input = [params.text || params.prompt || ''];
      }
      
      // Make API request
      const response = await this.httpClient.post('/embeddings', {
        model: model,
        input: input
      });
      
      // Process response
      const result = {
        embeddings: response.data.data.map(item => item.embedding),
        usage: {
          prompt_tokens: response.data.usage.prompt_tokens,
          total_tokens: response.data.usage.total_tokens
        },
        model: model
      };
      
      const duration = Date.now() - startTime;
      
      // Record metrics
      this.recordMetrics('generateEmbedding', true, duration);
      
      console.log(`OpenAI embedding generated (${requestId}) in ${duration}ms`);
      
      return {
        ...result,
        latency_ms: duration,
        provider: 'openai',
        requestId
      };
    } catch (error) {
      console.error(`OpenAI embedding failed (${requestId}):`, error);
      
      const duration = Date.now() - startTime;
      this.recordMetrics('generateEmbedding', false, duration);
      
      // Format OpenAI specific errors
      const errorMessage = this._formatOpenAIError(error);
      
      throw new Error(`OpenAI embedding failed: ${errorMessage}`);
    }
  }

  /**
   * Format OpenAI-specific errors
   * @private
   */
  _formatOpenAIError(error) {
    if (error.response && error.response.data && error.response.data.error) {
      const openaiError = error.response.data.error;
      return `[${openaiError.type}] ${openaiError.message}`;
    }
    
    if (error.response && error.response.status) {
      switch (error.response.status) {
        case 401:
          return 'Authentication error: Invalid API key';
        case 403:
          return 'Authorization error: Not authorized to access this resource';
        case 404:
          return 'Not found: The requested resource was not found';
        case 429:
          return 'Rate limit exceeded: Please try again later';
        case 500:
          return 'OpenAI server error';
        case 503:
          return 'OpenAI service unavailable: The service is temporarily offline';
        default:
          return `HTTP error ${error.response.status}: ${error.message}`;
      }
    }
    
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out: OpenAI API took too long to respond';
    }
    
    if (error.code === 'ECONNREFUSED') {
      return 'Connection refused: Could not connect to OpenAI API';
    }
    
    return error.message;
  }

  /**
   * Determine if a request should be retried
   * @private
   */
  _shouldRetryRequest(error, retries, maxRetries) {
    // Don't retry if we've reached the max retries
    if (retries >= maxRetries) {
      return false;
    }
    
    // Retry on rate limits
    if (error.response && error.response.status === 429) {
      return true;
    }
    
    // Retry on server errors
    if (error.response && error.response.status >= 500) {
      return true;
    }
    
    // Retry on timeout
    if (error.code === 'ECONNABORTED') {
      return true;
    }
    
    // Retry on connection issues
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }
    
    return false;
  }

  /**
   * Pre-process completion params
   * @override
   */
  async preprocess(operation, params, options) {
    if (operation === 'generateCompletion') {
      // Make a copy to avoid modifying the original
      const processedParams = { ...params };
      
      // Set default model if not specified
      if (!processedParams.model) {
        processedParams.model = this.defaultModel;
      }
      
      // Adjust max tokens if needed
      if (!processedParams.max_tokens && this.modelMapping[processedParams.model]) {
        processedParams.max_tokens = this.modelMapping[processedParams.model].default_tokens;
      }
      
      // Handle prompt formatting for few-shot learning if examples are provided
      if (processedParams.examples && Array.isArray(processedParams.examples) && processedParams.examples.length > 0) {
        let formattedPrompt = processedParams.prompt + "\n\n";
        
        // Add examples
        processedParams.examples.forEach((example, index) => {
          formattedPrompt += `Example ${index + 1}:\n`;
          formattedPrompt += `Input: ${example.input}\n`;
          formattedPrompt += `Output: ${example.output}\n\n`;
        });
        
        // Add final prompt
        formattedPrompt += "Now, please respond to:\n";
        formattedPrompt += processedParams.finalPrompt || processedParams.prompt;
        
        // Replace original prompt
        processedParams.prompt = formattedPrompt;
        
        // Remove examples and finalPrompt as they're now incorporated
        delete processedParams.examples;
        delete processedParams.finalPrompt;
      }
      
      return processedParams;
    }
    
    // For other operations, return params unchanged
    return params;
  }

  /**
   * Post-process completion result
   * @override
   */
  async postprocess(operation, result, options) {
    if (operation === 'generateCompletion' && options.postprocess) {
      // Apply custom post-processing if specified
      if (options.postprocess === 'trim') {
        result.text = result.text.trim();
      } else if (options.postprocess === 'extractJson') {
        try {
          // Try to extract JSON from the text
          const jsonMatch = result.text.match(/```(?:json)?(.*?)```/s) || 
                           result.text.match(/{.*}/s);
          
          if (jsonMatch) {
            const jsonStr = jsonMatch[1] || jsonMatch[0];
            result.json = JSON.parse(jsonStr.trim());
          }
        } catch (error) {
          console.warn('Failed to extract JSON from completion result:', error);
        }
      }
    }
    
    return result;
  }
}

module.exports = {
  ServiceAdapter,
  OpenAIAdapter
};
