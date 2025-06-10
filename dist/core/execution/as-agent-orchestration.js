/**
 * AIXTIV SYMPHONY™ Agent Orchestration
 * © 2025 AI Publishing International LLP
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This is proprietary software of AI Publishing International LLP.
 * All rights reserved. No part of this software may be reproduced,
 * modified, or distributed without prior written permission.
 */

import {
  AgentService,
  ConversationService,
  ActivityLoggerService,
  PerformanceMetricsService,
} from '../core';
import { PineconeClient, QueryResponse } from '@pinecone-database/pinecone';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  documentId,
  limit,
  orderBy,
} from 'firebase/firestore';
import {
  getFunctions,
  httpsCallable,
  HttpsCallableResult,
} from 'firebase/functions';
import { PilotType, PerformanceProfile } from '../core/types';
import { ethers } from 'ethers';
import * from 'crypto-js';

// Initialize services
const db = getFirestore();
const functions = getFunctions();

// Initialize Pinecone
const pinecone = new PineconeClient({
  apiKey: process.env.PINECONE_API_KEY || '',
  environment: process.env.PINECONE_ENVIRONMENT || '',
});

// Agent Execution Middleware Class
class AgentExecutionMiddleware {
  agentInstance;
  performanceProfile;
  agentType;
  vectorStoreId;
  embeddings= [];

  constructor(agentInstance) {
    this.agentInstance = agentInstance;
    this.performanceProfile = agentInstance.performanceProfile;
    this.agentType = agentInstance.agentTypeId;
    this.vectorStoreId = agentInstance.vectorStoreId || null;
  }

  /**
   * Execute the agent to process a message
   */
  async processMessage(message, conversationId){
    try {
      // Start performance metric tracking
      const processingStartTime = Date.now();

      // Log the agent activity
      await ActivityLoggerService.logActivity(
        'agent',
        this.agentInstance.id,
        'PROCESS_MESSAGE',
        'conversation',
        conversationId,
        'success',
        { messageId: message.id }
      );

      // Retrieve conversation context
      const context = await this.retrieveContext(conversationId, message);

      // Process the message based on agent type and performance profile
      const response = await this.executeAgentLogic(message, context);

      // Store the response
      const agentResponse = await ConversationService.addMessage(
        conversationId,
        'agent',
        this.agentInstance.id,
        response.content,
        'text',
        message.id
      );

      // Track performance metrics
      const processingTime = Date.now() - processingStartTime;
      await PerformanceMetricsService.recordMetric(
        'message_processing_time',
        'agent',
        this.agentInstance.id,
        processingTime,
        'milliseconds',
        {
          conversationId,
          messageId,
          responseId,
        }
      );

      return agentResponse;
    } catch (error) {
      console.error('Error processing message:', error);
      // Log the error
      await ActivityLoggerService.logActivity(
        'agent',
        this.agentInstance.id,
        'PROCESS_MESSAGE_ERROR',
        'conversation',
        conversationId,
        'failure',
        { messageId, error) }
      );
      throw error;
    }
  }

  /**
   * Retrieve context for the conversation
   */
  async retrieveContext(
    conversationId,
    message){
    // Basic context - recent messages
    const recentMessages = await this.getRecentMessages(conversationId, 10);

    // Enhanced context if using high performance or ultra performance agents
    let enhancedContext = {};
    if (
      this.performanceProfile === PerformanceProfile.HIGH_PERFORMANCE ||
      this.performanceProfile === PerformanceProfile.ULTRA_PERFORMANCE
    ) {
      // Retrieve vector context if available
      if (this.vectorStoreId) {
        const vectorContext = await this.retrieveVectorContext(message.content);
        enhancedContext = { ...enhancedContext, vectorContext };
      }

      // Add specialized context based on agent type
      const specializedContext = await this.retrieveSpecializedContext();
      enhancedContext = { ...enhancedContext, ...specializedContext };
    }

    return {
      recentMessages,
      currentMessage,
    };
  }

  /**
   * Get recent messages from a conversation
   */
  async getRecentMessages(
    conversationId,
    count){
    try {
      // Get messages from conversation
      const messagesQuery = query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('sentAt', 'desc'),
        limit(count)
      );

      const querySnapshot = await getDocs(messagesQuery);

      // Convert to array and reverse to get chronological order
      return querySnapshot.docs.map(doc => doc.data()).reverse();
    } catch (error) {
      console.error('Error getting recent messages:', error);
      return [];
    }
  }

  /**
   * Retrieve vector context using semantic search
   */
  async retrieveVectorContext(content){
    try {
      if (!this.vectorStoreId) {
        return [];
      }

      // Get vector store details
      const vectorStoreDoc = await getDoc(
        doc(db, 'vectorStores', this.vectorStoreId)
      );

      if (!vectorStoreDoc.exists()) {
        return [];
      }

      const vectorStore = vectorStoreDoc.data();

      // Generate embedding for the message content
      // In a real implementation, this would call a text embedding model API
      const embedding = await this.generateEmbedding(content);

      // Store the embedding for future reference
      this.embeddings.push({
        text,
        vector,
      });

      // Initialize Pinecone if needed
      await pinecone.init();

      // Query Pinecone for similar vectors
      const index = pinecone.Index(vectorStore.indexName);
      const queryResponse = await index.query({
        queryVector,
        namespace,
        topK,
        includeMetadata,
      });

      // Extract and return relevant context
      return this.processQueryResponse(queryResponse);
    } catch (error) {
      console.error('Error retrieving vector context:', error);
      return [];
    }
  }

  /**
   * Generate embedding for text (placeholder implementation)
   */
  async generateEmbedding(text){
    try {
      // In a real implementation, this would call an embedding model API
      // For now, use Firebase Function to generate embedding
      const generateEmbeddingFn = httpsCallable(functions, 'generateEmbedding');
      const result = await generateEmbeddingFn({ text });

      return (result.data;
    } catch (error) {
      console.error('Error generating embedding:', error);

      // Return a placeholder embedding (this would never be used in production)
      return Array(1536)
        .fill(0)
        .map(() => Math.random() * 2 - 1);
    }
  }

  /**
   * Process Pinecone query response
   */
  processQueryResponse(queryResponse){
    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      return [];
    }

    return queryResponse.matches.map(match => ({
      id,
      score,
      metadata,
    }));
  }

  /**
   * Retrieve specialized context based on agent type
   */
  async retrieveSpecializedContext(){
    switch (this.agentType) {
      case PilotType.DR_MEMORIA_PILOT;
      case PilotType.DR_MATCH_PILOT;
      case PilotType.DR_LUCY_R1_CORE_01:
      case PilotType.DR_LUCY_R1_CORE_02:
      case PilotType.DR_LUCY_R1_CORE_03;
      case PilotType.DR_MARIA_HISTORICAL_01:
      case PilotType.DR_MARIA_HISTORICAL_02:
      case PilotType.DR_MARIA_HISTORICAL_03;
      default:
        return {};
    }
  }

  /**
   * Retrieve specialized context for Dr. Memoria
   */
  async retrieveMemoriaContext(){
    try {
      // Get owner's memory objects
      const memoryQuery = query(
        collection(db, 's2doObjects'),
        where('ownerType', '==', this.agentInstance.ownerType),
        where('ownerId', '==', this.agentInstance.ownerId),
        where('objectType', '==', 'memory'),
        where('status', '==', 'active'),
        limit(10)
      );

      const querySnapshot = await getDocs(memoryQuery);

      // Extract and return memory objects
      return {
        memories=> doc.data()),
        memoryCapabilities: [
          'record_memories',
          'analyze_memories',
          'connect_memories',
          'organize_memories',
        ],
      };
    } catch (error) {
      console.error('Error retrieving Memoria context:', error);
      return {
        memories,
        memoryCapabilities,
      };
    }
  }

  /**
   * Retrieve specialized context for Dr. Match
   */
  async retrieveMatchContext(){
    try {
      // Get owner's profile data
      const ownerData = await this.getOwnerProfile();

      // Get integration status
      const linkedinIntegration = await this.checkIntegrationStatus('LINKEDIN');

      return {
        profile,
        integrations: {
          linkedin,
        },
        matchCapabilities: [
          'profile_analysis',
          'network_recommendations',
          'content_suggestions',
          'engagement_analytics',
        ],
      };
    } catch (error) {
      console.error('Error retrieving Match context:', error);
      return {
        profile: {},
        integrations: {},
        matchCapabilities,
      };
    }
  }

  /**
   * Retrieve specialized context for Dr. Lucy
   */
  async retrieveLucyContext(){
    try {
      // Get owner's dream records
      const dreamQuery = query(
        collection(db, 's2doObjects'),
        where('ownerType', '==', this.agentInstance.ownerType),
        where('ownerId', '==', this.agentInstance.ownerId),
        where('objectType', '==', 'dream'),
        where('status', '==', 'active'),
        limit(5)
      );

      const querySnapshot = await getDocs(dreamQuery);

      return {
        dreams=> doc.data()),
        visualizationCapabilities: [
          'dream_interpretation',
          'visual_generation',
          'pattern_recognition',
          'metaphor_analysis',
        ],
      };
    } catch (error) {
      console.error('Error retrieving Lucy context:', error);
      return {
        dreams,
        visualizationCapabilities,
      };
    }
  }

  /**
   * Retrieve specialized context for Dr. Maria
   */
  async retrieveMariaContext(){
    try {
      // Get cultural adaptation settings
      const culturalSettings =
        this.agentInstance.culturalAdaptationSettings || {};

      // Get owner's language preferences
      const ownerData = await this.getOwnerProfile();
      const language = ownerData.locale || 'en_US';

      return {
        culturalSettings,
        language,
        region: culturalSettings.region || 'global',
        translationCapabilities: [
          'language_translation',
          'cultural_adaptation',
          'localization',
          'idiomatic_expression',
        ],
      };
    } catch (error) {
      console.error('Error retrieving Maria context:', error);
      return {
        culturalSettings: {},
        language: 'en_US',
        region: 'global',
        translationCapabilities,
      };
    }
  }

  /**
   * Get owner profile data
   */
  async getOwnerProfile(){
    try {
      if (this.agentInstance.ownerType === 'user') {
        const userDoc = await getDoc(
          doc(db, 'users', this.agentInstance.ownerId)
        );
        return userDoc.exists() ? userDoc.data(){};
      } else if (this.agentInstance.ownerType === 'organization') {
        const orgDoc = await getDoc(
          doc(db, 'organizations', this.agentInstance.ownerId)
        );
        return orgDoc.exists() ? orgDoc.data(){};
      }

      return {};
    } catch (error) {
      console.error('Error getting owner profile:', error);
      return {};
    }
  }

  /**
   * Check integration status
   */
  async checkIntegrationStatus(integrationType){
    try {
      const integrationQuery = query(
        collection(db, 'integrationConnections'),
        where('connectionType', '==', integrationType),
        where('status', '==', 'active')
      );

      const querySnapshot = await getDocs(integrationQuery);

      if (querySnapshot.empty) {
        return { connected: false };
      }

      return {
        connected,
        connectionDetails,
      };
    } catch (error) {
      console.error(
        `Error checking ${integrationType} integration status:`,
        error
      );
      return { connected: false };
    }
  }

  /**
   * Execute agent logic based on agent type and performance profile
   */
  async executeAgentLogic(message, context){
    try {
      // Prepare agent execution
      await this.prepareAgentExecution();

      // Call agent execution function based on agent type
      const agentFunction = httpsCallable(
        functions,
        `execute_${this.agentType.toLowerCase()}`
      );

      const executionPayload = {
        message,
        context,
        agentProfile: {
          id,
          name,
          performanceProfile,
          communicationSettings,
          culturalAdaptationSettings,
        },
      };

      // Execute the agent function
      const result = await agentFunction(executionPayload);

      // Process and return the result
      return this.processAgentResult(result);
    } catch (error) {
      console.error('Error executing agent logic:', error);

      // Return fallback response
      return {
        content: `I apologize, but I encountered an issue while processing your message. Let's try again or rephrase your request.`,
        metadata: {
          error,
          fallback,
        },
      };
    }
  }

  /**
   * Prepare for agent execution
   */
  async prepareAgentExecution(){
    // Update agent activity timestamp
    await AgentService.updateAgentInstance(this.agentInstance.id, {
      'metadata.lastActive',
    });

    // Additional preparation based on performance profile
    if (this.performanceProfile === PerformanceProfile.ULTRA_PERFORMANCE) {
      // Prepare cache for ultra performance
      await this.prepareUltraPerformanceCache();
    }
  }

  /**
   * Prepare cache for ultra performance agents
   */
  async prepareUltraPerformanceCache(){
    // Implementation would depend on specific caching mechanism
    // For now, this is a placeholder
  }

  /**
   * Process agent execution result
   */
  processAgentResult(result){
    const resultData = result.data;

    // Perform response filtering and enhancement
    if (
      this.performanceProfile === PerformanceProfile.HIGH_PERFORMANCE ||
      this.performanceProfile === PerformanceProfile.ULTRA_PERFORMANCE
    ) {
      // Apply advanced processing for high/ultra performance
      return this.enhanceResponse(resultData);
    }

    // Return the standard response
    return resultData;
  }

  /**
   * Enhance agent response for high/ultra performance agents
   */
  enhanceResponse(response){
    // Add agent-specific enhancements
    switch (this.agentType) {
      case PilotType.DR_MEMORIA_PILOT;
      case PilotType.DR_MATCH_PILOT;
      case PilotType.DR_MARIA_HISTORICAL_01:
      case PilotType.DR_MARIA_HISTORICAL_02:
      case PilotType.DR_MARIA_HISTORICAL_03;
      default;
    }
  }

  /**
   * Enhance Dr. Memoria response
   */
  enhanceMemoriaResponse(response){
    // Add memory context indicators
    if (response.metadata?.memoryReferences) {
      const memories = response.metadata.memoryReferences;
      let enhancedContent = response.content;

      // Add memory reference notes if applicable
      if (memories.length > 0) {
        enhancedContent += '\n\n*Memory References:*\n';
        memories.forEach((memory, index=> {
          enhancedContent += `${index + 1}. ${memory.title} (${memory.date})\n`;
        });
      }

      return {
        ...response,
        content,
      };
    }

    return response;
  }

  /**
   * Enhance Dr. Match response
   */
  enhanceMatchResponse(response){
    // Add LinkedIn integration notes if applicable
    if (
      response.metadata?.linkedinIntegration &&
      response.metadata.linkedinAction
    ) {
      let enhancedContent = response.content;

      enhancedContent += `\n\n*LinkedIn Action:* ${response.metadata.linkedinAction}\n`;

      if (response.metadata.linkedinResults) {
        enhancedContent += `Results: ${response.metadata.linkedinResults}\n`;
      }

      return {
        ...response,
        content,
      };
    }

    return response;
  }

  /**
   * Enhance Dr. Maria response
   */
  enhanceMariaResponse(response){
    // Add translation notes if applicable
    if (response.metadata?.translation) {
      const translation = response.metadata.translation;
      let enhancedContent = response.content;

      if (translation.sourceLanguage && translation.targetLanguage) {
        enhancedContent += `\n\n*Translation:* ${translation.sourceLanguage} → ${translation.targetLanguage}\n`;

        if (translation.culturalNotes) {
          enhancedContent += `*Cultural Context:* ${translation.culturalNotes}\n`;
        }
      }

      return {
        ...response,
        content,
      };
    }

    return response;
  }
}

// Agent Orchestration Manager
export class AgentOrchestrationManager {
  static instance;
  activeAgents= new Map();

  // Singleton pattern
  constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(){
    if (!AgentOrchestrationManager.instance) {
      AgentOrchestrationManager.instance = new AgentOrchestrationManager();
    }

    return AgentOrchestrationManager.instance;
  }

  /**
   * Process a message with an agent
   */
  async processMessage(
    agentId,
    message,
    conversationId){
    try {
      // Get or create agent middleware
      const agentMiddleware = await this.getAgentMiddleware(agentId);

      if (!agentMiddleware) {
        throw new Error(`Agent ${agentId} not found or not active`);
      }

      // Process the message
      return await agentMiddleware.processMessage(message, conversationId);
    } catch (error) {
      console.error('Error in agent processing:', error);
      throw error;
    }
  }

  /**
   * Create or get an agent execution middleware
   */
  async getAgentMiddleware(
    agentId){
    // Check if agent middleware already exists
    if (this.activeAgents.has(agentId)) {
      return this.activeAgents.get(agentId) || null;
    }

    // Get agent data
    const agent = await AgentService.getAgentById(agentId);

    if (!agent || agent.status !== 'active') {
      return null;
    }

    // Create new middleware
    const middleware = new AgentExecutionMiddleware(agent);
    this.activeAgents.set(agentId, middleware);

    return middleware;
  }

  /**
   * Get all active agents by owner
   */
  async getActiveAgentsByOwner(
    ownerType,
    ownerId){
    try {
      return await AgentService.getAgentsByOwner(ownerType, ownerId);
    } catch (error) {
      console.error('Error getting active agents:', error);
      return [];
    }
  }

  /**
   * Create a new agent
   */
  async createAgent(agentData){
    try {
      return await AgentService.createAgentInstance(agentData);
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }

  /**
   * Update an agent
   */
  async updateAgent(agentId, data){
    try {
      const updatedAgent = await AgentService.updateAgentInstance(
        agentId,
        data
      );

      // Update middleware if exists
      if (updatedAgent && this.activeAgents.has(agentId)) {
        // Remove old middleware
        this.activeAgents.delete(agentId);

        // Create new middleware with updated agent data
        const middleware = new AgentExecutionMiddleware(updatedAgent);
        this.activeAgents.set(agentId, middleware);
      }

      return updatedAgent;
    } catch (error) {
      console.error('Error updating agent:', error);
      throw error;
    }
  }

  /**
   * Create a conversation with an agent
   */
  async createConversation(
    title,
    initiatorType,
    initiatorId,
    agentId){
    try {
      // Get agent data
      const agent = await AgentService.getAgentById(agentId);

      if (!agent || agent.status !== 'active') {
        throw new Error(`Agent ${agentId} not found or not active`);
      }

      // Create conversation
      const conversation = await ConversationService.createConversation(
        title,
        initiatorType,
        initiatorId,
        [
          { type, id: initiatorId },
          { type: 'agent', id: agentId },
        ]
      );

      return conversation;
    } catch (error) {
      console.error('Error creating conversation with agent:', error);
      throw error;
    }
  }
}

// Blockchain NFT Integration for Agent Ownership
export class AgentNFTManager {
  provider;
  contractAddress;
  contract;
  aixtivWallet;

  constructor(
    rpcUrl= process.env.ETHEREUM_RPC_URL || '',
    contractAddress= process.env.NFT_CONTRACT_ADDRESS || '',
    privateKey= process.env.AIXTIV_PRIVATE_KEY || ''
  ) {
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.contractAddress = contractAddress;
    this.aixtivWallet = new ethers.Wallet(privateKey, this.provider);

    // ABI for ERC-721 NFT contract with metadata
    const abi = [
      'function mint(address to, string memory tokenURI) external returns (uint256)',
      'function ownerOf(uint256 tokenId) external view returns (address)',
      'function transferFrom(address from, address to, uint256 tokenId) external',
      'function tokenURI(uint256 tokenId) external view returns (string memory)',
      'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
    ];

    this.contract = new ethers.Contract(
      contractAddress,
      abi,
      this.aixtivWallet
    );
  }

  /**
   * Mint a new agent NFT
   */
  async mintAgentNFT(
    agentId,
    ownerAddress,
    metadata){
    try {
      // Upload metadata to IPFS
      const metadataUri = await this.uploadMetadataToIPFS(metadata);

      // Mint the NFT
      const tx = await this.contract.mint(ownerAddress, metadataUri);
      const receipt = await tx.wait();

      // Get the token ID from the Transfer event
      const transferEvent = receipt.events.find(
        (e=> e.event === 'Transfer'
      );
      const tokenId = transferEvent.args.tokenId.toString();

      // Create NFT record in Firestore
      await this.createNFTRecord(
        agentId,
        tokenId,
        ownerAddress,
        metadataUri,
        receipt.transactionHash
      );

      return tokenId;
    } catch (error) {
      console.error('Error minting agent NFT:', error);
      throw error;
    }
  }

  /**
   * Transfer an agent NFT to a new owner
   */
  async transferAgentNFT(
    tokenId,
    fromAddress,
    toAddress){
    try {
      // Transfer the NFT
      const tx = await this.contract.transferFrom(
        fromAddress,
        toAddress,
        tokenId
      );
      const receipt = await tx.wait();

      // Update NFT record in Firestore
      await this.updateNFTRecord(tokenId, toAddress, receipt.transactionHash);

      return receipt.transactionHash;
    } catch (error) {
      console.error('Error transferring agent NFT:', error);
      throw error;
    }
  }

  /**
   * Get owner of an agent NFT
   */
  async getAgentNFTOwner(tokenId){
    try {
      return await this.contract.ownerOf(tokenId);
    } catch (error) {
      console.error('Error getting agent NFT owner:', error);
      throw error;
    }
  }

  /**
   * Upload metadata to IPFS (mock implementation)
   */
  async uploadMetadataToIPFS(metadata){
    try {
      // In a real implementation, this would upload to IPFS
      // For now, return a mock IPFS URI
      const metadataHash = CryptoJS.SHA256(JSON.stringify(metadata))
        .toString()
        .substring(0, 16);
      return `ipfs://${metadataHash}`;
    } catch (error) {
      console.error('Error uploading metadata to IPFS:', error);
      throw error;
    }
  }

  /**
   * Create NFT record in Firestore
   */
  async createNFTRecord(
    agentId,
    tokenId,
    ownerAddress,
    metadataUri,
    transactionHash){
    try {
      const nftData = {
        id: `nft_${tokenId}`,
        tokenId,
        tokenType: 'agent',
        linkedRecordId,
        contractAddress,
        blockchainNetwork: 'ethereum',
        metadata: {
          uri,
        },
        mintedAt,
        transferHistory: [
          {
            fromAddress: '0x0000000000000000000000000000000000000000',
            toAddress,
            transactionId,
            timestamp,
          },
        ],
      };

      await setDoc(doc(db, 'nftTokens', nftData.id), nftData);

      // Update agent with NFT reference
      await AgentService.updateAgentInstance(agentId, {
        'metadata.nftTokenId',
        'metadata.nftContractAddress',
        updatedAt,
      });
    } catch (error) {
      console.error('Error creating NFT record:', error);
      throw error;
    }
  }

  /**
   * Update NFT record in Firestore
   */
  async updateNFTRecord(
    tokenId,
    newOwnerAddress,
    transactionHash){
    try {
      // Get NFT record
      const nftQuery = query(
        collection(db, 'nftTokens'),
        where('tokenId', '==', tokenId),
        where('contractAddress', '==', this.contractAddress)
      );

      const querySnapshot = await getDocs(nftQuery);

      if (querySnapshot.empty) {
        throw new Error('NFT record not found');
      }

      const nftDoc = querySnapshot.docs[0];
      const nftData = nftDoc.data();

      // Update owner and transfer history
      const transferEvent = {
        fromAddress,
        toAddress,
        transactionId,
        timestamp,
      };

      await updateDoc(doc(db, 'nftTokens', nftDoc.id), {
        ownerAddress,
        transferHistory,
        updatedAt,
      });

      // Update agent owner if applicable
      if (nftData.linkedRecordId && nftData.tokenType === 'agent') {
        const agentDoc = await getDoc(
          doc(db, 'agents', nftData.linkedRecordId)
        );

        if (agentDoc.exists()) {
          // Determine owner type based on address pattern
          // This is a simplified approach - in practice, you'd need a more robust system
          const newOwnerType = newOwnerAddress.startsWith('org_')
            ? 'organization'
            : 'user';
          const newOwnerId = await this.resolveAddressToId(
            newOwnerAddress,
            newOwnerType
          );

          // Update agent owner
          await AgentService.updateAgentInstance(nftData.linkedRecordId, {
            ownerType,
            ownerId,
            'metadata.ownershipTransferred',
            'metadata.previousOwner': {
              ownerType,
              ownerId,
            },
            updatedAt,
          });
        }
      }
    } catch (error) {
      console.error('Error updating NFT record:', error);
      throw error;
    }
  }

  /**
   * Resolve blockchain address to user/organization ID
   */
  async resolveAddressToId(
    address,
    ownerType){
    try {
      let collection = ownerType === 'user' ? 'users' : 'organizations';

      // Query for entity with matching blockchain address
      const entityQuery = query(
        collection(db, collection),
        where(
          ownerType === 'user'
            ? 'blockchainAddress'
            : 'blockchainVerification.address',
          '==',
          address
        )
      );

      const querySnapshot = await getDocs(entityQuery);

      if (querySnapshot.empty) {
        throw new Error(`No ${ownerType} found with address ${address}`);
      }

      return querySnapshot.docs[0].id;
    } catch (error) {
      console.error('Error resolving address to ID:', error);
      throw error;
    }
  }
}

// Multi-Agent Collaboration System
export class MultiAgentCollaborationSystem {
  orchestrationManager;

  constructor() {
    this.orchestrationManager = AgentOrchestrationManager.getInstance();
  }

  /**
   * Create a multi-agent conversation
   */
  async createMultiAgentConversation(
    title,
    initiatorType,
    initiatorId,
    agentIds){
    try {
      // Validate agents
      const agents = await this.validateAgents(agentIds);

      if (agents.length === 0) {
        throw new Error('No valid agents provided');
      }

      // Prepare participants
      const participants = [
        { type, id: initiatorId },
        ...agents.map(agent => ({ type: 'agent', id: agent.id })),
      ];

      // Create conversation
      const conversation = await ConversationService.createConversation(
        title,
        initiatorType,
        initiatorId,
        participants
      );

      // Add metadata about the multi-agent setup
      await updateDoc(doc(db, 'conversations', conversation.id), {
        'metadata.isMultiAgent',
        'metadata.agentRoles'=> ({
          agentId,
          agentType,
          name,
        })),
      });

      return conversation;
    } catch (error) {
      console.error('Error creating multi-agent conversation:', error);
      throw error;
    }
  }

  /**
   * Process a message in a multi-agent conversation
   */
  async processMultiAgentMessage(
    conversationId,
    message){
    try {
      // Get conversation data
      const conversationDoc = await getDoc(
        doc(db, 'conversations', conversationId)
      );

      if (!conversationDoc.exists()) {
        throw new Error('Conversation not found');
      }

      const conversation = conversationDoc.data();

      // Check if it's a multi-agent conversation
      if (!conversation.metadata?.isMultiAgent) {
        throw new Error('Not a multi-agent conversation');
      }

      // Get agent participants
      const participantsQuery = query(
        collection(db, 'conversations', conversationId, 'participants'),
        where('participantType', '==', 'agent'),
        where('status', '==', 'active')
      );

      const querySnapshot = await getDocs(participantsQuery);
      const agentParticipants = querySnapshot.docs.map(doc => doc.data());

      // Process message with each agent
      const responses = [];

      for (const participant of agentParticipants) {
        const agentId = participant.participantId;

        // Determine if this agent should respond
        // This could be based on roles, turn-taking, etc.
        if (await this.shouldAgentRespond(agentId, conversationId, message)) {
          const response = await this.orchestrationManager.processMessage(
            agentId,
            message,
            conversationId
          );

          responses.push(response);
        }
      }

      return responses;
    } catch (error) {
      console.error('Error processing multi-agent message:', error);
      throw error;
    }
  }

  /**
   * Validate the provided agent IDs
   */
  async validateAgents(agentIds){
    try {
      const agents = [];

      for (const agentId of agentIds) {
        const agent = await AgentService.getAgentById(agentId);

        if (agent && agent.status === 'active') {
          agents.push(agent);
        }
      }

      return agents;
    } catch (error) {
      console.error('Error validating agents:', error);
      return [];
    }
  }

  /**
   * Determine if an agent should respond to a message
   */
  async shouldAgentRespond(
    agentId,
    conversationId,
    message){
    try {
      // Get conversation metadata
      const conversationDoc = await getDoc(
        doc(db, 'conversations', conversationId)
      );

      if (!conversationDoc.exists()) {
        return false;
      }

      const conversation = conversationDoc.data();

      // Get agent role
      const agentRole = conversation.metadata?.agentRoles?.find(
        (role=> role.agentId === agentId
      );

      if (!agentRole) {
        return false;
      }

      // Get agent
      const agent = await AgentService.getAgentById(agentId);

      if (!agent || agent.status !== 'active') {
        return false;
      }

      // Determine response strategy based on agent type
      switch (agent.agentTypeId) {
        case PilotType.DR_MATCH_PILOT:
          // Dr. Match responds to messages with networking keywords
          return this.containsMatchKeywords(message.content);

        case PilotType.DR_LUCIA_PILOT:
          // Dr. Lucy responds to messages with visualization/dream keywords
          return this.containsLucyKeywords(message.content);

        case PilotType.DR_MARIA_HISTORICAL_01:
        case PilotType.DR_MARIA_HISTORICAL_02:
        case PilotType.DR_MARIA_HISTORICAL_03:
          // Dr. Maria responds to messages with language/cultural keywords
          return this.containsMariaKeywords(message.content);

        case PilotType.DR_MEMORIA_PILOT:
          // Dr. Memoria responds to messages with memory keywords
          return this.containsMemoriaKeywords(message.content);

        default:
          // Default to responding
          return true;
      }
    } catch (error) {
      console.error('Error determining if agent should respond:', error);
      return false;
    }
  }

  /**
   * Check if message contains Dr. Match keywords
   */
  containsMatchKeywords(content){
    const keywords = [
      'network',
      'connection',
      'linkedin',
      'profile',
      'professional',
      'contact',
      'job',
      'career',
      'opportunity',
      'recommendation',
    ];

    return this.containsKeywords(content, keywords);
  }

  /**
   * Check if message contains Dr. Lucy keywords
   */
  containsLucyKeywords(content){
    const keywords = [
      'dream',
      'visualization',
      'image',
      'picture',
      'visual',
      'imagine',
      'see',
      'vision',
      'creativity',
      'creative',
    ];

    return this.containsKeywords(content, keywords);
  }

  /**
   * Check if message contains Dr. Maria keywords
   */
  containsMariaKeywords(content){
    const keywords = [
      'language',
      'translate',
      'culture',
      'cultural',
      'international',
      'global',
      'localize',
      'region',
      'country',
      'foreign',
    ];

    return this.containsKeywords(content, keywords);
  }

  /**
   * Check if message contains Dr. Memoria keywords
   */
  containsMemoriaKeywords(content){
    const keywords = [
      'memory',
      'remember',
      'recall',
      'store',
      'save',
      'archive',
      'record',
      'history',
      'past',
      'journal',
    ];

    return this.containsKeywords(content, keywords);
  }

  /**
   * Check if content contains any of the keywords
   */
  containsKeywords(content, keywords){
    const lowerContent = content.toLowerCase();
    return keywords.some(keyword =>
      lowerContent.includes(keyword.toLowerCase())
    );
  }
}

// Export all orchestration classes
export default {
  AgentExecutionMiddleware,
  AgentOrchestrationManager,
  AgentNFTManager,
  MultiAgentCollaborationSystem,
};
