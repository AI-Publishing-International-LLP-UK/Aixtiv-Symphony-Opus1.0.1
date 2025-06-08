#!/usr/bin/env node
/**
 * Domain Verification and SSL Certificate Monitoring
 * 
 * This script monitors the verification status of domains and SSL certificate
 * health, generating alerts for issues or expiring certificates.
 * 
 * Features:
 * - Checks DNS verification status
 * - Validates SSL certificate installation
 * - Monitors certificate expiration
 * - Generates alerts for issues
 * - Provides reporting for overall domain health
 * 
 * Usage:
 *   node domain-monitoring.js --mode=verify|monitor|report --alert=email|slack
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const https = require('https');
const util = require('util');
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
  DOMAINS_FILE: args.domains || path.join(__dirname, 'domains', 'active-domains.txt'),
  MAPPING_FILE: args.mapping || path.join(__dirname, 'domain-site-id-mapping.json'),
  REPORT_DIR: args.reportDir || path.join(__dirname, 'verification-results'),
  ALERT_MODE: args.alert || 'console',
  ALERT_EMAIL: args.email || 'admin@aixtiv.com',
  ALERT_SLACK_WEBHOOK: args.slack || '',
  SSL_EXPIRY_WARNING_DAYS: 30,
  CHECK_FREQUENCY_HOURS: 24,
  MODE: args.mode || 'verify', // verify, monitor, report
  TIMEOUT_MS: 10000, // 10 seconds timeout for HTTP requests
  PARALLEL_CHECKS: 5,
  LOG_FILE: path.join(__dirname, 'domain-monitoring.log')
};

// Ensure directories exist
if (!fs.existsSync(CONFIG.REPORT_DIR)) {
  fs.mkdirSync(CONFIG.REPORT_DIR, { recursive: true });
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

/**
 * Load domain-to-site ID mapping
 */
function loadSiteIdMapping() {
  if (fs.existsSync(CONFIG.MAPPING_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG.MAPPING_FILE, 'utf8'));
    } catch (e) {
      log(`Error loading mapping file: ${e.message}`, 'error');
      return {};
    }
  }
  return {};
}

/**
 * Get site ID for a domain
 */
function getSiteId(domain, siteIdMapping) {
  // Check if we have a mapping for this domain
  if (siteIdMapping[domain]) {
    return siteIdMapping[domain];
  }
  
  // Default fallback: replace dots with hyphens
  return domain.replace(/\./g, '-');
}

/**
 * Read domains from file
 */
function readDomains() {
  if (!fs.existsSync(CONFIG.DOMAINS_FILE)) {
    log(`Domains file not found: ${CONFIG.DOMAINS_FILE}`, 'error');
    return [];
  }
  
  const domains = fs.readFileSync(CONFIG.DOMAINS_FILE, 'utf8')
    .split('\n')
    .map(d => d.trim())
    .filter(d => d && !d.startsWith('#'));
  
  log(`Loaded ${domains.length} domains from ${CONFIG.DOMAINS_FILE}`);
  return domains;
}

/**
 * Check Firebase domain verification status
 */
async function checkFirebaseDomainStatus(domain, siteId) {
  try {
    const { stdout, stderr } = await execAsync(
      `firebase hosting:sites:get ${siteId} --project ${CONFIG.PROJECT_ID} --json`
    );
    
    if (stderr && stderr.includes('Error')) {
      throw new Error(stderr);
    }
    
    const siteInfo = JSON.parse(stdout);
    
    // Check if the domain is connected to this site
    const domainInfo = siteInfo.domains?.find(d => d.site === siteId && d.domain === domain);
    
    if (!domainInfo) {
      return {
        domain,
        siteId,
        status: 'not_connected',
        message: 'Domain not connected to Firebase site',
        verified: false
      };
    }
    
    return {
      domain,
      siteId,
      status: domainInfo.status || 'unknown',
      message: `Domain status: ${domainInfo.status}`,
      verified: domainInfo.status === 'DOMAIN_VERIFICATION_COMPLETED'
    };
  } catch (error) {
    return {
      domain,
      siteId,
      status: 'error',
      message: `Error checking Firebase domain status: ${error.message}`,
      verified: false,
      error: error.message
    };
  }
}

/**
 * Check SSL certificate for domain
 */
async function checkSSLCertificate(domain) {
  return new Promise((resolve) => {
    const options = {
      hostname: domain,
      port: 443,
      path: '/',
      method: 'HEAD',
      timeout: CONFIG.TIMEOUT_MS,
      rejectUnauthorized: false, // We want to capture invalid certs, not reject them
    };
    
    const req = https.request(options, (res) => {
      const certificate = res.socket.getPeerCertificate();
      
      if (!certificate || Object.keys(certificate).length === 0) {
        resolve({
          domain,
          ssl: {
            valid: false,
            message: 'No SSL certificate found',
            expiresIn: 0
          }
        });
        return;
      }
      
      const currentTime = Date.now();
      const expiryTime = new Date(certificate.valid_to).getTime();
      const daysToExpiry = Math.floor((expiryTime - currentTime) / (1000 * 60 * 60 * 24));
      
      resolve({
        domain,
        ssl: {
          valid: true,
          issuer: certificate.issuer?.O || 'Unknown',
          subject: certificate.subject?.CN || 'Unknown',
          validTo: certificate.valid_to,
          validFrom: certificate.valid_from,
          expiresIn: daysToExpiry,
          message: daysToExpiry <= CONFIG.SSL_EXPIRY_WARNING_DAYS 
            ? `Certificate expires in ${daysToExpiry} days`
            : `Certificate valid for ${daysToExpiry} days`
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({
        domain,
        ssl: {
          valid: false,
          message: `SSL error: ${error.message}`,
          expiresIn: 0,
          error: error.message
        }
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        domain,
        ssl: {
          valid: false,
          message: 'Connection timeout',
          expiresIn: 0,
          error: 'timeout'
        }
      });
    });
    
    req.end();
  });
}

/**
 * Send alert for domain issues
 */
async function sendAlert(domain, issue, details) {
  log(`ALERT: ${domain} - ${issue}`, 'warning');
  
  const alertMessage = `
Domain: ${domain}
Issue: ${issue}
Details: ${details}
Timestamp: ${new Date().toISOString()}
  `;
  
  switch(CONFIG.ALERT_MODE) {
    case 'email':
      // Implement email alerting
      log(`Email alert would be sent to ${CONFIG.ALERT_EMAIL}`);
      // In a real implementation, you would use a library like nodemailer
      break;
      
    case 'slack':
      if (CONFIG.ALERT_SLACK_WEBHOOK) {
        try {
          await execAsync(`curl -X POST -H 'Content-type: application/json' --data '{"text":"${alertMessage}"}' ${CONFIG.ALERT_SLACK_WEBHOOK}`);
          log('Slack alert sent');
        } catch (error) {
          log(`Error sending Slack alert: ${error.message}`, 'error');
        }
      } else {
        log('Slack webhook URL not configured', 'error');
      }
      break;
      
    case 'console':
    default:
      console.log('\n===== DOMAIN ALERT =====');
      console.log(alertMessage);
      console.log('========================\n');
      break;
  }
}

/**
 * Process domains in parallel batches
 */
async function processDomainsBatch(domains, processFunction) {
  const results = [];
  
  // Process in batches to avoid overloading
  for (let i = 0; i < domains.length; i += CONFIG.PARALLEL_CHECKS) {
    const batch = domains.slice(i, i + CONFIG.PARALLEL_CHECKS);
    log(`Processing batch ${Math.floor(i/CONFIG.PARALLEL_CHECKS) + 1}/${Math.ceil(domains.length/CONFIG.PARALLEL_CHECKS)} (${batch.length} domains)`);
    
    const batchResults = await Promise.all(batch.map(processFunction));
    results.push(...batchResults);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}

/**
 * Verify domain and SSL setup
 */
async function verifyDomains() {
  const domains = readDomains();
  const siteIdMapping = loadSiteIdMapping();
  
  if (domains.length === 0) {
    log('No domains to verify', 'warning');
    return;
  }
  
  log(`Starting verification for ${domains.length} domains`);
  
  const results = await processDomainsBatch(domains, async (domain) => {
    const siteId = getSiteId(domain, siteIdMapping);
    
    try {
      // Check Firebase domain status
      const firebaseStatus = await checkFirebaseDomainStatus(domain, siteId);
      
      // Check SSL certificate
      const sslStatus = await checkSSLCertificate(domain);
      
      const result = {
        domain,
        siteId,
        firebase: firebaseStatus,
        ssl: sslStatus.ssl,
        timestamp: new Date().toISOString()
      };
      
      // Generate alerts for issues
      if (!firebaseStatus.verified) {
        await sendAlert(domain, 'Domain verification incomplete', firebaseStatus.message);
      }
      
      if (!sslStatus.ssl.valid) {
        await sendAlert(domain, 'SSL certificate invalid', sslStatus.ssl.message);
      } else if (sslStatus.ssl.expiresIn <= CONFIG.SSL_EXPIRY_WARNING_DAYS) {
        await sendAlert(domain, 'SSL certificate expiring soon', `Expires in ${sslStatus.ssl.expiresIn} days`);
      }
      
      return result;
    } catch (error) {
      log(`Error verifying domain ${domain}: ${error.message}`, 'error');
      
      return {
        domain,
        siteId,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  });
  
  // Save results
  const reportFile = path.join(
    CONFIG.REPORT_DIR,
    `verification-results-${new Date().toISOString().replace(/[:\.]/g, '-')}.json`
  );
  
  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
  log(`Verification results saved to ${reportFile}`);
  
  // Also save to a standard location for latest results
  fs.writeFileSync(
    path.join(CONFIG.REPORT_DIR, 'verification-results.json'),
    JSON.stringify(results, null, 2)
  );
  
  // Generate summary
  const summary = {
    total: results.length,
    verified: results.filter(r => r.firebase && r.firebase.verified).length,
    sslValid: results.filter(r => r.ssl && r.ssl.valid).length,
    issues: results.filter(r => !r.firebase?.verified || !r.ssl?.valid).length,
    expiringSoon: results.filter(r => r.ssl?.valid && r.ssl.expiresIn <= CONFIG.SSL_EXPIRY_WARNING_DAYS).length
  };
  
  console.log('\n===== VERIFICATION SUMMARY =====');
  console.log(`Total domains: ${summary.total}`);
  console.log(`Verified domains: ${summary.verified}`);
  console.log(`Valid SSL certificates: ${summary.sslValid}`);
  console.log(`Domains with issues: ${summary.issues}`);
  console.log(`Certificates expiring soon: ${summary.expiringSoon}`);
  console.log('================================\n');
  
  return { results, summary };
}

/**
 * Start scheduled monitoring
 */
async function startMonitoring() {
  log(`Starting domain and SSL monitoring (frequency: ${CONFIG.CHECK_FREQUENCY_HOURS} hours)`);
  
  // Run initial verification
  await verifyDomains();
  
  // Schedule regular checks
  setInterval(async () => {
    log(`Running scheduled verification check`);
    await verifyDomains();
  }, CONFIG.CHECK_FREQUENCY_HOURS * 60 * 60 * 1000);
  
  console.log(`Monitoring running. Press Ctrl+C to exit.`);
}

/**
 * Generate comprehensive report
 */
async function generateReport() {
  // Run verification first to get fresh data
  const { results, summary } = await verifyDomains();
  
  // Create detailed HTML report
  const reportFile = path.join(CONFIG.REPORT_DIR, 'domain-health-report.html');
  
  let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Domain Health Report - ${new Date().toLocaleDateString()}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    tr:hover { background-color: #f1f1f1; }
    .success { color: green; }
    .warning { color: orange; }
    .error { color: red; }
    .summary { background-color: #eef; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>Domain Health Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  
  <div class="summary">
    <h2>Summary</h2>
    <p>Total domains: ${summary.total}</p>
    <p>Verified domains: ${summary.verified}</p>
    <p>Valid SSL certificates: ${summary.sslValid}</p>
    <p>Domains with issues: ${summary.issues}</p>
    <p>Certificates expiring soon: ${summary.expiringSoon}</p>
  </div>
  
  <h2>Domain Details</h2>
  <table>
    <tr>
      <th>Domain</th>
      <th>Site ID</th>
      <th>Firebase Status</th>
      <th>SSL Status</th>
      <th>Expiration</th>
      <th>Issues</th>
    </tr>
`;

  // Add rows for each domain
  results.forEach(result => {
    const firebaseStatus = result.firebase?.verified ? 
      '<span class="success">Verified</span>' : 
      `<span class="error">${result.firebase?.status || 'Unknown'}</span>`;
    
    const sslStatus = result.ssl?.valid ? 
      '<span class="success">Valid</span>' : 
      `<span class="error">${result.ssl?.message || 'Invalid'}</span>`;
    
    const expiration = result.ssl?.valid ? 
      (result.ssl.expiresIn <= CONFIG.SSL_EXPIRY_WARNING_DAYS ? 
        `<span class="warning">${result.ssl.expiresIn} days</span>` : 
        `<span class="success">${result.ssl.expiresIn} days</span>`) : 
      '<span class="error">N/A</span>';
    
    const issues = [];
    if (!result.firebase?.verified) {
      issues.push(`Domain verification: ${result.firebase?.message || 'Not verified'}`);
    }
    if (!result.ssl?.valid) {
      issues.push(`SSL: ${result.ssl?.message || 'Invalid'}`);
    } else if (result.ssl.expiresIn <= CONFIG.SSL_EXPIRY_WARNING_DAYS) {
      issues.push(`SSL: Expires in ${result.ssl.expiresIn} days`);
    }
    
    htmlContent += `
    <tr>
      <td>${result.domain}</td>
      <td>${result.siteId}</td>
      <td>${firebaseStatus}</td>
      <td>${sslStatus}</td>
      <td>${expiration}</td>
      <td>${issues.length ? issues.join('<br>') : '<span class="success">None</span>'}</td>
    </tr>`;
  });
  
  htmlContent += `
  </table>
</body>
</html>`;

  fs.writeFileSync(reportFile, htmlContent);
  log(`HTML report saved to ${reportFile}`, 'success');
  
  return reportFile;
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('\n============================================');
    console.log('  Domain Verification and SSL Monitoring');
    console.log('============================================\n');
    
    switch (CONFIG.MODE) {
      case 'verify':
        await verifyDomains();
        break;
        
      case 'monitor':
        await startMonitoring();
        break;
        
      case 'report':
        const reportFile = await generateReport();
        console.log(`\nReport generated at: ${reportFile}`);
        break;
        
      default:
        console.error(`Unknown mode: ${CONFIG.MODE}`);
        console.error('Valid modes: verify, monitor, report');
        process.exit(1);
    }
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

