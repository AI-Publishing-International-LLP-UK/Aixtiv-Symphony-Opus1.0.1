import express = require('express');
import swaggerUi = require('swagger-ui-express');
import swaggerJsDoc = require('swagger-jsdoc');
import { authenticateToken, generateToken, AuthRequest } from './middleware/auth';
import { PORT, NODE_ENV, API_VERSION, DEMO_USERS, BASE_URL } from './config';
import { AgentManager } from './agents/AgentManager';

const app = express();
const port = PORT || 3000;

// Initialize AgentManager
export const agentManager = new AgentManager();

app.use(express.json());

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ASOOS API',
      version: API_VERSION,
      description: 'API documentation for the ASOOS system',
    },
    servers: [
      {
        url: BASE_URL,
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
app.get('/api/health', (req: express.Request, res: express.Response) => {
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
app.get('/api/status', (req: express.Request, res: express.Response) => {
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
app.post('/api/auth/login', (req: express.Request, res: express.Response) => {
  const { username, password } = req.body;
  const user = DEMO_USERS.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken({ id: user.id, username: user.username });
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
app.get('/api/protected/resource', authenticateToken, (req: AuthRequest, res: express.Response) => {
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
app.get('/agents', authenticateToken, (req: AuthRequest, res: express.Response) => {
  const agents = agentManager.listAgents();
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
app.post('/agents', authenticateToken, (req: AuthRequest, res: express.Response) => {
  const { name, type } = req.body;
  try {
    const agent = agentManager.createAgent(name, type);
    res.status(201).json(agent);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Not found' });
});

if (require.main === module) {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on port ${port} in ${NODE_ENV} mode`);
  });
}

export default app;
