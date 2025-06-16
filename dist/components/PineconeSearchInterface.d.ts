/**
 * Production-ready Pinecone vector search interface for Aixtiv CLI
 *
 * @module components/PineconeSearchInterface
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */
import React from 'react';
interface PineconeSearchInterfaceProps {
    initialQuery?: string;
    indexName: string;
    maxResults?: number;
    filters?: Record<string, any>;
    onResultsLoaded?: (results: any[]) => void;
    namespace?: string;
    className?: string;
    includeMetadata?: boolean;
    autoSearch?: boolean;
}
/**
 * Production-ready component for Pinecone semantic search capabilities in Aixtiv Symphony
 */
declare const PineconeSearchInterface: React.FC<PineconeSearchInterfaceProps>;
export default PineconeSearchInterface;
