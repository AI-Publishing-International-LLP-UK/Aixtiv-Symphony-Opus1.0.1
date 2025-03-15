/**
 * Domain Validation Script
 * 
 * Validates domain lists before processing in CI/CD pipeline
 */

'use strict';

const fs = require('fs').promises;
const path = require('path');
const dns = require('dns').promises;

// Configuration
const domainFiles = [
  'domains/desktop.txt',
  'domains/mobile.txt'
];

// Domain validation regex
const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;

// Validation results
const results = {
  valid: [],
  invalid: [],
  duplicates: []
};

/**
 * Validate a single domain
 * @param {string} domain Domain to validate
 * @returns {boolean} True if valid
 */
function isValidDomain(domain) {
  return domainRegex.test(domain);
}

/**
 * Read domain file and extract domains
 * @param {string} filePath Path to the domain file
 * @returns {Promise<string[]>} List of domains
 */
async function readDomainFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Extract domains, skipping comments and empty lines
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`Warning: File not found: ${filePath}`);
      return [];
    }
    throw error;
  }
}

/**
 * Check for duplicate domains across files
 * @param {Object} domainsByFile Map of domains by file
 * @returns {Object} Duplicate information
 */
function findDuplicates(domainsByFile) {
  const domainSeen = {};
  const duplicates = [];
  
  Object.entries(domainsByFile).forEach(([file, domains]) => {
    domains.forEach(domain => {
      if (!domainSeen[domain]) {
        domainSeen[domain] = [file];
      } else {
        domainSeen[domain].push(file);
      }
    });
  });
  
  Object.entries(domainSeen).forEach(([domain, files]) => {
    if (files.length > 1) {
      duplicates.push({
        domain,
        files
      });
    }
  });
  
  return duplicates;
}

/**
 * Attempt to resolve a domain to verify it exists
 * @param {string} domain Domain to check
 * @returns {Promise<boolean>} True if domain has valid DNS
 */
async function checkDomainDns(domain) {
  try {
    await dns.resolve(domain);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Main validation function
 */
async function validateDomains() {
  // Initialize results
  results.valid = [];
  results.invalid = [];
  results.duplicates = [];
  
  // File-based domain tracking
  const domainsByFile = {};
  
  // Process each domain file
  for (const file of domainFiles) {
    try {
      console.log(`Processing ${file}...`);
      const domains = await readDomainFile(file);
      domainsByFile[file] = domains;
      
      console.log(`Found ${domains.length} domains in ${file}`);
      
      // Validate domains
      for (const domain of domains) {
        if (isValidDomain(domain)) {
          results.valid.push({
            domain,
            file
          });
        } else {
          results.invalid.push({
            domain,
            file,
            reason: 'Invalid domain format'
          });
        }
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
  
  // Check for duplicates
  results.duplicates = findDuplicates(domainsByFile);
  
  // Optional: DNS checks for valid domains
  if (process.env.CHECK_DNS === 'true') {
    console.log('Performing DNS checks...');
    for (const entry of results.valid) {
      const hasDns = await checkDomainDns(entry.domain);
      if (!hasDns) {
        console.warn(`Warning: No DNS records found for ${entry.domain} in ${entry.file}`);
      }
    }
  }
  
  // Output validation results
  console.log('\nValidation Results:');
  console.log(`- Valid domains: ${results.valid.length}`);
  console.log(`- Invalid domains: ${results.invalid.length}`);
  console.log(`- Duplicate domains: ${results.duplicates.length}`);
  
  if (results.invalid.length > 0) {
    console.log('\nInvalid Domains:');
    results.invalid.forEach(({ domain, file, reason }) => {
      console.log(`- ${domain} (${file}): ${reason}`);
    });
  }
  
  if (results.duplicates.length > 0) {
    console.log('\nDuplicate Domains:');
    results.duplicates.forEach(({ domain, files }) => {
      console.log(`- ${domain} in files: ${files.join(', ')}`);
    });
  }
  
  // Exit with error if problems found
  if (results.invalid.length > 0 || results.duplicates.length > 0) {
    process.exit(1);
  }
  
  console.log('\nValidation successful!');
}

// Execute validation
validateDomains().catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});
