import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { GoDaddyIntegration } from './godaddy-integration';
import { GoDaddyConfig, DNSRecord, DNSRecordType, DomainUpdateResult } from './godaddy-integration-interfaces';

// Mock API responses
const mockDNSRecords: DNSRecord[] = [
  {
    type: DNSRecordType.A,
    name: 'test',
    data: '192.168.1.1',
    ttl: 3600
  },
  {
    type: DNSRecordType.CNAME,
    name: 'www',
    data: 'example.com',
    ttl: 3600
  }
];

const mockConfig: GoDaddyConfig = {
  apiKey: 'test-key',
  apiSecret: 'test-secret',
  baseUrl: 'https://api.godaddy.com/v1'
};

describe('GoDaddyIntegration', () => {
  let integration: GoDaddyIntegration;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    integration = new GoDaddyIntegration(mockConfig);
  });

  describe('DNS Record Management', () => {
    it('should retrieve DNS records for a domain', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDNSRecords)
      });

      const records = await integration.getDNSRecords('example.com');
      expect(records).toEqual(mockDNSRecords);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.godaddy.com/v1/domains/example.com/records',
        expect.any(Object)
      );
    });

    it('should add a new DNS record', async () => {
      const newRecord: DNSRecord = {
        type: DNSRecordType.A,
        name: 'new',
        data: '192.168.1.2',
        ttl: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await integration.addDNSRecord('example.com', newRecord);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.godaddy.com/v1/domains/example.com/records',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify([newRecord])
        })
      );
    });

    it('should handle API errors with retry logic', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDNSRecords)
        });

      const records = await integration.getDNSRecords('example.com');
      expect(records).toEqual(mockDNSRecords);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(integration.getDNSRecords('example.com'))
        .rejects
        .toThrow('Failed to retrieve DNS records after 3 attempts');
    });
  });

  describe('Batch Operations', () => {
    const batchDomains = ['example1.com', 'example2.com', 'example3.com'];
    const batchRecord: DNSRecord = {
      type: DNSRecordType.CNAME,
      name: 'www',
      data: 'target.com',
      ttl: 3600
    };

    it('should process batch DNS updates', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const results = await integration.batchUpdateDNSRecords(batchDomains, batchRecord);
      
      expect(results).toHaveLength(batchDomains.length);
      expect(mockFetch).toHaveBeenCalledTimes(batchDomains.length);
      
      results.forEach((result: DomainUpdateResult) => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle partial failures in batch operations', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) })
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) });

      const results = await integration.batchUpdateDNSRecords(batchDomains, batchRecord);

      expect(results).toHaveLength(batchDomains.length);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });

    it('should respect rate limiting in batch operations', async () => {
      const startTime = Date.now();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await integration.batchUpdateDNSRecords(batchDomains, batchRecord);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Assuming 100ms delay between requests
      expect(duration).toBeGreaterThanOrEqual(200); // 3 requests = 2 delays
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 Unauthorized errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(integration.getDNSRecords('example.com'))
        .rejects
        .toThrow('Authentication failed: Invalid API credentials');
    });

    it('should handle 429 Rate Limit errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: {
            get: (name: string) => name === 'Retry-After' ? '2' : null
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDNSRecords)
        });

      const records = await integration.getDNSRecords('example.com');
      expect(records).toEqual(mockDNSRecords);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null)
      });

      await expect(integration.getDNSRecords('example.com'))
        .rejects
        .toThrow('Invalid API response format');
    });
  });

  describe('Input Validation', () => {
    it('should validate domain names', async () => {
      await expect(integration.getDNSRecords('invalid domain'))
        .rejects
        .toThrow('Invalid domain name format');
    });

    it('should validate DNS record format', async () => {
      const invalidRecord = {
        type: 'INVALID' as DNSRecordType,
        name: 'test',
        data: '192.168.1.1',
        ttl: 3600
      };

      await expect(integration.addDNSRecord('example.com', invalidRecord))
        .rejects
        .toThrow('Invalid DNS record type');
    });

    it('should validate TTL values', async () => {
      const invalidTTLRecord: DNSRecord = {
        type: DNSRecordType.A,
        name: 'test',
        data: '192.168.1.1',
        ttl: 0
      };

      await expect(integration.addDNSRecord('example.com', invalidTTLRecord))
        .rejects
        .toThrow('Invalid TTL value');
    });
  });
});

