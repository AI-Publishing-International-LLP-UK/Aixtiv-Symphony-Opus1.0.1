const os = require('os');
const { metrics } = require('../middleware/metrics');

const getMetrics = () => {
    return {
        requests: metrics.httpRequestsTotal.get(),
        requestDuration: metrics.httpRequestDurationSeconds.get(),
        system: {
            memory: process.memoryUsage(),
            cpu: os.cpus(),
            loadavg: os.loadavg()
        }
    };
};

const getSystemStatus = () => {
    return {
        uptime: process.uptime(),
        memory: {
            total: os.totalmem(),
            free: os.freemem(),
            used: os.totalmem() - os.freemem()
        },
        cpu: {
            cores: os.cpus().length,
            model: os.cpus()[0].model,
            speed: os.cpus()[0].speed
        },
        network: os.networkInterfaces(),
        platform: {
            type: os.type(),
            release: os.release(),
            arch: os.arch()
        }
    };
};

module.exports = {
    getMetrics,
    getSystemStatus
};

