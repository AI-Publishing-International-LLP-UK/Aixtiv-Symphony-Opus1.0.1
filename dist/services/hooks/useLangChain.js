/**
 * LangChain React Hook
 * Provides easy access to LangChain functionality in React components
 * Version: 1.0.0
 */

import { useState, useCallback } from 'react';
import { v4 } from 'uuid';
import langchainService, {
  LangChainPromptOptions,
  LangChainConversationOptions,
  LangChainDocumentStoreOptions,
  LangChainSearchOptions,
} from '../langchain-service';

export 

export >;
  
  /**
   * Create a document store
   * @param options The document store options
   * @returns Success status and index name
   */
  createDocumentStore: (
    options=> Promise;
  
  /**
   * Search documents
   * @param options The search options
   * @returns Search results
   */
  searchDocuments: (
    options=> Promise;
  
  /**
   * Find similar content to a given text
   * @param text The text to find similar content for
   * @param indexName The index to search in
   * @param k The number of results to return
   * @returns Similar documents
   */
  findSimilarContent: (
    text,
    indexName,
    k?=> Promise;
  
  /**
   * Answer a question with context from documents
   * @param question The question to answer
   * @param indexName The index to search for context
   * @returns The answer
   */
  answerWithContext: (
    question,
    indexName,
    options?: {
      k?;
    }
  ) => Promise;
  
  /**
   * Generate a unique session ID for conversations
   * @returns A unique session ID
   */
  generateSessionId=> string;
  
  /**
   * Whether the service is currently loading
   */
  loading;
  
  /**
   * Current error, if any
   */
  error;
}

/**
 * Hook for using LangChain in React components
 * @param options Options for the hook
 * @returns LangChain functions and state
 */
export const useLangChain = (
  options= {}
)=> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const {
    defaultModel = 'gpt-4',
    defaultProvider = 'openai',
    defaultTemperature = 0.7,
    onError,
  } = options;
  
  /**
   * Handle errors
   */
  const handleError = useCallback(
    (error=> {
      setError(error);
      setLoading(false);
      
      if (onError) {
        onError(error);
      }
      
      console.error('LangChain error:', error);
    },
    [onError]
  );
  
  /**
   * Run a LangChain prompt
   */
  const runPrompt = useCallback(
    async (
      options, 'model' | 'provider' | 'temperature'>
    )=> {
      try {
        setLoading(true);
        setError(null);
        
        const result = await langchainService.runPrompt({
          ...options,
          model,
          provider,
          temperature,
        });
        
        setLoading(false);
        return result;
      } catch (error) {
        handleError(error;
        throw error;
      }
    },
    [defaultModel, defaultProvider, defaultTemperature, handleError]
  );
  
  /**
   * Run a LangChain conversation with memory
   */
  const runConversation = useCallback(
    async (
      options,
        'model' | 'provider' | 'temperature'
      >
    ){ response; memory: string }> => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await langchainService.runConversation({
          ...options,
          model,
          provider,
          temperature,
        });
        
        setLoading(false);
        return result;
      } catch (error) {
        handleError(error;
        throw error;
      }
    },
    [defaultModel, defaultProvider, defaultTemperature, handleError]
  );
  
  /**
   * Create a document store
   */
  const createDocumentStore = useCallback(
    async (
      options){ success; indexName: string }> => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await langchainService.createDocumentStore(options);
        
        setLoading(false);
        return result;
      } catch (error) {
        handleError(error;
        throw error;
      }
    },
    [handleError]
  );
  
  /**
   * Search documents
   */
  const searchDocuments = useCallback(
    async (
      options){
      documents: {
        content;
        metadata;
      }[];
    }> => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await langchainService.searchDocuments(options);
        
        setLoading(false);
        return result;
      } catch (error) {
        handleError(error;
        throw error;
      }
    },
    [handleError]
  );
  
  /**
   * Find similar content to a given text
   */
  const findSimilarContent = useCallback(
    async (
      text,
      indexName,
      k= 5
    ){
      documents: {
        content;
        metadata;
      }[];
    }> => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await langchainService.findSimilarContent(text, indexName, k);
        
        setLoading(false);
        return result;
      } catch (error) {
        handleError(error;
        throw error;
      }
    },
    [handleError]
  );
  
  /**
   * Answer a question with context from documents
   */
  const answerWithContext = useCallback(
    async (
      question,
      indexName,
      options: {
        k?;
      } = {}
    )=> {
      try {
        setLoading(true);
        setError(null);
        
        const result = await langchainService.answerWithContext(
          question,
          indexName,
          {
            model,
            provider,
            temperature,
            k,
          }
        );
        
        setLoading(false);
        return result;
      } catch (error) {
        handleError(error;
        throw error;
      }
    },
    [defaultModel, defaultProvider, defaultTemperature, handleError]
  );
  
  /**
   * Generate a unique session ID for conversations
   */
  const generateSessionId = useCallback(()=> {
    return uuidv4();
  }, []);
  
  return {
    runPrompt,
    runConversation,
    createDocumentStore,
    searchDocuments,
    findSimilarContent,
    answerWithContext,
    generateSessionId,
    loading,
    error,
  };
};

export default useLangChain;