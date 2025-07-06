#!/usr/bin/env node

/**
 * SallyPort Connectivity Diagnostic Tool
 * 
 * This script performs comprehensive testing of SallyPort authentication service
 * connectivity and diagnoses common issues causing authentication failures.
 */

const axios = require('axios');
const dns = require('dns').promises;
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const SALLYPORT_BASE_URL = process.env.SALLYPORT_BASE_URL || 'https://sallyport.aixtiv.dev/api/v1';
const GCP_PROJECT = process.env.GCP_PROJECT || 'api-for-warp-drive';
const REPORT_FILE = path.join(__dirname, '../reports/sallyport-connectivity-diagnostic.json');

// Test configuration
const TESTS = {
    DNS_RESOLUTION: 'DNS Resolution Test',
    HTTP_CONNECTIVITY: 'HTTP Connectivity Test',
    HTTPS_CERTIFICATE: 'HTTPS Certificate Test',
    API_ENDPOINT_CHECK: 'API Endpoint Availability',
    AUTHENTICATION_TEST: 'Authentication Service Test',
    SECRET_MANAGER_ACCESS: 'Secret Manager Access Test',
    FIREWALL_RULES: 'Firewall/Network Rules Test',
    SERVICE_DISCOVERY: 'Service Discovery Test'
};

class SallyPortDiagnostic {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            config: {
                sallyport_base_url: SALLYPORT_BASE_URL,
                gcp_project: GCP_PROJECT,
                node_version: process.version,
                platform: process.platform
            },
            tests: {},
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            }
        };
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const colors = {
            INFO: '\x1b[34m',    // Blue
            SUCCESS: '\x1b[32m', // Green
            ERROR: '\x1b[31m',   // Red
            WARN: '\x1b[33m',    // Yellow
            RESET: '\x1b[0m'     // Reset
        };
        
        console.log(`${colors[level]}[${timestamp}] [${level}]${colors.RESET} ${message}`);
    }

    async runTest(testKey, testName, testFunction) {
        this.log(`Starting ${testName}...`);
        this.results.summary.total++;
        
        try {
            const result = await testFunction();
            this.results.tests[testKey] = {
                name: testName,
                status: result.status || 'PASS',
                message: result.message || 'Test completed successfully',
                details: result.details || {},
                duration: result.duration || 0
            };
            
            if (result.status === 'PASS') {
                this.results.summary.passed++;
                this.log(`✓ ${testName}: ${result.message}`, 'SUCCESS');
            } else if (result.status === 'WARN') {
                this.results.summary.warnings++;
                this.log(`⚠ ${testName}: ${result.message}`, 'WARN');
            } else {
                this.results.summary.failed++;
                this.log(`✗ ${testName}: ${result.message}`, 'ERROR');
            }
        } catch (error) {
            this.results.summary.failed++;
            this.results.tests[testKey] = {
                name: testName,
                status: 'FAIL',
                message: error.message,
                details: { error: error.stack },
                duration: 0
            };
            this.log(`✗ ${testName}: ${error.message}`, 'ERROR');
        }
    }

    async testDnsResolution() {
        const start = Date.now();
        const url = new URL(SALLYPORT_BASE_URL);
        const hostname = url.hostname;

        try {
            const addresses = await dns.lookup(hostname);
            const duration = Date.now() - start;
            
            return {
                status: 'PASS',
                message: `DNS resolution successful for ${hostname}`,
                details: {
                    hostname,
                    address: addresses.address,
                    family: addresses.family,
                    resolution_time_ms: duration
                },
                duration
            };
        } catch (error) {
            return {
                status: 'FAIL',
                message: `DNS resolution failed for ${hostname}: ${error.message}`,
                details: { hostname, error: error.code },
                duration: Date.now() - start
            };
        }
    }

    async testHttpConnectivity() {
        const start = Date.now();
        
        try {
            const response = await axios.get(SALLYPORT_BASE_URL, {
                timeout: 10000,
                validateStatus: () => true, // Accept any status code
                maxRedirects: 5
            });
            
            const duration = Date.now() - start;
            
            return {
                status: response.status < 500 ? 'PASS' : 'FAIL',
                message: `HTTP connectivity test completed with status ${response.status}`,
                details: {
                    status_code: response.status,
                    status_text: response.statusText,
                    headers: response.headers,
                    response_time_ms: duration
                },
                duration
            };
        } catch (error) {
            return {
                status: 'FAIL',
                message: `HTTP connectivity failed: ${error.message}`,
                details: {
                    error_code: error.code,
                    error_message: error.message,
                    is_timeout: error.code === 'ECONNABORTED'
                },
                duration: Date.now() - start
            };
        }
    }

    async testHttpsCertificate() {
        const start = Date.now();
        const url = new URL(SALLYPORT_BASE_URL);
        
        if (url.protocol !== 'https:') {
            return {
                status: 'WARN',
                message: 'Not using HTTPS protocol',
                details: { protocol: url.protocol },
                duration: Date.now() - start
            };
        }

        return new Promise((resolve) => {
            const https = require('https');
            const options = {
                hostname: url.hostname,
                port: url.port || 443,
                path: '/',
                method: 'GET',
                timeout: 10000
            };

            const req = https.request(options, (res) => {
                const cert = res.socket.getPeerCertificate();
                const duration = Date.now() - start;
                
                resolve({
                    status: 'PASS',
                    message: 'HTTPS certificate is valid',
                    details: {
                        subject: cert.subject,
                        issuer: cert.issuer,
                        valid_from: cert.valid_from,
                        valid_to: cert.valid_to,
                        fingerprint: cert.fingerprint
                    },
                    duration
                });
            });

            req.on('error', (error) => {
                resolve({
                    status: 'FAIL',
                    message: `HTTPS certificate test failed: ${error.message}`,
                    details: { error: error.code },
                    duration: Date.now() - start
                });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({
                    status: 'FAIL',
                    message: 'HTTPS certificate test timed out',
                    details: { timeout: true },
                    duration: Date.now() - start
                });
            });

            req.end();
        });
    }

    async testApiEndpointAvailability() {
        const start = Date.now();
        const endpoints = [
            '/health',
            '/status',
            '/api/health',
            '/session',
            '/auth/verify'
        ];

        const results = {};
        
        for (const endpoint of endpoints) {
            try {
                const url = `${SALLYPORT_BASE_URL}${endpoint}`;
                const response = await axios.get(url, {
                    timeout: 5000,
                    validateStatus: () => true
                });
                
                results[endpoint] = {
                    status: response.status,
                    available: response.status < 500
                };
            } catch (error) {
                results[endpoint] = {
                    status: 'error',
                    available: false,
                    error: error.message
                };
            }
        }

        const availableEndpoints = Object.values(results).filter(r => r.available).length;
        const duration = Date.now() - start;

        return {
            status: availableEndpoints > 0 ? 'PASS' : 'FAIL',
            message: `Found ${availableEndpoints}/${endpoints.length} available endpoints`,
            details: results,
            duration
        };
    }

    async testAuthenticationService() {
        const start = Date.now();
        
        try {
            // Test with a mock session token to see if the service responds
            const response = await axios.get(`${SALLYPORT_BASE_URL}/session`, {
                headers: {
                    'X-Session-Token': 'mock-token-for-testing',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Aixtiv-Integration-Gateway-Diagnostic/1.0'
                },
                timeout: 10000,
                validateStatus: () => true
            });

            const duration = Date.now() - start;
            
            // A 401 or 403 response is actually good - it means the service is responding
            const isServiceResponding = response.status === 401 || response.status === 403 || response.status === 200;
            
            return {
                status: isServiceResponding ? 'PASS' : 'FAIL',
                message: isServiceResponding ? 
                    `Authentication service is responding (status: ${response.status})` :
                    `Authentication service not responding properly (status: ${response.status})`,
                details: {
                    status_code: response.status,
                    response_headers: response.headers,
                    response_data: response.data
                },
                duration
            };
        } catch (error) {
            return {
                status: 'FAIL',
                message: `Authentication service test failed: ${error.message}`,
                details: {
                    error_code: error.code,
                    is_network_error: error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED'
                },
                duration: Date.now() - start
            };
        }
    }

    async testSecretManagerAccess() {
        const start = Date.now();
        
        try {
            // Test if we can access Secret Manager
            const { exec } = require('child_process');
            const command = `gcloud secrets list --project=${GCP_PROJECT} --format="value(name)" --limit=1`;
            
            return new Promise((resolve) => {
                exec(command, (error, stdout, stderr) => {
                    const duration = Date.now() - start;
                    
                    if (error) {
                        resolve({
                            status: 'FAIL',
                            message: `Secret Manager access failed: ${error.message}`,
                            details: { stderr, error_code: error.code },
                            duration
                        });
                    } else {
                        resolve({
                            status: 'PASS',
                            message: 'Secret Manager access successful',
                            details: { available_secrets: stdout.trim().split('\n').length },
                            duration
                        });
                    }
                });
            });
        } catch (error) {
            return {
                status: 'FAIL',
                message: `Secret Manager test failed: ${error.message}`,
                details: { error: error.message },
                duration: Date.now() - start
            };
        }
    }

    async testFirewallRules() {
        const start = Date.now();
        const url = new URL(SALLYPORT_BASE_URL);
        const port = url.port || (url.protocol === 'https:' ? 443 : 80);
        
        try {
            const { exec } = require('child_process');
            const command = `nc -z -w5 ${url.hostname} ${port}`;
            
            return new Promise((resolve) => {
                exec(command, (error, stdout, stderr) => {
                    const duration = Date.now() - start;
                    
                    if (error) {
                        resolve({
                            status: 'FAIL',
                            message: `Port ${port} is not accessible on ${url.hostname}`,
                            details: { 
                                hostname: url.hostname,
                                port,
                                error: error.message,
                                possible_firewall_block: true
                            },
                            duration
                        });
                    } else {
                        resolve({
                            status: 'PASS',
                            message: `Port ${port} is accessible on ${url.hostname}`,
                            details: { hostname: url.hostname, port },
                            duration
                        });
                    }
                });
            });
        } catch (error) {
            return {
                status: 'FAIL',
                message: `Firewall test failed: ${error.message}`,
                details: { error: error.message },
                duration: Date.now() - start
            };
        }
    }

    async testServiceDiscovery() {
        const start = Date.now();
        
        try {
            // Test alternative SallyPort endpoints that might be available
            const alternativeUrls = [
                'https://api.aixtiv.dev/sallyport/v1',
                'https://auth.aixtiv.dev/api/v1',
                'https://sallyport.2100.cool/api/v1',
                'https://integration-gateway-sallyport-yutylytffa-uw.a.run.app',
                'https://sallyport-auth-service-yutylytffa-uw.a.run.app'
            ];

            const results = {};
            
            for (const url of alternativeUrls) {
                try {
                    const response = await axios.get(url, {
                        timeout: 3000,
                        validateStatus: () => true
                    });
                    
                    results[url] = {
                        status: response.status,
                        available: response.status < 500,
                        response_time: Date.now() - start
                    };
                } catch (error) {
                    results[url] = {
                        available: false,
                        error: error.code || error.message
                    };
                }
            }

            const availableServices = Object.entries(results)
                .filter(([, result]) => result.available)
                .map(([url]) => url);

            const duration = Date.now() - start;

            return {
                status: availableServices.length > 0 ? 'PASS' : 'WARN',
                message: availableServices.length > 0 ? 
                    `Found ${availableServices.length} alternative service endpoints` :
                    'No alternative service endpoints found',
                details: {
                    alternative_services: results,
                    available_services: availableServices
                },
                duration
            };
        } catch (error) {
            return {
                status: 'FAIL',
                message: `Service discovery failed: ${error.message}`,
                details: { error: error.message },
                duration: Date.now() - start
            };
        }
    }

    async generateRecommendations() {
        const recommendations = [];
        
        // Analyze test results and generate recommendations
        if (this.results.tests.DNS_RESOLUTION?.status === 'FAIL') {
            recommendations.push({
                priority: 'HIGH',
                category: 'Network',
                issue: 'DNS Resolution Failure',
                solution: 'The SallyPort hostname cannot be resolved. Check if the domain exists and is properly configured.',
                action: 'Verify domain registration and DNS records for sallyport.aixtiv.dev'
            });
        }

        if (this.results.tests.HTTP_CONNECTIVITY?.status === 'FAIL') {
            recommendations.push({
                priority: 'HIGH',
                category: 'Connectivity',
                issue: 'HTTP Connectivity Failure',
                solution: 'Cannot establish HTTP connection to SallyPort service.',
                action: 'Check if the service is running and accessible. Consider using a Cloud Run or properly deployed service.'
            });
        }

        if (this.results.tests.AUTHENTICATION_TEST?.status === 'FAIL') {
            recommendations.push({
                priority: 'HIGH',
                category: 'Service',
                issue: 'Authentication Service Not Responding',
                solution: 'The SallyPort authentication service is not responding.',
                action: 'Deploy a working SallyPort service or use a mock service for development.'
            });
        }

        if (this.results.tests.SERVICE_DISCOVERY?.details?.available_services?.length > 0) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Configuration',
                issue: 'Alternative Services Available',
                solution: 'Found alternative service endpoints that might work.',
                action: `Update SALLYPORT_BASE_URL to one of: ${this.results.tests.SERVICE_DISCOVERY.details.available_services.join(', ')}`
            });
        }

        // Add quick fix recommendation
        recommendations.push({
            priority: 'IMMEDIATE',
            category: 'Quick Fix',
            issue: 'Service Unavailable',
            solution: 'For immediate testing, deploy a mock SallyPort service.',
            action: 'Use the provided mock service deployment or update configuration to bypass authentication temporarily.'
        });

        this.results.recommendations = recommendations;
    }

    async saveReport() {
        try {
            // Ensure reports directory exists
            const reportsDir = path.dirname(REPORT_FILE);
            await fs.mkdir(reportsDir, { recursive: true });
            
            // Save the full report
            await fs.writeFile(REPORT_FILE, JSON.stringify(this.results, null, 2));
            this.log(`Diagnostic report saved to: ${REPORT_FILE}`, 'SUCCESS');
            
            // Create a summary report
            const summaryFile = path.join(reportsDir, 'sallyport-connectivity-summary.md');
            const summary = this.generateMarkdownSummary();
            await fs.writeFile(summaryFile, summary);
            this.log(`Summary report saved to: ${summaryFile}`, 'SUCCESS');
            
        } catch (error) {
            this.log(`Failed to save report: ${error.message}`, 'ERROR');
        }
    }

    generateMarkdownSummary() {
        const { summary, tests, recommendations } = this.results;
        
        let markdown = `# SallyPort Connectivity Diagnostic Report\n\n`;
        markdown += `**Generated:** ${this.results.timestamp}\n`;
        markdown += `**SallyPort URL:** ${SALLYPORT_BASE_URL}\n\n`;
        
        markdown += `## Summary\n\n`;
        markdown += `- **Total Tests:** ${summary.total}\n`;
        markdown += `- **Passed:** ${summary.passed} ✓\n`;
        markdown += `- **Failed:** ${summary.failed} ✗\n`;
        markdown += `- **Warnings:** ${summary.warnings} ⚠\n\n`;
        
        markdown += `## Test Results\n\n`;
        for (const [key, test] of Object.entries(tests)) {
            const icon = test.status === 'PASS' ? '✓' : test.status === 'WARN' ? '⚠' : '✗';
            markdown += `### ${icon} ${test.name}\n`;
            markdown += `**Status:** ${test.status}\n`;
            markdown += `**Message:** ${test.message}\n`;
            if (test.duration) markdown += `**Duration:** ${test.duration}ms\n`;
            markdown += `\n`;
        }
        
        if (recommendations && recommendations.length > 0) {
            markdown += `## Recommendations\n\n`;
            for (const rec of recommendations) {
                markdown += `### ${rec.priority} Priority: ${rec.issue}\n`;
                markdown += `**Category:** ${rec.category}\n`;
                markdown += `**Solution:** ${rec.solution}\n`;
                markdown += `**Action:** ${rec.action}\n\n`;
            }
        }
        
        return markdown;
    }

    async run() {
        this.log('Starting SallyPort Connectivity Diagnostic', 'INFO');
        this.log(`Testing connectivity to: ${SALLYPORT_BASE_URL}`, 'INFO');
        
        // Run all tests
        await this.runTest('DNS_RESOLUTION', TESTS.DNS_RESOLUTION, () => this.testDnsResolution());
        await this.runTest('HTTP_CONNECTIVITY', TESTS.HTTP_CONNECTIVITY, () => this.testHttpConnectivity());
        await this.runTest('HTTPS_CERTIFICATE', TESTS.HTTPS_CERTIFICATE, () => this.testHttpsCertificate());
        await this.runTest('API_ENDPOINT_CHECK', TESTS.API_ENDPOINT_CHECK, () => this.testApiEndpointAvailability());
        await this.runTest('AUTHENTICATION_TEST', TESTS.AUTHENTICATION_TEST, () => this.testAuthenticationService());
        await this.runTest('SECRET_MANAGER_ACCESS', TESTS.SECRET_MANAGER_ACCESS, () => this.testSecretManagerAccess());
        await this.runTest('FIREWALL_RULES', TESTS.FIREWALL_RULES, () => this.testFirewallRules());
        await this.runTest('SERVICE_DISCOVERY', TESTS.SERVICE_DISCOVERY, () => this.testServiceDiscovery());
        
        // Generate recommendations
        await this.generateRecommendations();
        
        // Save report
        await this.saveReport();
        
        // Print summary
        this.log('\n=== DIAGNOSTIC SUMMARY ===', 'INFO');
        this.log(`Total Tests: ${this.results.summary.total}`, 'INFO');
        this.log(`Passed: ${this.results.summary.passed}`, 'SUCCESS');
        this.log(`Failed: ${this.results.summary.failed}`, this.results.summary.failed > 0 ? 'ERROR' : 'INFO');
        this.log(`Warnings: ${this.results.summary.warnings}`, this.results.summary.warnings > 0 ? 'WARN' : 'INFO');
        
        if (this.results.recommendations && this.results.recommendations.length > 0) {
            this.log('\n=== IMMEDIATE ACTIONS REQUIRED ===', 'WARN');
            this.results.recommendations
                .filter(r => r.priority === 'IMMEDIATE' || r.priority === 'HIGH')
                .forEach(rec => {
                    this.log(`${rec.priority}: ${rec.action}`, 'WARN');
                });
        }
        
        return this.results;
    }
}

// Run the diagnostic if this script is executed directly
if (require.main === module) {
    const diagnostic = new SallyPortDiagnostic();
    diagnostic.run()
        .then((results) => {
            const exitCode = results.summary.failed > 0 ? 1 : 0;
            process.exit(exitCode);
        })
        .catch((error) => {
            console.error('Diagnostic failed:', error);
            process.exit(1);
        });
}

module.exports = SallyPortDiagnostic;
