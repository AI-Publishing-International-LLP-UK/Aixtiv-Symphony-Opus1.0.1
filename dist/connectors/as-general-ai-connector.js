/**
 * AIXTIV SYMPHONY™ AI Connector
 * © 2025 AI Publishing International LLP
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This is proprietary software of AI Publishing International LLP.
 * All rights reserved. No part of this software may be reproduced,
 * modified, or distributed without prior written permission.
 */

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { PineconeClient, QueryResponse } from '@pinecone-database/pinecone';
import { ActivityLoggerService, PerformanceMetricsService } from '../core';
import { S2DOManager, S2DOObjectType } from '../core/s2do';
import {
  S2DOBlockchainSecurityManager,
  BlockchainIntegrationManager,
} from '../core/blockchain-integration';

// Initialize Firebase services
const db = getFirestore();
const functions = getFunctions();

// Initialize Pinecone (will be configured at runtime)
let pineconeClient= null;

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
  MULTIMODAL = 'multimodal',
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
  DOCUMENT_ANALYSIS = 'document-analysis',
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
  METADATA = 'metadata',
}

// AI Connector Interface


// AI Request Parameter Interface
export >;
  context?;
  responseFormat?;
  maxTokens?;
  temperature?;
  topP?;
  frequencyPenalty?;
  presencePenalty?;
  stop?;
  userId?;
  conversationId?;
  systemPrompt?;
  options?;
  useCache?;
}

// AI Response Interface
export ;
  metadata?;
  processingTime?;
  created;
  cached?;
}

/**
 * AIXTIV SYMPHONY AI Connector
 * Handles interactions with AI models and embedding systems
 */
export class AIConnector {
  options;
  s2doManager;
  blockchainManager;
  securityManager;
  pinecone= null;

  constructor(options= {}) {
    // Set default options
    this.options = {
      pineconeApiKey:
        options.pineconeApiKey || process.env.PINECONE_API_KEY || '',
      pineconeEnvironment:
        options.pineconeEnvironment || process.env.PINECONE_ENVIRONMENT || '',
      defaultModel: options.defaultModel || 'claude-3-7-sonnet',
      useCache: options.useCache !== undefined ? options.useCache ,
      cacheLifetime, // 1 hour default
      enableLogging:
        options.enableLogging !== undefined ? options.enableLogging ,
      enableMetrics:
        options.enableMetrics !== undefined ? options.enableMetrics ,
      s2doManager,
      blockchainManager,
    };

    // Set up S2DO and blockchain integration if provided
    this.s2doManager = this.options.s2doManager;
    this.blockchainManager = this.options.blockchainManager;

    if (this.blockchainManager && !this.s2doManager) {
      this.securityManager = new S2DOBlockchainSecurityManager(
        this.blockchainManager
      );
      this.s2doManager = new S2DOManager(
        this.blockchainManager,
        this.securityManager
      );
    } else {
      this.securityManager = null;
    }

    // Initialize Pinecone if API key is provided
    this.initializePinecone();
  }

  /**
   * Initialize Pinecone client
   */
  async initializePinecone(){
    if (!this.options.pineconeApiKey || !this.options.pineconeEnvironment) {
      console.warn(
        'Pinecone API key or environment not provided. Vector operations will not be available.'
      );
      return;
    }

    try {
      this.pinecone = new PineconeClient();
      await this.pinecone.init({
        apiKey,
        environment,
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
  async processRequest(params){
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
            cached,
          };
        }
      }

      // Process request based on request type
      let response;

      switch (params.requestType) {
        case AIRequestType.COMPLETION= await this.processCompletionRequest(requestId, params);
          break;
        case AIRequestType.CHAT= await this.processChatRequest(requestId, params);
          break;
        case AIRequestType.EMBEDDING= await this.processEmbeddingRequest(requestId, params);
          break;
        case AIRequestType.IMAGE_GENERATION= await this.processImageGenerationRequest(
            requestId,
            params
          );
          break;
        case AIRequestType.DREAM_INTERPRETATION= await this.processDreamInterpretationRequest(
            requestId,
            params
          );
          break;
        case AIRequestType.MEMORY_ENHANCEMENT= await this.processMemoryEnhancementRequest(
            requestId,
            params
          );
          break;
        case AIRequestType.PROFILE_ANALYSIS= await this.processProfileAnalysisRequest(
            requestId,
            params
          );
          break;
        case AIRequestType.VISUALIZATION_CREATION= await this.processVisualizationCreationRequest(
            requestId,
            params
          );
          break;
        case AIRequestType.MULTIMODAL_ANALYSIS= await this.processMultimodalAnalysisRequest(
            requestId,
            params
          );
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
  async processCompletionRequest(
    requestId,
    params){
    try {
      // Call the text completion Cloud Function
      const completionFunction = httpsCallable(
        functions,
        'aiCompletionRequest'
      );
      const result = await completionFunction({
        model: params.options?.model || this.options.defaultModel,
        prompt,
        max_tokens,
        temperature,
        top_p,
        frequency_penalty,
        presence_penalty,
        stop,
        response_format,
      });

      // Extract the response data
      const data = result.data;

      return {
        id: data.id || `gen_${Date.now().toString(36)}`,
        requestId,
        modelType,
        requestType,
        content,
        format,
        usage,
        metadata: data.metadata || {},
        created,
      };
    } catch (error) {
      console.error('Error in completion request:', error);
      throw error;
    }
  }

  /**
   * Process a chat request
   */
  async processChatRequest(
    requestId,
    params){
    try {
      // Prepare messages format
      let messages: Array;

      if (
        Array.isArray(params.content) &&
        typeof params.content[0] === 'object' &&
        'role' in params.content[0]
      ) {
        // Content is already in the correct messages format
        messages = params.content;
      } else if (
        Array.isArray(params.content) &&
        typeof params.content[0] === 'string'
      ) {
        // Content is an array of strings (alternate user/assistant)
        messages = (params.content i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content,
        }));
      } else {
        // Content is a single string (user message)
        messages = [
          {
            role: 'user',
            content,
          },
        ];
      }

      // Add system prompt if provided
      if (params.systemPrompt) {
        messages.unshift({
          role: 'system',
          content,
        });
      }

      // Call the chat completion Cloud Function
      const chatFunction = httpsCallable(functions, 'aiChatRequest');
      const result = await chatFunction({
        model: params.options?.model || this.options.defaultModel,
        messages,
        max_tokens,
        temperature,
        top_p,
        frequency_penalty,
        presence_penalty,
        stop,
        response_format,
        conversation_id,
      });

      // Extract the response data
      const data = result.data;

      return {
        id: data.id || `chat_${Date.now().toString(36)}`,
        requestId,
        modelType,
        requestType,
        content: data.content || data.message?.content,
        format,
        usage,
        metadata: {
          ...(data.metadata || {}),
          conversationId,
        },
        created,
      };
    } catch (error) {
      console.error('Error in chat request:', error);
      throw error;
    }
  }

  /**
   * Process an embedding request
   */
  async processEmbeddingRequest(
    requestId,
    params){
    try {
      // Validate Pinecone is initialized
      if (!this.pinecone) {
        throw new Error(
          'Pinecone is not initialized. Cannot process embedding request.'
        );
      }

      // Call the embedding Cloud Function
      const embeddingFunction = httpsCallable(functions, 'generateEmbedding');
      const result = await embeddingFunction({
        model: params.options?.embeddingModel || 'text-embedding-small',
        input,
        dimensions: params.options?.dimensions || 1536,
      });

      // Extract the response data
      const data = result.data;

      return {
        id: `emb_${Date.now().toString(36)}`,
        requestId,
        modelType,
        requestType,
        content,
        format,
        usage,
        metadata: {
          dimensions,
          indexName: params.options?.indexName,
          namespace: params.options?.namespace,
        },
        created,
      };
    } catch (error) {
      console.error('Error in embedding request:', error);
      throw error;
    }
  }

  /**
   * Process an image generation request
   */
  async processImageGenerationRequest(
    requestId,
    params){
    try {
      // Call the image generation Cloud Function
      const imageGenFunction = httpsCallable(functions, 'generateImage');
      const result = await imageGenFunction({
        model: params.options?.imageModel || 'claude-3-opus',
        prompt,
        size: params.options?.size || '1024x1024',
        style: params.options?.style || 'natural',
        quality: params.options?.quality || 'standard',
        response_format: 'url',
      });

      // Extract the response data
      const data = result.data;

      return {
        id: `img_${Date.now().toString(36)}`,
        requestId,
        modelType,
        requestType,
        content,
        format,
        metadata: {
          prompt,
          size: params.options?.size || '1024x1024',
          style: params.options?.style || 'natural',
        },
        created,
      };
    } catch (error) {
      console.error('Error in image generation request:', error);
      throw error;
    }
  }

  /**
   * Process a dream interpretation request
   */
  async processDreamInterpretationRequest(
    requestId,
    params){
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

      const dreamContent =
        typeof params.content === 'string'
          ? params.content
          )
            ? params.content.join('\n')
            : '';

      // If provided with context from previous dreams, incorporate it
      let messages = [];

      if (params.context && params.context.previousDreams) {
        messages.push({
          role: 'system',
          content: `${systemPrompt}\n\nAdditional context: The user has shared these dreams previously: ${JSON.stringify(params.context.previousDreams)}`,
        });
      } else {
        messages.push({
          role: 'system',
          content,
        });
      }

      messages.push({
        role: 'user',
        content: `Please interpret this dream:\n\n${dreamContent}`,
      });

      // Call the chat completion Cloud Function
      const dreamFunction = httpsCallable(functions, 'aiChatRequest');
      const result = await dreamFunction({
        model: params.options?.model || 'claude-3-7-sonnet',
        messages,
        temperature,
        max_tokens,
        response_format,
      });

      // Extract the response data
      const data = result.data;

      // If S2DO manager is available, store the dream and interpretation
      if (this.s2doManager && params.userId) {
        try {
          // Store the dream S2DO object
          await this.s2doManager.createObject(
            'user',
            params.userId,
            S2DOObjectType.DREAM,
            {
              dreamContent,
              interpretation: data.content || data.message?.content,
              symbols: extractSymbols(data.content || data.message?.content),
              emotions: extractEmotions(data.content || data.message?.content),
            },
            {
              title,
              description) +
                (dreamContent.length > 100 ? '...' : ''),
              tags: extractTags(data.content || data.message?.content),
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
        modelType,
        requestType,
        content: data.content || data.message?.content,
        format,
        usage,
        metadata: {
          dreamLength,
          interpretationLength: (data.content || data.message?.content).length,
          symbols: extractSymbols(data.content || data.message?.content),
        },
        created,
      };
    } catch (error) {
      console.error('Error in dream interpretation request:', error);
      throw error;
    }
  }

  /**
   * Process a memory enhancement request
   */
  async processMemoryEnhancementRequest(
    requestId,
    params){
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

      const memoryContent =
        typeof params.content === 'string'
          ? params.content
          )
            ? params.content.join('\n')
            : '';

      // Get related memories from vector search if available
      let relatedMemories = [];
      if (this.pinecone && params.userId) {
        try {
          // Generate embedding for the memory
          const embeddingFunction = httpsCallable(
            functions,
            'generateEmbedding'
          );
          const embeddingResult = await embeddingFunction({
            input,
            dimensions,
          });

          const embedding = (embeddingResult.data;

          // Search for related memories in Pinecone
          const index = this.pinecone.Index('aixtiv-symphony');
          const queryResponse = await index.query({
            queryVector,
            namespace: `user_${params.userId}_memories`,
            topK,
            includeMetadata,
          });

          if (queryResponse.matches && queryResponse.matches.length > 0) {
            relatedMemories = queryResponse.matches.map(match => ({
              id,
              content: match.metadata?.content || 'Unknown memory',
              similarity,
            }));
          }
        } catch (error) {
          console.error('Error finding related memories:', error);
          // Continue even if vector search fails
        }
      }

      // Build messages with related memories
      let messages = [];

      if (relatedMemories.length > 0) {
        messages.push({
          role: 'system',
          content: `${systemPrompt}\n\nAdditional context: These related memories may be relevant: ${JSON.stringify(relatedMemories)}`,
        });
      } else {
        messages.push({
          role: 'system',
          content,
        });
      }

      messages.push({
        role: 'user',
        content: `Please enhance this memory:\n\n${memoryContent}`,
      });

      // Call the chat completion Cloud Function
      const memoriaFunction = httpsCallable(functions, 'aiChatRequest');
      const result = await memoriaFunction({
        model: params.options?.model || 'claude-3-7-sonnet',
        messages,
        temperature,
        max_tokens,
        response_format,
      });

      // Extract the response data
      const data = result.data;

      // If S2DO manager is available, store the memory and enhancement
      if (this.s2doManager && params.userId) {
        try {
          // Store the memory S2DO object
          await this.s2doManager.createObject(
            'user',
            params.userId,
            S2DOObjectType.MEMORY,
            {
              originalMemory,
              enhancedMemory: data.content || data.message?.content,
              keyElements: extractKeyElements(
                data.content || data.message?.content
              ),
              emotionalSignificance: extractEmotionalSignificance(
                data.content || data.message?.content
              ),
              relatedMemories,
            },
            {
              title,
              description) +
                (memoryContent.length > 100 ? '...' : ''),
              tags: extractTags(data.content || data.message?.content),
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
                    values,
                    metadata: {
                      content,
                      title,
                      userId,
                      timestamp,
                    },
                  },
                ],
              },
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
        modelType,
        requestType,
        content: data.content || data.message?.content,
        format,
        usage,
        metadata: {
          originalLength,
          enhancedLength: (data.content || data.message?.content).length,
          relatedMemories,
        },
        created,
      };
    } catch (error) {
      console.error('Error in memory enhancement request:', error);
      throw error;
    }
  }

  /**
   * Process a profile analysis request
   */
  async processProfileAnalysisRequest(
    requestId,
    params){
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

      const profileContent =
        typeof params.content === 'string'
          ? params.content
          )
            ? params.content.join('\n')
            : '';

      let messages = [
        {
          role: 'system',
          content,
        },
        {
          role: 'user',
          content: `Please analyze this professional profile:\n\n${profileContent}`,
        },
      ];

      // Call the chat completion Cloud Function
      const profileFunction = httpsCallable(functions, 'aiChatRequest');
      const result = await profileFunction({
        model: params.options?.model || 'claude-3-7-sonnet',
        messages,
        temperature,
        max_tokens,
        response_format,
      });

      // Extract the response data
      const data = result.data;

      // If S2DO manager is available, store the profile analysis
      if (this.s2doManager && params.userId) {
        try {
          // Store the profile analysis S2DO object
          await this.s2doManager.createObject(
            'user',
            params.userId,
            S2DOObjectType.PROFILE,
            {
              profileContent,
              analysis: data.content || data.message?.content,
              keywords: extractKeywords(data.content || data.message?.content),
              recommendations: extractRecommendations(
                data.content || data.message?.content
              ),
            },
            {
              title: 'Profile Analysis',
              description:
                'Analysis of professional profile with recommendations',
              tags: [
                'profile',
                'career',
                'networking',
                'analysis',
                'recommendations',
              ],
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
        modelType,
        requestType,
        content: data.content || data.message?.content,
        format,
        usage,
        metadata: {
          profileLength,
          analysisLength: (data.content || data.message?.content).length,
          keywords: extractKeywords(data.content || data.message?.content),
        },
        created,
      };
    } catch (error) {
      console.error('Error in profile analysis request:', error);
      throw error;
    }
  }

  /**
   * Process a visualization creation request
   */
  async processVisualizationCreationRequest(
    requestId,
    params){
    try {
      // Prepare visualization creation prompts
      const visualizationType =
        params.options?.visualizationType || 'descriptive';

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

      const visualizationRequest =
        typeof params.content === 'string'
          ? params.content
          )
            ? params.content.join('\n')
            : '';

      let messages = [
        {
          role: 'system',
          content,
        },
        {
          role: 'user',
          content,
        },
      ];

      // Call the appropriate function based on visualization type
      let result;

      if (visualizationType === 'svg') {
        // Call SVG generation function
        const svgFunction = httpsCallable(functions, 'generateSVG');
        result = await svgFunction({
          prompt,
        });
      } else {
        // Call text-based visualization function
        const visualizationFunction = httpsCallable(functions, 'aiChatRequest');
        result = await visualizationFunction({
          model: params.options?.model || 'claude-3-7-sonnet',
          messages,
          temperature,
          max_tokens,
          response_format,
        });
      }

      // Extract the response data
      const data = result.data;

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
          // Store the visualization S2DO object
          await this.s2doManager.createObject(
            'user',
            params.userId,
            S2DOObjectType.VISUALIZATION,
            {
              request,
              visualization,
              type,
            },
            {
              title,
              description) +
                (visualizationRequest.length > 100 ? '...' : ''),
              tags: [
                'visualization',
                visualizationType,
                ...extractTags(visualizationRequest),
              ],
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
        modelType,
        requestType,
        usage,
        metadata: {
          visualizationType,
          requestLength,
          responseLength,
        },
        created,
      };
    } catch (error) {
      console.error('Error in visualization creation request:', error);
      throw error;
    }
  }

  /**
   * Process a multimodal analysis request
   */
  async processMultimodalAnalysisRequest(
    requestId,
    params){
    try {
      // For multimodal requests, we need to process both image and text
      const prompt =
        typeof params.content === 'string'
          ? params.content
          === 'string'
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
        response_format,
        analysis_type: params.options?.analysisType || 'general',
      });

      // Extract the response data
      const data = result.data;

      return {
        id: `multi_${Date.now().toString(36)}`,
        requestId,
        modelType,
        requestType,
        content,
        format,
        usage,
        metadata: {
          analysisType: params.options?.analysisType || 'general',
          imageUrl,
          promptLength,
        },
        created,
      };
    } catch (error) {
      console.error('Error in multimodal analysis request:', error);
      throw error;
    }
  }

  /**
   * Get a cached response for a request
   */
  async getFromCache(
    params){
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
      const expiryTime = cacheTime + this.options.cacheLifetime * 1000;

      if (currentTime > expiryTime) {
        return null;
      }

      return cachedData.response;
    } catch (error) {
      console.error('Error getting from cache:', error);
      return null;
    }
  }

  /**
   * Save a response to cache
   */
  async saveToCache(
    params,
    response){
    try {
      // Generate a cache key from the request parameters
      const cacheKey = this.generateCacheKey(params);

      // Save to Firestore cache
      await setDoc(doc(db, 'aiResponseCache', cacheKey), {
        parameters,
        timestamp,
      });
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  /**
   * Generate a cache key from request parameters
   */
  generateCacheKey(params){
    // Create a deterministic representation of the request
    const cacheableParams = {
      modelType,
      requestType,
      content,
      responseFormat,
      maxTokens,
      temperature,
      topP,
      frequencyPenalty,
      presencePenalty,
      stop,
      systemPrompt,
      options,
    };

    // Create SHA-256 hash of the stringified parameters
    const paramsString = JSON.stringify(cacheableParams);
    const hash = CryptoJS.SHA256(paramsString).toString();

    return `cache_${hash}`;
  }

  /**
   * Sanitize request parameters for cache storage
   */
  sanitizeForCache(params){
    // Remove non-cacheable fields and limit content size
    const sanitized = { ...params };

    // Remove user-specific data
    delete sanitized.userId;
    delete sanitized.conversationId;

    // Limit content size if necessary
    if (
      typeof sanitized.content === 'string' &&
      sanitized.content.length > 1000
    ) {
      sanitized.content = `${sanitized.content.substring(0, 1000)}...`;
    } else if (Array.isArray(sanitized.content)) {
      sanitized.content = sanitized.content.map((item=> {
        if (typeof item === 'string' && item.length > 1000) {
          return `${item.substring(0, 1000)}...`;
        }
        if (
          typeof item === 'object' &&
          item.content &&
          typeof item.content === 'string' &&
          item.content.length > 1000
        ) {
          return {
            ...item,
            content: `${item.content.substring(0, 1000)}...`,
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
  sanitizeOptionsForCache(
    options?), any> | undefined {
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
  generateRequestId(){
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  }

  /**
   * Log an AI request and response
   */
  async logRequest(
    userId,
    requestId,
    params,
    response,
    isCached){
    try {
      // Get truncated content for logging
      const requestContent = this.truncateContent(params.content);
      const responseContent = this.truncateContent(response.content);

      // Build log entry
      const logEntry = {
        id: `log_${Date.now().toString(36)}`,
        userId,
        requestId,
        timestamp,
        modelType,
        requestType,
        requestSummary: {
          content,
          options,
        },
        responseSummary: {
          content,
          format,
          usage,
        },
        processingTime,
        cached,
        conversationId,
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
          modelType,
          processingTime,
          cached,
          tokens: response.usage?.totalTokens,
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
  async logRequestError(
    userId,
    requestId,
    params,
    error){
    try {
      // Get truncated content for logging
      const requestContent = this.truncateContent(params.content);

      // Build error log entry
      const errorLogEntry = {
        id: `error_${Date.now().toString(36)}`,
        userId,
        requestId,
        timestamp,
        modelType,
        requestType,
        requestSummary: {
          content,
          options,
        },
        error: {
          message: error.message || 'Unknown error',
          code: error.code || 'unknown',
          stack,
        },
        conversationId,
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
          modelType,
          error: error.message || 'Unknown error',
        }
      );

      // Store detailed error log in Firestore
      await setDoc(
        doc(db, 'aiRequestErrorLogs', `error_${requestId}`),
        errorLogEntry
      );
    } catch (logError) {
      console.error('Error logging AI request error:', logError);
    }
  }

  /**
   * Record metrics for AI requests
   */
  async recordMetrics(
    userId,
    modelType,
    requestType,
    processingTime,
    tokens){
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
  truncateContent(content){
    if (typeof content === 'string') {
      return content.length > 500 ? `${content.substring(0, 500)}...` ;
    } else if (Array.isArray(content)) {
      return content.map((item=> {
        if (typeof item === 'string') {
          return item.length > 500 ? `${item.substring(0, 500)}...` ;
        } else if (
          typeof item === 'object' &&
          item.content &&
          typeof item.content === 'string'
        ) {
          return {
            ...item,
            content:
              item.content.length > 500
                ? `${item.content.substring(0, 500)}...`
                ,
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
function extractKeyElements(text){
  try {
    // Look for the "Key Elements" section
    const keyElementsMatch = text.match(
      /Key Elements[:\s-]+([\s\S]+?)(?=\n\s*\n|$)/i
    );

    if (keyElementsMatch && keyElementsMatch[1]) {
      // Extract elements from bullet points or lines
      const elementsText = keyElementsMatch[1].trim();
      const elements = elementsText
        .split(/\n\s*[-•*]\s*/) // Split by bullet points
        .filter(Boolean) // Remove empty strings
        .map(elem => elem.trim());

      // Remove the first element if it doesn't look like a real element (header, etc.)
      if (
        elements.length > 0 &&
        !elements[0].includes(':') &&
        elements[0].length  symbol.trim());

      // Remove the first element if it doesn't look like a real symbol (header, etc.)
      if (
        symbols.length > 0 &&
        !symbols[0].includes(':') &&
        symbols[0].length  emotion.trim());

      // Remove the first element if it doesn't look like a real emotion (header, etc.)
      if (
        emotions.length > 0 &&
        !emotions[0].includes(':') &&
        emotions[0].length  keyword.trim());

      // Remove the first element if it doesn't look like a real keyword (header, etc.)
      if (
        keywords.length > 0 &&
        !keywords[0].includes(':') &&
        keywords[0].length  recommendation.trim());

      // Remove the first element if it doesn't look like a real recommendation (header, etc.)
      if (
        recommendations.length > 0 &&
        !recommendations[0].includes(':') &&
        recommendations[0].length 
      tag.substring(1).toLowerCase()
    );

    // Look for keywords in the content
    const keyPhrases = [
      'key',
      'important',
      'significant',
      'essential',
      'primary',
      'crucial',
      'central',
      'core',
      'fundamental',
      'main',
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
function extractDreamTitle(text){
  try {
    // Try to find a title in the first line
    const firstLine = text.split('\n')[0].trim();

    // If the first line is short enough, use it title
    if (firstLine.length  5 ? words.slice(0, 5) ;

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
function extractMemoryTitle(text){
  try {
    // Try to find a title in the first line
    const firstLine = text.split('\n')[0].trim();

    // If the first line is short enough, use it title
    if (firstLine.length <= 50 && !firstLine.endsWith('.')) {
      return firstLine;
    }

    // Otherwise, generate a title based on the content

    // Look for time indicators
    const timeRegex =
      /(?)\s+(\w+\s+\d{4}|\w+\s+\d{1,2}(?)?|\d{4}|(?)\s+\d{1,2}(?)?|\d{1,2}(?)?\s+(?)/i;
    const timeMatch = text.match(timeRegex);

    // Look for location indicators
    const locationRegex = /(?)\s+(\w+(?:\s+\w+){0,3})\b/i;
    const locationMatch = text.match(locationRegex);

    // Look for people
    const peopleRegex = /(?)\s+(\w+(?:\s+\w+){0,2})\b/i;
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
function extractVisualizationTitle(text){
  try {
    // Try to find a title in the first line
    const firstLine = text.split('\n')[0].trim();

    // If the first line is short enough, use it title
    if (firstLine.length <= 50 && !firstLine.endsWith('.')) {
      return firstLine;
    }

    // Otherwise, extract key concepts
    const keywords = [
      'create',
      'visualize',
      'design',
      'generate',
      'make',
      'image',
      'picture',
      'visualization',
      'scene',
      'drawing',
    ];

    for (const keyword of keywords) {
      const regex = new RegExp(
        `${keyword}\\s+(?)?\\s+(.{10,50}?)(?:\\.|,|;|:|$)`,
        'i'
      );
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
  AIResponseFormat,
};
