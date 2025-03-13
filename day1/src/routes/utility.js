const express = require('express');
const router = express.Router();
const os = require('os');

// System information endpoint
router.get('/system', (req, res) => {
    try {
        const systemInfo = {
            platform: os.platform(),
            arch: os.arch(),
            cpus: os.cpus().length,
            memory: {
                total: os.totalmem(),
                free: os.freemem(),
                used: os.totalmem() - os.freemem()
            },
            network: os.networkInterfaces(),
            uptime: os.uptime()
        };

        res.json({
            status: 'success',
            data: systemInfo
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve system information',
            error: error.message
        });
    }
});

// Echo endpoint for request inspection
router.all('/echo', (req, res) => {
    try {
        const requestInfo = {
            method: req.method,
            url: req.url,
            headers: req.headers,
            query: req.query,
            body: req.body,
            timestamp: new Date().toISOString(),
            ip: req.ip,
            protocol: req.protocol
        };

        res.json({
            status: 'success',
            request: requestInfo
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Echo request failed',
            error: error.message
        });
    }
});

// Time information endpoint
router.get('/time', (req, res) => {
    try {
        const now = new Date();
        const timeInfo = {
            iso: now.toISOString(),
            utc: now.toUTCString(),
            local: now.toString(),
            timestamp: now.getTime(),
            timezone: {
                name: Intl.DateTimeFormat().resolvedOptions().timeZone,
                offset: now.getTimezoneOffset()
            }
        };

        res.json({
            status: 'success',
            time: timeInfo
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve time information',
            error: error.message
        });
    }
});

// Debug endpoint for request timing
router.get('/debug/timing', (req, res) => {
    try {
        const start = process.hrtime();
        const timingInfo = {
            nodeStartTime: process.uptime(),
            currentMemory: process.memoryUsage(),
            requestStartTime: new Date().toISOString(),
            requestDuration: process.hrtime(start)
        };

        res.json({
            status: 'success',
            timing: timingInfo
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Debug timing failed',
            error: error.message
        });
    }
});

// Environment information endpoint
router.get('/env', (req, res) => {
    try {
        const envInfo = {
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development',
            platform: {
                type: os.type(),
                platform: os.platform(),
                release: os.release()
            }
        };

        res.json({
            status: 'success',
            environment: envInfo
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve environment information',
            error: error.message
        });
    }
});

module.exports = router;

