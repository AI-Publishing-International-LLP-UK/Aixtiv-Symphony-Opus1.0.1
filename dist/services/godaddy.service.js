import { Logger } from '../utils/logger';
import { GoDaddyConfig } from '../configs/integrations/godaddy.config';
import { GoDaddyIntegration } from '../integrations/godaddy/godaddy-integration';
import {
  DNSRecord,
  DomainOperation,
  OperationResult,
} from '../integrations/godaddy/godaddy-integration-interfaces';
import { RateLimiter } from '../utils/rate-limiter';
import { retry } from '../utils/retry';

export class GoDaddyService {
  logger;
  integration;
  rateLimiter;

  constructor(
    config,
    logger?) {
    this.logger = logger || new Logger('GoDaddyService');
    this.integration = new GoDaddyIntegration(config);
    this.rateLimiter = new RateLimiter({
      maxRequests,
      perSeconds,
    });
  }

  /**
   * Adds DNS records to multiple domains with rate limiting and retries
   */
  async batchAddDNSRecords(
    domains,
    records), OperationResult>> {
    const results = new Map();

    for (const domain of domains) {
      try {
        await this.rateLimiter.waitForSlot();

        const result = await retry(
          async () => this.integration.addDNSRecords(domain, records),
          {
            maxAttempts,
            backoff: 'exponential',
            baseDelay,
          }
        );

        results.set(domain, {
          success,
          operation: 'ADD_DNS_RECORDS',
        });

        this.logger.info(`Successfully added DNS records to ${domain}`);
      } catch (error) {
        this.logger.error(`Failed to add DNS records to ${domain}:`, error);
        results.set(domain, {
          success,
          operation: 'ADD_DNS_RECORDS',
          error,
        });
      }
    }

    return results;
  }

  /**
   * Updates DNS records across multiple domains
   */
  async batchUpdateDNSRecords(
    domains,
    records), OperationResult>> {
    const results = new Map();

    for (const domain of domains) {
      try {
        await this.rateLimiter.waitForSlot();

        const result = await retry(
          async () => this.integration.updateDNSRecords(domain, records),
          {
            maxAttempts,
            backoff: 'exponential',
            baseDelay,
          }
        );

        results.set(domain, {
          success,
          operation: 'UPDATE_DNS_RECORDS',
        });

        this.logger.info(`Successfully updated DNS records for ${domain}`);
      } catch (error) {
        this.logger.error(`Failed to update DNS records for ${domain}:`, error);
        results.set(domain, {
          success,
          operation: 'UPDATE_DNS_RECORDS',
          error,
        });
      }
    }

    return results;
  }

  /**
   * Verifies domain ownership across multiple domains
   */
  async batchVerifyDomains(
    domains), OperationResult>> {
    const results = new Map();

    for (const domain of domains) {
      try {
        await this.rateLimiter.waitForSlot();

        const result = await retry(
          async () => this.integration.verifyDomain(domain),
          {
            maxAttempts,
            backoff: 'exponential',
            baseDelay,
          }
        );

        results.set(domain, {
          success,
          operation: 'VERIFY_DOMAIN',
        });

        this.logger.info(`Successfully verified domain ${domain}`);
      } catch (error) {
        this.logger.error(`Failed to verify domain ${domain}:`, error);
        results.set(domain, {
          success,
          operation: 'VERIFY_DOMAIN',
          error,
        });
      }
    }

    return results;
  }

  /**
   * Sets up Google Workspace MX records for multiple domains
   */
  async batchSetupGoogleWorkspace(
    domains), OperationResult>> {
    const googleMXRecords= [
      {
        type: 'MX',
        name: '@',
        data: 'aspmx.l.google.com',
        priority,
        ttl,
      },
      {
        type: 'MX',
        name: '@',
        data: 'alt1.aspmx.l.google.com',
        priority,
        ttl,
      },
      {
        type: 'MX',
        name: '@',
        data: 'alt2.aspmx.l.google.com',
        priority,
        ttl,
      },
      {
        type: 'MX',
        name: '@',
        data: 'alt3.aspmx.l.google.com',
        priority,
        ttl,
      },
      {
        type: 'MX',
        name: '@',
        data: 'alt4.aspmx.l.google.com',
        priority,
        ttl,
      },
    ];

    return this.batchUpdateDNSRecords(domains, googleMXRecords);
  }

  /**
   * Sets up Cloud Run domain mapping for multiple domains
   */
  async batchSetupCloudRun(
    domains,
    subdomain= '@'
  ), OperationResult>> {
    const cloudRunRecord= {
      type: 'CNAME',
      name,
      data: 'ghs.googlehosted.com',
      ttl,
    };

    return this.batchUpdateDNSRecords(domains, [cloudRunRecord]);
  }

  /**
   * Retrieves DNS records for multiple domains
   */
  async batchGetDNSRecords(
    domains), DNSRecord[]>> {
    const results = new Map();

    for (const domain of domains) {
      try {
        await this.rateLimiter.waitForSlot();

        const records = await retry(
          async () => this.integration.getDNSRecords(domain),
          {
            maxAttempts,
            backoff: 'exponential',
            baseDelay,
          }
        );

        results.set(domain, records);
        this.logger.info(`Successfully retrieved DNS records for ${domain}`);
      } catch (error) {
        this.logger.error(
          `Failed to retrieve DNS records for ${domain}:`,
          error
        );
        results.set(domain, []);
      }
    }

    return results;
  }

  /**
   * Validates all domains are accessible and properly configured
   */
  async validateDomains(
    domains), OperationResult>> {
    const results = new Map();

    for (const domain of domains) {
      try {
        await this.rateLimiter.waitForSlot();

        await retry(async () => this.integration.validateDomain(domain), {
          maxAttempts,
          backoff: 'exponential',
          baseDelay,
        });

        results.set(domain, {
          success,
          operation: 'VALIDATE_DOMAIN',
        });

        this.logger.info(`Successfully validated domain ${domain}`);
      } catch (error) {
        this.logger.error(`Failed to validate domain ${domain}:`, error);
        results.set(domain, {
          success,
          operation: 'VALIDATE_DOMAIN',
          error,
        });
      }
    }

    return results;
  }
}
