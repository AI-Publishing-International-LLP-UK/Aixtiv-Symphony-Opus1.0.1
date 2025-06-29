/**
 * AIXTIV SYMPHONY™ Agent Orchestration
 * © 2025 AI Publishing International LLP
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * This is proprietary software of AI Publishing International LLP.
 * All rights reserved. No part of this software may be reproduced,
 * modified, or distributed without prior written permission.
 */

import { AgentService, ConversationService, ActivityLoggerService, PerformanceMetricsService } from '../core';
import { PineconeClient, QueryResponse } from '@pinecone-database/pinecone';
import { getFirestore, collection, doc, getDoc, getDocs, query, where, Timestamp, documentId, limit, orderBy } from 'firebase/firestore';
import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { PilotType, PerformanceProfile } from '../core/types';
import { ethers } from 'ethers';
import * as CryptoJS from 'crypto-js';

// Initialize services
const db = getFirestore();
const functions = getFunctions();

// Initialize Pinecone
const pinecone = new PineconeClient({
  apiKey: process.env.PINECONE_API_KEY || '',
  environment: process.env.PINECONE_ENVIRONMENT || ''
});

// Agent Execution Middleware Class
class AgentExecutionMiddleware {
  private agentInstance: any;
  private performanceProfile: PerformanceProfile;
  private agentType: string;
  private vectorStoreId: string | null;
  private embeddings: any[] = [];

  constructor(agentInstance: any) {
    this.agentInstance = agentInstance;
    this.performanceProfile = agentInstance.performanceProfile;
    this.agentType = agentInstance.agentTypeId;
    this.vectorStoreId = agentInstance.vectorStoreId || null;
  }

  /**
   * Execute the agent to process a message
   */
  async processMessage(message: any, conversationId: string): Promise<any> {
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
          messageId: message.id,
          responseId: agentResponse.id
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
        { messageId: message.id, error: error.toString() }
      );
      throw error;
    }
  }

  /**
   * Retrieve context for the conversation
   */
  private async retrieveContext(conversationId: string, message: any): Promise<any> {
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
      currentMessage: message,
      ...enhancedContext
    };
  }

  /**
   * Get recent messages from a conversation
   */
  private async getRecentMessages(conversationId: string, count: number): Promise<any[]> {
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
  private async retrieveVectorContext(content: string): Promise<any[]> {
    try {
      if (!this.vectorStoreId) {
        return [];
      }
      
      // Get vector store details
      const vectorStoreDoc = await getDoc(doc(db, 'vectorStores', this.vectorStoreId));
      
      if (!vectorStoreDoc.exists()) {
        return [];
      }
      
      const vectorStore = vectorStoreDoc.data();
      
      // Generate embedding for the message content
      // In a real implementation, this would call a text embedding model API
      const embedding = await this.generateEmbedding(content);
      
      // Store the embedding for future reference
      this.embeddings.push({
        text: content,
        vector: embedding
      });
      
      // Initialize Pinecone if needed
      await pinecone.init();
      
      // Query Pinecone for similar vectors
      const index = pinecone.Index(vectorStore.indexName);
      const queryResponse = await index.query({
        queryVector: embedding,
        namespace: vectorStore.namespace,
        topK: 5,
        includeMetadata: true
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
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // In a real implementation, this would call an embedding model API
      // For now, use Firebase Function to generate embedding
      const generateEmbeddingFn = httpsCallable(functions, 'generateEmbedding');
      const result = await generateEmbeddingFn({ text });
      
      return (result.data as any).embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      
      // Return a placeholder embedding (this would never be used in production)
      return Array(1536).fill(0).map(() => Math.random() * 2 - 1);
    }
  }

  /**
   * Process Pinecone query response
   */
  private processQueryResponse(queryResponse: QueryResponse): any[] {
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
  private async retrieveSpecializedContext(): Promise<any> {
    switch (this.agentType) {
      case PilotType.DR_MEMORIA_PILOT:
        return this.retrieveMemoriaContext();
      case PilotType.DR_MATCH_PILOT:
        return this.retrieveMatchContext();
      case PilotType.DR_LUCY_R1_CORE_01:
      case PilotType.DR_LUCY_R1_CORE_02:
      case PilotType.DR_LUCY_R1_CORE_03:
        return this.retrieveLucyContext();
      case PilotType.DR_MARIA_HISTORICAL_01:
      case PilotType.DR_MARIA_HISTORICAL_02:
      case PilotType.DR_MARIA_HISTORICAL_03:
        return this.retrieveMariaContext();
      default:
        return {};
    }
  }

  /**
   * Retrieve specialized context for Dr. Memoria
   */
  private async retrieveMemoriaContext(): Promise<any> {
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
        memories: querySnapshot.docs.map(doc => doc.data()),
        memoryCapabilities: [
          'record_memories',
          'analyze_memories',
          'connect_memories',
          'organize_memories'
        ]
      };
    } catch (error) {
      console.error('Error retrieving Memoria context:', error);
      return {
        memories: [],
        memoryCapabilities: []
      };
    }
  }

  /**
   * Retrieve specialized context for Dr. Match
   */
  private async retrieveMatchContext(): Promise<any> {
    try {
      // Get owner's profile data
      const ownerData = await this.getOwnerProfile();
      
      // Get integration status
      const linkedinIntegration = await this.checkIntegrationStatus('LINKEDIN');
      
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
    } catch (error) {
      console.error('Error retrieving Match context:', error);
      return {
        profile: {},
        integrations: {},
        matchCapabilities: []
      };
    }
  }

  /**
   * Retrieve specialized context for Dr. Lucy
   */
  private async retrieveLucyContext(): Promise<any> {
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
        dreams: querySnapshot.docs.map(doc => doc.data()),
        visualizationCapabilities: [
          'dream_interpretation',
          'visual_generation',
          'pattern_recognition',
          'metaphor_analysis'
        ]
      };
    } catch (error) {
      console.error('Error retrieving Lucy context:', error);
      return {
        dreams: [],
        visualizationCapabilities: []
      };
    }
  }

  /**
   * Retrieve specialized context for Dr. Maria
   */
  private async retrieveMariaContext(): Promise<any> {
    try {
      // Get cultural adaptation settings
      const culturalSettings = this.agentInstance.culturalAdaptationSettings || {};
      
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
          'idiomatic_expression'
        ]
      };
    } catch (error) {
      console.error('Error retrieving Maria context:', error);
      return {
        culturalSettings: {},
        language: 'en_US',
        region: 'global',
        translationCapabilities: []
      };
    }
  }

  /**
   * Get owner profile data
   */
  private async getOwnerProfile(): Promise<any> {
    try {
      if (this.agentInstance.ownerType === 'user') {
        const userDoc = await getDoc(doc(db, 'users', this.agentInstance.ownerId));
        return userDoc.exists() ? userDoc.data() : {};
      } else if (this.agentInstance.ownerType === 'organization') {
        const orgDoc = await getDoc(doc(db, 'organizations', this.agentInstance.ownerId));
        return orgDoc.exists() ? orgDoc.data() : {};
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
  private async checkIntegrationStatus(integrationType: string): Promise<any> {
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
        connected: true,
        connectionDetails: querySnapshot.docs[0].data()
      };
    } catch (error) {
      console.error(`Error checking ${integrationType} integration status:`, error);
      return { connected: false };
    }
  }

  /**
   * Execute agent logic based on agent type and performance profile
   */
  private async executeAgentLogic(message: any, context: any): Promise<any> {
    try {
      // Prepare agent execution
      await this.prepareAgentExecution();
      
      // Call agent execution function based on agent type
      const agentFunction = httpsCallable(functions, `execute_${this.agentType.toLowerCase()}`);
      
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
      const result = await agentFunction(executionPayload);
      
      // Process and return the result
      return this.processAgentResult(result);
    } catch (error) {
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
  }

  /**
   * Prepare for agent execution
   */
  private async prepareAgentExecution(): Promise<void> {
    // Update agent activity timestamp
    await AgentService.updateAgentInstance(this.agentInstance.id, {
      'metadata.lastActive': Timestamp.now()
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
  private async prepareUltraPerformanceCache(): Promise<void> {
    // Implementation would depend on specific caching mechanism
    // For now, this is a placeholder
  }

  /**
   * Process agent execution result
   */
  private processAgentResult(result: HttpsCallableResult<any>): any {
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
  private enhanceResponse(response: any): any {
    // Add agent-specific enhancements
    switch (this.agentType) {
      case PilotType.DR_MEMORIA_PILOT:
        return this.enhanceMemoriaResponse(response);
      case PilotType.DR_MATCH_PILOT:
        return this.enhanceMatchResponse(response);
      case PilotType.DR_MARIA_HISTORICAL_01:
      case PilotType.DR_MARIA_HISTORICAL_02:
      case PilotType.DR_MARIA_HISTORICAL_03:
        return this.enhanceMariaResponse(response);
      default:
        return response;
    }
  }

  /**
   * Enhance Dr. Memoria response
   */
  private enhanceMemoriaResponse(response: any): any {
    // Add memory context indicators
    if (response.metadata?.memoryReferences) {
      const memories = response.metadata.memoryReferences;
      let enhancedContent = response.content;
      
      // Add memory reference notes if applicable
      if (memories.length > 0) {
        enhancedContent += "\n\n*Memory References:*\n";
        memories.forEach((memory: any, index: number) => {
          enhancedContent += `${index + 1}. ${memory.title} (${memory.date})\n`;
        });
      }
      
      return {
        ...response,
        content: enhancedContent
      };
    }
    
    return response;
  }

  /**
   * Enhance Dr. Match response
   */
  private enhanceMatchResponse(response: any): any {
    // Add LinkedIn integration notes if applicable
    if (response.metadata?.linkedinIntegration && response.metadata.linkedinAction) {
      let enhancedContent = response.content;
      
      enhancedContent += `\n\n*LinkedIn Action:* ${response.metadata.linkedinAction}\n`;
      
      if (response.metadata.linkedinResults) {
        enhancedContent += `Results: ${response.metadata.linkedinResults}\n`;
      }
      
      return {
        ...response,
        content: enhancedContent
      };
    }
    
    return response;
  }

  /**
   * Enhance Dr. Maria response
   */
  private enhanceMariaResponse(response: any): any {
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
        content: enhancedContent
      };
    }
    
    return response;
  }
}

// Agent Orchestration Manager
export class AgentOrchestrationManager {
  private static instance: AgentOrchestrationManager;
  private activeAgents: Map<string, AgentExecutionMiddleware> = new Map();

  // Singleton pattern
  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): AgentOrchestrationManager {
    if (!AgentOrchestrationManager.instance) {
      AgentOrchestrationManager.instance = new AgentOrchestrationManager();
    }
    
    return AgentOrchestrationManager.instance;
  }

  /**
   * Process a message with an agent
   */
  public async processMessage(agentId: string, message: any, conversationId: string): Promise<any> {
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
  private async getAgentMiddleware(agentId: string): Promise<AgentExecutionMiddleware | null> {
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
  public async getActiveAgentsByOwner(ownerType: string, ownerId: string): Promise<any[]> {
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
  public async createAgent(agentData: any): Promise<any> {
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
  public async updateAgent(agentId: string, data: any): Promise<any> {
    try {
      const updatedAgent = await AgentService.updateAgentInstance(agentId, data);
      
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
  public async createConversation(
    title: string,
    initiatorType: string,
    initiatorId: string,
    agentId: string
  ): Promise<any> {
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
          { type: initiatorType, id: initiatorId },
          { type: 'agent', id: agentId }
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
  private provider: ethers.providers.JsonRpcProvider;
  private contractAddress: string;
  private contract: ethers.Contract;
  private aixtivWallet: ethers.Wallet;

  constructor(
    rpcUrl: string = process.env.ETHEREUM_RPC_URL || '',
    contractAddress: string = process.env.NFT_CONTRACT_ADDRESS || '',
    privateKey: string = process.env.AIXTIV_PRIVATE_KEY || ''
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
      'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
    ];
    
    this.contract = new ethers.Contract(contractAddress, abi, this.aixtivWallet);
  }

  /**
   * Mint a new agent NFT
   */
  public async mintAgentNFT(
    agentId: string,
    ownerAddress: string,
    metadata: any
  ): Promise<string> {
    try {
      // Upload metadata to IPFS
      const metadataUri = await this.uploadMetadataToIPFS(metadata);
      
      // Mint the NFT
      const tx = await this.contract.mint(ownerAddress, metadataUri);
      const receipt = await tx.wait();
      
      // Get the token ID from the Transfer event
      const transferEvent = receipt.events.find((e: any) => e.event === 'Transfer');
      const tokenId = transferEvent.args.tokenId.toString();
      
      // Create NFT record in Firestore
      await this.createNFTRecord(agentId, tokenId, ownerAddress, metadataUri, receipt.transactionHash);
      
      return tokenId;
    } catch (error) {
      console.error('Error minting agent NFT:', error);
      throw error;
    }
  }

  /**
   * Transfer an agent NFT to a new owner
   */
  public async transferAgentNFT(
    tokenId: string,
    fromAddress: string,
    toAddress: string
  ): Promise<string> {
    try {
      // Transfer the NFT
      const tx = await this.contract.transferFrom(fromAddress, toAddress, tokenId);
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
  public async getAgentNFTOwner(tokenId: string): Promise<string> {
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
  private async uploadMetadataToIPFS(metadata: any): Promise<string> {
    try {
      // In a real implementation, this would upload to IPFS
      // For now, return a mock IPFS URI
      const metadataHash = CryptoJS.SHA256(JSON.stringify(metadata)).toString().substring(0, 16);
      return `ipfs://${metadataHash}`;
    } catch (error) {
      console.error('Error uploading metadata to IPFS:', error);
      throw error;
    }
  }

  /**
   * Create NFT record in Firestore
   */
  private async createNFTRecord(
    agentId: string,
    tokenId: string,
    ownerAddress: string,
    metadataUri: string,
    transactionHash: string
  ): Promise<void> {
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
        mintedAt: Timestamp.now(),
        transferHistory: [
          {
            fromAddress: '0x0000000000000000000000000000000000000000',
            toAddress: ownerAddress,
            transactionId: transactionHash,
            timestamp: Timestamp.now()
          }
        ]
      };
      
      await setDoc(doc(db, 'nftTokens', nftData.id), nftData);
      
      // Update agent with NFT reference
      await AgentService.updateAgentInstance(agentId, {
        'metadata.nftTokenId': tokenId,
        'metadata.nftContractAddress': this.contractAddress,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error creating NFT record:', error);
      throw error;
    }
  }

  /**
   * Update NFT record in Firestore
   */
  private async updateNFTRecord(
    tokenId: string,
    newOwnerAddress: string,
    transactionHash: string
  ): Promise<void> {
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
        fromAddress: nftData.ownerAddress,
        toAddress: newOwnerAddress,
        transactionId: transactionHash,
        timestamp: Timestamp.now()
      };
      
      await updateDoc(doc(db, 'nftTokens', nftDoc.id), {
        ownerAddress: newOwnerAddress,
        transferHistory: [...nftData.transferHistory, transferEvent],
        updatedAt: Timestamp.now()
      });
      
      // Update agent owner if applicable
      if (nftData.linkedRecordId && nftData.tokenType === 'agent') {
        const agentDoc = await getDoc(doc(db, 'agents', nftData.linkedRecordId));
        
        if (agentDoc.exists()) {
          // Determine owner type based on address pattern
          // This is a simplified approach - in practice, you'd need a more robust system
          const newOwnerType = newOwnerAddress.startsWith('org_') ? 'organization' : 'user';
          const newOwnerId = await this.resolveAddressToId(newOwnerAddress, newOwnerType);
          
          // Update agent owner
          await AgentService.updateAgentInstance(nftData.linkedRecordId, {
            ownerType: newOwnerType,
            ownerId: newOwnerId,
            'metadata.ownershipTransferred': true,
            'metadata.previousOwner': {
              ownerType: agentDoc.data().ownerType,
              ownerId: agentDoc.data().ownerId
            },
            updatedAt: Timestamp.now()
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
  private async resolveAddressToId(address: string, ownerType: string): Promise<string> {
    try {
      let collection = ownerType === 'user' ? 'users' : 'organizations';
      
      // Query for entity with matching blockchain address
      const entityQuery = query(
        collection(db, collection),
        where(ownerType === 'user' ? 'blockchainAddress' : 'blockchainVerification.address', '==', address)
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
  private orchestrationManager: AgentOrchestrationManager;

  constructor() {
    this.orchestrationManager = AgentOrchestrationManager.getInstance();
  }

  /**
   * Create a multi-agent conversation
   */
  public async createMultiAgentConversation(
    title: string,
    initiatorType: string,
    initiatorId: string,
    agentIds: string[]
  ): Promise<any> {
    try {
      // Validate agents
      const agents = await this.validateAgents(agentIds);
      
      if (agents.length === 0) {
        throw new Error('No valid agents provided');
      }
      
      // Prepare participants
      const participants = [
        { type: initiatorType, id: initiatorId },
        ...agents.map(agent => ({ type: 'agent', id: agent.id }))
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
        'metadata.isMultiAgent': true,
        'metadata.agentRoles': agents.map(agent => ({
          agentId: agent.id,
          agentType: agent.agentTypeId,
          name: agent.name
        }))
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
  public async processMultiAgentMessage(
    conversationId: string,
    message: any
  ): Promise<any[]> {
    try {
      // Get conversation data
      const conversationDoc = await getDoc(doc(db, 'conversations', conversationId));
      
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
  private async validateAgents(agentIds: string[]): Promise<any[]> {
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
  private async shouldAgentRespond(
    agentId: string,
    conversationId: string,
    message: any
  ): Promise<boolean> {
    try {
      // Get conversation metadata
      const conversationDoc = await getDoc(doc(db, 'conversations', conversationId));
      
      if (!conversationDoc.exists()) {
        return false;
      }
      
      const conversation = conversationDoc.data();
      
      // Get agent role
      const agentRole = conversation.metadata?.agentRoles?.find(
        (role: any) => role.agentId === agentId
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
  private containsMatchKeywords(content: string): boolean {
    const keywords = [
      'network', 'connection', 'linkedin', 'profile', 'professional',
      'contact', 'job', 'career', 'opportunity', 'recommendation'
    ];
    
    return this.containsKeywords(content, keywords);
  }

  /**
   * Check if message contains Dr. Lucy keywords
   */
  private containsLucyKeywords(content: string): boolean {
    const keywords = [
      'dream', 'visualization', 'image', 'picture', 'visual',
      'imagine', 'see', 'vision', 'creativity', 'creative'
    ];
    
    return this.containsKeywords(content, keywords);
  }

  /**
   * Check if message contains Dr. Maria keywords
   */
  private containsMariaKeywords(content: string): boolean {
    const keywords = [
      'language', 'translate', 'culture', 'cultural', 'international',
      'global', 'localize', 'region', 'country', 'foreign'
    ];
    
    return this.containsKeywords(content, keywords);
  }

  /**
   * Check if message contains Dr. Memoria keywords
   */
  private containsMemoriaKeywords(content: string): boolean {
    const keywords = [
      'memory', 'remember', 'recall', 'store', 'save',
      'archive', 'record', 'history', 'past', 'journal'
    ];
    
    return this.containsKeywords(content, keywords);
  }

  /**
   * Check if content contains any of the keywords
   */
  private containsKeywords(content: string, keywords: string[]): boolean {
    const lowerContent = content.toLowerCase();
    return keywords.some(keyword => lowerContent.includes(keyword.toLowerCase()));
  }
}

// Export all orchestration classes
export default {
  AgentExecutionMiddleware,
  AgentOrchestrationManager,
  AgentNFTManager,
  MultiAgentCollaborationSystem
};
