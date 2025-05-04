// src/agents/factory/AgentAdapterFactory.ts

import { EventEmitter } from 'events';

/**
 * Base interface for all agent operations
 */
export interface AgentOperation {
  id: string;
  type: string;
  params: Record<string, any>;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  result?: any;
  error?: Error;
}

/**
 * Common interface for all agent adapters
 */
export interface AgentAdapter {
  id: string;
  type: string;
  capabilities: string[];
  status: 'online' | 'offline' | 'busy' | 'error';
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  executeOperation(operation: AgentOperation): Promise<any>;
  getStatus(): Promise<{ status: string; details?: Record<string, any> }>;
}

/**
 * Configuration for agent adapter instances
 */
export interface AgentAdapterConfig {
  id: string;
  type: string;
  apiKey?: string;
  endpoint?: string;
  capabilities?: string[];
  options?: Record<string, any>;
}

/**
 * Factory class for creating and managing agent adapters
 */
export class AgentAdapterFactory extends EventEmitter {
  private static instance: AgentAdapterFactory;
  private adapters: Map<string, AgentAdapter>;
  private adapterTypes: Map<string, new (config: AgentAdapterConfig) => AgentAdapter>;
  
  private constructor() {
    super();
    this.adapters = new Map();
    this.adapterTypes = new Map();
  }

  /**
   * Get singleton instance of the factory
   */
  static getInstance(): AgentAdapterFactory {
    if (!AgentAdapterFactory.instance) {
      AgentAdapterFactory.instance = new AgentAdapterFactory();
    }
    return AgentAdapterFactory.instance;
  }

  /**
   * Register a new adapter type
   */
  registerAdapterType(
    type: string, 
    adapterClass: new (config: AgentAdapterConfig) => AgentAdapter
  ): void {
    this.adapterTypes.set(type, adapterClass);
    this.emit('adapter:typeRegistered', { type });
  }

  /**
   * Create a new agent adapter instance
   */
  createAdapter(config: AgentAdapterConfig): AgentAdapter {
    if (this.adapters.has(config.id)) {
      throw new Error(`Agent adapter with ID '${config.id}' already exists`);
    }

    const AdapterClass = this.adapterTypes.get(config.type);
    if (!AdapterClass) {
      throw new Error(`Unknown agent adapter type: ${config.type}`);
    }

    const adapter = new AdapterClass(config);
    this.adapters.set(config.id, adapter);
    this.emit('adapter:created', { id: adapter.id, type: adapter.type });
    
    return adapter;
  }

  /**
   * Get an existing adapter by ID
   */
  getAdapter(id: string): AgentAdapter | undefined {
    return this.adapters.get(id);
  }

  /**
   * Get all adapters of a specific type
   */
  getAdaptersByType(type: string): AgentAdapter[] {
    return Array.from(this.adapters.values())
      .filter(adapter => adapter.type === type);
  }

  /**
   * Find adapters with specific capabilities
   */
  findAdaptersByCapability(capability: string): AgentAdapter[] {
    return Array.from(this.adapters.values())
      .filter(adapter => adapter.capabilities.includes(capability));
  }

  /**
   * Remove an adapter instance
   */
  async removeAdapter(id: string): Promise<boolean> {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      return false;
    }

    try {
      await adapter.disconnect();
      this.adapters.delete(id);
      this.emit('adapter:removed', { id });
      return true;
    } catch (error) {
      console.error(`Error removing adapter ${id}:`, error);
      return false;
    }
  }

  /**
   * Example implementation of a basic OpenAI adapter
   */
  createOpenAIAdapter(config: AgentAdapterConfig): AgentAdapter {
    return this.createAdapter({
      ...config,
      type: 'openai'
    });
  }

  /**
   * Example implementation of a basic Claude adapter
   */
  createClaudeAdapter(config: AgentAdapterConfig): AgentAdapter {
    return this.createAdapter({
      ...config,
      type: 'claude'
    });
  }

  /**
   * Clear all adapters (for testing)
   */
  clear(): void {
    this.adapters.clear();
    this.emit('adapter:cleared');
  }
}

/**
 * Base class for implementing agent adapters
 */
export abstract class BaseAgentAdapter implements AgentAdapter {
  id: string;
  type: string;
  capabilities: string[];
  status: 'online' | 'offline' | 'busy' | 'error';
  protected config: AgentAdapterConfig;

  constructor(config: AgentAdapterConfig) {
    this.id = config.id;
    this.type = config.type;
    this.capabilities = config.capabilities || [];
    this.status = 'offline';
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract executeOperation(operation: AgentOperation): Promise<any>;
  
  async getStatus(): Promise<{ status: string; details?: Record<string, any> }> {
    return {
      status: this.status,
      details: {
        type: this.type,
        capabilities: this.capabilities
      }
    };
  }
}

export default AgentAdapterFactory;
