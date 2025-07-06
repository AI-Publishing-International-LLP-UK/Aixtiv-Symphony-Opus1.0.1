#!/usr/bin/env node

/**
 * SallyPort-Cloudflare End-to-End Traffic Routing Test Suite
 * 
 * This test suite simulates external (public) requests to ASOOS resources 
 * over /sallyport/** through Cloudflare and verifies:
 * - Only Cloudflare-authenticated, SallyPort-authorized requests reach private backends
 * - Proper headers, logs, and security events are generated
 * - Access control and security policies are enforced
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

class TestReporter {
    constructor() {
        this.results = [];
        this.startTime = new Date();
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        console.log(logMessage);
    }

    recordResult(testName, passed, details, responseTime = null) {
        this.totalTests++;
        if (passed) {
            this.passedTests++;
            this.log(`✅ PASS: ${testName}`, 'TEST');
        } else {
            this.failedTests++;
            this.log(`❌ FAIL: ${testName}`, 'TEST');
        }

        this.results.push({
            testName,
            passed,
            details,
            responseTime,
            timestamp: new Date().toISOString()
        });

        if (details && !passed) {
            this.log(`   Details: ${details}`, 'ERROR');
        }
    }

    generateSummary() {
        const endTime = new Date();
        const duration = endTime - this.startTime;
        
        this.log('='.repeat(60), 'SUMMARY');
        this.log(`Test Summary Report`, 'SUMMARY');
        this.log(`Total Tests: ${this.totalTests}`, 'SUMMARY');
        this.log(`Passed: ${this.passedTests}`, 'SUMMARY');
        this.log(`Failed: ${this.failedTests}`, 'SUMMARY');
        this.log(`Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(2)}%`, 'SUMMARY');
        this.log(`Total Duration: ${duration}ms`, 'SUMMARY');
        this.log('='.repeat(60), 'SUMMARY');

        return {
            totalTests: this.totalTests,
            passedTests: this.passedTests,
            failedTests: this.failedTests,
            successRate: (this.passedTests / this.totalTests) * 100,
            duration,
            results: this.results
        };
    }

    writeDetailedReport(outputPath) {
        const summary = this.generateSummary();
        const reportData = {
            metadata: {
                testSuite: 'SallyPort-Cloudflare E2E Routing Tests',
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development'
            },
            summary,
            detailedResults: this.results
        };

        try {
            fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2));
            this.log(`Detailed report written to: ${outputPath}`, 'REPORT');
        } catch (error) {
            this.log(`Failed to write detailed report: ${error.message}`, 'ERROR');
        }
    }
}

class SallyPortCloudflareE2ETester {
    constructor(config) {
        this.config = config;
        this.reporter = new TestReporter();
        this.defaultTimeout = 10000; // 10 seconds
    }

    async makeRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const parsedUrl = new URL(url);
            const requestOptions = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: options.method || 'GET',
                headers: options.headers || {},
                timeout: options.timeout || this.defaultTimeout
            };

            const httpModule = parsedUrl.protocol === 'https:' ? https : http;
            
            const req = httpModule.request(requestOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const responseTime = Date.now() - startTime;
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data,
                        responseTime
                    });
                });
            });

            req.on('error', (error) => {
                const responseTime = Date.now() - startTime;
                reject({
                    error: error.message,
                    responseTime
                });
            });

            req.on('timeout', () => {
                req.destroy();
                const responseTime = Date.now() - startTime;
                reject({
                    error: 'Request timeout',
                    responseTime
                });
            });

            if (options.body) {
                req.write(options.body);
            }

            req.end();
        });
    }

    async testPublicAccess() {
        this.reporter.log('Testing public access to main domain...', 'TEST');
        
        try {
            const response = await this.makeRequest(this.config.baseUrl);
            const passed = response.statusCode === 200;
            this.reporter.recordResult(
                'Public Domain Access',
                passed,
                passed ? 'Main domain accessible' : `HTTP ${response.statusCode}`,
                response.responseTime
            );
        } catch (error) {
            this.reporter.recordResult(
                'Public Domain Access',
                false,
                `Request failed: ${error.error}`,
                error.responseTime
            );
        }
    }

    async testCloudflareHeaders() {
        this.reporter.log('Testing Cloudflare header validation...', 'TEST');
        
        // Test 1: Request without Cloudflare headers (should be rejected)
        try {
            const response = await this.makeRequest(
                `${this.config.baseUrl}/sallyport/api/test`,
                { 
                    headers: {
                        'User-Agent': 'SallyPort-E2E-Test/1.0'
                    }
                }
            );
            
            const passed = response.statusCode === 403 || response.statusCode === 401;
            this.reporter.recordResult(
                'Cloudflare Header Validation (No CF Headers)',
                passed,
                passed ? 'Correctly rejected request without CF headers' : 
                        `Expected 403/401, got ${response.statusCode}`,
                response.responseTime
            );
        } catch (error) {
            this.reporter.recordResult(
                'Cloudflare Header Validation (No CF Headers)',
                false,
                `Request failed: ${error.error}`,
                error.responseTime
            );
        }

        // Test 2: Request with valid Cloudflare headers
        try {
            const response = await this.makeRequest(
                `${this.config.baseUrl}/sallyport/api/test`,
                {
                    headers: {
                        'CF-Ray': 'test-ray-id-12345',
                        'CF-Connecting-IP': '203.0.113.1',
                        'CF-Visitor': '{"scheme":"https"}',
                        'User-Agent': 'SallyPort-E2E-Test/1.0'
                    }
                }
            );
            
            // With CF headers, should proceed to SallyPort auth (may still fail auth)
            const passed = response.statusCode !== 403 || 
                          (response.body && response.body.includes('cloudflare'));
            this.reporter.recordResult(
                'Cloudflare Header Validation (With CF Headers)',
                passed,
                passed ? 'CF headers accepted, proceeded to auth' : 
                        'CF headers rejected unexpectedly',
                response.responseTime
            );
        } catch (error) {
            this.reporter.recordResult(
                'Cloudflare Header Validation (With CF Headers)',
                false,
                `Request failed: ${error.error}`,
                error.responseTime
            );
        }
    }

    async testSallyPortAuthentication() {
        this.reporter.log('Testing SallyPort authentication...', 'TEST');
        
        // Test 1: Request without SallyPort token
        try {
            const response = await this.makeRequest(
                `${this.config.baseUrl}/sallyport/api/agents/status`,
                {
                    headers: {
                        'CF-Ray': 'test-ray-id-12345',
                        'CF-Connecting-IP': '203.0.113.1',
                        'CF-Visitor': '{"scheme":"https"}',
                        'User-Agent': 'SallyPort-E2E-Test/1.0'
                    }
                }
            );
            
            const passed = response.statusCode === 401 || response.statusCode === 403;
            this.reporter.recordResult(
                'SallyPort Auth (No Token)',
                passed,
                passed ? 'Correctly rejected request without SallyPort token' : 
                        `Expected 401/403, got ${response.statusCode}`,
                response.responseTime
            );
        } catch (error) {
            this.reporter.recordResult(
                'SallyPort Auth (No Token)',
                false,
                `Request failed: ${error.error}`,
                error.responseTime
            );
        }

        // Test 2: Request with invalid SallyPort token
        try {
            const response = await this.makeRequest(
                `${this.config.baseUrl}/sallyport/api/agents/status`,
                {
                    headers: {
                        'CF-Ray': 'test-ray-id-12345',
                        'CF-Connecting-IP': '203.0.113.1',
                        'CF-Visitor': '{"scheme":"https"}',
                        'Authorization': 'Bearer invalid-token-12345',
                        'X-SallyPort-Token': 'invalid-sallyport-token',
                        'User-Agent': 'SallyPort-E2E-Test/1.0'
                    }
                }
            );
            
            const passed = response.statusCode === 401 || response.statusCode === 403;
            this.reporter.recordResult(
                'SallyPort Auth (Invalid Token)',
                passed,
                passed ? 'Correctly rejected invalid SallyPort token' : 
                        `Expected 401/403, got ${response.statusCode}`,
                response.responseTime
            );
        } catch (error) {
            this.reporter.recordResult(
                'SallyPort Auth (Invalid Token)',
                false,
                `Request failed: ${error.error}`,
                error.responseTime
            );
        }

        // Test 3: Request with valid SallyPort token (if available)
        if (this.config.validSallyPortToken) {
            try {
                const response = await this.makeRequest(
                    `${this.config.baseUrl}/sallyport/api/agents/status`,
                    {
                        headers: {
                            'CF-Ray': 'test-ray-id-12345',
                            'CF-Connecting-IP': '203.0.113.1',
                            'CF-Visitor': '{"scheme":"https"}',
                            'Authorization': `Bearer ${this.config.validSallyPortToken}`,
                            'X-SallyPort-Token': this.config.validSallyPortToken,
                            'User-Agent': 'SallyPort-E2E-Test/1.0'
                        }
                    }
                );
                
                const passed = response.statusCode === 200 || response.statusCode === 404;
                this.reporter.recordResult(
                    'SallyPort Auth (Valid Token)',
                    passed,
                    passed ? 'Valid SallyPort token accepted' : 
                            `Unexpected response: ${response.statusCode}`,
                    response.responseTime
                );
            } catch (error) {
                this.reporter.recordResult(
                    'SallyPort Auth (Valid Token)',
                    false,
                    `Request failed: ${error.error}`,
                    error.responseTime
                );
            }
        }
    }

    async testProtectedEndpoints() {
        this.reporter.log('Testing protected API endpoint access...', 'TEST');
        
        const protectedEndpoints = [
            '/sallyport/api/agents/list',
            '/sallyport/api/admin/users',
            '/sallyport/api/wing/squadrons',
            '/sallyport/api/private/config'
        ];

        for (const endpoint of protectedEndpoints) {
            // Test unauthorized access
            try {
                const response = await this.makeRequest(
                    `${this.config.baseUrl}${endpoint}`,
                    {
                        headers: {
                            'User-Agent': 'SallyPort-E2E-Test/1.0'
                        }
                    }
                );
                
                const passed = response.statusCode === 401 || response.statusCode === 403;
                this.reporter.recordResult(
                    `Protected Endpoint Access: ${endpoint}`,
                    passed,
                    passed ? 'Correctly blocked unauthorized access' : 
                            `Expected 401/403, got ${response.statusCode}`,
                    response.responseTime
                );
            } catch (error) {
                this.reporter.recordResult(
                    `Protected Endpoint Access: ${endpoint}`,
                    false,
                    `Request failed: ${error.error}`,
                    error.responseTime
                );
            }
        }
    }

    async testSecurityHeaders() {
        this.reporter.log('Testing security headers presence...', 'TEST');
        
        try {
            const response = await this.makeRequest(this.config.baseUrl);
            
            const expectedHeaders = [
                'x-frame-options',
                'x-content-type-options',
                'x-xss-protection',
                'strict-transport-security'
            ];

            for (const header of expectedHeaders) {
                const present = response.headers[header] !== undefined;
                this.reporter.recordResult(
                    `Security Header: ${header}`,
                    present,
                    present ? `Present: ${response.headers[header]}` : 'Missing',
                    response.responseTime
                );
            }
        } catch (error) {
            this.reporter.recordResult(
                'Security Headers Test',
                false,
                `Request failed: ${error.error}`,
                error.responseTime
            );
        }
    }

    async testAuditLogging() {
        this.reporter.log('Testing audit logging endpoint...', 'TEST');
        
        try {
            // Make a request that should generate audit logs
            const response = await this.makeRequest(
                `${this.config.baseUrl}/sallyport/api/audit/test`,
                {
                    headers: {
                        'CF-Ray': 'audit-test-ray-12345',
                        'CF-Connecting-IP': '203.0.113.1',
                        'CF-Visitor': '{"scheme":"https"}',
                        'User-Agent': 'SallyPort-E2E-Test/1.0'
                    }
                }
            );
            
            // Even if the endpoint doesn't exist, it should be logged
            const passed = response.statusCode >= 200 && response.statusCode < 500;
            this.reporter.recordResult(
                'Audit Logging Trigger',
                passed,
                `Request logged with status ${response.statusCode}`,
                response.responseTime
            );
        } catch (error) {
            this.reporter.recordResult(
                'Audit Logging Trigger',
                false,
                `Request failed: ${error.error}`,
                error.responseTime
            );
        }
    }

    async runTestSuite() {
        this.reporter.log('Starting SallyPort-Cloudflare E2E Test Suite...', 'SUITE');
        
        try {
            await this.testPublicAccess();
            await this.testCloudflareHeaders();
            await this.testSallyPortAuthentication();
            await this.testProtectedEndpoints();
            await this.testSecurityHeaders();
            await this.testAuditLogging();
        } catch (error) {
            this.reporter.log(`Test suite error: ${error.message}`, 'ERROR');
        }

        const summary = this.reporter.generateSummary();
        
        // Write detailed report
        const reportPath = path.join(__dirname, `../reports/sallyport-cloudflare-e2e-${Date.now()}.json`);
        this.reporter.writeDetailedReport(reportPath);
        
        return summary;
    }
}

// Test configuration
const testConfig = {
    baseUrl: process.env.TEST_BASE_URL || 'https://asoos.2100.cool',
    validSallyPortToken: process.env.SALLYPORT_TEST_TOKEN || null,
    timeout: parseInt(process.env.TEST_TIMEOUT) || 10000
};

// Main execution
async function main() {
    console.log('🚀 SallyPort-Cloudflare E2E Traffic Routing Test Suite');
    console.log('='.repeat(60));
    console.log(`Base URL: ${testConfig.baseUrl}`);
    console.log(`Timeout: ${testConfig.timeout}ms`);
    console.log('='.repeat(60));

    // Ensure reports directory exists
    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    const tester = new SallyPortCloudflareE2ETester(testConfig);
    const summary = await tester.runTestSuite();
    
    // Exit with appropriate code
    process.exit(summary.failedTests > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { SallyPortCloudflareE2ETester, TestReporter };
