/**
 * Agent Manager for Aixtiv Symphony Integration Gateway
 * 
 * This module provides agent management functionality for creating, listing,
 * and managing AI agents in the integration gateway.
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

/**
 * Available agent types
 */
export enum AgentType {
  CLAUDE = 'claude',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  CUSTOM = 'custom'
}

/**
 * Agent status
 */
export enum AgentStatus {
  INITIALIZING = 'initializing',
  READY = 'ready',
  BUSY = 'busy',
  ERROR = 'error',
  SHUTDOWN = 'shutdown'
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
export class AgentManager extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private static instance: AgentManager;

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
  public createAgent(name: string, type: string, metadata: Record<string, any> = {}): Agent {
    if (!name) {
      throw new Error('Agent name is required');
    }

    // Validate agent type
    let agentType: AgentType;
    if (Object.values(AgentType).includes(type as AgentType)) {
      agentType = type as AgentType;
    } else {
      agentType = AgentType.CUSTOM;
    }

    // Create agent with default values
    const agent: Agent = {
      id: uuidv4(),
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
        const updatedAgent = this.agents.get(agent.id)!;
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
  public getAgent(id: string): Agent | null {
    return this.agents.get(id) || null;
  }

  /**
   * List all agents
   * @param filterType Optional filter by agent type
   * @returns Array of agents
   */
  public listAgents(filterType?: AgentType): Agent[] {
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
  public updateAgentStatus(id: string, status: AgentStatus): Agent | null {
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
  public deleteAgent(id: string): boolean {
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
  private getDefaultCapabilities(type: AgentType): string[] {
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

export default AgentManager;
