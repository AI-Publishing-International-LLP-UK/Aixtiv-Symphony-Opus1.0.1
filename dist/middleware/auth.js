"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = exports.authenticateToken = void 0;
const jwt = require("jsonwebtoken");
const config_1 = require("../config");
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Authentication token required' });
    }
    try {
        const user = jwt.verify(token, config_1.JWT_SECRET);
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};
exports.authenticateToken = authenticateToken;
const generateToken = (user) => {
    return jwt.sign(user, config_1.JWT_SECRET, { expiresIn: '24h' });
};
exports.generateToken = generateToken;
