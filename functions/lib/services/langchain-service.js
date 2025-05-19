"use strict";
/**
 * LangChain Service
 * Provides client-side access to LangChain functionality via Firebase Functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.langchainService = void 0;
const functions_1 = require("firebase/functions");
/**
 * LangChain Integration Service
 * Provides access to LangChain functions via Firebase Functions
 */
class LangChainService {
    constructor() {
        this.functions = (0, functions_1.getFunctions)(undefined, 'us-west1');
    }
    /**
     * Run a LangChain prompt
     * @param options The prompt options
     * @returns The result of running the prompt
     */
    async runPrompt(options) {
        const runPrompt = (0, functions_1.httpsCallable)(this.functions, 'runPrompt');
        const result = await runPrompt({
            prompt: options.prompt,
            input: options.input,
            model: options.model || 'gpt-4',
            provider: options.provider || 'openai',
            temperature: options.temperature || 0.7,
        });
        const { result: promptResult } = result.data;
        return promptResult;
    }
    /**
     * Run a LangChain conversation with memory
     * @param options The conversation options
     * @returns The response and memory
     */
    async runConversation(options) {
        const runConversation = (0, functions_1.httpsCallable)(this.functions, 'runConversation');
        const result = await runConversation({
            prompt: options.prompt,
            input: options.input,
            sessionId: options.sessionId,
            model: options.model || 'gpt-4',
            provider: options.provider || 'openai',
            temperature: options.temperature || 0.7,
        });
        return result.data;
    }
    /**
     * Create a document store
     * @param options The document store options
     * @returns Success status and index name
     */
    async createDocumentStore(options) {
        const createDocumentStore = (0, functions_1.httpsCallable)(this.functions, 'createDocumentStore');
        const result = await createDocumentStore({
            documents: options.documents,
            indexName: options.indexName,
        });
        return result.data;
    }
    /**
     * Search documents
     * @param options The search options
     * @returns Search results
     */
    async searchDocuments(options) {
        const searchDocuments = (0, functions_1.httpsCallable)(this.functions, 'searchDocuments');
        const result = await searchDocuments({
            query: options.query,
            indexName: options.indexName,
            k: options.k || 5,
        });
        return result.data;
    }
    /**
     * Generate embeddings for a text
     * This is a local utility that leverages the document store functionality
     * @param text The text to generate embeddings for
     * @returns The embeddings as a temporary document store
     */
    async generateEmbeddings(text) {
        const tempIndexName = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        return this.createDocumentStore({
            documents: [
                {
                    content: text,
                    metadata: {
                        source: 'temp-embedding',
                        timestamp: Date.now(),
                    },
                },
            ],
            indexName: tempIndexName,
        });
    }
    /**
     * Find similar content to a given text
     * @param text The text to find similar content for
     * @param indexName The index to search in
     * @param k The number of results to return
     * @returns Similar documents
     */
    async findSimilarContent(text, indexName, k = 5) {
        return this.searchDocuments({
            query: text,
            indexName,
            k,
        });
    }
    /**
     * Answer a question with context from documents
     * @param question The question to answer
     * @param indexName The index to search for context
     * @returns The answer
     */
    async answerWithContext(question, indexName, options = {}) {
        // First, search for relevant documents
        const searchResults = await this.searchDocuments({
            query: question,
            indexName,
            k: options.k || 5,
        });
        // Extract content from documents
        const contextText = searchResults.documents
            .map((doc) => doc.content)
            .join('\n\n');
        // Create a prompt with context
        const prompt = `
    You are an AI assistant that answers questions based on the provided context.

    CONTEXT:
    {context}

    QUESTION:
    {question}

    ANSWER:
    `;
        // Run prompt with context
        return this.runPrompt({
            prompt,
            input: {
                context: contextText,
                question,
            },
            model: options.model,
            provider: options.provider,
            temperature: options.temperature,
        });
    }
}
// Export singleton instance
exports.langchainService = new LangChainService();
exports.default = exports.langchainService;
//# sourceMappingURL=langchain-service.js.map