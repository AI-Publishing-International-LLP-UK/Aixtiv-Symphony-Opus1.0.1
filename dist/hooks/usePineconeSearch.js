"use strict";
/**
 * Custom hook for Pinecone vector search functionality
 *
 * @module hooks/usePineconeSearch
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePineconeSearch = usePineconeSearch;
const react_1 = require("react");
const axios_1 = __importDefault(require("axios"));
/**
 * Hook for performing semantic searches using Pinecone
 */
function usePineconeSearch() {
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [results, setResults] = (0, react_1.useState)([]);
    /**
     * Execute semantic search
     */
    const search = (0, react_1.useCallback)(async (query, options = {}) => {
        setLoading(true);
        setError(null);
        try {
            const { index = 'aixtiv-default', filter = {}, topK = 10, includeMetadata = true, namespace } = options;
            // Call our API endpoint that interfaces with Pinecone
            const response = await axios_1.default.post('/api/search/pinecone', {
                query,
                index,
                filter,
                topK,
                includeMetadata,
                namespace
            });
            const searchResults = response.data;
            setResults(searchResults.matches || []);
            return searchResults.matches || [];
        }
        catch (err) {
            const errorObj = new Error(err.message || 'Error performing Pinecone search');
            setError(errorObj);
            return [];
        }
        finally {
            setLoading(false);
        }
    }, []);
    /**
     * Search for similar memories
     */
    const searchMemories = (0, react_1.useCallback)(async (query, userId, topK = 10) => {
        const filter = userId ? { userId } : {};
        return search(query, {
            index: 'aixtiv-memories',
            filter,
            topK
        });
    }, [search]);
    /**
     * Search for similar prompts
     */
    const searchPrompts = (0, react_1.useCallback)(async (query, agentId, topK = 10) => {
        const filter = agentId ? { agentId } : {};
        return search(query, {
            index: 'aixtiv-prompts',
            filter,
            topK
        });
    }, [search]);
    return {
        search,
        searchMemories,
        searchPrompts,
        loading,
        error,
        results
    };
}
exports.default = usePineconeSearch;
