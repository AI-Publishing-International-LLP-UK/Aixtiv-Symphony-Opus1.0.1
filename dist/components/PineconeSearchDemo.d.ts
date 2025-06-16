/**
 * Demo component for Pinecone vector search functionality
 *
 * @module components/PineconeSearchDemo
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */
import React from 'react';
interface PineconeSearchDemoProps {
    defaultQuery?: string;
    indexName?: string;
    maxResults?: number;
}
/**
 * Component for demonstrating Pinecone semantic search capabilities
 */
declare const PineconeSearchDemo: React.FC<PineconeSearchDemoProps>;
export default PineconeSearchDemo;
