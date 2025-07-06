/**
 * AIXTIV SYMPHONY™ AI Connector
 * © 2025 AI Publishing International LLP
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * This is proprietary software of AI Publishing International LLP.
 * All rights reserved. No part of this software may be reproduced,
 * modified, or distributed without prior written permission.
 */

import { getFirestore, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { PineconeClient, QueryResponse } from '@pinecone-database/pinecone';
import { ActivityLoggerService, PerformanceMetricsService } from '../core';
import { S2DOManager, S2DOObjectType } from '../core/s2do';
import { S2DOBlockchainSecurityManager, BlockchainIntegrationManager } from '../core/blockchain-integration';

// Initialize Firebase services
const db = getFirestore();
const functions = getFunctions();

// Initialize Pinecone (will be configured at runtime)
let pineconeClient: PineconeClient | null = null;

// AI Model Types
export enum AIModelType {
  TEXT_GENERATION = 'text-generation',
  EMBEDDINGS = 'embeddings',
  IMAGE_GENERATION = 'image-generation',
  IMAGE_UNDERSTANDING = 'image-understanding',
  DREAM_ANALYSIS = 'dream-analysis',
  MEMORY_ENHANCEMENT = 'memory-enhancement',
  PROFILE_ANALYSIS = 'profile-analysis',
  VISUALIZATION = 'visualization',
  MULTIMODAL = 'multimodal'
}

// AI Request Types
export enum AIRequestType {
  COMPLETION = 'completion',
  CHAT = 'chat',
  EMBEDDING = 'embedding',
  IMAGE_GENERATION = 'image-generation',
  IMAGE_ANALYSIS = 'image-analysis',
  DREAM_INTERPRETATION = 'dream-interpretation',
  MEMORY_ENHANCEMENT = 'memory-enhancement',
  PROFILE_ANALYSIS = 'profile-analysis',
  VISUALIZATION_CREATION = 'visualization-creation',
  MULTIMODAL_ANALYSIS = 'multimodal-analysis',
  DOCUMENT_ANALYSIS = 'document-analysis'
}

// AI Response Types
export enum AIResponseFormat {
  TEXT = 'text',
  JSON = 'json',
  HTML = 'html',
  MARKDOWN = 'markdown',
  IMAGE_URL = 'image-url',
  BINARY = 'binary',
  VECTOR = 'vector',
  METADATA = 'metadata'
}

// AI Connector Interface
interface AIConnectorOptions {
  pineconeApiKey?: string;
  pineconeEnvironment?: string;
  defaultModel?: string;
  useCache?: boolean;
  cacheLifetime?: number; // in seconds
  enableLogging?: boolean;
  enableMetrics?: boolean;
  s2doManager?: S2DOManager;
  blockchainManager?: BlockchainIntegrationManager;
}

// AI Request Parameter Interface
export interface AIRequestParams {
  modelType: AIModelType;
  requestType: AIRequestType;
  content: string | string[] | Array<{role: string, content: string}>;
  context?: any;
  responseFormat?: AIResponseFormat;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  userId?: string;
  conversationId?: string;
  systemPrompt?: string;
  options?: Record<string, any>;
  useCache?: boolean;
}

// AI Response Interface
export interface AIResponse {
  id: string;
  requestId: string;
  modelType: AIModelType;
  requestType: AIRequestType;
  content: any;
  format: AIResponseFormat;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  metadata?: Record<string, any>;
  processingTime?: number;
  created: number;
  cached?: boolean;
}

/**
 * AIXTIV SYMPHONY AI Connector
 * Handles interactions with AI models and embedding systems
 */
export class AIConnector {
  private options: Required<AIConnectorOptions>;
  private s2doManager: S2DOManager | null;
  private blockchainManager: BlockchainIntegrationManager | null;
  private securityManager: S2DOBlockchainSecurityManager | null;
  private pinecone: PineconeClient | null = null;
  
  constructor(options: AIConnectorOptions = {}) {
    // Set default options
    this.options = {
      pineconeApiKey: options.pineconeApiKey || process.env.PINECONE_API_KEY || '',
      pineconeEnvironment: options.pineconeEnvironment || process.env.PINECONE_ENVIRONMENT || '',
      defaultModel: options.defaultModel || 'claude-3-7-sonnet',
      useCache: options.useCache !== undefined ? options.useCache : true,
      cacheLifetime: options.cacheLifetime || 3600, // 1 hour default
      enableLogging: options.enableLogging !== undefined ? options.enableLogging : true,
      enableMetrics: options.enableMetrics !== undefined ? options.enableMetrics : true,
      s2doManager: options.s2doManager || null,
      blockchainManager: options.blockchainManager || null
    };
    
    // Set up S2DO and blockchain integration if provided
    this.s2doManager = this.options.s2doManager;
    this.blockchainManager = this.options.blockchainManager;
    
    if (this.blockchainManager && !this.s2doManager) {
      this.securityManager = new S2DOBlockchainSecurityManager(this.blockchainManager);
      this.s2doManager = new S2DOManager(this.blockchainManager, this.securityManager);
    } else {
      this.securityManager = null;
    }
    
    // Initialize Pinecone if API key is provided
    this.initializePinecone();
  }
  
  /**
   * Initialize Pinecone client
   */
  private async initializePinecone(): Promise<void> {
    if (!this.options.pineconeApiKey || !this.options.pineconeEnvironment) {
      console.warn('Pinecone API key or environment not provided. Vector operations will not be available.');
      return;
    }
    
    try {
      this.pinecone = new PineconeClient();
      await this.pinecone.init({
        apiKey: this.options.pineconeApiKey,
        environment: this.options.pineconeEnvironment
      });
      
      pineconeClient = this.pinecone; // Set global client for other components to use
    } catch (error) {
      console.error('Error initializing Pinecone:', error);
      this.pinecone = null;
    }
  }
  
  /**
   * Process an AI request
   */
  public async processRequest(params: AIRequestParams): Promise<AIResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      // Check for cached response if caching is enabled
      if (this.options.useCache && params.useCache !== false) {
        const cachedResponse = await this.getFromCache(params);
        if (cachedResponse) {
          if (this.options.enableLogging) {
            await this.logRequest(
              params.userId || 'anonymous',
              requestId,
              params,
              cachedResponse,
              true
            );
          }
          return {
            ...cachedResponse,
            cached: true
          };
        }
      }
      
      // Process request based on request type
      let response: AIResponse;
      
      switch (params.requestType) {
        case AIRequestType.COMPLETION:
          response = await this.processCompletionRequest(requestId, params);
          break;
        case AIRequestType.CHAT:
          response = await this.processChatRequest(requestId, params);
          break;
        case AIRequestType.EMBEDDING:
          response = await this.processEmbeddingRequest(requestId, params);
          break;
        case AIRequestType.IMAGE_GENERATION:
          response = await this.processImageGenerationRequest(requestId, params);
          break;
        case AIRequestType.DREAM_INTERPRETATION:
          response = await this.processDreamInterpretationRequest(requestId, params);
          break;
        case AIRequestType.MEMORY_ENHANCEMENT:
          response = await this.processMemoryEnhancementRequest(requestId, params);
          break;
        case AIRequestType.PROFILE_ANALYSIS:
          response = await this.processProfileAnalysisRequest(requestId, params);
          break;
        case AIRequestType.VISUALIZATION_CREATION:
          response = await this.processVisualizationCreationRequest(requestId, params);
          break;
        case AIRequestType.MULTIMODAL_ANALYSIS:
          response = await this.processMultimodalAnalysisRequest(requestId, params);
          break;
        default:
          throw new Error(`Unsupported request type: ${params.requestType}`);
      }
      
      // Calculate processing time
      const processingTime = Date.now() - startTime;
      response.processingTime = processingTime;
      
      // Cache the response if caching is enabled
      if (this.options.useCache && params.useCache !== false) {
        await this.saveToCache(params, response);
      }
      
      // Log the request if logging is enabled
      if (this.options.enableLogging) {
        await this.logRequest(
          params.userId || 'anonymous',
          requestId,
          params,
          response,
          false
        );
      }
      
      // Record metrics if enabled
      if (this.options.enableMetrics) {
        await this.recordMetrics(
          params.userId || 'anonymous',
          params.modelType,
          params.requestType,
          processingTime,
          response.usage?.totalTokens || 0
        );
      }
      
      return response;
    } catch (error) {
      console.error('Error processing AI request:', error);
      
      // Log error if logging is enabled
      if (this.options.enableLogging) {
        await this.logRequestError(
          params.userId || 'anonymous',
          requestId,
          params,
          error
        );
      }
      
      throw error;
    }
  }
  
  /**
   * Process a text completion request
   */
  private async processCompletionRequest(requestId: string, params: AIRequestParams): Promise<AIResponse> {
    try {
      // Call the text completion Cloud Function
      const completionFunction = httpsCallable(functions, 'aiCompletionRequest');
      const result = await completionFunction({
        model: params.options?.model || this.options.defaultModel,
        prompt: params.content,
        max_tokens: params.maxTokens || 1000,
        temperature: params.temperature || 0.7,
        top_p: params.topP || 1,
        frequency_penalty: params.frequencyPenalty || 0,
        presence_penalty: params.presencePenalty || 0,
        stop: params.stop || null,
        response_format: params.responseFormat || AIResponseFormat.TEXT
      });
      
      // Extract the response data
      const data = result.data as any;
      
      return {
        id: data.id || `gen_${Date.now().toString(36)}`,
        requestId,
        modelType: params.modelType,
        requestType: params.requestType,
        content: data.content || data.text,
        format: params.responseFormat || AIResponseFormat.TEXT,
        usage: data.usage,
        metadata: data.metadata || {},
        created: Date.now(),
      };
    } catch (error) {
      console.error('Error in completion request:', error);
      throw error;
    }
  }
  
  /**
   * Process a chat request
   */
  private async processChatRequest(requestId: string, params: AIRequestParams): Promise<AIResponse> {
    try {
      // Prepare messages format
      let messages: Array<{role: string, content: string}>;
      
      if (Array.isArray(params.content) && typeof params.content[0] === 'object' && 'role' in params.content[0]) {
        // Content is already in the correct messages format
        messages = params.content as Array<{role: string, content: string}>;
      } else if (Array.isArray(params.content) && typeof params.content[0] === 'string') {
        // Content is an array of strings (alternate user/assistant)
        messages = (params.content as string[]).map((content, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content
        }));
      } else {
        // Content is a single string (user message)
        messages = [
          {
            role: 'user',
            content: params.content as string
          }
        ];
      }
      
      // Add system prompt if provided
      if (params.systemPrompt) {
        messages.unshift({
          role: 'system',
          content: params.systemPrompt
        });
      }
      
      // Call the chat completion Cloud Function
      const chatFunction = httpsCallable(functions, 'aiChatRequest');
      const result = await chatFunction({
        model: params.options?.model || this.options.defaultModel,
        messages,
        max_tokens: params.maxTokens,
        temperature: params.temperature || 0.7,
        top_p: params.topP || 1,
        frequency_penalty: params.frequencyPenalty || 0,
        presence_penalty: params.presencePenalty || 0,
        stop: params.stop || null,
        response_format: params.responseFormat || AIResponseFormat.TEXT,
        conversation_id: params.conversationId
      });
      
      // Extract the response data
      const data = result.data as any;
      
      return {
        id: data.id || `chat_${Date.now().toString(36)}`,
        requestId,
        modelType: params.modelType,
        requestType: params.requestType,
        content: data.content || data.message?.content,
        format: params.responseFormat || AIResponseFormat.TEXT,
        usage: data.usage,
        metadata: {
          ...data.metadata || {},
          conversationId: params.conversationId || data.conversation_id
        },
        created: Date.now(),
      };
    } catch (error) {
      console.error('Error in chat request:', error);
      throw error;
    }
  }
  
  /**
   * Process an embedding request
   */
  private async processEmbeddingRequest(requestId: string, params: AIRequestParams): Promise<AIResponse> {
    try {
      // Validate Pinecone is initialized
      if (!this.pinecone) {
        throw new Error('Pinecone is not initialized. Cannot process embedding request.');
      }
      
      // Call the embedding Cloud Function
      const embeddingFunction = httpsCallable(functions, 'generateEmbedding');
      const result = await embeddingFunction({
        model: params.options?.embeddingModel || 'text-embedding-small',
        input: params.content,
        dimensions: params.options?.dimensions || 1536
      });
      
      // Extract the response data
      const data = result.data as any;
      
      return {
        id: `emb_${Date.now().toString(36)}`,
        requestId,
        modelType: params.modelType,
        requestType: params.requestType,
        content: data.embedding,
        format: AIResponseFormat.VECTOR,
        usage: data.usage,
        metadata: {
          dimensions: data.embedding.length,
          indexName: params.options?.indexName,
          namespace: params.options?.namespace
        },
        created: Date.now(),
      };
    } catch (error) {
      console.error('Error in embedding request:', error);
      throw error;
    }
  }
  
  /**
   * Process an image generation request
   */
  private async processImageGenerationRequest(requestId: string, params: AIRequestParams): Promise<AIResponse> {
    try {
      // Call the image generation Cloud Function
      const imageGenFunction = httpsCallable(functions, 'generateImage');
      const result = await imageGenFunction({
        model: params.options?.imageModel || 'claude-3-opus',
        prompt: params.content,
        size: params.options?.size || '1024x1024',
        style: params.options?.style || 'natural',
        quality: params.options?.quality || 'standard',
        response_format: 'url'
      });
      
      // Extract the response data
      const data = result.data as any;
      
      return {
        id: `img_${Date.now().toString(36)}`,
        requestId,
        modelType: params.modelType,
        requestType: params.requestType,
        content: data.url,
        format: AIResponseFormat.IMAGE_URL,
        metadata: {
          prompt: params.content,
          size: params.options?.size || '1024x1024',
          style: params.options?.style || 'natural'
        },
        created: Date.now(),
      };
    } catch (error) {
      console.error('Error in image generation request:', error);
      throw error;
    }
  }
  
  /**
   * Process a dream interpretation request
   */
  private async processDreamInterpretationRequest(requestId: string, params: AIRequestParams): Promise<AIResponse> {
    try {
      // Prepare dream interpretation prompts
      const systemPrompt = `You are Dr. Lucy, a dream analysis specialist in the AIXTIV SYMPHONY system. 
Your task is to interpret dreams with psychological depth, finding patterns, symbols, and potential meanings.
Focus on providing insightful analysis that helps the user understand their subconscious.
Avoid generic interpretations and instead personalize your response based on the specific dream details.
Structure your response with these sections:
1. Key Symbols - Identify and interpret major symbols
2. Emotional Landscape - Analyze the emotional content
3. Potential Meanings - Offer several possible interpretations
4. Patterns & Connections - Note any patterns or connections to the user's life if mentioned
5. Reflective Questions - Provide 2-3 thoughtful questions for the user to consider`;
      
      const dreamContent = typeof params.content === 'string' 
        ? params.content 
        : Array.isArray(params.content) 
          ? params.content.join("\n") 
          : '';
      
      // If provided with context from previous dreams, incorporate it
      let messages = [];
      
      if (params.context && params.context.previousDreams) {
        messages.push({
          role: 'system',
          content: `${systemPrompt}\n\nAdditional context: The user has shared these dreams previously: ${JSON.stringify(params.context.previousDreams)}`
        });
      } else {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }
      
      messages.push({
        role: 'user',
        content: `Please interpret this dream:\n\n${dreamContent}`
      });
      
      // Call the chat completion Cloud Function
      const dreamFunction = httpsCallable(functions, 'aiChatRequest');
      const result = await dreamFunction({
        model: params.options?.model || 'claude-3-7-sonnet',
        messages,
        temperature: params.temperature || 0.7,
        max_tokens: params.maxTokens || 2000,
        response_format: params.responseFormat || AIResponseFormat.MARKDOWN
      });
      
      // Extract the response data
      const data = result.data as any;
      
      // If S2DO manager is available, store the dream and interpretation
      if (this.s2doManager && params.userId) {
        try {
          // Store the dream as an S2DO object
          await this.s2doManager.createObject(
            'user',
            params.userId,
            S2DOObjectType.DREAM,
            {
              dreamContent,
              interpretation: data.content || data.message?.content,
              symbols: extractSymbols(data.content || data.message?.content),
              emotions: extractEmotions(data.content || data.message?.content)
            },
            {
              title: extractDreamTitle(dreamContent),
              description: dreamContent.substring(0, 100) + (dreamContent.length > 100 ? '...' : ''),
              tags: extractTags(data.content || data.message?.content)
            }
          );
        } catch (error) {
          console.error('Error storing dream interpretation:', error);
          // Continue even if storage fails
        }
      }
      
      return {
        id: `dream_${Date.now().toString(36)}`,
        requestId,
        modelType: params.modelType,
        requestType: params.requestType,
        content: data.content || data.message?.content,
        format: params.responseFormat || AIResponseFormat.MARKDOWN,
        usage: data.usage,
        metadata: {
          dreamLength: dreamContent.length,
          interpretationLength: (data.content || data.message?.content).length,
          symbols: extractSymbols(data.content || data.message?.content),
        },
        created: Date.now(),
      };
    } catch (error) {
      console.error('Error in dream interpretation request:', error);
      throw error;
    }
  }
  
  /**
   * Process a memory enhancement request
   */
  private async processMemoryEnhancementRequest(requestId: string, params: AIRequestParams): Promise<AIResponse> {
    try {
      // Prepare memory enhancement prompts
      const systemPrompt = `You are Dr. Memoria, a memory enhancement specialist in the AIXTIV SYMPHONY system.
Your task is to help the user capture, structure, and enhance their memories with vivid detail and emotional resonance.
Focus on adding depth, structure, and connections to the memory, helping to preserve its significant aspects.
Structure your response with these sections:
1. Enhanced Memory - An expanded version of the original memory with added descriptive elements
2. Key Elements - Important people, places, objects, sensations
3. Emotional Significance - The emotional context and importance
4. Connections - Potential links to other memories or experiences
5. Memory Triggers - Suggestions for how to recall or revisit this memory`;
      
      const memoryContent = typeof params.content === 'string' 
        ? params.content 
        : Array.isArray(params.content) 
          ? params.content.join("\n") 
          : '';
      
      // Get related memories from vector search if available
      let relatedMemories = [];
      if (this.pinecone && params.userId) {
        try {
          // Generate embedding for the memory
          const embeddingFunction = httpsCallable(functions, 'generateEmbedding');
          const embeddingResult = await embeddingFunction({
            input: memoryContent,
            dimensions: 1536
          });
          
          const embedding = (embeddingResult.data as any).embedding;
          
          // Search for related memories in Pinecone
          const index = this.pinecone.Index('aixtiv-symphony');
          const queryResponse = await index.query({
            queryVector: embedding,
            namespace: `user_${params.userId}_memories`,
            topK: 3,
            includeMetadata: true
          });
          
          if (queryResponse.matches && queryResponse.matches.length > 0) {
            relatedMemories = queryResponse.matches.map(match => ({
              id: match.id,
              content: match.metadata?.content || 'Unknown memory',
              similarity: match.score
            }));
          }
        } catch (error) {
          console.error('Error finding related memories:', error);
          // Continue even if vector search fails
        }
      }
      
      // Build messages with related memories as context
      let messages = [];
      
      if (relatedMemories.length > 0) {
        messages.push({
          role: 'system',
          content: `${systemPrompt}\n\nAdditional context: These related memories may be relevant: ${JSON.stringify(relatedMemories)}`
        });
      } else {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }
      
      messages.push({
        role: 'user',
        content: `Please enhance this memory:\n\n${memoryContent}`
      });
      
      // Call the chat completion Cloud Function
      const memoriaFunction = httpsCallable(functions, 'aiChatRequest');
      const result = await memoriaFunction({
        model: params.options?.model || 'claude-3-7-sonnet',
        messages,
        temperature: params.temperature || 0.7,
        max_tokens: params.maxTokens || 2000,
        response_format: params.responseFormat || AIResponseFormat.MARKDOWN
      });
      
      // Extract the response data
      const data = result.data as any;
      
      // If S2DO manager is available, store the memory and enhancement
      if (this.s2doManager && params.userId) {
        try {
          // Store the memory as an S2DO object
          await this.s2doManager.createObject(
            'user',
            params.userId,
            S2DOObjectType.MEMORY,
            {
              originalMemory: memoryContent,
              enhancedMemory: data.content || data.message?.content,
              keyElements: extractKeyElements(data.content || data.message?.content),
              emotionalSignificance: extractEmotionalSignificance(data.content || data.message?.content),
              relatedMemories: relatedMemories
            },
            {
              title: extractMemoryTitle(memoryContent),
              description: memoryContent.substring(0, 100) + (memoryContent.length > 100 ? '...' : ''),
              tags: extractTags(data.content || data.message?.content)
            }
          );
          
          // If Pinecone is available, store the memory embedding
          if (this.pinecone && embedding) {
            const index = this.pinecone.Index('aixtiv-symphony');
            await index.upsert({
              upsertRequest: {
                namespace: `user_${params.userId}_memories`,
                vectors: [
                  {
                    id: `memory_${Date.now()}`,
                    values: embedding,
                    metadata: {
                      content: memoryContent,
                      title: extractMemoryTitle(memoryContent),
                      userId: params.userId,
                      timestamp: Date.now()
                    }
                  }
                ]
              }
            });
          }
        } catch (error) {
          console.error('Error storing memory enhancement:', error);
          // Continue even if storage fails
        }
      }
      
      return {
        id: `memory_${Date.now().toString(36)}`,
        requestId,
        modelType: params.modelType,
        requestType: params.requestType,
        content: data.content || data.message?.content,
        format: params.responseFormat || AIResponseFormat.MARKDOWN,
        usage: data.usage,
        metadata: {
          originalLength: memoryContent.length,
          enhancedLength: (data.content || data.message?.content).length,
          relatedMemories: relatedMemories.length
        },
        created: Date.now(),
      };
    } catch (error) {
      console.error('Error in memory enhancement request:', error);
      throw error;
    }
  }
  
  /**
   * Process a profile analysis request
   */
  private async processProfileAnalysisRequest(requestId: string, params: AIRequestParams): Promise<AIResponse> {
    try {
      // Prepare profile analysis prompts
      const systemPrompt = `You are Dr. Match, a profile analysis specialist in the AIXTIV SYMPHONY system.
Your task is to analyze professional profiles and provide insights for networking, career development, and personal branding.
Focus on identifying strengths, opportunities, and recommendation for improvement.
Structure your response with these sections:
1. Profile Overview - Summary of key strengths and unique value proposition
2. Content Analysis - Assessment of profile sections (headline, about, experience, etc.)
3. Keyword Analysis - Important keywords and phrases for searchability
4. Improvement Recommendations - Specific suggestions for enhancement
5. Networking Strategy - Recommendations for connection building`;
      
      const profileContent = typeof params.content === 'string' 
        ? params.content 
        : Array.isArray(params.content) 
          ? params.content.join("\n") 
          : '';
      
      let messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Please analyze this professional profile:\n\n${profileContent}`
        }
      ];
      
      // Call the chat completion Cloud Function
      const profileFunction = httpsCallable(functions, 'aiChatRequest');
      const result = await profileFunction({
        model: params.options?.model || 'claude-3-7-sonnet',
        messages,
        temperature: params.temperature || 0.7,
        max_tokens: params.maxTokens || 2000,
        response_format: params.responseFormat || AIResponseFormat.MARKDOWN
      });
      
      // Extract the response data
      const data = result.data as any;
      
      // If S2DO manager is available, store the profile analysis
      if (this.s2doManager && params.userId) {
        try {
          // Store the profile analysis as an S2DO object
          await this.s2doManager.createObject(
            'user',
            params.userId,
            S2DOObjectType.PROFILE,
            {
              profileContent,
              analysis: data.content || data.message?.content,
              keywords: extractKeywords(data.content || data.message?.content),
              recommendations: extractRecommendations(data.content || data.message?.content)
            },
            {
              title: "Profile Analysis",
              description: "Analysis of professional profile with recommendations",
              tags: ["profile", "career", "networking", "analysis", "recommendations"]
            }
          );
        } catch (error) {
          console.error('Error storing profile analysis:', error);
          // Continue even if storage fails
        }
      }
      
      return {
        id: `profile_${Date.now().toString(36)}`,
        requestId,
        modelType: params.modelType,
        requestType: params.requestType,
        content: data.content || data.message?.content,
        format: params.responseFormat || AIResponseFormat.MARKDOWN,
        usage: data.usage,
        metadata: {
          profileLength: profileContent.length,
          analysisLength: (data.content || data.message?.content).length,
          keywords: extractKeywords(data.content || data.message?.content)
        },
        created: Date.now(),
      };
    } catch (error) {
      console.error('Error in profile analysis request:', error);
      throw error;
    }
  }
  
  /**
   * Process a visualization creation request
   */
  private async processVisualizationCreationRequest(requestId: string, params: AIRequestParams): Promise<AIResponse> {
    try {
      // Prepare visualization creation prompts
      const visualizationType = params.options?.visualizationType || 'descriptive';
      
      let systemPrompt = '';
      if (visualizationType === 'descriptive') {
        systemPrompt = `You are Dr. Lucy, a visualization specialist in the AIXTIV SYMPHONY system.
Your task is to create a vivid, detailed description of a visualization based on the user's request.
Focus on visual details, sensory elements, and emotional resonance.
The visualization should be immersive and engaging, helping the user to clearly picture the scene.`;
      } else if (visualizationType === 'guided') {
        systemPrompt = `You are Dr. Lucy, a guided visualization specialist in the AIXTIV SYMPHONY system.
Your task is to create a step-by-step guided visualization or meditation based on the user's request.
Focus on clear instructions, sensory elements, and emotional guidance.
Structure the visualization with an introduction, main journey, and conclusion.`;
      } else if (visualizationType === 'svg') {
        systemPrompt = `You are Dr. Lucy, a visualization specialist in the AIXTIV SYMPHONY system.
Your task is to create an SVG visualization based on the user's request.
Focus on creating clean, well-structured SVG code that represents the requested visualization.
The SVG should be visually appealing and accurately represent the user's request.`;
      }
      
      const visualizationRequest = typeof params.content === 'string' 
        ? params.content 
        : Array.isArray(params.content) 
          ? params.content.join("\n") 
          : '';
      
      let messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: visualizationRequest
        }
      ];
      
      // Call the appropriate function based on visualization type
      let result;
      
      if (visualizationType === 'svg') {
        // Call SVG generation function
        const svgFunction = httpsCallable(functions, 'generateSVG');
        result = await svgFunction({
          prompt: visualizationRequest
        });
      } else {
        // Call text-based visualization function
        const visualizationFunction = httpsCallable(functions, 'aiChatRequest');
        result = await visualizationFunction({
          model: params.options?.model || 'claude-3-7-sonnet',
          messages,
          temperature: params.temperature || 0.7,
          max_tokens: params.maxTokens || 2000,
          response_format: params.responseFormat || AIResponseFormat.MARKDOWN
        });
      }
      
      // Extract the response data
      const data = result.data as any;
      
      // Determine content and format based on visualization type
      let content, format;
      if (visualizationType === 'svg') {
        content = data.svg;
        format = AIResponseFormat.HTML;
      } else {
        content = data.content || data.message?.content;
        format = params.responseFormat || AIResponseFormat.MARKDOWN;
      }
      
      // If S2DO manager is available, store the visualization
      if (this.s2doManager && params.userId) {
        try {
          // Store the visualization as an S2DO object
          await this.s2doManager.createObject(
            'user',
            params.userId,
            S2DOObjectType.VISUALIZATION,
            {
              request: visualizationRequest,
              visualization: content,
              type: visualizationType
            },
            {
              title: extractVisualizationTitle(visualizationRequest),
              description: visualizationRequest.substring(0, 100) + (visualizationRequest.length > 100 ? '...' : ''),
              tags: ["visualization", visualizationType, ...extractTags(visualizationRequest)]
            }
          );
        } catch (error) {
          console.error('Error storing visualization:', error);
          // Continue even if storage fails
        }
      }
      
      return {
        id: `viz_${Date.now().toString(36)}`,
        requestId,
        modelType: params.modelType,
        requestType: params.requestType,
        content,
        format,
        usage: data.usage,
        metadata: {
          visualizationType,
          requestLength: visualizationRequest.length,
          responseLength: content.length
        },
        created: Date.now(),
      };
    } catch (error) {
      console.error('Error in visualization creation request:', error);
      throw error;
    }
  }
  
  /**
   * Process a multimodal analysis request
   */
  private async processMultimodalAnalysisRequest(requestId: string, params: AIRequestParams): Promise<AIResponse> {
    try {
      // For multimodal requests, we need to process both image and text
      const prompt = typeof params.content === 'string' 
        ? params.content 
        : Array.isArray(params.content) && typeof params.content[0] === 'string'
          ? params.content[0]
          : '';
      
      // The image URL should be in params.options.imageUrl
      const imageUrl = params.options?.imageUrl;
      
      if (!imageUrl) {
        throw new Error('Image URL is required for multimodal analysis');
      }
      
      // Call the multimodal analysis Cloud Function
      const multimodalFunction = httpsCallable(functions, 'multimodalAnalysis');
      const result = await multimodalFunction({
        model: params.options?.model || 'claude-3-opus',
        prompt,
        imageUrl,
        response_format: params.responseFormat || AIResponseFormat.MARKDOWN,
        analysis_type: params.options?.analysisType || 'general'
      });
      
      // Extract the response data
      const data = result.data as any;
      
      return {
        id: `multi_${Date.now().toString(36)}`,
        requestId,
        modelType: params.modelType,
        requestType: params.requestType,
        content: data.content || data.analysis,
        format: params.responseFormat || AIResponseFormat.MARKDOWN,
        usage: data.usage,
        metadata: {
          analysisType: params.options?.analysisType || 'general',
          imageUrl,
          promptLength: prompt.length
        },
        created: Date.now(),
      };
    } catch (error) {
      console.error('Error in multimodal analysis request:', error);
      throw error;
    }
  }
  
  /**
   * Get a cached response for a request
   */
  private async getFromCache(params: AIRequestParams): Promise<AIResponse | null> {
    try {
      // Generate a cache key from the request parameters
      const cacheKey = this.generateCacheKey(params);
      
      // Check the cache in Firestore
      const cacheDoc = await getDoc(doc(db, 'aiResponseCache', cacheKey));
      
      if (!cacheDoc.exists()) {
        return null;
      }
      
      const cachedData = cacheDoc.data();
      
      // Check if the cache has expired
      const cacheTime = cachedData.timestamp?.toMillis() || 0;
      const currentTime = Date.now();
      const expiryTime = cacheTime + (this.options.cacheLifetime * 1000);
      
      if (currentTime > expiryTime) {
        return null;
      }
      
      return cachedData.response as AIResponse;
    } catch (error) {
      console.error('Error getting from cache:', error);
      return null;
    }
  }
  
  /**
   * Save a response to cache
   */
  private async saveToCache(params: AIRequestParams, response: AIResponse): Promise<void> {
    try {
      // Generate a cache key from the request parameters
      const cacheKey = this.generateCacheKey(params);
      
      // Save to Firestore cache
      await setDoc(doc(db, 'aiResponseCache', cacheKey), {
        parameters: this.sanitizeForCache(params),
        response,
        timestamp: Timestamp.now()
      });
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }
  
  /**
   * Generate a cache key from request parameters
   */
  private generateCacheKey(params: AIRequestParams): string {
    // Create a deterministic representation of the request
    const cacheableParams = {
      modelType: params.modelType,
      requestType: params.requestType,
      content: params.content,
      responseFormat: params.responseFormat,
      maxTokens: params.maxTokens,
      temperature: params.temperature,
      topP: params.topP,
      frequencyPenalty: params.frequencyPenalty,
      presencePenalty: params.presencePenalty,
      stop: params.stop,
      systemPrompt: params.systemPrompt,
      options: this.sanitizeOptionsForCache(params.options)
    };
    
    // Create SHA-256 hash of the stringified parameters
    const paramsString = JSON.stringify(cacheableParams);
    const hash = CryptoJS.SHA256(paramsString).toString();
    
    return `cache_${hash}`;
  }
  
  /**
   * Sanitize request parameters for cache storage
   */
  private sanitizeForCache(params: AIRequestParams): any {
    // Remove non-cacheable fields and limit content size
    const sanitized = { ...params };
    
    // Remove user-specific data
    delete sanitized.userId;
    delete sanitized.conversationId;
    
    // Limit content size if necessary
    if (typeof sanitized.content === 'string' && sanitized.content.length > 1000) {
      sanitized.content = `${sanitized.content.substring(0, 1000)}...`;
    } else if (Array.isArray(sanitized.content)) {
      sanitized.content = sanitized.content.map((item: any) => {
        if (typeof item === 'string' && item.length > 1000) {
          return `${item.substring(0, 1000)}...`;
        }
        if (typeof item === 'object' && item.content && typeof item.content === 'string' && item.content.length > 1000) {
          return {
            ...item,
            content: `${item.content.substring(0, 1000)}...`
          };
        }
        return item;
      });
    }
    
    // Sanitize options
    sanitized.options = this.sanitizeOptionsForCache(sanitized.options);
    
    return sanitized;
  }
  
  /**
   * Sanitize options for cache storage
   */
  private sanitizeOptionsForCache(options?: Record<string, any>): Record<string, any> | undefined {
    if (!options) return undefined;
    
    // Copy options and remove sensitive information
    const sanitized = { ...options };
    
    // Remove potentially large or sensitive fields
    delete sanitized.imageData;
    
    return sanitized;
  }
  
  /**
   * Generate a request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  }
  
  /**
   * Log an AI request and response
   */
  private async logRequest(
    userId: string,
    requestId: string,
    params: AIRequestParams,
    response: AIResponse,
    isCached: boolean
  ): Promise<void> {
    try {
      // Get truncated content for logging
      const requestContent = this.truncateContent(params.content);
      const responseContent = this.truncateContent(response.content);
      
      // Build log entry
      const logEntry = {
        id: `log_${Date.now().toString(36)}`,
        userId,
        requestId,
        timestamp: Timestamp.now(),
        modelType: params.modelType,
        requestType: params.requestType,
        requestSummary: {
          content: requestContent,
          options: params.options
        },
        responseSummary: {
          content: responseContent,
          format: response.format,
          usage: response.usage
        },
        processingTime: response.processingTime,
        cached: isCached,
        conversationId: params.conversationId
      };
      
      // Add to activity logs
      await ActivityLoggerService.logActivity(
        'user',
        userId,
        `AI_${params.requestType.toUpperCase()}`,
        'ai',
        requestId,
        'success',
        {
          modelType: params.modelType,
          processingTime: response.processingTime,
          cached: isCached,
          tokens: response.usage?.totalTokens
        }
      );
      
      // Store detailed log in Firestore
      await setDoc(doc(db, 'aiRequestLogs', `log_${requestId}`), logEntry);
    } catch (error) {
      console.error('Error logging AI request:', error);
    }
  }
  
  /**
   * Log an AI request error
   */
  private async logRequestError(
    userId: string,
    requestId: string,
    params: AIRequestParams,
    error: any
  ): Promise<void> {
    try {
      // Get truncated content for logging
      const requestContent = this.truncateContent(params.content);
      
      // Build error log entry
      const errorLogEntry = {
        id: `error_${Date.now().toString(36)}`,
        userId,
        requestId,
        timestamp: Timestamp.now(),
        modelType: params.modelType,
        requestType: params.requestType,
        requestSummary: {
          content: requestContent,
          options: params.options
        },
        error: {
          message: error.message || 'Unknown error',
          code: error.code || 'unknown',
          stack: error.stack || null
        },
        conversationId: params.conversationId
      };
      
      // Add to activity logs
      await ActivityLoggerService.logActivity(
        'user',
        userId,
        `AI_${params.requestType.toUpperCase()}_ERROR`,
        'ai',
        requestId,
        'failure',
        {
          modelType: params.modelType,
          error: error.message || 'Unknown error'
        }
      );
      
      // Store detailed error log in Firestore
      await setDoc(doc(db, 'aiRequestErrorLogs', `error_${requestId}`), errorLogEntry);
    } catch (logError) {
      console.error('Error logging AI request error:', logError);
    }
  }
  
  /**
   * Record metrics for AI requests
   */
  private async recordMetrics(
    userId: string,
    modelType: AIModelType,
    requestType: AIRequestType,
    processingTime: number,
    tokens: number
  ): Promise<void> {
    try {
      // Record processing time metric
      await PerformanceMetricsService.recordMetric(
        'ai_processing_time',
        'ai',
        `${modelType}_${requestType}`,
        processingTime,
        'milliseconds',
        { userId }
      );
      
      // Record token usage metric if available
      if (tokens > 0) {
        await PerformanceMetricsService.recordMetric(
          'ai_token_usage',
          'ai',
          `${modelType}_${requestType}`,
          tokens,
          'tokens',
          { userId }
        );
      }
    } catch (error) {
      console.error('Error recording AI metrics:', error);
    }
  }
  
  /**
   * Truncate content for logging
   */
  private truncateContent(content: any): any {
    if (typeof content === 'string') {
      return content.length > 500 ? `${content.substring(0, 500)}...` : content;
    } else if (Array.isArray(content)) {
      return content.map((item: any) => {
        if (typeof item === 'string') {
          return item.length > 500 ? `${item.substring(0, 500)}...` : item;
        } else if (typeof item === 'object' && item.content && typeof item.content === 'string') {
          return {
            ...item,
            content: item.content.length > 500 ? `${item.content.substring(0, 500)}...` : item.content
          };
        }
        return item;
      });
    }
    return content;
  }
}

// Utility functions for content extraction

/**
 * Extract key elements from memory enhancement
 */
function extractKeyElements(text: string): string[] {
  try {
    // Look for the "Key Elements" section
    const keyElementsMatch = text.match(/Key Elements[:\s-]+([\s\S]+?)(?=\n\s*\n|$)/i);
    
    if (keyElementsMatch && keyElementsMatch[1]) {
      // Extract elements from bullet points or lines
      const elementsText = keyElementsMatch[1].trim();
      const elements = elementsText
        .split(/\n\s*[-•*]\s*/) // Split by bullet points
        .filter(Boolean) // Remove empty strings
        .map(elem => elem.trim());
      
      // Remove the first element if it doesn't look like a real element (header, etc.)
      if (elements.length > 0 && !elements[0].includes(':') && elements[0].length < 50) {
        elements.shift();
      }
      
      return elements;
    }
  } catch (error) {
    console.error('Error extracting key elements:', error);
  }
  
  return [];
}

/**
 * Extract emotional significance from memory enhancement
 */
function extractEmotionalSignificance(text: string): string {
  try {
    // Look for the "Emotional Significance" section
    const emotionMatch = text.match(/Emotional Significance[:\s-]+([\s\S]+?)(?=\n\s*\n|$)/i);
    
    if (emotionMatch && emotionMatch[1]) {
      return emotionMatch[1].trim();
    }
  } catch (error) {
    console.error('Error extracting emotional significance:', error);
  }
  
  return '';
}

/**
 * Extract symbols from dream interpretation
 */
function extractSymbols(text: string): string[] {
  try {
    // Look for the "Key Symbols" section
    const symbolsMatch = text.match(/Key Symbols[:\s-]+([\s\S]+?)(?=\n\s*\n|$)/i);
    
    if (symbolsMatch && symbolsMatch[1]) {
      // Extract symbols from bullet points or lines
      const symbolsText = symbolsMatch[1].trim();
      const symbols = symbolsText
        .split(/\n\s*[-•*]\s*/) // Split by bullet points
        .filter(Boolean) // Remove empty strings
        .map(symbol => symbol.trim());
      
      // Remove the first element if it doesn't look like a real symbol (header, etc.)
      if (symbols.length > 0 && !symbols[0].includes(':') && symbols[0].length < 50) {
        symbols.shift();
      }
      
      return symbols;
    }
  } catch (error) {
    console.error('Error extracting symbols:', error);
  }
  
  return [];
}

/**
 * Extract emotions from dream interpretation
 */
function extractEmotions(text: string): string[] {
  try {
    // Look for the "Emotional Landscape" section
    const emotionsMatch = text.match(/Emotional Landscape[:\s-]+([\s\S]+?)(?=\n\s*\n|$)/i);
    
    if (emotionsMatch && emotionsMatch[1]) {
      // Extract emotions from bullet points or lines
      const emotionsText = emotionsMatch[1].trim();
      const emotions = emotionsText
        .split(/\n\s*[-•*]\s*/) // Split by bullet points
        .filter(Boolean) // Remove empty strings
        .map(emotion => emotion.trim());
      
      // Remove the first element if it doesn't look like a real emotion (header, etc.)
      if (emotions.length > 0 && !emotions[0].includes(':') && emotions[0].length < 50) {
        emotions.shift();
      }
      
      return emotions;
    }
  } catch (error) {
    console.error('Error extracting emotions:', error);
  }
  
  return [];
}

/**
 * Extract keywords from profile analysis
 */
function extractKeywords(text: string): string[] {
  try {
    // Look for the "Keyword Analysis" section
    const keywordsMatch = text.match(/Keyword Analysis[:\s-]+([\s\S]+?)(?=\n\s*\n|$)/i);
    
    if (keywordsMatch && keywordsMatch[1]) {
      // Extract keywords from bullet points or lines
      const keywordsText = keywordsMatch[1].trim();
      const keywords = keywordsText
        .split(/\n\s*[-•*]\s*/) // Split by bullet points
        .filter(Boolean) // Remove empty strings
        .map(keyword => keyword.trim());
      
      // Remove the first element if it doesn't look like a real keyword (header, etc.)
      if (keywords.length > 0 && !keywords[0].includes(':') && keywords[0].length < 50) {
        keywords.shift();
      }
      
      return keywords;
    }
  } catch (error) {
    console.error('Error extracting keywords:', error);
  }
  
  return [];
}

/**
 * Extract recommendations from profile analysis
 */
function extractRecommendations(text: string): string[] {
  try {
    // Look for the "Improvement Recommendations" section
    const recommendationsMatch = text.match(/Improvement Recommendations[:\s-]+([\s\S]+?)(?=\n\s*\n|$)/i);
    
    if (recommendationsMatch && recommendationsMatch[1]) {
      // Extract recommendations from bullet points or lines
      const recommendationsText = recommendationsMatch[1].trim();
      const recommendations = recommendationsText
        .split(/\n\s*[-•*]\s*/) // Split by bullet points
        .filter(Boolean) // Remove empty strings
        .map(recommendation => recommendation.trim());
      
      // Remove the first element if it doesn't look like a real recommendation (header, etc.)
      if (recommendations.length > 0 && !recommendations[0].includes(':') && recommendations[0].length < 50) {
        recommendations.shift();
      }
      
      return recommendations;
    }
  } catch (error) {
    console.error('Error extracting recommendations:', error);
  }
  
  return [];
}

/**
 * Extract tags from AI-generated content
 */
function extractTags(text: string): string[] {
  try {
    // Extract hashtags or keywords from the text
    const hashtags = text.match(/#(\w+)/g) || [];
    const formattedHashtags = hashtags.map(tag => tag.substring(1).toLowerCase());
    
    // Look for keywords in the content
    const keyPhrases = [
      'key', 'important', 'significant', 'essential', 'primary',
      'crucial', 'central', 'core', 'fundamental', 'main'
    ];
    
    const keywordMatches = keyPhrases.flatMap(phrase => {
      const regex = new RegExp(`${phrase}\\s+(\\w+)`, 'gi');
      const matches = [];
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push(match[1].toLowerCase());
      }
      return matches;
    });
    
    // Combine and deduplicate
    const allTags = [...new Set([...formattedHashtags, ...keywordMatches])];
    
    // Limit to 5 tags
    return allTags.slice(0, 5);
  } catch (error) {
    console.error('Error extracting tags:', error);
    return [];
  }
}

/**
 * Extract a title from dream content
 */
function extractDreamTitle(text: string): string {
  try {
    // Try to find a title in the first line
    const firstLine = text.split('\n')[0].trim();
    
    // If the first line is short enough, use it as the title
    if (firstLine.length <= 50 && !firstLine.endsWith('.')) {
      return firstLine;
    }
    
    // Otherwise, generate a title based on the content
    const lowerText = text.toLowerCase();
    
    // Look for key dream elements
    const dreamElements = [
      'flying', 'falling', 'chased', 'running', 'swimming',
      'water', 'ocean', 'mountain', 'forest', 'house',
      'school', 'work', 'family', 'friend', 'stranger',
      'talking', 'searching', 'lost', 'finding'
    ];
    
    for (const element of dreamElements) {
      if (lowerText.includes(element)) {
        const index = lowerText.indexOf(element);
        
        // Get a bit of context around the element
        const start = Math.max(0, index - 10);
        const end = Math.min(lowerText.length, index + element.length + 15);
        const context = lowerText.substring(start, end);
        
        // Clean up the context
        const cleanContext = context
          .replace(/^[^a-z]+/i, '') // Remove leading non-alpha characters
          .replace(/[^a-z]+$/i, ''); // Remove trailing non-alpha characters
        
        const words = cleanContext.split(/\s+/);
        const titleWords = words.length > 5 ? words.slice(0, 5) : words;
        
        return `Dream about ${titleWords.join(' ')}...`;
      }
    }
    
    // Fallback to default title
    return 'Dream Record';
  } catch (error) {
    console.error('Error extracting dream title:', error);
    return 'Dream Record';
  }
}

/**
 * Extract a title from memory content
 */
function extractMemoryTitle(text: string): string {
  try {
    // Try to find a title in the first line
    const firstLine = text.split('\n')[0].trim();
    
    // If the first line is short enough, use it as the title
    if (firstLine.length <= 50 && !firstLine.endsWith('.')) {
      return firstLine;
    }
    
    // Otherwise, generate a title based on the content
    
    // Look for time indicators
    const timeRegex = /(?:in|during|on|at)\s+(\w+\s+\d{4}|\w+\s+\d{1,2}(?:st|nd|rd|th)?|\d{4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?|\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December))/i;
    const timeMatch = text.match(timeRegex);
    
    // Look for location indicators
    const locationRegex = /(?:at|in)\s+(\w+(?:\s+\w+){0,3})\b/i;
    const locationMatch = text.match(locationRegex);
    
    // Look for people
    const peopleRegex = /(?:with|and)\s+(\w+(?:\s+\w+){0,2})\b/i;
    const peopleMatch = text.match(peopleRegex);
    
    // Construct title
    let title = 'Memory';
    
    if (timeMatch && timeMatch[1]) {
      title += ` from ${timeMatch[1]}`;
    }
    
    if (locationMatch && locationMatch[1]) {
      title += ` at ${locationMatch[1]}`;
    }
    
    if (peopleMatch && peopleMatch[1]) {
      title += ` with ${peopleMatch[1]}`;
    }
    
    // If title is still just "Memory", try to extract subject
    if (title === 'Memory') {
      const words = text.split(/\s+/).slice(0, 8).join(' ');
      title = `Memory: ${words}...`;
    }
    
    return title;
  } catch (error) {
    console.error('Error extracting memory title:', error);
    return 'Memory Record';
  }
}

/**
 * Extract a title from visualization request
 */
function extractVisualizationTitle(text: string): string {
  try {
    // Try to find a title in the first line
    const firstLine = text.split('\n')[0].trim();
    
    // If the first line is short enough, use it as the title
    if (firstLine.length <= 50 && !firstLine.endsWith('.')) {
      return firstLine;
    }
    
    // Otherwise, extract key concepts
    const keywords = [
      'create', 'visualize', 'design', 'generate', 'make',
      'image', 'picture', 'visualization', 'scene', 'drawing'
    ];
    
    for (const keyword of keywords) {
      const regex = new RegExp(`${keyword}\\s+(?:a|an)?\\s+(.{10,50}?)(?:\\.|,|;|:|$)`, 'i');
      const match = text.match(regex);
      
      if (match && match[1]) {
        return `Visualization of ${match[1].trim()}`;
      }
    }
    
    // Fallback to default title with first few words
    const words = text.split(/\s+/).slice(0, 6).join(' ');
    return `Visualization: ${words}...`;
  } catch (error) {
    console.error('Error extracting visualization title:', error);
    return 'Visualization';
  }
}

// Module exports
export default {
  AIConnector,
  AIModelType,
  AIRequestType,
  AIResponseFormat
};
