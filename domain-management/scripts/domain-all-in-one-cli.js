#!/usr/bin/env node

/**
 * Gold Standard Domain Management CLI
 * 
 * A comprehensive command-line tool for end-to-end domain management including:
 * - Domain purchasing from GoDaddy
 * - Intelligent Firebase Hosting site selection
 * - Domain configuration and DNS setup
 * - SEO optimization and Google Search Console verification
 * - Cloud Run deployment integration
 */

'use strict';

const commander = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const figlet = require('figlet');
const ora = require('ora');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import service modules
const domainPurchase = require('./domain-purchase-service');
const firebaseDomainManager = require('./domain-firebase-godaddy-domain-manager');
const siteSelector = require('./domain-site-selector-service');
const seoService = require('./domain-seo-optimization-service');
const cloudRunDeployment = require('./domain-cloud-run-deployment');

// Setup logger
const winston = require('winston');
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
    new winston.transports.File({ filename: 'domain-cli.log' })
  ]
});

// Display welcome banner
console.log(
  chalk.yellow(
    figlet.textSync('Domain Manager', { horizontalLayout: 'full' })
  )
);
console.log(chalk.blue('Gold Standard Domain Management CLI - One Command to Rule Them All\n'));

// Create the command-line program
const program = new commander.Command();

program
  .version('1.0.0')
  .description('Enterprise-grade domain management system for Firebase');

// Domain search and purchase command
program
  .command('purchase <keyword>')
  .description('Search and purchase domains based on keyword')
  .option('-t, --tlds <tlds>', 'Comma-separated list of TLDs to check', '.com,.net,.org,.io')
  .option('-y, --years <years>', 'Registration period in years', '1')
  .option('-p, --privacy', 'Enable domain privacy protection')
  .option('--auto-renew', 'Enable automatic renewal')
  .option('--deploy', 'Automatically deploy to Firebase after purchase')
  .option('--site-type <type>', 'Type of site (api, coaching, content, etc.)')
  .action(async (keyword, options) => {
    try {
      const spinner = ora('Searching for available domains...').start();
      
      // Parse TLDs
      const tlds = options.tlds.split(',');
      
      // Search for domains
      const domains = await domainPurchase.searchDomains(keyword, tlds);
      
      spinner.succeed(`Found ${domains.length} available domains`);
      
      if (domains.length === 0) {
        console.log(chalk.red('No domains available for the provided keyword and TLDs.'));
        return;
      }
      
      // Display available domains
      console.log(chalk.green('\nAvailable Domains:'));
      domains.forEach((domain, index) => {
        console.log(`${index + 1}. ${chalk.cyan(domain.name)} - ${chalk.yellow('$' + domain.price)} ${domain.currency}`);
      });
      
      // Prompt for domain selection
      const { selectedIndex } = await inquirer.prompt([
        {
          type: 'number',
          name: 'selectedIndex',
          message: 'Select a domain to purchase (number):',
          validate: (value) => {
            const num = parseInt(value);
            return !isNaN(num) && num > 0 && num <= domains.length ? true : 'Please enter a valid domain number';
          }
        }
      ]);
      
      const selectedDomain = domains[selectedIndex - 1];
      
      // Confirm purchase
      const { confirmPurchase } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmPurchase',
          message: `Confirm purchase of ${chalk.cyan(selectedDomain.name)} for ${chalk.yellow('$' + selectedDomain.price)}?`,
          default: false
        }
      ]);
      
      if (!confirmPurchase) {
        console.log(chalk.yellow('Purchase cancelled.'));
        return;
      }
      
      // Purchase domain
      spinner.text = `Purchasing domain ${selectedDomain.name}...`;
      spinner.start();
      
      const purchaseResult = await domainPurchase.purchaseDomain(selectedDomain.name, {
        years: parseInt(options.years, 10),
        privacy: options.privacy,
        renewAuto: options.autoRenew
      });
      
      spinner.succeed(`Domain ${selectedDomain.name} purchased successfully!`);
      
      // If auto-deploy is enabled
      if (options.deploy) {
        await deployToDomain(selectedDomain.name, options.siteType);
      } else {
        console.log(chalk.green('\nNext Steps:'));
        console.log(`1. Run the following command to configure and deploy to Firebase:`);
        console.log(chalk.cyan(`   domain-manager deploy ${selectedDomain.name} --site-type=${options.siteType || 'auto'}`));
      }
    } catch (error) {
      logger.error('Domain purchase failed:', error);
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

// Deploy to existing domain command
program
  .command('deploy <domain>')
  .description('Configure and deploy to an existing domain')
  .option('-s, --site <siteId>', 'Specific Firebase Hosting site ID to use')
  .option('-t, --site-type <type>', 'Type of site (api, coaching, content, etc.)')
  .option('--no-seo', 'Skip SEO optimization')
  .option('--no-cloud-run', 'Skip Cloud Run deployment')
  .option('--google-verification <id>', 'Google Search Console verification ID')
  .action(async (domain, options) => {
    try {
      await deployToDomain(domain, options.siteType, options.site, {
        seo: options.seo,
        cloudRun: options.cloudRun,
        googleVerification: options.googleVerification
      });
    } catch (error) {
      logger.error('Deployment failed:', error);
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

// Batch deploy command
program
  .command('batch-deploy <file>')
  .description('Deploy multiple domains from a file (one domain per line)')
  .option('-s, --site <siteId>', 'Specific Firebase Hosting site ID to use')
  .option('--distribute', 'Distribute domains across appropriate sites')
  .option('--no-seo', 'Skip SEO optimization')
  .option('--no-cloud-run', 'Skip Cloud Run deployment')
  .action(async (file, options) => {
    try {
      const spinner = ora('Reading domains file...').start();
      
      // Read domains from file
      const content = await fs.readFile(file, 'utf8');
      const domains = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
      
      spinner.succeed(`Read ${domains.length} domains from ${file}`);
      
      if (domains.length === 0) {
        console.log(chalk.yellow('No domains found in the file.'));
        return;
      }
      
      // If distribute option is enabled
      if (options.distribute) {
        spinner.text = 'Distributing domains across Firebase sites...';
        spinner.start();
        
        const distribution = await siteSelector.distributeDomains(domains);
        
        spinner.succeed('Domains distributed across sites');
        
        // Process each site's domains
        for (const [siteId, siteDomains] of Object.entries(distribution)) {
          console.log(chalk.green(`\nDeploying ${siteDomains.length} domains to site: ${chalk.cyan(siteId)}`));
          
          for (const domain of siteDomains) {
            await deployToDomain(domain, null, siteId, {
              seo: options.seo,
              cloudRun: options.cloudRun,
              batchMode: true
            });
          }
        }
      } else {
        // Process all domains to the specified site
        for (const domain of domains) {
          await deployToDomain(domain, null, options.site, {
            seo: options.seo,
            cloudRun: options.cloudRun,
            batchMode: true
          });
        }
      }
      
      console.log(chalk.green('\nBatch deployment completed!'));
    } catch (error) {
      logger.error('Batch deployment failed:', error);
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

// List Firebase sites command
program
  .command('list-sites')
  .description('List all Firebase Hosting sites with domain counts')
  .option('-p, --project <projectId>', 'Firebase project ID')
  .action(async (options) => {
    try {
      const spinner = ora('Getting Firebase Hosting sites...').start();
      
      // Initialize Firebase
      await siteSelector.initializeFirebase();
      
      // Get sites
      const sites = await siteSelector.getProjectSites(options.project);
      
      spinner.text = 'Getting domain counts...';
      
      // Get domain counts
      const counts = await siteSelector.getAllSiteDomainCounts(false);
      
      spinner.succeed(`Found ${sites.length} Firebase Hosting sites`);
      
      // Display sites with domain counts
      console.log(chalk.green('\nFirebase Hosting Sites:'));
      console.log(chalk.gray('------------------------------------------------------------------------------------'));
      console.log(chalk.cyan(` ${'Site ID'.padEnd(30)} | ${'Domain Count'.padEnd(12)} | ${'Default URL'.padEnd(40)}`));
      console.log(chalk.gray('------------------------------------------------------------------------------------'));
      
      sites.forEach(site => {
        const count = counts[site.name] || 0;
        console.log(` ${site.name.padEnd(30)} | ${`${count}`.padEnd(12)} | ${site.defaultUrl || 'N/A'}`);
      });
      
      console.log(chalk.gray('------------------------------------------------------------------------------------'));
    } catch (error) {
      logger.error('List sites failed:', error);
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

// Site recommendation command
program
  .command('recommend <domain>')
  .description('Get site recommendation for a domain')
  .action(async (domain) => {
    try {
      const spinner = ora('Analyzing domain...').start();
      
      // Categorize domain
      const category = siteSelector.categorizeDomain(domain);
      
      // Get site recommendation
      const recommendation = await siteSelector.getRecommendedSite(category);
      
      spinner.succeed(`Analysis complete for ${domain}`);
      
      console.log(chalk.green('\nDomain Analysis:'));
      console.log(`Domain: ${chalk.cyan(domain)}`);
      console.log(`Category: ${chalk.yellow(category)}`);
      
      if (recommendation.success) {
        console.log(`Recommended Site: ${chalk.green(recommendation.recommendedSite)}`);
        console.log(`Available Slots: ${chalk.green(recommendation.availableSlots)}`);
        
        if (recommendation.alternativeSites.length > 0) {
          console.log(`Alternative Sites: ${recommendation.alternativeSites.join(', ')}`);
        }
      } else {
        console.log(chalk.red(`Recommendation failed: ${recommendation.message || recommendation.error}`));
      }
    } catch (error) {
      logger.error('Recommendation failed:', error);
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

// Validate configuration command
program
  .command('validate-config')
  .description('Validate current configuration and credentials')
  .action(async () => {
    const results = {
      firebase: { success: false, message: '' },
      godaddy: { success: false, message: '' },
      cloudRun: { success: false, message: '' }
    };
    
    console.log(chalk.yellow('Validating configuration...'));
    
    // Validate Firebase
    try {
      await siteSelector.initializeFirebase();
      const sites = await siteSelector.getProjectSites();
      results.firebase = { 
        success: true, 
        message: `Connected to Firebase. Found ${sites.length} sites.` 
      };
    } catch (error) {
      results.firebase = { 
        success: false, 
        message: `Firebase validation failed: ${error.message}` 
      };
    }
    
    // Validate GoDaddy
    try {
      await domainPurchase.checkDomainAvailability('test-domain-validation-12345.com');
      results.godaddy = { 
        success: true, 
        message: 'Connected to GoDaddy API successfully.' 
      };
    } catch (error) {
      results.godaddy = { 
        success: false, 
        message: `GoDaddy validation failed: ${error.message}` 
      };
    }
    
    // Validate Cloud Run deployment script
    try {
      const scriptPath = process.env.DEPLOYMENT_SCRIPT || 'users/asoos/deployment.sh';
      await fs.access(scriptPath, fs.constants.X_OK);
      results.cloudRun = { 
        success: true, 
        message: `Cloud Run deployment script found at ${scriptPath}` 
      };
    } catch (error) {
      results.cloudRun = { 
        success: false, 
        message: `Cloud Run script validation failed: ${error.message}` 
      };
    }
    
    // Display results
    console.log('\nConfiguration Validation Results:');
    
    console.log(`Firebase: ${results.firebase.success ? chalk.green('✓ Valid') : chalk.red('✗ Invalid')}`);
    console.log(`  ${results.firebase.message}`);
    
    console.log(`GoDaddy API: ${results.godaddy.success ? chalk.green('✓ Valid') : chalk.red('✗ Invalid')}`);
    console.log(`  ${results.godaddy.message}`);
    
    console.log(`Cloud Run: ${results.cloudRun.success ? chalk.green('✓ Valid') : chalk.red('✗ Invalid')}`);
    console.log(`  ${results.cloudRun.message}`);
    
    // Overall status
    const allValid = results.firebase.success && results.godaddy.success && results.cloudRun.success;
    console.log(`\nOverall Status: ${allValid ? chalk.green('✓ All systems operational') : chalk.yellow('⚠ Some services have issues')}`);
    
    if (!allValid) {
      console.log(chalk.yellow('\nRecommendations to fix issues:'));
      if (!results.firebase.success) {
        console.log('- Ensure FIREBASE_SERVICE_ACCOUNT_PATH environment variable is set correctly');
        console.log('- Verify the service account has necessary permissions');
      }
      if (!results.godaddy.success) {
        console.log('- Check GODADDY_API_KEY and GODADDY_API_SECRET environment variables');
        console.log('- Ensure your GoDaddy API key has domain purchasing permissions');
      }
      if (!results.cloudRun.success) {
        console.log('- Verify DEPLOYMENT_SCRIPT path is correct');
        console.log('- Ensure the deployment script has execute permissions');
      }
    }
  });

// Helper function for domain deployment
async function deployToDomain(domain, siteType, specificSite, options = {}) {
  const spinner = ora(`Preparing to deploy ${domain}...`).start();
  
  try {
    // Step 1: Determine which Firebase site to use
    let siteId = specificSite;
    
    if (!siteId) {
      spinner.text = `Selecting optimal Firebase site for ${domain}...`;
      siteId = await siteSelector.selectSiteForDomain(domain, siteType);
    }
    
    spinner.succeed(`Selected Firebase site: ${siteId} for ${domain}`);
    
    // Step 2: Configure domain in Firebase
    spinner.text = `Configuring domain in Firebase Hosting...`;
    spinner.start();
    
    const configResult = await firebaseDomainManager.configureDomain(domain, siteId);
    
    if (!configResult.success) {
      spinner.fail(`Failed to configure domain in Firebase: ${configResult.error}`);
      return;
    }
    
    spinner.succeed(`Domain ${domain} configured in Firebase Hosting`);
    
    // Step 3: SEO optimization if enabled
    if (options.seo !== false) {
      spinner.text = `Optimizing SEO for ${domain}...`;
      spinner.start();
      
      const seoResult = await seoService.optimizeSite(siteId, {
        domain: domain,
        googleVerificationId: options.googleVerification,
        generateRobotsTxt: true,
        generateSitemap: true
      });
      
      if (seoResult.success) {
        spinner.succeed(`SEO optimization completed for ${domain}`);
      } else {
        spinner.warn(`SEO optimization had some issues: ${seoResult.error}`);
      }
    }
    
    // Step 4: Cloud Run deployment if enabled
    if (options.cloudRun !== false) {
      spinner.text = `Deploying to Cloud Run...`;
      spinner.start();
      
      const deployResult = await cloudRunDeployment.deployToCloudRun(
        domain.split('.')[0] + '-service', // Service name from domain
        domain
      );
      
      if (deployResult.success) {
        spinner.succeed(`Deployed to Cloud Run successfully`);
      } else {
        spinner.warn(`Cloud Run deployment had issues: ${deployResult.error}`);
      }
    }
    
    // Final status message
    if (!options.batchMode) {
      console.log(chalk.green('\nDeployment completed successfully!'));
      console.log(chalk.cyan(`Domain: ${domain}`));
      console.log(chalk.cyan(`Firebase Site: ${siteId}`));
      console.log(chalk.cyan(`Status: ${configResult.firebaseStatus || 'Pending'}`));
      
      console.log(chalk.yellow('\nNext Steps:'));
      console.log('1. DNS propagation may take up to 24-48 hours');
      console.log('2. SSL certificate provisioning will happen automatically');
      console.log(`3. Monitor status with: ${chalk.cyan(`domain-manager check ${domain}`)}`);
    }
  } catch (error) {
    spinner.fail(`Deployment failed: ${error.message}`);
    logger.error(`Deployment for ${domain} failed:`, error);
    throw error;
  }
}

// Domain status check command
program
  .command('check <domain>')
  .description('Check the status of a domain in Firebase Hosting')
  .action(async (domain) => {
    try {
      const spinner = ora(`Checking status for ${domain}...`).start();
      
      // Initialize Firebase
      await firebaseDomainManager.initializeFirebase();
      
      // Find which site the domain is on
      const siteId = await findDomainSite(domain);
      
      if (!siteId) {
        spinner.fail(`Domain ${domain} not found in any Firebase Hosting site`);
        return;
      }
      
      // Check domain status
      const status = await firebaseDomainManager.checkFirebaseDomainStatus(domain, siteId);
      
      spinner.succeed(`Status retrieved for ${domain}`);
      
      console.log(chalk.green('\nDomain Status:'));
      console.log(`Domain: ${chalk.cyan(domain)}`);
      console.log(`Firebase Site: ${chalk.cyan(siteId)}`);
      console.log(`Status: ${getStatusColor(status.status)}`);
      console.log(`Certificate: ${getStatusColor(status.certStatus)}`);
      
      if (status.dnsRecords && status.dnsRecords.length > 0) {
        console.log(chalk.green('\nDNS Records:'));
        status.dnsRecords.forEach(record => {
          console.log(`${record.type} Record: ${chalk.cyan(record.name)} → ${chalk.yellow(record.value || record.data)}`);
        });
      }
    } catch (error) {
      logger.error('Status check failed:', error);
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

// Helper function to find which site a domain is on
async function findDomainSite(domain) {
  // Get all sites
  const sites = await siteSelector.getProjectSites();
  
  // Check each site for the domain
  for (const site of sites) {
    try {
      const result = await firebaseDomainManager.checkFirebaseDomainStatus(domain, site.name);
      if (result.success) {
        return site.name;
      }
    } catch (error) {
      // Ignore errors, just move to next site
    }
  }
  
  return null;
}

// Helper function to color-code status
function getStatusColor(status) {
  if (!status) return chalk.gray('Unknown');
  
  status = status.toUpperCase();
  
  if (status === 'ACTIVE' || status === 'OK') {
    return chalk.green(status);
  } else if (status === 'PENDING') {
    return chalk.yellow(status);
  } else if (status === 'FAILED' || status === 'ERROR') {
    return chalk.red(status);
  } else {
    return chalk.blue(status);
  }
}

// Parse command line arguments
program.parse(process.argv);

// If no arguments provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
