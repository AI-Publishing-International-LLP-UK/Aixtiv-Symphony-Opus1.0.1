// src/interfaces/ai/AIConnectorInterfaces.ts

/**
 * Message representation in an AI conversation
 */
export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
}

/**
 * Common completion options for AI models
 */
export interface AICompletionOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  systemPrompt?: string;
  functions?: AIFunction[];
  tools?: AITool[];
}

/**
 * Function to be used by AI completions
 */
export interface AIFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

/**
 * Tool to be used by AI completions
 */
export interface AITool {
  type: string;
  function: AIFunction;
}

/**
 * Result of an AI completion
 */
export interface AICompletionResult {
  id: string;
  text: string;
  finishReason: 'stop' | 'length' | 'function_call' | 'content_filter';
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  functionCall?: {
    name: string;
    arguments: Record<string, any>;
  };
}

/**
 * Result of a chat completion
 */
export interface AIChatCompletionResult {
  id: string;
  messages: AIMessage[];
  finishReason: 'stop' | 'length' | 'function_call' | 'content_filter';
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Types of AI content supported
 */
export enum AIContentType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  EMBEDDING = 'embedding'
}

/**
 * Main interface for AI connectors
 */
export interface AIConnector {
  /**
   * Get the connector name
   */
  getName(): string;
  
  /**
   * Get supported AI models
   */
  getSupportedModels(): Promise<string[]>;
  
  /**
   * Generate a completion (text) from a prompt
   */
  generateCompletion(prompt: string, options: AICompletionOptions): Promise<AICompletionResult>;
  
  /**
   * Generate a chat completion from a list of messages
   */
  generateChatCompletion(messages: AIMessage[], options: AICompletionOptions): Promise<AIChatCompletionResult>;
  
  /**
   * Generate embeddings for a given text
   */
  generateEmbeddings(text: string | string[], model?: string): Promise<number[][]>;
  
  /**
   * Stream a completion with callbacks for each chunk
   */
  streamCompletion(
    prompt: string, 
    options: AICompletionOptions, 
    onChunk: (chunk: string) => void,
    onComplete: (result: AICompletionResult) => void,
    onError: (error: Error) => void
  ): Promise<void>;
  
  /**
   * Stream a chat completion with callbacks for each chunk
   */
  streamChatCompletion(
    messages: AIMessage[],
    options: AICompletionOptions,
    onChunk: (chunk: AIMessage) => void,
    onComplete: (result: AIChatCompletionResult) => void,
    onError: (error: Error) => void
  ): Promise<void>;
}

/**
 * Factory for creating AI connectors
 */
export interface AIConnectorFactory {
  /**
   * Create a new AI connector with the specified type
   */
  createConnector(
    type: 'openai' | 'claude' | 'gemini' | 'llama' | string,
    config: Record<string, any>
  ): AIConnector;
  
  /**
   * Get available connector types
   */
  getAvailableConnectors(): string[];
}

/**
 * Abstract base class for AI connectors
 * Provides common functionality for derived classes
 */
export abstract class BaseAIConnector implements AIConnector {
  protected name: string;
  protected apiKey: string;
  protected baseUrl: string;
  
  constructor(name: string, apiKey: string, baseUrl: string) {
    this.name = name;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }
  
  getName(): string {
    return this.name;
  }
  
  abstract getSupportedModels(): Promise<string[]>;
  abstract generateCompletion(prompt: string, options: AICompletionOptions): Promise<AICompletionResult>;
  abstract generateChatCompletion(messages: AIMessage[], options: AICompletionOptions): Promise<AIChatCompletionResult>;
  abstract generateEmbeddings(text: string | string[], model?: string): Promise<number[][]>;
  
  abstract streamCompletion(
    prompt: string, 
    options: AICompletionOptions, 
    onChunk: (chunk: string) => void,
    onComplete: (result: AICompletionResult) => void,
    onError: (error: Error) => void
  ): Promise<void>;
  
  abstract streamChatCompletion(
    messages: AIMessage[],
    options: AICompletionOptions,
    onChunk: (chunk: AIMessage) => void,
    onComplete: (result: AIChatCompletionResult) => void,
    onError: (error: Error) => void
  ): Promise<void>;
  
  /**
   * Utility method to convert tokens to estimated character count
   */
  protected tokensToChars(tokenCount: number): number {
    // Approximation: 1 token ≈ 4 characters in English
    return tokenCount * 4;
  }
  
  /**
   * Utility method to estimate token count from text
   */
  protected estimateTokenCount(text: string): number {
    // Simple approximation: 1 token ≈ 4 characters in English
    return Math.ceil(text.length / 4);
  }
}

/**
 * Implementation of the AI connector factory
 */
export class AIConnectorFactoryImpl implements AIConnectorFactory {
  private connectorTypes: Map<string, new (config: Record<string, any>) => AIConnector>;
  
  constructor() {
    this.connectorTypes = new Map();
  }
  
  /**
   * Register a new connector type
   */
  registerConnectorType(
    type: string, 
    constructor: new (config: Record<string, any>) => AIConnector
  ): void {
    this.connectorTypes.set(type, constructor);
  }
  
  /**
   * Create a new AI connector with the specified type
   */
  createConnector(
    type: 'openai' | 'claude' | 'gemini' | 'llama' | string,
    config: Record<string, any>
  ): AIConnector {
    const Constructor = this.connectorTypes.get(type);
    if (!Constructor) {
      throw new Error(`Unknown AI connector type: ${type}`);
    }
    
    return new Constructor(config);
  }
  
  /**
   * Get available connector types
   */
  getAvailableConnectors(): string[] {
    return Array.from(this.connectorTypes.keys());
  }
}

export default { 
  AIContentType,
  BaseAIConnector,
  AIConnectorFactoryImpl
};
