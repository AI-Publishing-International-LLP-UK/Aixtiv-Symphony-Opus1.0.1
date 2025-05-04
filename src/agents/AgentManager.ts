interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive';
  capabilities?: string[];
}

export class AgentManager {
  private agents: Map<string, Agent>;
  private nextId: number;

  constructor() {
    this.agents = new Map();
    this.nextId = 1;
  }

  listAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  createAgent(name: string, type: string): Agent {
    if (!name || !type) {
      throw new Error('Agent name and type are required');
    }

    const id = `agent_${this.nextId++}`;
    const agent: Agent = {
      id,
      name,
      type,
      status: 'inactive'
    };

    this.agents.set(id, agent);
    return agent;
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  activateAgent(id: string): Agent {
    const agent = this.getAgent(id);
    if (!agent) {
      throw new Error('Agent not found');
    }

    agent.status = 'active';
    return agent;
  }

  deactivateAgent(id: string): Agent {
    const agent = this.getAgent(id);
    if (!agent) {
      throw new Error('Agent not found');
    }

    agent.status = 'inactive';
    return agent;
  }

  registerAgent(agent: { id: string; name: string; capabilities?: string[]; type?: string }): Agent {
    if (!agent.id || !agent.name) {
      throw new Error('Agent ID and name are required');
    }

    const newAgent: Agent = {
      id: agent.id,
      name: agent.name,
      type: agent.type || 'default',
      status: 'inactive',
      capabilities: agent.capabilities
    };

    this.agents.set(agent.id, newAgent);
    return newAgent;
  }

  deregisterAgent(id: string): void {
    if (!this.agents.has(id)) {
      throw new Error('Agent not found');
    }
    this.agents.delete(id);
  }
}
