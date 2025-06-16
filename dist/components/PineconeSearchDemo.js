"use strict";
/**
 * Demo component for Pinecone vector search functionality
 *
 * @module components/PineconeSearchDemo
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const usePineconeSearch_1 = __importDefault(require("../hooks/usePineconeSearch"));
/**
 * Component for demonstrating Pinecone semantic search capabilities
 */
const PineconeSearchDemo = ({ defaultQuery = '', indexName = 'aixtiv-default', maxResults = 10 }) => {
    const [query, setQuery] = (0, react_1.useState)(defaultQuery);
    const [searchTrigger, setSearchTrigger] = (0, react_1.useState)(0);
    const { search, loading, error, results } = (0, usePineconeSearch_1.default)();
    (0, react_1.useEffect)(() => {
        if (defaultQuery && !searchTrigger) {
            // Perform initial search with default query
            search(defaultQuery, {
                index: indexName,
                topK: maxResults
            });
        }
    }, [defaultQuery, indexName, maxResults, search, searchTrigger]);
    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            search(query, {
                index: indexName,
                topK: maxResults
            });
            setSearchTrigger(prev => prev + 1);
        }
    };
    return (<div className="pinecone-search-demo">
      <h2>Semantic Search Demo</h2>
      <p>Search for semantically similar content in the {indexName} index</p>
      
      <form onSubmit={handleSearch} className="search-form">
        <div className="input-group">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Enter your search query..." className="search-input"/>
          <button type="submit" className="search-button" disabled={loading || !query.trim()}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>
      
      {error && (<div className="error-message">
          <p>Error: {error.message}</p>
        </div>)}
      
      {results.length > 0 ? (<div className="search-results">
          <h3>Search Results</h3>
          <ul className="results-list">
            {results.map((result) => (<li key={result.id} className="result-item">
                <div className="result-header">
                  <h4 className="result-id">{result.id}</h4>
                  <span className="result-score">Similarity: {(result.score * 100).toFixed(2)}%</span>
                </div>
                {result.metadata && (<div className="result-metadata">
                    {Object.entries(result.metadata).map(([key, value]) => (<div key={key} className="metadata-item">
                        <span className="metadata-key">{key}:</span>
                        <span className="metadata-value">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>))}
                  </div>)}
              </li>))}
          </ul>
        </div>) : searchTrigger > 0 && !loading ? (<div className="no-results">
          <p>No results found for your query.</p>
        </div>) : null}
    </div>);
};
exports.default = PineconeSearchDemo;
