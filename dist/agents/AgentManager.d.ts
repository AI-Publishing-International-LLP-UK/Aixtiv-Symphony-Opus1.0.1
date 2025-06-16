interface Agent {
    id: string;
    name: string;
    type: string;
    status: 'active' | 'inactive';
    capabilities?: string[];
}
export declare class AgentManager {
    private agents;
    private nextId;
    constructor();
    listAgents(): Agent[];
    createAgent(name: string, type: string): Agent;
    getAgent(id: string): Agent | undefined;
    activateAgent(id: string): Agent;
    deactivateAgent(id: string): Agent;
    registerAgent(agent: {
        id: string;
        name: string;
        capabilities?: string[];
        type?: string;
    }): Agent;
    deregisterAgent(id: string): void;
}
export {};
