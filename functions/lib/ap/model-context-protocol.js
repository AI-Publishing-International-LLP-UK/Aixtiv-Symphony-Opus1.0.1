"use strict";
/**
 * Model Context Protocol (MCP) Implementation
 * Comprehensive framework for intelligent agent communication
 * Version: 2.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMCP = exports.MCPConnectionError = exports.MCPInitializationError = exports.MCPError = exports.ModelContextProtocol = void 0;
const axios_1 = require("axios");
const uuid_1 = require("uuid");
/**
 * Token Manager for OAuth2 authentication
 */
class TokenManager {
    constructor(config) {
        this.config = config;
        this.tokens = {
            accessToken: null,
            refreshToken: null,
            expiresAt: null,
        };
        // Load tokens from storage if available
        this.loadTokens();
    }
    /**
     * Load tokens from storage
     */
    loadTokens() {
        if (this.config.tokenStorage === 'localStorage' && typeof localStorage !== 'undefined') {
            const storedTokens = localStorage.getItem('mcp.tokens');
            if (storedTokens) {
                try {
                    this.tokens = JSON.parse(storedTokens);
                }
                catch (error) {
                    console.error('Failed to parse stored tokens:', error);
                }
            }
        }
        else if (this.config.tokenStorage === 'sessionStorage' && typeof sessionStorage !== 'undefined') {
            const storedTokens = sessionStorage.getItem('mcp.tokens');
            if (storedTokens) {
                try {
                    this.tokens = JSON.parse(storedTokens);
                }
                catch (error) {
                    console.error('Failed to parse stored tokens:', error);
                }
            }
        }
    }
    /**
     * Save tokens to storage
     */
    saveTokens() {
        if (this.config.tokenStorage === 'localStorage' && typeof localStorage !== 'undefined') {
            localStorage.setItem('mcp.tokens', JSON.stringify(this.tokens));
        }
        else if (this.config.tokenStorage === 'sessionStorage' && typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('mcp.tokens', JSON.stringify(this.tokens));
        }
    }
    /**
     * Generate a random state for OAuth2 authentication
     */
    async generateAuthState() {
        return (0, uuid_1.v4)();
    }
    /**
     * Check if the access token is valid
     */
    isTokenValid() {
        if (!this.tokens.accessToken || !this.tokens.expiresAt) {
            return false;
        }
        // Add a 5-minute buffer to ensure the token is still valid
        const now = Date.now();
        return this.tokens.expiresAt > now + 5 * 60 * 1000;
    }
    /**
     * Get the access token, refreshing if necessary
     */
    async getAccessToken() {
        if (this.isTokenValid()) {
            return this.tokens.accessToken;
        }
        // Token is expired or missing, try to refresh
        if (this.tokens.refreshToken) {
            await this.refreshAccessToken();
            return this.tokens.accessToken;
        }
        throw new Error('No valid access token or refresh token available');
    }
    /**
     * Refresh the access token using the refresh token
     */
    async refreshAccessToken() {
        try {
            const response = await axios_1.default.post(`${this.config.mcpServerUrl}/oauth/token`, {
                grant_type: 'refresh_token',
                refresh_token: this.tokens.refreshToken,
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
            });
            const { access_token, refresh_token, expires_in } = response.data;
            this.tokens = {
                accessToken: access_token,
                refreshToken: refresh_token || this.tokens.refreshToken,
                expiresAt: Date.now() + expires_in * 1000,
            };
            this.saveTokens();
        }
        catch (error) {
            console.error('Failed to refresh access token:', error);
            throw error;
        }
    }
    /**
     * Exchange an authorization code for tokens
     */
    async exchangeCodeForTokens(code) {
        try {
            const response = await axios_1.default.post(`${this.config.mcpServerUrl}/oauth/token`, {
                grant_type: 'authorization_code',
                code,
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                redirect_uri: this.config.redirectUri,
            });
            const { access_token, refresh_token, expires_in } = response.data;
            this.tokens = {
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresAt: Date.now() + expires_in * 1000,
            };
            this.saveTokens();
        }
        catch (error) {
            console.error('Failed to exchange code for tokens:', error);
            throw error;
        }
    }
    /**
     * Set tokens directly
     */
    setTokens(accessToken, refreshToken, expiresIn) {
        this.tokens = {
            accessToken,
            refreshToken,
            expiresAt: Date.now() + expiresIn * 1000,
        };
        this.saveTokens();
    }
    /**
     * Clear tokens
     */
    clearTokens() {
        this.tokens = {
            accessToken: null,
            refreshToken: null,
            expiresAt: null,
        };
        if (this.config.tokenStorage === 'localStorage' && typeof localStorage !== 'undefined') {
            localStorage.removeItem('mcp.tokens');
        }
        else if (this.config.tokenStorage === 'sessionStorage' && typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem('mcp.tokens');
        }
    }
    /**
     * Check and refresh token if necessary
     */
    async checkAndRefreshToken() {
        if (!this.isTokenValid() && this.tokens.refreshToken) {
            await this.refreshAccessToken();
        }
    }
}
/**
 * State Handler for quantum-like transformations
 */
class StateHandler {
    constructor(stateMatrix = {}) {
        this.stateMatrix = stateMatrix;
        this.currentVector = [1, 0, 0, 0, 0, 0, 0, 0]; // Default 8D vector
        this.coherenceLevel = 1.0;
    }
    /**
     * Initialize the state
     */
    async initializeState() {
        // Initialize with identity state
        this.currentVector = [1, 0, 0, 0, 0, 0, 0, 0];
        this.coherenceLevel = 1.0;
    }
    /**
     * Get the current vector
     */
    getCurrentVector() {
        return [...this.currentVector];
    }
    /**
     * Get the coherence level
     */
    getCoherenceLevel() {
        return this.coherenceLevel;
    }
    /**
     * Process a state update
     */
    async processStateUpdate(newState) {
        // Apply transformation based on new state
        const updatedVector = this.applyTransformation(this.currentVector, newState);
        // Calculate new coherence level
        this.coherenceLevel = this.calculateCoherence(updatedVector);
        // Update current vector
        this.currentVector = updatedVector;
        return {
            vector: this.currentVector,
            coherenceLevel: this.coherenceLevel,
            timestamp: Date.now(),
        };
    }
    /**
     * Apply a transformation to a vector
     */
    applyTransformation(vector, transformation) {
        // Simple matrix multiplication as an example
        // In a real implementation, this would be more sophisticated
        return vector.map((value, index) => {
            return value * (transformation.factor || 1);
        });
    }
    /**
     * Calculate coherence of a vector
     */
    calculateCoherence(vector) {
        // Calculate the L2 norm and normalize to [0, 1]
        const sumOfSquares = vector.reduce((sum, value) => sum + value * value, 0);
        return Math.min(1.0, Math.sqrt(sumOfSquares));
    }
}
/**
 * MCP (Model Context Protocol) Implementation
 */
class ModelContextProtocol {
    /**
     * Create a new MCP instance
     */
    constructor(config) {
        this.config = Object.assign({ mcpServerUrl: 'https://mcp.aixtiv.io', clientId: '', clientSecret: '', redirectUri: '', scope: 'read write execute', tokenStorage: 'localStorage', quantum: {
                enabled: false,
                coherenceThreshold: 0.95,
                stateVectorSize: 8,
            }, debug: false }, config);
        this.tokenManager = new TokenManager(this.config);
        this.stateHandler = new StateHandler(this.config.stateMatrix);
        this.agents = new Map();
        this.sessionId = (0, uuid_1.v4)();
        this.messageHistory = [];
        // Create HTTP client
        this.client = axios_1.default.create({
            baseURL: this.config.mcpServerUrl,
            timeout: 30000,
        });
        // Add request interceptor for authentication
        this.client.interceptors.request.use(async (config) => {
            try {
                const token = await this.tokenManager.getAccessToken();
                config.headers.Authorization = `Bearer ${token}`;
            }
            catch (error) {
                console.error('Failed to get access token:', error);
            }
            return config;
        });
        // Add response interceptor for error handling
        this.client.interceptors.response.use((response) => response, async (error) => {
            var _a;
            if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 401) {
                // Token expired, try to refresh
                try {
                    await this.tokenManager.refreshAccessToken();
                    // Retry the request
                    const originalRequest = error.config;
                    originalRequest.headers.Authorization = `Bearer ${await this.tokenManager.getAccessToken()}`;
                    return this.client(originalRequest);
                }
                catch (refreshError) {
                    console.error('Failed to refresh token:', refreshError);
                }
            }
            return Promise.reject(error);
        });
    }
    /**
     * Initialize the MCP
     */
    async initialize() {
        try {
            // Initialize token manager
            await this.tokenManager.checkAndRefreshToken();
            // Initialize state handler
            await this.stateHandler.initializeState();
            // Check server readiness
            const readiness = await this.checkSystemReadiness();
            if (this.config.debug) {
                console.log('MCP initialized:', {
                    status: 'initialized',
                    coherenceLevel: this.stateHandler.getCoherenceLevel(),
                    readiness,
                });
            }
            return {
                status: 'initialized',
                coherenceLevel: this.stateHandler.getCoherenceLevel(),
                readiness,
            };
        }
        catch (error) {
            console.error('MCP Initialization Error:', error);
            throw new MCPInitializationError(error.message);
        }
    }
    /**
     * Check system readiness
     */
    async checkSystemReadiness() {
        try {
            const response = await this.client.get('/health');
            return response.data.status === 'UP';
        }
        catch (error) {
            console.error('System readiness check failed:', error);
            return false;
        }
    }
    /**
     * Authenticate with OAuth2
     */
    async authenticate() {
        const authState = await this.tokenManager.generateAuthState();
        const authUrl = new URL(`${this.config.mcpServerUrl}/oauth/authorize`);
        authUrl.searchParams.append('client_id', this.config.clientId);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('redirect_uri', this.config.redirectUri);
        authUrl.searchParams.append('state', authState);
        authUrl.searchParams.append('scope', this.config.scope || 'read write execute');
        return {
            url: authUrl.toString(),
            state: authState,
            timestamp: Date.now(),
            coherenceVector: this.stateHandler.getCurrentVector(),
        };
    }
    /**
     * Handle OAuth2 callback
     */
    async handleCallback(code, state) {
        try {
            await this.tokenManager.exchangeCodeForTokens(code);
            return true;
        }
        catch (error) {
            console.error('Failed to handle callback:', error);
            return false;
        }
    }
    /**
     * Register an agent
     */
    async registerAgent(agent) {
        try {
            // Register with server
            const response = await this.client.post('/agents/register', agent);
            if (response.status === 200 || response.status === 201) {
                // Store locally
                this.agents.set(agent.id, agent);
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('Failed to register agent:', error);
            return false;
        }
    }
    /**
     * Get an agent by ID
     */
    getAgent(agentId) {
        return this.agents.get(agentId);
    }
    /**
     * List all registered agents
     */
    listAgents() {
        return Array.from(this.agents.values());
    }
    /**
     * Send a message to an agent
     */
    async sendMessage(senderId, recipientId, message, contextType = 'instruction', metadata = {}) {
        // Create message context
        const context = {
            id: (0, uuid_1.v4)(),
            sessionId: this.sessionId,
            senderId,
            recipientId,
            timestamp: new Date(),
            type: contextType,
            data: {
                message,
                format: 'text',
            },
            metadata: Object.assign(Object.assign({}, metadata), { coherenceLevel: this.stateHandler.getCoherenceLevel(), coherenceVector: this.stateHandler.getCurrentVector() }),
        };
        try {
            // Send message to server
            const response = await this.client.post('/messages', context);
            // Store in history
            this.messageHistory.push(context);
            // Update state
            await this.stateHandler.processStateUpdate({
                type: 'message_sent',
                context,
            });
            return context;
        }
        catch (error) {
            console.error('Failed to send message:', error);
            throw new MCPError({
                message: `Failed to send message: ${error.message}`,
                type: 'MESSAGE_ERROR',
                retryable: true,
            });
        }
    }
    /**
     * Receive messages for an agent
     */
    async receiveMessages(agentId) {
        try {
            const response = await this.client.get(`/messages/${agentId}`);
            // Add messages to history
            for (const message of response.data) {
                this.messageHistory.push(message);
            }
            return response.data;
        }
        catch (error) {
            console.error('Failed to receive messages:', error);
            throw new MCPError({
                message: `Failed to receive messages: ${error.message}`,
                type: 'MESSAGE_ERROR',
                retryable: true,
            });
        }
    }
    /**
     * Get message history
     */
    getMessageHistory(filterOptions = {}) {
        let filteredHistory = [...this.messageHistory];
        // Apply filters
        if (filterOptions.senderId) {
            filteredHistory = filteredHistory.filter((msg) => msg.senderId === filterOptions.senderId);
        }
        if (filterOptions.recipientId) {
            filteredHistory = filteredHistory.filter((msg) => msg.recipientId === filterOptions.recipientId);
        }
        if (filterOptions.type) {
            filteredHistory = filteredHistory.filter((msg) => msg.type === filterOptions.type);
        }
        // Sort by timestamp (newest first)
        filteredHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        // Apply limit
        if (filterOptions.limit) {
            filteredHistory = filteredHistory.slice(0, filterOptions.limit);
        }
        return filteredHistory;
    }
    /**
     * Establish server connection
     */
    async establishServerConnection() {
        const connectionParams = {
            protocol: 'mcp-v2',
            timestamp: Date.now(),
            stateVector: this.stateHandler.getCurrentVector(),
            coherenceLevel: this.stateHandler.getCoherenceLevel(),
            capabilities: this.getSystemCapabilities(),
            sessionId: this.sessionId,
        };
        try {
            const response = await this.client.post('/establish', connectionParams);
            return this.handleConnectionResponse(response);
        }
        catch (error) {
            throw new MCPConnectionError(error.message);
        }
    }
    /**
     * Handle connection response
     */
    handleConnectionResponse(response) {
        // Process and return connection details
        return response.data;
    }
    /**
     * Update state matrix
     */
    async updateStateMatrix(newState) {
        var _a;
        const stateUpdate = await this.stateHandler.processStateUpdate(newState);
        if ((_a = this.config.quantum) === null || _a === void 0 ? void 0 : _a.enabled) {
            return this.applyQuantumTransformation(stateUpdate);
        }
        return stateUpdate;
    }
    /**
     * Apply quantum transformation
     */
    applyQuantumTransformation(state) {
        var _a, _b;
        const coherenceLevel = this.calculateCoherence(state);
        const transformedState = this.transformStateVector(state);
        return Object.assign(Object.assign({}, transformedState), { coherenceLevel, timestamp: Date.now(), metadata: {
                transformationType: 'quantum',
                coherenceThreshold: (_a = this.config.quantum) === null || _a === void 0 ? void 0 : _a.coherenceThreshold,
                stateVectorSize: (_b = this.config.quantum) === null || _b === void 0 ? void 0 : _b.stateVectorSize,
            } });
    }
    /**
     * Calculate coherence
     */
    calculateCoherence(state) {
        // Implementation of coherence calculation based on state vector
        const stateVector = state.vector || [];
        let coherenceSum = 0;
        for (let i = 0; i < stateVector.length; i++) {
            coherenceSum += Math.pow(Math.abs(stateVector[i]), 2);
        }
        return Math.sqrt(coherenceSum);
    }
    /**
     * Transform state vector
     */
    transformStateVector(state) {
        // Implementation of quantum-like state transformation
        const vector = state.vector || [];
        return Object.assign(Object.assign({}, state), { vector: vector.map((component) => {
                const phase = Math.random() * Math.PI * 2;
                return {
                    magnitude: Math.abs(component),
                    phase: phase,
                    value: component * Math.cos(phase),
                };
            }) });
    }
    /**
     * Get system capabilities
     */
    getSystemCapabilities() {
        var _a, _b, _c, _d;
        return {
            quantum: (_a = this.config.quantum) === null || _a === void 0 ? void 0 : _a.enabled,
            stateVectorSize: (_b = this.config.quantum) === null || _b === void 0 ? void 0 : _b.stateVectorSize,
            coherenceThreshold: (_c = this.config.quantum) === null || _c === void 0 ? void 0 : _c.coherenceThreshold,
            supportedProtocols: ['mcp-v2', 'quantum-state', 'coherence-sync'],
            systemVersion: '2.0.0',
            features: {
                stateTransformation: true,
                coherenceTracking: true,
                quantumOptimization: (_d = this.config.quantum) === null || _d === void 0 ? void 0 : _d.enabled,
                multiAgentCommunication: true,
            },
        };
    }
}
exports.ModelContextProtocol = ModelContextProtocol;
/**
 * Base error class
 */
class MCPError extends Error {
    constructor(details) {
        super(details.message);
        this.name = 'MCPError';
        this.details = details;
    }
}
exports.MCPError = MCPError;
/**
 * Initialization error
 */
class MCPInitializationError extends MCPError {
    constructor(message) {
        super({
            message,
            type: 'INITIALIZATION_ERROR',
            retryable: true,
        });
        this.name = 'MCPInitializationError';
    }
}
exports.MCPInitializationError = MCPInitializationError;
/**
 * Connection error
 */
class MCPConnectionError extends MCPError {
    constructor(message) {
        super({
            message,
            type: 'CONNECTION_ERROR',
            retryable: true,
        });
        this.name = 'MCPConnectionError';
    }
}
exports.MCPConnectionError = MCPConnectionError;
// Export singleton instance creator
const createMCP = (config) => {
    return new ModelContextProtocol(config);
};
exports.createMCP = createMCP;
exports.default = exports.createMCP;
//# sourceMappingURL=model-context-protocol.js.map