"use strict";
/**
 * Agent Manager for Aixtiv Symphony Integration Gateway
 *
 * This module provides agent management functionality for creating, listing,
 * and managing AI agents in the integration gateway.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentManager = exports.AgentStatus = exports.AgentType = void 0;
const uuid_1 = require("uuid");
const events_1 = require("events");
/**
 * Available agent types
 */
var AgentType;
(function (AgentType) {
    AgentType["CLAUDE"] = "claude";
    AgentType["OPENAI"] = "openai";
    AgentType["ANTHROPIC"] = "anthropic";
    AgentType["CUSTOM"] = "custom";
})(AgentType || (exports.AgentType = AgentType = {}));
/**
 * Agent status
 */
var AgentStatus;
(function (AgentStatus) {
    AgentStatus["INITIALIZING"] = "initializing";
    AgentStatus["READY"] = "ready";
    AgentStatus["BUSY"] = "busy";
    AgentStatus["ERROR"] = "error";
    AgentStatus["SHUTDOWN"] = "shutdown";
})(AgentStatus || (exports.AgentStatus = AgentStatus = {}));
/**
 * Agent Manager class for handling AI agents
 */
class AgentManager extends events_1.EventEmitter {
    agents = new Map();
    static instance;
    /**
     * Create a new AgentManager or return the existing instance
     */
    constructor() {
        super();
        if (AgentManager.instance) {
            return AgentManager.instance;
        }
        AgentManager.instance = this;
    }
    /**
     * Create a new agent
     * @param name Agent name
     * @param type Agent type
     * @param metadata Additional metadata
     * @returns Created agent
     */
    createAgent(name, type, metadata = {}) {
        if (!name) {
            throw new Error('Agent name is required');
        }
        // Validate agent type
        let agentType;
        if (Object.values(AgentType).includes(type)) {
            agentType = type;
        }
        else {
            agentType = AgentType.CUSTOM;
        }
        // Create agent with default values
        const agent = {
            id: (0, uuid_1.v4)(),
            name,
            type: agentType,
            status: AgentStatus.INITIALIZING,
            created: new Date(),
            capabilities: this.getDefaultCapabilities(agentType),
            metadata: {
                ...metadata,
                version: '1.0.0'
            }
        };
        // Store agent
        this.agents.set(agent.id, agent);
        // Set agent status to ready after initialization
        setTimeout(() => {
            if (this.agents.has(agent.id)) {
                const updatedAgent = this.agents.get(agent.id);
                updatedAgent.status = AgentStatus.READY;
                this.agents.set(agent.id, updatedAgent);
                this.emit('agent:ready', updatedAgent);
            }
        }, 1000);
        this.emit('agent:created', agent);
        return agent;
    }
    /**
     * Get an agent by ID
     * @param id Agent ID
     * @returns Agent or null if not found
     */
    getAgent(id) {
        return this.agents.get(id) || null;
    }
    /**
     * List all agents
     * @param filterType Optional filter by agent type
     * @returns Array of agents
     */
    listAgents(filterType) {
        const agentArray = Array.from(this.agents.values());
        if (filterType) {
            return agentArray.filter(agent => agent.type === filterType);
        }
        return agentArray;
    }
    /**
     * Update agent status
     * @param id Agent ID
     * @param status New status
     * @returns Updated agent or null if not found
     */
    updateAgentStatus(id, status) {
        const agent = this.getAgent(id);
        if (!agent) {
            return null;
        }
        agent.status = status;
        agent.lastActive = new Date();
        this.agents.set(id, agent);
        this.emit('agent:status-updated', agent);
        return agent;
    }
    /**
     * Delete an agent
     * @param id Agent ID
     * @returns true if deleted, false if not found
     */
    deleteAgent(id) {
        const agent = this.getAgent(id);
        if (!agent) {
            return false;
        }
        this.agents.delete(id);
        this.emit('agent:deleted', agent);
        return true;
    }
    /**
     * Get default capabilities for an agent type
     * @param type Agent type
     * @returns Array of capability strings
     */
    getDefaultCapabilities(type) {
        const commonCapabilities = ['text', 'conversation'];
        switch (type) {
            case AgentType.CLAUDE:
                return [
                    ...commonCapabilities,
                    'text-generation',
                    'summarization',
                    'code-generation',
                    'question-answering',
                    'oauth2-authentication'
                ];
            case AgentType.OPENAI:
                return [
                    ...commonCapabilities,
                    'text-generation',
                    'image-generation',
                    'embedding',
                    'code-completion'
                ];
            case AgentType.ANTHROPIC:
                return [
                    ...commonCapabilities,
                    'text-generation',
                    'reasoning',
                    'tool-use'
                ];
            case AgentType.CUSTOM:
            default:
                return commonCapabilities;
        }
    }
}
exports.AgentManager = AgentManager;
exports.default = AgentManager;
//# sourceMappingURL=AgentManager.js.map