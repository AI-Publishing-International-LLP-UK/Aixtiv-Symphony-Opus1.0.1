/**
 * Domain Purchase and Registration Service
 *
 * Provides functionality to search, check availability, purchase, and configure domains
 * from GoDaddy directly into the Firebase infrastructure.
 */

'use strict';

const axios = require('axios');
const winston = require('winston');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'domain-purchase.log' })
  ]
});

// Configuration from environment variables
const config = {
  godaddy: {
    apiKey: process.env.GODADDY_API_KEY,
    apiSecret: process.env.GODADDY_API_SECRET,
    endpoint: process.env.GODADDY_API_URL || 'https://api.godaddy.com',
    shoppingApiEndpoint: 'https://api.godaddy.com/v1/shoppers',
    contactInfo: JSON.parse(process.env.GODADDY_CONTACT || '{}'),
    shopperId: process.env.GODADDY_SHOPPER_ID
  },
  defaults: {
    domainYears: parseInt(process.env.DEFAULT_DOMAIN_YEARS || '1', 10),
    privacy: process.env.DEFAULT_PRIVACY === 'true',
    renewAuto: process.env.DEFAULT_AUTO_RENEW === 'true'
  },
  throttling: {
    searchLimit: parseInt(process.env.SEARCH_THROTTLE_LIMIT || '5', 10),
    searchInterval: parseInt(process.env.SEARCH_THROTTLE_INTERVAL || '1000', 10),
    purchaseDelay: parseInt(process.env.PURCHASE_DELAY || '2000', 10)
  }
};

// Create axios instance for GoDaddy API
const godaddyApi = axios.create({
  baseURL: config.godaddy.endpoint,
  headers: {
    'Authorization': `sso-key ${config.godaddy.apiKey}:${config.godaddy.apiSecret}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000
});

/**
 * Search for available domains based on keywords
 * @param {string} keyword The keyword to search for
 * @param {Array} tlds List of TLDs to check (defaults to common ones)
 * @returns {Promise<Array>} List of available domains with pricing
 */
async function searchDomains(keyword, tlds = ['.com', '.net', '.org', '.io']) {
  if (!keyword) {
    throw new Error('Keyword is required for domain search');
  }

  try {
    logger.info(`Searching for domains with keyword: ${keyword}`);
    
    // Clean up keyword (remove spaces, special chars)
    const cleanKeyword = keyword.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-');
    
    if (!cleanKeyword) {
      throw new Error('Invalid keyword after cleaning');
    }
    
    // Build suggestions for each TLD
    const domainSuggestions = tlds.map(tld => `${cleanKeyword}${tld}`);
    
    // Check availability for all domain suggestions
    const availabilityRequests = [];
    
    for (let i = 0; i < domainSuggestions.length; i += 10) {
      const batch = domainSuggestions.slice(i, i + 10);
      const batchRequest = godaddyApi.post('/v1/domains/available', {
        domains: batch,
        checkType: 'FULL'
      });
      availabilityRequests.push(batchRequest);
      
      // Throttle API requests
      if (i + 10 < domainSuggestions.length) {
        await sleep(config.throttling.searchInterval);
      }
    }
    
    const responses = await Promise.all(availabilityRequests);
    
    // Process responses
    const availableDomains = [];
    
    responses.forEach(response => {
      const domains = response.data.domains || [];
      domains.forEach(domain => {
        if (domain.available) {
          availableDomains.push({
            name: domain.domain,
            available: true,
            price: domain.price / 1000000, // Convert from micro dollars
            currency: domain.currency || 'USD',
            tld: domain.domain.substring(domain.domain.lastIndexOf('.')),
            period: 1 // Default registration period in years
          });
        }
      });
    });
    
    logger.info(`Found ${availableDomains.length} available domains for keyword: ${keyword}`);
    return availableDomains;
  } catch (error) {
    logger.error(`Domain search failed: ${error.message}`, {
      error: error.response?.data || error.message
    });
    throw new Error(`Domain search failed: ${error.message}`);
  }
}

/**
 * Check if a specific domain is available
 * @param {string} domain The domain name to check
 * @returns {Promise<Object>} Domain availability info
 */
async function checkDomainAvailability(domain) {
  if (!domain) {
    throw new Error('Domain name is required');
  }

  try {
    logger.info(`Checking availability for domain: ${domain}`);
    
    const response = await godaddyApi.get(`/v1/domains/available?domain=${domain}&checkType=FULL`);
    
    const result = {
      name: domain,
      available: response.data.available,
      price: response.data.price ? response.data.price / 1000000 : null,
      currency: response.data.currency || 'USD'
    };
    
    logger.info(`Domain ${domain} is ${result.available ? 'available' : 'not available'}`);
    return result;
  } catch (error) {
    logger.error(`Domain availability check failed: ${error.message}`, {
      error: error.response?.data || error.message
    });
    throw new Error(`Domain availability check failed: ${error.message}`);
  }
}

/**
 * Purchase a domain through GoDaddy
 * @param {string} domain The domain to purchase
 * @param {Object} options Purchase options
 * @returns {Promise<Object>} Purchase result
 */
async function purchaseDomain(domain, options = {}) {
  if (!domain) {
    throw new Error('Domain name is required');
  }

  // Merge options with defaults
  const purchaseOptions = {
    years: options.years || config.defaults.domainYears,
    privacy: options.privacy !== undefined ? options.privacy : config.defaults.privacy,
    renewAuto: options.renewAuto !== undefined ? options.renewAuto : config.defaults.renewAuto,
    contactInfo: options.contactInfo || config.godaddy.contactInfo
  };
  
  // Validate contact info
  if (!purchaseOptions.contactInfo || !purchaseOptions.contactInfo.email) {
    throw new Error('Valid contact information is required for domain purchase');
  }

  try {
    // First check if domain is available
    const availabilityCheck = await checkDomainAvailability(domain);
    
    if (!availabilityCheck.available) {
      throw new Error(`Domain ${domain} is not available for purchase`);
    }
    
    logger.info(`Initiating purchase for domain: ${domain}`);
    
    // Get shopper ID or create a new one
    let shopperId = config.godaddy.shopperId;
    
    if (!shopperId) {
      // Create a new shopper
      const shopperResponse = await godaddyApi.post(`${config.godaddy.shoppingApiEndpoint}`, {
        email: purchaseOptions.contactInfo.email,
        firstName: purchaseOptions.contactInfo.firstName || 'Domain',
        lastName: purchaseOptions.contactInfo.lastName || 'Admin',
        externalId: `domain-manager-${Date.now()}`
      });
      
      shopperId = shopperResponse.data.shopperId;
      logger.info(`Created new shopper with ID: ${shopperId}`);
      
      // Save shopper ID for future use
      await fs.writeFile('.shopper-id', shopperId);
    }
    
    // Create domain purchase payload
    const purchasePayload = {
      consent: {
        agreementKeys: ["DNRA"], // Domain Name Registration Agreement
        agreedBy: purchaseOptions.contactInfo.email,
        agreedAt: new Date().toISOString()
      },
      domain: {
        domain: domain,
        renewAuto: purchaseOptions.renewAuto,
        privacy: purchaseOptions.privacy,
        period: purchaseOptions.years
      },
      contactAdmin: purchaseOptions.contactInfo,
      contactBilling: purchaseOptions.contactInfo,
      contactRegistrant: purchaseOptions.contactInfo,
      contactTech: purchaseOptions.contactInfo
    };
    
    // Process the purchase
    logger.info(`Submitting purchase for ${domain} (${purchaseOptions.years} years)`);
    
    const purchaseResponse = await godaddyApi.post(
      `${config.godaddy.shoppingApiEndpoint}/${shopperId}/domains/purchase`,
      purchasePayload
    );
    
    // Allow some time for domain to be registered
    await sleep(config.throttling.purchaseDelay);
    
    logger.info(`Successfully purchased domain: ${domain}`, {
      orderId: purchaseResponse.data.orderId,
      domain: domain
    });
    
    return {
      success: true,
      domain: domain,
      orderId: purchaseResponse.data.orderId,
      orderDetails: purchaseResponse.data
    };
  } catch (error) {
    logger.error(`Domain purchase failed: ${error.message}`, {
      error: error.response?.data || error.message,
      domain
    });
    throw new Error(`Domain purchase failed: ${error.message}`);
  }
}

/**
 * Get details about a purchased domain
 * @param {string} domain The domain to check
 * @returns {Promise<Object>} Domain details
 */
async function getDomainDetails(domain) {
  if (!domain) {
    throw new Error('Domain name is required');
  }

  try {
    logger.info(`Retrieving details for domain: ${domain}`);
    
    const response = await godaddyApi.get(`/v1/domains/${domain}`);
    
    logger.info(`Successfully retrieved details for domain: ${domain}`);
    return {
      success: true,
      domain: domain,
      details: response.data
    };
  } catch (error) {
    logger.error(`Failed to get domain details: ${error.message}`, {
      error: error.response?.data || error.message
    });
    throw new Error(`Failed to get domain details: ${error.message}`);
  }
}

/**
 * Create default DNS records for a domain
 * @param {string} domain The domain to configure
 * @param {Object} options DNS configuration options
 * @returns {Promise<Object>} DNS setup result
 */
async function setupDefaultDns(domain, options = {}) {
  if (!domain) {
    throw new Error('Domain name is required');
  }

  try {
    logger.info(`Setting up default DNS for domain: ${domain}`);
    
    // Define default records based on options
    const defaultRecords = [];
    
    // Add A records if provided
    if (options.ipAddress) {
      defaultRecords.push({
        type: 'A',
        name: '@',
        data: options.ipAddress,
        ttl: 3600
      });
      
      // Add www subdomain
      defaultRecords.push({
        type: 'A',
        name: 'www',
        data: options.ipAddress,
        ttl: 3600
      });
    }
    
    // Add MX records if provided
    if (options.mailProvider) {
      // Example for Google Workspace
      if (options.mailProvider === 'google') {
        defaultRecords.push(
          {
            type: 'MX',
            name: '@',
            data: 'aspmx.l.google.com',
            priority: 1,
            ttl: 3600
          },
          {
            type: 'MX',
            name: '@',
            data: 'alt1.aspmx.l.google.com',
            priority: 5,
            ttl: 3600
          },
          {
            type: 'MX',
            name: '@',
            data: 'alt2.aspmx.l.google.com',
            priority: 5,
            ttl: 3600
          }
        );
      }
    }
    
    // Add TXT record for Google verification if provided
    if (options.googleVerification) {
      defaultRecords.push({
        type: 'TXT',
        name: '@',
        data: `google-site-verification=${options.googleVerification}`,
        ttl: 3600
      });
    }
    
    // Add custom TXT records
    if (options.txtRecords && Array.isArray(options.txtRecords)) {
      options.txtRecords.forEach(record => {
        defaultRecords.push({
          type: 'TXT',
          name: record.name || '@',
          data: record.value,
          ttl: 3600
        });
      });
    }
    
    // Skip if no records to add
    if (defaultRecords.length === 0) {
      logger.info(`No DNS records to add for domain: ${domain}`);
      return {
        success: true,
        domain,
        message: 'No DNS records to add'
      };
    }
    
    // Update DNS records
    const response = await godaddyApi.put(
      `/v1/domains/${domain}/records`,
      defaultRecords
    );
    
    logger.info(`Successfully set up default DNS for domain: ${domain}`);
    return {
      success: true,
      domain,
      records: defaultRecords
    };
  } catch (error) {
    logger.error(`Failed to set up DNS: ${error.message}`, {
      error: error.response?.data || error.message
    });
    throw new Error(`Failed to set up DNS: ${error.message}`);
  }
}

/**
 * Complete domain purchase and setup workflow
 * @param {string} domain The domain to purchase and configure
 * @param {Object} options Configuration options
 * @returns {Promise<Object>} Complete setup result
 */
async function purchaseAndSetupDomain(domain, options = {}) {
  try {
    logger.info(`Starting complete domain purchase and setup for: ${domain}`);
    
    // Step 1: Purchase the domain
    const purchaseResult = await purchaseDomain(domain, {
      years: options.years,
      privacy: options.privacy,
      renewAuto: options.renewAuto,
      contactInfo: options.contactInfo
    });
    
    if (!purchaseResult.success) {
      return purchaseResult;
    }
    
    // Step 2: Wait for domain to be fully registered (important)
    logger.info(`Waiting for domain registration to complete for: ${domain}`);
    await sleep(10000); // 10 seconds minimum wait
    
    // Step 3: Set up default DNS
    const dnsResult = await setupDefaultDns(domain, {
      ipAddress: options.ipAddress,
      mailProvider: options.mailProvider,
      googleVerification: options.googleVerification,
      txtRecords: options.txtRecords
    });
    
    // Step 4: Return complete result
    return {
      success: true,
      domain,
      purchaseResult,
      dnsResult,
      message: `Domain ${domain} purchased and configured successfully`
    };
  } catch (error) {
    logger.error(`Complete domain setup failed: ${error.message}`);
    return {
      success: false,
      domain,
      error: error.message
    };
  }
}

// Export functions for module usage
module.exports = {
  searchDomains,
  checkDomainAvailability,
  purchaseDomain,
  getDomainDetails,
  setupDefaultDns,
  purchaseAndSetupDomain
};
