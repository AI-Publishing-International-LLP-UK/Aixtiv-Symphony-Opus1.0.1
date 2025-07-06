/**
 * Region-Aware Router for ASOOS Integration Gateway
 * 
 * Implements intelligent routing based on geographic regions,
 * ensuring optimal performance and compliance with regional requirements.
 * 
 * Supports regions: us-west1 (primary), eu-west1 (GDPR), us-central1 (orchestration)
 */

const express = require('express');
const geoip = require('geoip-lite');
const { promisify } = require('util');
const dns = require('dns');
const lookupAsync = promisify(dns.lookup);

class RegionAwareRouter {
    constructor(config = {}) {
        this.config = {
            primaryRegion: 'us-west1',
            regions: {
                'us-west1': {
                    name: 'US West (Primary)',
                    location: 'Oregon',
                    endpoints: {
                        mcp: 'https://integration-gateway-mcp-yutylytffa-uw.a.run.app',
                        api: 'https://api-us-west1.aixtiv.io',
                        auth: 'https://auth-us-west1.aixtiv.io'
                    },
                    compliance: ['CCPA', 'SOC2'],
                    latencyTarget: 50 // ms
                },
                'eu-west1': {
                    name: 'EU West (GDPR)',
                    location: 'Belgium',
                    endpoints: {
                        mcp: 'https://integration-gateway-mcp-eu-west1.a.run.app',
                        api: 'https://api-eu-west1.aixtiv.io',
                        auth: 'https://auth-eu-west1.aixtiv.io'
                    },
                    compliance: ['GDPR', 'SOC2'],
                    latencyTarget: 75 // ms
                },
                'us-central1': {
                    name: 'US Central (Orchestration)',
                    location: 'Iowa', 
                    endpoints: {
                        orchestrator: 'https://orchestrator-us-central1.aixtiv.io',
                        api: 'https://api-us-central1.aixtiv.io',
                        auth: 'https://auth-us-central1.aixtiv.io'
                    },
                    compliance: ['SOC2', 'FISMA'],
                    latencyTarget: 60 // ms
                }
            },
            fallbackChain: ['us-west1', 'us-central1', 'eu-west1'],
            allowedOrigins: [
                'https://claude.ai',
                'https://app.claude.ai',
                'https://desktop.claude.ai',
                'https://2100.cool',
                'https://*.2100.cool',
                'https://aixtiv.io',
                'https://*.aixtiv.io'
            ],
            ...config
        };
        
        this.router = express.Router();
        this.healthCache = new Map();
        this.latencyCache = new Map();
        this.setupRoutes();
    }

    /**
     * Determine optimal region for a request
     */
    async determineRegion(req) {
        const clientIP = this.getClientIP(req);
        const origin = req.get('Origin') || req.get('Referer');
        const userAgent = req.get('User-Agent') || '';
        
        // Check for explicit region preference in headers
        const preferredRegion = req.get('X-Preferred-Region');
        if (preferredRegion && this.config.regions[preferredRegion]) {
            return {
                region: preferredRegion,
                reason: 'explicit_preference',
                source: 'header'
            };
        }

        // Geographic determination
        const geoInfo = geoip.lookup(clientIP);
        let suggestedRegion = this.config.primaryRegion;
        
        if (geoInfo) {
            // EU region for European traffic (GDPR compliance)
            if (this.isEUCountry(geoInfo.country)) {
                suggestedRegion = 'eu-west1';
            }
            // US Central for specific use cases
            else if (this.isOrchestrationWorkload(req, userAgent)) {
                suggestedRegion = 'us-central1';
            }
            // Default to US West for Americas and others
            else {
                suggestedRegion = 'us-west1';
            }
        }

        // Claude.ai desktop application routing
        if (this.isClaudeDesktop(userAgent, origin)) {
            return await this.routeClaudeDesktop(req, geoInfo);
        }

        // Check region health and latency
        const healthyRegion = await this.findHealthyRegion(suggestedRegion, req);
        
        return {
            region: healthyRegion,
            reason: 'geographic_optimal',
            source: 'geoip',
            fallback: healthyRegion !== suggestedRegion
        };
    }

    /**
     * Claude Desktop specific routing logic
     */
    async routeClaudeDesktop(req, geoInfo) {
        const regions = [];
        
        // EU users must use EU region for GDPR compliance
        if (geoInfo && this.isEUCountry(geoInfo.country)) {
            regions.push('eu-west1');
            regions.push('us-west1'); // Fallback
        } else {
            // Non-EU users prefer US regions
            regions.push('us-west1');
            regions.push('us-central1');
            regions.push('eu-west1'); // Last resort
        }

        // Find first healthy region
        for (const region of regions) {
            const health = await this.checkRegionHealth(region);
            if (health.healthy) {
                return {
                    region,
                    reason: 'claude_desktop_optimal',
                    source: 'application_specific',
                    compliance: this.config.regions[region].compliance
                };
            }
        }

        // Emergency fallback
        return {
            region: this.config.primaryRegion,
            reason: 'emergency_fallback',
            source: 'health_check_failure'
        };
    }

    /**
     * Find healthy region with lowest latency
     */
    async findHealthyRegion(preferredRegion, req) {
        // Check preferred region first
        const preferredHealth = await this.checkRegionHealth(preferredRegion);
        if (preferredHealth.healthy && preferredHealth.latency < this.config.regions[preferredRegion].latencyTarget * 2) {
            return preferredRegion;
        }

        // Check fallback chain
        for (const region of this.config.fallbackChain) {
            if (region === preferredRegion) continue;
            
            const health = await this.checkRegionHealth(region);
            if (health.healthy) {
                return region;
            }
        }

        // Return primary region as last resort
        return this.config.primaryRegion;
    }

    /**
     * Check region health and latency
     */
    async checkRegionHealth(region) {
        const cacheKey = `health_${region}`;
        const cached = this.healthCache.get(cacheKey);
        
        // Use cached result if fresh (30 seconds)
        if (cached && Date.now() - cached.timestamp < 30000) {
            return cached.data;
        }

        try {
            const regionConfig = this.config.regions[region];
            const endpoint = regionConfig.endpoints.mcp || regionConfig.endpoints.api;
            
            const startTime = Date.now();
            const response = await fetch(`${endpoint}/health`, {
                method: 'GET',
                timeout: 5000,
                headers: {
                    'User-Agent': 'ASOOS-Integration-Gateway/1.0'
                }
            });
            
            const latency = Date.now() - startTime;
            const healthy = response.ok && latency < regionConfig.latencyTarget * 3;
            
            const result = {
                healthy,
                latency,
                status: response.status,
                region,
                timestamp: Date.now()
            };

            // Cache result
            this.healthCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            return result;
        } catch (error) {
            const result = {
                healthy: false,
                latency: 999999,
                error: error.message,
                region,
                timestamp: Date.now()
            };

            this.healthCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            return result;
        }
    }

    /**
     * Setup routing middleware
     */
    setupRoutes() {
        // Region determination middleware
        this.router.use(async (req, res, next) => {
            try {
                const routing = await this.determineRegion(req);
                req.region = routing;
                req.endpoints = this.config.regions[routing.region].endpoints;
                
                // Add region headers for debugging
                res.set({
                    'X-Routed-Region': routing.region,
                    'X-Routing-Reason': routing.reason,
                    'X-Region-Source': routing.source
                });

                // Log routing decision
                console.log(`[RegionRouter] ${req.method} ${req.path} -> ${routing.region} (${routing.reason})`);
                
                next();
            } catch (error) {
                console.error('[RegionRouter] Error determining region:', error);
                // Fallback to primary region
                req.region = {
                    region: this.config.primaryRegion,
                    reason: 'error_fallback',
                    source: 'error_handler'
                };
                req.endpoints = this.config.regions[this.config.primaryRegion].endpoints;
                next();
            }
        });

        // Health check endpoint
        this.router.get('/health', async (req, res) => {
            const healthChecks = {};
            
            for (const [region, config] of Object.entries(this.config.regions)) {
                healthChecks[region] = await this.checkRegionHealth(region);
            }

            res.json({
                status: 'ok',
                router: 'region-aware',
                regions: healthChecks,
                timestamp: new Date().toISOString()
            });
        });

        // Region info endpoint
        this.router.get('/region-info', (req, res) => {
            res.json({
                current: req.region,
                available: Object.keys(this.config.regions),
                endpoints: req.endpoints,
                compliance: this.config.regions[req.region.region].compliance
            });
        });
    }

    /**
     * Utility methods
     */
    getClientIP(req) {
        return req.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
               req.get('X-Real-IP') ||
               req.connection?.remoteAddress ||
               req.socket?.remoteAddress ||
               '127.0.0.1';
    }

    isEUCountry(countryCode) {
        const euCountries = [
            'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI',
            'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT',
            'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'
        ];
        return euCountries.includes(countryCode);
    }

    isClaudeDesktop(userAgent, origin) {
        return userAgent.includes('Claude Desktop') ||
               userAgent.includes('Claude-Desktop') ||
               origin?.includes('claude.ai') ||
               origin?.includes('app.claude.ai');
    }

    isOrchestrationWorkload(req, userAgent) {
        const orchestrationPaths = ['/orchestrate', '/agents', '/wing', '/squadron'];
        const hasOrchestrationPath = orchestrationPaths.some(path => req.path.includes(path));
        const isAgentRequest = userAgent.includes('Agent') || req.get('X-Agent-Type');
        
        return hasOrchestrationPath || isAgentRequest;
    }

    /**
     * Get the router instance
     */
    getRouter() {
        return this.router;
    }

    /**
     * Proxy request to determined region
     */
    async proxyToRegion(req, res, endpoint = 'api') {
        const targetUrl = req.endpoints[endpoint];
        if (!targetUrl) {
            return res.status(503).json({
                error: 'Service not available in region',
                region: req.region.region
            });
        }

        try {
            const proxyUrl = `${targetUrl}${req.path}`;
            console.log(`[RegionRouter] Proxying to: ${proxyUrl}`);
            
            // Implementation would include actual proxy logic here
            // For now, return the target information
            res.json({
                action: 'proxy',
                target: proxyUrl,
                region: req.region.region,
                endpoint
            });
        } catch (error) {
            console.error(`[RegionRouter] Proxy error:`, error);
            res.status(502).json({
                error: 'Proxy failed',
                region: req.region.region,
                message: error.message
            });
        }
    }
}

module.exports = RegionAwareRouter;
