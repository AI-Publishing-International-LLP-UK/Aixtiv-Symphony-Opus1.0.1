/**
 * CORS Policy Manager for ASOOS Integration Gateway
 * 
 * Implements region-aware CORS policies with enhanced security
 * for Claude.ai desktop applications and other authorized origins.
 */

const cors = require('cors');

class CORSPolicyManager {
    constructor(config = {}) {
        this.config = {
            // Region-specific allowed origins
            regions: {
                'us-west1': {
                    allowedOrigins: [
                        'https://claude.ai',
                        'https://app.claude.ai',
                        'https://desktop.claude.ai',
                        'https://2100.cool',
                        'https://*.2100.cool',
                        'https://aixtiv.io',
                        'https://*.aixtiv.io',
                        'https://coaching2100.com',
                        'https://*.coaching2100.com'
                    ],
                    credentials: true,
                    maxAge: 86400 // 24 hours
                },
                'eu-west1': {
                    allowedOrigins: [
                        'https://claude.ai',
                        'https://app.claude.ai', 
                        'https://desktop.claude.ai',
                        'https://2100.cool',
                        'https://*.2100.cool',
                        'https://aixtiv.io',
                        'https://*.aixtiv.io',
                        // EU-specific domains
                        'https://eu.aixtiv.io',
                        'https://*.eu.aixtiv.io'
                    ],
                    credentials: true,
                    maxAge: 3600, // 1 hour for GDPR compliance
                    additionalHeaders: ['X-GDPR-Consent', 'X-Data-Subject-Request']
                },
                'us-central1': {
                    allowedOrigins: [
                        'https://claude.ai',
                        'https://app.claude.ai',
                        'https://desktop.claude.ai',
                        'https://orchestrator.aixtiv.io',
                        'https://*.orchestrator.aixtiv.io',
                        // Agent-specific origins
                        'https://wing.aixtiv.io',
                        'https://squadron.aixtiv.io'
                    ],
                    credentials: true,
                    maxAge: 43200 // 12 hours
                }
            },
            // Default security headers
            securityHeaders: {
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block',
                'Referrer-Policy': 'strict-origin-when-cross-origin',
                'Cross-Origin-Embedder-Policy': 'require-corp',
                'Cross-Origin-Opener-Policy': 'same-origin',
                'Cross-Origin-Resource-Policy': 'cross-origin'
            },
            // Development and testing
            developmentMode: process.env.NODE_ENV !== 'production',
            ...config
        };

        this.corsCache = new Map();
        this.setupPolicies();
    }

    /**
     * Setup CORS policies for different regions
     */
    setupPolicies() {
        this.policies = {};
        
        for (const [region, regionConfig] of Object.entries(this.config.regions)) {
            this.policies[region] = cors({
                origin: this.createOriginValidator(region, regionConfig),
                credentials: regionConfig.credentials,
                maxAge: regionConfig.maxAge,
                allowedHeaders: this.getAllowedHeaders(regionConfig),
                exposedHeaders: this.getExposedHeaders(regionConfig),
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
                preflightContinue: false,
                optionsSuccessStatus: 204
            });
        }
    }

    /**
     * Create origin validator for specific region
     */
    createOriginValidator(region, regionConfig) {
        return (origin, callback) => {
            // Allow same-origin requests (no origin header)
            if (!origin) {
                return callback(null, true);
            }

            // Development mode - allow localhost
            if (this.config.developmentMode && this.isLocalhost(origin)) {
                return callback(null, true);
            }

            // Check cache first
            const cacheKey = `${region}_${origin}`;
            const cached = this.corsCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes cache
                return callback(null, cached.allowed);
            }

            // Validate origin
            const allowed = this.validateOrigin(origin, regionConfig.allowedOrigins);
            
            // Cache result
            this.corsCache.set(cacheKey, {
                allowed,
                timestamp: Date.now()
            });

            if (allowed) {
                console.log(`[CORS] Allowed origin: ${origin} for region: ${region}`);
                callback(null, true);
            } else {
                console.warn(`[CORS] Blocked origin: ${origin} for region: ${region}`);
                callback(new Error(`Origin ${origin} not allowed for region ${region}`), false);
            }
        };
    }

    /**
     * Validate origin against allowed patterns
     */
    validateOrigin(origin, allowedOrigins) {
        for (const allowedOrigin of allowedOrigins) {
            if (this.matchesOriginPattern(origin, allowedOrigin)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if origin matches pattern (supports wildcards)
     */
    matchesOriginPattern(origin, pattern) {
        // Exact match
        if (origin === pattern) {
            return true;
        }

        // Wildcard subdomain matching
        if (pattern.startsWith('https://*.')) {
            const domain = pattern.slice(10); // Remove 'https://*.'
            const regex = new RegExp(`^https://[a-zA-Z0-9-]+\\.${domain.replace(/\./g, '\\.')}$`);
            return regex.test(origin);
        }

        return false;
    }

    /**
     * Get allowed headers for region
     */
    getAllowedHeaders(regionConfig) {
        const baseHeaders = [
            'Accept',
            'Accept-Language',
            'Content-Type',
            'Content-Language',
            'Authorization',
            'X-Requested-With',
            'X-API-Key',
            'X-Client-Version',
            'X-Request-ID',
            'X-Preferred-Region',
            'X-Agent-Type',
            'X-User-Type',
            'X-Session-ID'
        ];

        // Add region-specific headers
        if (regionConfig.additionalHeaders) {
            baseHeaders.push(...regionConfig.additionalHeaders);
        }

        return baseHeaders;
    }

    /**
     * Get exposed headers for region
     */
    getExposedHeaders(regionConfig) {
        const baseHeaders = [
            'X-Routed-Region',
            'X-Routing-Reason',
            'X-Region-Source',
            'X-Request-ID',
            'X-Response-Time',
            'X-Rate-Limit-Remaining',
            'X-Rate-Limit-Reset'
        ];

        // Add GDPR headers for EU region
        if (regionConfig.additionalHeaders?.includes('X-GDPR-Consent')) {
            baseHeaders.push('X-GDPR-Processed', 'X-Data-Retention-Policy');
        }

        return baseHeaders;
    }

    /**
     * Check if origin is localhost (for development)
     */
    isLocalhost(origin) {
        const localhostPatterns = [
            'http://localhost',
            'https://localhost',
            'http://127.0.0.1',
            'https://127.0.0.1'
        ];
        
        return localhostPatterns.some(pattern => origin.startsWith(pattern));
    }

    /**
     * Get CORS middleware for specific region
     */
    getCORSMiddleware(region = 'us-west1') {
        const corsPolicy = this.policies[region] || this.policies['us-west1'];
        
        return (req, res, next) => {
            // Add security headers
            this.addSecurityHeaders(res, region);
            
            // Apply CORS policy
            corsPolicy(req, res, (err) => {
                if (err) {
                    console.error(`[CORS] Policy violation for ${req.get('Origin')} in region ${region}:`, err.message);
                    return res.status(403).json({
                        error: 'CORS policy violation',
                        message: 'Origin not allowed',
                        region,
                        timestamp: new Date().toISOString()
                    });
                }
                next();
            });
        };
    }

    /**
     * Add security headers based on region
     */
    addSecurityHeaders(res, region) {
        // Base security headers
        Object.entries(this.config.securityHeaders).forEach(([header, value]) => {
            res.set(header, value);
        });

        // Region-specific security headers
        if (region === 'eu-west1') {
            // Enhanced GDPR compliance headers
            res.set('X-GDPR-Compliant', 'true');
            res.set('X-Data-Processing-Lawful-Basis', 'consent');
            res.set('X-Cookie-Policy', 'essential-only');
        }

        if (region === 'us-central1') {
            // Enhanced security for orchestration
            res.set('X-Agent-Security-Level', 'high');
            res.set('X-Orchestration-Mode', 'secure');
        }

        // Claude Desktop specific headers
        const userAgent = res.req?.get('User-Agent') || '';
        if (userAgent.includes('Claude Desktop') || userAgent.includes('Claude-Desktop')) {
            res.set('X-Claude-Desktop-Compatible', 'true');
            res.set('X-MCP-Version', '1.0');
        }
    }

    /**
     * Create dynamic CORS middleware that adapts to request region
     */
    createDynamicCORS() {
        return (req, res, next) => {
            // Determine region from request (set by region-aware router)
            const region = req.region?.region || 'us-west1';
            
            // Get appropriate CORS middleware
            const corsMiddleware = this.getCORSMiddleware(region);
            
            // Apply middleware
            corsMiddleware(req, res, next);
        };
    }

    /**
     * Handle preflight requests
     */
    handlePreflight() {
        return (req, res, next) => {
            if (req.method === 'OPTIONS') {
                const region = req.region?.region || 'us-west1';
                const regionConfig = this.config.regions[region];
                
                // Set preflight headers
                res.set('Access-Control-Max-Age', regionConfig.maxAge.toString());
                res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,HEAD');
                res.set('Access-Control-Allow-Headers', this.getAllowedHeaders(regionConfig).join(','));
                
                if (regionConfig.credentials) {
                    res.set('Access-Control-Allow-Credentials', 'true');
                }

                // Add security headers
                this.addSecurityHeaders(res, region);
                
                console.log(`[CORS] Preflight request handled for region: ${region}`);
                return res.status(204).end();
            }
            next();
        };
    }

    /**
     * Get CORS policy information
     */
    getPolicyInfo(region = 'us-west1') {
        const regionConfig = this.config.regions[region];
        if (!regionConfig) {
            return null;
        }

        return {
            region,
            allowedOrigins: regionConfig.allowedOrigins,
            credentials: regionConfig.credentials,
            maxAge: regionConfig.maxAge,
            allowedHeaders: this.getAllowedHeaders(regionConfig),
            exposedHeaders: this.getExposedHeaders(regionConfig),
            securityHeaders: this.config.securityHeaders
        };
    }

    /**
     * Clear CORS cache
     */
    clearCache() {
        this.corsCache.clear();
        console.log('[CORS] Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.corsCache.size,
            entries: Array.from(this.corsCache.entries()).map(([key, value]) => ({
                key,
                allowed: value.allowed,
                age: Date.now() - value.timestamp
            }))
        };
    }
}

module.exports = CORSPolicyManager;
