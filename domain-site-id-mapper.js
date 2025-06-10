#!/usr/bin/env node
/**
 * Domain to Site ID Mapper for Special Characters
 * 
 * This script maps domains with special characters to valid Firebase site IDs.
 * It creates and manages a mapping file to track relationships between original
 * domain names and their Firebase-compatible site IDs.
 * 
 * Usage:
 *   node domain-site-id-mapper.js [--mode=generate|check|apply] [--input=domains.txt]
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

// Configuration
const CONFIG = {
  MODE: args.mode || 'generate',  // generate, check, or apply
  INPUT_FILE: args.input || path.join(__dirname, 'domains', 'active-domains.txt'),
  OUTPUT_FILE: args.output || path.join(__dirname, 'domain-site-id-mapping.json'),
  DOCS_FILE: args.docs || path.join(__dirname, 'special-character-domains.md')
};

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
 * Load existing mapping file
 */
function loadMappingFile() {
  if (fs.existsSync(CONFIG.OUTPUT_FILE)) {
    try {
      const mapping = JSON.parse(fs.readFileSync(CONFIG.OUTPUT_FILE, 'utf8'));
      console.log(`Loaded existing mapping file with ${Object.keys(mapping).length} entries`);
      return mapping;
    } catch (error) {
      console.error(`Error loading mapping file: ${error.message}`);
      return {};
    }
  }
  
  return {};
}

/**
 * Generate site ID for a domain
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
    
    return {
      domain: normalizedDomain,
      siteId,
      hasSpecialChars: true,
      punycode: punycodeEncoded
    };
  }
  
  // For regular domains, simply replace dots with hyphens
  const siteId = normalizedDomain.replace(/\./g, '-');
  
  return {
    domain: normalizedDomain,
    siteId,
    hasSpecialChars: false
  };
}

/**
 * Generate mapping for domains
 */
function generateMapping(domains) {
  const mapping = {};
  const specialCharDomains = [];
  
  domains.forEach(domain => {
    const result = generateSiteId(domain);
    mapping[domain] = result.siteId;
    
    if (result.hasSpecialChars) {
      specialCharDomains.push({
        domain,
        siteId: result.siteId,
        punycode: result.punycode
      });
    }
  });
  
  return { mapping, specialCharDomains };
}

/**
 * Save mapping file
 */
function saveMappingFile(mapping) {
  try {
    fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(mapping, null, 2));
    console.log(`Mapping saved to ${CONFIG.OUTPUT_FILE}`);
    return true;
  } catch (error) {
    console.error(`Error saving mapping file: ${error.message}`);
    return false;
  }
}

/**
 * Generate documentation for special character domains
 */
function generateDocs(specialCharDomains) {
  const timestamp = new Date().toISOString();
  let content = `# Special Character Domain Mapping\n\n`;
  content += `Generated: ${timestamp}\n\n`;
  content += `This document maps domains containing special characters to their Firebase-compatible site IDs.\n\n`;
  
  if (specialCharDomains.length === 0) {
    content += `No domains with special characters found in the current set.\n`;
  } else {
    content += `## Mapping Table\n\n`;
    content += `| Original Domain | Punycode | Site ID |\n`;
    content += `|----------------|----------|--------|\n`;
    
    specialCharDomains.forEach(item => {
      content += `| ${item.domain} | ${item.punycode} | ${item.siteId} |\n`;
    });
    
    content += `\n## Usage Notes\n\n`;
    content += `When working with these domains:\n\n`;
    content += `1. In Firebase CLI commands, use the Site ID\n`;
    content += `2. In domain registrars, use the Punycode version\n`;
    content += `3. In URLs and marketing, use the Original Domain\n`;
    content += `\n## Special Character Handling\n\n`;
    content += `Special characters in domain names (like accents) are converted to punycode for DNS compatibility.\n`;
    content += `The Site ID is derived from the punycode version with additional transformations to ensure Firebase compatibility.\n`;
  }
  
  try {
    fs.writeFileSync(CONFIG.DOCS_FILE, content);
    console.log(`Documentation saved to ${CONFIG.DOCS_FILE}`);
    return true;
  } catch (error) {
    console.error(`Error saving documentation: ${error.message}`);
    return false;
  }
}

/**
 * Check for site ID collisions
 */
function checkForCollisions(mapping) {
  const siteIds = {};
  const collisions = [];
  
  Object.entries(mapping).forEach(([domain, siteId]) => {
    if (!siteIds[siteId]) {
      siteIds[siteId] = [domain];
    } else {
      siteIds[siteId].push(domain);
      
      if (siteIds[siteId].length === 2) {
        // First collision for this site ID
        collisions.push({
          siteId,
          domains: [...siteIds[siteId]]
        });
      } else {
        // Additional domain for existing collision
        const collision = collisions.find(c => c.siteId === siteId);
        if (collision) {
          collision.domains.push(domain);
        }
      }
    }
  });
  
  return collisions;
}

/**
 * Apply mapping to firebaserc file
 */
function applyMappingToFirebaserc(mapping) {
  const firebasercPath = path.join(__dirname, '.firebaserc');
  
  if (!fs.existsSync(firebasercPath)) {
    console.error(`Firebase configuration (.firebaserc) not found at ${firebasercPath}`);
    return false;
  }
  
  try {
    const firebaserc = JSON.parse(fs.readFileSync(firebasercPath, 'utf8'));
    
    if (!firebaserc.targets) {
      firebaserc.targets = {};
    }
    
    if (!firebaserc.targets.hosting) {
      firebaserc.targets.hosting = {};
    }
    
    // Get current project ID
    const projectId = Object.keys(firebaserc.projects)[0] || CONFIG.PROJECT_ID;
    
    // Apply each mapping as a target
    let addedCount = 0;
    Object.entries(mapping).forEach(([domain, siteId]) => {
      if (!firebaserc.targets.hosting[siteId]) {
        if (!firebaserc.targets.hosting[siteId]) {
          firebaserc.targets.hosting[siteId] = [siteId];
          addedCount++;
        }
      }
    });
    
    // Save updated firebaserc
    fs.writeFileSync(firebasercPath, JSON.stringify(firebaserc, null, 2));
    console.log(`Updated .firebaserc with ${addedCount} new targets`);
    return true;
  } catch (error) {
    console.error(`Error updating .firebaserc: ${error.message}`);
    return false;
  }
}

/**
 * Generate special character site IDs
 */
async function generateMode() {
  console.log('Generating site ID mapping for domains...');
  
  // Read domains
  const domains = readDomains();
  
  // Load existing mapping
  const existingMapping = loadMappingFile();
  
  // Generate mapping
  const { mapping, specialCharDomains } = generateMapping(domains);
  
  // Merge with existing mapping
  const mergedMapping = { ...existingMapping, ...mapping };
  
  // Save mapping file
  saveMappingFile(mergedMapping);
  
  // Check for collisions
  const collisions = checkForCollisions(mergedMapping);
  if (collisions.length > 0) {
    console.warn(`WARNING: Found ${collisions.length} site ID collisions!`);
    console.warn('These domains will map to the same Firebase site:');
    
    collisions.forEach(collision => {
      console.warn(`  Site ID ${collision.siteId}:`);
      collision.domains.forEach(domain => {
        console.warn(`    - ${domain}`);
      });
    });
    
    console.warn('\nPlease review and manually adjust the mapping file if needed.');
  }
  
  // Generate documentation for special character domains
  if (specialCharDomains.length > 0) {
    console.log(`Found ${specialCharDomains.length} domains with special characters`);
    generateDocs(specialCharDomains);
  } else {
    console.log('No domains with special characters found');
  }
  
  console.log('\nNext steps:');
  console.log('1. Review the mapping file and make any needed adjustments');
  console.log('2. Run with --mode=apply to apply the mapping to .firebaserc');
  console.log('3. Use the mapping when configuring Firebase in batch operations');
}

/**
 * Check mode - validate existing mappings
 */
async function checkMode() {
  console.log('Checking existing site ID mappings...');
  
  // Load existing mapping
  const mapping = loadMappingFile();
  
  if (Object.keys(mapping).length === 0) {
    console.error('No existing mapping found. Run with --mode=generate first.');
    process.exit(1);
  }
  
  // Check for collisions
  const collisions = checkForCollisions(mapping);
  if (collisions.length > 0) {
    console.warn(`WARNING: Found ${collisions.length} site ID collisions!`);
    console.warn('These domains will map to the same Firebase site:');
    
    collisions.forEach(collision => {
      console.warn(`  Site ID ${collision.siteId}:`);
      collision.domains.forEach(domain => {
        console.warn(`    - ${domain}`);
      });
    });
    
    console.warn('\nRecommendation: Manually adjust the mapping file to resolve collisions.');
  } else {
    console.log('✅ No site ID collisions found in the mapping');
  }
  
  // Count special character domains
  const specialCharDomains = Object.keys(mapping).filter(domain => /[^\x00-\x7F]/.test(domain));
  console.log(`Found ${specialCharDomains.length} domains with special characters in the mapping`);
  
  if (specialCharDomains.length > 0) {
    console.log('\nSpecial character domains:');
    specialCharDomains.forEach(domain => {
      console.log(`  - ${domain} → ${mapping[domain]}`);
    });
    
    // Generate updated documentation
    const docsData = specialCharDomains.map(domain => ({
      domain,
      siteId: mapping[domain],
      punycode: punycode.toASCII(domain)
    }));
    
    generateDocs(docsData);
  }
}

/**
 * Apply mode - apply mappings to configuration
 */
async function applyMode() {
  console.log('Applying site ID mappings to Firebase configuration...');
  
  // Load existing mapping
  const mapping = loadMappingFile();
  
  if (Object.keys(mapping).length === 0) {
    console.error('No existing mapping found. Run with --mode=generate first.');
    process.exit(1);
  }
  
  // Apply mapping to .firebaserc
  const applied = applyMappingToFirebaserc(mapping);
  
  if (applied) {
    console.log('✅ Successfully applied mappings to Firebase configuration');
  } else {
    console.error('Failed to apply mappings');
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('\n============================================');
  console.log('  Domain to Site ID Mapper');
  console.log('============================================\n');
  
  switch (CONFIG.MODE) {
    case 'generate':
      await generateMode();
      break;
      
    case 'check':
      await checkMode();
      break;
      
    case 'apply':
      await applyMode();
      break;
      
    default:
      console.error(`Unknown mode: ${CONFIG.MODE}`);
      console.error('Valid modes: generate, check, apply');
      process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});

