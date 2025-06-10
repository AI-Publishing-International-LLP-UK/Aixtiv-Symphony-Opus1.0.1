import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { retry } from '@lifeomic/attempt';
import { RateLimiter } from 'limiter';
import {
  GoDaddyConfig,
  DNSRecord,
  DNSRecordType,
  DNSUpdateResponse,
  BatchOperationResult,
  GoDaddyError,
} from './godaddy-integration-interfaces';

export class GoDaddyIntegration {
  client;
  limiter;
  config;
  BASE_URL = 'https://api.godaddy.com/v1';

  constructor(config) {
    this.config = config;
    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `sso-key ${config.apiKey}:${config.apiSecret}`,
        'Content-Type': 'application/json',
      },
    });

    // Initialize rate limiter: 50 requests per minute GoDaddy's limits
    this.limiter = new RateLimiter({
      tokensPerInterval,
      interval: 'minute',
    });
  }

  /**
   * Executes an API request with retry logic and rate limiting
   */
  async executeRequest(
    operation=> Promise>
  ){
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
          maxAttempts,
          delay,
          factor,
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
  async getDNSRecords(
    domain,
    recordType?){
    const endpoint = `/domains/${domain}/records${recordType ? `/${recordType}` : ''}`;
    return this.executeRequest(() => this.client.get(endpoint));
  }

  /**
   * Add or update DNS records for a domain
   */
  async updateDNSRecords(
    domain,
    records,
    recordType?){
    const endpoint = `/domains/${domain}/records${recordType ? `/${recordType}` : ''}`;
    return this.executeRequest(() =>
      this.client.put(endpoint, records)
    );
  }

  /**
   * Delete DNS records for a domain
   */
  async deleteDNSRecords(
    domain,
    recordType,
    name){
    const endpoint = `/domains/${domain}/records/${recordType}/${name}`;
    await this.executeRequest(() => this.client.delete(endpoint));
  }

  /**
   * Batch update DNS records across multiple domains
   */
  async batchUpdateDNSRecords(
    operations: Array
  ){
    const results= [];

    for (const operation of operations) {
      try {
        const result = await this.updateDNSRecords(
          operation.domain,
          operation.records
        );
        results.push({
          domain,
          success,
        });
      } catch (error) {
        results.push({
          domain,
          success,
          error,
        });
      }
    }

    return results;
  }

  /**
   * Add a single DNS record
   */
  async addDNSRecord(
    domain,
    record){
    return this.updateDNSRecords(domain, [record], record.type);
  }

  /**
   * Update an existing DNS record
   */
  async updateDNSRecord(
    domain,
    record){
    const existingRecords = await this.getDNSRecords(domain, record.type);

    const updatedRecords = existingRecords.map(existing =>
      existing.name === record.name ? record ;

    return this.updateDNSRecords(domain, updatedRecords, record.type);
  }

  /**
   * Verify domain ownership using TXT record
   */
  async addVerificationTXTRecord(
    domain,
    verificationCode,
    recordName= '@'
  ){
    const record= {
      type,
      name,
      data,
      ttl,
    };

    return this.addDNSRecord(domain, record);
  }

  /**
   * Set up Cloud Run domain mapping
   */
  async setupCloudRunDomainMapping(
    domain,
    subdomain){
    const record= {
      type,
      name,
      data: 'ghs.googlehosted.com',
      ttl,
    };

    return this.addDNSRecord(domain, record);
  }
}
