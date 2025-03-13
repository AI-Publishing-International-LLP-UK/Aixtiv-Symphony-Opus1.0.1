const prometheus = require('prom-client');

// Create metrics
const httpRequestsTotal = new prometheus.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'status']
});

const httpRequestDurationSeconds = new prometheus.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'path', 'status']
});

// Metrics middleware
const metricsMiddleware = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        httpRequestsTotal.inc({ method: req.method, path: req.path, status: res.statusCode });
        httpRequestDurationSeconds.observe(
            { method: req.method, path: req.path, status: res.statusCode },
            duration
        );
    });

    next();
};

module.exports = {
    metricsMiddleware,
    metrics: {
        httpRequestsTotal,
        httpRequestDurationSeconds
    }
};

