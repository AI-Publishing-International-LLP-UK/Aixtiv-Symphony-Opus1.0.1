/**
 * Model Orchestration Layer
 * 
 * A centralized orchestration system for managing interactions with multiple LLM providers.
 * This layer intelligently routes requests to the most appropriate LLM based on:
 * - Task requirements (capabilities, context length, etc.)
 * - Cost optimization
 * - Performance metrics
 * - Availability and reliability
 * - User preferences and permissions
 */

const { performance } = require('perf_hooks');
const config = require('../../config');
const logger = require('../../utils/logger');
const MetricsCollector = require('../metrics/MetricsCollector');
const ModelCapabilityRegistry = require('./ModelCapabilityRegistry');
const { ErrorUtils } = require('../../utils/ErrorUtils');

// Import LLM adapters
const { OpenAIAdapter } = require('../../adapters/llm-adapters/openai-adapter');
const { AnthropicAdapter } = require('../../adapters/llm-adapters/anthropic-adapter');
const { VertexAIAdapter } = require('../../adapters/llm-adapters/vertex-ai-adapter');

/**
 * Strategy patterns for LLM selection
 */
const SelectionStrategy = {
  COST_OPTIMIZED: 'cost_optimized',
  PERFORMANCE_OPTIMIZED: 'performance_optimized',
  CAPABILITY_OPTIMIZED: 'capability_optimized',
  RELIABILITY_OPTIMIZED: 'reliability_optimized',
  USER_PREFERRED: 'user_preferred',
  BALANCED: 'balanced'
};

/**
 * Task types for specialized handling
 */
const TaskType = {
  TEXT_GENERATION: 'text_generation',
  CODE_GENERATION: 'code_generation',
  REASONING: 'reasoning',
  CREATIVE: 'creative',
  EMBEDDING: 'embedding',
  CLASSIFICATION: 'classification',
  SUMMARIZATION: 'summarization',
  TRANSLATION: 'translation',
  QA: 'question_answering',
  CHAT: 'chat',
  SYSTEM_PROMPT: 'system_prompt'
};

/**
 * Model Orchestration Layer - Central coordination for LLM interactions
 */
class ModelOrchestrationLayer {
  constructor() {
    this.capabilityRegistry = new ModelCapabilityRegistry();
    this.metricsCollector = new MetricsCollector('model_orchestration');
    
    // Initialize adapters
    this.adapters = {
      openai: new OpenAIAdapter(config.llmAdapters.openai),
      anthropic: new AnthropicAdapter(config.llmAdapters.anthropic),
      vertexai: new VertexAIAdapter(config.llmAdapters.vertexai)
    };
    
    // Performance tracking
    this.performanceMetrics = {
      openai: { latency: [], errorRate: 0, successCount: 0, failureCount: 0, lastUpdated: Date.now() },
      anthropic: { latency: [], errorRate: 0, successCount: 0, failureCount: 0, lastUpdated: Date.now() },
      vertexai: { latency: [], errorRate: 0, successCount: 0, failureCount: 0, lastUpdated: Date.now() }
    };
    
    // Cache for frequent requests
    this.responseCache = new Map();
    this.cacheTTL = config.modelOrchestration?.cacheTTL || 3600000; // 1 hour default
    
    // Fallback chains
    this.fallbackChains = {
      openai: ['anthropic', 'vertexai'],
      anthropic: ['openai', 'vertexai'],
      vertexai: ['openai', 'anthropic']
    };
    
    // Custom routing rules
    this.routingRules = config.modelOrchestration?.routingRules || [];
    
    logger.info('Model Orchestration Layer initialized');
    
    // Start metrics reset interval
    setInterval(() => this.resetMetricsWindow(), 24 * 60 * 60 * 1000); // Reset metrics window daily
  }
  
  /**
   * Execute an LLM task with intelligent model selection
   * @param {Object} request - The request parameters
   * @param {Object} options - Orchestration options
   * @returns {Promise<Object>} - The model response
   */
  async executeTask(request, options = {}) {
    const startTime = performance.now();
    const requestId = request.requestId || `req-${Date.now()}`;
    
    try {
      logger.info(`Processing LLM request (${requestId})`, {
        taskType: request.taskType,
        capabilities: request.capabilities,
        strategy: options.strategy
      });
      
      // Apply any preprocessing
      request = await this.preprocessRequest(request);
      
      // Check cache for identical requests if caching is enabled
      if (options.enableCaching !== false) {
        const cacheKey = this.generateCacheKey(request);
        const cachedResponse = this.responseCache.get(cacheKey);
        
        if (cachedResponse && (Date.now() - cachedResponse.timestamp < this.cacheTTL)) {
          logger.debug(`Cache hit for request (${requestId})`);
          return { ...cachedResponse.response, fromCache: true };
        }
      }
      
      // Select the most appropriate model based on the strategy
      const modelSelection = await this.selectModel(request, options);
      logger.info(`Selected model for request (${requestId}): ${modelSelection.provider}/${modelSelection.model}`);
      
      // Execute the request with the selected model
      const response = await this.executeWithModel(
        modelSelection.provider,
        modelSelection.model,
        request,
        options
      );
      
      // Cache the response if caching is enabled
      if (options.enableCaching !== false) {
        const cacheKey = this.generateCacheKey(request);
        this.responseCache.set(cacheKey, {
          response: response,
          timestamp: Date.now()
        });
      }
      
      // Record execution metrics
      const duration = performance.now() - startTime;
      this.metricsCollector.recordModelOrchestration({
        requestId,
        provider: modelSelection.provider,
        model: modelSelection.model,
        taskType: request.taskType,
        duration,
        success: true,
        strategy: options.strategy || SelectionStrategy.BALANCED
      });
      
      // Update performance metrics
      this.updatePerformanceMetrics(modelSelection.provider, true, duration);
      
      return response;
    } catch (error) {
      logger.error(`Error executing LLM task (${requestId}): ${ErrorUtils.formatError(error)}`, {
        error,
        request
      });
      
      // If fallback is enabled, try with fallback provider
      if (options.enableFallback !== false && options.currentFallbackDepth < (options.maxFallbackDepth || 2)) {
        return this.executeFallback(request, options, error);
      }
      
      // Record execution metrics for failure
      const duration = performance.now() - startTime;
      this.metricsCollector.recordModelOrchestration({
        requestId,
        taskType: request.taskType,
        duration,
        success: false,
        error: ErrorUtils.getErrorMessage(error),
        strategy: options.strategy || SelectionStrategy.BALANCED
      });
      
      throw error;
    }
  }
  
  /**
   * Preprocess the request before execution
   * @private
   */
  async preprocessRequest(request) {
    // Apply any task-specific preprocessing
    if (request.taskType === TaskType.CODE_GENERATION) {
      request.systemPrompt = request.systemPrompt || 'You are an expert programmer. Generate high-quality, well-documented code.';
    } else if (request.taskType === TaskType.REASONING) {
      request.systemPrompt = request.systemPrompt || 'You are a logical assistant. Break down problems step by step.';
    }
    
    // Apply routing rules
    for (const rule of this.routingRules) {
      if (this.matchesRoutingRule(request, rule)) {
        request.preferredProvider = rule.provider;
        request.preferredModel = rule.model;
        break;
      }
    }
    
    return request;
  }
  
  /**
   * Select the most appropriate model based on the request and strategy
   * @private
   */
  async selectModel(request, options) {
    const strategy = options.strategy || SelectionStrategy.BALANCED;
    
    // Check for user preferences
    if (request.preferredProvider && request.preferredModel) {
      return {
        provider: request.preferredProvider,
        model: request.preferredModel
      };
    }
    
    // Find models that match required capabilities
    const requiredCapabilities = request.capabilities || this.getCapabilitiesForTaskType(request.taskType);
    const candidateModels = this.capabilityRegistry.findModelsByCapabilities(requiredCapabilities);
    
    if (candidateModels.length === 0) {
      throw new Error(`No models found with required capabilities: ${requiredCapabilities.join(', ')}`);
    }
    
    // Apply selection strategy
    let selectedModel;
    
    switch(strategy) {
      case SelectionStrategy.COST_OPTIMIZED:
        selectedModel = this.selectCheapestModel(candidateModels, request);
        break;
      case SelectionStrategy.PERFORMANCE_OPTIMIZED:
        selectedModel = this.selectFastestModel(candidateModels);
        break;
      case SelectionStrategy.CAPABILITY_OPTIMIZED:
        selectedModel = this.selectMostCapableModel(candidateModels, request);
        break;
      case SelectionStrategy.RELIABILITY_OPTIMIZED:
        selectedModel = this.selectMostReliableModel(candidateModels);
        break;
      case SelectionStrategy.USER_PREFERRED:
        selectedModel = this.selectUserPreferredModel(candidateModels, options.userPreferences);
        break;
      case SelectionStrategy.BALANCED:
      default:
        selectedModel = this.selectBalancedModel(candidateModels, request);
        break;
    }
    
    return {
      provider: selectedModel.provider,
      model: selectedModel.model
    };
  }
  
  /**
   * Execute a request with the specified model
   * @private
   */
  async executeWithModel(provider, model, request, options) {
    const adapter = this.adapters[provider];
    
    if (!adapter) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    
    // Prepare parameters based on the task type
    let params;
    
    if (request.taskType === TaskType.EMBEDDING) {
      params = {
        text: request.text || request.prompt,
        model: model
      };
      
      const result = await adapter.generateEmbedding(params);
      return this.formatResponse(result, provider, model);
    } else {
      // For text generation and other tasks
      params = {
        prompt: request.prompt,
        systemPrompt: request.systemPrompt,
        model: model,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        top_p: request.topP,
        stop_sequences: request.stopSequences
      };
      
      const result = await adapter.generateCompletion(params);
      return this.formatResponse(result, provider, model);
    }
  }
  
  /**
   * Execute fallback logic when primary model fails
   * @private
   */
  async executeFallback(request, options, originalError) {
    const primaryProvider = options.lastProvider || (request.preferredProvider || 'openai');
    const fallbackProviders = this.fallbackChains[primaryProvider];
    
    if (!fallbackProviders || fallbackProviders.length === 0) {
      throw originalError;
    }
    
    // Try each fallback provider in sequence
    for (const fallbackProvider of fallbackProviders) {
      try {
        logger.info(`Attempting fallback to ${fallbackProvider} after ${primaryProvider} failure`);
        
        // Find a suitable model from the fallback provider
        const requiredCapabilities = request.capabilities || this.getCapabilitiesForTaskType(request.taskType);
        const fallbackModels = this.capabilityRegistry.findModelsByCapabilities(requiredCapabilities)
          .filter(model => model.provider === fallbackProvider);
        
        if (fallbackModels.length === 0) {
          logger.warn(`No suitable fallback models found for ${fallbackProvider}`);
          continue;
        }
        
        // Select the best model from the fallback provider
        const fallbackModel = this.selectBalancedModel(fallbackModels, request);
        
        // Execute with the fallback model
        const fallbackOptions = {
          ...options,
          lastProvider: fallbackProvider,
          currentFallbackDepth: (options.currentFallbackDepth || 0) + 1
        };
        
        return await this.executeWithModel(
          fallbackProvider,
          fallbackModel.model,
          request,
          fallbackOptions
        );
      } catch (fallbackError) {
        logger.error(`Fallback to ${fallbackProvider} failed: ${ErrorUtils.formatError(fallbackError)}`);
      }
    }
    
    // If all fallbacks fail, throw the original error
    throw originalError;
  }
  
  /**
   * Format the response in a standardized way
   * @private
   */
  formatResponse(result, provider, model) {
    // Create a standardized response format
    return {
      text: result.text || result.content || null,
      embedding: result.embedding || result.embeddings || null,
      usage: {
        promptTokens: result.usage?.prompt_tokens || result.usage?.inputTokens || 0,
        completionTokens: result.usage?.completion_tokens || result.usage?.outputTokens || 0,
        totalTokens: result.usage?.total_tokens || result.usage?.totalTokens || 0
      },
      latencyMs: result.latency_ms || result.latencyMs || 0,
      model: model,
      provider: provider,
      finishReason: result.finish_reason || result.finishReason || null,
      metadata: result.metadata || {}
    };
  }
  
  /**
   * Get capabilities required for a specific task type
   * @private
   */
  getCapabilitiesForTaskType(taskType) {
    switch(taskType) {
      case TaskType.CODE_GENERATION:
        return ['code'];
      case TaskType.REASONING:
        return ['reasoning'];
      case TaskType.CREATIVE:
        return ['creative'];
      case TaskType.EMBEDDING:
        return ['embeddings'];
      case TaskType.CHAT:
        return ['chat'];
      default:
        return ['chat']; // Default to basic chat capability
    }
  }
  
  /**
   * Select the cheapest model for cost optimization
   * @private
   */
  selectCheapestModel(models, request) {
    // Estimate token count
    const estimatedInputTokens = request.estimatedInputTokens || this.estimateTokenCount(request.

