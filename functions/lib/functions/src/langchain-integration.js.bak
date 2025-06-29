"use strict";
/**
 * LangChain Integration for ASOOS
 * Provides LangChain-based capabilities for agents and services
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchDocuments = exports.createDocumentStore = exports.runConversation = exports.runPrompt = void 0;
const functions = require("firebase-functions/v2");
const admin = require("firebase-admin");
const openai_1 = require("langchain/chat_models/openai");
const anthropic_1 = require("langchain/chat_models/anthropic");
const prompts_1 = require("langchain/prompts");
const output_parser_1 = require("langchain/schema/output_parser");
const runnable_1 = require("langchain/schema/runnable");
const chains_1 = require("langchain/chains");
const memory_1 = require("langchain/memory");
const document_1 = require("langchain/document");
const pinecone_1 = require("langchain/vectorstores/pinecone");
const pinecone_2 = require("@pinecone-database/pinecone");
const openai_2 = require("langchain/embeddings/openai");
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
const pinecone = new pinecone_2.Pinecone({
    apiKey: PINECONE_API_KEY,
    environment: PINECONE_ENVIRONMENT,
});
// LLM Models - These would be selected based on the agent's requirements
const openaiModel = new openai_1.ChatOpenAI({
    openAIApiKey: OPENAI_API_KEY,
    modelName: 'gpt-4',
    temperature: 0.7,
});
const anthropicModel = new anthropic_1.ChatAnthropic({
    anthropicApiKey: ANTHROPIC_API_KEY,
    modelName: 'claude-3-opus-20240229',
    temperature: 0.7,
});
// Embeddings
const embeddings = new openai_2.OpenAIEmbeddings({
    openAIApiKey: OPENAI_API_KEY,
    modelName: 'text-embedding-3-large',
});
/**
 * Run a chain with a given prompt and input
 */
async function runChain(llm, promptTemplate, input) {
    try {
        const prompt = prompts_1.PromptTemplate.fromTemplate(promptTemplate);
        const chain = runnable_1.RunnableSequence.from([
            prompt,
            llm,
            new output_parser_1.StringOutputParser(),
        ]);
        return await chain.invoke(input);
    }
    catch (error) {
        functions.logger.error('Error running chain:', error);
        throw error;
    }
}
/**
 * Run a chain with memory
 */
async function runChainWithMemory(llm, promptTemplate, input, sessionId) {
    try {
        // Get or create memory for this session
        const memory = await getOrCreateMemory(sessionId);
        const prompt = prompts_1.PromptTemplate.fromTemplate(promptTemplate);
        const chain = new chains_1.ConversationChain({
            llm,
            prompt,
            memory,
            verbose: true,
        });
        const response = await chain.call({ input });
        // Store updated memory
        await storeMemory(sessionId, memory);
        return {
            response: response.response,
            memory: JSON.stringify(await memory.loadMemoryVariables({})),
        };
    }
    catch (error) {
        functions.logger.error('Error running chain with memory:', error);
        throw error;
    }
}
/**
 * Get or create memory for a session
 */
async function getOrCreateMemory(sessionId) {
    try {
        // Check if memory exists in Firestore
        const memoryDoc = await firestore
            .collection('agentMemory')
            .doc(sessionId)
            .get();
        // Create summarization memory
        const memory = new memory_1.ConversationSummaryMemory({
            llm: openaiModel,
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
    }
    catch (error) {
        functions.logger.error('Error getting memory:', error);
        throw error;
    }
}
/**
 * Store memory for a session
 */
async function storeMemory(sessionId, memory) {
    try {
        const memoryVariables = await memory.loadMemoryVariables({});
        await firestore.collection('agentMemory').doc(sessionId).set({
            buffer: memoryVariables.chat_history,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    catch (error) {
        functions.logger.error('Error storing memory:', error);
        throw error;
    }
}
/**
 * Create a vector store for documents
 */
async function createVectorStore(documents, indexName) {
    try {
        // Check if index exists, create it if not
        const indexes = await pinecone.listIndexes();
        if (!indexes.some((index) => index.name === indexName)) {
            await pinecone.createIndex({
                name: indexName,
                dimension: 1536, // Dimension for text-embedding-3-large
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
        const vectorStore = await pinecone_1.PineconeStore.fromDocuments(documents, embeddings, {
            pineconeIndex: index,
        });
        return vectorStore;
    }
    catch (error) {
        functions.logger.error('Error creating vector store:', error);
        throw error;
    }
}
/**
 * Search documents in a vector store
 */
async function searchVectorStore(indexName, query, k = 5) {
    try {
        // Get index
        const index = pinecone.Index(indexName);
        // Create vector store
        const vectorStore = await pinecone_1.PineconeStore.fromExistingIndex(embeddings, {
            pineconeIndex: index,
        });
        // Search
        return vectorStore.similaritySearch(query, k);
    }
    catch (error) {
        functions.logger.error('Error searching vector store:', error);
        throw error;
    }
}
/**
 * Firebase function to run a LangChain prompt
 */
exports.runPrompt = functions.https.onCall({
    region: 'us-west1',
}, async (request) => {
    try {
        const { prompt, input, model = 'gpt-4', provider = 'openai', temperature = 0.7 } = request.data;
        if (!prompt) {
            throw new functions.https.HttpsError('invalid-argument', 'Prompt is required');
        }
        // Select model
        let llm;
        if (provider === 'anthropic') {
            llm = new anthropic_1.ChatAnthropic({
                anthropicApiKey: ANTHROPIC_API_KEY,
                modelName: model,
                temperature,
            });
        }
        else {
            llm = new openai_1.ChatOpenAI({
                openAIApiKey: OPENAI_API_KEY,
                modelName: model,
                temperature,
            });
        }
        // Run chain
        const result = await runChain(llm, prompt, input);
        return { result };
    }
    catch (error) {
        functions.logger.error('Error running prompt:', error);
        throw new functions.https.HttpsError('internal', 'Error running prompt: ' + error.message);
    }
});
/**
 * Firebase function to run a LangChain conversation with memory
 */
exports.runConversation = functions.https.onCall({
    region: 'us-west1',
}, async (request) => {
    try {
        const { prompt, input, sessionId, model = 'gpt-4', provider = 'openai', temperature = 0.7 } = request.data;
        if (!prompt || !input || !sessionId) {
            throw new functions.https.HttpsError('invalid-argument', 'Prompt, input, and sessionId are required');
        }
        // Select model
        let llm;
        if (provider === 'anthropic') {
            llm = new anthropic_1.ChatAnthropic({
                anthropicApiKey: ANTHROPIC_API_KEY,
                modelName: model,
                temperature,
            });
        }
        else {
            llm = new openai_1.ChatOpenAI({
                openAIApiKey: OPENAI_API_KEY,
                modelName: model,
                temperature,
            });
        }
        // Run chain with memory
        const result = await runChainWithMemory(llm, prompt, input, sessionId);
        return result;
    }
    catch (error) {
        functions.logger.error('Error running conversation:', error);
        throw new functions.https.HttpsError('internal', 'Error running conversation: ' + error.message);
    }
});
/**
 * Firebase function to create a document store
 */
exports.createDocumentStore = functions.https.onCall({
    region: 'us-west1',
}, async (request) => {
    try {
        const { documents, indexName } = request.data;
        if (!documents || !indexName) {
            throw new functions.https.HttpsError('invalid-argument', 'Documents and indexName are required');
        }
        // Convert to LangChain documents
        const docs = documents.map((doc) => new document_1.Document({
            pageContent: doc.content,
            metadata: doc.metadata || {},
        }));
        // Create vector store
        await createVectorStore(docs, indexName);
        return { success: true, indexName };
    }
    catch (error) {
        functions.logger.error('Error creating document store:', error);
        throw new functions.https.HttpsError('internal', 'Error creating document store: ' + error.message);
    }
});
/**
 * Firebase function to search documents
 */
exports.searchDocuments = functions.https.onCall({
    region: 'us-west1',
}, async (request) => {
    try {
        const { query, indexName, k = 5 } = request.data;
        if (!query || !indexName) {
            throw new functions.https.HttpsError('invalid-argument', 'Query and indexName are required');
        }
        // Search documents
        const docs = await searchVectorStore(indexName, query, k);
        return {
            documents: docs.map((doc) => ({
                content: doc.pageContent,
                metadata: doc.metadata,
            })),
        };
    }
    catch (error) {
        functions.logger.error('Error searching documents:', error);
        throw new functions.https.HttpsError('internal', 'Error searching documents: ' + error.message);
    }
});
//# sourceMappingURL=langchain-integration.js.map