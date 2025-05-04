"use strict";
// src/interfaces/ai/AIConnectorInterfaces.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIConnectorFactoryImpl = exports.BaseAIConnector = exports.AIContentType = void 0;
/**
 * Types of AI content supported
 */
var AIContentType;
(function (AIContentType) {
    AIContentType["TEXT"] = "text";
    AIContentType["IMAGE"] = "image";
    AIContentType["AUDIO"] = "audio";
    AIContentType["VIDEO"] = "video";
    AIContentType["EMBEDDING"] = "embedding";
})(AIContentType || (exports.AIContentType = AIContentType = {}));
/**
 * Abstract base class for AI connectors
 * Provides common functionality for derived classes
 */
class BaseAIConnector {
    constructor(name, apiKey, baseUrl) {
        this.name = name;
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }
    getName() {
        return this.name;
    }
    /**
     * Utility method to convert tokens to estimated character count
     */
    tokensToChars(tokenCount) {
        // Approximation: 1 token ≈ 4 characters in English
        return tokenCount * 4;
    }
    /**
     * Utility method to estimate token count from text
     */
    estimateTokenCount(text) {
        // Simple approximation: 1 token ≈ 4 characters in English
        return Math.ceil(text.length / 4);
    }
}
exports.BaseAIConnector = BaseAIConnector;
/**
 * Implementation of the AI connector factory
 */
class AIConnectorFactoryImpl {
    constructor() {
        this.connectorTypes = new Map();
    }
    /**
     * Register a new connector type
     */
    registerConnectorType(type, constructor) {
        this.connectorTypes.set(type, constructor);
    }
    /**
     * Create a new AI connector with the specified type
     */
    createConnector(type, config) {
        const Constructor = this.connectorTypes.get(type);
        if (!Constructor) {
            throw new Error(`Unknown AI connector type: ${type}`);
        }
        return new Constructor(config);
    }
    /**
     * Get available connector types
     */
    getAvailableConnectors() {
        return Array.from(this.connectorTypes.keys());
    }
}
exports.AIConnectorFactoryImpl = AIConnectorFactoryImpl;
exports.default = {
    AIContentType,
    BaseAIConnector,
    AIConnectorFactoryImpl
};
