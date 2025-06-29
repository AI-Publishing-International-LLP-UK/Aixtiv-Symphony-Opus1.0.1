import request from 'supertest';
import app from '../../src/index';
import { AgentManager } from '../../src/agents/AgentManager';

describe('Integration Gateway API', () => {
  let agentManager: AgentManager;
  let authToken: string;

  beforeAll(async () => {
    agentManager = new AgentManager();
    const authResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'testpass' });
    authToken = authResponse.body.token;
  });

  describe('Health and Status', () => {
    test('GET /api/health returns status ok', async () => {
      await request(app)
        .get('/api/health')
        .expect(200)
        .expect({ status: 'ok' });
    });

    test('GET /api/status returns system info', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Authentication', () => {
    test('POST /api/auth/login succeeds with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'testpass' })
        .expect(200);
      expect(response.body).toHaveProperty('token');
    });

    test('POST /api/auth/login fails with invalid credentials', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'wrong', password: 'wrong' })
        .expect(401);
    });
  });

  describe('Protected Resources', () => {
    test('GET /api/protected requires authentication', async () => {
      await request(app)
        .get('/api/protected')
        .expect(401);
    });

    test('GET /api/protected succeeds with valid token', async () => {
      await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('Agent Management', () => {
    const testAgent = {
      id: 'test-agent',
      name: 'Test Agent',
      type: 'test'
    };

    test('POST /agents creates new agent', async () => {
      const response = await request(app)
        .post('/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testAgent)
        .expect(201);
      expect(response.body).toHaveProperty('id', testAgent.id);
    });

    test('GET /agents lists agents', async () => {
      const response = await request(app)
        .get('/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      expect(Array.isArray(response.body.agents)).toBe(true);
    });
  });

  describe('Documentation', () => {
    test('GET /docs serves API documentation', async () => {
      const response = await request(app)
        .get('/docs')
        .expect(200);
      expect(response.text).toContain('html');
    });
  });
});

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import type { Server } from 'http';
import jwt from 'jsonwebtoken';

import { app } from '../../src/index.js';
import { AgentManager } from '../../src/agents/AgentManager.js';
import { config } from '../../src/config.js';

interface TestAgent {
  id: string;
  name: string;
  capabilities: string[];
}

let server: Server;
let testAgent: TestAgent;
let authToken: string;

beforeAll(async () => {
  server = app.listen(0);
  // Create test auth token
  authToken = jwt.sign({ userId: 'test-user' }, config.jwtSecret);
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(async () => {
  testAgent = {
    id: 'test-agent-1',
    name: 'Test Agent',
    capabilities: ['test', 'debug']
  };
});

describe('Health and Status Endpoints', () => {
  test('GET /api/health returns ok status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toEqual({
      status: 'ok'
    });
  });

  test('GET /api/status returns system information', async () => {
    const response = await request(app)
      .get('/api/status')
      .expect(200);

    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('uptime');
  });
});

describe('Authentication', () => {
  test('POST /api/auth/login with valid credentials returns token', async () => {
    const credentials = {
      username: 'testuser',
      password: 'testpass'
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(credentials)
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(typeof response.body.token).toBe('string');
  });

  test('POST /api/auth/login with invalid credentials returns 401', async () => {
    const invalidCredentials = {
      username: 'wrong',
      password: 'wrong'
    };

    await request(app)
      .post('/api/auth/login')
      .send(invalidCredentials)
      .expect(401);
  });
});

describe('Protected Routes', () => {
  test('GET /api/protected/resource requires authentication', async () => {
    await request(app)
      .get('/api/protected/resource')
      .expect(401);
  });

  test('GET /api/protected/resource with valid token returns data', async () => {
    const response = await request(app)
      .get('/api/protected/resource')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('data');
  });
});

describe('Agent Management', () => {
  test('POST /api/agents/register requires authentication', async () => {
    await request(app)
      .post('/api/agents/register')
      .send(testAgent)
      .expect(401);
  });

  test('POST /api/agents/register with valid token registers agent', async () => {
    const response = await request(app)
      .post('/api/agents/register')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testAgent)
      .expect(201);

    expect(response.body).toHaveProperty('id', testAgent.id);
  });

  test('GET /api/agents with valid token lists registered agents', async () => {
    // Register an agent first
    await request(app)
      .post('/api/agents/register')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testAgent);

    const response = await request(app)
      .get('/api/agents')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toContainEqual(expect.objectContaining({
      id: testAgent.id,
      name: testAgent.name
    }));
  });

  test('DELETE /api/agents/:id with valid token deregisters agent', async () => {
    // Register an agent first
    await request(app)
      .post('/api/agents/register')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testAgent);

    await request(app)
      .delete(`/api/agents/${testAgent.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Verify agent is removed
    const response = await request(app)
      .get('/api/agents')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).not.toContainEqual(expect.objectContaining({
      id: testAgent.id
    }));
  });
});

describe('Documentation', () => {
  test('GET /docs returns swagger documentation', async () => {
    const response = await request(app)
      .get('/docs')
      .expect(200);

    expect(response.text).toContain('html');
    expect(response.text).toContain('swagger');
  });
});

import request from 'supertest';
import { Express } from 'express';
import { app } from '../../src/index';
import { AgentManager } from '../../src/agents/AgentManager';

describe('API Endpoints', () => {
  let expressApp: Express;
  let agentManager: AgentManager;

  beforeAll(() => {
    expressApp = app;
    agentManager = new AgentManager();
  });

  describe('Health and Status', () => {
    it('GET /api/health returns 200 and ok status', async () => {
      const response = await request(expressApp)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
    });

    it('GET /api/status returns system information', async () => {
      const response = await request(expressApp)
        .get('/api/status')
        .expect(200);

      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Authentication', () => {
    it('POST /api/auth/login returns token with valid credentials', async () => {
      const response = await request(expressApp)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'testpass'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
    });

    it('POST /api/auth/login returns 401 with invalid credentials', async () => {
      await request(expressApp)
        .post('/api/auth/login')
        .send({
          username: 'invalid',
          password: 'invalid'
        })
        .expect(401);
    });
  });

  describe('Protected Resources', () => {
    let authToken: string;

    beforeAll(async () => {
      const response = await request(expressApp)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'testpass'
        });
      authToken = response.body.token;
    });

    it('GET /api/protected/resource returns data with valid token', async () => {
      const response = await request(expressApp)
        .get('/api/protected/resource')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('GET /api/protected/resource returns 401 without token', async () => {
      await request(expressApp)
        .get('/api/protected/resource')
        .expect(401);
    });
  });

  describe('Agent Management', () => {
    it('registerAgent adds a new agent', async () => {
      const agentId = 'test-agent-1';
      const result = await agentManager.registerAgent(agentId);
      expect(result).toBeTruthy();
    });

    it('deregisterAgent removes an existing agent', async () => {
      const agentId = 'test-agent-2';
      await agentManager.registerAgent(agentId);
      const result = await agentManager.deregisterAgent(agentId);
      expect(result).toBeTruthy();
    });

    it('listAgents returns registered agents', async () => {
      const agentId = 'test-agent-3';
      await agentManager.registerAgent(agentId);
      const agents = await agentManager.listAgents();
      expect(agents).toContain(agentId);
    });
  });

  describe('Documentation', () => {
    it('GET /docs returns swagger documentation', async () => {
      const response = await request(expressApp)
        .get('/docs')
        .expect(200);

      expect(response.text).toContain('html');
    });
  });
});

import request from 'supertest';
import { Express } from 'express';
import jwt from 'jsonwebtoken';
import { app } from '../../src/index';
import { AgentManager } from '../../src/agents/AgentManager';
import { JWT_SECRET } from '../../src/config';

let testApp: Express;
let agentManager: AgentManager;

beforeAll(() => {
  agentManager = AgentManager.getInstance();
  testApp = app;
});

afterAll(() => {
  // Clean up registered agents
  agentManager.clearAgents();
});

describe('API Health and Status', () => {
  it('GET /api/health returns 200 and ok status', async () => {
    const response = await request(testApp)
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
  });

  it('GET /api/status returns system information', async () => {
    const response = await request(testApp)
      .get('/api/status')
      .expect(200);

    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('uptime');
  });
});

describe('Authentication', () => {
  it('POST /api/auth/login returns JWT token for valid credentials', async () => {
    const response = await request(testApp)
      .post('/api/auth/login')
      .send({
        username: 'test_user',
        password: 'test_password'
      })
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(typeof response.body.token).toBe('string');
  });

  it('POST /api/auth/login returns 401 for invalid credentials', async () => {
    await request(testApp)
      .post('/api/auth/login')
      .send({
        username: 'invalid_user',
        password: 'wrong_password'
      })
      .expect(401);
  });
});

describe('Protected Resources', () => {
  let authToken: string;

  beforeAll(() => {
    // Generate a valid token for protected endpoint tests
    authToken = jwt.sign({ userId: 'test_user' }, JWT_SECRET);
  });

  it('GET /api/protected/resource returns data with valid token', async () => {
    const response = await request(testApp)
      .get('/api/protected/resource')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('data');
  });

  it('GET /api/protected/resource returns 401 without token', async () => {
    await request(testApp)
      .get('/api/protected/resource')
      .expect(401);
  });
});

describe('Agent Management', () => {
  const testAgent = {
    id: 'test-agent-1',
    name: 'Test Agent',
    type: 'test'
  };

  beforeEach(() => {
    agentManager.clearAgents();
  });

  it('registerAgent adds a new agent', () => {
    agentManager.registerAgent(testAgent);
    const agents = agentManager.listAgents();
    expect(agents).toHaveLength(1);
    expect(agents[0]).toEqual(testAgent);
  });

  it('deregisterAgent removes an existing agent', () => {
    agentManager.registerAgent(testAgent);
    agentManager.deregisterAgent(testAgent.id);
    const agents = agentManager.listAgents();
    expect(agents).toHaveLength(0);
  });

  it('listAgents returns all registered agents', () => {
    const testAgents = [
      testAgent,
      { id: 'test-agent-2', name: 'Test Agent 2', type: 'test' }
    ];

    testAgents.forEach(agent => agentManager.registerAgent(agent));
    const agents = agentManager.listAgents();
    expect(agents).toHaveLength(2);
    expect(agents).toEqual(expect.arrayContaining(testAgents));
  });
});

describe('API Documentation', () => {
  it('GET /docs returns the Swagger documentation', async () => {
    const response = await request(testApp)
      .get('/docs')
      .expect(200);

    expect(response.text).toContain('html');
  });
});

import request from 'supertest';
import { app } from '../../src/index';
import { AgentManager } from '../../src/agents/AgentManager';

describe('API Integration Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    // Set up any test data or configurations
    await AgentManager.getInstance().init();
  });

  afterAll(async () => {
    // Clean up test data and close connections
    await AgentManager.getInstance().cleanup();
  });

  describe('Health and Status Endpoints', () => {
    test('GET /api/health should return 200 and health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
    });

    test('GET /api/status should return system information', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('uptime');
    });

    test('GET /docs should return API documentation', async () => {
      const response = await request(app)
        .get('/docs')
        .expect(200);

      expect(response.text).toContain('html');
    });
  });

  describe('Authentication', () => {
    test('POST /api/auth/login should return auth token', async () => {
      const credentials = {
        username: 'testuser',
        password: 'testpass'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      authToken = response.body.token;
    });

    test('Accessing protected route without token should return 401', async () => {
      await request(app)
        .get('/api/protected/resource')
        .expect(401);
    });
  });

  describe('Protected Resources', () => {
    test('GET /api/protected/resource with valid token should succeed', async () => {
      const response = await request(app)
        .get('/api/protected/resource')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    test('GET /api/protected/resource with invalid token should fail', async () => {
      await request(app)
        .get('/api/protected/resource')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });
  });

  describe('Agent Management', () => {
    const testAgent = {
      id: 'test-agent-1',
      name: 'Test Agent',
      capabilities: ['test']
    };

    test('POST /api/agents should register a new agent', async () => {
      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testAgent)
        .expect(201);

      expect(response.body).toHaveProperty('id', testAgent.id);
    });

    test('GET /api/agents should list all registered agents', async () => {
      const response = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('id', testAgent.id);
    });

    test('DELETE /api/agents/:id should deregister an agent', async () => {
      await request(app)
        .delete(`/api/agents/${testAgent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const response = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });
});

import request from 'supertest';
import app from '../../src/index';

describe('API Integration Tests', () => {
  describe('Health Check Endpoints', () => {
    test('GET /api/health returns OK status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok'
      });
    });

    test('GET /api/status returns system information', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Authentication', () => {
    test('POST /api/auth/login returns JWT token for valid credentials', async () => {
      const credentials = {
        username: 'testuser',
        password: 'testpass'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
    });

    test('POST /api/auth/login returns 401 for invalid credentials', async () => {
      const credentials = {
        username: 'invalid',
        password: 'invalid'
      };

      await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(401);
    });
  });

  describe('Protected Resources', () => {
    let authToken: string;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'testpass'
        });
      authToken = response.body.token;
    });

    test('GET /api/protected/resource returns data with valid token', async () => {
      const response = await request(app)
        .get('/api/protected/resource')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    test('GET /api/protected/resource returns 401 without token', async () => {
      await request(app)
        .get('/api/protected/resource')
        .expect(401);
    });
  });

  describe('Agent Management', () => {
    let authToken: string;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'testpass'
        });
      authToken = response.body.token;
    });

    test('POST /api/agents/register registers a new agent', async () => {
      const agentData = {
        name: 'test-agent',
        type: 'test',
        capabilities: ['test']
      };

      const response = await request(app)
        .post('/api/agents/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(agentData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(agentData.name);
    });

    test('GET /api/agents returns list of registered agents', async () => {
      const response = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('DELETE /api/agents/:agentId deregisters an agent', async () => {
      // First register an agent
      const registerResponse = await request(app)
        .post('/api/agents/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'agent-to-delete',
          type: 'test',
          capabilities: ['test']
        });

      const agentId = registerResponse.body.id;

      // Then delete it
      await request(app)
        .delete(`/api/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify it's gone
      const listResponse = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body.find((a: any) => a.id === agentId)).toBeUndefined();
    });
  });
});

import request from 'supertest';
import { app } from '../../src/index';

describe('API Endpoints', () => {
  describe('Health Check', () => {
    it('should return status ok', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
    });
  });

  describe('Status Check', () => {
    it('should return system status information', async () => {
      const response = await request(app).get('/api/status');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('services');
    });
  });

  describe('Authentication', () => {
    it('should authenticate with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'demo', password: 'demo123' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'wrong', password: 'wrong' });
      
      expect(response.status).toBe(401);
    });
  });

  describe('Protected Resource', () => {
    let authToken: string;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'demo', password: 'demo123' });
      authToken = response.body.token;
    });

    it('should access protected resource with valid token', async () => {
      const response = await request(app)
        .get('/api/protected/resource')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('should reject access without token', async () => {
      const response = await request(app)
        .get('/api/protected/resource');
      
      expect(response.status).toBe(401);
    });
  });

  describe('API Documentation', () => {
    it('should serve documentation page', async () => {
      const response = await request(app).get('/docs');
      expect(response.status).toBe(200);
      expect(response.text).toContain('API Documentation');
    });
  });
});

import request from 'supertest';
import app from '../../src/index';

describe('Express Server', () => {
  it('responds to GET /', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Integration Gateway Service is running');
  });

  it('returns 404 for undefined routes', async () => {
    const response = await request(app).get('/undefined-route');
    expect(response.status).toBe(404);
  });
  
  it('handles POST requests to /agents', async () => {
    const testAgent = {
      name: 'Test Agent',
      type: 'test'
    };
    const response = await request(app)
      .post('/agents')
      .send(testAgent)
      .set('Accept', 'application/json');
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe(testAgent.name);
    expect(response.body.type).toBe(testAgent.type);
  });

  it('lists all agents', async () => {
    const response = await request(app).get('/agents');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('agents');
    expect(Array.isArray(response.body.agents)).toBe(true);
  });
});

