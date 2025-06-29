"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
            maxRequests: 500,
            perSeconds: 60,
        });
    }
    /**
     * Adds DNS records to multiple domains with rate limiting and retries
     */
    batchAddDNSRecords(domains, records) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = new Map();
            for (const domain of domains) {
                try {
                    yield this.rateLimiter.waitForSlot();
                    const result = yield (0, retry_1.retry)(() => __awaiter(this, void 0, void 0, function* () { return this.integration.addDNSRecords(domain, records); }), {
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
        });
    }
    /**
     * Updates DNS records across multiple domains
     */
    batchUpdateDNSRecords(domains, records) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = new Map();
            for (const domain of domains) {
                try {
                    yield this.rateLimiter.waitForSlot();
                    const result = yield (0, retry_1.retry)(() => __awaiter(this, void 0, void 0, function* () { return this.integration.updateDNSRecords(domain, records); }), {
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
        });
    }
    /**
     * Verifies domain ownership across multiple domains
     */
    batchVerifyDomains(domains) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = new Map();
            for (const domain of domains) {
                try {
                    yield this.rateLimiter.waitForSlot();
                    const result = yield (0, retry_1.retry)(() => __awaiter(this, void 0, void 0, function* () { return this.integration.verifyDomain(domain); }), {
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
        });
    }
    /**
     * Sets up Google Workspace MX records for multiple domains
     */
    batchSetupGoogleWorkspace(domains) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    /**
     * Sets up Cloud Run domain mapping for multiple domains
     */
    batchSetupCloudRun(domains_1) {
        return __awaiter(this, arguments, void 0, function* (domains, subdomain = '@') {
            const cloudRunRecord = {
                type: 'CNAME',
                name: subdomain,
                data: 'ghs.googlehosted.com',
                ttl: 3600,
            };
            return this.batchUpdateDNSRecords(domains, [cloudRunRecord]);
        });
    }
    /**
     * Retrieves DNS records for multiple domains
     */
    batchGetDNSRecords(domains) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = new Map();
            for (const domain of domains) {
                try {
                    yield this.rateLimiter.waitForSlot();
                    const records = yield (0, retry_1.retry)(() => __awaiter(this, void 0, void 0, function* () { return this.integration.getDNSRecords(domain); }), {
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
        });
    }
    /**
     * Validates all domains are accessible and properly configured
     */
    validateDomains(domains) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = new Map();
            for (const domain of domains) {
                try {
                    yield this.rateLimiter.waitForSlot();
                    yield (0, retry_1.retry)(() => __awaiter(this, void 0, void 0, function* () { return this.integration.validateDomain(domain); }), {
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
        });
    }
}
    /**
     * Lists all domains with pagination support
     */
    listAllDomains(options = { pageSize: 500 }) {
        return __awaiter(this, void 0, void 0, function* () {
            const allDomains = [];
            let offset = 0;
            let hasMore = true;

            while (hasMore) {
                try {
                    yield this.rateLimiter.waitForSlot();
                    const domains = yield (0, retry_1.retry)(() => __awaiter(this, void 0, void 0, function* () {
                        return this.integration.listDomains({
                            limit: options.pageSize,
                            offset: offset,
                        });
                    }), {
                        maxAttempts: 3,
                        backoff: 'exponential',
                        baseDelay: 1000,
                    });

                    if (domains && domains.length > 0) {
                        allDomains.push(...domains);
                        offset += domains.length;
                    } else {
                        hasMore = false;
                    }

                    // If we got less than pageSize, we've reached the end
                    if (domains.length < options.pageSize) {
                        hasMore = false;
                    }

                    this.logger.info(`Retrieved ${domains.length} domains, total: ${allDomains.length}`);
                } catch (error) {
                    this.logger.error('Failed to retrieve domains:', error);
                    throw error;
                }
            }

            return allDomains;
        });
    }
