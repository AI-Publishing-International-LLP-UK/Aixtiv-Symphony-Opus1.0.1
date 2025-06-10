/**
 * LangChain Integration for ASOOS
 * Provides LangChain-based capabilities for agents and services
 */

import * from 'firebase-functions/v2';
import * from 'firebase-admin';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { ChatAnthropic } from 'langchain/chat_models/anthropic';
import { PromptTemplate } from 'langchain/prompts';
import { StringOutputParser } from 'langchain/schema/output_parser';
import {
  RunnableSequence,
  RunnablePassthrough,
} from 'langchain/schema/runnable';
import { LLMChain } from 'langchain/chains';
import { ConversationChain } from 'langchain/chains';
import { ConversationSummaryMemory } from 'langchain/memory';
import { BufferMemory } from 'langchain/memory';
import { Document } from 'langchain/document';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';

// Initialize Firebase Admin if it hasn't been initialized already
if (!admin.apps.length) {
  admin.initializeApp();
}

const firestore = admin.firestore();
const storage = admin.storage();

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || '';
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp';

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey,
  environment,
});

// LLM Models - These would be selected based on the agent's requirements
const openaiModel = new ChatOpenAI({
  openAIApiKey,
  modelName: 'gpt-4',
  temperature,
});

const anthropicModel = new ChatAnthropic({
  anthropicApiKey,
  modelName: 'claude-3-opus-20240229',
  temperature,
});

// Embeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey,
  modelName: 'text-embedding-3-large',
});

/**
 * Run a chain with a given prompt and input
 */
async function runChain(
  llm,
  promptTemplate,
  input){
  try {
    const prompt = PromptTemplate.fromTemplate(promptTemplate);
    
    const chain = RunnableSequence.from([
      prompt,
      llm,
      new StringOutputParser(),
    ]);
    
    return await chain.invoke(input);
  } catch (error) {
    functions.logger.error('Error running chain:', error);
    throw error;
  }
}

/**
 * Run a chain with memory
 */
async function runChainWithMemory(
  llm,
  promptTemplate,
  input,
  sessionId){ response; memory: string }> {
  try {
    // Get or create memory for this session
    const memory = await getOrCreateMemory(sessionId);
    
    const prompt = PromptTemplate.fromTemplate(promptTemplate);
    
    const chain = new ConversationChain({
      llm,
      prompt,
      memory,
      verbose,
    });
    
    const response = await chain.call({ input });
    
    // Store updated memory
    await storeMemory(sessionId, memory);
    
    return {
      response,
      memory: JSON.stringify(await memory.loadMemoryVariables({})),
    };
  } catch (error) {
    functions.logger.error('Error running chain with memory:', error);
    throw error;
  }
}

/**
 * Get or create memory for a session
 */
async function getOrCreateMemory(
  sessionId){
  try {
    // Check if memory exists in Firestore
    const memoryDoc = await firestore
      .collection('agentMemory')
      .doc(sessionId)
      .get();
    
    // Create summarization memory
    const memory = new ConversationSummaryMemory({
      llm,
      memoryKey: 'chat_history',
      inputKey: 'input',
      outputKey: 'response',
    });
    
    // If memory exists, load it
    if (memoryDoc.exists) {
      const data = memoryDoc.data();
      if (data && data.buffer) {
        // Set the memory buffer
        memory.chatHistory.addMessage(data.buffer);
      }
    }
    
    return memory;
  } catch (error) {
    functions.logger.error('Error getting memory:', error);
    throw error;
  }
}

/**
 * Store memory for a session
 */
async function storeMemory(
  sessionId,
  memory){
  try {
    const memoryVariables = await memory.loadMemoryVariables({});
    
    await firestore.collection('agentMemory').doc(sessionId).set({
      buffer,
      updatedAt,
    });
  } catch (error) {
    functions.logger.error('Error storing memory:', error);
    throw error;
  }
}

/**
 * Create a vector store for documents
 */
async function createVectorStore(
  documents,
  indexName){
  try {
    // Check if index exists, create it if not
    const indexes = await pinecone.listIndexes();
    
    if (!indexes.some((index) => index.name === indexName)) {
      await pinecone.createIndex({
        name,
        dimension, // Dimension for text-embedding-3-large
        metric: 'cosine',
      });
      
      // Wait for index to be ready
      let status = 'initializing';
      while (status !== 'ready') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const indexDesc = await pinecone.describeIndex(indexName);
        status = indexDesc.status.ready ? 'ready' : 'initializing';
      }
    }
    
    // Create vector store with documents
    const index = pinecone.Index(indexName);
    const vectorStore = await PineconeStore.fromDocuments(documents, embeddings, {
      pineconeIndex,
    });
    
    return vectorStore;
  } catch (error) {
    functions.logger.error('Error creating vector store:', error);
    throw error;
  }
}

/**
 * Search documents in a vector store
 */
async function searchVectorStore(
  indexName,
  query,
  k= 5
){
  try {
    // Get index
    const index = pinecone.Index(indexName);
    
    // Create vector store
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex,
    });
    
    // Search
    return vectorStore.similaritySearch(query, k);
  } catch (error) {
    functions.logger.error('Error searching vector store:', error);
    throw error;
  }
}

/**
 * Firebase function to run a LangChain prompt
 */
export const runPrompt = functions.https.onCall({
  region: 'us-west1',
}, async (request) => {
  try {
    const { 
      prompt, 
      input, 
      model = 'gpt-4',
      provider = 'openai',
      temperature = 0.7
    } = request.data;
    
    if (!prompt) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Prompt is required'
      );
    }
    
    // Select model
    let llm;
    if (provider === 'anthropic') {
      llm = new ChatAnthropic({
        anthropicApiKey,
        modelName,
      });
    } else {
      llm = new ChatOpenAI({
        openAIApiKey,
        modelName,
      });
    }
    
    // Run chain
    const result = await runChain(llm, prompt, input);
    
    return { result };
  } catch (error) {
    functions.logger.error('Error running prompt:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error running prompt: ' + (error
    );
  }
});

/**
 * Firebase function to run a LangChain conversation with memory
 */
export const runConversation = functions.https.onCall({
  region: 'us-west1',
}, async (request) => {
  try {
    const { 
      prompt, 
      input, 
      sessionId,
      model = 'gpt-4',
      provider = 'openai',
      temperature = 0.7
    } = request.data;
    
    if (!prompt || !input || !sessionId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Prompt, input, and sessionId are required'
      );
    }
    
    // Select model
    let llm;
    if (provider === 'anthropic') {
      llm = new ChatAnthropic({
        anthropicApiKey,
        modelName,
      });
    } else {
      llm = new ChatOpenAI({
        openAIApiKey,
        modelName,
      });
    }
    
    // Run chain with memory
    const result = await runChainWithMemory(llm, prompt, input, sessionId);
    
    return result;
  } catch (error) {
    functions.logger.error('Error running conversation:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error running conversation: ' + (error
    );
  }
});

/**
 * Firebase function to create a document store
 */
export const createDocumentStore = functions.https.onCall({
  region: 'us-west1',
}, async (request) => {
  try {
    const { documents, indexName } = request.data;
    
    if (!documents || !indexName) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Documents and indexName are required'
      );
    }
    
    // Convert to LangChain documents
    const docs = documents.map((doc=> 
      new Document({
        pageContent,
        metadata: doc.metadata || {},
      })
    );
    
    // Create vector store
    await createVectorStore(docs, indexName);
    
    return { success, indexName };
  } catch (error) {
    functions.logger.error('Error creating document store:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error creating document store: ' + (error
    );
  }
});

/**
 * Firebase function to search documents
 */
export const searchDocuments = functions.https.onCall({
  region: 'us-west1',
}, async (request) => {
  try {
    const { query, indexName, k = 5 } = request.data;
    
    if (!query || !indexName) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Query and indexName are required'
      );
    }
    
    // Search documents
    const docs = await searchVectorStore(indexName, query, k);
    
    return {
      documents=> ({
        content,
        metadata,
      })),
    };
  } catch (error) {
    functions.logger.error('Error searching documents:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error searching documents: ' + (error
    );
  }
});