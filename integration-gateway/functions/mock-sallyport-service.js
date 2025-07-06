#!/usr/bin/env node

/**
 * Mock SallyPort Authentication Service
 * 
 * This service provides a working authentication endpoint for development and testing
 * until the actual SallyPort service is properly deployed.
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8080;

// JWT secret (in production, this would be retrieved from Secret Manager)
const JWT_SECRET = process.env.JWT_SECRET || 'mock-sallyport-secret-2025';

// Mock user database
const MOCK_USERS = {
    'test-user-001': {
        uuid: 'test-user-001',
        email: 'test@2100.cool',
        displayName: 'Test User',
        role: 'user',
        permissions: ['read', 'write'],
        verified: true
    },
    'admin-user-001': {
        uuid: 'admin-user-001',
        email: 'admin@2100.cool',
        displayName: 'Admin User',
        role: 'admin',
        permissions: ['read', 'write', 'admin'],
        verified: true
    },
    'owner-user-001': {
        uuid: 'owner-user-001',
        email: 'owner@2100.cool',
        displayName: 'Owner User',
        role: 'owner',
        permissions: ['read', 'write', 'admin', 'owner'],
        verified: true
    }
};

// Mock session storage (in production, this would be Redis or database)
const ACTIVE_SESSIONS = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
        headers: req.headers,
        body: req.body
    });
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'mock-sallyport-auth',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Status endpoint
app.get('/status', (req, res) => {
    res.json({
        status: 'operational',
        active_sessions: ACTIVE_SESSIONS.size,
        mock_users: Object.keys(MOCK_USERS).length,
        environment: 'development'
    });
});

// API health check
app.get('/api/health', (req, res) => {
    res.json({
        api_status: 'healthy',
        endpoints: [
            '/health',
            '/status',
            '/api/health',
            '/session',
            '/auth/verify',
            '/auth/login',
            '/auth/logout'
        ]
    });
});

// Generate a mock session token
function generateSessionToken(userUuid) {
    const payload = {
        userUuid,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
        iss: 'mock-sallyport-service'
    };
    return jwt.sign(payload, JWT_SECRET);
}

// Verify session token
function verifySessionToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { valid: true, payload: decoded };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

// Mock login endpoint
app.post('/auth/login', (req, res) => {
    const { email, password, uuid } = req.body;
    
    // Simple mock authentication
    let user = null;
    
    if (uuid && MOCK_USERS[uuid]) {
        user = MOCK_USERS[uuid];
    } else if (email) {
        user = Object.values(MOCK_USERS).find(u => u.email === email);
    }
    
    if (!user) {
        return res.status(401).json({
            valid: false,
            message: 'Invalid credentials',
            error: 'user_not_found'
        });
    }
    
    // Generate session token
    const sessionToken = generateSessionToken(user.uuid);
    
    // Store session
    ACTIVE_SESSIONS.set(sessionToken, {
        ...user,
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString()
    });
    
    res.json({
        valid: true,
        sessionToken,
        user: {
            uuid: user.uuid,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            permissions: user.permissions
        }
    });
});

// Session verification endpoint
app.get('/session', (req, res) => {
    const sessionToken = req.headers['x-session-token'];
    
    if (!sessionToken) {
        return res.status(401).json({
            valid: false,
            message: 'Session token required',
            error: 'missing_token'
        });
    }
    
    // Verify JWT token
    const verification = verifySessionToken(sessionToken);
    
    if (!verification.valid) {
        return res.status(401).json({
            valid: false,
            message: 'Invalid session token',
            error: verification.error
        });
    }
    
    // Check if session exists in our store
    const sessionData = ACTIVE_SESSIONS.get(sessionToken);
    
    if (!sessionData) {
        return res.status(401).json({
            valid: false,
            message: 'Session not found or expired',
            error: 'session_not_found'
        });
    }
    
    // Update last activity
    sessionData.lastActivity = new Date().toISOString();
    ACTIVE_SESSIONS.set(sessionToken, sessionData);
    
    res.json({
        valid: true,
        userUuid: sessionData.uuid,
        email: sessionData.email,
        displayName: sessionData.displayName,
        role: sessionData.role,
        permissions: sessionData.permissions,
        lastActivity: sessionData.lastActivity
    });
});

// Auth verification endpoint (alias for session)
app.get('/auth/verify', (req, res) => {
    // Redirect to session endpoint with same logic
    req.url = '/session';
    app.handle(req, res);
});

// Logout endpoint
app.post('/auth/logout', (req, res) => {
    const sessionToken = req.headers['x-session-token'];
    
    if (sessionToken && ACTIVE_SESSIONS.has(sessionToken)) {
        ACTIVE_SESSIONS.delete(sessionToken);
    }
    
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// List mock users (for testing)
app.get('/users', (req, res) => {
    res.json({
        users: Object.values(MOCK_USERS).map(user => ({
            uuid: user.uuid,
            email: user.email,
            displayName: user.displayName,
            role: user.role
        }))
    });
});

// Create a test session for quick testing
app.post('/test/create-session', (req, res) => {
    const { userType = 'user' } = req.body;
    
    let userUuid;
    switch (userType) {
        case 'admin':
            userUuid = 'admin-user-001';
            break;
        case 'owner':
            userUuid = 'owner-user-001';
            break;
        default:
            userUuid = 'test-user-001';
    }
    
    const user = MOCK_USERS[userUuid];
    const sessionToken = generateSessionToken(userUuid);
    
    ACTIVE_SESSIONS.set(sessionToken, {
        ...user,
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString()
    });
    
    res.json({
        sessionToken,
        user,
        instructions: {
            usage: 'Use this token in X-Session-Token header',
            test_endpoint: '/session',
            expires_in: '24 hours'
        }
    });
});

// Error handling
app.use((error, req, res, next) => {
    console.error('[ERROR]', error);
    res.status(500).json({
        valid: false,
        message: 'Internal server error',
        error: error.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        valid: false,
        message: 'Endpoint not found',
        available_endpoints: [
            'GET /health',
            'GET /status',
            'GET /api/health',
            'GET /session',
            'GET /auth/verify',
            'POST /auth/login',
            'POST /auth/logout',
            'GET /users',
            'POST /test/create-session'
        ]
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Mock SallyPort Service running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🔐 Session endpoint: http://localhost:${PORT}/session`);
    console.log(`👥 Test users available: ${Object.keys(MOCK_USERS).length}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    
    // Create some initial test sessions
    console.log('\n🧪 Creating test sessions...');
    Object.entries(MOCK_USERS).forEach(([uuid, user]) => {
        const token = generateSessionToken(uuid);
        ACTIVE_SESSIONS.set(token, {
            ...user,
            loginTime: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        });
        console.log(`✓ ${user.role} session: ${token.substring(0, 20)}...`);
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📛 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📛 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
