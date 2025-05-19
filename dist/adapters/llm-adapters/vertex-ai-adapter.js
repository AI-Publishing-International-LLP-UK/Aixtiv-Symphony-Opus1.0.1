/**
 * Google Vertex AI Service Adapter for AIXTIV Integration Gateway
 * 
 * This adapter handles communication with Google's Vertex AI API,
 * including authentication, retries, rate limiting, and error handling.
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { ServiceAdapter } = require('./openai-adapter');

/**
 * Google Vertex AI Service Adapter
 */
class VertexAIAdapter extends ServiceAdapter {
  constructor(config) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://us-central1-aiplatform.googleapis.com/v1';
    this.projectId = config.projectId || 'api-for-warp-drive';
    this.location = config.location || 'us-central1';
    this.defaultModel = config.defaultModel || 'gemini-1.5-pro';
    this.defaultMaxTokens = config.defaultMaxTokens || 2000;
    this.defaultTemp = config.defaultTemp || 0.7;
    this.defaultTopP = config.defaultTopP || 1.0;
    this.httpClient = null;
    this.rateLimits = {
      requestsPerMin: config.rateLimits?.requestsPerMin || 60,
      tokensPerMin: config.rateLimits?.tokensPerMin || 100000,
    };
    this.modelMapping = config.modelMapping || {
      'gemini-1.5-pro': {
        name: 'gemini-1.5-pro',
        endpoint: 'publishers/google/models/gemini-1.5-pro',
        max_tokens: 32000,
        default_tokens: 2048,
      },
      'gemini-1.5-flash': {
        name: 'gemini-1.5-flash',
        endpoint: 'publishers/google/models/gemini-1.5-flash',
        max_tokens: 32000,
        default_tokens: 2048,
      },
      'gemini-1.0-pro': {
        name: 'gemini-1.0-pro',
        endpoint: 'publishers/google/models/gemini-1.0-pro',
        max_tokens: 32000,
        default_tokens: 2048,
      },
      'text-bison': {
        name: 'text-bison',
        endpoint: 'publishers/google/models/text-bison',
        max_tokens: 8192,
        default_tokens: 1024,
      },
      'text-bison-32k': {
        name: 'text-bison-32k',
        endpoint: 'publishers/google/models/text-bison-32k',
        max_tokens: 32000,
        default_tokens: 1024,
      },
      'text-embedding-gecko': {
        name: 'text-embedding-gecko',
        endpoint: 'publishers/google/models/text-embedding-gecko',
        max_tokens: 2048,
        default_tokens: 2048,
        dimension: 768,
      },
      'textembedding-gecko': {
        name: 'textembedding-gecko',
        endpoint: 'publishers/google/models/textembedding-gecko',
        max_tokens: 2048,
        default_tokens: 2048,
        dimension: 768,
      },
    };
    this.supportsWebhooks = false;
    this.serviceName = 'Google Vertex AI';
  }

  /**
   * Connect to Google Vertex AI
   * @param {Object} credentials - Authentication credentials
   * @returns {Promise<Object>} Connection information
   */
  async connect(credentials) {
    try {
      console.log(`Connecting to Google Vertex AI service (${this.serviceId})...`);
      
      if (!credentials.apiKey && !credentials.serviceAccountKey) {
        throw new Error('Either API key or service account key is required for Google Vertex AI connection');
      }
      
      // Initialize HTTP client
      this.httpClient = axios.create({
        baseURL: this.baseUrl,
        headers: this._getAuthHeaders(credentials),
        timeout: 30000, // 30 second timeout
      });
      
      // Test connection with a small request
      const testResult = await this.healthCheck({ credentials });
      
      if (!testResult.status === 'healthy') {
        throw new Error(`Connection test failed: ${testResult.message}`);
      }
      
      console.log(`Successfully connected to Google Vertex AI (${this.serviceId})`);
      
      // Return connection details
      return {
        status: 'connected',
        serviceId: this.serviceId,
        connectedAt: new Date(),
        rateLimits: this.rateLimits,
        models: Object.keys(this.modelMapping),
        apiVersion: 'v1',
      };
    } catch (error) {
      console.error(`Failed to connect to Google Vertex AI (${this.serviceId}):`, error);
      
      // Format Vertex AI specific errors
      const errorMessage = this._formatVertexAIError(error);
      
      throw new Error(`Google Vertex AI connection failed: ${errorMessage}`);
    }
  }

  /**
   * Check Google Vertex AI service health
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
          headers: this._getAuthHeaders(connection.credentials),
          timeout: 10000, // Lower timeout for health checks
        });
      }
      
      if (!this.httpClient) {
        throw new Error('HTTP client not initialized');
      }
      
      // Check API availability by listing models
      const modelsEndpoint = `projects/${this.projectId}/locations/${this.location}/models`;
      const response = await this.httpClient.get(modelsEndpoint);
      
      const latency = Date.now() - startTime;
      
      // Return health status
      return {
        status: 'healthy',
        message: 'Google Vertex AI API is responding normally',
        latency,
        models: response.data.models ? response.data.models.slice(0, 10).map(m => m.displayName) : [],
        modelCount: response.data.models ? response.data.models.length : 0,
        version: 'v1',
      };
    } catch (error) {
      console.error(`Google Vertex AI health check failed (${this.serviceId}):`, error);
      
      // Format Vertex AI specific errors
      const errorMessage = this._formatVertexAIError(error);
      
      return {
        status: 'unhealthy',
        message: `Health check failed: ${errorMessage}`,
        latency: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Generate completion using Google Vertex AI
   * @param {Object} params - Completion parameters
   * @param {Object} connection - Connection information
   * @returns {Promise<Object>} Completion result
   */
  async generateCompletion(params, connection) {
    const startTime = Date.now();
    const requestId = uuidv4();
    
    try {
      console.log(`Generating completion (${requestId}) with Google Vertex AI (${this.serviceId})...`);
      
      // Map model if needed
      let model = params.model || this.defaultModel;
      let modelConfig;
      
      if (this.modelMapping[model]) {
        modelConfig = this.modelMapping[model];
      } else {
        // If model not found in mapping, use as-is
        modelConfig = {
          name: model,
          endpoint: `publishers/google/models/${model}`,
          max_tokens: 32000,
          default_tokens: 2048,
        };
      }
      
      // Prepare request based on model type
      const isGemini = modelConfig.name.startsWith('gemini');
      let endpoint, requestBody;
      
      if (isGemini) {
        // Gemini models
        endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${modelConfig.name}:generateContent`;
        
        // Build content array
        const content = [{
          role: 'user',
          parts: [{ text: params.prompt }]
        }];
        
        // Add system message if provided
        if (params.systemMessage) {
          content.unshift({
            role: 'system',
            parts: [{ text: params.systemMessage }]
          });
        }
        
        requestBody = {
          contents: content,
          generationConfig: {
            maxOutputTokens: params.max_tokens || modelConfig.default_tokens,
            temperature: params.temperature ?? this.defaultTemp,
            topP: params.top_p ?? this.defaultTopP,
          },
        };
        
        // Add stop sequences if provided
        if (params.stop_sequences && params.stop_sequences.length > 0) {
          requestBody.generationConfig.stopSequences = params.stop_sequences;
        }
      } else {
        // Text models (text-bison, etc.)
        endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${modelConfig.name}:predict`;
        
        let prompt = params.prompt;
        
        // Add system message if provided
        if (params.systemMessage) {
          prompt = `${params.systemMessage}\n\n${prompt}`;
        }
        
        requestBody = {
          instances: [
            { prompt }
          ],
          parameters: {
            maxOutputTokens: params.max_tokens || modelConfig.default_tokens,
            temperature: params.temperature ?? this.defaultTemp,
            topP: params.top_p ?? this.defaultTopP,
          },
        };
        
        // Add stop sequences if provided
        if (params.stop_sequences && params.stop_sequences.length > 0) {
          requestBody.parameters.stopSequences = params.stop_sequences;
        }
      }
      
      // Make API request with retry logic
      const maxRetries = 3;
      let retries = 0;
      let response;
      
      while (retries < maxRetries) {
        try {
          response = await this.httpClient.post(endpoint, requestBody);
          break; // Success, exit retry loop
        } catch (error) {
          retries++;
          
          // Check if we should retry
          const shouldRetry = this._shouldRetryRequest(error, retries, maxRetries);
          
          if (!shouldRetry) {
            throw error; // Don't retry, propagate error
          }
          
          // Exponential backoff with jitter
          const backoffTime = Math.min(
            100 * Math.pow(2, retries) + Math.random() * 100,
            2000
          );
          console.log(`Retrying Vertex AI request (attempt ${retries}/${maxRetries}) after ${backoffTime}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
      
      if (!response) {
        throw new Error(`Failed to get response after ${maxRetries} attempts`);
      }
      
      // Process response based on model type
      let result;
      
      if (isGemini) {
        // Process Gemini response
        const content = response.data.candidates[0].content;
        const text = content.parts.map(part => part.text).join('');
        
        result = {
          text,
          finish_reason: response.data.candidates[0].finishReason || 'STOP',
          usage: {
            prompt_tokens: response.data.usageMetadata?.promptTokenCount || 0,
            completion_tokens: response.data.usageMetadata?.candidatesTokenCount || 0,
            total_tokens: (response.data.usageMetadata?.promptTokenCount || 0) + 
                          (response.data.usageMetadata?.candidatesTokenCount || 0),
          },
          model: modelConfig.name,
        };
      } else {
        // Process text model response
        const prediction = response.data.predictions[0];
        
        result = {
          text: prediction.content || prediction.text,
          finish_reason: 'STOP',
          usage: {
            prompt_tokens: prediction.tokenCount?.inputTokens || 0,
            completion_tokens: prediction.tokenCount?.outputTokens || 0,
            total_tokens: (prediction.tokenCount?.inputTokens || 0) + 
                          (prediction.tokenCount?.outputTokens || 0),
          },
          model: modelConfig.name,
        };
      }
      
      const duration = Date.now() - startTime;
      
      // Record metrics
      this.recordMetrics('generateCompletion', true, duration);
      
      console.log(`Google Vertex AI completion generated (${requestId}) in ${duration}ms`);
      
      return {
        ...result,
        latency_ms: duration,
        provider: 'vertex_ai',
        requestId,
      };
    } catch (error) {
      console.error(`Google Vertex AI completion failed (${requestId}):`, error);
      
      const duration = Date.now() - startTime;
      this.recordMetrics('generateCompletion', false, duration);
      
      // Format Vertex AI specific errors
      const errorMessage = this._formatVertexAIError(error);
      
      throw new Error(`Google Vertex AI completion failed: ${errorMessage}`);
    }
  }

  /**
   * Generate embeddings using Google Vertex AI
   * @param {Object} params - Embedding parameters
   * @param {Object} connection - Connection information
   * @returns {Promise<Object>} Embedding result
   */
  async generateEmbedding(params, connection) {
    const startTime = Date.now();
    const requestId = uuidv4();
    
    try {
      console.log(`Generating embedding (${requestId}) with Google Vertex AI (${this.serviceId})...`);
      
      // Default to text-embedding-gecko model
      const model = params.model || 'text-embedding-gecko';
      const modelConfig = this.modelMapping[model] || {
        name: model,
        endpoint: `publishers/google/models/${model}`,
        dimension: 768,
      };
      
      // Prepare input
      let texts;
      if (Array.isArray(params.texts)) {
        texts = params.texts;
      } else {
        texts = [params.text || params.prompt || ''];
      }
      
      // Ensure we're using the model endpoint
      const endpoint = `projects/${this.projectId}/locations/${this.location}/${modelConfig.endpoint}:embedText`;
      
      // Make API request
      const response = await this.httpClient.post(endpoint, {
        instances: texts.map(text => ({ text })),
      });
      
      // Process response
      const embeddings = response.data.predictions || response.data.embeddings || [];
      
      const result = {
        embeddings: embeddings.map(embedding => {
          // Handle different response formats
          if (Array.isArray(embedding)) {
            return embedding;
          } else if (embedding.embeddings) {
            return embedding.embeddings;
          } else if (embedding.embedding) {
            return embedding.embedding;
          } else if (embedding.values) {
            return embedding.values;
          } else if (embedding.value) {
            return embedding.value;
          } else {
            // As a last resort, try to extract any array property
            const arrayProps = Object.entries(embedding)
              .filter(([_, value]) => Array.isArray(value))
              .map(([_, value]) => value);
            
            if (arrayProps.length > 0) {
              return arrayProps[0]; // Use the first array property found
            }
            
            console.warn('Unable to extract embedding from response, returning empty array');
            return [];
          }
        }),
        usage: {
          prompt_tokens: response.data.usage?.promptTokenCount || 0,
          total_tokens: response.data.usage?.totalTokenCount || 0,
        },
        model: modelConfig.name,
        dimension: modelConfig.dimension || embeddings[0]?.length || 0,
      };
      
      const duration = Date.now() - startTime;
      
      // Record metrics
      this.recordMetrics('generateEmbedding', true, duration);
      
      console.log(`Google Vertex AI embedding generated (${requestId}) in ${duration}ms`);
      
      return {
        ...result,
        latency_ms: duration,
        provider: 'vertex_ai',
        requestId,
      };
    } catch (error) {
      console.error(`Google Vertex AI embedding failed (${requestId}):`, error);
      
      const duration = Date.now() - startTime;
      this.recordMetrics('generateEmbedding', false, duration);
      
      // Format Vertex AI specific errors
      const errorMessage = this._formatVertexAIError(error);
      
      throw new Error(`Google Vertex AI embedding failed: ${errorMessage}`);
    }
  }

  /**
   * Format Vertex AI-specific errors
   * @private
   */
  _formatVertexAIError(error) {
    if (error.response && error.response.data && error.response.data.error) {
      const vertexError = error.response.data.error;
      return `[${vertexError.code}] ${vertexError.message}`;
    }
    
    if (error.response && error.response.status) {
      switch (error.response.status) {
        case 400:
          return 'Bad request: The request was invalid';
        case 401:
          return 'Authentication error: Invalid API key or service account';
        case 403:
          return 'Authorization error: Not authorized to access this resource';
        case 404:
          return 'Not found: The requested resource was not found';
        case 429:
          return 'Rate limit exceeded: Please try again later';
        case 500:
          return 'Google Vertex AI server error';
        case 503:
          return 'Google Vertex AI service unavailable: The service is temporarily offline';
        default:
          return `HTTP error ${error.response.status}: ${error.message}`;
      }
    }
    
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out: Google Vertex AI API took too long to respond';
    }
    
    if (error.code === 'ECONNREFUSED') {
      return 'Connection refused: Could not connect to Google Vertex AI API';
    }
    
    return error.message;
  }

  /**
   * Get authentication headers
   * @private
   */
  _getAuthHeaders(credentials) {
    if (credentials.apiKey) {
      return {
        'x-goog-api-key': credentials.apiKey,
        'Content-Type': 'application/json'
      };
    } else if (credentials.serviceAccountKey) {
      // In a production environment, you would use the service account key
      // to generate an OAuth token. For simplicity, we're just using the
      // service account key directly.
      return {
        'Authorization': `Bearer ${credentials.serviceAccountKey}`,
        'Content-Type': 'application/json'
      };
    } else {
      throw new Error('Either API key or service account key is required for Google Vertex AI connection');
    }
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
          const jsonMatch = result.text.match(/```(?:json)?(.*?)```/s) || result.text.match(/{.*}/s);
          
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
  VertexAIAdapter
};

