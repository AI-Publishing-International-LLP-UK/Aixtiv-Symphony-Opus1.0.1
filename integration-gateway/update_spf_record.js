#!/usr/bin/env node

/**
 * SPF Record Update Script
 * 
 * This script consolidates multiple SPF records for coaching2100.com into a single record
 * to comply with RFC 7208, which states domains should not have multiple SPF records.
 */

const { GoDaddyService } = require('./services/godaddy.service');
const { GoDaddyConfig } = require('./configs/godaddy.config');
const path = require('path');
const fs = require('fs');

// Configuration for the domain and the new SPF record
const DOMAIN = 'coaching2100.com';
const NEW_SPF_RECORD = 'v=spf1 include:dc-aa8e722993._spfm.coaching2100.com include:outbound.smtp.wisestamp.net -all';
const DNS_RECORD_TYPE = 'TXT';
const DEFAULT_TTL = 3600; // 1 hour in seconds

/**
 * Loads environment variables from .env file
 * @param {string} envPath - Path to the environment file
 * @returns {boolean} Success status
 */
function loadEnvironment(envPath) {
    try {
        if (fs.existsSync(envPath)) {
            const envConfig = fs.readFileSync(envPath, 'utf8')
                .split('\n')
                .filter(line => line.trim() !== '' && !line.startsWith('#'))
                .reduce((env, line) => {
                    const [key, value] = line.split('=');
                    env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
                    return env;
                }, {});

            // Set environment variables
            Object.keys(envConfig).forEach(key => {
                process.env[key] = envConfig[key];
            });
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error loading environment variables:', error.message);
        return false;
    }
}

/**
 * Updates the SPF record for the specified domain
 */
async function updateSPFRecord() {
    console.log(`Starting SPF record update for ${DOMAIN}...`);
    
    try {
        // Create an instance of GoDaddyService
        const godaddyConfig = new GoDaddyConfig();
        const godaddyService = new GoDaddyService(godaddyConfig);
        
        // Fetch current DNS records
        console.log('Fetching current DNS records...');
        const records = await godaddyService.getDNSRecords(DOMAIN, DNS_RECORD_TYPE);
        
        // Find existing SPF records
        const spfRecords = records.filter(record => 
            record.data && record.data.startsWith('v=spf1')
        );
        
        if (spfRecords.length > 0) {
            console.log(`Found ${spfRecords.length} existing SPF records:`);
            spfRecords.forEach(record => {
                console.log(`- ${record.data} (TTL: ${record.ttl})`);
            });
        } else {
            console.log('No existing SPF records found');
        }
        
        // Prepare records to keep (non-SPF records)
        const recordsToKeep = records.filter(record => 
            !record.data || !record.data.startsWith('v=spf1')
        );
        
        // Add the new consolidated SPF record
        const newSPFRecord = {
            data: NEW_SPF_RECORD,
            name: '@',
            ttl: spfRecords.length > 0 ? spfRecords[0].ttl : DEFAULT_TTL,
            type: DNS_RECORD_TYPE
        };
        
        recordsToKeep.push(newSPFRecord);
        
        // Update DNS records
        console.log('Updating DNS records with consolidated SPF record...');
        await godaddyService.updateDNSRecords(DOMAIN, DNS_RECORD_TYPE, recordsToKeep);
        
        console.log('✅ SPF record updated successfully!');
        console.log(`New SPF record: ${NEW_SPF_RECORD}`);
    } catch (error) {
        console.error('❌ Failed to update SPF record:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        process.exit(1);
    }
}

/**
 * Main execution function
 */
async function main() {
    // Load environment variables
    const envPath = path.resolve(__dirname, 'deployments/cloud-run/environments/prod.env');
    const loaded = loadEnvironment(envPath);
    
    if (!loaded) {
        console.warn('⚠️ Environment file not found. Make sure GoDaddy API credentials are set in environment variables.');
    }
    
    // Check for required environment variables
    const requiredVars = ['GODADDY_API_KEY', 'GODADDY_API_SECRET'];
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
        console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
        console.error('Please set these variables in your environment or in the .env file');
        process.exit(1);
    }
    
    // Run the update function
    await updateSPFRecord();
}

// Execute the script if it's run directly
if (require.main === module) {
    main().catch(error => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}

// Export for testing or importing
module.exports = {
    updateSPFRecord,
    NEW_SPF_RECORD
};

