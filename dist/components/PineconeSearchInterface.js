"use strict";
/**
 * Production-ready Pinecone vector search interface for Aixtiv CLI
 *
 * @module components/PineconeSearchInterface
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const usePineconeSearch_1 = __importDefault(require("../hooks/usePineconeSearch"));
/**
 * Production-ready component for Pinecone semantic search capabilities in Aixtiv Symphony
 */
const PineconeSearchInterface = ({ initialQuery = '', indexName, maxResults = 10, filters = {}, onResultsLoaded, namespace, className = 'pinecone-search-interface', includeMetadata = true, autoSearch = false }) => {
    const [query, setQuery] = (0, react_1.useState)(initialQuery);
    const { search, searchMemories, searchPrompts, loading, error, results } = (0, usePineconeSearch_1.default)();
    const performSearch = (0, react_1.useCallback)(async () => {
        if (!query.trim())
            return;
        try {
            await search(query, {
                index: indexName,
                filter: filters,
                topK: maxResults,
                includeMetadata,
                namespace
            });
            if (onResultsLoaded && results) {
                onResultsLoaded(results);
            }
        }
        catch (err) {
            console.error('Search error:', err);
        }
    }, [query, search, indexName, filters, maxResults, includeMetadata, namespace, onResultsLoaded, results]);
    // Perform initial search if autoSearch is enabled
    (0, react_1.useEffect)(() => {
        if (autoSearch && initialQuery) {
            performSearch();
        }
    }, [autoSearch, initialQuery, performSearch]);
    // Memory-specific search
    const searchUserMemories = (0, react_1.useCallback)(async (userId) => {
        if (!query.trim())
            return;
        return await searchMemories(query, userId, maxResults);
    }, [query, searchMemories, maxResults]);
    // Prompt-specific search
    const searchAgentPrompts = (0, react_1.useCallback)(async (agentId) => {
        if (!query.trim())
            return;
        return await searchPrompts(query, agentId, maxResults);
    }, [query, searchPrompts, maxResults]);
    // Advanced search with combined results
    const performAdvancedSearch = (0, react_1.useCallback)(async (options) => {
        if (!query.trim())
            return;
        const { memoryFilter, promptFilter, combineResults = false, weightMemories = 0.5, weightPrompts = 0.5 } = options;
        try {
            // Execute both searches in parallel
            const [memoryResults, promptResults] = await Promise.all([
                searchMemories(query, memoryFilter === null || memoryFilter === void 0 ? void 0 : memoryFilter.userId, maxResults),
                searchPrompts(query, promptFilter === null || promptFilter === void 0 ? void 0 : promptFilter.agentId, maxResults)
            ]);
            if (combineResults) {
                // Combine and rerank results based on weights
                const combined = [
                    ...memoryResults.map(r => (Object.assign(Object.assign({}, r), { score: r.score * weightMemories, source: 'memory' }))),
                    ...promptResults.map(r => (Object.assign(Object.assign({}, r), { score: r.score * weightPrompts, source: 'prompt' })))
                ].sort((a, b) => b.score - a.score).slice(0, maxResults);
                return {
                    memories: memoryResults,
                    prompts: promptResults,
                    combined
                };
            }
            return {
                memories: memoryResults,
                prompts: promptResults
            };
        }
        catch (err) {
            console.error('Advanced search error:', err);
            return { memories: [], prompts: [] };
        }
    }, [query, searchMemories, searchPrompts, maxResults]);
    return {
        query,
        setQuery,
        loading,
        error,
        results,
        performSearch,
        searchUserMemories,
        searchAgentPrompts,
        performAdvancedSearch
    };
};
exports.default = PineconeSearchInterface;
