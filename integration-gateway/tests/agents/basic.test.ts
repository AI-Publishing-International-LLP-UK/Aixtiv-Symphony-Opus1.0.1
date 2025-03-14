import { AgentManager } from '../../src/agents/AgentManager';

describe('Agent Basic Functionality', () => {
  let agentManager: AgentManager;

  beforeEach(() => {
    agentManager = new AgentManager();
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
    expect(registeredAgent?.name).toBe(testAgent.name);
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

