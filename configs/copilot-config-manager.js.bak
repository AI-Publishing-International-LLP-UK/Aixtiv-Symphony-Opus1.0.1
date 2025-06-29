"use strict";
// src/agents/configurations/CoPilotConfigManager.ts
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
exports.CoPilotConfigManager = exports.ConfigSource = exports.ConfigType = void 0;
const events_1 = require("events");
/**
 * Types of configurations supported by the Co-Pilot system
 */
var ConfigType;
(function (ConfigType) {
    ConfigType["AGENT"] = "agent";
    ConfigType["WORKFLOW"] = "workflow";
    ConfigType["INTEGRATION"] = "integration";
    ConfigType["SECURITY"] = "security";
    ConfigType["SYSTEM"] = "system";
})(ConfigType || (exports.ConfigType = ConfigType = {}));
/**
 * Configuration source (where the config is stored/loaded from)
 */
var ConfigSource;
(function (ConfigSource) {
    ConfigSource["LOCAL"] = "local";
    ConfigSource["FIREBASE"] = "firebase";
    ConfigSource["API"] = "api";
    ConfigSource["ENVIRONMENT"] = "environment";
})(ConfigSource || (exports.ConfigSource = ConfigSource = {}));
/**
 * Co-Pilot Configuration Manager
 * Responsible for managing and providing access to all configuration settings
 */
class CoPilotConfigManager extends events_1.EventEmitter {
    constructor() {
        super();
        this.initialized = false;
        this.configs = new Map();
        this.providers = new Map();
    }
    /**
     * Get singleton instance of the configuration manager
     */
    static getInstance() {
        if (!CoPilotConfigManager.instance) {
            CoPilotConfigManager.instance = new CoPilotConfigManager();
        }
        return CoPilotConfigManager.instance;
    }
    /**
     * Register a storage provider for a specific configuration source
     */
    registerProvider(source, provider) {
        this.providers.set(source, provider);
        this.emit('provider:registered', { source });
    }
    /**
     * Initialize the configuration manager
     */
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.initialized) {
                return;
            }
            // Load configurations from all registered providers
            for (const [source, provider] of this.providers.entries()) {
                try {
                    const configs = yield provider.loadAll();
                    configs.forEach(config => {
                        this.configs.set(config.id, Object.assign(Object.assign({}, config), { source }));
                    });
                    console.log(`Loaded ${configs.length} configurations from ${source}`);
                }
                catch (error) {
                    console.error(`Failed to load configurations from ${source}:`, error);
                }
            }
            this.initialized = true;
            this.emit('initialized');
        });
    }
    /**
     * Get a configuration by ID
     */
    getConfig(id) {
        const config = this.configs.get(id);
        if (!config) {
            return null;
        }
        return config.data;
    }
    /**
     * Get all configurations of a specific type
     */
    getConfigsByType(type) {
        return Array.from(this.configs.values())
            .filter(config => config.type === type);
    }
    /**
     * Set or update a configuration
     */
    setConfig(entry) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            const existing = this.configs.get(entry.id);
            const configEntry = Object.assign(Object.assign({}, entry), { createdAt: (existing === null || existing === void 0 ? void 0 : existing.createdAt) || now, updatedAt: now });
            // Save to the appropriate provider
            const provider = this.providers.get(configEntry.source);
            if (!provider) {
                throw new Error(`No provider registered for source: ${configEntry.source}`);
            }
            yield provider.save(configEntry);
            this.configs.set(configEntry.id, configEntry);
            this.emit('config:updated', { id: configEntry.id, type: configEntry.type });
            return configEntry;
        });
    }
    /**
     * Delete a configuration by ID
     */
    deleteConfig(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = this.configs.get(id);
            if (!config) {
                return false;
            }
            const provider = this.providers.get(config.source);
            if (!provider) {
                throw new Error(`No provider registered for source: ${config.source}`);
            }
            const success = yield provider.delete(id);
            if (success) {
                this.configs.delete(id);
                this.emit('config:deleted', { id, type: config.type });
            }
            return success;
        });
    }
    /**
     * Find configurations by tags
     */
    findConfigsByTags(tags) {
        return Array.from(this.configs.values())
            .filter(config => tags.every(tag => { var _a; return (_a = config.tags) === null || _a === void 0 ? void 0 : _a.includes(tag); }));
    }
    /**
     * Create a new configuration entry
     */
    createConfig(type_1, name_1, data_1) {
        return __awaiter(this, arguments, void 0, function* (type, name, data, options = {}) {
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
        });
    }
    /**
     * Reset the manager (for testing)
     */
    reset() {
        this.configs.clear();
        this.providers.clear();
        this.initialized = false;
        this.emit('reset');
    }
}
exports.CoPilotConfigManager = CoPilotConfigManager;
exports.default = CoPilotConfigManager;
