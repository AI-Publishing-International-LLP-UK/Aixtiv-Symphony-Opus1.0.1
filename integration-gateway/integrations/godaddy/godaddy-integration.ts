import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { retry } from '@lifeomic/attempt';
import { RateLimiter } from 'limiter';
import {
    GoDaddyConfig,
    DNSRecord,
    DNSRecordType,
    DNSUpdateResponse,
    BatchOperationResult,
    GoDaddyError
} from './godaddy-integration-interfaces';

export class GoDaddyIntegration {
    private readonly client: AxiosInstance;
    private readonly limiter: RateLimiter;
    private readonly config: GoDaddyConfig;
    private readonly BASE_URL = 'https://api.godaddy.com/v1';

    constructor(config: GoDaddyConfig) {
        this.config = config;
        this.client = axios.create({
            baseURL: this.BASE_URL,
            headers: {
                'Authorization': `sso-key ${config.apiKey}:${config.apiSecret}`,
                'Content-Type': 'application/json'
            }
        });

        // Initialize rate limiter: 50 requests per minute as per GoDaddy's limits
        this.limiter = new RateLimiter({
            tokensPerInterval: 50,
            interval: 'minute'
        });
    }

    /**
     * Executes an API request with retry logic and rate limiting
     */
    private async executeRequest<T>(
        operation: () => Promise<AxiosResponse<T>>
    ): Promise<T> {
        await this.limiter.removeTokens(1);

        try {
            const response = await retry(
                async () => {
                    try {
                        const result = await operation();
                        return result;
                    } catch (error) {
                        if (axios.isAxiosError(error) && error.response?.status === 429) {
                            throw error; // Retry on rate limit
                        }
                        throw new Error(`GoDaddy API Error: ${error.message}`);
                    }
                },
                {
                    maxAttempts: 3,
                    delay: 2000,
                    factor: 2
                }
            );

            return response.data;
        } catch (error) {
            throw new GoDaddyError(
                `Failed to execute GoDaddy API request: ${error.message}`,
                error.response?.status
            );
        }
    }

    /**
     * Get DNS records for a domain
     */
    async getDNSRecords(domain: string, recordType?: DNSRecordType): Promise<DNSRecord[]> {
        const endpoint = `/domains/${domain}/records${recordType ? `/${recordType}` : ''}`;
        return this.executeRequest<DNSRecord[]>(() =>
            this.client.get(endpoint)
        );
    }

    /**
     * Add or update DNS records for a domain
     */
    async updateDNSRecords(
        domain: string,
        records: DNSRecord[],
        recordType?: DNSRecordType
    ): Promise<DNSUpdateResponse> {
        const endpoint = `/domains/${domain}/records${recordType ? `/${recordType}` : ''}`;
        return this.executeRequest<DNSUpdateResponse>(() =>
            this.client.put(endpoint, records)
        );
    }

    /**
     * Delete DNS records for a domain
     */
    async deleteDNSRecords(
        domain: string,
        recordType: DNSRecordType,
        name: string
    ): Promise<void> {
        const endpoint = `/domains/${domain}/records/${recordType}/${name}`;
        await this.executeRequest(() =>
            this.client.delete(endpoint)
        );
    }

    /**
     * Batch update DNS records across multiple domains
     */
    async batchUpdateDNSRecords(
        operations: Array<{
            domain: string;
            records: DNSRecord[];
        }>
    ): Promise<BatchOperationResult[]> {
        const results: BatchOperationResult[] = [];

        for (const operation of operations) {
            try {
                const result = await this.updateDNSRecords(
                    operation.domain,
                    operation.records
                );
                results.push({
                    domain: operation.domain,
                    success: true,
                    result
                });
            } catch (error) {
                results.push({
                    domain: operation.domain,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Add a single DNS record
     */
    async addDNSRecord(
        domain: string,
        record: DNSRecord
    ): Promise<DNSUpdateResponse> {
        return this.updateDNSRecords(domain, [record], record.type);
    }

    /**
     * Update an existing DNS record
     */
    async updateDNSRecord(
        domain: string,
        record: DNSRecord
    ): Promise<DNSUpdateResponse> {
        const existingRecords = await this.getDNSRecords(
            domain,
            record.type
        );

        const updatedRecords = existingRecords.map(existing =>
            existing.name === record.name ? record : existing
        );

        return this.updateDNSRecords(domain, updatedRecords, record.type);
    }

    /**
     * Verify domain ownership using TXT record
     */
    async addVerificationTXTRecord(
        domain: string,
        verificationCode: string,
        recordName: string = '@'
    ): Promise<DNSUpdateResponse> {
        const record: DNSRecord = {
            type: DNSRecordType.TXT,
            name: recordName,
            data: verificationCode,
            ttl: 600
        };

        return this.addDNSRecord(domain, record);
    }

    /**
     * Set up Cloud Run domain mapping
     */
    async setupCloudRunDomainMapping(
        domain: string,
        subdomain: string
    ): Promise<DNSUpdateResponse> {
        const record: DNSRecord = {
            type: DNSRecordType.CNAME,
            name: subdomain,
            data: 'ghs.googlehosted.com',
            ttl: 3600
        };

        return this.addDNSRecord(domain, record);
    }
}

