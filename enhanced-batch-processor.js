#!/usr/bin/env node
/**
 * Enhanced Batch Domain Processor for Aixtiv Symphony
 * 
 * This script enhances the batch domain processing with:
 * - Improved error recovery for partial failures
 * - Enhanced site ID generation for special character domains
 * - Auto-resuming of interrupted operations
 * - Detailed logging and reporting
 * 
 * Usage:
 *   node enhanced-batch-processor.js --input=domains.txt --project=project-id
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const util = require('util');
const punycode = require('punycode');

// Convert exec to Promise-based for async/await
const execAsync = util.promisify(exec);

// Parse command line arguments
const args = process.argv.slice(2).reduce((result, arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    result[key] = value;
  }
  return result;
}, {});

// Configuration
const CONFIG = {
  PROJECT_ID: args.project || 'api-for-warp-drive',
  INPUT_FILE: args.input || path.join(__dirname, 'domains', 'active-domains.txt'),
  RESUME_FILE: args.resume || path.join(__dirname, 'batch-processing-state.json'),
  MAPPING_FILE: args.mapping || path.join(__dirname, 'domain-site-id-mapping.json'),
  BATCH_SIZE: parseInt(args.batchSize || '5', 10),
  BATCH_DELAY: parseInt(args.delay || '3600000', 10), // 1 hour default
  RETRY_DELAY: parseInt(args.retryDelay || '300000', 10), // 5 minutes default
  MAX_RETRIES: parseInt(args.maxRetries || '3', 10),
  LOG_FILE: args.log || path.join(__dirname, 'batch-processor.log'),
  OUTPUT_DIR: args.output || path.join(__dirname, 'batch-results')
};

// Ensure directories exist
if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
  fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
}

// Setup logging
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '[ INFO ]',
    error: '[ERROR ]',
    success: '[  OK  ]',
    warning: '[ WARN ]'
  }[type] || '[ INFO ]';
  
  const formattedMessage = `${prefix} ${timestamp} - ${message}`;
  console.log(formattedMessage);
  
  // Append to log file
  fs.appendFileSync(CONFIG.LOG_FILE, `${formattedMessage}\n`);
}

// Site ID mapping to store original domain to site ID relationships
let siteIdMapping = {};
if (fs.existsSync(CONFIG.MAPPING_FILE)) {
  try {
    siteIdMapping = JSON.parse(fs.readFileSync(CONFIG.MAPPING_FILE, 'utf8'));
  } catch (e) {
    log(`Error loading mapping file: ${e.message}`, 'error');
    siteIdMapping = {};
  }
}

/**
 * Read domains from file
 */
function readDomains() {
  if (!fs.existsSync(CONFIG.INPUT_FILE)) {
    log(`Input file not found: ${CONFIG.INPUT_FILE}`, 'error');
    return [];
  }
  
  const domains = fs.readFileSync(CONFIG.INPUT_FILE, 'utf8')
    .split('\n')
    .map(d => d.trim())
    .filter(d => d && !d.startsWith('#'));
  
  log(`Loaded ${domains.length} domains from ${CONFIG.INPUT_FILE}`);
  return domains;
}

/**
 * Generate a valid site ID from a domain name
 * Handles special characters by using punycode encoding
 */
function generateSiteId(domain) {
  // First, normalize the domain by converting to lowercase
  let normalizedDomain = domain.toLowerCase();
  
  // Check if the domain has special characters
  const hasSpecialChars = /[^\x00-\x7F]/.test(normalizedDomain);
  
  // If the domain has special characters, use punycode
  if (hasSpecialChars) {
    // Convert to punycode
    const punycodeEncoded = punycode.toASCII(normalizedDomain);
    
    // Replace dots with hyphens and ensure valid Firebase site ID
    const siteId = punycodeEncoded.replace(/\./g, '-')
      // Remove any characters not allowed in site IDs
      .replace(/[^a-z0-9-]/g, '')
      // Ensure site ID is not too long (max 63 characters)
      .slice(0, 63);
    
    // Store mapping for reference
    siteIdMapping[normalizedDomain] = siteId;
    
    return siteId;
  }
  
  // For regular domains, simply replace dots with hyphens
  const siteId = normalizedDomain.replace(/\./g, '-');
  
  // Store mapping for reference
  siteIdMapping[normalizedDomain] = siteId;
  
  return siteId;
}

/**
 * Save processing state for resumability
 */
function saveProcessingState(state) {
  try {
    fs.writeFileSync(CONFIG.RESUME_FILE, JSON.stringify(state, null, 2));
    log(`Processing state saved to ${CONFIG.RESUME_FILE}`, 'info');
  } catch (error) {
    log(`Error saving processing state: ${error.message}`, 'error');
  }
}

/**
 * Load processing state for resumability
 */
function loadProcessingState() {
  if (fs.existsSync(CONFIG.RESUME_FILE)) {
    try {
      const state = JSON.parse(fs.readFileSync(CONFIG.RESUME_FILE, 'utf8'));
      log(`Loaded processing state from ${CONFIG.RESUME_FILE}`, 'info');
      return state;
    } catch (error) {
      log(`Error loading processing state: ${error.message}`, 'error');
    }
  }
  
  return null;
}

/**
 * Create Firebase hosting site for a domain
 */
async function createFirebaseSite(domain) {
  const siteId = generateSiteId(domain);
  
  try {
    log(`Creating Firebase hosting site for ${domain} (${siteId})`);
    
    // Check if site already exists
    try {
      await execAsync(`firebase hosting:sites:get ${siteId} --project ${CONFIG.PROJECT_ID}`);
      log(`Site ${siteId} already exists, skipping creation`, 'success');
      return { success: true, siteId };
    } catch (error) {
      // Site doesn't exist, proceed with creation
      if (error.message.includes('not found')) {
        log(`Site ${siteId} not found, creating new site`);
      } else {
        throw error;
      }
    }
    
    // Create site
    const { stdout, stderr } = await execAsync(
      `firebase hosting:sites:create ${siteId} --project ${CONFIG.PROJECT_ID}`
    );
    
    if (stderr && stderr.includes('Error')) {
      throw new Error(stderr);
    }
    
    log(`Successfully created site ${siteId} for ${domain}`, 'success');
    return { success: true, siteId };
  } catch (error) {
    if (error.message.includes('429') || error.message.includes('quota')) {
      log(`Quota limit reached for site creation: ${error.message}`, 'error');
      return { success: false, siteId, quotaError: true, error: error.message };
    }
    
    log(`Failed to create site for ${domain}: ${error.message}`, 'error');
    return { success: false, siteId, error: error.message };
  }
}

/**
 * Connect domain to Firebase hosting
 */
async function connectDomainToFirebase(domain, siteId) {
  try {
    log(`Connecting domain ${domain} to Firebase hosting site ${siteId}`);
    
    const { stdout, stderr } = await execAsync(
      `firebase hosting:sites:update ${siteId} --project ${CONFIG.PROJECT_ID} --add-domain="${domain}"`
    );
    
    if (stderr && stderr.includes('Error')) {
      throw new Error(stderr);
    }
    
    log(`Successfully connected domain ${domain} to site ${siteId}`, 'success');
    return { success: true };
  } catch (error) {
    log(`Failed to connect domain ${domain} to Firebase: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

/**
 * Generate DNS records for a domain
 */
function generateDnsRecords(domain, siteId) {
  const baseDomain = domain.split('.').slice(-2).join('.');
  const subdomain = domain.replace(`.${baseDomain}`, '');
  
  const dnsRecords = [
    {
      type: 'A',
      name: subdomain || '@',
      value: '199.36.158.100', // Firebase hosting IP
      ttl: 3600,
      description: 'Points to Firebase hosting'
    },
    {
      type: 'TXT',
      name: subdomain ? subdomain : '@',
      value: `google-site-verification=firebase-${siteId}`,
      ttl: 3600,
      description: 'Google site verification record'
    }
  ];
  
  return dnsRecords;
}

/**
 * Process a single domain
 */
async function processDomain(domain, retryCount = 0) {
  log(`Processing domain: ${domain}`);
  
  try {
    // Generate site ID
    const siteId = generateSiteId(domain);
    
    // Create Firebase site
    const siteResult = await createFirebaseSite(domain);
    
    if (!siteResult.success) {
      if (siteResult.quotaError) {
        return { 
          domain, 
          siteId,
          status: 'quota_exceeded',
          stage: 'create_site',
          message: `Quota exceeded: ${siteResult.error}`,
          retryCount
        };
      }
      
      if (retryCount < CONFIG.MAX_RETRIES) {
        log(`Will retry domain ${domain} later (Attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES})`, 'warning');
        return { 
          domain, 
          siteId,
          status: 'retry',
          stage: 'create_site',
          error: siteResult.error,
          retryCount: retryCount + 1
        };
      }
      
      return { 
        domain, 
        siteId,
        status: 'failed',
        stage: 'create_site',
        error: siteResult.error,
        retryCount
      };
    }
    
    // Connect domain to Firebase
    const connectResult = await connectDomainToFirebase(domain, siteId);
    
    if (!connectResult.success) {
      if (retryCount < CONFIG.MAX_RETRIES) {
        log(`Will retry domain ${domain} later (Attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES})`, 'warning');
        return { 
          domain, 
          siteId,
          status: 'retry',
          stage: 'connect_domain',
          error: connectResult.error,
          retryCount: retryCount + 1
        };
      }
      
      return { 
        domain, 
        siteId,
        status: 'failed',
        stage: 'connect_domain',
        error: connectResult.error,
        retryCount
      };
    }
    
    // Generate DNS records
    const dnsRecords = generateDnsRecords(domain, siteId);
    
    // Save DNS records to file
    const dnsFile = path.join(CONFIG.OUTPUT_DIR, `${domain}-dns-records.txt`);
    let dnsContent = `# DNS Records for ${domain}\n`;
    dnsContent += `# Generated: ${new Date().toISOString()}\n`;
    dnsContent += `# Site ID: ${siteId}\n\n`;
    
    dnsRecords.forEach(record => {
      dnsContent += `# ${record.description}\n`;
      dnsContent += `${record.type} ${record.name} ${record.value} ${record.ttl}\n\n`;
    });
    
    fs.writeFileSync(dnsFile, dnsContent);
    
    return { 
      domain, 
      siteId,
      status: 'success',
      message: `Domain processed successfully, DNS records saved to ${dnsFile}`,
      dnsFile
    };
  } catch (error) {
    log(`Error processing domain ${domain}: ${error.message}`, 'error');
    
    if (retryCount < CONFIG.MAX_RETRIES) {
      return { 
        domain, 
        status: 'retry',
        error: error.message,
        retryCount: retryCount + 1
      };
    }
    
    return { 
      domain, 
      status: 'failed',
      error: error.message,
      retryCount
    };
  }
}

/**
 * Process domains in batches with error recovery
 */
async function processBatches(domains) {
  // Initialize or load existing state
  let state = loadProcessingState() || {
    timestamp: new Date().toISOString(),
    total: domains.length,
    completed: [],
    failed: [],
    pending: [...domains],
    retrying: [],
    quotaExceeded: [],
    currentBatch: 0
  };
  
  // Check for resuming operation
  if (state.pending.length < domains.length || state.completed.length > 0 || state.failed.length > 0) {
    log(`Resuming previous batch operation. ${state.completed.length} completed, ${state.failed.length} failed, ${state.pending.length} pending`, 'info');
  } else {
    log(`Starting new batch operation with ${domains.length} domains`);
  }
  
  // Create batches from pending domains
  let batches = [];
  for (let i = 0; i < state.pending.length; i += CONFIG.BATCH_SIZE) {
    batches.push(state.pending.slice(i, i + CONFIG.BATCH_SIZE));
  }
  
  // Add retrying domains to first batch if there are any
  if (state.retrying.length > 0) {
    log(`Adding ${state.retrying.length} domains from previous failures to first batch`);
    
    if (batches.length === 0) {
      batches.push([...state.retrying]);
    } else {
      // Add to first batch, respecting batch size
      const availableSlots = CONFIG.BATCH_SIZE - batches[0].length;
      const domainsToAdd = state.retrying.slice(0, availableSlots);
      batches[0] = [...domainsToAdd, ...batches[0]];
      
      // If more retrying domains than slots, create new batch(es)
      if (domainsToAdd.length < state.retrying.length) {
        const remainingDomains = state.retrying.slice(availableSlots);
        for (let i = 0; i < remainingDomains.length; i += CONFIG.BATCH_SIZE) {
          batches.unshift(remainingDomains.slice(i, i + CONFIG.BATCH_SIZE));
        }
      }
    }
    
    // Clear retrying state
    state.retrying = [];
    state.pending = batches.flat();
    saveProcessingState(state);
  }
  
  // Process each batch
  for (let batchIndex = state.currentBatch; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} domains`);
    
    // Update state
    state.currentBatch = batchIndex;
    saveProcessingState(state);
    
    // Process domains in current batch
    const results = [];
    for (const domain of batch) {
      const result = await processDomain(domain);
      results.push(result);
      
      // Update processing state based on result
      if (result.status === 'success') {
        state.completed.push({
          domain,
          siteId: result.siteId,
          timestamp: new Date().toISOString()
        });
        state.pending = state.pending.filter(d => d !== domain);
      } else if (result.status === 'retry') {
        state.retrying.push(domain);
        state.pending = state.pending.filter(d => d !== domain);
      } else if (result.status === 'quota_exceeded') {
        state.quotaExceeded.push(domain);
        state.pending = state.pending.filter(d => d !== domain);
      } else if (result.status === 'failed') {
        state.failed.push({
          domain,
          error: result.error,
          timestamp: new Date().toISOString()
        });
        state.pending = state.pending.filter(d => d !== domain);
      }
      
      // Save state after each domain
      saveProcessingState(state);
    }
    
    // Check for quota exceeded
    if (results.some(r => r.status === 'quota_exceeded')) {
      log(`Quota exceeded during batch ${batchIndex + 1}, waiting for ${CONFIG.BATCH_DELAY / 60000} minutes`, 'warning');
      await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
      
      // Move quota exceeded domains back to pending
      state.pending = [...state.pending, ...state.quotaExceeded];
      state.quotaExceeded = [];
      saveProcessingState(state);
    }
    
    // Check for retries and wait if needed
    if (state.retrying.length > 0 && batchIndex < batches.length - 1) {
      log(`Waiting ${CONFIG.RETRY_DELAY / 60000} minutes before retrying failed domains`, 'info');
      await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
    }
  }
  
  // Handle any remaining retry/quota domains
  if (state.retrying.length > 0 || state.quotaExceeded.length > 0) {
    const remainingDomains = [...state.retrying, ...state.quotaExceeded];
    log(`Processing ${remainingDomains.length} remaining domains that need retries`, 'info');
    
    // Reset for next run
    state.retrying = [];
    state.quotaExceeded = [];
    state.pending = remainingDomains;
    state.currentBatch = 0;
    saveProcessingState(state);
    
    // Wait before retrying
    log(`Waiting ${CONFIG.RETRY_DELAY / 60000} minutes before final retry attempt`, 'info');
    await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
    
    // Recursively process remaining domains
    if (remainingDomains.length > 0) {
      await processBatches(remainingDomains);
    }
  }
  
  return state;
}

/**
 * Save mapping file
 */
function saveMappingFile() {
  try {
    fs.writeFileSync(CONFIG.MAPPING_FILE, JSON.stringify(siteIdMapping, null, 2));
    log(`Domain to Site ID mapping saved to ${CONFIG.MAPPING_FILE}`);
  } catch (error) {
    log(`Error saving mapping file: ${error.message}`, 'error');
  }
}

/**
 * Generate final report
 */
function generateReport(state) {
  const reportFile = path.join(
    CONFIG.OUTPUT_DIR,
    `batch-processing-report-${new Date().toISOString().replace(/[:\.]/g, '-')}.json`
  );
  
  fs.writeFileSync(reportFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    config: {
      projectId: CONFIG.PROJECT_ID,
      batchSize: CONFIG.BATCH_SIZE,
      maxRetries: CONFIG.MAX_RETRIES
    },
    summary: {
      total: state.total,
      completed: state.completed.length,
      failed: state.failed.length,
      pending: state.pending.length,
      retrying: state.retrying.length,
      quotaExceeded: state.quotaExceeded.length
    },
    details: state
  }, null, 2));
  
  log(`Final report saved to ${reportFile}`, 'success');
  
  // Generate simple text report
  console.log('\n============== BATCH PROCESSING REPORT ==============');
  console.log(`Total domains: ${state.total}`);
  console.log(`Successfully processed: ${state.completed.length}`);
  console.log(`Failed: ${state.failed.length}`);
  console.log(`Pending: ${state.pending.length}`);
  console.log(`Waiting for retry: ${state.retrying.length}`);
  console.log(`Quota exceeded: ${state.quotaExceeded.length}`);
  console.log('======================================================\n');
  
  if (state.failed.length > 0) {
    console.log('\nFailed domains:');
    state.failed.forEach(item => {
      console.log(`  - ${item.domain}: ${item.error}`);
    });
  }
  
  return reportFile;
}

/**
 * Clean up resumability state
 */
function cleanupState() {
  if (fs.existsSync(CONFIG.RESUME_FILE)) {
    fs.unlinkSync(CONFIG.RESUME_FILE);
    log(`Cleaned up processing state file`, 'info');
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('\n============================================');
    console.log('  Enhanced Batch Domain Processor');
    console.log('============================================\n');
    
    // Read domains
    const domains = readDomains();
    
    if (domains.length === 0) {
      log('No domains to process, exiting', 'warning');
      return;
    }
    
    // Process domains in batches with error recovery
    const finalState = await processBatches(domains);
    
    // Save mapping file
    saveMappingFile();
    
    // Generate final report
    const reportFile = generateReport(finalState);
    
    // Clean up state if all completed
    if (finalState.pending.length === 0 && 
        finalState.retrying.length === 0 && 
        finalState.quotaExceeded.length === 0) {
      cleanupState();
    }
    
    log('Batch processing completed', 'success');
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    if (error.stack) {
      log(error.stack, 'error');
    }
    process.exit(1);
  }
}

// Run the script
main();

