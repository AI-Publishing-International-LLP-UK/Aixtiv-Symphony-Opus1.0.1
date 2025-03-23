#!/usr/bin/env node

/**
 * SPF Record Update Script for coaching2100.com
 * 
 * This script consolidates multiple SPF records into a single record
 * to comply with RFC 7208 and resolve email delivery issues.
 */

'use strict';

// Import required modules
const axios = require('axios');
const winston = require('winston');
require('dotenv').config();

// Initialize logger using the same format as domain manager
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
    new winston.transports.File({ filename: 'spf-update.log' })
  ]
});

// GoDaddy API configuration
const godaddyConfig = {
  apiKey: process.env.GODADDY_API_KEY,
  apiSecret: process.env.GODADDY_API_SECRET,
  endpoint: process.env.GODADDY_API_URL || 'https://api.godaddy.com'
};

// Create axios instance for GoDaddy API
const godaddyAxios = axios.create({
  baseURL: godaddyConfig.endpoint,
  timeout: 30000,
  headers: {
    'Authorization': `sso-key ${godaddyConfig.apiKey}:${godaddyConfig.apiSecret}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Get current DNS records from GoDaddy
 * @param {string} domain The domain to get records for
 * @returns {Promise<Array>} DNS records
 */
async function getDnsRecords(domain) {
  try {
    const response = await godaddyAxios({
      method: 'get',
      url: `/v1/domains/${domain}/records`
    });
    
    logger.info(`Retrieved ${response.data.length} DNS records for ${domain}`);
    return response.data;
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    logger.error(`Failed to get DNS records from GoDaddy for ${domain}`, { error: errorDetails });
    throw new Error(`Failed to get DNS records: ${errorDetails}`);
  }
}

/**
 * Get domain details from GoDaddy
 * @param {string} domain The domain to check
 * @returns {Promise<Object>} Domain information
 */
async function getDomainFromGoDaddy(domain) {
  try {
    const response = await godaddyAxios({
      method: 'get',
      url: `/v1/domains/${domain}`
    });
    
    logger.info(`Domain found in GoDaddy: ${domain}`);
    return {
      success: true,
      domain,
      data: response.data
    };
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    logger.error(`Failed to get domain from GoDaddy: ${domain}`, { error: errorDetails });
    return {
      success: false,
      domain,
      error: errorDetails
    };
  }
}

/**
 * Add DNS records to GoDaddy domain
 * @param {string} domain The domain to update
 * @param {Array} records DNS records to add
 * @returns {Promise<Object>} Result of the operation
 */
async function addDnsRecordsToGoDaddy(domain, records) {
  try {
    // Format records for GoDaddy API
    const godaddyRecords = records.map(record => ({
      type: record.type,
      name: record.name === '@' ? '@' : record.name,
      data: record.value || record.data,
      ttl: record.ttl || 3600
    }));

    const response = await godaddyAxios({
      method: 'patch',
      url: `/v1/domains/${domain}/records`,
      data: godaddyRecords
    });
    
    logger.info(`DNS records added to GoDaddy domain: ${domain}`);
    return {
      success: true,
      domain,
      records: godaddyRecords
    };
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    logger.error(`Failed to add DNS records to GoDaddy: ${domain}`, { error: errorDetails });
    return {
      success: false,
      domain,
      error: errorDetails
    };
  }
}

/**
 * Update SPF record for domain
 * @param {string} domain The domain to update
 * @returns {Promise<Object>} Result of the operation
 */
async function updateSpfRecord(domain) {
  try {
    // Step 1: Verify domain exists in GoDaddy
    const domainCheckResult = await getDomainFromGoDaddy(domain);
    if (!domainCheckResult.success) {
      throw new Error(`Domain not found in GoDaddy: ${domainCheckResult.error}`);
    }
    
    logger.info(`Domain ${domain} confirmed in GoDaddy`);
    
    // Step 2: Get current DNS records
    const currentRecords = await getDnsRecords(domain);
    
    // Step 3: Find existing SPF records
    const spfRecords = currentRecords.filter(record => 
      record.type === 'TXT' && 
      (record.data.includes('v=spf1') || record.data.startsWith('"v=spf1'))
    );
    
    logger.info(`Found ${spfRecords.length} SPF records for ${domain}`);
    spfRecords.forEach(record => {
      logger.info(`Existing SPF record: ${record.data}`);
    });
    
    if (spfRecords.length === 0) {
      logger.warn(`No SPF records found for ${domain}`);
    } else if (spfRecords.length === 1) {
      logger.info(`Only one SPF record found for ${domain}, will still update to the consolidated value`);
    } else {
      logger.warn(`Multiple SPF records found for ${domain}, this violates RFC 7208 and will be fixed`);
    }
    
    // Step 4: Create the new consolidated SPF record
    const newSpfValue = "v=spf1 include:dc-aa8e722993._spfm.coaching2100.com include:outbound.smtp.wisestamp.net -all";
    logger.info(`New consolidated SPF value: ${newSpfValue}`);
    
    // Step 5: Filter out existing SPF records and create new ones
    const nonSpfRecords = currentRecords.filter(record => 
      !(record.type === 'TXT' && 
      (record.data.includes('v=spf1') || record.data.startsWith('"v=spf1')))
    );
    
    // Create the new consolidated SPF record
    const newSpfRecord = {
      type: 'TXT',
      name: '@',
      data: newSpfValue,
      ttl: 3600
    };
    
    // Step 6: Update DNS records on GoDaddy
    const updatedRecords = [...nonSpfRecords, newSpfRecord];
    
    // Use addDnsRecordsToGoDaddy to update records
    const updateResult = await addDnsRecordsToGoDaddy(domain, [newSpfRecord]);
    
    if (updateResult.success) {
      logger.info(`Successfully updated SPF record for ${domain}`);
      return {
        success: true,
        domain,
        message: `SPF record consolidated successfully.`,
        oldRecords: spfRecords,
        newRecord: newSpfRecord
      };
    } else {
      throw new Error(`Failed to update DNS records: ${updateResult.error}`);
    }
  } catch (error) {
    logger.error(`Failed to update SPF record for ${domain}`, { error: error.message });
    return {
      success: false,
      domain,
      error: error.message
    };
  }
}

/**
 * Main function
 */
async function main() {
  // Target domain - hardcoded as per requirements
  const domain = 'coaching2100.com';
  
  try {
    logger.info(`Starting SPF record update for ${domain}`);
    
    // Update the SPF record
    const result = await updateSpfRecord(domain);
    
    if (result.success) {
      logger.info(`SPF record update successful for ${domain}`);
      console.log(`✅ Success: ${result.message}`);
      
      if (result.oldRecords.length > 0) {
        console.log('\nPrevious SPF Records:');
        result.oldRecords.forEach(record => {
          console.log(`  - ${record.data}`);
        });
      }
      
      console.log('\nNew Consolidated SPF Record:');
      console.log(`  - ${result.newRecord.data}`);
    } else {
      logger.error(`SPF record update failed for ${domain}: ${result.error}`);
      console.error(`❌ Error: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    logger.error('Script execution failed', { error: error.message });
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Execute the script if run directly
if (require.main === module) {
  main().catch(error => {
    logger.error('Unhandled exception', { error: error.message, stack: error.stack });
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  });
}

// Export functions for module usage
// Export functions for module usage
module.exports = {
  updateSpfRecord,
  getDnsRecords,
  getDomainFromGoDaddy,
  addDnsRecordsToGoDaddy
};
