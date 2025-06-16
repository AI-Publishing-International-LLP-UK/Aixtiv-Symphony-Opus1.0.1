/**
 * Custom hook for Pinecone vector search functionality
 *
 * @module hooks/usePineconeSearch
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */
interface PineconeSearchOptions {
    index?: string;
    filter?: Record<string, any>;
    topK?: number;
    includeMetadata?: boolean;
    namespace?: string;
}
interface PineconeMatch {
    id: string;
    score: number;
    metadata?: Record<string, any>;
}
/**
 * Hook for performing semantic searches using Pinecone
 */
export declare function usePineconeSearch(): {
    search: (query: string, options?: PineconeSearchOptions) => Promise<PineconeMatch[]>;
    searchMemories: (query: string, userId?: string, topK?: number) => Promise<PineconeMatch[]>;
    searchPrompts: (query: string, agentId?: string, topK?: number) => Promise<PineconeMatch[]>;
    loading: boolean;
    error: Error | null;
    results: PineconeMatch[];
};
export default usePineconeSearch;
