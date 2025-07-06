"use strict";
/**
 * AIXTIV SYMPHONY™ Agent Orchestration
 * © 2025 AI Publishing International LLP
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This is proprietary software of AI Publishing International LLP.
 * All rights reserved. No part of this software may be reproduced,
 * modified, or distributed without prior written permission.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiAgentCollaborationSystem = exports.AgentNFTManager = exports.AgentOrchestrationManager = void 0;
const core_1 = require("../core");
const pinecone_1 = require("@pinecone-database/pinecone");
const firestore_1 = require("firebase/firestore");
const functions_1 = require("firebase/functions");
const types_1 = require("../core/types");
const ethers_1 = require("ethers");
const CryptoJS = __importStar(require("crypto-js"));
// Initialize services
const db = (0, firestore_1.getFirestore)();
const functions = (0, functions_1.getFunctions)();
// Initialize Pinecone
const pinecone = new pinecone_1.PineconeClient({
    apiKey: process.env.PINECONE_API_KEY || '',
    environment: process.env.PINECONE_ENVIRONMENT || ''
});
// Agent Execution Middleware Class
class AgentExecutionMiddleware {
    constructor(agentInstance) {
        this.embeddings = [];
        this.agentInstance = agentInstance;
        this.performanceProfile = agentInstance.performanceProfile;
        this.agentType = agentInstance.agentTypeId;
        this.vectorStoreId = agentInstance.vectorStoreId || null;
    }
    /**
     * Execute the agent to process a message
     */
    processMessage(message, conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Start performance metric tracking
                const processingStartTime = Date.now();
                // Log the agent activity
                yield core_1.ActivityLoggerService.logActivity('agent', this.agentInstance.id, 'PROCESS_MESSAGE', 'conversation', conversationId, 'success', { messageId: message.id });
                // Retrieve conversation context
                const context = yield this.retrieveContext(conversationId, message);
                // Process the message based on agent type and performance profile
                const response = yield this.executeAgentLogic(message, context);
                // Store the response
                const agentResponse = yield core_1.ConversationService.addMessage(conversationId, 'agent', this.agentInstance.id, response.content, 'text', message.id);
                // Track performance metrics
                const processingTime = Date.now() - processingStartTime;
                yield core_1.PerformanceMetricsService.recordMetric('message_processing_time', 'agent', this.agentInstance.id, processingTime, 'milliseconds', {
                    conversationId,
                    messageId: message.id,
                    responseId: agentResponse.id
                });
                return agentResponse;
            }
            catch (error) {
                console.error('Error processing message:', error);
                // Log the error
                yield core_1.ActivityLoggerService.logActivity('agent', this.agentInstance.id, 'PROCESS_MESSAGE_ERROR', 'conversation', conversationId, 'failure', { messageId: message.id, error: error.toString() });
                throw error;
            }
        });
    }
    /**
     * Retrieve context for the conversation
     */
    retrieveContext(conversationId, message) {
        return __awaiter(this, void 0, void 0, function* () {
            // Basic context - recent messages
            const recentMessages = yield this.getRecentMessages(conversationId, 10);
            // Enhanced context if using high performance or ultra performance agents
            let enhancedContext = {};
            if (this.performanceProfile === types_1.PerformanceProfile.HIGH_PERFORMANCE ||
                this.performanceProfile === types_1.PerformanceProfile.ULTRA_PERFORMANCE) {
                // Retrieve vector context if available
                if (this.vectorStoreId) {
                    const vectorContext = yield this.retrieveVectorContext(message.content);
                    enhancedContext = Object.assign(Object.assign({}, enhancedContext), { vectorContext });
                }
                // Add specialized context based on agent type
                const specializedContext = yield this.retrieveSpecializedContext();
                enhancedContext = Object.assign(Object.assign({}, enhancedContext), specializedContext);
            }
            return Object.assign({ recentMessages, currentMessage: message }, enhancedContext);
        });
    }
    /**
     * Get recent messages from a conversation
     */
    getRecentMessages(conversationId, count) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get messages from conversation
                const messagesQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'conversations', conversationId, 'messages'), (0, firestore_1.orderBy)('sentAt', 'desc'), (0, firestore_1.limit)(count));
                const querySnapshot = yield (0, firestore_1.getDocs)(messagesQuery);
                // Convert to array and reverse to get chronological order
                return querySnapshot.docs.map(doc => doc.data()).reverse();
            }
            catch (error) {
                console.error('Error getting recent messages:', error);
                return [];
            }
        });
    }
    /**
     * Retrieve vector context using semantic search
     */
    retrieveVectorContext(content) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.vectorStoreId) {
                    return [];
                }
                // Get vector store details
                const vectorStoreDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'vectorStores', this.vectorStoreId));
                if (!vectorStoreDoc.exists()) {
                    return [];
                }
                const vectorStore = vectorStoreDoc.data();
                // Generate embedding for the message content
                // In a real implementation, this would call a text embedding model API
                const embedding = yield this.generateEmbedding(content);
                // Store the embedding for future reference
                this.embeddings.push({
                    text: content,
                    vector: embedding
                });
                // Initialize Pinecone if needed
                yield pinecone.init();
                // Query Pinecone for similar vectors
                const index = pinecone.Index(vectorStore.indexName);
                const queryResponse = yield index.query({
                    queryVector: embedding,
                    namespace: vectorStore.namespace,
                    topK: 5,
                    includeMetadata: true
                });
                // Extract and return relevant context
                return this.processQueryResponse(queryResponse);
            }
            catch (error) {
                console.error('Error retrieving vector context:', error);
                return [];
            }
        });
    }
    /**
     * Generate embedding for text (placeholder implementation)
     */
    generateEmbedding(text) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // In a real implementation, this would call an embedding model API
                // For now, use Firebase Function to generate embedding
                const generateEmbeddingFn = (0, functions_1.httpsCallable)(functions, 'generateEmbedding');
                const result = yield generateEmbeddingFn({ text });
                return result.data.embedding;
            }
            catch (error) {
                console.error('Error generating embedding:', error);
                // Return a placeholder embedding (this would never be used in production)
                return Array(1536).fill(0).map(() => Math.random() * 2 - 1);
            }
        });
    }
    /**
     * Process Pinecone query response
     */
    processQueryResponse(queryResponse) {
        if (!queryResponse.matches || queryResponse.matches.length === 0) {
            return [];
        }
        return queryResponse.matches.map(match => ({
            id: match.id,
            score: match.score,
            metadata: match.metadata
        }));
    }
    /**
     * Retrieve specialized context based on agent type
     */
    retrieveSpecializedContext() {
        return __awaiter(this, void 0, void 0, function* () {
            switch (this.agentType) {
                case types_1.PilotType.DR_MEMORIA_PILOT:
                    return this.retrieveMemoriaContext();
                case types_1.PilotType.DR_MATCH_PILOT:
                    return this.retrieveMatchContext();
                case types_1.PilotType.DR_LUCY_R1_CORE_01:
                case types_1.PilotType.DR_LUCY_R1_CORE_02:
                case types_1.PilotType.DR_LUCY_R1_CORE_03:
                    return this.retrieveLucyContext();
                case types_1.PilotType.DR_MARIA_HISTORICAL_01:
                case types_1.PilotType.DR_MARIA_HISTORICAL_02:
                case types_1.PilotType.DR_MARIA_HISTORICAL_03:
                    return this.retrieveMariaContext();
                default:
                    return {};
            }
        });
    }
    /**
     * Retrieve specialized context for Dr. Memoria
     */
    retrieveMemoriaContext() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get owner's memory objects
                const memoryQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 's2doObjects'), (0, firestore_1.where)('ownerType', '==', this.agentInstance.ownerType), (0, firestore_1.where)('ownerId', '==', this.agentInstance.ownerId), (0, firestore_1.where)('objectType', '==', 'memory'), (0, firestore_1.where)('status', '==', 'active'), (0, firestore_1.limit)(10));
                const querySnapshot = yield (0, firestore_1.getDocs)(memoryQuery);
                // Extract and return memory objects
                return {
                    memories: querySnapshot.docs.map(doc => doc.data()),
                    memoryCapabilities: [
                        'record_memories',
                        'analyze_memories',
                        'connect_memories',
                        'organize_memories'
                    ]
                };
            }
            catch (error) {
                console.error('Error retrieving Memoria context:', error);
                return {
                    memories: [],
                    memoryCapabilities: []
                };
            }
        });
    }
    /**
     * Retrieve specialized context for Dr. Match
     */
    retrieveMatchContext() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get owner's profile data
                const ownerData = yield this.getOwnerProfile();
                // Get integration status
                const linkedinIntegration = yield this.checkIntegrationStatus('LINKEDIN');
                return {
                    profile: ownerData,
                    integrations: {
                        linkedin: linkedinIntegration
                    },
                    matchCapabilities: [
                        'profile_analysis',
                        'network_recommendations',
                        'content_suggestions',
                        'engagement_analytics'
                    ]
                };
            }
            catch (error) {
                console.error('Error retrieving Match context:', error);
                return {
                    profile: {},
                    integrations: {},
                    matchCapabilities: []
                };
            }
        });
    }
    /**
     * Retrieve specialized context for Dr. Lucy
     */
    retrieveLucyContext() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get owner's dream records
                const dreamQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 's2doObjects'), (0, firestore_1.where)('ownerType', '==', this.agentInstance.ownerType), (0, firestore_1.where)('ownerId', '==', this.agentInstance.ownerId), (0, firestore_1.where)('objectType', '==', 'dream'), (0, firestore_1.where)('status', '==', 'active'), (0, firestore_1.limit)(5));
                const querySnapshot = yield (0, firestore_1.getDocs)(dreamQuery);
                return {
                    dreams: querySnapshot.docs.map(doc => doc.data()),
                    visualizationCapabilities: [
                        'dream_interpretation',
                        'visual_generation',
                        'pattern_recognition',
                        'metaphor_analysis'
                    ]
                };
            }
            catch (error) {
                console.error('Error retrieving Lucy context:', error);
                return {
                    dreams: [],
                    visualizationCapabilities: []
                };
            }
        });
    }
    /**
     * Retrieve specialized context for Dr. Maria
     */
    retrieveMariaContext() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get cultural adaptation settings
                const culturalSettings = this.agentInstance.culturalAdaptationSettings || {};
                // Get owner's language preferences
                const ownerData = yield this.getOwnerProfile();
                const language = ownerData.locale || 'en_US';
                return {
                    culturalSettings,
                    language,
                    region: culturalSettings.region || 'global',
                    translationCapabilities: [
                        'language_translation',
                        'cultural_adaptation',
                        'localization',
                        'idiomatic_expression'
                    ]
                };
            }
            catch (error) {
                console.error('Error retrieving Maria context:', error);
                return {
                    culturalSettings: {},
                    language: 'en_US',
                    region: 'global',
                    translationCapabilities: []
                };
            }
        });
    }
    /**
     * Get owner profile data
     */
    getOwnerProfile() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.agentInstance.ownerType === 'user') {
                    const userDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'users', this.agentInstance.ownerId));
                    return userDoc.exists() ? userDoc.data() : {};
                }
                else if (this.agentInstance.ownerType === 'organization') {
                    const orgDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'organizations', this.agentInstance.ownerId));
                    return orgDoc.exists() ? orgDoc.data() : {};
                }
                return {};
            }
            catch (error) {
                console.error('Error getting owner profile:', error);
                return {};
            }
        });
    }
    /**
     * Check integration status
     */
    checkIntegrationStatus(integrationType) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const integrationQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'integrationConnections'), (0, firestore_1.where)('connectionType', '==', integrationType), (0, firestore_1.where)('status', '==', 'active'));
                const querySnapshot = yield (0, firestore_1.getDocs)(integrationQuery);
                if (querySnapshot.empty) {
                    return { connected: false };
                }
                return {
                    connected: true,
                    connectionDetails: querySnapshot.docs[0].data()
                };
            }
            catch (error) {
                console.error(`Error checking ${integrationType} integration status:`, error);
                return { connected: false };
            }
        });
    }
    /**
     * Execute agent logic based on agent type and performance profile
     */
    executeAgentLogic(message, context) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Prepare agent execution
                yield this.prepareAgentExecution();
                // Call agent execution function based on agent type
                const agentFunction = (0, functions_1.httpsCallable)(functions, `execute_${this.agentType.toLowerCase()}`);
                const executionPayload = {
                    message: message,
                    context: context,
                    agentProfile: {
                        id: this.agentInstance.id,
                        name: this.agentInstance.name,
                        performanceProfile: this.performanceProfile,
                        communicationSettings: this.agentInstance.communicationSettings,
                        culturalAdaptationSettings: this.agentInstance.culturalAdaptationSettings
                    }
                };
                // Execute the agent function
                const result = yield agentFunction(executionPayload);
                // Process and return the result
                return this.processAgentResult(result);
            }
            catch (error) {
                console.error('Error executing agent logic:', error);
                // Return fallback response
                return {
                    content: `I apologize, but I encountered an issue while processing your message. Let's try again or rephrase your request.`,
                    metadata: {
                        error: error.toString(),
                        fallback: true
                    }
                };
            }
        });
    }
    /**
     * Prepare for agent execution
     */
    prepareAgentExecution() {
        return __awaiter(this, void 0, void 0, function* () {
            // Update agent activity timestamp
            yield core_1.AgentService.updateAgentInstance(this.agentInstance.id, {
                'metadata.lastActive': firestore_1.Timestamp.now()
            });
            // Additional preparation based on performance profile
            if (this.performanceProfile === types_1.PerformanceProfile.ULTRA_PERFORMANCE) {
                // Prepare cache for ultra performance
                yield this.prepareUltraPerformanceCache();
            }
        });
    }
    /**
     * Prepare cache for ultra performance agents
     */
    prepareUltraPerformanceCache() {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementation would depend on specific caching mechanism
            // For now, this is a placeholder
        });
    }
    /**
     * Process agent execution result
     */
    processAgentResult(result) {
        const resultData = result.data;
        // Perform response filtering and enhancement
        if (this.performanceProfile === types_1.PerformanceProfile.HIGH_PERFORMANCE ||
            this.performanceProfile === types_1.PerformanceProfile.ULTRA_PERFORMANCE) {
            // Apply advanced processing for high/ultra performance
            return this.enhanceResponse(resultData);
        }
        // Return the standard response
        return resultData;
    }
    /**
     * Enhance agent response for high/ultra performance agents
     */
    enhanceResponse(response) {
        // Add agent-specific enhancements
        switch (this.agentType) {
            case types_1.PilotType.DR_MEMORIA_PILOT:
                return this.enhanceMemoriaResponse(response);
            case types_1.PilotType.DR_MATCH_PILOT:
                return this.enhanceMatchResponse(response);
            case types_1.PilotType.DR_MARIA_HISTORICAL_01:
            case types_1.PilotType.DR_MARIA_HISTORICAL_02:
            case types_1.PilotType.DR_MARIA_HISTORICAL_03:
                return this.enhanceMariaResponse(response);
            default:
                return response;
        }
    }
    /**
     * Enhance Dr. Memoria response
     */
    enhanceMemoriaResponse(response) {
        var _a;
        // Add memory context indicators
        if ((_a = response.metadata) === null || _a === void 0 ? void 0 : _a.memoryReferences) {
            const memories = response.metadata.memoryReferences;
            let enhancedContent = response.content;
            // Add memory reference notes if applicable
            if (memories.length > 0) {
                enhancedContent += "\n\n*Memory References:*\n";
                memories.forEach((memory, index) => {
                    enhancedContent += `${index + 1}. ${memory.title} (${memory.date})\n`;
                });
            }
            return Object.assign(Object.assign({}, response), { content: enhancedContent });
        }
        return response;
    }
    /**
     * Enhance Dr. Match response
     */
    enhanceMatchResponse(response) {
        var _a;
        // Add LinkedIn integration notes if applicable
        if (((_a = response.metadata) === null || _a === void 0 ? void 0 : _a.linkedinIntegration) && response.metadata.linkedinAction) {
            let enhancedContent = response.content;
            enhancedContent += `\n\n*LinkedIn Action:* ${response.metadata.linkedinAction}\n`;
            if (response.metadata.linkedinResults) {
                enhancedContent += `Results: ${response.metadata.linkedinResults}\n`;
            }
            return Object.assign(Object.assign({}, response), { content: enhancedContent });
        }
        return response;
    }
    /**
     * Enhance Dr. Maria response
     */
    enhanceMariaResponse(response) {
        var _a;
        // Add translation notes if applicable
        if ((_a = response.metadata) === null || _a === void 0 ? void 0 : _a.translation) {
            const translation = response.metadata.translation;
            let enhancedContent = response.content;
            if (translation.sourceLanguage && translation.targetLanguage) {
                enhancedContent += `\n\n*Translation:* ${translation.sourceLanguage} → ${translation.targetLanguage}\n`;
                if (translation.culturalNotes) {
                    enhancedContent += `*Cultural Context:* ${translation.culturalNotes}\n`;
                }
            }
            return Object.assign(Object.assign({}, response), { content: enhancedContent });
        }
        return response;
    }
}
// Agent Orchestration Manager
class AgentOrchestrationManager {
    // Singleton pattern
    constructor() {
        this.activeAgents = new Map();
    }
    /**
     * Get the singleton instance
     */
    static getInstance() {
        if (!AgentOrchestrationManager.instance) {
            AgentOrchestrationManager.instance = new AgentOrchestrationManager();
        }
        return AgentOrchestrationManager.instance;
    }
    /**
     * Process a message with an agent
     */
    processMessage(agentId, message, conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get or create agent middleware
                const agentMiddleware = yield this.getAgentMiddleware(agentId);
                if (!agentMiddleware) {
                    throw new Error(`Agent ${agentId} not found or not active`);
                }
                // Process the message
                return yield agentMiddleware.processMessage(message, conversationId);
            }
            catch (error) {
                console.error('Error in agent processing:', error);
                throw error;
            }
        });
    }
    /**
     * Create or get an agent execution middleware
     */
    getAgentMiddleware(agentId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if agent middleware already exists
            if (this.activeAgents.has(agentId)) {
                return this.activeAgents.get(agentId) || null;
            }
            // Get agent data
            const agent = yield core_1.AgentService.getAgentById(agentId);
            if (!agent || agent.status !== 'active') {
                return null;
            }
            // Create new middleware
            const middleware = new AgentExecutionMiddleware(agent);
            this.activeAgents.set(agentId, middleware);
            return middleware;
        });
    }
    /**
     * Get all active agents by owner
     */
    getActiveAgentsByOwner(ownerType, ownerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield core_1.AgentService.getAgentsByOwner(ownerType, ownerId);
            }
            catch (error) {
                console.error('Error getting active agents:', error);
                return [];
            }
        });
    }
    /**
     * Create a new agent
     */
    createAgent(agentData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield core_1.AgentService.createAgentInstance(agentData);
            }
            catch (error) {
                console.error('Error creating agent:', error);
                throw error;
            }
        });
    }
    /**
     * Update an agent
     */
    updateAgent(agentId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const updatedAgent = yield core_1.AgentService.updateAgentInstance(agentId, data);
                // Update middleware if exists
                if (updatedAgent && this.activeAgents.has(agentId)) {
                    // Remove old middleware
                    this.activeAgents.delete(agentId);
                    // Create new middleware with updated agent data
                    const middleware = new AgentExecutionMiddleware(updatedAgent);
                    this.activeAgents.set(agentId, middleware);
                }
                return updatedAgent;
            }
            catch (error) {
                console.error('Error updating agent:', error);
                throw error;
            }
        });
    }
    /**
     * Create a conversation with an agent
     */
    createConversation(title, initiatorType, initiatorId, agentId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get agent data
                const agent = yield core_1.AgentService.getAgentById(agentId);
                if (!agent || agent.status !== 'active') {
                    throw new Error(`Agent ${agentId} not found or not active`);
                }
                // Create conversation
                const conversation = yield core_1.ConversationService.createConversation(title, initiatorType, initiatorId, [
                    { type: initiatorType, id: initiatorId },
                    { type: 'agent', id: agentId }
                ]);
                return conversation;
            }
            catch (error) {
                console.error('Error creating conversation with agent:', error);
                throw error;
            }
        });
    }
}
exports.AgentOrchestrationManager = AgentOrchestrationManager;
// Blockchain NFT Integration for Agent Ownership
class AgentNFTManager {
    constructor(rpcUrl = process.env.ETHEREUM_RPC_URL || '', contractAddress = process.env.NFT_CONTRACT_ADDRESS || '', privateKey = process.env.AIXTIV_PRIVATE_KEY || '') {
        this.provider = new ethers_1.ethers.providers.JsonRpcProvider(rpcUrl);
        this.contractAddress = contractAddress;
        this.aixtivWallet = new ethers_1.ethers.Wallet(privateKey, this.provider);
        // ABI for ERC-721 NFT contract with metadata
        const abi = [
            'function mint(address to, string memory tokenURI) external returns (uint256)',
            'function ownerOf(uint256 tokenId) external view returns (address)',
            'function transferFrom(address from, address to, uint256 tokenId) external',
            'function tokenURI(uint256 tokenId) external view returns (string memory)',
            'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
        ];
        this.contract = new ethers_1.ethers.Contract(contractAddress, abi, this.aixtivWallet);
    }
    /**
     * Mint a new agent NFT
     */
    mintAgentNFT(agentId, ownerAddress, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Upload metadata to IPFS
                const metadataUri = yield this.uploadMetadataToIPFS(metadata);
                // Mint the NFT
                const tx = yield this.contract.mint(ownerAddress, metadataUri);
                const receipt = yield tx.wait();
                // Get the token ID from the Transfer event
                const transferEvent = receipt.events.find((e) => e.event === 'Transfer');
                const tokenId = transferEvent.args.tokenId.toString();
                // Create NFT record in Firestore
                yield this.createNFTRecord(agentId, tokenId, ownerAddress, metadataUri, receipt.transactionHash);
                return tokenId;
            }
            catch (error) {
                console.error('Error minting agent NFT:', error);
                throw error;
            }
        });
    }
    /**
     * Transfer an agent NFT to a new owner
     */
    transferAgentNFT(tokenId, fromAddress, toAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Transfer the NFT
                const tx = yield this.contract.transferFrom(fromAddress, toAddress, tokenId);
                const receipt = yield tx.wait();
                // Update NFT record in Firestore
                yield this.updateNFTRecord(tokenId, toAddress, receipt.transactionHash);
                return receipt.transactionHash;
            }
            catch (error) {
                console.error('Error transferring agent NFT:', error);
                throw error;
            }
        });
    }
    /**
     * Get owner of an agent NFT
     */
    getAgentNFTOwner(tokenId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.contract.ownerOf(tokenId);
            }
            catch (error) {
                console.error('Error getting agent NFT owner:', error);
                throw error;
            }
        });
    }
    /**
     * Upload metadata to IPFS (mock implementation)
     */
    uploadMetadataToIPFS(metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // In a real implementation, this would upload to IPFS
                // For now, return a mock IPFS URI
                const metadataHash = CryptoJS.SHA256(JSON.stringify(metadata)).toString().substring(0, 16);
                return `ipfs://${metadataHash}`;
            }
            catch (error) {
                console.error('Error uploading metadata to IPFS:', error);
                throw error;
            }
        });
    }
    /**
     * Create NFT record in Firestore
     */
    createNFTRecord(agentId, tokenId, ownerAddress, metadataUri, transactionHash) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const nftData = {
                    id: `nft_${tokenId}`,
                    tokenId,
                    tokenType: 'agent',
                    linkedRecordId: agentId,
                    ownerAddress,
                    contractAddress: this.contractAddress,
                    blockchainNetwork: 'ethereum',
                    metadata: {
                        uri: metadataUri
                    },
                    mintedAt: firestore_1.Timestamp.now(),
                    transferHistory: [
                        {
                            fromAddress: '0x0000000000000000000000000000000000000000',
                            toAddress: ownerAddress,
                            transactionId: transactionHash,
                            timestamp: firestore_1.Timestamp.now()
                        }
                    ]
                };
                yield setDoc((0, firestore_1.doc)(db, 'nftTokens', nftData.id), nftData);
                // Update agent with NFT reference
                yield core_1.AgentService.updateAgentInstance(agentId, {
                    'metadata.nftTokenId': tokenId,
                    'metadata.nftContractAddress': this.contractAddress,
                    updatedAt: firestore_1.Timestamp.now()
                });
            }
            catch (error) {
                console.error('Error creating NFT record:', error);
                throw error;
            }
        });
    }
    /**
     * Update NFT record in Firestore
     */
    updateNFTRecord(tokenId, newOwnerAddress, transactionHash) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get NFT record
                const nftQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'nftTokens'), (0, firestore_1.where)('tokenId', '==', tokenId), (0, firestore_1.where)('contractAddress', '==', this.contractAddress));
                const querySnapshot = yield (0, firestore_1.getDocs)(nftQuery);
                if (querySnapshot.empty) {
                    throw new Error('NFT record not found');
                }
                const nftDoc = querySnapshot.docs[0];
                const nftData = nftDoc.data();
                // Update owner and transfer history
                const transferEvent = {
                    fromAddress: nftData.ownerAddress,
                    toAddress: newOwnerAddress,
                    transactionId: transactionHash,
                    timestamp: firestore_1.Timestamp.now()
                };
                yield updateDoc((0, firestore_1.doc)(db, 'nftTokens', nftDoc.id), {
                    ownerAddress: newOwnerAddress,
                    transferHistory: [...nftData.transferHistory, transferEvent],
                    updatedAt: firestore_1.Timestamp.now()
                });
                // Update agent owner if applicable
                if (nftData.linkedRecordId && nftData.tokenType === 'agent') {
                    const agentDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'agents', nftData.linkedRecordId));
                    if (agentDoc.exists()) {
                        // Determine owner type based on address pattern
                        // This is a simplified approach - in practice, you'd need a more robust system
                        const newOwnerType = newOwnerAddress.startsWith('org_') ? 'organization' : 'user';
                        const newOwnerId = yield this.resolveAddressToId(newOwnerAddress, newOwnerType);
                        // Update agent owner
                        yield core_1.AgentService.updateAgentInstance(nftData.linkedRecordId, {
                            ownerType: newOwnerType,
                            ownerId: newOwnerId,
                            'metadata.ownershipTransferred': true,
                            'metadata.previousOwner': {
                                ownerType: agentDoc.data().ownerType,
                                ownerId: agentDoc.data().ownerId
                            },
                            updatedAt: firestore_1.Timestamp.now()
                        });
                    }
                }
            }
            catch (error) {
                console.error('Error updating NFT record:', error);
                throw error;
            }
        });
    }
    /**
     * Resolve blockchain address to user/organization ID
     */
    resolveAddressToId(address, ownerType) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let collection = ownerType === 'user' ? 'users' : 'organizations';
                // Query for entity with matching blockchain address
                const entityQuery = (0, firestore_1.query)(collection(db, collection), (0, firestore_1.where)(ownerType === 'user' ? 'blockchainAddress' : 'blockchainVerification.address', '==', address));
                const querySnapshot = yield (0, firestore_1.getDocs)(entityQuery);
                if (querySnapshot.empty) {
                    throw new Error(`No ${ownerType} found with address ${address}`);
                }
                return querySnapshot.docs[0].id;
            }
            catch (error) {
                console.error('Error resolving address to ID:', error);
                throw error;
            }
        });
    }
}
exports.AgentNFTManager = AgentNFTManager;
// Multi-Agent Collaboration System
class MultiAgentCollaborationSystem {
    constructor() {
        this.orchestrationManager = AgentOrchestrationManager.getInstance();
    }
    /**
     * Create a multi-agent conversation
     */
    createMultiAgentConversation(title, initiatorType, initiatorId, agentIds) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate agents
                const agents = yield this.validateAgents(agentIds);
                if (agents.length === 0) {
                    throw new Error('No valid agents provided');
                }
                // Prepare participants
                const participants = [
                    { type: initiatorType, id: initiatorId },
                    ...agents.map(agent => ({ type: 'agent', id: agent.id }))
                ];
                // Create conversation
                const conversation = yield core_1.ConversationService.createConversation(title, initiatorType, initiatorId, participants);
                // Add metadata about the multi-agent setup
                yield updateDoc((0, firestore_1.doc)(db, 'conversations', conversation.id), {
                    'metadata.isMultiAgent': true,
                    'metadata.agentRoles': agents.map(agent => ({
                        agentId: agent.id,
                        agentType: agent.agentTypeId,
                        name: agent.name
                    }))
                });
                return conversation;
            }
            catch (error) {
                console.error('Error creating multi-agent conversation:', error);
                throw error;
            }
        });
    }
    /**
     * Process a message in a multi-agent conversation
     */
    processMultiAgentMessage(conversationId, message) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Get conversation data
                const conversationDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'conversations', conversationId));
                if (!conversationDoc.exists()) {
                    throw new Error('Conversation not found');
                }
                const conversation = conversationDoc.data();
                // Check if it's a multi-agent conversation
                if (!((_a = conversation.metadata) === null || _a === void 0 ? void 0 : _a.isMultiAgent)) {
                    throw new Error('Not a multi-agent conversation');
                }
                // Get agent participants
                const participantsQuery = (0, firestore_1.query)((0, firestore_1.collection)(db, 'conversations', conversationId, 'participants'), (0, firestore_1.where)('participantType', '==', 'agent'), (0, firestore_1.where)('status', '==', 'active'));
                const querySnapshot = yield (0, firestore_1.getDocs)(participantsQuery);
                const agentParticipants = querySnapshot.docs.map(doc => doc.data());
                // Process message with each agent
                const responses = [];
                for (const participant of agentParticipants) {
                    const agentId = participant.participantId;
                    // Determine if this agent should respond
                    // This could be based on roles, turn-taking, etc.
                    if (yield this.shouldAgentRespond(agentId, conversationId, message)) {
                        const response = yield this.orchestrationManager.processMessage(agentId, message, conversationId);
                        responses.push(response);
                    }
                }
                return responses;
            }
            catch (error) {
                console.error('Error processing multi-agent message:', error);
                throw error;
            }
        });
    }
    /**
     * Validate the provided agent IDs
     */
    validateAgents(agentIds) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const agents = [];
                for (const agentId of agentIds) {
                    const agent = yield core_1.AgentService.getAgentById(agentId);
                    if (agent && agent.status === 'active') {
                        agents.push(agent);
                    }
                }
                return agents;
            }
            catch (error) {
                console.error('Error validating agents:', error);
                return [];
            }
        });
    }
    /**
     * Determine if an agent should respond to a message
     */
    shouldAgentRespond(agentId, conversationId, message) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // Get conversation metadata
                const conversationDoc = yield (0, firestore_1.getDoc)((0, firestore_1.doc)(db, 'conversations', conversationId));
                if (!conversationDoc.exists()) {
                    return false;
                }
                const conversation = conversationDoc.data();
                // Get agent role
                const agentRole = (_b = (_a = conversation.metadata) === null || _a === void 0 ? void 0 : _a.agentRoles) === null || _b === void 0 ? void 0 : _b.find((role) => role.agentId === agentId);
                if (!agentRole) {
                    return false;
                }
                // Get agent
                const agent = yield core_1.AgentService.getAgentById(agentId);
                if (!agent || agent.status !== 'active') {
                    return false;
                }
                // Determine response strategy based on agent type
                switch (agent.agentTypeId) {
                    case types_1.PilotType.DR_MATCH_PILOT:
                        // Dr. Match responds to messages with networking keywords
                        return this.containsMatchKeywords(message.content);
                    case types_1.PilotType.DR_LUCIA_PILOT:
                        // Dr. Lucy responds to messages with visualization/dream keywords
                        return this.containsLucyKeywords(message.content);
                    case types_1.PilotType.DR_MARIA_HISTORICAL_01:
                    case types_1.PilotType.DR_MARIA_HISTORICAL_02:
                    case types_1.PilotType.DR_MARIA_HISTORICAL_03:
                        // Dr. Maria responds to messages with language/cultural keywords
                        return this.containsMariaKeywords(message.content);
                    case types_1.PilotType.DR_MEMORIA_PILOT:
                        // Dr. Memoria responds to messages with memory keywords
                        return this.containsMemoriaKeywords(message.content);
                    default:
                        // Default to responding
                        return true;
                }
            }
            catch (error) {
                console.error('Error determining if agent should respond:', error);
                return false;
            }
        });
    }
    /**
     * Check if message contains Dr. Match keywords
     */
    containsMatchKeywords(content) {
        const keywords = [
            'network', 'connection', 'linkedin', 'profile', 'professional',
            'contact', 'job', 'career', 'opportunity', 'recommendation'
        ];
        return this.containsKeywords(content, keywords);
    }
    /**
     * Check if message contains Dr. Lucy keywords
     */
    containsLucyKeywords(content) {
        const keywords = [
            'dream', 'visualization', 'image', 'picture', 'visual',
            'imagine', 'see', 'vision', 'creativity', 'creative'
        ];
        return this.containsKeywords(content, keywords);
    }
    /**
     * Check if message contains Dr. Maria keywords
     */
    containsMariaKeywords(content) {
        const keywords = [
            'language', 'translate', 'culture', 'cultural', 'international',
            'global', 'localize', 'region', 'country', 'foreign'
        ];
        return this.containsKeywords(content, keywords);
    }
    /**
     * Check if message contains Dr. Memoria keywords
     */
    containsMemoriaKeywords(content) {
        const keywords = [
            'memory', 'remember', 'recall', 'store', 'save',
            'archive', 'record', 'history', 'past', 'journal'
        ];
        return this.containsKeywords(content, keywords);
    }
    /**
     * Check if content contains any of the keywords
     */
    containsKeywords(content, keywords) {
        const lowerContent = content.toLowerCase();
        return keywords.some(keyword => lowerContent.includes(keyword.toLowerCase()));
    }
}
exports.MultiAgentCollaborationSystem = MultiAgentCollaborationSystem;
// Export all orchestration classes
exports.default = {
    AgentExecutionMiddleware,
    AgentOrchestrationManager,
    AgentNFTManager,
    MultiAgentCollaborationSystem
};
