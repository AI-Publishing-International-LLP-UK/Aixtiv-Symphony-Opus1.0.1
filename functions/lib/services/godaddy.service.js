"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoDaddyService = void 0;
const logger_1 = require("../utils/logger");
const godaddy_integration_1 = require("../integrations/godaddy/godaddy-integration");
const rate_limiter_1 = require("../utils/rate-limiter");
const retry_1 = require("../utils/retry");
class GoDaddyService {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger || new logger_1.Logger('GoDaddyService');
        this.integration = new godaddy_integration_1.GoDaddyIntegration(config);
        this.rateLimiter = new rate_limiter_1.RateLimiter({
            maxRequests: 50,
            perSeconds: 60,
        });
    }
    /**
     * Adds DNS records to multiple domains with rate limiting and retries
     */
    async batchAddDNSRecords(domains, records) {
        const results = new Map();
        for (const domain of domains) {
            try {
                await this.rateLimiter.waitForSlot();
                const result = await (0, retry_1.retry)(async () => this.integration.addDNSRecords(domain, records), {
                    maxAttempts: 3,
                    backoff: 'exponential',
                    baseDelay: 1000,
                });
                results.set(domain, {
                    success: true,
                    domain,
                    operation: 'ADD_DNS_RECORDS',
                });
                this.logger.info(`Successfully added DNS records to ${domain}`);
            }
            catch (error) {
                this.logger.error(`Failed to add DNS records to ${domain}:`, error);
                results.set(domain, {
                    success: false,
                    domain,
                    operation: 'ADD_DNS_RECORDS',
                    error: error.message,
                });
            }
        }
        return results;
    }
    /**
     * Updates DNS records across multiple domains
     */
    async batchUpdateDNSRecords(domains, records) {
        const results = new Map();
        for (const domain of domains) {
            try {
                await this.rateLimiter.waitForSlot();
                const result = await (0, retry_1.retry)(async () => this.integration.updateDNSRecords(domain, records), {
                    maxAttempts: 3,
                    backoff: 'exponential',
                    baseDelay: 1000,
                });
                results.set(domain, {
                    success: true,
                    domain,
                    operation: 'UPDATE_DNS_RECORDS',
                });
                this.logger.info(`Successfully updated DNS records for ${domain}`);
            }
            catch (error) {
                this.logger.error(`Failed to update DNS records for ${domain}:`, error);
                results.set(domain, {
                    success: false,
                    domain,
                    operation: 'UPDATE_DNS_RECORDS',
                    error: error.message,
                });
            }
        }
        return results;
    }
    /**
     * Verifies domain ownership across multiple domains
     */
    async batchVerifyDomains(domains) {
        const results = new Map();
        for (const domain of domains) {
            try {
                await this.rateLimiter.waitForSlot();
                const result = await (0, retry_1.retry)(async () => this.integration.verifyDomain(domain), {
                    maxAttempts: 3,
                    backoff: 'exponential',
                    baseDelay: 1000,
                });
                results.set(domain, {
                    success: true,
                    domain,
                    operation: 'VERIFY_DOMAIN',
                });
                this.logger.info(`Successfully verified domain ${domain}`);
            }
            catch (error) {
                this.logger.error(`Failed to verify domain ${domain}:`, error);
                results.set(domain, {
                    success: false,
                    domain,
                    operation: 'VERIFY_DOMAIN',
                    error: error.message,
                });
            }
        }
        return results;
    }
    /**
     * Sets up Google Workspace MX records for multiple domains
     */
    async batchSetupGoogleWorkspace(domains) {
        const googleMXRecords = [
            {
                type: 'MX',
                name: '@',
                data: 'aspmx.l.google.com',
                priority: 1,
                ttl: 3600,
            },
            {
                type: 'MX',
                name: '@',
                data: 'alt1.aspmx.l.google.com',
                priority: 5,
                ttl: 3600,
            },
            {
                type: 'MX',
                name: '@',
                data: 'alt2.aspmx.l.google.com',
                priority: 5,
                ttl: 3600,
            },
            {
                type: 'MX',
                name: '@',
                data: 'alt3.aspmx.l.google.com',
                priority: 10,
                ttl: 3600,
            },
            {
                type: 'MX',
                name: '@',
                data: 'alt4.aspmx.l.google.com',
                priority: 10,
                ttl: 3600,
            },
        ];
        return this.batchUpdateDNSRecords(domains, googleMXRecords);
    }
    /**
     * Sets up Cloud Run domain mapping for multiple domains
     */
    async batchSetupCloudRun(domains, subdomain = '@') {
        const cloudRunRecord = {
            type: 'CNAME',
            name: subdomain,
            data: 'ghs.googlehosted.com',
            ttl: 3600,
        };
        return this.batchUpdateDNSRecords(domains, [cloudRunRecord]);
    }
    /**
     * Retrieves DNS records for multiple domains
     */
    async batchGetDNSRecords(domains) {
        const results = new Map();
        for (const domain of domains) {
            try {
                await this.rateLimiter.waitForSlot();
                const records = await (0, retry_1.retry)(async () => this.integration.getDNSRecords(domain), {
                    maxAttempts: 3,
                    backoff: 'exponential',
                    baseDelay: 1000,
                });
                results.set(domain, records);
                this.logger.info(`Successfully retrieved DNS records for ${domain}`);
            }
            catch (error) {
                this.logger.error(`Failed to retrieve DNS records for ${domain}:`, error);
                results.set(domain, []);
            }
        }
        return results;
    }
    /**
     * Validates all domains are accessible and properly configured
     */
    async validateDomains(domains) {
        const results = new Map();
        for (const domain of domains) {
            try {
                await this.rateLimiter.waitForSlot();
                await (0, retry_1.retry)(async () => this.integration.validateDomain(domain), {
                    maxAttempts: 3,
                    backoff: 'exponential',
                    baseDelay: 1000,
                });
                results.set(domain, {
                    success: true,
                    domain,
                    operation: 'VALIDATE_DOMAIN',
                });
                this.logger.info(`Successfully validated domain ${domain}`);
            }
            catch (error) {
                this.logger.error(`Failed to validate domain ${domain}:`, error);
                results.set(domain, {
                    success: false,
                    domain,
                    operation: 'VALIDATE_DOMAIN',
                    error: error.message,
                });
            }
        }
        return results;
    }
}
exports.GoDaddyService = GoDaddyService;
//# sourceMappingURL=godaddy.service.js.map