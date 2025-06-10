// src/agents/factory/AgentAdapterFactory.ts

import { EventEmitter } from 'events';

/**
 * Base 

/**
 * Common >;
}

/**
 * Configuration for agent adapter instances
 */
export 

/**
 * Factory class for creating and managing agent adapters
 */
export class AgentAdapterFactory extends EventEmitter {
  static instance;
  adapters;
  adapterTypes,
    new (config=> AgentAdapter
  >;

  constructor() {
    super();
    this.adapters = new Map();
    this.adapterTypes = new Map();
  }

  /**
   * Get singleton instance of the factory
   */
  static getInstance(){
    if (!AgentAdapterFactory.instance) {
      AgentAdapterFactory.instance = new AgentAdapterFactory();
    }
    return AgentAdapterFactory.instance;
  }

  /**
   * Register a new adapter type
   */
  registerAdapterType(
    type,
    adapterClass: new (config=> AgentAdapter
  ){
    this.adapterTypes.set(type, adapterClass);
    this.emit('adapter:typeRegistered', { type });
  }

  /**
   * Create a new agent adapter instance
   */
  createAdapter(config){
    if (this.adapters.has(config.id)) {
      throw new Error(`Agent adapter with ID '${config.id}' already exists`);
    }

    const AdapterClass = this.adapterTypes.get(config.type);
    if (!AdapterClass) {
      throw new Error(`Unknown agent adapter type: ${config.type}`);
    }

    const adapter = new AdapterClass(config);
    this.adapters.set(config.id, adapter);
    this.emit('adapter:created', { id, type: adapter.type });

    return adapter;
  }

  /**
   * Get an existing adapter by ID
   */
  getAdapter(id){
    return this.adapters.get(id);
  }

  /**
   * Get all adapters of a specific type
   */
  getAdaptersByType(type){
    return Array.from(this.adapters.values()).filter(
      adapter => adapter.type === type
    );
  }

  /**
   * Find adapters with specific capabilities
   */
  findAdaptersByCapability(capability){
    return Array.from(this.adapters.values()).filter(adapter =>
      adapter.capabilities.includes(capability)
    );
  }

  /**
   * Remove an adapter instance
   */
  async removeAdapter(id){
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
  createOpenAIAdapter(config){
    return this.createAdapter({
      ...config,
      type: 'openai',
    });
  }

  /**
   * Example implementation of a basic Claude adapter
   */
  createClaudeAdapter(config){
    return this.createAdapter({
      ...config,
      type: 'claude',
    });
  }

  /**
   * Clear all adapters (for testing)
   */
  clear(){
    this.adapters.clear();
    this.emit('adapter:cleared');
  }
}

/**
 * Base class for implementing agent adapters
 */
export abstract class BaseAgentAdapter implements AgentAdapter {
  id;
  type;
  capabilities;
  status: 'online' | 'offline' | 'busy' | 'error';
  config;

  constructor(config) {
    this.id = config.id;
    this.type = config.type;
    this.capabilities = config.capabilities || [];
    this.status = 'offline';
    this.config = config;
  }

  abstract connect();
  abstract disconnect();
  abstract executeOperation(operation);

  async getStatus(){
    status;
    details?;
  }> {
    return {
      status,
      details: {
        type,
        capabilities,
      },
    };
  }
}

export default AgentAdapterFactory;
