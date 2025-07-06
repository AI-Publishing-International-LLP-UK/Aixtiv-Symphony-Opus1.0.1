// src/agents/configurations/CoPilotConfigManager.ts

import { EventEmitter } from 'events';

/**
 * Types of configurations supported by the Co-Pilot system
 */
export enum ConfigType {
  AGENT = 'agent',
  WORKFLOW = 'workflow',
  INTEGRATION = 'integration',
  SECURITY = 'security',
  SYSTEM = 'system'
}

/**
 * Configuration source (where the config is stored/loaded from)
 */
export enum ConfigSource {
  LOCAL = 'local',
  FIREBASE = 'firebase',
  API = 'api',
  ENVIRONMENT = 'environment'
}

/**
 * Represents a configuration entry
 */
export interface ConfigEntry {
  id: string;
  type: ConfigType;
  name: string;
  description?: string;
  version: string;
  data: Record<string, any>;
  source: ConfigSource;
  createdAt: number;
  updatedAt: number;
  encrypted?: boolean;
  tags?: string[];
}

/**
 * Interface for configuration storage providers
 */
export interface ConfigStorageProvider {
  load(id: string): Promise<ConfigEntry | null>;
  loadAll(type?: ConfigType): Promise<ConfigEntry[]>;
  save(config: ConfigEntry): Promise<void>;
  delete(id: string): Promise<boolean>;
}

/**
 * Co-Pilot Configuration Manager
 * Responsible for managing and providing access to all configuration settings
 */
export class CoPilotConfigManager extends EventEmitter {
  private static instance: CoPilotConfigManager;
  private configs: Map<string, ConfigEntry>;
  private providers: Map<ConfigSource, ConfigStorageProvider>;
  private initialized: boolean = false;
  
  private constructor() {
    super();
    this.configs = new Map();
    this.providers = new Map();
  }
  
  /**
   * Get singleton instance of the configuration manager
   */
  static getInstance(): CoPilotConfigManager {
    if (!CoPilotConfigManager.instance) {
      CoPilotConfigManager.instance = new CoPilotConfigManager();
    }
    return CoPilotConfigManager.instance;
  }
  
  /**
   * Register a storage provider for a specific configuration source
   */
  registerProvider(source: ConfigSource, provider: ConfigStorageProvider): void {
    this.providers.set(source, provider);
    this.emit('provider:registered', { source });
  }
  
  /**
   * Initialize the configuration manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // Load configurations from all registered providers
    for (const [source, provider] of this.providers.entries()) {
      try {
        const configs = await provider.loadAll();
        configs.forEach(config => {
          this.configs.set(config.id, {
            ...config,
            source
          });
        });
        console.log(`Loaded ${configs.length} configurations from ${source}`);
      } catch (error) {
        console.error(`Failed to load configurations from ${source}:`, error);
      }
    }
    
    this.initialized = true;
    this.emit('initialized');
  }
  
  /**
   * Get a configuration by ID
   */
  getConfig<T = Record<string, any>>(id: string): T | null {
    const config = this.configs.get(id);
    if (!config) {
      return null;
    }
    return config.data as T;
  }
  
  /**
   * Get all configurations of a specific type
   */
  getConfigsByType(type: ConfigType): ConfigEntry[] {
    return Array.from(this.configs.values())
      .filter(config => config.type === type);
  }
  
  /**
   * Set or update a configuration
   */
  async setConfig(entry: Omit<ConfigEntry, 'createdAt' | 'updatedAt'>): Promise<ConfigEntry> {
    const now = Date.now();
    const existing = this.configs.get(entry.id);
    
    const configEntry: ConfigEntry = {
      ...entry,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    
    // Save to the appropriate provider
    const provider = this.providers.get(configEntry.source);
    if (!provider) {
      throw new Error(`No provider registered for source: ${configEntry.source}`);
    }
    
    await provider.save(configEntry);
    this.configs.set(configEntry.id, configEntry);
    this.emit('config:updated', { id: configEntry.id, type: configEntry.type });
    
    return configEntry;
  }
  
  /**
   * Delete a configuration by ID
   */
  async deleteConfig(id: string): Promise<boolean> {
    const config = this.configs.get(id);
    if (!config) {
      return false;
    }
    
    const provider = this.providers.get(config.source);
    if (!provider) {
      throw new Error(`No provider registered for source: ${config.source}`);
    }
    
    const success = await provider.delete(id);
    if (success) {
      this.configs.delete(id);
      this.emit('config:deleted', { id, type: config.type });
    }
    
    return success;
  }
  
  /**
   * Find configurations by tags
   */
  findConfigsByTags(tags: string[]): ConfigEntry[] {
    return Array.from(this.configs.values())
      .filter(config => tags.every(tag => config.tags?.includes(tag)));
  }
  
  /**
   * Create a new configuration entry
   */
  async createConfig(
    type: ConfigType,
    name: string,
    data: Record<string, any>,
    options: {
      description?: string;
      source?: ConfigSource;
      tags?: string[];
      encrypted?: boolean;
    } = {}
  ): Promise<ConfigEntry> {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return this.setConfig({
      id,
      type,
      name,
      description: options.description,
      version: '1.0.0',
      data,
      source: options.source || ConfigSource.LOCAL,
      encrypted: options.encrypted,
      tags: options.tags
    });
  }
  
  /**
   * Reset the manager (for testing)
   */
  reset(): void {
    this.configs.clear();
    this.providers.clear();
    this.initialized = false;
    this.emit('reset');
  }
}

export default CoPilotConfigManager;
