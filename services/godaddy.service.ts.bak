import { Logger } from '../utils/logger';
import { GoDaddyConfig } from '../configs/integrations/godaddy.config';
import { GoDaddyIntegration } from '../integrations/godaddy/godaddy-integration';
import { DNSRecord, DomainOperation, OperationResult } from '../integrations/godaddy/godaddy-integration-interfaces';
import { RateLimiter } from '../utils/rate-limiter';
import { retry } from '../utils/retry';

export class GoDaddyService {
    private readonly logger: Logger;
    private readonly integration: GoDaddyIntegration;
    private readonly rateLimiter: RateLimiter;

    constructor(
        private readonly config: GoDaddyConfig,
        logger?: Logger
    ) {
        this.logger = logger || new Logger('GoDaddyService');
        this.integration = new GoDaddyIntegration(config);
        this.rateLimiter = new RateLimiter({
            maxRequests: 50,
            perSeconds: 60,
        });
    }

    /**
     * Adds DNS records to multiple domains with rate limiting and retries
     */
    async batchAddDNSRecords(
        domains: string[],
        records: DNSRecord[],
    ): Promise<Map<string, OperationResult>> {
        const results = new Map<string, OperationResult>();
        
        for (const domain of domains) {
            try {
                await this.rateLimiter.waitForSlot();
                
                const result = await retry(
                    async () => this.integration.addDNSRecords(domain, records),
                    {
                        maxAttempts: 3,
                        backoff: 'exponential',
                        baseDelay: 1000,
                    }
                );
                
                results.set(domain, {
                    success: true,
                    domain,
                    operation: 'ADD_DNS_RECORDS',
                });
                
                this.logger.info(`Successfully added DNS records to ${domain}`);
            } catch (error) {
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
    async batchUpdateDNSRecords(
        domains: string[],
        records: DNSRecord[],
    ): Promise<Map<string, OperationResult>> {
        const results = new Map<string, OperationResult>();
        
        for (const domain of domains) {
            try {
                await this.rateLimiter.waitForSlot();
                
                const result = await retry(
                    async () => this.integration.updateDNSRecords(domain, records),
                    {
                        maxAttempts: 3,
                        backoff: 'exponential',
                        baseDelay: 1000,
                    }
                );
                
                results.set(domain, {
                    success: true,
                    domain,
                    operation: 'UPDATE_DNS_RECORDS',
                });
                
                this.logger.info(`Successfully updated DNS records for ${domain}`);
            } catch (error) {
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
    async batchVerifyDomains(
        domains: string[],
    ): Promise<Map<string, OperationResult>> {
        const results = new Map<string, OperationResult>();
        
        for (const domain of domains) {
            try {
                await this.rateLimiter.waitForSlot();
                
                const result = await retry(
                    async () => this.integration.verifyDomain(domain),
                    {
                        maxAttempts: 3,
                        backoff: 'exponential',
                        baseDelay: 1000,
                    }
                );
                
                results.set(domain, {
                    success: true,
                    domain,
                    operation: 'VERIFY_DOMAIN',
                });
                
                this.logger.info(`Successfully verified domain ${domain}`);
            } catch (error) {
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
    async batchSetupGoogleWorkspace(
        domains: string[],
    ): Promise<Map<string, OperationResult>> {
        const googleMXRecords: DNSRecord[] = [
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
    async batchSetupCloudRun(
        domains: string[],
        subdomain: string = '@',
    ): Promise<Map<string, OperationResult>> {
        const cloudRunRecord: DNSRecord = {
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
    async batchGetDNSRecords(
        domains: string[],
    ): Promise<Map<string, DNSRecord[]>> {
        const results = new Map<string, DNSRecord[]>();
        
        for (const domain of domains) {
            try {
                await this.rateLimiter.waitForSlot();
                
                const records = await retry(
                    async () => this.integration.getDNSRecords(domain),
                    {
                        maxAttempts: 3,
                        backoff: 'exponential',
                        baseDelay: 1000,
                    }
                );
                
                results.set(domain, records);
                this.logger.info(`Successfully retrieved DNS records for ${domain}`);
            } catch (error) {
                this.logger.error(`Failed to retrieve DNS records for ${domain}:`, error);
                results.set(domain, []);
            }
        }
        
        return results;
    }

    /**
     * Validates all domains are accessible and properly configured
     */
    async validateDomains(
        domains: string[],
    ): Promise<Map<string, OperationResult>> {
        const results = new Map<string, OperationResult>();
        
        for (const domain of domains) {
            try {
                await this.rateLimiter.waitForSlot();
                
                await retry(
                    async () => this.integration.validateDomain(domain),
                    {
                        maxAttempts: 3,
                        backoff: 'exponential',
                        baseDelay: 1000,
                    }
                );
                
                results.set(domain, {
                    success: true,
                    domain,
                    operation: 'VALIDATE_DOMAIN',
                });
                
                this.logger.info(`Successfully validated domain ${domain}`);
            } catch (error) {
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

