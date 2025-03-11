const admin = require('firebase-admin');
const axios = require('axios');
const fs = require('fs').promises;

// Configuration
const config = {
    site: 'website-builds',  // Your Firebase project ID
    serviceAccountPath: './service-account-key.json',
    batchSize: 10,  // Number of domains to process in parallel
    retryAttempts: 3,
    delayBetweenRetries: 2000  // 2 seconds
};

// Initialize Firebase Admin SDK
try {
    admin.initializeApp({
        credential: admin.credential.cert(require(config.serviceAccountPath))
    });
} catch (error) {
    console.error('Failed to initialize Firebase:', error.message);
    process.exit(1);
}

async function getAccessToken() {
    try {
        const token = await admin.app().options.credential.getAccessToken();
        return token.access_token;
    } catch (error) {
        throw new Error(`Failed to get access token: ${error.message}`);
    }
}

async function addDomain(domain, accessToken) {
    const url = `https://firebasehosting.googleapis.com/v1beta1/sites/${config.site}/domains`;
    
    const payload = {
        domainName: domain,
        type: "USER_OWNED",
        site: `sites/${config.site}`,
        provisioning: {
            dns: {
                status: "PENDING"
            }
        }
    };

    try {
        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Successfully added domain: ${domain}`);
        console.log('DNS Configuration:', JSON.stringify(response.data.dnsRecords, null, 2));
        return { success: true, domain, data: response.data };
    } catch (error) {
        const errorDetails = error.response?.data || error.message;
        console.error(`Failed to add domain ${domain}:`, errorDetails);
        return { success: false, domain, error: errorDetails };
    }
}

async function processDomainsInBatches(domains) {
    const results = {
        successful: [],
        failed: []
    };

    try {
        const accessToken = await getAccessToken();
        
        // Process domains in batches
        for (let i = 0; i < domains.length; i += config.batchSize) {
            const batch = domains.slice(i, i + config.batchSize);
            console.log(`Processing batch ${Math.floor(i/config.batchSize) + 1}...`);

            const batchResults = await Promise.all(
                batch.map(async (domain) => {
                    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
                        const result = await addDomain(domain, accessToken);
                        if (result.success) {
                            return result;
                        }
                        if (attempt < config.retryAttempts) {
                            console.log(`Retrying ${domain} (attempt ${attempt + 1}/${config.retryAttempts})...`);
                            await new Promise(resolve => setTimeout(resolve, config.delayBetweenRetries));
                        }
                    }
                    return { success: false, domain, error: `Failed after ${config.retryAttempts} attempts` };
                })
            );

            // Categorize results
            batchResults.forEach(result => {
                if (result.success) {
                    results.successful.push(result.domain);
                } else {
                    results.failed.push({ domain: result.domain, error: result.error });
                }
            });
        }
    } catch (error) {
        console.error('Failed to process domains:', error);
        process.exit(1);
    }

    return results;
}

// Test with a single domain first
async function main() {
    const testDomains = ['vision.coaching2100.com'];
    
    console.log('Starting domain addition process...');
    const results = await processDomainsInBatches(testDomains);
    
    console.log('\nProcessing complete!');
    console.log('Successful domains:', results.successful);
    if (results.failed.length > 0) {
        console.log('Failed domains:', results.failed);
    }
}

main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
});

const admin = require('firebase-admin');
const axios = require('axios');
const fs = require('fs').promises;

// Configuration
const config = {
    site: 'api-for-warp-drive',  // Your Firebase project ID
    serviceAccountPath: './service-account-key.json',
    batchSize: 10,  // Number of domains to process in parallel
    retryAttempts: 3,
    delayBetweenRetries: 2000  // 2 seconds
};

// Initialize Firebase Admin SDK
try {
    admin.initializeApp({
        credential: admin.credential.cert(require(config.serviceAccountPath))
    });
} catch (error) {
    console.error('Failed to initialize Firebase Admin:', error.message);
    process.exit(1);
}

async function getAccessToken() {
    try {
        const token = await admin.app().options.credential.getAccessToken();
        return token.access_token;
    } catch (error) {
        throw new Error(`Failed to get access token: ${error.message}`);
    }
}

async function addDomain(domain, accessToken) {
    const url = `https://firebasehosting.googleapis.com/v1beta1/sites/${config.site}/domains`;
    
    const payload = {
        domainName: domain,
        type: "USER_OWNED",
        site: `sites/${config.site}`,
        provisioning: {
            dns: {
                status: "PENDING"
            }
        }
    };

    try {
        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Successfully added domain: ${domain}`);
        console.log('DNS Configuration:', JSON.stringify(response.data.dnsRecords, null, 2));
        return { success: true, domain, data: response.data };
    } catch (error) {
        const errorDetails = error.response?.data || error.message;
        console.error(`Failed to add domain ${domain}:`, errorDetails);
        return { success: false, domain, error: errorDetails };
    }
}

async function processDomainsInBatches(domains) {
    const results = {
        successful: [],
        failed: []
    };

    try {
        const accessToken = await getAccessToken();
        
        // Process domains in batches
        for (let i = 0; i < domains.length; i += config.batchSize) {
            const batch = domains.slice(i, i + config.batchSize);
            console.log(`Processing batch ${Math.floor(i/config.batchSize) + 1}...`);

            const batchResults = await Promise.all(
                batch.map(async (domain) => {
                    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
                        const result = await addDomain(domain, accessToken);
                        if (result.success) {
                            return result;
                        }
                        if (attempt < config.retryAttempts) {
                            console.log(`Retrying ${domain} (attempt ${attempt + 1}/${config.retryAttempts})...`);
                            await new Promise(resolve => setTimeout(resolve, config.delayBetweenRetries));
                        }
                    }
                    return { success: false, domain, error: `Failed after ${config.retryAttempts} attempts` };
                })
            );

            // Categorize results
            batchResults.forEach(result => {
                if (result.success) {
                    results.successful.push(result.domain);
                } else {
                    results.failed.push({ domain: result.domain, error: result.error });
                }
            });
        }
    } catch (error) {
        console.error('Failed to process domains:', error);
        process.exit(1);
    }

    return results;
}

// Test with a single domain first
async function main() {
    const testDomains = ['vision.coaching2100.com'];
    
    console.log('Starting domain addition process...');
    const results = await processDomainsInBatches(testDomains);
    
    console.log('\nProcessing complete!');
    console.log('Successful domains:', results.successful);
    if (results.failed.length > 0) {
        console.log('Failed domains:', results.failed);
    }
}

main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
});

const admin = require('firebase-admin');
const axios = require('axios');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

// Initialize Firebase Admin SDK
const serviceAccount = require('./service-account-key.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// Configuration
const config = {
    projectId: 'api-for-warp-drive',
    site: 'vision-coaching-domain',
    retryAttempts: 3,
    retryDelay: 1000, // milliseconds
    batchSize: 10,    // number of domains to process in parallel
};

/**
 * Get an access token for the Firebase Management API
 * @returns {Promise<string>} The access token
 */
async function getAccessToken() {
    try {
        const token = await admin.app().options.credential.getAccessToken();
        return token.access_token;
    } catch (error) {
        console.error('Error getting access token:', error);
        throw error;
    }
}

/**
 * Add a single domain to Firebase Hosting
 * @param {string} domain The domain to add
 * @param {string} accessToken The access token for authentication
 * @returns {Promise<Object>} The response from the API
 */
async function addDomain(domain, accessToken) {
    const url = `https://firebasehosting.googleapis.com/v1beta1/sites/${config.site}/domains`;
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };
    const data = {
        domainName: domain,
        provisioning: {
            certificateProvisioning: true
        }
    };

    try {
        const response = await axios.post(url, data, { headers });
        return response.data;
    } catch (error) {
        console.error(`Error adding domain ${domain}:`, error.response?.data || error.message);
        throw error;
    }
}

/**
 * Check the status of a domain connection
 * @param {string} domain The domain to check
 * @param {string} accessToken The access token for authentication
 * @returns {Promise<Object>} The domain status
 */
async function checkDomainStatus(domain, accessToken) {
    const url = `https://firebasehosting.googleapis.com/v1beta1/sites/${config.site}/domains/${domain}`;
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };

    try {
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        console.error(`Error checking domain ${domain}:`, error.response?.data || error.message);
        throw error;
    }
}

/**
 * Add a domain with retry logic
 * @param {string} domain The domain to add
 * @param {string} accessToken The access token for authentication
 * @returns {Promise<Object>} The result of the operation
 */
async function addDomainWithRetry(domain, accessToken) {
    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
        try {
            const result = await addDomain(domain, accessToken);
            console.log(`Successfully added domain: ${domain}`);
            return result;
        } catch (error) {
            if (attempt === config.retryAttempts) {
                console.error(`Failed to add domain ${domain} after ${config.retryAttempts} attempts`);
                throw error;
            }
            console.warn(`Attempt ${attempt} failed for ${domain}, retrying...`);
            await sleep(config.retryDelay * attempt); // Exponential backoff
        }
    }
}

/**
 * Process domains in batches
 * @param {string[]} domains List of domains to process
 */
async function processDomainsBatch(domains) {
    const accessToken = await getAccessToken();
    const results = {
        successful: [],
        failed: []
    };

    // Process domains in batches
    for (let i = 0; i < domains.length; i += config.batchSize) {
        const batch = domains.slice(i, i + config.batchSize);
        console.log(`Processing batch ${i / config.batchSize + 1}...`);

        const batchPromises = batch.map(async (domain) => {
            try {
                await addDomainWithRetry(domain, accessToken);
                results.successful.push(domain);
            } catch (error) {
                results.failed.push({ domain, error: error.message });
            }
        });

        await Promise.all(batchPromises);
        
        // Small delay between batches to avoid rate limiting
        if (i + config.batchSize < domains.length) {
            await sleep(1000);
        }
    }

    return results;
}

/**
 * Main execution function
 */
async function main() {
    try {
        // Test case with a single domain
        const testDomain = 'vision.coaching2100.com';
        console.log(`Testing with domain: ${testDomain}`);
        
        const results = await processDomainsBatch([testDomain]);
        
        console.log('\nResults:');
        console.log('Successful domains:', results.successful);
        if (results.failed.length > 0) {
            console.log('Failed domains:', results.failed);
        }

        // For the successful domains, check their status
        const accessToken = await getAccessToken();
        for (const domain of results.successful) {
            const status = await checkDomainStatus(domain, accessToken);
            console.log(`\nStatus for ${domain}:`, status);
        }
    } catch (error) {
        console.error('Error in main execution:', error);
        process.exit(1);
    }
}

// Execute the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    addDomain,
    checkDomainStatus,
    processDomainsBatch
};

