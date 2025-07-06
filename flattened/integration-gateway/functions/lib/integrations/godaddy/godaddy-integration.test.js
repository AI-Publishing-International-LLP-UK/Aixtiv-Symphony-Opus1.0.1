"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const godaddy_integration_1 = require("./godaddy-integration");
const godaddy_integration_interfaces_1 = require("./godaddy-integration-interfaces");
// Mock API responses
const mockDNSRecords = [
    {
        type: godaddy_integration_interfaces_1.DNSRecordType.A,
        name: 'test',
        data: '192.168.1.1',
        ttl: 3600,
    },
    {
        type: godaddy_integration_interfaces_1.DNSRecordType.CNAME,
        name: 'www',
        data: 'example.com',
        ttl: 3600,
    },
];
const mockConfig = {
    apiKey: 'test-key',
    apiSecret: 'test-secret',
    baseUrl: 'https://api.godaddy.com/v1',
};
(0, globals_1.describe)('GoDaddyIntegration', () => {
    let integration;
    let mockFetch;
    (0, globals_1.beforeEach)(() => {
        mockFetch = globals_1.jest.fn();
        global.fetch = mockFetch;
        integration = new godaddy_integration_1.GoDaddyIntegration(mockConfig);
    });
    (0, globals_1.describe)('DNS Record Management', () => {
        (0, globals_1.it)('should retrieve DNS records for a domain', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockDNSRecords),
            });
            const records = await integration.getDNSRecords('example.com');
            (0, globals_1.expect)(records).toEqual(mockDNSRecords);
            (0, globals_1.expect)(mockFetch).toHaveBeenCalledWith('https://api.godaddy.com/v1/domains/example.com/records', globals_1.expect.any(Object));
        });
        (0, globals_1.it)('should add a new DNS record', async () => {
            const newRecord = {
                type: godaddy_integration_interfaces_1.DNSRecordType.A,
                name: 'new',
                data: '192.168.1.2',
                ttl: 3600,
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            });
            await integration.addDNSRecord('example.com', newRecord);
            (0, globals_1.expect)(mockFetch).toHaveBeenCalledWith('https://api.godaddy.com/v1/domains/example.com/records', globals_1.expect.objectContaining({
                method: 'PATCH',
                body: JSON.stringify([newRecord]),
            }));
        });
        (0, globals_1.it)('should handle API errors with retry logic', async () => {
            mockFetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockDNSRecords),
            });
            const records = await integration.getDNSRecords('example.com');
            (0, globals_1.expect)(records).toEqual(mockDNSRecords);
            (0, globals_1.expect)(mockFetch).toHaveBeenCalledTimes(3);
        });
        (0, globals_1.it)('should throw error after max retries', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));
            await (0, globals_1.expect)(integration.getDNSRecords('example.com')).rejects.toThrow('Failed to retrieve DNS records after 3 attempts');
        });
    });
    (0, globals_1.describe)('Batch Operations', () => {
        const batchDomains = ['example1.com', 'example2.com', 'example3.com'];
        const batchRecord = {
            type: godaddy_integration_interfaces_1.DNSRecordType.CNAME,
            name: 'www',
            data: 'target.com',
            ttl: 3600,
        };
        (0, globals_1.it)('should process batch DNS updates', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            });
            const results = await integration.batchUpdateDNSRecords(batchDomains, batchRecord);
            (0, globals_1.expect)(results).toHaveLength(batchDomains.length);
            (0, globals_1.expect)(mockFetch).toHaveBeenCalledTimes(batchDomains.length);
            results.forEach((result) => {
                (0, globals_1.expect)(result.success).toBe(true);
            });
        });
        (0, globals_1.it)('should handle partial failures in batch operations', async () => {
            mockFetch
                .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            })
                .mockRejectedValueOnce(new Error('API Error'))
                .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            });
            const results = await integration.batchUpdateDNSRecords(batchDomains, batchRecord);
            (0, globals_1.expect)(results).toHaveLength(batchDomains.length);
            (0, globals_1.expect)(results[0].success).toBe(true);
            (0, globals_1.expect)(results[1].success).toBe(false);
            (0, globals_1.expect)(results[2].success).toBe(true);
        });
        (0, globals_1.it)('should respect rate limiting in batch operations', async () => {
            const startTime = Date.now();
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            });
            await integration.batchUpdateDNSRecords(batchDomains, batchRecord);
            const endTime = Date.now();
            const duration = endTime - startTime;
            // Assuming 100ms delay between requests
            (0, globals_1.expect)(duration).toBeGreaterThanOrEqual(200); // 3 requests = 2 delays
        });
    });
    (0, globals_1.describe)('Error Handling', () => {
        (0, globals_1.it)('should handle 401 Unauthorized errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
            });
            await (0, globals_1.expect)(integration.getDNSRecords('example.com')).rejects.toThrow('Authentication failed: Invalid API credentials');
        });
        (0, globals_1.it)('should handle 429 Rate Limit errors', async () => {
            mockFetch
                .mockResolvedValueOnce({
                ok: false,
                status: 429,
                headers: {
                    get: (name) => (name === 'Retry-After' ? '2' : null),
                },
            })
                .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockDNSRecords),
            });
            const records = await integration.getDNSRecords('example.com');
            (0, globals_1.expect)(records).toEqual(mockDNSRecords);
            (0, globals_1.expect)(mockFetch).toHaveBeenCalledTimes(2);
        });
        (0, globals_1.it)('should handle malformed API responses', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(null),
            });
            await (0, globals_1.expect)(integration.getDNSRecords('example.com')).rejects.toThrow('Invalid API response format');
        });
    });
    (0, globals_1.describe)('Input Validation', () => {
        (0, globals_1.it)('should validate domain names', async () => {
            await (0, globals_1.expect)(integration.getDNSRecords('invalid domain')).rejects.toThrow('Invalid domain name format');
        });
        (0, globals_1.it)('should validate DNS record format', async () => {
            const invalidRecord = {
                type: 'INVALID',
                name: 'test',
                data: '192.168.1.1',
                ttl: 3600,
            };
            await (0, globals_1.expect)(integration.addDNSRecord('example.com', invalidRecord)).rejects.toThrow('Invalid DNS record type');
        });
        (0, globals_1.it)('should validate TTL values', async () => {
            const invalidTTLRecord = {
                type: godaddy_integration_interfaces_1.DNSRecordType.A,
                name: 'test',
                data: '192.168.1.1',
                ttl: 0,
            };
            await (0, globals_1.expect)(integration.addDNSRecord('example.com', invalidTTLRecord)).rejects.toThrow('Invalid TTL value');
        });
    });
});
//# sourceMappingURL=godaddy-integration.test.js.map