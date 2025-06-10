"use strict";
/**
 * AIXTIV SYMPHONY™ AI Connector
 * © 2025 AI Publishing International LLP
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This is proprietary software of AI Publishing International LLP.
 * All rights reserved. No part of this software may be reproduced,
 * modified, or distributed without prior written permission.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIConnector = exports.AIResponseFormat = exports.AIRequestType = exports.AIModelType = void 0;
const firestore_1 = require("firebase/firestore");
const functions_1 = require("firebase/functions");
const pinecone_1 = require("@pinecone-database/pinecone");
const core_1 = require("../core");
const s2do_1 = require("../core/s2do");
const blockchain_integration_1 = require("../core/blockchain-integration");
// Initialize Firebase services
const db = (0, firestore_1.getFirestore)();
const functions = (0, functions_1.getFunctions)();
// Initialize Pinecone (will be configured at runtime)
let pineconeClient = null;
// AI Model Types
var AIModelType;
(function (AIModelType) {
    AIModelType["TEXT_GENERATION"] = "text-generation";
    AIModelType["EMBEDDINGS"] = "embeddings";
    AIModelType["IMAGE_GENERATION"] = "image-generation";
    AIModelType["IMAGE_UNDERSTANDING"] = "image-understanding";
    AIModelType["DREAM_ANALYSIS"] = "dream-analysis";
    AIModelType["MEMORY_ENHANCEMENT"] = "memory-enhancement";
    AIModelType["PROFILE_ANALYSIS"] = "profile-analysis";
    AIModelType["VISUALIZATION"] = "visualization";
    AIModelType["MULTIMODAL"] = "multimodal";
})(AIModelType || (exports.AIModelType = AIModelType = {}));
// AI Request Types
var AIRequestType;
(function (AIRequestType) {
    AIRequestType["COMPLETION"] = "completion";
    AIRequestType["CHAT"] = "chat";
    AIRequestType["EMBEDDING"] = "embedding";
    AIRequestType["IMAGE_GENERATION"] = "image-generation";
    AIRequestType["IMAGE_ANALYSIS"] = "image-analysis";
    AIRequestType["DREAM_INTERPRETATION"] = "dream-interpretation";
    AIRequestType["MEMORY_ENHANCEMENT"] = "memory-enhancement";
    AIRequestType["PROFILE_ANALYSIS"] = "profile-analysis";
    AIRequestType["VISUALIZATION_CREATION"] = "visualization-creation";
    AIRequestType["MULTIMODAL_ANALYSIS"] = "multimodal-analysis";
    AIRequestType["DOCUMENT_ANALYSIS"] = "document-analysis";
})(AIRequestType || (exports.AIRequestType = AIRequestType = {}));
// AI Response Types
var AIResponseFormat;
(function (AIResponseFormat) {
    AIResponseFormat["TEXT"] = "text";
    AIResponseFormat["JSON"] = "json";
    AIResponseFormat["HTML"] = "html";
    AIResponseFormat["MARKDOWN"] = "markdown";
    AIResponseFormat["IMAGE_URL"] = "image-url";
    AIResponseFormat["BINARY"] = "binary";
    AIResponseFormat["VECTOR"] = "vector";
    AIResponseFormat["METADATA"] = "metadata";
})(AIResponseFormat || (exports.AIResponseFormat = AIResponseFormat = {}));
/**
 * AIXTIV SYMPHONY AI Connector
 * Handles interactions with AI models and embedding systems
 */
class AIConnector {
    constructor(options = {}) {
        this.pinecone = null;
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
            blockchainManager: options.blockchainManager || null,
        };
        // Set up S2DO and blockchain integration if provided
        this.s2doManager = this.options.s2doManager;
        this.blockchainManager = this.options.blockchainManager;
        if (this.blockchainManager && !this.s2doManager) {
            this.securityManager = new blockchain_integration_1.S2DOBlockchainSecurityManager(this.blockchainManager);
            this.s2doManager = new s2do_1.S2DOManager(this.blockchainManager, this.securityManager);
        }
        else {
            this.securityManager = null;
        }
        // Initialize Pinecone if API key is provided
        this.initializePinecone();
    }
    /**
     * Initialize Pinecone client
     */
    async initializePinecone() {
        if (!this.options.pineconeApiKey || !this.options.pineconeEnvironment) {
            console.warn('Pinecone API key or environment not provided. Vector operations will not be available.');
            return;
        }
        try {
            this.pinecone = new pinecone_1.PineconeClient();
            await this.pinecone.init({
                apiKey: this.options.pineconeApiKey,
                environment: this.options.pineconeEnvironment,
            });
            pineconeClient = this.pinecone; // Set global client for other components to use
        }
        catch (error) {
            console.error('Error initializing Pinecone:', error);
            this.pinecone = null;
        }
    }
    /**
     * Process an AI request
     */
    async processRequest(params) {
        var _a;
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            // Check for cached response if caching is enabled
            if (this.options.useCache && params.useCache !== false) {
                const cachedResponse = await this.getFromCache(params);
                if (cachedResponse) {
                    if (this.options.enableLogging) {
                        await this.logRequest(params.userId || 'anonymous', requestId, params, cachedResponse, true);
                    }
                    return Object.assign(Object.assign({}, cachedResponse), { cached: true });
                }
            }
            // Process request based on request type
            let response;
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
                await this.logRequest(params.userId || 'anonymous', requestId, params, response, false);
            }
            // Record metrics if enabled
            if (this.options.enableMetrics) {
                await this.recordMetrics(params.userId || 'anonymous', params.modelType, params.requestType, processingTime, ((_a = response.usage) === null || _a === void 0 ? void 0 : _a.totalTokens) || 0);
            }
            return response;
        }
        catch (error) {
            console.error('Error processing AI request:', error);
            // Log error if logging is enabled
            if (this.options.enableLogging) {
                await this.logRequestError(params.userId || 'anonymous', requestId, params, error);
            }
            throw error;
        }
    }
    /**
     * Process a text completion request
     */
    async processCompletionRequest(requestId, params) {
        var _a;
        try {
            // Call the text completion Cloud Function
            const completionFunction = (0, functions_1.httpsCallable)(functions, 'aiCompletionRequest');
            const result = await completionFunction({
                model: ((_a = params.options) === null || _a === void 0 ? void 0 : _a.model) || this.options.defaultModel,
                prompt: params.content,
                max_tokens: params.maxTokens || 1000,
                temperature: params.temperature || 0.7,
                top_p: params.topP || 1,
                frequency_penalty: params.frequencyPenalty || 0,
                presence_penalty: params.presencePenalty || 0,
                stop: params.stop || null,
                response_format: params.responseFormat || AIResponseFormat.TEXT,
            });
            // Extract the response data
            const data = result.data;
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
        }
        catch (error) {
            console.error('Error in completion request:', error);
            throw error;
        }
    }
    /**
     * Process a chat request
     */
    async processChatRequest(requestId, params) {
        var _a, _b;
        try {
            // Prepare messages format
            let messages;
            if (Array.isArray(params.content) &&
                typeof params.content[0] === 'object' &&
                'role' in params.content[0]) {
                // Content is already in the correct messages format
                messages = params.content;
            }
            else if (Array.isArray(params.content) &&
                typeof params.content[0] === 'string') {
                // Content is an array of strings (alternate user/assistant)
                messages = params.content.map((content, i) => ({
                    role: i % 2 === 0 ? 'user' : 'assistant',
                    content,
                }));
            }
            else {
                // Content is a single string (user message)
                messages = [
                    {
                        role: 'user',
                        content: params.content,
                    },
                ];
            }
            // Add system prompt if provided
            if (params.systemPrompt) {
                messages.unshift({
                    role: 'system',
                    content: params.systemPrompt,
                });
            }
            // Call the chat completion Cloud Function
            const chatFunction = (0, functions_1.httpsCallable)(functions, 'aiChatRequest');
            const result = await chatFunction({
                model: ((_a = params.options) === null || _a === void 0 ? void 0 : _a.model) || this.options.defaultModel,
                messages,
                max_tokens: params.maxTokens,
                temperature: params.temperature || 0.7,
                top_p: params.topP || 1,
                frequency_penalty: params.frequencyPenalty || 0,
                presence_penalty: params.presencePenalty || 0,
                stop: params.stop || null,
                response_format: params.responseFormat || AIResponseFormat.TEXT,
                conversation_id: params.conversationId,
            });
            // Extract the response data
            const data = result.data;
            return {
                id: data.id || `chat_${Date.now().toString(36)}`,
                requestId,
                modelType: params.modelType,
                requestType: params.requestType,
                content: data.content || ((_b = data.message) === null || _b === void 0 ? void 0 : _b.content),
                format: params.responseFormat || AIResponseFormat.TEXT,
                usage: data.usage,
                metadata: Object.assign(Object.assign({}, (data.metadata || {})), { conversationId: params.conversationId || data.conversation_id }),
                created: Date.now(),
            };
        }
        catch (error) {
            console.error('Error in chat request:', error);
            throw error;
        }
    }
    /**
     * Process an embedding request
     */
    async processEmbeddingRequest(requestId, params) {
        var _a, _b, _c, _d;
        try {
            // Validate Pinecone is initialized
            if (!this.pinecone) {
                throw new Error('Pinecone is not initialized. Cannot process embedding request.');
            }
            // Call the embedding Cloud Function
            const embeddingFunction = (0, functions_1.httpsCallable)(functions, 'generateEmbedding');
            const result = await embeddingFunction({
                model: ((_a = params.options) === null || _a === void 0 ? void 0 : _a.embeddingModel) || 'text-embedding-small',
                input: params.content,
                dimensions: ((_b = params.options) === null || _b === void 0 ? void 0 : _b.dimensions) || 1536,
            });
            // Extract the response data
            const data = result.data;
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
                    indexName: (_c = params.options) === null || _c === void 0 ? void 0 : _c.indexName,
                    namespace: (_d = params.options) === null || _d === void 0 ? void 0 : _d.namespace,
                },
                created: Date.now(),
            };
        }
        catch (error) {
            console.error('Error in embedding request:', error);
            throw error;
        }
    }
    /**
     * Process an image generation request
     */
    async processImageGenerationRequest(requestId, params) {
        var _a, _b, _c, _d, _e, _f;
        try {
            // Call the image generation Cloud Function
            const imageGenFunction = (0, functions_1.httpsCallable)(functions, 'generateImage');
            const result = await imageGenFunction({
                model: ((_a = params.options) === null || _a === void 0 ? void 0 : _a.imageModel) || 'claude-3-opus',
                prompt: params.content,
                size: ((_b = params.options) === null || _b === void 0 ? void 0 : _b.size) || '1024x1024',
                style: ((_c = params.options) === null || _c === void 0 ? void 0 : _c.style) || 'natural',
                quality: ((_d = params.options) === null || _d === void 0 ? void 0 : _d.quality) || 'standard',
                response_format: 'url',
            });
            // Extract the response data
            const data = result.data;
            return {
                id: `img_${Date.now().toString(36)}`,
                requestId,
                modelType: params.modelType,
                requestType: params.requestType,
                content: data.url,
                format: AIResponseFormat.IMAGE_URL,
                metadata: {
                    prompt: params.content,
                    size: ((_e = params.options) === null || _e === void 0 ? void 0 : _e.size) || '1024x1024',
                    style: ((_f = params.options) === null || _f === void 0 ? void 0 : _f.style) || 'natural',
                },
                created: Date.now(),
            };
        }
        catch (error) {
            console.error('Error in image generation request:', error);
            throw error;
        }
    }
    /**
     * Process a dream interpretation request
     */
    async processDreamInterpretationRequest(requestId, params) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
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
                    ? params.content.join('\n')
                    : '';
            // If provided with context from previous dreams, incorporate it
            let messages = [];
            if (params.context && params.context.previousDreams) {
                messages.push({
                    role: 'system',
                    content: `${systemPrompt}\n\nAdditional context: The user has shared these dreams previously: ${JSON.stringify(params.context.previousDreams)}`,
                });
            }
            else {
                messages.push({
                    role: 'system',
                    content: systemPrompt,
                });
            }
            messages.push({
                role: 'user',
                content: `Please interpret this dream:\n\n${dreamContent}`,
            });
            // Call the chat completion Cloud Function
            const dreamFunction = (0, functions_1.httpsCallable)(functions, 'aiChatRequest');
            const result = await dreamFunction({
                model: ((_a = params.options) === null || _a === void 0 ? void 0 : _a.model) || 'claude-3-7-sonnet',
                messages,
                temperature: params.temperature || 0.7,
                max_tokens: params.maxTokens || 2000,
                response_format: params.responseFormat || AIResponseFormat.MARKDOWN,
            });
            // Extract the response data
            const data = result.data;
            // If S2DO manager is available, store the dream and interpretation
            if (this.s2doManager && params.userId) {
                try {
                    // Store the dream as an S2DO object
                    await this.s2doManager.createObject('user', params.userId, s2do_1.S2DOObjectType.DREAM, {
                        dreamContent,
                        interpretation: data.content || ((_b = data.message) === null || _b === void 0 ? void 0 : _b.content),
                        symbols: extractSymbols(data.content || ((_c = data.message) === null || _c === void 0 ? void 0 : _c.content)),
                        emotions: extractEmotions(data.content || ((_d = data.message) === null || _d === void 0 ? void 0 : _d.content)),
                    }, {
                        title: extractDreamTitle(dreamContent),
                        description: dreamContent.substring(0, 100) +
                            (dreamContent.length > 100 ? '...' : ''),
                        tags: extractTags(data.content || ((_e = data.message) === null || _e === void 0 ? void 0 : _e.content)),
                    });
                }
                catch (error) {
                    console.error('Error storing dream interpretation:', error);
                    // Continue even if storage fails
                }
            }
            return {
                id: `dream_${Date.now().toString(36)}`,
                requestId,
                modelType: params.modelType,
                requestType: params.requestType,
                content: data.content || ((_f = data.message) === null || _f === void 0 ? void 0 : _f.content),
                format: params.responseFormat || AIResponseFormat.MARKDOWN,
                usage: data.usage,
                metadata: {
                    dreamLength: dreamContent.length,
                    interpretationLength: (data.content || ((_g = data.message) === null || _g === void 0 ? void 0 : _g.content)).length,
                    symbols: extractSymbols(data.content || ((_h = data.message) === null || _h === void 0 ? void 0 : _h.content)),
                },
                created: Date.now(),
            };
        }
        catch (error) {
            console.error('Error in dream interpretation request:', error);
            throw error;
        }
    }
    /**
     * Process a memory enhancement request
     */
    async processMemoryEnhancementRequest(requestId, params) {
        var _a, _b, _c, _d, _e, _f, _g;
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
                    ? params.content.join('\n')
                    : '';
            // Get related memories from vector search if available
            let relatedMemories = [];
            if (this.pinecone && params.userId) {
                try {
                    // Generate embedding for the memory
                    const embeddingFunction = (0, functions_1.httpsCallable)(functions, 'generateEmbedding');
                    const embeddingResult = await embeddingFunction({
                        input: memoryContent,
                        dimensions: 1536,
                    });
                    const embedding = embeddingResult.data.embedding;
                    // Search for related memories in Pinecone
                    const index = this.pinecone.Index('aixtiv-symphony');
                    const queryResponse = await index.query({
                        queryVector: embedding,
                        namespace: `user_${params.userId}_memories`,
                        topK: 3,
                        includeMetadata: true,
                    });
                    if (queryResponse.matches && queryResponse.matches.length > 0) {
                        relatedMemories = queryResponse.matches.map(match => {
                            var _a;
                            return ({
                                id: match.id,
                                content: ((_a = match.metadata) === null || _a === void 0 ? void 0 : _a.content) || 'Unknown memory',
                                similarity: match.score,
                            });
                        });
                    }
                }
                catch (error) {
                    console.error('Error finding related memories:', error);
                    // Continue even if vector search fails
                }
            }
            // Build messages with related memories as context
            let messages = [];
            if (relatedMemories.length > 0) {
                messages.push({
                    role: 'system',
                    content: `${systemPrompt}\n\nAdditional context: These related memories may be relevant: ${JSON.stringify(relatedMemories)}`,
                });
            }
            else {
                messages.push({
                    role: 'system',
                    content: systemPrompt,
                });
            }
            messages.push({
                role: 'user',
                content: `Please enhance this memory:\n\n${memoryContent}`,
            });
            // Call the chat completion Cloud Function
            const memoriaFunction = (0, functions_1.httpsCallable)(functions, 'aiChatRequest');
            const result = await memoriaFunction({
                model: ((_a = params.options) === null || _a === void 0 ? void 0 : _a.model) || 'claude-3-7-sonnet',
                messages,
                temperature: params.temperature || 0.7,
                max_tokens: params.maxTokens || 2000,
                response_format: params.responseFormat || AIResponseFormat.MARKDOWN,
            });
            // Extract the response data
            const data = result.data;
            // If S2DO manager is available, store the memory and enhancement
            if (this.s2doManager && params.userId) {
                try {
                    // Store the memory as an S2DO object
                    await this.s2doManager.createObject('user', params.userId, s2do_1.S2DOObjectType.MEMORY, {
                        originalMemory: memoryContent,
                        enhancedMemory: data.content || ((_b = data.message) === null || _b === void 0 ? void 0 : _b.content),
                        keyElements: extractKeyElements(data.content || ((_c = data.message) === null || _c === void 0 ? void 0 : _c.content)),
                        emotionalSignificance: extractEmotionalSignificance(data.content || ((_d = data.message) === null || _d === void 0 ? void 0 : _d.content)),
                        relatedMemories: relatedMemories,
                    }, {
                        title: extractMemoryTitle(memoryContent),
                        description: memoryContent.substring(0, 100) +
                            (memoryContent.length > 100 ? '...' : ''),
                        tags: extractTags(data.content || ((_e = data.message) === null || _e === void 0 ? void 0 : _e.content)),
                    });
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
                                            timestamp: Date.now(),
                                        },
                                    },
                                ],
                            },
                        });
                    }
                }
                catch (error) {
                    console.error('Error storing memory enhancement:', error);
                    // Continue even if storage fails
                }
            }
            return {
                id: `memory_${Date.now().toString(36)}`,
                requestId,
                modelType: params.modelType,
                requestType: params.requestType,
                content: data.content || ((_f = data.message) === null || _f === void 0 ? void 0 : _f.content),
                format: params.responseFormat || AIResponseFormat.MARKDOWN,
                usage: data.usage,
                metadata: {
                    originalLength: memoryContent.length,
                    enhancedLength: (data.content || ((_g = data.message) === null || _g === void 0 ? void 0 : _g.content)).length,
                    relatedMemories: relatedMemories.length,
                },
                created: Date.now(),
            };
        }
        catch (error) {
            console.error('Error in memory enhancement request:', error);
            throw error;
        }
    }
    /**
     * Process a profile analysis request
     */
    async processProfileAnalysisRequest(requestId, params) {
        var _a, _b, _c, _d, _e, _f, _g;
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
                    ? params.content.join('\n')
                    : '';
            let messages = [
                {
                    role: 'system',
                    content: systemPrompt,
                },
                {
                    role: 'user',
                    content: `Please analyze this professional profile:\n\n${profileContent}`,
                },
            ];
            // Call the chat completion Cloud Function
            const profileFunction = (0, functions_1.httpsCallable)(functions, 'aiChatRequest');
            const result = await profileFunction({
                model: ((_a = params.options) === null || _a === void 0 ? void 0 : _a.model) || 'claude-3-7-sonnet',
                messages,
                temperature: params.temperature || 0.7,
                max_tokens: params.maxTokens || 2000,
                response_format: params.responseFormat || AIResponseFormat.MARKDOWN,
            });
            // Extract the response data
            const data = result.data;
            // If S2DO manager is available, store the profile analysis
            if (this.s2doManager && params.userId) {
                try {
                    // Store the profile analysis as an S2DO object
                    await this.s2doManager.createObject('user', params.userId, s2do_1.S2DOObjectType.PROFILE, {
                        profileContent,
                        analysis: data.content || ((_b = data.message) === null || _b === void 0 ? void 0 : _b.content),
                        keywords: extractKeywords(data.content || ((_c = data.message) === null || _c === void 0 ? void 0 : _c.content)),
                        recommendations: extractRecommendations(data.content || ((_d = data.message) === null || _d === void 0 ? void 0 : _d.content)),
                    }, {
                        title: 'Profile Analysis',
                        description: 'Analysis of professional profile with recommendations',
                        tags: [
                            'profile',
                            'career',
                            'networking',
                            'analysis',
                            'recommendations',
                        ],
                    });
                }
                catch (error) {
                    console.error('Error storing profile analysis:', error);
                    // Continue even if storage fails
                }
            }
            return {
                id: `profile_${Date.now().toString(36)}`,
                requestId,
                modelType: params.modelType,
                requestType: params.requestType,
                content: data.content || ((_e = data.message) === null || _e === void 0 ? void 0 : _e.content),
                format: params.responseFormat || AIResponseFormat.MARKDOWN,
                usage: data.usage,
                metadata: {
                    profileLength: profileContent.length,
                    analysisLength: (data.content || ((_f = data.message) === null || _f === void 0 ? void 0 : _f.content)).length,
                    keywords: extractKeywords(data.content || ((_g = data.message) === null || _g === void 0 ? void 0 : _g.content)),
                },
                created: Date.now(),
            };
        }
        catch (error) {
            console.error('Error in profile analysis request:', error);
            throw error;
        }
    }
    /**
     * Process a visualization creation request
     */
    async processVisualizationCreationRequest(requestId, params) {
        var _a, _b, _c;
        try {
            // Prepare visualization creation prompts
            const visualizationType = ((_a = params.options) === null || _a === void 0 ? void 0 : _a.visualizationType) || 'descriptive';
            let systemPrompt = '';
            if (visualizationType === 'descriptive') {
                systemPrompt = `You are Dr. Lucy, a visualization specialist in the AIXTIV SYMPHONY system.
Your task is to create a vivid, detailed description of a visualization based on the user's request.
Focus on visual details, sensory elements, and emotional resonance.
The visualization should be immersive and engaging, helping the user to clearly picture the scene.`;
            }
            else if (visualizationType === 'guided') {
                systemPrompt = `You are Dr. Lucy, a guided visualization specialist in the AIXTIV SYMPHONY system.
Your task is to create a step-by-step guided visualization or meditation based on the user's request.
Focus on clear instructions, sensory elements, and emotional guidance.
Structure the visualization with an introduction, main journey, and conclusion.`;
            }
            else if (visualizationType === 'svg') {
                systemPrompt = `You are Dr. Lucy, a visualization specialist in the AIXTIV SYMPHONY system.
Your task is to create an SVG visualization based on the user's request.
Focus on creating clean, well-structured SVG code that represents the requested visualization.
The SVG should be visually appealing and accurately represent the user's request.`;
            }
            const visualizationRequest = typeof params.content === 'string'
                ? params.content
                : Array.isArray(params.content)
                    ? params.content.join('\n')
                    : '';
            let messages = [
                {
                    role: 'system',
                    content: systemPrompt,
                },
                {
                    role: 'user',
                    content: visualizationRequest,
                },
            ];
            // Call the appropriate function based on visualization type
            let result;
            if (visualizationType === 'svg') {
                // Call SVG generation function
                const svgFunction = (0, functions_1.httpsCallable)(functions, 'generateSVG');
                result = await svgFunction({
                    prompt: visualizationRequest,
                });
            }
            else {
                // Call text-based visualization function
                const visualizationFunction = (0, functions_1.httpsCallable)(functions, 'aiChatRequest');
                result = await visualizationFunction({
                    model: ((_b = params.options) === null || _b === void 0 ? void 0 : _b.model) || 'claude-3-7-sonnet',
                    messages,
                    temperature: params.temperature || 0.7,
                    max_tokens: params.maxTokens || 2000,
                    response_format: params.responseFormat || AIResponseFormat.MARKDOWN,
                });
            }
            // Extract the response data
            const data = result.data;
            // Determine content and format based on visualization type
            let content, format;
            if (visualizationType === 'svg') {
                content = data.svg;
                format = AIResponseFormat.HTML;
            }
            else {
                content = data.content || ((_c = data.message) === null || _c === void 0 ? void 0 : _c.content);
                format = params.responseFormat || AIResponseFormat.MARKDOWN;
            }
            // If S2DO manager is available, store the visualization
            if (this.s2doManager && params.userId) {
                try {
                    // Store the visualization as an S2DO object
                    await this.s2doManager.createObject('user', params.userId, s2do_1.S2DOObjectType.VISUALIZATION, {
                        request: visualizationRequest,
                        visualization: content,
                        type: visualizationType,
                    }, {
                        title: extractVisualizationTitle(visualizationRequest),
                        description: visualizationRequest.substring(0, 100) +
                            (visualizationRequest.length > 100 ? '...' : ''),
                        tags: [
                            'visualization',
                            visualizationType,
                            ...extractTags(visualizationRequest),
                        ],
                    });
                }
                catch (error) {
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
                    responseLength: content.length,
                },
                created: Date.now(),
            };
        }
        catch (error) {
            console.error('Error in visualization creation request:', error);
            throw error;
        }
    }
    /**
     * Process a multimodal analysis request
     */
    async processMultimodalAnalysisRequest(requestId, params) {
        var _a, _b, _c, _d;
        try {
            // For multimodal requests, we need to process both image and text
            const prompt = typeof params.content === 'string'
                ? params.content
                : Array.isArray(params.content) &&
                    typeof params.content[0] === 'string'
                    ? params.content[0]
                    : '';
            // The image URL should be in params.options.imageUrl
            const imageUrl = (_a = params.options) === null || _a === void 0 ? void 0 : _a.imageUrl;
            if (!imageUrl) {
                throw new Error('Image URL is required for multimodal analysis');
            }
            // Call the multimodal analysis Cloud Function
            const multimodalFunction = (0, functions_1.httpsCallable)(functions, 'multimodalAnalysis');
            const result = await multimodalFunction({
                model: ((_b = params.options) === null || _b === void 0 ? void 0 : _b.model) || 'claude-3-opus',
                prompt,
                imageUrl,
                response_format: params.responseFormat || AIResponseFormat.MARKDOWN,
                analysis_type: ((_c = params.options) === null || _c === void 0 ? void 0 : _c.analysisType) || 'general',
            });
            // Extract the response data
            const data = result.data;
            return {
                id: `multi_${Date.now().toString(36)}`,
                requestId,
                modelType: params.modelType,
                requestType: params.requestType,
                content: data.content || data.analysis,
                format: params.responseFormat || AIResponseFormat.MARKDOWN,
                usage: data.usage,
                metadata: {
                    analysisType: ((_d = params.options) === null || _d === void 0 ? void 0 : _d.analysisType) || 'general',
                    imageUrl,
                    promptLength: prompt.length,
                },
                created: Date.now(),
            };
        }
        catch (error) {
            console.error('Error in multimodal analysis request:', error);
            throw error;
        }
    }
    /**
     * Get a cached response for a request
     */
    async getFromCache(params) {
        var _a;
        try {
            // Generate a cache key from the request parameters
            const cacheKey = this.generateCacheKey(params);
            // Check the cache in Firestore
            const cacheDoc = await (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'aiResponseCache', cacheKey));
            if (!cacheDoc.exists()) {
                return null;
            }
            const cachedData = cacheDoc.data();
            // Check if the cache has expired
            const cacheTime = ((_a = cachedData.timestamp) === null || _a === void 0 ? void 0 : _a.toMillis()) || 0;
            const currentTime = Date.now();
            const expiryTime = cacheTime + this.options.cacheLifetime * 1000;
            if (currentTime > expiryTime) {
                return null;
            }
            return cachedData.response;
        }
        catch (error) {
            console.error('Error getting from cache:', error);
            return null;
        }
    }
    /**
     * Save a response to cache
     */
    async saveToCache(params, response) {
        try {
            // Generate a cache key from the request parameters
            const cacheKey = this.generateCacheKey(params);
            // Save to Firestore cache
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'aiResponseCache', cacheKey), {
                parameters: this.sanitizeForCache(params),
                response,
                timestamp: firestore_1.Timestamp.now(),
            });
        }
        catch (error) {
            console.error('Error saving to cache:', error);
        }
    }
    /**
     * Generate a cache key from request parameters
     */
    generateCacheKey(params) {
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
            options: this.sanitizeOptionsForCache(params.options),
        };
        // Create SHA-256 hash of the stringified parameters
        const paramsString = JSON.stringify(cacheableParams);
        const hash = CryptoJS.SHA256(paramsString).toString();
        return `cache_${hash}`;
    }
    /**
     * Sanitize request parameters for cache storage
     */
    sanitizeForCache(params) {
        // Remove non-cacheable fields and limit content size
        const sanitized = Object.assign({}, params);
        // Remove user-specific data
        delete sanitized.userId;
        delete sanitized.conversationId;
        // Limit content size if necessary
        if (typeof sanitized.content === 'string' &&
            sanitized.content.length > 1000) {
            sanitized.content = `${sanitized.content.substring(0, 1000)}...`;
        }
        else if (Array.isArray(sanitized.content)) {
            sanitized.content = sanitized.content.map((item) => {
                if (typeof item === 'string' && item.length > 1000) {
                    return `${item.substring(0, 1000)}...`;
                }
                if (typeof item === 'object' &&
                    item.content &&
                    typeof item.content === 'string' &&
                    item.content.length > 1000) {
                    return Object.assign(Object.assign({}, item), { content: `${item.content.substring(0, 1000)}...` });
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
    sanitizeOptionsForCache(options) {
        if (!options)
            return undefined;
        // Copy options and remove sensitive information
        const sanitized = Object.assign({}, options);
        // Remove potentially large or sensitive fields
        delete sanitized.imageData;
        return sanitized;
    }
    /**
     * Generate a request ID
     */
    generateRequestId() {
        return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    }
    /**
     * Log an AI request and response
     */
    async logRequest(userId, requestId, params, response, isCached) {
        var _a;
        try {
            // Get truncated content for logging
            const requestContent = this.truncateContent(params.content);
            const responseContent = this.truncateContent(response.content);
            // Build log entry
            const logEntry = {
                id: `log_${Date.now().toString(36)}`,
                userId,
                requestId,
                timestamp: firestore_1.Timestamp.now(),
                modelType: params.modelType,
                requestType: params.requestType,
                requestSummary: {
                    content: requestContent,
                    options: params.options,
                },
                responseSummary: {
                    content: responseContent,
                    format: response.format,
                    usage: response.usage,
                },
                processingTime: response.processingTime,
                cached: isCached,
                conversationId: params.conversationId,
            };
            // Add to activity logs
            await core_1.ActivityLoggerService.logActivity('user', userId, `AI_${params.requestType.toUpperCase()}`, 'ai', requestId, 'success', {
                modelType: params.modelType,
                processingTime: response.processingTime,
                cached: isCached,
                tokens: (_a = response.usage) === null || _a === void 0 ? void 0 : _a.totalTokens,
            });
            // Store detailed log in Firestore
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'aiRequestLogs', `log_${requestId}`), logEntry);
        }
        catch (error) {
            console.error('Error logging AI request:', error);
        }
    }
    /**
     * Log an AI request error
     */
    async logRequestError(userId, requestId, params, error) {
        try {
            // Get truncated content for logging
            const requestContent = this.truncateContent(params.content);
            // Build error log entry
            const errorLogEntry = {
                id: `error_${Date.now().toString(36)}`,
                userId,
                requestId,
                timestamp: firestore_1.Timestamp.now(),
                modelType: params.modelType,
                requestType: params.requestType,
                requestSummary: {
                    content: requestContent,
                    options: params.options,
                },
                error: {
                    message: error.message || 'Unknown error',
                    code: error.code || 'unknown',
                    stack: error.stack || null,
                },
                conversationId: params.conversationId,
            };
            // Add to activity logs
            await core_1.ActivityLoggerService.logActivity('user', userId, `AI_${params.requestType.toUpperCase()}_ERROR`, 'ai', requestId, 'failure', {
                modelType: params.modelType,
                error: error.message || 'Unknown error',
            });
            // Store detailed error log in Firestore
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'aiRequestErrorLogs', `error_${requestId}`), errorLogEntry);
        }
        catch (logError) {
            console.error('Error logging AI request error:', logError);
        }
    }
    /**
     * Record metrics for AI requests
     */
    async recordMetrics(userId, modelType, requestType, processingTime, tokens) {
        try {
            // Record processing time metric
            await core_1.PerformanceMetricsService.recordMetric('ai_processing_time', 'ai', `${modelType}_${requestType}`, processingTime, 'milliseconds', { userId });
            // Record token usage metric if available
            if (tokens > 0) {
                await core_1.PerformanceMetricsService.recordMetric('ai_token_usage', 'ai', `${modelType}_${requestType}`, tokens, 'tokens', { userId });
            }
        }
        catch (error) {
            console.error('Error recording AI metrics:', error);
        }
    }
    /**
     * Truncate content for logging
     */
    truncateContent(content) {
        if (typeof content === 'string') {
            return content.length > 500 ? `${content.substring(0, 500)}...` : content;
        }
        else if (Array.isArray(content)) {
            return content.map((item) => {
                if (typeof item === 'string') {
                    return item.length > 500 ? `${item.substring(0, 500)}...` : item;
                }
                else if (typeof item === 'object' &&
                    item.content &&
                    typeof item.content === 'string') {
                    return Object.assign(Object.assign({}, item), { content: item.content.length > 500
                            ? `${item.content.substring(0, 500)}...`
                            : item.content });
                }
                return item;
            });
        }
        return content;
    }
}
exports.AIConnector = AIConnector;
// Utility functions for content extraction
/**
 * Extract key elements from memory enhancement
 */
function extractKeyElements(text) {
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
            if (elements.length > 0 &&
                !elements[0].includes(':') &&
                elements[0].length < 50) {
                elements.shift();
            }
            return elements;
        }
    }
    catch (error) {
        console.error('Error extracting key elements:', error);
    }
    return [];
}
/**
 * Extract emotional significance from memory enhancement
 */
function extractEmotionalSignificance(text) {
    try {
        // Look for the "Emotional Significance" section
        const emotionMatch = text.match(/Emotional Significance[:\s-]+([\s\S]+?)(?=\n\s*\n|$)/i);
        if (emotionMatch && emotionMatch[1]) {
            return emotionMatch[1].trim();
        }
    }
    catch (error) {
        console.error('Error extracting emotional significance:', error);
    }
    return '';
}
/**
 * Extract symbols from dream interpretation
 */
function extractSymbols(text) {
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
            if (symbols.length > 0 &&
                !symbols[0].includes(':') &&
                symbols[0].length < 50) {
                symbols.shift();
            }
            return symbols;
        }
    }
    catch (error) {
        console.error('Error extracting symbols:', error);
    }
    return [];
}
/**
 * Extract emotions from dream interpretation
 */
function extractEmotions(text) {
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
            if (emotions.length > 0 &&
                !emotions[0].includes(':') &&
                emotions[0].length < 50) {
                emotions.shift();
            }
            return emotions;
        }
    }
    catch (error) {
        console.error('Error extracting emotions:', error);
    }
    return [];
}
/**
 * Extract keywords from profile analysis
 */
function extractKeywords(text) {
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
            if (keywords.length > 0 &&
                !keywords[0].includes(':') &&
                keywords[0].length < 50) {
                keywords.shift();
            }
            return keywords;
        }
    }
    catch (error) {
        console.error('Error extracting keywords:', error);
    }
    return [];
}
/**
 * Extract recommendations from profile analysis
 */
function extractRecommendations(text) {
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
            if (recommendations.length > 0 &&
                !recommendations[0].includes(':') &&
                recommendations[0].length < 50) {
                recommendations.shift();
            }
            return recommendations;
        }
    }
    catch (error) {
        console.error('Error extracting recommendations:', error);
    }
    return [];
}
/**
 * Extract tags from AI-generated content
 */
function extractTags(text) {
    try {
        // Extract hashtags or keywords from the text
        const hashtags = text.match(/#(\w+)/g) || [];
        const formattedHashtags = hashtags.map(tag => tag.substring(1).toLowerCase());
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
    }
    catch (error) {
        console.error('Error extracting tags:', error);
        return [];
    }
}
/**
 * Extract a title from dream content
 */
function extractDreamTitle(text) {
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
            'flying',
            'falling',
            'chased',
            'running',
            'swimming',
            'water',
            'ocean',
            'mountain',
            'forest',
            'house',
            'school',
            'work',
            'family',
            'friend',
            'stranger',
            'talking',
            'searching',
            'lost',
            'finding',
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
    }
    catch (error) {
        console.error('Error extracting dream title:', error);
        return 'Dream Record';
    }
}
/**
 * Extract a title from memory content
 */
function extractMemoryTitle(text) {
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
    }
    catch (error) {
        console.error('Error extracting memory title:', error);
        return 'Memory Record';
    }
}
/**
 * Extract a title from visualization request
 */
function extractVisualizationTitle(text) {
    try {
        // Try to find a title in the first line
        const firstLine = text.split('\n')[0].trim();
        // If the first line is short enough, use it as the title
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
            const regex = new RegExp(`${keyword}\\s+(?:a|an)?\\s+(.{10,50}?)(?:\\.|,|;|:|$)`, 'i');
            const match = text.match(regex);
            if (match && match[1]) {
                return `Visualization of ${match[1].trim()}`;
            }
        }
        // Fallback to default title with first few words
        const words = text.split(/\s+/).slice(0, 6).join(' ');
        return `Visualization: ${words}...`;
    }
    catch (error) {
        console.error('Error extracting visualization title:', error);
        return 'Visualization';
    }
}
// Module exports
exports.default = {
    AIConnector,
    AIModelType,
    AIRequestType,
    AIResponseFormat,
};
//# sourceMappingURL=as-general-ai-connector.js.map