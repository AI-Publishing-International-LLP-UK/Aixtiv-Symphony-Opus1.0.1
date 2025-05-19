// src/interfaces/ai/AIConnectorInterfaces.ts

/**
 * Message representation in an AI conversation
 */
export ;
}

/**
 * Common completion options for AI models
 */
export 

/**
 * Function to be used by AI completions
 */
export 
    >;
    required?;
  };
}

/**
 * Tool to be used by AI completions
 */
export 

/**
 * Result of an AI completion
 */
export ;
  functionCall?: {
    name;
    arguments;
  };
}

/**
 * Result of a chat completion
 */
export ;
}

/**
 * Types of AI content supported
 */
export enum AIContentType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  EMBEDDING = 'embedding',
}

/**
 * Main 

/**
 * Factory for creating AI connectors
 */
export 

/**
 * Abstract base class for AI connectors
 * Provides common functionality for derived classes
 */
export abstract class BaseAIConnector implements AIConnector {
  name;
  apiKey;
  baseUrl;

  constructor(name, apiKey, baseUrl) {
    this.name = name;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  getName(){
    return this.name;
  }

  abstract getSupportedModels();
  abstract generateCompletion(
    prompt,
    options);
  abstract generateChatCompletion(
    messages,
    options);
  abstract generateEmbeddings(
    text,
    model?);

  abstract streamCompletion(
    prompt,
    options,
    onChunk: (chunk=> void,
    onComplete: (result=> void,
    onError: (error=> void
  );

  abstract streamChatCompletion(
    messages,
    options,
    onChunk: (chunk=> void,
    onComplete: (result=> void,
    onError: (error=> void
  );

  /**
   * Utility method to convert tokens to estimated character count
   */
  tokensToChars(tokenCount){
    // Approximation: 1 token ≈ 4 characters in English
    return tokenCount * 4;
  }

  /**
   * Utility method to estimate token count from text
   */
  estimateTokenCount(text){
    // Simple approximation: 1 token ≈ 4 characters in English
    return Math.ceil(text.length / 4);
  }
}

/**
 * Implementation of the AI connector factory
 */
export class AIConnectorFactoryImpl implements AIConnectorFactory {
  connectorTypes,
    new (config=> AIConnector
  >;

  constructor() {
    this.connectorTypes = new Map();
  }

  /**
   * Register a new connector type
   */
  registerConnectorType(
    type,
    constructor: new (config=> AIConnector
  ){
    this.connectorTypes.set(type, constructor);
  }

  /**
   * Create a new AI connector with the specified type
   */
  createConnector(
    type: 'openai' | 'claude' | 'gemini' | 'llama' | string,
    config){
    const Constructor = this.connectorTypes.get(type);
    if (!Constructor) {
      throw new Error(`Unknown AI connector type: ${type}`);
    }

    return new Constructor(config);
  }

  /**
   * Get available connector types
   */
  getAvailableConnectors(){
    return Array.from(this.connectorTypes.keys());
  }
}

export default {
  AIContentType,
  BaseAIConnector,
  AIConnectorFactoryImpl,
};
