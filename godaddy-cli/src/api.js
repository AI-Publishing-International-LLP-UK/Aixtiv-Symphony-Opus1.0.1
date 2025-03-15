import axios from 'axios';
import axiosRetry from 'axios-retry';
import rateLimit from 'axios-rate-limit';
import logger from './logger.js';

export class GodaddyAPI {
    constructor(config) {
        this.config = config;
        this.logger = logger;
        
        // Initialize axios with rate limiting and retries
        this.client = rateLimit(
            axios.create({
                baseURL: 'https://api.godaddy.com/v1',
                headers: {
                    'Authorization': `sso-key ${config.apiKey}:${config.apiSecret}`,
                    'Content-Type': 'application/json'
                }
            }),
            { maxRequests: 50, perMilliseconds: 60000 } // 50 requests per minute
        );

        // Configure automatic retries
        axiosRetry(this.client, {
            retries: 3,
            retryDelay: axiosRetry.exponentialDelay,
            retryCondition: (error) => {
                return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
                    error.response?.status === 429; // Rate limit exceeded
            }
        });
    }

    async handleApiError(error, operation) {
        const errorMessage = error.response?.data?.message || error.message;
        this.logger.error(`${operation} failed: ${errorMessage}`);
        
        if (error.response?.status === 401) {
            throw new Error('Invalid API credentials. Please check your API key and secret.');
        } else if (error.response?.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }
        
        throw new Error(`${operation} failed: ${errorMessage}`);
    }

    // DNS Record Management
    async getDNSRecords(domain, type = null, name = null) {
        try {
            const params = {};
            if (type) params.type = type;
            if (name) params.name = name;

            const response = await this.client.get(`/domains/${domain}/records`, { params });
            return response.data;
        } catch (error) {
            await this.handleApiError(error, 'Get DNS records');
        }
    }

    async updateDNSRecord(domain, record) {
        try {
            const { type, name, data, ttl = 3600 } = record;
            const response = await this.client.put(
                `/domains/${domain}/records/${type}/${name}`,
                [{ data, ttl }]
            );
            return response.data;
        } catch (error) {
            await this.handleApiError(error, 'Update DNS record');
        }
    }

    async addDNSRecord(domain, record) {
        try {
            const response = await this.client.patch(
                `/domains/${domain}/records`,
                [record]
            );
            return response.data;
        } catch (error) {
            await this.handleApiError(error, 'Add DNS record');
        }
    }

    async deleteDNSRecord(domain, type, name) {
        try {
            await this.client.delete(`/domains/${domain}/records/${type}/${name}`);
            return true;
        } catch (error) {
            await this.handleApiError(error, 'Delete DNS record');
        }
    }

    // Domain Management
    async listDomains(options = {}) {
        try {
            const params = {
                statuses: options.statuses,
                limit: options.limit || 100,
                marker: options.marker
            };

            const response = await this.client.get('/domains', { params });
            return response.data;
        } catch (error) {
            await this.handleApiError(error, 'List domains');
        }
    }

    async getDomainDetails(domain) {
        try {
            const response = await this.client.get(`/domains/${domain}`);
            return response.data;
        } catch (error) {
            await this.handleApiError(error, 'Get domain details');
        }
    }

    // Domain Verification
    async verifyDomain(domain) {
        try {
            const response = await this.client.get(`/domains/${domain}/verify`);
            return response.data;
        } catch (error) {
            await this.handleApiError(error, 'Verify domain');
        }
    }

    // Batch Operations
    async batchUpdateDNSRecords(domains, record) {
        const results = {
            successful: [],
            failed: []
        };

        for (const domain of domains) {
            try {
                await this.updateDNSRecord(domain, record);
                results.successful.push(domain);
            } catch (error) {
                results.failed.push({
                    domain,
                    error: error.message
                });
            }
        }

        return results;
    }

    // Certificate Management
    async getDomainCertificates(domain) {
        try {
            const response = await this.client.get(`/domains/${domain}/certificates`);
            return response.data;
        } catch (error) {
            await this.handleApiError(error, 'Get domain certificates');
        }
    }

    async purchaseCertificate(domain, certificateRequest) {
        try {
            const response = await this.client.post(
                `/domains/${domain}/certificates/purchase`,
                certificateRequest
            );
            return response.data;
        } catch (error) {
            await this.handleApiError(error, 'Purchase certificate');
        }
    }
}

