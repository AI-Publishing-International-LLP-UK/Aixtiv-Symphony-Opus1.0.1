"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AgentManager_1 = require("../../src/agents/AgentManager");
describe('Agent Basic Functionality', () => {
    let agentManager;
    beforeEach(() => {
        agentManager = new AgentManager_1.AgentManager();
    });
    it('should initialize without errors', () => {
        expect(agentManager).toBeDefined();
    });
    it('should handle agent registration', () => {
        const testAgent = {
            id: 'test-agent-1',
            name: 'Test Agent',
            capabilities: ['test']
        };
        agentManager.registerAgent(testAgent);
        const registeredAgent = agentManager.getAgent(testAgent.id);
        expect(registeredAgent).toBeDefined();
        expect(registeredAgent === null || registeredAgent === void 0 ? void 0 : registeredAgent.name).toBe(testAgent.name);
    });
    it('should handle agent deregistration', () => {
        const testAgent = {
            id: 'test-agent-2',
            name: 'Test Agent 2',
            capabilities: ['test']
        };
        agentManager.registerAgent(testAgent);
        agentManager.deregisterAgent(testAgent.id);
        const registeredAgent = agentManager.getAgent(testAgent.id);
        expect(registeredAgent).toBeUndefined();
    });
});
