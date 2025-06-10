#!/usr/bin/env node
/**
 * Firebase.json Generator for Aixtiv Symphony
 * 
 * This script generates a firebase.json file for large numbers of sites.
 * It reads from a domains list and creates a properly formatted firebase.json
 * with hosting configurations for all sites, while respecting Firebase quotas
 * and handling special characters properly.
 * 
 * Usage:
 *   node firebase-json-generator.js --input=domains.txt --output=firebase.json --project=project-id
 */

const fs = require('fs');
const path = require('path');
const punycode = require('punycode');

// Parse command line arguments
const args = process.argv.slice(2).reduce((result, arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    result[key] = value;
  }
  return result;
}, {});

// Configuration with defaults
const CONFIG = {
  PROJECT_ID: args.project || 'api-for-warp-drive',
  INPUT_FILE: args.input || path.join(__dirname, 'domains', 'active-domains.txt'),
  OUTPUT_FILE: args.output || path.join(__dirname, 'firebase.json'),
  TEMPLATE_FILE: args.template || path.join(__dirname, 'firebase.json.backup'),
  MAPPING_FILE: args.mapping || path.join(__dirname, 'domain-site-id-mapping.json'),
  EXCLUDE_FILE: args.exclude || path.join(__dirname, 'excluded-domains.txt')
};

// Site ID mapping to store original domain to site ID relationships
let siteIdMapping = {};
if (fs.existsSync(CONFIG.MAPPING_FILE)) {
  try {
    siteIdMapping = JSON.parse(fs.readFileSync(CONFIG.MAPPING_FILE, 'utf8'));
  } catch (e) {
    console.error(`Error loading mapping file: ${e.message}`);
    siteIdMapping = {};
  }
}

// Load excluded domains
let excludedDomains = [];
if (fs.existsSync(CONFIG.EXCLUDE_FILE)) {
  excludedDomains = fs.readFileSync(CONFIG.EXCLUDE_FILE, 'utf8')
    .split('\n')
    .map(d => d.trim())
    .filter(d => d && !d.startsWith('#'));
}

/**
 * Generate a valid site ID from a domain name
 * Handles special characters by using punycode encoding
 * 
 * @param {string} domain - The domain name
 * @returns {string} - A valid site ID
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
 * Read domains from file
 */
function readDomains() {
  if (!fs.existsSync(CONFIG.INPUT_FILE)) {
    console.error(`Input file not found: ${CONFIG.INPUT_FILE}`);
    process.exit(1);
  }
  
  const domains = fs.readFileSync(CONFIG.INPUT_FILE, 'utf8')
    .split('\n')
    .map(d => d.trim())
    .filter(d => d && !d.startsWith('#'));
  
  console.log(`Loaded ${domains.length} domains from ${CONFIG.INPUT_FILE}`);
  return domains;
}

/**
 * Generate firebase.json content
 */
function generateFirebaseJson(domains) {
  let template;
  
  // Load template if it exists, otherwise create a minimal template
  if (fs.existsSync(CONFIG.TEMPLATE_FILE)) {
    try {
      template = JSON.parse(fs.readFileSync(CONFIG.TEMPLATE_FILE, 'utf8'));
    } catch (e) {
      console.error(`Error parsing template file: ${e.message}`);
      template = createDefaultTemplate();
    }
  } else {
    template = createDefaultTemplate();
  }
  
  // Ensure hosting is an array
  if (!Array.isArray(template.hosting)) {
    if (template.hosting) {
      template.hosting = [template.hosting];
    } else {
      template.hosting = [];
    }
  }
  
  // Process each domain
  const processedDomains = new Set();
  const existingSiteIds = new Set(template.hosting.map(site => site.target));
  
  domains.forEach(domain => {
    // Skip excluded domains
    if (excludedDomains.includes(domain)) {
      console.log(`Skipping excluded domain: ${domain}`);
      return;
    }
    
    // Generate site ID
    const siteId = generateSiteId(domain);
    
    // Skip if this site ID already exists in the template
    if (existingSiteIds.has(siteId)) {
      console.log(`Site ID ${siteId} for domain ${domain} already exists in firebase.json`);
      return;
    }
    
    // Add new hosting configuration
    template.hosting.push({
      "target": siteId,
      "public": `public/${siteId}`,
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        { "source": "/api/**", "function": "siteApi" },
        { "source": "**", "destination": "/index.html" }
      ],
      "headers": [
        {
          "source": "**",
          "headers": [
            {
              "key": "Content-Security-Policy",
              "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.sallyport.io; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://*.sallyport.io; frame-ancestors 'none';"
            },
            {
              "key": "X-Frame-Options",
              "value": "DENY"
            },
            {
              "key": "X-Content-Type-Options",
              "value": "nosniff"
            }
          ]
        },
        {
          "source": "**/*.@(js|css)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "max-age=31536000"
            }
          ]
        }
      ]
    });
    
    processedDomains.add(domain);
    existingSiteIds.add(siteId);
  });
  
  console.log(`Added ${processedDomains.size} new domain configurations to firebase.json`);
  
  return template;
}

/**
 * Create a default template for firebase.json
 */
function createDefaultTemplate() {
  return {
    "hosting": [],
    "functions": {
      "source": "functions",
      "runtime": "nodejs20",
      "region": "us-west1"
    },
    "firestore": {
      "rules": "firestore.rules",
      "indexes": "firestore.indexes.json"
    },
    "storage": {
      "rules": "storage.rules"
    }
  };
}

/**
 * Save firebase.json file
 */
function saveFirebaseJson(content) {
  try {
    fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(content, null, 2));
    console.log(`Firebase.json saved to ${CONFIG.OUTPUT_FILE}`);
  } catch (error) {
    console.error(`Error saving firebase.json: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Save mapping file
 */
function saveMappingFile() {
  try {
    fs.writeFileSync(CONFIG.MAPPING_FILE, JSON.stringify(siteIdMapping, null, 2));
    console.log(`Domain to Site ID mapping saved to ${CONFIG.MAPPING_FILE}`);
  } catch (error) {
    console.error(`Error saving mapping file: ${error.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Firebase.json Generator for Aixtiv Symphony');
  console.log('==========================================');
  
  // Read domains
  const domains = readDomains();
  
  // Generate firebase.json content
  const firebaseJson = generateFirebaseJson(domains);
  
  // Save firebase.json
  saveFirebaseJson(firebaseJson);
  
  // Save mapping file
  saveMappingFile();
  
  console.log('\nNext steps:');
  console.log('1. Review the generated firebase.json file');
  console.log('2. Deploy with `firebase deploy --only hosting`');
  console.log('3. Check the domain-site-id-mapping.json for special character mappings');
}

// Run the script
main().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});

