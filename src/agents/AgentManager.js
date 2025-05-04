"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentManager = void 0;
class AgentManager {
    constructor() {
        this.agents = new Map();
        this.nextId = 1;
    }
    listAgents() {
        return Array.from(this.agents.values());
    }
    createAgent(name, type) {
        if (!name || !type) {
            throw new Error('Agent name and type are required');
        }
        const id = `agent_${this.nextId++}`;
        const agent = {
            id,
            name,
            type,
            status: 'inactive'
        };
        this.agents.set(id, agent);
        return agent;
    }
    getAgent(id) {
        return this.agents.get(id);
    }
    activateAgent(id) {
        const agent = this.getAgent(id);
        if (!agent) {
            throw new Error('Agent not found');
        }
        agent.status = 'active';
        return agent;
    }
    deactivateAgent(id) {
        const agent = this.getAgent(id);
        if (!agent) {
            throw new Error('Agent not found');
        }
        agent.status = 'inactive';
        return agent;
    }
    registerAgent(agent) {
        if (!agent.id || !agent.name) {
            throw new Error('Agent ID and name are required');
        }
        const newAgent = {
            id: agent.id,
            name: agent.name,
            type: agent.type || 'default',
            status: 'inactive',
            capabilities: agent.capabilities
        };
        this.agents.set(agent.id, newAgent);
        return newAgent;
    }
    deregisterAgent(id) {
        if (!this.agents.has(id)) {
            throw new Error('Agent not found');
        }
        this.agents.delete(id);
    }
}
exports.AgentManager = AgentManager;
