/**
 * Cloud Run Deployment Integration
 * 
 * Triggers Cloud Run deployments after domains are configured
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const winston = require('winston');

// Initialize logger
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
    new winston.transports.File({ filename: 'cloud-run-deployment.log' })
  ]
});

// Configuration
const config = {
  deploymentScript: process.env.DEPLOYMENT_SCRIPT || 'users/asoos/deployment.sh',
  region: process.env.CLOUD_RUN_REGION || 'us-west1',
  concurrency: parseInt(process.env.DEPLOY_CONCURRENCY || '2', 10),
  timeout: parseInt(process.env.DEPLOY_TIMEOUT || '900000', 10) // 15 minutes
};

/**
 * Validate deployment script exists
 * @returns {Promise<boolean>} True if valid
 */
async function validateDeploymentScript() {
  try {
    const scriptStats = await fs.stat(config.deploymentScript);
    if (!scriptStats.isFile()) {
      logger.error(`Deployment script ${config.deploymentScript} is not a file`);
      return false;
    }
    
    // Check if executable
    try {
      await fs.access(config.deploymentScript, fs.constants.X_OK);
    } catch (error) {
      logger.warn(`Deployment script ${config.deploymentScript} is not executable, attempting to make it executable`);
      await fs.chmod(config.deploymentScript, '755');
    }
    
    return true;
  } catch (error) {
    logger.error(`Deployment script validation failed: ${error.message}`);
    return false;
  }
}

/**
 * Deploy a service to Cloud Run
 * @param {string} service Service name to deploy
 * @param {string} domain Associated domain (for tagging)
 * @returns {Promise<Object>} Deployment result
 */
async function deployToCloudRun(service, domain) {
  try {
    logger.info(`Deploying service ${service} for domain ${domain} to Cloud Run in ${config.region}...`);
    
    // Create environment for deployment
    const env = {
      ...process.env,
      SERVICE_NAME: service,
      DEPLOY_REGION: config.region,
      ASSOCIATED_DOMAIN: domain
    };
    
    // Execute deployment script
    const output = execSync(`${config.deploymentScript}`, {
      env,
      timeout: config.timeout,
      encoding: 'utf8'
    });
    
    logger.info(`Successfully deployed ${service} to Cloud Run`);
    return {
      success: true,
      service,
      domain,
      region: config.region,
      output: output.trim()
    };
  } catch (error) {
    logger.error(`Failed to deploy ${service} to Cloud Run: ${error.message}`);
    return {
      success: false,
      service,
      domain,
      error: error.message,
      stdout: error.stdout?.toString(),
      stderr: error.stderr?.toString()
    };
  }
}

/**
 * Deploy multiple services with controlled concurrency
 * @param {Array<Object>} deployments List of {service, domain} pairs to deploy
 * @returns {Promise<Object>} Deployment results
 */
async function deployServicesBatch(deployments) {
  logger.info(`Preparing to deploy ${deployments.length} services`);
  
  const results = {
    successful: [],
    failed: [],
    timestamp: new Date().toISOString()
  };
  
  // Check if deployment script exists
  const isValid = await validateDeploymentScript();
  if (!isValid) {
    throw new Error(`Invalid deployment script: ${config.deploymentScript}`);
  }
  
  // Deploy in batches to control concurrency
  for (let i = 0; i < deployments.length; i += config.concurrency) {
    const batch = deployments.slice(i, i + config.concurrency);
    logger.info(`Processing deployment batch ${Math.floor(i/config.concurrency) + 1}...`);
    
    const deployPromises = batch.map(async ({ service, domain }) => {
      try {
        const result = await deployToCloudRun(service, domain);
        if (result.success) {
          results.successful.push(result);
        } else {
          results.failed.push(result);
        }
        return result;
      } catch (error) {
        const failedResult = {
          success: false,
          service,
          domain,
          error: error.message
        };
        results.failed.push(failedResult);
        return failedResult;
      }
    });
    
    await Promise.all(deployPromises);
    
    // Small delay between batches
    if (i + config.concurrency < deployments.length) {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  logger.info(`Deployment complete. Success: ${results.successful.length}, Failed: ${results.failed.length}`);
  
  // Save results to file
  const resultsFilename = `cloud-run-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  await fs.writeFile(resultsFilename, JSON.stringify(results, null, 2));
  logger.info(`Results saved to ${resultsFilename}`);
  
  return results;
}

/**
 * Deploy Cloud Run services for domains
 * @param {Array<Object>} domainResults Results from domain configuration
 * @returns {Promise<Object>} Deployment results
 */
async function deployForDomains(domainResults) {
  if (!domainResults || !domainResults.successful || domainResults.successful.length === 0) {
    logger.warn('No successfully configured domains to deploy for');
    return {
      successful: [],
      failed: [],
      message: 'No domains to deploy for'
    };
  }
  
  // Generate service deployments based on domains
  const deployments = domainResults.successful.map(result => {
    const domain = result.domain;
    // Extract service name from domain - customize this logic as needed
    // Example: api.example.com -> api-service
    const serviceName = domain.split('.')[0] + '-service';
    
    return {
      service: serviceName,
      domain: domain
    };
  });
  
  logger.info(`Generated ${deployments.length} Cloud Run deployments`);
  
  return await deployServicesBatch(deployments);
}

// Export functions for module usage
module.exports = {
  deployToCloudRun,
  deployServicesBatch,
  deployForDomains
};

// Direct execution
if (require.main === module) {
  // Example: node cloud-run-deploy.js domain1.com domain2.com
  const domains = process.argv.slice(2);
  
  if (domains.length === 0) {
    console.error('Please provide at least one domain name');
    process.exit(1);
  }
  
  // Create simple domain results format
  const mockResults = {
    successful: domains.map(domain => ({ success: true, domain })),
    failed: []
  };
  
  deployForDomains(mockResults).catch(error => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });
}
