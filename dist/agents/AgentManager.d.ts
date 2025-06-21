/**
 * Agent Manager for Aixtiv Symphony Integration Gateway
 *
 * This module provides agent management functionality for creating, listing,
 * and managing AI agents in the integration gateway.
 */
import { EventEmitter } from 'events';
/**
 * Available agent types
 */
export declare enum AgentType {
    CLAUDE = "claude",
    OPENAI = "openai",
    ANTHROPIC = "anthropic",
    CUSTOM = "custom"
}
/**
 * Agent status
 */
export declare enum AgentStatus {
    INITIALIZING = "initializing",
    READY = "ready",
    BUSY = "busy",
    ERROR = "error",
    SHUTDOWN = "shutdown"
}
/**
 * Agent interface
 */
export interface Agent {
    id: string;
    name: string;
    type: AgentType;
    status: AgentStatus;
    created: Date;
    lastActive?: Date;
    capabilities: string[];
    metadata: Record<string, any>;
}
/**
 * Agent Manager class for handling AI agents
 */
export declare class AgentManager extends EventEmitter {
    private agents;
    private static instance;
    /**
     * Create a new AgentManager or return the existing instance
     */
    constructor();
    /**
     * Create a new agent
     * @param name Agent name
     * @param type Agent type
     * @param metadata Additional metadata
     * @returns Created agent
     */
    createAgent(name: string, type: string, metadata?: Record<string, any>): Agent;
    /**
     * Get an agent by ID
     * @param id Agent ID
     * @returns Agent or null if not found
     */
    getAgent(id: string): Agent | null;
    /**
     * List all agents
     * @param filterType Optional filter by agent type
     * @returns Array of agents
     */
    listAgents(filterType?: AgentType): Agent[];
    /**
     * Update agent status
     * @param id Agent ID
     * @param status New status
     * @returns Updated agent or null if not found
     */
    updateAgentStatus(id: string, status: AgentStatus): Agent | null;
    /**
     * Delete an agent
     * @param id Agent ID
     * @returns true if deleted, false if not found
     */
    deleteAgent(id: string): boolean;
    /**
     * Get default capabilities for an agent type
     * @param type Agent type
     * @returns Array of capability strings
     */
    private getDefaultCapabilities;
}
export default AgentManager;
