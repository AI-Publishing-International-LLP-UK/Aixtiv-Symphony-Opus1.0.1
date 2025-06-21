"use strict";
/**
 * Aixtiv Symphony Integration Gateway
 *
 * This is the main entry point for the Aixtiv Symphony Integration Gateway.
 * It combines the integration gateway functionality with the API functionality.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentManager = void 0;
exports.createUnifiedServer = createUnifiedServer;
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const winston_1 = __importDefault(require("winston"));
// Load environment variables from .env file
dotenv_1.default.config();
// Import server components
const server_1 = require("./server");
const auth_1 = require("./middleware/auth");
const AgentManager_1 = require("./agents/AgentManager");
// Import config
let API_VERSION = '1.0.0';
let NODE_ENV = process.env.NODE_ENV || 'development';
let BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
let DEMO_USERS = [];
try {
    const config = require('./config');
    API_VERSION = config.API_VERSION;
    NODE_ENV = config.NODE_ENV;
    BASE_URL = config.BASE_URL;
    DEMO_USERS = config.DEMO_USERS;
}
catch (error) {
    console.warn('Config module not found, using default values');
}
// Create logger
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    defaultMeta: { service: 'integration-gateway' },
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        })
    ]
});
// Initialize agent manager
exports.agentManager = new AgentManager_1.AgentManager();
// Create unified server
function createUnifiedServer() {
    // Get the base server with Claude OAuth2 and MCP integration
    const app = (0, server_1.createServer)();
    // Swagger configuration
    const swaggerOptions = {
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'Aixtiv Symphony Integration Gateway API',
                version: API_VERSION,
                description: 'API documentation for the Aixtiv Symphony Integration Gateway',
            },
            servers: [
                {
                    url: BASE_URL,
                },
            ],
        },
        apis: ['./src/**/*.ts'],
    };
    const swaggerDocs = (0, swagger_jsdoc_1.default)(swaggerOptions);
    app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocs));
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
            version: API_VERSION,
            environment: NODE_ENV,
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
        const user = DEMO_USERS.find((u) => u.username === username && u.password === password);
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
    return app;
}
// Start the server if this file is executed directly
if (require.main === module) {
    const PORT = process.env.PORT || 8080;
    const app = createUnifiedServer();
    const server = app.listen(PORT, '0.0.0.0', () => {
        logger.info(`Aixtiv Symphony Integration Gateway running on port ${PORT}`);
        logger.info(`Environment: ${NODE_ENV}`);
        logger.info(`API Version: ${API_VERSION}`);
        logger.info(`Swagger Docs: ${BASE_URL}/docs`);
    });
    // Graceful shutdown
    const gracefulShutdown = () => {
        logger.info('Received shutdown signal, closing server gracefully');
        server.close(() => {
            logger.info('Server closed');
            process.exit(0);
        });
        // Force close after 10s if server hasn't closed gracefully
        setTimeout(() => {
            logger.error('Forcing server shutdown after timeout');
            process.exit(1);
        }, 10000);
    };
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
}
// Export the server creator for testing
exports.default = createUnifiedServer;
//# sourceMappingURL=index.js.map