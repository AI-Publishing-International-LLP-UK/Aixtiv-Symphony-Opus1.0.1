"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BASE_URL = exports.DEMO_USERS = exports.API_VERSION = exports.JWT_SECRET = exports.NODE_ENV = exports.PORT = void 0;
exports.PORT = process.env.PORT || 3000;
exports.NODE_ENV = process.env.NODE_ENV || 'development';
exports.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
exports.API_VERSION = '1.0.0';
// For demo purposes only - in production, use a proper user database
exports.DEMO_USERS = [
    {
        id: '1',
        username: 'demo',
        // In production, this would be a hashed password
        password: 'demo123'
    }
];
exports.BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
