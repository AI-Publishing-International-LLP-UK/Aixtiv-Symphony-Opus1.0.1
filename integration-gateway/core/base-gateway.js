"use strict";
// AIXTIV SYMPHONY Integration Gateways
// src/integration/index.ts
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
exports.IntegrationGatewayFactory = exports.OwnerSubscriberIntegrationGateway = exports.EnterpriseIntegrationGateway = exports.OwnerIntegrationGateway = exports.BaseIntegrationGateway = void 0;
const express_1 = __importDefault(require("express"));
const uuid_1 = require("uuid");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const core_1 = require("../core");
const crypto_1 = __importDefault(require("crypto"));
// Abstract Integration Gateway
class BaseIntegrationGateway {
    constructor(gatewayId, gatewayType, securityTier) {
        this.app = (0, express_1.default)();
        this.gatewayId = gatewayId;
        this.gatewayType = gatewayType;
        this.securityTier = securityTier;
        // Generate or retrieve encryption key for this gateway
        this.encryptionKey = this.retrieveEncryptionKey();
        // Setup common middleware
        this.setupMiddleware();
        // Setup common endpoints
        this.setupEndpoints();
    }
    // Common middleware setup
    setupMiddleware() {
        this.app.use(express_1.default.json());
        this.app.use(express_1.default.urlencoded({ extended: true }));
        this.app.use((0, cors_1.default)());
        this.app.use((0, helmet_1.default)());
        // Add gateway identification middleware
        this.app.use((req, res, next) => {
            req.gateway = {
                id: this.gatewayId,
                type: this.gatewayType,
                securityTier: this.securityTier
            };
            next();
        });
        // Setup specific middleware
        this.setupSpecificMiddleware();
        // Setup API key validation
        this.app.use(this.validateApiKey.bind(this));
        // Gateway-specific authorization
        this.app.use(this.handleSpecificAuthorization.bind(this));
        // Request logging
        this.app.use(this.logRequest.bind(this));
    }
    // Common endpoints setup
    setupEndpoints() {
        // Health check endpoint
        this.app.get('/health', (_req, res) => {
            res.status(200).json({ status: 'ok', gatewayId: this.gatewayId, gatewayType: this.gatewayType });
        });
        // Gateway info endpoint
        this.app.get('/info', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const gateway = yield core_1.IntegrationGatewayService.getGatewayById(this.gatewayId);
                res.status(200).json({
                    id: gateway === null || gateway === void 0 ? void 0 : gateway.id,
                    name: gateway === null || gateway === void 0 ? void 0 : gateway.name,
                    type: gateway === null || gateway === void 0 ? void 0 : gateway.gatewayType,
                    securityTier: gateway === null || gateway === void 0 ? void 0 : gateway.securityTier,
                    status: gateway === null || gateway === void 0 ? void 0 : gateway.status
                });
            }
            catch (error) {
                console.error('Error retrieving gateway info:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }));
        // Setup specific endpoints
        this.setupSpecificEndpoints();
        // Error handling middleware
        this.app.use((err, _req, res, _next) => {
            console.error('Gateway error:', err.message);
            res.status(500).json({ error: 'Internal server error' });
        });
    }
    // API key validation middleware
    validateApiKey(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            // Skip validation for public endpoints
            if (req.path === '/health' || req.path === '/public') {
                return next();
            }
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'API key required' });
            }
            const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
            if (!apiKey.startsWith('axtv_')) {
                return res.status(401).json({ error: 'Invalid API key format' });
            }
            // Extract key prefix
            const keyParts = apiKey.substring(5).split('.');
            if (keyParts.length !== 2) {
                return res.status(401).json({ error: 'Invalid API key format' });
            }
            const keyPrefix = keyParts[0];
            try {
                const isValid = yield core_1.IntegrationGatewayService.validateApiKey(keyPrefix, apiKey);
                if (!isValid) {
                    return res.status(401).json({ error: 'Invalid API key' });
                }
                // Get API key details for use in subsequent middleware
                const keyDetails = yield this.getApiKeyDetails(keyPrefix);
                req.apiKey = keyDetails;
                next();
            }
            catch (error) {
                console.error('Error validating API key:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    }
    // Logging middleware
    logRequest(req, _res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            // Skip logging for health check endpoint
            if (req.path === '/health') {
                return next();
            }
            try {
                // Log the API request
                yield core_1.ActivityLoggerService.logActivity(((_a = req.apiKey) === null || _a === void 0 ? void 0 : _a.issuedToType) || 'ANONYMOUS', ((_b = req.apiKey) === null || _b === void 0 ? void 0 : _b.issuedToId) || 'unknown', `API_REQUEST_${req.method}`, 'GATEWAY', this.gatewayId, 'SUCCESS', {
                    path: req.path,
                    method: req.method,
                    query: req.query,
                    body: this.sanitizeRequestBody(req.body)
                }, req.ip, req.headers['user-agent']);
            }
            catch (error) {
                console.error('Error logging request:', error);
            }
            next();
        });
    }
    // Helper methods
    sanitizeRequestBody(body) {
        // Deep clone the body to avoid modifying the original
        const sanitized = JSON.parse(JSON.stringify(body || {}));
        // Recursively sanitize sensitive fields
        const sanitizeObject = (obj) => {
            for (const key in obj) {
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitizeObject(obj[key]);
                }
                else if (key.toLowerCase().includes('password') ||
                    key.toLowerCase().includes('secret') ||
                    key.toLowerCase().includes('token') ||
                    key.toLowerCase().includes('key')) {
                    obj[key] = '***REDACTED***';
                }
            }
        };
        sanitizeObject(sanitized);
        return sanitized;
    }
    retrieveEncryptionKey() {
        // In a real implementation, this would securely retrieve the encryption key
        // from a key management service or secure storage
        // For now, we'll generate a deterministic key based on the gateway ID
        const keyBase = process.env.ENCRYPTION_KEY_BASE || 'aixtiv-symphony-secure-key-base';
        return crypto_1.default.createHmac('sha256', keyBase).update(this.gatewayId).digest('hex');
    }
    getApiKeyDetails(keyPrefix) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield core_1.db.query(`SELECT * FROM integration_api_keys 
       WHERE key_prefix = $1 AND status = 'ACTIVE' AND (expires_at IS NULL OR expires_at > NOW())`, [keyPrefix]);
            if (result.rows.length === 0)
                return null;
            return {
                id: result.rows[0].id,
                gatewayId: result.rows[0].gateway_id,
                keyName: result.rows[0].key_name,
                issuedToType: result.rows[0].issued_to_type,
                issuedToId: result.rows[0].issued_to_id,
                permissions: result.rows[0].permissions,
                issuedAt: result.rows[0].issued_at,
                expiresAt: result.rows[0].expires_at
            };
        });
    }
    // Encryption/decryption helpers
    encrypt(data) {
        const iv = crypto_1.default.randomBytes(16);
        const cipher = crypto_1.default.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.substring(0, 32)), iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return `${iv.toString('hex')}:${encrypted}`;
    }
    decrypt(data) {
        const parts = data.split(':');
        if (parts.length !== 2)
            throw new Error('Invalid encrypted data format');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.substring(0, 32)), iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    // Start the gateway server
    start(port) {
        this.app.listen(port, () => {
            console.log(`Integration Gateway ${this.gatewayId} (${this.gatewayType}) running on port ${port}`);
        });
    }
}
exports.BaseIntegrationGateway = BaseIntegrationGateway;
// Owner Integration Gateway
class OwnerIntegrationGateway extends BaseIntegrationGateway {
    constructor(gatewayId, ownerId, ownerType) {
        super(gatewayId, core_1.GatewayType.OWNER, core_1.SecurityTier.BASIC);
        this.ownerId = ownerId;
        this.ownerType = ownerType;
    }
    setupSpecificMiddleware() {
        // Rate limiting specific to owner gateway
        this.app.use((0, express_rate_limit_1.default)({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: { error: 'Too many requests, please try again later' }
        }));
    }
    setupSpecificEndpoints() {
        // Personal profile management
        this.app.get('/profile', (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // Only allow the owner to access their profile
                if (((_a = req.apiKey) === null || _a === void 0 ? void 0 : _a.issuedToType) !== this.ownerType || ((_b = req.apiKey) === null || _b === void 0 ? void 0 : _b.issuedToId) !== this.ownerId) {
                    return res.status(403).json({ error: 'Unauthorized access to profile' });
                }
                // Fetch profile based on owner type
                let profile;
                if (this.ownerType === 'USER') {
                    const result = yield core_1.db.query('SELECT * FROM users WHERE id = $1', [this.ownerId]);
                    if (result.rows.length === 0) {
                        return res.status(404).json({ error: 'User not found' });
                    }
                    profile = {
                        id: result.rows[0].id,
                        email: result.rows[0].email,
                        username: result.rows[0].username,
                        firstName: result.rows[0].first_name,
                        lastName: result.rows[0].last_name,
                        profileImageUrl: result.rows[0].profile_image_url,
                        bio: result.rows[0].bio,
                        timezone: result.rows[0].timezone,
                        locale: result.rows[0].locale,
                        preferences: result.rows[0].preferences
                    };
                }
                else if (this.ownerType === 'ORGANIZATION') {
                    const result = yield core_1.db.query('SELECT * FROM organizations WHERE id = $1', [this.ownerId]);
                    if (result.rows.length === 0) {
                        return res.status(404).json({ error: 'Organization not found' });
                    }
                    profile = {
                        id: result.rows[0].id,
                        name: result.rows[0].name,
                        displayName: result.rows[0].display_name,
                        description: result.rows[0].description,
                        logoUrl: result.rows[0].logo_url,
                        website: result.rows[0].website,
                        industry: result.rows[0].industry,
                        sizeRange: result.rows[0].size_range,
                        address: result.rows[0].address,
                        settings: result.rows[0].settings
                    };
                }
                res.status(200).json(profile);
            }
            catch (error) {
                console.error('Error fetching profile:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }));
        // Personal agents management
        this.app.get('/agents', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield core_1.db.query(`SELECT ai.*, at.type_code, at.display_name as agent_type_name
           FROM agent_instances ai
           JOIN agent_types at ON ai.agent_type_id = at.id
           WHERE ai.owner_type = $1 AND ai.owner_id = $2`, [this.ownerType, this.ownerId]);
                const agents = result.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    nickname: row.nickname,
                    agentType: row.type_code,
                    agentTypeName: row.agent_type_name,
                    status: row.status,
                    performanceProfile: row.performance_profile,
                    createdAt: row.created_at
                }));
                res.status(200).json(agents);
            }
            catch (error) {
                console.error('Error fetching agents:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }));
        // Personal solutions
        this.app.get('/solutions', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield core_1.db.query(`SELECT s.*, ss.subscription_tier, ss.status as subscription_status, 
                  ss.start_date, ss.end_date
           FROM solutions s
           JOIN solution_subscriptions ss ON s.id = ss.solution_id
           WHERE ss.subscriber_type = $1 AND ss.subscriber_id = $2`, [this.ownerType, this.ownerId]);
                const solutions = result.rows.map(row => ({
                    id: row.id,
                    code: row.solution_code,
                    name: row.name,
                    description: row.description,
                    features: row.features,
                    version: row.version,
                    subscriptionTier: row.subscription_tier,
                    subscriptionStatus: row.subscription_status,
                    startDate: row.start_date,
                    endDate: row.end_date
                }));
                res.status(200).json(solutions);
            }
            catch (error) {
                console.error('Error fetching solutions:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }));
    }
    handleSpecificAuthorization(req, res, next) {
        var _a, _b;
        // For owner gateway, we only allow access to the owner
        if (req.path !== '/health' && req.path !== '/public') {
            if (((_a = req.apiKey) === null || _a === void 0 ? void 0 : _a.issuedToType) !== this.ownerType || ((_b = req.apiKey) === null || _b === void 0 ? void 0 : _b.issuedToId) !== this.ownerId) {
                // Allow access to specific endpoints that might be shared
                if (req.path.startsWith('/shared/')) {
                    // Check if the requesting entity has been granted access
                    this.checkSharedAccess(req, res, next);
                    return;
                }
                return res.status(403).json({ error: 'Unauthorized access' });
            }
        }
        next();
    }
    checkSharedAccess(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // Example: Check if the resource has been shared with the requester
                // This would be a more complex implementation based on your sharing model
                const resourceType = req.path.split('/')[2]; // e.g., /shared/agent/123 -> agent
                const resourceId = req.path.split('/')[3]; // e.g., /shared/agent/123 -> 123
                if (resourceType === 'agent') {
                    const result = yield core_1.db.query(`SELECT * FROM agent_access_controls 
           WHERE agent_instance_id = $1 AND access_type = $2 AND access_id = $3 
           AND status = 'ACTIVE'`, [resourceId, (_a = req.apiKey) === null || _a === void 0 ? void 0 : _a.issuedToType, (_b = req.apiKey) === null || _b === void 0 ? void 0 : _b.issuedToId]);
                    if (result.rows.length > 0) {
                        // Access granted
                        return next();
                    }
                }
                return res.status(403).json({ error: 'Resource not shared with you' });
            }
            catch (error) {
                console.error('Error checking shared access:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
        });
    }
}
exports.OwnerIntegrationGateway = OwnerIntegrationGateway;
// Enterprise Integration Gateway
class EnterpriseIntegrationGateway extends BaseIntegrationGateway {
    constructor(gatewayId, organizationId) {
        super(gatewayId, core_1.GatewayType.ENTERPRISE, core_1.SecurityTier.ENTERPRISE);
        this.organizationId = organizationId;
    }
    setupSpecificMiddleware() {
        // More robust rate limiting for enterprise gateway
        this.app.use((0, express_rate_limit_1.default)({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 500, // limit each IP to 500 requests per windowMs
            message: { error: 'Too many requests, please try again later' }
        }));
        // Additional security headers for enterprise
        this.app.use(helmet_1.default.contentSecurityPolicy());
        this.app.use(helmet_1.default.crossOriginEmbedderPolicy());
        this.app.use(helmet_1.default.crossOriginOpenerPolicy());
        this.app.use(helmet_1.default.crossOriginResourcePolicy());
    }
    setupSpecificEndpoints() {
        // Organization profile
        this.app.get('/organization', (_req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield core_1.db.query('SELECT * FROM organizations WHERE id = $1', [this.organizationId]);
                if (result.rows.length === 0) {
                    return res.status(404).json({ error: 'Organization not found' });
                }
                const organization = {
                    id: result.rows[0].id,
                    name: result.rows[0].name,
                    displayName: result.rows[0].display_name,
                    description: result.rows[0].description,
                    logoUrl: result.rows[0].logo_url,
                    website: result.rows[0].website,
                    industry: result.rows[0].industry,
                    sizeRange: result.rows[0].size_range,
                    address: result.rows[0].address,
                    status: result.rows[0].status,
                    settings: result.rows[0].settings,
                    createdAt: result.rows[0].created_at
                };
                res.status(200).json(organization);
            }
            catch (error) {
                console.error('Error fetching organization:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }));
        // Organization members
        this.app.get('/members', (_req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield core_1.db.query(`SELECT om.*, u.username, u.email, u.first_name, u.last_name 
           FROM organization_members om
           JOIN users u ON om.user_id = u.id
           WHERE om.organization_id = $1`, [this.organizationId]);
                const members = result.rows.map(row => ({
                    id: row.id,
                    userId: row.user_id,
                    role: row.role,
                    permissions: row.permissions,
                    joinedAt: row.joined_at,
                    status: row.status,
                    username: row.username,
                    email: row.email,
                    firstName: row.first_name,
                    lastName: row.last_name
                }));
                res.status(200).json(members);
            }
            catch (error) {
                console.error('Error fetching members:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }));
        // Teams management
        this.app.get('/teams', (_req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield core_1.db.query('SELECT * FROM teams WHERE organization_id = $1', [this.organizationId]);
                const teams = result.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    description: row.description,
                    teamLeadId: row.team_lead_id,
                    status: row.status,
                    settings: row.settings,
                    createdAt: row.created_at
                }));
                res.status(200).json(teams);
            }
            catch (error) {
                console.error('Error fetching teams:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }));
        // Team details
        this.app.get('/teams/:teamId', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                // First, verify that the team belongs to this organization
                const teamResult = yield core_1.db.query('SELECT * FROM teams WHERE id = $1 AND organization_id = $2', [req.params.teamId, this.organizationId]);
                if (teamResult.rows.length === 0) {
                    return res.status(404).json({ error: 'Team not found' });
                }
                // Get team members
                const membersResult = yield core_1.db.query(`SELECT tm.*, u.username, u.email, u.first_name, u.last_name 
           FROM team_members tm
           JOIN users u ON tm.user_id = u.id
           WHERE tm.team_id = $1`, [req.params.teamId]);
                const team = {
                    id: teamResult.rows[0].id,
                    name: teamResult.rows[0].name,
                    description: teamResult.rows[0].description,
                    teamLeadId: teamResult.rows[0].team_lead_id,
                    status: teamResult.rows[0].status,
                    settings: teamResult.rows[0].settings,
                    createdAt: teamResult.rows[0].created_at,
                    members: membersResult.rows.map(row => ({
                        id: row.id,
                        userId: row.user_id,
                        role: row.role,
                        joinedAt: row.joined_at,
                        status: row.status,
                        username: row.username,
                        email: row.email,
                        firstName: row.first_name,
                        lastName: row.last_name
                    }))
                };
                res.status(200).json(team);
            }
            catch (error) {
                console.error('Error fetching team details:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }));
        // Organization agents
        this.app.get('/agents', (_req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield core_1.db.query(`SELECT ai.*, at.type_code, at.display_name as agent_type_name
           FROM agent_instances ai
           JOIN agent_types at ON ai.agent_type_id = at.id
           WHERE ai.owner_type = 'ORGANIZATION' AND ai.owner_id = $1`, [this.organizationId]);
                const agents = result.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    nickname: row.nickname,
                    agentType: row.type_code,
                    agentTypeName: row.agent_type_name,
                    status: row.status,
                    performanceProfile: row.performance_profile,
                    createdAt: row.created_at
                }));
                res.status(200).json(agents);
            }
            catch (error) {
                console.error('Error fetching agents:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }));
        // Organization solutions
        this.app.get('/solutions', (_req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield core_1.db.query(`SELECT s.*, ss.subscription_tier, ss.status as subscription_status, 
                  ss.start_date, ss.end_date
           FROM solutions s
           JOIN solution_subscriptions ss ON s.id = ss.solution_id
           WHERE ss.subscriber_type = 'ORGANIZATION' AND ss.subscriber_id = $1`, [this.organizationId]);
                const solutions = result.rows.map(row => ({
                    id: row.id,
                    code: row.solution_code,
                    name: row.name,
                    description: row.description,
                    features: row.features,
                    version: row.version,
                    subscriptionTier: row.subscription_tier,
                    subscriptionStatus: row.subscription_status,
                    startDate: row.start_date,
                    endDate: row.end_date
                }));
                res.status(200).json(solutions);
            }
            catch (error) {
                console.error('Error fetching solutions:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }));
        // Integration with external systems
        this.app.get('/integrations', (_req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield core_1.db.query(`SELECT * FROM integration_connections 
           WHERE gateway_id = $1`, [this.gatewayId]);
                const integrations = result.rows.map(row => ({
                    id: row.id,
                    connectionType: row.connection_type,
                    displayName: row.display_name,
                    status: row.status,
                    createdAt: row.created_at
                }));
                res.status(200).json(integrations);
            }
            catch (error) {
                console.error('Error fetching integrations:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }));
        // Webhook receiver for external integrations
        this.app.post('/webhook/:connectionType', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { connectionType } = req.params;
                // Validate webhook signature if provided
                const signature = req.headers['x-webhook-signature'];
                if (signature) {
                    const isValid = this.validateWebhookSignature(signature.toString(), req.body);
                    if (!isValid) {
                        return res.status(401).json({ error: 'Invalid webhook signature' });
                    }
                }
                // Process webhook based on connection type
                yield this.processWebhook(connectionType, req.body);
                res.status(200).json({ status: 'ok' });
            }
            catch (error) {
                console.error('Error processing webhook:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }));
    }
    handleSpecificAuthorization(req, res, next) {
        var _a, _b, _c, _d;
        // Skip authorization for webhooks and public endpoints
        if (req.path.startsWith('/webhook/') || req.path === '/health' || req.path === '/public') {
            return next();
        }
        // For enterprise gateway, check organizational membership
        if (((_a = req.apiKey) === null || _a === void 0 ? void 0 : _a.issuedToType) === 'USER') {
            this.checkOrganizationMembership(req, res, next);
            return;
        }
        else if (((_b = req.apiKey) === null || _b === void 0 ? void 0 : _b.issuedToType) === 'ORGANIZATION' && ((_c = req.apiKey) === null || _c === void 0 ? void 0 : _c.issuedToId) === this.organizationId) {
            // Direct organization access
            return next();
        }
        else if (((_d = req.apiKey) === null || _d === void 0 ? void 0 : _d.issuedToType) === 'SERVICE') {
            // Service access with appropriate permissions
            // Additional logic could be implemented to verify service permissions
            return next();
        }
        return res.status(403).json({ error: 'Unauthorized access' });
    }
    checkOrganizationMembership(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.apiKey) === null || _a === void 0 ? void 0 : _a.issuedToId;
                const result = yield core_1.db.query(`SELECT * FROM organization_members 
         WHERE organization_id = $1 AND user_id = $2 AND status = 'ACTIVE'`, [this.organizationId, userId]);
                if (result.rows.length === 0) {
                    return res.status(403).json({ error: 'User is not a member of this organization' });
                }
                // Store member info for use in route handlers
                req.user = {
                    id: userId,
                    organizationRole: result.rows[0].role,
                    organizationPermissions: result.rows[0].permissions
                };
                next();
            }
            catch (error) {
                console.error('Error checking organization membership:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
        });
    }
    validateWebhookSignature(signature, payload) {
        // Example implementation - would need to be adapted for specific webhook providers
        const expectedSignature = crypto_1.default
            .createHmac('sha256', this.encryptionKey)
            .update(JSON.stringify(payload))
            .digest('hex');
        return crypto_1.default.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    }
    processWebhook(connectionType, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            // Log the webhook
            yield core_1.ActivityLoggerService.logActivity('EXTERNAL_SERVICE', connectionType, 'WEBHOOK_RECEIVED', 'GATEWAY', this.gatewayId, 'SUCCESS', { payloadType: typeof payload, payloadSize: JSON.stringify(payload).length });
            // Process based on connection type
            switch (connectionType) {
                case 'LINKEDIN':
                    yield this.processLinkedInWebhook(payload);
                    break;
                case 'SALESFORCE':
                    yield this.processSalesforceWebhook(payload);
                    break;
                default:
                    console.log(`Received webhook from ${connectionType}, no specific handler implemented`);
            }
        });
    }
    processLinkedInWebhook(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            // Example LinkedIn webhook processing
            console.log('Processing LinkedIn webhook:', payload.event_type);
            // Implementation would depend on specific LinkedIn webhook type
            if (payload.event_type === 'SHARE_COMMENT') {
                // Handle comment on a company share
            }
            else if (payload.event_type === 'CONNECTION_REQUEST') {
                // Handle new connection request for monitored profiles
            }
        });
    }
    processSalesforceWebhook(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            // Example Salesforce webhook processing
            console.log('Processing Salesforce webhook:', payload.type);
            // Implementation would depend on specific Salesforce webhook type
            if (payload.type === 'OPPORTUNITY_UPDATED') {
                // Handle opportunity update
            }
            else if (payload.type === 'LEAD_CREATED') {
                // Handle new lead creation
            }
        });
    }
}
exports.EnterpriseIntegrationGateway = EnterpriseIntegrationGateway;
// Owner-Subscriber Integration Gateway
class OwnerSubscriberIntegrationGateway extends BaseIntegrationGateway {
    constructor(gatewayId, ownerId, ownerType) {
        super(gatewayId, core_1.GatewayType.OWNER_SUBSCRIBER, core_1.SecurityTier.OWNER_SUBSCRIBER);
        this.ownerId = ownerId;
        this.ownerType = ownerType;
    }
    setupSpecificMiddleware() {
        // Advanced rate limiting for owner-subscriber gateway
        this.app.use((0, express_rate_limit_1.default)({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 1000, // limit each IP to 1000 requests per windowMs
            message: { error: 'Too many requests, please try again later' }
        }));
        // Additional security for owner-subscriber gateway
        this.app.use(helmet_1.default.contentSecurityPolicy());
        this.app.use(helmet_1.default.crossOriginEmbedderPolicy());
        this.app.use(helmet_1.default.crossOriginOpenerPolicy());
        this.app.use(helmet_1.default.crossOriginResourcePolicy());
    }
    setupSpecificEndpoints() {
        // Subscriber Management
        this.app.get('/subscribers', (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // Verify that the requester is the owner
                if (((_a = req.apiKey) === null || _a === void 0 ? void 0 : _a.issuedToType) !== this.ownerType ||
                    ((_b = req.apiKey) === null || _b === void 0 ? void 0 : _b.issuedToId) !== this.ownerId) {
                    return res.status(403).json({ error: 'Only the owner can view subscribers' });
                }
                // Get all solution subscriptions where this entity is the provider
                const result = yield core_1.db.query(`SELECT ss.*, s.solution_code, s.name as solution_name
           FROM solution_subscriptions ss
           JOIN solutions s ON ss.solution_id = s.id
           WHERE ss.provider_type = $1 AND ss.provider_id = $2`, [this.ownerType, this.ownerId]);
                const subscribers = result.rows.map(row => ({
                    id: row.id,
                    solutionId: row.solution_id,
                    solutionCode: row.solution_code,
                    solutionName: row.solution_name,
                    subscriberType: row.subscriber_type,
                    subscriberId: row.subscriber_id,
                    subscriptionTier: row.subscription_tier,
                    status: row.status,
                    startDate: row.start_date,
                    endDate: row.end_date,
                    billingCycle: row.billing_cycle,
                    paymentStatus: row.payment_status
                }));
                res.status(200).json(subscribers);
            }
            catch (error) {
                console.error('Error fetching subscribers:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }));
        // Subscription Details
        this.app.get('/subscriptions/:id', (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const subscriptionId = req.params.id;
                // Get subscription with subscriber details
                const result = yield core_1.db.query(`SELECT ss.*, s.solution_code, s.name as solution_name
           FROM solution_subscriptions ss
           JOIN solutions s ON ss.solution_id = s.id
           WHERE ss.id = $1`, [subscriptionId]);
                if (result.rows.length === 0) {
                    return res.status(404).json({ error: 'Subscription not found' });
                }
                const subscription = result.rows[0];
                // Check authorization
                if (
                // Owner can access
                (((_a = req.apiKey) === null || _a === void 0 ? void 0 : _a.issuedToType) === this.ownerType && ((_b = req.apiKey) === null || _b === void 0 ? void 0 : _b.issuedToId) === this.ownerId) ||
                    // Subscriber can access their own subscription
                    (((_c = req.apiKey) === null || _c === void 0 ? void 0 : _c.issuedToType) === subscription.subscriber_type && ((_d = req.apiKey) === null || _d === void 0 ? void 0 : _d.issuedToId) === subscription.subscriber_id)) {
                    // Get subscriber details based on type
                    let subscriberDetails = null;
                    if (subscription.subscriber_type === 'USER') {
                        const userResult = yield core_1.db.query('SELECT id, username, email, first_name, last_name FROM users WHERE id = $1', [subscription.subscriber_id]);
                        if (userResult.rows.length > 0) {
                            subscriberDetails = {
                                id: userResult.rows[0].id,
                                username: userResult.rows[0].username,
                                email: userResult.rows[0].email,
                                firstName: userResult.rows[0].first_name,
                                lastName: userResult.rows[0].last_name
                            };
                        }
                    }
                    else if (subscription.subscriber_type === 'ORGANIZATION') {
                        const orgResult = yield core_1.db.query('SELECT id, name, display_name FROM organizations WHERE id = $1', [subscription.subscriber_id]);
                        if (orgResult.rows.length > 0) {
                            subscriberDetails = {
                                id: orgResult.rows[0].id,
                                name: orgResult.rows[0].name,
                                displayName: orgResult.rows[0].display_name
                            };
                        }
                    }
                    res.status(200).json({
                        id: subscription.id,
                        solutionId: subscription.solution_id,
                        solutionCode: subscription.solution_code,
                        solutionName: subscription.solution_name,
                        subscriberType: subscription.subscriber_type,
                        subscriberId: subscription.subscriber_id,
                        subscriberDetails,
                        subscriptionTier: subscription.subscription_tier,
                        status: subscription.status,
                        startDate: subscription.start_date,
                        endDate: subscription.end_date,
                        billingCycle: subscription.billing_cycle,
                        paymentStatus: subscription.payment_status,
                        settings: subscription.settings
                    });
                }
                else {
                    return res.status(403).json({ error: 'Unauthorized access to subscription' });
                }
            }
            catch (error) {
                console.error('Error fetching subscription details:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }));
        // Solution Access Endpoints - accessible by subscribers
        this.app.get('/solutions/:solutionCode/access', (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const { solutionCode } = req.params;
                // First, verify that this solution exists
                const solutionResult = yield core_1.db.query('SELECT id FROM solutions WHERE solution_code = $1', [solutionCode]);
                if (solutionResult.rows.length === 0) {
                    return res.status(404).json({ error: 'Solution not found' });
                }
                const solutionId = solutionResult.rows[0].id;
                // Check if the requester has an active subscription
                const subscriptionResult = yield core_1.db.query(`SELECT * FROM solution_subscriptions 
           WHERE solution_id = $1 
           AND subscriber_type = $2 
           AND subscriber_id = $3
           AND status = 'ACTIVE'
           AND (end_date IS NULL OR end_date > NOW())`, [solutionId, (_a = req.apiKey) === null || _a === void 0 ? void 0 : _a.issuedToType, (_b = req.apiKey) === null || _b === void 0 ? void 0 : _b.issuedToId]);
                if (subscriptionResult.rows.length === 0) {
                    return res.status(403).json({ error: 'No active subscription found' });
                }
                // Get solution access details
                const accessResult = yield core_1.db.query(`SELECT name, features, version FROM solutions WHERE id = $1`, [solutionId]);
                // Generate an access token for the solution
                const accessToken = this.generateSolutionAccessToken(solutionId, (_c = req.apiKey) === null || _c === void 0 ? void 0 : _c.issuedToType, (_d = req.apiKey) === null || _d === void 0 ? void 0 : _d.issuedToId, subscriptionResult.rows[0].subscription_tier);
                res.status(200).json({
                    solution: {
                        id: solutionId,
                        code: solutionCode,
                        name: accessResult.rows[0].name,
                        features: accessResult.rows[0].features,
                        version: accessResult.rows[0].version
                    },
                    subscription: {
                        tier: subscriptionResult.rows[0].subscription_tier,
                        startDate: subscriptionResult.rows[0].start_date,
                        endDate: subscriptionResult.rows[0].end_date
                    },
                    access: {
                        token: accessToken,
                        expiresIn: 3600 // 1 hour in seconds
                    }
                });
            }
            catch (error) {
                console.error('Error accessing solution:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }));
        // Data sharing between owner and subscribers
        this.app.post('/data/share', (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { subscriberId, subscriberType, dataType, data } = req.body;
                if (!subscriberId || !subscriberType || !dataType || !data) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }
                // Verify that the requester is the owner
                if (((_a = req.apiKey) === null || _a === void 0 ? void 0 : _a.issuedToType) !== this.ownerType ||
                    ((_b = req.apiKey) === null || _b === void 0 ? void 0 : _b.issuedToId) !== this.ownerId) {
                    return res.status(403).json({ error: 'Only the owner can share data' });
                }
                // Verify that the subscriber exists and has an active subscription
                const subscriptionResult = yield core_1.db.query(`SELECT ss.id FROM solution_subscriptions ss
           JOIN solutions s ON ss.solution_id = s.id
           WHERE ss.subscriber_type = $1 
           AND ss.subscriber_id = $2
           AND ss.status = 'ACTIVE'
           AND (ss.end_date IS NULL OR ss.end_date > NOW())`, [subscriberType, subscriberId]);
                if (subscriptionResult.rows.length === 0) {
                    return res.status(403).json({ error: 'No active subscription found for this subscriber' });
                }
                // Store the shared data (encrypted)
                const encryptedData = this.encrypt(JSON.stringify(data));
                // In a real implementation, you would store this in a secure data sharing table
                // For now, we'll just acknowledge the request
                res.status(200).json({
                    status: 'success',
                    message: 'Data shared successfully',
                    dataId: (0, uuid_1.v4)() // In a real implementation, this would be the ID of the stored data
                });
            }
            catch (error) {
                console.error('Error sharing data:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }));
        // Data access by subscribers
        this.app.get('/data/access/:dataId', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { dataId } = req.params;
                // In a real implementation, you would retrieve the encrypted data
                // and check if the requester has access to it
                // For now, we'll just return a placeholder response
                res.status(200).json({
                    status: 'success',
                    message: 'Data access granted',
                    data: {
                        type: 'PLACEHOLDER',
                        content: 'This is a placeholder for shared data',
                        timestamp: new Date()
                    }
                });
            }
            catch (error) {
                console.error('Error accessing shared data:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }));
    }
    handleSpecificAuthorization(req, res, next) {
        var _a, _b;
        // Skip authorization for public endpoints
        if (req.path === '/health' || req.path === '/public') {
            return next();
        }
        // Owner-specific endpoints
        if (req.path === '/subscribers' ||
            req.path.startsWith('/data/share')) {
            if (((_a = req.apiKey) === null || _a === void 0 ? void 0 : _a.issuedToType) !== this.ownerType || ((_b = req.apiKey) === null || _b === void 0 ? void 0 : _b.issuedToId) !== this.ownerId) {
                return res.status(403).json({ error: 'Only the owner can access this endpoint' });
            }
            return next();
        }
        // For other endpoints, check subscription status
        this.checkSubscriptionStatus(req, res, next);
    }
    checkSubscriptionStatus(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                // Skip for owner access
                if (((_a = req.apiKey) === null || _a === void 0 ? void 0 : _a.issuedToType) === this.ownerType && ((_b = req.apiKey) === null || _b === void 0 ? void 0 : _b.issuedToId) === this.ownerId) {
                    return next();
                }
                // Check if the requester has any active subscription with this owner
                const result = yield core_1.db.query(`SELECT ss.* FROM solution_subscriptions ss
         WHERE ss.subscriber_type = $1 
         AND ss.subscriber_id = $2
         AND ss.provider_type = $3
         AND ss.provider_id = $4
         AND ss.status = 'ACTIVE'
         AND (ss.end_date IS NULL OR ss.end_date > NOW())`, [(_c = req.apiKey) === null || _c === void 0 ? void 0 : _c.issuedToType, (_d = req.apiKey) === null || _d === void 0 ? void 0 : _d.issuedToId, this.ownerType, this.ownerId]);
                if (result.rows.length === 0) {
                    return res.status(403).json({ error: 'No active subscription found' });
                }
                // Store subscription info for use in route handlers
                req.user = Object.assign(Object.assign({}, req.apiKey), { subscriptions: result.rows.map(row => ({
                        id: row.id,
                        solutionId: row.solution_id,
                        tier: row.subscription_tier,
                        startDate: row.start_date,
                        endDate: row.end_date
                    })) });
                next();
            }
            catch (error) {
                console.error('Error checking subscription status:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
        });
    }
    generateSolutionAccessToken(solutionId, subscriberType, subscriberId, subscriptionTier) {
        // Create a JWT token with limited lifespan
        const payload = {
            sub: `${subscriberType}:${subscriberId}`,
            iss: `gateway:${this.gatewayId}`,
            aud: `solution:${solutionId}`,
            tier: subscriptionTier,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiry
        };
        // In a real implementation, you would use a proper JWT library
        // For now, we'll just create a simulated token with encryption
        return this.encrypt(JSON.stringify(payload));
    }
}
exports.OwnerSubscriberIntegrationGateway = OwnerSubscriberIntegrationGateway;
// Gateway Factory to create appropriate gateway types
class IntegrationGatewayFactory {
    static createGateway(gatewayType, ownerId, ownerType, name, description) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Determine security tier based on gateway type
                let securityTier;
                switch (gatewayType) {
                    case core_1.GatewayType.OWNER:
                        securityTier = core_1.SecurityTier.BASIC;
                        break;
                    case core_1.GatewayType.ENTERPRISE:
                        securityTier = core_1.SecurityTier.ENTERPRISE;
                        break;
                    case core_1.GatewayType.OWNER_SUBSCRIBER:
                        securityTier = core_1.SecurityTier.OWNER_SUBSCRIBER;
                        break;
                    default:
                        securityTier = core_1.SecurityTier.BASIC;
                }
                // Create the gateway record in the database
                const gateway = yield core_1.IntegrationGatewayService.createGateway({
                    gatewayType,
                    name,
                    description,
                    ownerType,
                    ownerId,
                    securityTier,
                    status: 'ACTIVE'
                });
                // Create the appropriate gateway instance
                let gatewayInstance;
                switch (gatewayType) {
                    case core_1.GatewayType.OWNER:
                        gatewayInstance = new OwnerIntegrationGateway(gateway.id, ownerId, ownerType);
                        break;
                    case core_1.GatewayType.ENTERPRISE:
                        if (ownerType !== 'ORGANIZATION') {
                            throw new Error('Enterprise gateway can only be owned by an organization');
                        }
                        gatewayInstance = new EnterpriseIntegrationGateway(gateway.id, ownerId);
                        break;
                    case core_1.GatewayType.OWNER_SUBSCRIBER:
                        gatewayInstance = new OwnerSubscriberIntegrationGateway(gateway.id, ownerId, ownerType);
                        break;
                    default:
                        throw new Error(`Unsupported gateway type: ${gatewayType}`);
                }
                return { gateway: gatewayInstance, gatewayId: gateway.id };
            }
            catch (error) {
                console.error('Error creating integration gateway:', error);
                throw error;
            }
        });
    }
    static getExistingGateway(gatewayId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const gateway = yield core_1.IntegrationGatewayService.getGatewayById(gatewayId);
                if (!gateway) {
                    return null;
                }
                // Create the appropriate gateway instance
                let gatewayInstance;
                switch (gateway.gatewayType) {
                    case core_1.GatewayType.OWNER:
                        gatewayInstance = new OwnerIntegrationGateway(gateway.id, gateway.ownerId, gateway.ownerType);
                        break;
                    case core_1.GatewayType.ENTERPRISE:
                        gatewayInstance = new EnterpriseIntegrationGateway(gateway.id, gateway.ownerId);
                        break;
                    case core_1.GatewayType.OWNER_SUBSCRIBER:
                        gatewayInstance = new OwnerSubscriberIntegrationGateway(gateway.id, gateway.ownerId, gateway.ownerType);
                        break;
                    default:
                        throw new Error(`Unsupported gateway type: ${gateway.gatewayType}`);
                }
                return gatewayInstance;
            }
            catch (error) {
                console.error('Error retrieving integration gateway:', error);
                return null;
            }
        });
    }
    // Create all required gateways for a new entity
    static createAllGatewaysForEntity(ownerType, ownerId, entityName) {
        return __awaiter(this, void 0, void 0, function* () {
            const gatewayIds = [];
            try {
                // Create owner gateway
                const ownerGateway = yield this.createGateway(core_1.GatewayType.OWNER, ownerId, ownerType, `${entityName} Personal Gateway`, `Personal integration gateway for ${entityName}`);
                gatewayIds.push(ownerGateway.gatewayId);
                // Create owner-subscriber gateway
                const subscriberGateway = yield this.createGateway(core_1.GatewayType.OWNER_SUBSCRIBER, ownerId, ownerType, `${entityName} Subscriber Gateway`, `Subscriber integration gateway for ${entityName}`);
                gatewayIds.push(subscriberGateway.gatewayId);
                // Create enterprise gateway if organization
                if (ownerType === 'ORGANIZATION') {
                    const enterpriseGateway = yield this.createGateway(core_1.GatewayType.ENTERPRISE, ownerId, ownerType, `${entityName} Enterprise Gateway`, `Enterprise integration gateway for ${entityName}`);
                    gatewayIds.push(enterpriseGateway.gatewayId);
                }
                return gatewayIds;
            }
            catch (error) {
                console.error('Error creating gateways for entity:', error);
                throw error;
            }
        });
    }
}
exports.IntegrationGatewayFactory = IntegrationGatewayFactory;
// Export all gateway types
exports.default = {
    BaseIntegrationGateway,
    OwnerIntegrationGateway,
    EnterpriseIntegrationGateway,
    OwnerSubscriberIntegrationGateway,
    IntegrationGatewayFactory
};
