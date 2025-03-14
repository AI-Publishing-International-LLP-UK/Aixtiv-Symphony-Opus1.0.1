"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentManager = void 0;
const express = __importStar(require("express"));
const swaggerUi = __importStar(require("swagger-ui-express"));
const swaggerJsDoc = __importStar(require("swagger-jsdoc"));
const auth_1 = require("./middleware/auth");
const config_1 = require("./config");
const AgentManager_1 = require("./agents/AgentManager");
const app = express();
const port = config_1.PORT || 3000;
// Initialize AgentManager
exports.agentManager = new AgentManager_1.AgentManager();
app.use(express.json());
// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'ASOOS API',
            version: config_1.API_VERSION,
            description: 'API documentation for the ASOOS system',
        },
        servers: [
            {
                url: config_1.BASE_URL,
            },
        ],
    },
    apis: ['./src/**/*.ts'],
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check API health
 *     responses:
 *       200:
 *         description: API is healthy
 */
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});
/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: Get API status
 *     responses:
 *       200:
 *         description: Current API status
 */
app.get('/api/status', (req, res) => {
    res.json({
        version: config_1.API_VERSION,
        environment: config_1.NODE_ENV,
        uptime: process.uptime(),
    });
});
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Authentication successful
 *       401:
 *         description: Authentication failed
 */
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = config_1.DEMO_USERS.find((u) => u.username === username && u.password === password);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = (0, auth_1.generateToken)({ id: user.id, username: user.username });
    res.json({ token });
});
/**
 * @swagger
 * /api/protected/resource:
 *   get:
 *     summary: Access protected resource
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Protected resource accessed successfully
 *       401:
 *         description: Unauthorized
 */
app.get('/api/protected/resource', auth_1.authenticateToken, (req, res) => {
    res.json({
        data: {
            message: 'Protected resource accessed successfully',
            user: req.user,
        },
    });
});
/**
 * @swagger
 * /agents:
 *   get:
 *     summary: List all registered agents
 *     responses:
 *       200:
 *         description: List of registered agents
 */
app.get('/agents', auth_1.authenticateToken, (req, res) => {
    const agents = exports.agentManager.listAgents();
    res.json({ agents });
});
/**
 * @swagger
 * /agents:
 *   post:
 *     summary: Create a new agent
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *     responses:
 *       201:
 *         description: Agent created successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
app.post('/agents', auth_1.authenticateToken, (req, res) => {
    const { name, type } = req.body;
    try {
        const agent = exports.agentManager.createAgent(name, type);
        res.status(201).json(agent);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running on port ${port} in ${config_1.NODE_ENV} mode`);
    });
}
exports.default = app;
