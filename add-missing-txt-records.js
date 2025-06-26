#!/usr/bin/env node

/**
 * Add Missing TXT Records for 2100.cool Subdomains
 * 
 * This script adds the required hosting-site TXT record to all subdomains
 * that don't already have it, ensuring they're all prepared for Firebase deployment.
 */

const { getDnsRecords, createGoDaddyClient } = require('./lib/api/providers/godaddy.js');
const fs = require('fs');
const path = require('path');

// The hosting-site TXT record value that all subdomains need
const HOSTING_SITE_RECORD = 'hosting-site=2100-cool-c624d';

// Rate limiting - delay between API calls
const API_DELAY = 2000; // 2 seconds between calls

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if a subdomain already has the hosting-site TXT record
 * @param {string} subdomain - The subdomain name (without .2100.cool)
 * @returns {Promise<boolean>} True if record exists
 */
async function hasHostingSiteRecord(subdomain) {
  try {
    const txtRecords = await getDnsRecords('2100.cool', { 
      type: 'TXT', 
      name: subdomain 
    });
    
    return txtRecords.some(record => 
      record.data && record.data.includes('hosting-site=2100-cool-c624d')
    );
  } catch (error) {
    console.log(`❌ Error checking ${subdomain}: ${error.message}`);
    return false;
  }
}

/**
 * Add hosting-site TXT record to a subdomain
 * @param {string} subdomain - The subdomain name
 * @returns {Promise<boolean>} True if successful
 */
async function addHostingSiteRecord(subdomain) {
  try {
    const client = createGoDaddyClient();
    
    // First get existing TXT records to preserve them
    let existingRecords = [];
    try {
      existingRecords = await getDnsRecords('2100.cool', { 
        type: 'TXT', 
        name: subdomain 
      });
    } catch (error) {
      // If no records exist, that's fine - we'll create new ones
      console.log(`ℹ️  No existing TXT records for ${subdomain}`);
    }
    
    // Check if hosting-site record already exists
    const hasRecord = existingRecords.some(record => 
      record.data && record.data.includes('hosting-site=2100-cool-c624d')
    );
    
    if (hasRecord) {
      console.log(`✅ ${subdomain} already has hosting-site record`);
      return true;
    }
    
    // Add the new hosting-site record to existing records
    const newRecord = {
      type: 'TXT',
      name: subdomain,
      data: HOSTING_SITE_RECORD,
      ttl: 1800
    };
    
    const allRecords = [...existingRecords, newRecord];
    
    // Update the TXT records
    const url = `/domains/2100.cool/records/TXT/${subdomain}`;
    await client.put(url, allRecords);
    
    console.log(`✅ Added hosting-site TXT record to ${subdomain}.2100.cool`);
    return true;
    
  } catch (error) {
    console.log(`❌ Failed to add TXT record to ${subdomain}: ${error.message}`);
    return false;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔧 Adding Missing TXT Records for 2100.cool Subdomains');
  console.log('=' .repeat(60));
  
  // Load the subdomain list
  const subdomainsFile = path.join(__dirname, 'domains', '2100-cool-subdomains.txt');
  
  if (!fs.existsSync(subdomainsFile)) {
    console.error('❌ Subdomains file not found. Run fetch-2100-cool-domains.js first.');
    process.exit(1);
  }
  
  const subdomains = fs.readFileSync(subdomainsFile, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('*')) // Skip wildcard entries
    .map(domain => domain.replace('.2100.cool', '')); // Extract subdomain part
  
  console.log(`📋 Found ${subdomains.length} subdomains to check`);
  console.log();
  
  let processed = 0;
  let added = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const subdomain of subdomains) {
    processed++;
    console.log(`[${processed}/${subdomains.length}] Checking ${subdomain}.2100.cool...`);
    
    try {
      const hasRecord = await hasHostingSiteRecord(subdomain);
      
      if (hasRecord) {
        console.log(`✅ ${subdomain} already has hosting-site record`);
        skipped++;
      } else {
        console.log(`🔧 Adding hosting-site record to ${subdomain}...`);
        const success = await addHostingSiteRecord(subdomain);
        
        if (success) {
          added++;
        } else {
          errors++;
        }
      }
      
      // Rate limiting - wait between API calls
      if (processed < subdomains.length) {
        console.log(`⏱️  Waiting ${API_DELAY/1000}s before next request...`);
        await sleep(API_DELAY);
      }
      
    } catch (error) {
      console.log(`❌ Error processing ${subdomain}: ${error.message}`);
      errors++;
    }
    
    console.log();
  }
  
  // Summary
  console.log('📊 TXT Record Addition Summary');
  console.log('=' .repeat(40));
  console.log(`Total processed: ${processed}`);
  console.log(`Records added: ${added}`);
  console.log(`Already had record: ${skipped}`);
  console.log(`Errors: ${errors}`);
  
  if (added > 0) {
    console.log(`\n✅ Successfully added hosting-site TXT records to ${added} subdomains!`);
    console.log('🚀 All subdomains are now prepared for Firebase deployment.');
  }
  
  if (errors > 0) {
    console.log(`\n⚠️  ${errors} subdomains had errors. Please check the logs above.`);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = { main, addHostingSiteRecord, hasHostingSiteRecord };
