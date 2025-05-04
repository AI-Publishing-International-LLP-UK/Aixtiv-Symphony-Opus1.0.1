"use strict";
// src/agents/factory/AgentAdapterFactory.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAgentAdapter = exports.AgentAdapterFactory = void 0;
const events_1 = require("events");
/**
 * Factory class for creating and managing agent adapters
 */
class AgentAdapterFactory extends events_1.EventEmitter {
    constructor() {
        super();
        this.adapters = new Map();
        this.adapterTypes = new Map();
    }
    /**
     * Get singleton instance of the factory
     */
    static getInstance() {
        if (!AgentAdapterFactory.instance) {
            AgentAdapterFactory.instance = new AgentAdapterFactory();
        }
        return AgentAdapterFactory.instance;
    }
    /**
     * Register a new adapter type
     */
    registerAdapterType(type, adapterClass) {
        this.adapterTypes.set(type, adapterClass);
        this.emit('adapter:typeRegistered', { type });
    }
    /**
     * Create a new agent adapter instance
     */
    createAdapter(config) {
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
    getAdapter(id) {
        return this.adapters.get(id);
    }
    /**
     * Get all adapters of a specific type
     */
    getAdaptersByType(type) {
        return Array.from(this.adapters.values())
            .filter(adapter => adapter.type === type);
    }
    /**
     * Find adapters with specific capabilities
     */
    findAdaptersByCapability(capability) {
        return Array.from(this.adapters.values())
            .filter(adapter => adapter.capabilities.includes(capability));
    }
    /**
     * Remove an adapter instance
     */
    removeAdapter(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const adapter = this.adapters.get(id);
            if (!adapter) {
                return false;
            }
            try {
                yield adapter.disconnect();
                this.adapters.delete(id);
                this.emit('adapter:removed', { id });
                return true;
            }
            catch (error) {
                console.error(`Error removing adapter ${id}:`, error);
                return false;
            }
        });
    }
    /**
     * Example implementation of a basic OpenAI adapter
     */
    createOpenAIAdapter(config) {
        return this.createAdapter(Object.assign(Object.assign({}, config), { type: 'openai' }));
    }
    /**
     * Example implementation of a basic Claude adapter
     */
    createClaudeAdapter(config) {
        return this.createAdapter(Object.assign(Object.assign({}, config), { type: 'claude' }));
    }
    /**
     * Clear all adapters (for testing)
     */
    clear() {
        this.adapters.clear();
        this.emit('adapter:cleared');
    }
}
exports.AgentAdapterFactory = AgentAdapterFactory;
/**
 * Base class for implementing agent adapters
 */
class BaseAgentAdapter {
    constructor(config) {
        this.id = config.id;
        this.type = config.type;
        this.capabilities = config.capabilities || [];
        this.status = 'offline';
        this.config = config;
    }
    getStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                status: this.status,
                details: {
                    type: this.type,
                    capabilities: this.capabilities
                }
            };
        });
    }
}
exports.BaseAgentAdapter = BaseAgentAdapter;
exports.default = AgentAdapterFactory;
