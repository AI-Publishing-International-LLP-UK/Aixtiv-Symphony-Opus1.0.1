#!/usr/bin/env node

/**
 * Domain Validation Script
 * 
 * This script validates domain configurations by:
 * 1. Checking domain format validity
 * 2. Verifying DNS records against GoDaddy API
 * 3. Ensuring proper Firebase hosting configurations
 * 
 * Usage: node validate-domains.js [--environment=<env>] [--domain=<domain>]
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dns = require('dns');
const { promisify } = require('util');
const { execSync } = require('child_process');

// Promisify DNS lookups
const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);
const resolve4 = promisify(dns.resolve4);

// GoDaddy API configuration
const GODADDY_API_URL = 'https://api.godaddy.com/v1';
const DEFAULT_ENV_FILE = path.resolve(process.cwd(), '.env');

// Firebase configuration
const FIREBASE_DEFAULT_SITE = 'academy-website';

// Domain format regex
const DOMAIN_FORMAT_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;

/**
 * Parse command line arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        environment: 'dev',
        domain: null,
        verbose: false,
        skipGodaddy: false
    };

    args.forEach(arg => {
        if (arg.startsWith('--environment=')) {
            options.environment = arg.split('=')[1];
        } else if (arg.startsWith('--domain=')) {
            options.domain = arg.split('=')[1];
        } else if (arg === '--verbose' || arg === '-v') {
            options.verbose = true;
        } else if (arg === '--skip-godaddy') {
            options.skipGodaddy = true;
        } else if (arg === '--help' || arg === '-h') {
            showHelp();
            process.exit(0);
        }
    });

    return options;
}

/**
 * Display help information
 */
function showHelp() {
    console.log(`
Domain Validation Script
------------------------

This script validates domain configurations by checking domain format validity,
verifying DNS records against GoDaddy API, and ensuring proper Firebase configurations.

Usage: node validate-domains.js [options]

Options:
  --environment=<env>    Specify environment (dev, staging, production)
  --domain=<domain>      Validate a specific domain only
  --verbose, -v          Display detailed validation information
  --skip-godaddy        Skip GoDaddy DNS verification
  --help, -h             Show this help message
`);
}

/**
 * Load environment variables from .env file
 */
function loadEnvFile(filePath = DEFAULT_ENV_FILE) {
    try {
        if (fs.existsSync(filePath)) {
            const envConfig = fs.readFileSync(filePath, 'utf8')
                .split('\n')
                .filter(line => line.trim() && !line.startsWith('#'))
                .reduce((acc, line) => {
                    const [key, ...valueParts] = line.split('=');
                    const value = valueParts.join('=').trim();
                    if (key && value) {
                        acc[key.trim()] = value.replace(/^['"]|['"]$/g, '');
                    }
                    return acc;
                }, {});

            // Set environment variables
            Object.keys(envConfig).forEach(key => {
                if (!process.env[key]) {
                    process.env[key] = envConfig[key];
                }
            });

            return true;
        }
    } catch (error) {
        console.error(`Error loading .env file: ${error.message}`);
    }
    return false;
}

/**
 * Get GoDaddy API credentials
 */
function getGoDaddyCredentials() {
    // Try to get credentials from environment variables
    let apiKey = process.env.GODADDY_API_KEY;
    let apiSecret = process.env.GODADDY_API_SECRET;

    // If not found in environment, check .env file
    if (!apiKey || !apiSecret) {
        loadEnvFile();
        apiKey = process.env.GODADDY_API_KEY;
        apiSecret = process.env.GODADDY_API_SECRET;
    }

    if (!apiKey || !apiSecret) {
        throw new Error('GoDaddy API credentials not found. Set GODADDY_API_KEY and GODADDY_API_SECRET environment variables.');
    }

    return { apiKey, apiSecret };
}

/**
 * Get domains to validate
 */
async function getDomainsToValidate(options) {
    if (options.domain) {
        return [options.domain];
    }

    try {
        // Check if domains.json exists
        const domainsPath = path.resolve(process.cwd(), 'domains.json');
        if (fs.existsSync(domainsPath)) {
            const domainsData = JSON.parse(fs.readFileSync(domainsPath, 'utf8'));
            const envData = domainsData[options.environment];
            if (envData && Array.isArray(envData.domains)) {
                return envData.domains.map(d => ({
                    domain: d.domain,
                    projectId: d.projectId,
                    siteId: d.siteId
                }));
            }
            return [];
        }

        // Try to get domains from Firebase
        try {
            const output = execSync('firebase hosting:sites:list --json').toString();
            const sites = JSON.parse(output);
            return sites.map(site => site.site);
        } catch (fbError) {
            console.warn('Unable to get domains from Firebase:', fbError.message);
        }

        console.warn('No domains found to validate. Please specify domains in domains.json or use --domain option.');
        return [];
    } catch (error) {
        console.error('Error getting domains to validate:', error.message);
        return [];
    }
}

/**
 * Validate domain format
 */
function validateDomainFormat(domain) {
    if (!domain) return false;
    return DOMAIN_FORMAT_REGEX.test(domain);
}

/**
 * Verify DNS records against GoDaddy API
 */
async function verifyDnsRecords(domain, options) {
    const results = {
        success: true,
        details: {}
    };

    if (options && options.skipGodaddy) {
        console.log('Skipping GoDaddy DNS verification');
        return results;
    }

    try {
        const { apiKey, apiSecret } = getGoDaddyCredentials();
        
        // Get DNS records from GoDaddy
        const response = await axios.get(`${GODADDY_API_URL}/domains/${domain}/records`, {
            headers: {
                'Authorization': `sso-key ${apiKey}:${apiSecret}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.data || !Array.isArray(response.data)) {
            results.success = false;
            results.details.godaddy = 'Invalid response from GoDaddy API';
            return results;
        }

        results.details.records = {
            a: response.data.filter(r => r.type === 'A'),
            cname: response.data.filter(r => r.type === 'CNAME'),
            txt: response.data.filter(r => r.type === 'TXT')
        };

        // Verify A records
        try {
            const aRecords = await resolve4(domain);
            results.details.aVerification = {
                success: true,
                records: aRecords
            };
        } catch (error) {
            results.success = false;
            results.details.aVerification = {
                success: false,
                error: error.message
            };
        }

        // Verify TXT records for domain verification
        try {
            const txtRecords = await resolveTxt(domain);
            results.details.txtVerification = {
                success: true,
                records: txtRecords
            };
        } catch (error) {
            // TXT records might not exist, which is not always an error
            results.details.txtVerification = {
                success: false,
                error: error.message
            };
        }

        return results;
    } catch (error) {
        results.success = false;
        results.details.error = error.message;
        return results;
    }
}

/**
 * Verify Firebase hosting configuration
 */
async function verifyFirebaseHosting(domainObj) {
    const results = {
        success: false,
        details: {}
    };

    const domain = typeof domainObj === 'string' ? domainObj : domainObj.domain;
    const siteId = typeof domainObj === 'string' ? null : domainObj.siteId;

    try {
        if (siteId) {
            try {
                // Execute firebase command without --json flag to get tabular output
                const command = `firebase hosting:sites:get ${siteId}`;
                const output = execSync(command, {
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                // Parse the tabular output
                if (output.includes(siteId)) {
                    results.success = true;
                    results.details.siteInfo = {
                        siteId: siteId,
                        exists: true
                    };
                } else {
                    results.details.error = `Site ${siteId} not found in Firebase hosting sites`;
                }
            } catch (fbError) {
                results.details.error = `Firebase command failed: ${fbError.message}`;
            }
        }

        // Try to resolve CNAME record to verify Firebase hosting
        try {
            const cnameValue = await resolveCname(domain);
            if (cnameValue && cnameValue.length > 0) {
                const isFirebaseCname = cnameValue.some(cname => 
                    cname.includes('firebase') || cname.includes('ghs.googlehosted.com')
                );
                
                results.details.cnameVerification = {
                    success: isFirebaseCname,
                    records: cnameValue,
                    isFirebase: isFirebaseCname
                };
                
                if (isFirebaseCname) {
                    results.success = true;
                }
            }
        } catch (dnsError) {
            results.details.cnameVerification = {
                success: false,
                error: dnsError.message
            };
        }

        return results;
    } catch (error) {
        results.details.error = error.message;
        return results;
    }
}

/**
 * Validate a single domain
 */
async function validateDomain(domainObj, options) {
    const domain = typeof domainObj === 'string' ? domainObj : domainObj.domain;
    console.log(`\n${'-'.repeat(50)}`);
    console.log(`Validating domain: ${domain}`);
    console.log(`${'-'.repeat(50)}`);
    
    const results = {
        domain,
        format: false,
        dns: null,
        firebase: null,
        success: false
    };
    
    // Step 1: Validate domain format
    results.format = validateDomainFormat(domain);
    
    if (!results.format) {
        console.error(`✖ Invalid domain format: ${domain}`);
        return results;
    }
    
    console.log(`✓ Valid domain format: ${domain}`);
    
    // Step 2: Verify DNS records
    try {
        results.dns = await verifyDnsRecords(domain, options);
        
        if (results.dns.success) {
            console.log(`✓ DNS records verified successfully`);
            if (options.verbose) {
                console.log(JSON.stringify(results.dns.details, null, 2));
            }
        } else {
            console.error(`✖ DNS verification failed`);
            if (options.verbose || results.dns.details.error) {
                console.error(results.dns.details.error || JSON.stringify(results.dns.details, null, 2));
            }
        }
    } catch (error) {
        console.error(`✖ DNS verification error:`, error.message);
        results.dns = { success: false, error: error.message };
    }
    
    // Step 3: Verify Firebase hosting
    try {
        results.firebase = await verifyFirebaseHosting(domain);
        
        if (results.firebase.success) {
            console.log(`✓ Firebase hosting configured correctly`);
            if (options.verbose) {
                console.log(JSON.stringify(results.firebase.details, null, 2));
            }
        } else {
            console.error(`✖ Firebase hosting verification failed`);
            if (options.verbose || results.firebase.details.error) {
                console.error(results.firebase.details.error || JSON.stringify(results.firebase.details, null, 2));
            }
        }
    } catch (error) {
        console.error(`✖ Firebase verification error:`, error.message);
        results.firebase = { success: false, error: error.message };
    }
    
    // Overall validation result
    results.success = results.format && 
                      (results.dns && results.dns.success) && 
                      (results.firebase && results.firebase.success);
    
    console.log(`\nOverall validation ${results.success ? 'PASSED ✓' : 'FAILED ✖'}`);
    
    return results;
}

/**
 * Main function
 */
async function main() {
    try {
        const options = parseArgs();
        console.log(`Domain Validation - Environment: ${options.environment}${options.domain ? `, Domain: ${options.domain}` : ''}`);
        
        // Load environment variables
        loadEnvFile();
        
        // Get domains to validate
        const domains = await getDomainsToValidate(options);
        
        if (domains.length === 0) {
            console.error('No domains found to validate');
            process.exit(1);
        }
        
        console.log(`Found ${domains.length} domain(s) to validate`);
        
        // Validate each domain
        const results = [];
        for (const domain of domains) {
            const result = await validateDomain(domain, options);
            results.push(result);
        }
        
        // Summary
        console.log(`\n${'-'.repeat(50)}`);
        console.log('Validation Summary');
        console.log(`${'-'.repeat(50)}`);
        
        let allPassed = true;
        results.forEach(result => {
            console.log(`${result.domain}: ${result.success ? 'PASSED ✓' : 'FAILED ✖'}`);
            if (!result.success) allPassed = false;
        });
        
        console.log(`\nOverall validation: ${allPassed ? 'PASSED ✓' : 'FAILED ✖'}`);
        
        // Exit with appropriate code
        process.exit(allPassed ? 0 : 1);
    } catch (error) {
        console.error('Validation failed with error:', error.message);
        process.exit(1);
    }
}

// Run the main function
main();

