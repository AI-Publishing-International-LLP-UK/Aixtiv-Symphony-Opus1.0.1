#!/usr/bin/env node

/**
 * Fetch 2100.cool DNS Records from GoDaddy
 * 
 * This script uses the existing GoDaddy pipeline to fetch all DNS records
 * for the 2100.cool domain and extract the subdomains that are set up.
 */

const { getDnsRecords } = require('./lib/api/providers/godaddy');
const fs = require('fs');
const path = require('path');

// Colors for output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Extract subdomain from DNS record name
 */
function extractSubdomain(recordName, baseDomain) {
  if (recordName === '@') return null; // Root domain
  if (recordName === 'www') return null; // Standard www
  if (recordName.includes('_')) return null; // Skip system records
  if (recordName.includes('dkim')) return null; // Skip DKIM records
  if (recordName.includes('mail')) return null; // Skip mail records
  if (recordName.includes('ftp')) return null; // Skip FTP records
  
  return recordName;
}

/**
 * Main function to fetch and process 2100.cool domains
 */
async function fetch2100CoolDomains() {
  const baseDomain = '2100.cool';
  
  console.log(`${COLORS.cyan}🔍 Fetching DNS records for ${baseDomain}...${COLORS.reset}\n`);
  
  try {
    // Fetch all DNS records for 2100.cool
    const allRecords = await getDnsRecords(baseDomain);
    
    console.log(`${COLORS.green}✅ Found ${allRecords.length} total DNS records${COLORS.reset}\n`);
    
    // Extract unique subdomains from A and CNAME records
    const subdomains = new Set();
    const recordsByType = {};
    
    allRecords.forEach(record => {
      const type = record.type;
      if (!recordsByType[type]) {
        recordsByType[type] = [];
      }
      recordsByType[type].push(record);
      
      // Extract subdomains from A and CNAME records
      if ((type === 'A' || type === 'CNAME') && record.name) {
        const subdomain = extractSubdomain(record.name, baseDomain);
        if (subdomain) {
          subdomains.add(subdomain);
        }
      }
    });
    
    // Display summary by record type
    console.log(`${COLORS.magenta}📊 DNS Records Summary:${COLORS.reset}`);
    Object.keys(recordsByType).sort().forEach(type => {
      console.log(`${COLORS.yellow}${type.padEnd(8)}: ${COLORS.white}${recordsByType[type].length} records${COLORS.reset}`);
    });
    
    console.log(`\n${COLORS.magenta}🌐 Found ${subdomains.size} subdomains:${COLORS.reset}`);
    
    // Sort and display subdomains
    const sortedSubdomains = Array.from(subdomains).sort();
    sortedSubdomains.forEach((subdomain, index) => {
      console.log(`${COLORS.cyan}${(index + 1).toString().padStart(2)}.${COLORS.reset} ${subdomain}.2100.cool`);
    });
    
    // Generate configuration for the deployment system
    const siteConfig = {
      project_id: "api-for-warp-drive",
      region: "us-west1",
      base_domain: "2100.cool",
      sites: {}
    };
    
    // Create site configurations for each subdomain
    sortedSubdomains.forEach(subdomain => {
      const key = subdomain.toLowerCase().replace(/[^a-z0-9]/g, '_');
      siteConfig.sites[key] = {
        subdomain: `${subdomain}.2100.cool`,
        firebase_site: `${subdomain.toLowerCase()}-2100-cool`,
        target_name: `${subdomain.toLowerCase()}-2100-cool`,
        description: `${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} Platform`,
        source_path: `public/${subdomain}-template.html`,
        target_path: `public/${subdomain}-2100-cool`,
        category: "2100.Cool Platform",
        lead_agent: "Dr. Claude",
        status: subdomain === 'asoos' ? 'active' : 'planned',
        godaddy_record: subdomain
      };
    });
    
    // Add deployment settings
    siteConfig.deployment_settings = {
      default_security_headers: {
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.sallyport.io; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://*.sallyport.io; frame-ancestors 'none';",
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff"
      },
      cache_control: "max-age=31536000",
      backup_retention_days: 30
    };
    
    // Save updated configuration
    const configPath = path.join(__dirname, 'config', '2100-cool-sites.json');
    fs.writeFileSync(configPath, JSON.stringify(siteConfig, null, 2));
    
    console.log(`\n${COLORS.green}✅ Configuration saved to: ${configPath}${COLORS.reset}`);
    
    // Create a simple domain list file
    const domainListPath = path.join(__dirname, 'domains', '2100-cool-subdomains.txt');
    const domainList = sortedSubdomains.map(sub => `${sub}.2100.cool`).join('\n');
    fs.writeFileSync(domainListPath, domainList);
    
    console.log(`${COLORS.green}✅ Domain list saved to: ${domainListPath}${COLORS.reset}`);
    
    // Display deployment commands
    console.log(`\n${COLORS.magenta}🚀 Ready for deployment!${COLORS.reset}`);
    console.log(`${COLORS.yellow}Use these commands:${COLORS.reset}`);
    console.log(`${COLORS.white}  ./deploy-2100-cool-sites.sh list              ${COLORS.cyan}# List all sites${COLORS.reset}`);
    console.log(`${COLORS.white}  ./deploy-2100-cool-sites.sh deploy-all         ${COLORS.cyan}# Deploy all active sites${COLORS.reset}`);
    console.log(`${COLORS.white}  ./deploy-2100-cool-sites.sh deploy <subdomain> ${COLORS.cyan}# Deploy specific site${COLORS.reset}`);
    console.log(`${COLORS.white}  ./deploy-2100-cool-sites.sh status             ${COLORS.cyan}# Check all sites status${COLORS.reset}`);
    
    return {
      totalRecords: allRecords.length,
      subdomains: sortedSubdomains,
      recordTypes: Object.keys(recordsByType)
    };
    
  } catch (error) {
    console.error(`${COLORS.red}❌ Error fetching DNS records: ${error.message}${COLORS.reset}`);
    
    if (error.message.includes('credentials')) {
      console.log(`\n${COLORS.yellow}💡 Make sure GoDaddy API credentials are set:${COLORS.reset}`);
      console.log(`${COLORS.white}   export GODADDY_API_KEY="your-api-key"${COLORS.reset}`);
      console.log(`${COLORS.white}   export GODADDY_API_SECRET="your-api-secret"${COLORS.reset}`);
    }
    
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  (async () => {
    await fetch2100CoolDomains();
  })();
}

module.exports = { fetch2100CoolDomains };
