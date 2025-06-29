"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoDaddyIntegration = void 0;
const axios_1 = require("axios");
const attempt_1 = require("@lifeomic/attempt");
const limiter_1 = require("limiter");
const godaddy_integration_interfaces_1 = require("./godaddy-integration-interfaces");
class GoDaddyIntegration {
    constructor(config) {
        this.BASE_URL = 'https://api.godaddy.com/v1';
        this.config = config;
        this.client = axios_1.default.create({
            baseURL: this.BASE_URL,
            headers: {
                Authorization: `sso-key ${config.apiKey}:${config.apiSecret}`,
                'Content-Type': 'application/json',
            },
        });
        // Initialize rate limiter: 50 requests per minute as per GoDaddy's limits
        this.limiter = new limiter_1.RateLimiter({
            tokensPerInterval: 50,
            interval: 'minute',
        });
    }
    /**
     * Executes an API request with retry logic and rate limiting
     */
    async executeRequest(operation) {
        var _a;
        await this.limiter.removeTokens(1);
        try {
            const response = await (0, attempt_1.retry)(async () => {
                var _a;
                try {
                    const result = await operation();
                    return result;
                }
                catch (error) {
                    if (axios_1.default.isAxiosError(error) && ((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 429) {
                        throw error; // Retry on rate limit
                    }
                    throw new Error(`GoDaddy API Error: ${error.message}`);
                }
            }, {
                maxAttempts: 3,
                delay: 2000,
                factor: 2,
            });
            return response.data;
        }
        catch (error) {
            throw new godaddy_integration_interfaces_1.GoDaddyError(`Failed to execute GoDaddy API request: ${error.message}`, (_a = error.response) === null || _a === void 0 ? void 0 : _a.status);
        }
    }
    /**
     * Get DNS records for a domain
     */
    async getDNSRecords(domain, recordType) {
        const endpoint = `/domains/${domain}/records${recordType ? `/${recordType}` : ''}`;
        return this.executeRequest(() => this.client.get(endpoint));
    }
    /**
     * Add or update DNS records for a domain
     */
    async updateDNSRecords(domain, records, recordType) {
        const endpoint = `/domains/${domain}/records${recordType ? `/${recordType}` : ''}`;
        return this.executeRequest(() => this.client.put(endpoint, records));
    }
    /**
     * Delete DNS records for a domain
     */
    async deleteDNSRecords(domain, recordType, name) {
        const endpoint = `/domains/${domain}/records/${recordType}/${name}`;
        await this.executeRequest(() => this.client.delete(endpoint));
    }
    /**
     * Batch update DNS records across multiple domains
     */
    async batchUpdateDNSRecords(operations) {
        const results = [];
        for (const operation of operations) {
            try {
                const result = await this.updateDNSRecords(operation.domain, operation.records);
                results.push({
                    domain: operation.domain,
                    success: true,
                    result,
                });
            }
            catch (error) {
                results.push({
                    domain: operation.domain,
                    success: false,
                    error: error.message,
                });
            }
        }
        return results;
    }
    /**
     * Add a single DNS record
     */
    async addDNSRecord(domain, record) {
        return this.updateDNSRecords(domain, [record], record.type);
    }
    /**
     * Update an existing DNS record
     */
    async updateDNSRecord(domain, record) {
        const existingRecords = await this.getDNSRecords(domain, record.type);
        const updatedRecords = existingRecords.map(existing => existing.name === record.name ? record : existing);
        return this.updateDNSRecords(domain, updatedRecords, record.type);
    }
    /**
     * Verify domain ownership using TXT record
     */
    async addVerificationTXTRecord(domain, verificationCode, recordName = '@') {
        const record = {
            type: godaddy_integration_interfaces_1.DNSRecordType.TXT,
            name: recordName,
            data: verificationCode,
            ttl: 600,
        };
        return this.addDNSRecord(domain, record);
    }
    /**
     * Set up Cloud Run domain mapping
     */
    async setupCloudRunDomainMapping(domain, subdomain) {
        const record = {
            type: godaddy_integration_interfaces_1.DNSRecordType.CNAME,
            name: subdomain,
            data: 'ghs.googlehosted.com',
            ttl: 3600,
        };
        return this.addDNSRecord(domain, record);
    }
}
exports.GoDaddyIntegration = GoDaddyIntegration;
//# sourceMappingURL=godaddy-integration.js.map