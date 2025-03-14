"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../../src/index"));
const AgentManager_1 = require("../../src/agents/AgentManager");
(0, globals_1.describe)('Integration Gateway API', () => {
    let agentManager;
    let authToken;
    (0, globals_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
        agentManager = new AgentManager_1.AgentManager();
        const authResponse = yield (0, supertest_1.default)(index_1.default)
            .post('/api/auth/login')
            .send({ username: 'testuser', password: 'testpass' });
        authToken = authResponse.body.token;
    }));
    (0, globals_1.describe)('Health and Status', () => {
        (0, globals_1.test)('GET /api/health returns status ok', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(index_1.default)
                .get('/api/health')
                .expect(200)
                .expect({ status: 'ok' });
        }));
        (0, globals_1.test)('GET /api/status returns system info', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default)
                .get('/api/status')
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('version');
            (0, globals_1.expect)(response.body).toHaveProperty('uptime');
        }));
    });
    (0, globals_1.describe)('Authentication', () => {
        (0, globals_1.test)('POST /api/auth/login succeeds with valid credentials', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send({ username: 'testuser', password: 'testpass' })
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('token');
        }));
        (0, globals_1.test)('POST /api/auth/login fails with invalid credentials', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send({ username: 'wrong', password: 'wrong' })
                .expect(401);
        }));
    });
    (0, globals_1.describe)('Protected Resources', () => {
        (0, globals_1.test)('GET /api/protected requires authentication', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(index_1.default)
                .get('/api/protected')
                .expect(401);
        }));
        (0, globals_1.test)('GET /api/protected succeeds with valid token', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(index_1.default)
                .get('/api/protected')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
        }));
    });
    (0, globals_1.describe)('Agent Management', () => {
        const testAgent = {
            id: 'test-agent',
            name: 'Test Agent',
            type: 'test'
        };
        (0, globals_1.test)('POST /agents creates new agent', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default)
                .post('/agents')
                .set('Authorization', `Bearer ${authToken}`)
                .send(testAgent)
                .expect(201);
            (0, globals_1.expect)(response.body).toHaveProperty('id', testAgent.id);
        }));
        (0, globals_1.test)('GET /agents lists agents', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default)
                .get('/agents')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            (0, globals_1.expect)(Array.isArray(response.body.agents)).toBe(true);
        }));
    });
    (0, globals_1.describe)('Documentation', () => {
        (0, globals_1.test)('GET /docs serves API documentation', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default)
                .get('/docs')
                .expect(200);
            (0, globals_1.expect)(response.text).toContain('html');
        }));
    });
});
const globals_1 = require("@jest/globals");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_js_1 = require("../../src/config.js");
let server;
let testAgent;
let authToken;
(0, globals_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    server = index_1.default.listen(0);
    // Create test auth token
    authToken = jsonwebtoken_1.default.sign({ userId: 'test-user' }, config_js_1.config.jwtSecret);
}));
(0, globals_1.afterAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield new Promise((resolve) => server.close(resolve));
}));
(0, globals_1.beforeEach)(() => __awaiter(void 0, void 0, void 0, function* () {
    testAgent = {
        id: 'test-agent-1',
        name: 'Test Agent',
        capabilities: ['test', 'debug']
    };
}));
(0, globals_1.describe)('Health and Status Endpoints', () => {
    (0, globals_1.test)('GET /api/health returns ok status', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.default)
            .get('/api/health')
            .expect(200);
        (0, globals_1.expect)(response.body).toEqual({
            status: 'ok'
        });
    }));
    (0, globals_1.test)('GET /api/status returns system information', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.default)
            .get('/api/status')
            .expect(200);
        (0, globals_1.expect)(response.body).toHaveProperty('version');
        (0, globals_1.expect)(response.body).toHaveProperty('uptime');
    }));
});
(0, globals_1.describe)('Authentication', () => {
    (0, globals_1.test)('POST /api/auth/login with valid credentials returns token', () => __awaiter(void 0, void 0, void 0, function* () {
        const credentials = {
            username: 'testuser',
            password: 'testpass'
        };
        const response = yield (0, supertest_1.default)(index_1.default)
            .post('/api/auth/login')
            .send(credentials)
            .expect(200);
        (0, globals_1.expect)(response.body).toHaveProperty('token');
        (0, globals_1.expect)(typeof response.body.token).toBe('string');
    }));
    (0, globals_1.test)('POST /api/auth/login with invalid credentials returns 401', () => __awaiter(void 0, void 0, void 0, function* () {
        const invalidCredentials = {
            username: 'wrong',
            password: 'wrong'
        };
        yield (0, supertest_1.default)(index_1.default)
            .post('/api/auth/login')
            .send(invalidCredentials)
            .expect(401);
    }));
});
(0, globals_1.describe)('Protected Routes', () => {
    (0, globals_1.test)('GET /api/protected/resource requires authentication', () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, supertest_1.default)(index_1.default)
            .get('/api/protected/resource')
            .expect(401);
    }));
    (0, globals_1.test)('GET /api/protected/resource with valid token returns data', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.default)
            .get('/api/protected/resource')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);
        (0, globals_1.expect)(response.body).toHaveProperty('data');
    }));
});
(0, globals_1.describe)('Agent Management', () => {
    (0, globals_1.test)('POST /api/agents/register requires authentication', () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, supertest_1.default)(index_1.default)
            .post('/api/agents/register')
            .send(testAgent)
            .expect(401);
    }));
    (0, globals_1.test)('POST /api/agents/register with valid token registers agent', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.default)
            .post('/api/agents/register')
            .set('Authorization', `Bearer ${authToken}`)
            .send(testAgent)
            .expect(201);
        (0, globals_1.expect)(response.body).toHaveProperty('id', testAgent.id);
    }));
    (0, globals_1.test)('GET /api/agents with valid token lists registered agents', () => __awaiter(void 0, void 0, void 0, function* () {
        // Register an agent first
        yield (0, supertest_1.default)(index_1.default)
            .post('/api/agents/register')
            .set('Authorization', `Bearer ${authToken}`)
            .send(testAgent);
        const response = yield (0, supertest_1.default)(index_1.default)
            .get('/api/agents')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);
        (0, globals_1.expect)(Array.isArray(response.body)).toBe(true);
        (0, globals_1.expect)(response.body).toContainEqual(globals_1.expect.objectContaining({
            id: testAgent.id,
            name: testAgent.name
        }));
    }));
    (0, globals_1.test)('DELETE /api/agents/:id with valid token deregisters agent', () => __awaiter(void 0, void 0, void 0, function* () {
        // Register an agent first
        yield (0, supertest_1.default)(index_1.default)
            .post('/api/agents/register')
            .set('Authorization', `Bearer ${authToken}`)
            .send(testAgent);
        yield (0, supertest_1.default)(index_1.default)
            .delete(`/api/agents/${testAgent.id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);
        // Verify agent is removed
        const response = yield (0, supertest_1.default)(index_1.default)
            .get('/api/agents')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);
        (0, globals_1.expect)(response.body).not.toContainEqual(globals_1.expect.objectContaining({
            id: testAgent.id
        }));
    }));
});
(0, globals_1.describe)('Documentation', () => {
    (0, globals_1.test)('GET /docs returns swagger documentation', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.default)
            .get('/docs')
            .expect(200);
        (0, globals_1.expect)(response.text).toContain('html');
        (0, globals_1.expect)(response.text).toContain('swagger');
    }));
});
(0, globals_1.describe)('API Endpoints', () => {
    let expressApp;
    let agentManager;
    (0, globals_1.beforeAll)(() => {
        expressApp = index_1.default;
        agentManager = new AgentManager_1.AgentManager();
    });
    (0, globals_1.describe)('Health and Status', () => {
        it('GET /api/health returns 200 and ok status', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(expressApp)
                .get('/api/health')
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('status', 'ok');
        }));
        it('GET /api/status returns system information', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(expressApp)
                .get('/api/status')
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('version');
            (0, globals_1.expect)(response.body).toHaveProperty('uptime');
        }));
    });
    (0, globals_1.describe)('Authentication', () => {
        it('POST /api/auth/login returns token with valid credentials', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(expressApp)
                .post('/api/auth/login')
                .send({
                username: 'testuser',
                password: 'testpass'
            })
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('token');
        }));
        it('POST /api/auth/login returns 401 with invalid credentials', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(expressApp)
                .post('/api/auth/login')
                .send({
                username: 'invalid',
                password: 'invalid'
            })
                .expect(401);
        }));
    });
    (0, globals_1.describe)('Protected Resources', () => {
        let authToken;
        (0, globals_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(expressApp)
                .post('/api/auth/login')
                .send({
                username: 'testuser',
                password: 'testpass'
            });
            authToken = response.body.token;
        }));
        it('GET /api/protected/resource returns data with valid token', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(expressApp)
                .get('/api/protected/resource')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('data');
        }));
        it('GET /api/protected/resource returns 401 without token', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(expressApp)
                .get('/api/protected/resource')
                .expect(401);
        }));
    });
    (0, globals_1.describe)('Agent Management', () => {
        it('registerAgent adds a new agent', () => __awaiter(void 0, void 0, void 0, function* () {
            const agentId = 'test-agent-1';
            const result = yield agentManager.registerAgent(agentId);
            (0, globals_1.expect)(result).toBeTruthy();
        }));
        it('deregisterAgent removes an existing agent', () => __awaiter(void 0, void 0, void 0, function* () {
            const agentId = 'test-agent-2';
            yield agentManager.registerAgent(agentId);
            const result = yield agentManager.deregisterAgent(agentId);
            (0, globals_1.expect)(result).toBeTruthy();
        }));
        it('listAgents returns registered agents', () => __awaiter(void 0, void 0, void 0, function* () {
            const agentId = 'test-agent-3';
            yield agentManager.registerAgent(agentId);
            const agents = yield agentManager.listAgents();
            (0, globals_1.expect)(agents).toContain(agentId);
        }));
    });
    (0, globals_1.describe)('Documentation', () => {
        it('GET /docs returns swagger documentation', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(expressApp)
                .get('/docs')
                .expect(200);
            (0, globals_1.expect)(response.text).toContain('html');
        }));
    });
});
const config_1 = require("../../src/config");
let testApp;
let agentManager;
(0, globals_1.beforeAll)(() => {
    agentManager = AgentManager_1.AgentManager.getInstance();
    testApp = index_1.default;
});
(0, globals_1.afterAll)(() => {
    // Clean up registered agents
    agentManager.clearAgents();
});
(0, globals_1.describe)('API Health and Status', () => {
    it('GET /api/health returns 200 and ok status', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(testApp)
            .get('/api/health')
            .expect(200);
        (0, globals_1.expect)(response.body).toHaveProperty('status', 'ok');
    }));
    it('GET /api/status returns system information', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(testApp)
            .get('/api/status')
            .expect(200);
        (0, globals_1.expect)(response.body).toHaveProperty('version');
        (0, globals_1.expect)(response.body).toHaveProperty('uptime');
    }));
});
(0, globals_1.describe)('Authentication', () => {
    it('POST /api/auth/login returns JWT token for valid credentials', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(testApp)
            .post('/api/auth/login')
            .send({
            username: 'test_user',
            password: 'test_password'
        })
            .expect(200);
        (0, globals_1.expect)(response.body).toHaveProperty('token');
        (0, globals_1.expect)(typeof response.body.token).toBe('string');
    }));
    it('POST /api/auth/login returns 401 for invalid credentials', () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, supertest_1.default)(testApp)
            .post('/api/auth/login')
            .send({
            username: 'invalid_user',
            password: 'wrong_password'
        })
            .expect(401);
    }));
});
(0, globals_1.describe)('Protected Resources', () => {
    let authToken;
    (0, globals_1.beforeAll)(() => {
        // Generate a valid token for protected endpoint tests
        authToken = jsonwebtoken_1.default.sign({ userId: 'test_user' }, config_1.JWT_SECRET);
    });
    it('GET /api/protected/resource returns data with valid token', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(testApp)
            .get('/api/protected/resource')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);
        (0, globals_1.expect)(response.body).toHaveProperty('data');
    }));
    it('GET /api/protected/resource returns 401 without token', () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, supertest_1.default)(testApp)
            .get('/api/protected/resource')
            .expect(401);
    }));
});
(0, globals_1.describe)('Agent Management', () => {
    const testAgent = {
        id: 'test-agent-1',
        name: 'Test Agent',
        type: 'test'
    };
    (0, globals_1.beforeEach)(() => {
        agentManager.clearAgents();
    });
    it('registerAgent adds a new agent', () => {
        agentManager.registerAgent(testAgent);
        const agents = agentManager.listAgents();
        (0, globals_1.expect)(agents).toHaveLength(1);
        (0, globals_1.expect)(agents[0]).toEqual(testAgent);
    });
    it('deregisterAgent removes an existing agent', () => {
        agentManager.registerAgent(testAgent);
        agentManager.deregisterAgent(testAgent.id);
        const agents = agentManager.listAgents();
        (0, globals_1.expect)(agents).toHaveLength(0);
    });
    it('listAgents returns all registered agents', () => {
        const testAgents = [
            testAgent,
            { id: 'test-agent-2', name: 'Test Agent 2', type: 'test' }
        ];
        testAgents.forEach(agent => agentManager.registerAgent(agent));
        const agents = agentManager.listAgents();
        (0, globals_1.expect)(agents).toHaveLength(2);
        (0, globals_1.expect)(agents).toEqual(globals_1.expect.arrayContaining(testAgents));
    });
});
(0, globals_1.describe)('API Documentation', () => {
    it('GET /docs returns the Swagger documentation', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(testApp)
            .get('/docs')
            .expect(200);
        (0, globals_1.expect)(response.text).toContain('html');
    }));
});
(0, globals_1.describe)('API Integration Tests', () => {
    let authToken;
    (0, globals_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
        // Set up any test data or configurations
        yield AgentManager_1.AgentManager.getInstance().init();
    }));
    (0, globals_1.afterAll)(() => __awaiter(void 0, void 0, void 0, function* () {
        // Clean up test data and close connections
        yield AgentManager_1.AgentManager.getInstance().cleanup();
    }));
    (0, globals_1.describe)('Health and Status Endpoints', () => {
        (0, globals_1.test)('GET /api/health should return 200 and health status', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default)
                .get('/api/health')
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('status', 'ok');
        }));
        (0, globals_1.test)('GET /api/status should return system information', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default)
                .get('/api/status')
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('version');
            (0, globals_1.expect)(response.body).toHaveProperty('uptime');
        }));
        (0, globals_1.test)('GET /docs should return API documentation', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default)
                .get('/docs')
                .expect(200);
            (0, globals_1.expect)(response.text).toContain('html');
        }));
    });
    (0, globals_1.describe)('Authentication', () => {
        (0, globals_1.test)('POST /api/auth/login should return auth token', () => __awaiter(void 0, void 0, void 0, function* () {
            const credentials = {
                username: 'testuser',
                password: 'testpass'
            };
            const response = yield (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send(credentials)
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('token');
            authToken = response.body.token;
        }));
        (0, globals_1.test)('Accessing protected route without token should return 401', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(index_1.default)
                .get('/api/protected/resource')
                .expect(401);
        }));
    });
    (0, globals_1.describe)('Protected Resources', () => {
        (0, globals_1.test)('GET /api/protected/resource with valid token should succeed', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default)
                .get('/api/protected/resource')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('data');
        }));
        (0, globals_1.test)('GET /api/protected/resource with invalid token should fail', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(index_1.default)
                .get('/api/protected/resource')
                .set('Authorization', 'Bearer invalid_token')
                .expect(401);
        }));
    });
    (0, globals_1.describe)('Agent Management', () => {
        const testAgent = {
            id: 'test-agent-1',
            name: 'Test Agent',
            capabilities: ['test']
        };
        (0, globals_1.test)('POST /api/agents should register a new agent', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default)
                .post('/api/agents')
                .set('Authorization', `Bearer ${authToken}`)
                .send(testAgent)
                .expect(201);
            (0, globals_1.expect)(response.body).toHaveProperty('id', testAgent.id);
        }));
        (0, globals_1.test)('GET /api/agents should list all registered agents', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default)
                .get('/api/agents')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            (0, globals_1.expect)(Array.isArray(response.body)).toBe(true);
            (0, globals_1.expect)(response.body).toHaveLength(1);
            (0, globals_1.expect)(response.body[0]).toHaveProperty('id', testAgent.id);
        }));
        (0, globals_1.test)('DELETE /api/agents/:id should deregister an agent', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(index_1.default)
                .delete(`/api/agents/${testAgent.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            const response = yield (0, supertest_1.default)(index_1.default)
                .get('/api/agents')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveLength(0);
        }));
    });
});
(0, globals_1.describe)('API Integration Tests', () => {
    (0, globals_1.describe)('Health Check Endpoints', () => {
        (0, globals_1.test)('GET /api/health returns OK status', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default)
                .get('/api/health')
                .expect('Content-Type', /json/)
                .expect(200);
            (0, globals_1.expect)(response.body).toEqual({
                status: 'ok'
            });
        }));
        (0, globals_1.test)('GET /api/status returns system information', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default)
                .get('/api/status')
                .expect('Content-Type', /json/)
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('version');
            (0, globals_1.expect)(response.body).toHaveProperty('uptime');
        }));
    });
    (0, globals_1.describe)('Authentication', () => {
        (0, globals_1.test)('POST /api/auth/login returns JWT token for valid credentials', () => __awaiter(void 0, void 0, void 0, function* () {
            const credentials = {
                username: 'testuser',
                password: 'testpass'
            };
            const response = yield (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send(credentials)
                .expect('Content-Type', /json/)
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('token');
            (0, globals_1.expect)(typeof response.body.token).toBe('string');
        }));
        (0, globals_1.test)('POST /api/auth/login returns 401 for invalid credentials', () => __awaiter(void 0, void 0, void 0, function* () {
            const credentials = {
                username: 'invalid',
                password: 'invalid'
            };
            yield (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send(credentials)
                .expect(401);
        }));
    });
    (0, globals_1.describe)('Protected Resources', () => {
        let authToken;
        (0, globals_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send({
                username: 'testuser',
                password: 'testpass'
            });
            authToken = response.body.token;
        }));
        (0, globals_1.test)('GET /api/protected/resource returns data with valid token', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default)
                .get('/api/protected/resource')
                .set('Authorization', `Bearer ${authToken}`)
                .expect('Content-Type', /json/)
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('data');
        }));
        (0, globals_1.test)('GET /api/protected/resource returns 401 without token', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(index_1.default)
                .get('/api/protected/resource')
                .expect(401);
        }));
    });
    (0, globals_1.describe)('Agent Management', () => {
        let authToken;
        (0, globals_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send({
                username: 'testuser',
                password: 'testpass'
            });
            authToken = response.body.token;
        }));
        (0, globals_1.test)('POST /api/agents/register registers a new agent', () => __awaiter(void 0, void 0, void 0, function* () {
            const agentData = {
                name: 'test-agent',
                type: 'test',
                capabilities: ['test']
            };
            const response = yield (0, supertest_1.default)(index_1.default)
                .post('/api/agents/register')
                .set('Authorization', `Bearer ${authToken}`)
                .send(agentData)
                .expect('Content-Type', /json/)
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('id');
            (0, globals_1.expect)(response.body.name).toBe(agentData.name);
        }));
        (0, globals_1.test)('GET /api/agents returns list of registered agents', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default)
                .get('/api/agents')
                .set('Authorization', `Bearer ${authToken}`)
                .expect('Content-Type', /json/)
                .expect(200);
            (0, globals_1.expect)(Array.isArray(response.body)).toBe(true);
        }));
        (0, globals_1.test)('DELETE /api/agents/:agentId deregisters an agent', () => __awaiter(void 0, void 0, void 0, function* () {
            // First register an agent
            const registerResponse = yield (0, supertest_1.default)(index_1.default)
                .post('/api/agents/register')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                name: 'agent-to-delete',
                type: 'test',
                capabilities: ['test']
            });
            const agentId = registerResponse.body.id;
            // Then delete it
            yield (0, supertest_1.default)(index_1.default)
                .delete(`/api/agents/${agentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            // Verify it's gone
            const listResponse = yield (0, supertest_1.default)(index_1.default)
                .get('/api/agents')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            (0, globals_1.expect)(listResponse.body.find((a) => a.id === agentId)).toBeUndefined();
        }));
    });
});
(0, globals_1.describe)('API Endpoints', () => {
    (0, globals_1.describe)('Health Check', () => {
        it('should return status ok', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default).get('/api/health');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body).toHaveProperty('status', 'ok');
        }));
    });
    (0, globals_1.describe)('Status Check', () => {
        it('should return system status information', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default).get('/api/status');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body).toHaveProperty('version');
            (0, globals_1.expect)(response.body).toHaveProperty('uptime');
            (0, globals_1.expect)(response.body).toHaveProperty('services');
        }));
    });
    (0, globals_1.describe)('Authentication', () => {
        it('should authenticate with valid credentials', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send({ username: 'demo', password: 'demo123' });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body).toHaveProperty('token');
        }));
        it('should reject invalid credentials', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send({ username: 'wrong', password: 'wrong' });
            (0, globals_1.expect)(response.status).toBe(401);
        }));
    });
    (0, globals_1.describe)('Protected Resource', () => {
        let authToken;
        (0, globals_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send({ username: 'demo', password: 'demo123' });
            authToken = response.body.token;
        }));
        it('should access protected resource with valid token', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default)
                .get('/api/protected/resource')
                .set('Authorization', `Bearer ${authToken}`);
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body).toHaveProperty('data');
        }));
        it('should reject access without token', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default)
                .get('/api/protected/resource');
            (0, globals_1.expect)(response.status).toBe(401);
        }));
    });
    (0, globals_1.describe)('API Documentation', () => {
        it('should serve documentation page', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(index_1.default).get('/docs');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.text).toContain('API Documentation');
        }));
    });
});
(0, globals_1.describe)('Express Server', () => {
    it('responds to GET /', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.default).get('/');
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.message).toBe('Integration Gateway Service is running');
    }));
    it('returns 404 for undefined routes', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.default).get('/undefined-route');
        (0, globals_1.expect)(response.status).toBe(404);
    }));
    it('handles POST requests to /agents', () => __awaiter(void 0, void 0, void 0, function* () {
        const testAgent = {
            name: 'Test Agent',
            type: 'test'
        };
        const response = yield (0, supertest_1.default)(index_1.default)
            .post('/agents')
            .send(testAgent)
            .set('Accept', 'application/json');
        (0, globals_1.expect)(response.status).toBe(201);
        (0, globals_1.expect)(response.body).toHaveProperty('id');
        (0, globals_1.expect)(response.body.name).toBe(testAgent.name);
        (0, globals_1.expect)(response.body.type).toBe(testAgent.type);
    }));
    it('lists all agents', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.default).get('/agents');
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body).toHaveProperty('agents');
        (0, globals_1.expect)(Array.isArray(response.body.agents)).toBe(true);
    }));
});
