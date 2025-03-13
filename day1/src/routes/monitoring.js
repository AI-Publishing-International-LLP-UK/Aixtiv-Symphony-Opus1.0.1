const express = require('express');
const router = express.Router();
const os = require('os');
const { getMetrics, getSystemStatus } = require('../services/monitoring');

// Metrics endpoint
router.get('/metrics', (req, res) => {
    res.json(getMetrics());
});

// Status endpoint
router.get('/status', (req, res) => {
    res.json(getSystemStatus());
});

// Readiness probe
router.get('/ready', (req, res) => {
    res.json({
        status: 'ready',
        timestamp: new Date().toISOString()
    });
});

// Liveness probe
router.get('/live', (req, res) => {
    res.json({
        status: 'alive',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

module.exports = router;

