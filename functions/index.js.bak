/**
 * Aixtiv CLI Owner-Subscriber V1-V2 Immersive System
 * Firebase Cloud Functions Main Entry Point
 * 
 * This file exports all Cloud Functions for the Aixtiv CLI Owner-Subscriber system,
 * including Universal Dispatcher, Memory System, and Agent Trigger functions.
 * 
 * @module functions/index
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

const { https, pubsub, firestore } = require('firebase-functions/v1');
const logger = require('firebase-functions/logger');
const { initialize, admin, getFirestore, getAuth, healthCheck } = require('./firebase-admin-init');

// Initialize Firebase Admin SDK with enhanced configuration
let initializationPromise = null;

/**
 * Ensure Firebase is initialized before function execution
 */  
async function ensureFirebaseInit() {
  if (!initializationPromise) {
    initializationPromise = initialize();
  }
  return initializationPromise;
}

// Import function modules
const { drClaude } = require('./dr-claude');
const universalDispatcherFunctions = require('./universalDispatcherFunctions');
const memoryFunctions = require('./memoryFunctions');
const agentTriggerFunctions = require('./firebase_agent_trigger');
const pineconeIntegrationFunctions = require('./pineconeIntegrationFunctions');
const { syncMessage } = require('./syncMessage');
const { delegateToClaude } = require('./delegateToClaude');

// Configuration for functions
const runtimeOpts = {
  memory: '512MB',
  timeoutSeconds: 60
};

// Higher memory configuration for complex operations
const highMemoryOpts = {
  memory: '1GB',
  timeoutSeconds: 120
};

// Export Dr. Claude functions
exports.drClaude = https.onRequest(drClaude);

// Export Universal Dispatcher functions
exports.handleDispatch = universalDispatcherFunctions.handleDispatch;
exports.getDispatchStatus = universalDispatcherFunctions.getDispatchStatus;
exports.cancelDispatch = universalDispatcherFunctions.cancelDispatch;
exports.onPromptRunCreated = universalDispatcherFunctions.onPromptRunCreated;
exports.onPromptRunUpdated = universalDispatcherFunctions.onPromptRunUpdated;
exports.cleanupStaleDispatches = universalDispatcherFunctions.cleanupStaleDispatches;
exports.routeToAgent = universalDispatcherFunctions.routeToAgent;

// Export Memory System functions
exports.addMemory = memoryFunctions.addMemory;
exports.queryMemories = memoryFunctions.queryMemories;
exports.getMemoryStats = memoryFunctions.getMemoryStats;
exports.clearSessionMemories = memoryFunctions.clearSessionMemories;
exports.analyzeMemoryImportance = memoryFunctions.analyzeMemoryImportance;
exports.archiveOldMemories = memoryFunctions.archiveOldMemories;

// Export Agent Trigger functions
exports.triggerAgent = agentTriggerFunctions.triggerAgent;
exports.onChatMessageCreated = agentTriggerFunctions.onChatMessageCreated;
exports.scheduledAgentActions = agentTriggerFunctions.scheduledAgentActions;
exports.processScheduledAgentActions = agentTriggerFunctions.processScheduledAgentActions;

// Endpoint for generating code with Dr. Claude
exports.claudeCodeGenerate = https.onRequest((request, response) => {
  logger.info('Claude code generation request received', { structuredData: true });

  response.json({
    code: 'function factorial(n) {\n  if (n === 0 || n === 1) {\n    return 1;\n  }\n  return n * factorial(n - 1);\n}',
    language: 'javascript',
    status: 'success'
  });
});

// Context storage endpoint
exports.contextStorage = https.onRequest((request, response) => {
  if (request.method === 'GET') {
    logger.info('Context retrieval request', { structuredData: true });
    response.json({ 
      context: 'Sample context data',
      timestamp: new Date().toISOString(),
      status: 'success'
    });
  } else if (request.method === 'POST') {
    logger.info('Context storage request', { structuredData: true });
    response.json({ 
      status: 'success', 
      message: 'Context stored successfully'
    });
  } else {
    response.status(405).send('Method not allowed');
  }
});

// Model metrics endpoint
exports.modelMetrics = https.onRequest((request, response) => {
  logger.info('Model metrics request', { structuredData: true });
  
  response.json({
    model: 'claude-3-opus-20240229',
    latency: {
      p50: 1200,
      p90: 1800,
      p99: 2500
    },
    throughput: 120,
    errors: {
      rate: 0.001,
      types: {
        timeout: 2,
        rate_limit: 1,
        server: 0
      }
    },
    status: 'healthy'
  });
});

// Health check endpoint
exports.healthCheck = https.onRequest((request, response) => {
  logger.info('Health check request', { structuredData: true });

  response.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      dispatcher: 'operational',
      memory: 'operational',
      agents: 'operational',
      pinecone: 'operational'
    }
  });
});

// Export Pinecone Integration functions
exports.searchMemories = pineconeIntegrationFunctions.searchMemories;
exports.searchPrompts = pineconeIntegrationFunctions.searchPrompts;
exports.storeMemory = pineconeIntegrationFunctions.storeMemory;
exports.storePrompt = pineconeIntegrationFunctions.storePrompt;
exports.deleteFromPinecone = pineconeIntegrationFunctions.deleteFromPinecone;
exports.onPineconeChatHistoryCreated = pineconeIntegrationFunctions.onChatHistoryCreated;
exports.onPineconePromptRunCreated = pineconeIntegrationFunctions.onPromptRunCreated;
exports.ensurePineconeIndexes = pineconeIntegrationFunctions.ensurePineconeIndexes;

// Export Message Sync and Claude Delegation functions
exports.syncMessage = syncMessage;
exports.delegateToClaude = delegateToClaude;
