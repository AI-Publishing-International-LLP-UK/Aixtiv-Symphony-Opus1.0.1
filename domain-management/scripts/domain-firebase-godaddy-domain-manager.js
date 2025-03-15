/**
 * Firebase Hosting - GoDaddy Domain Manager
 * 
 * High-performance, error-resistant domain configuration tool that integrates
 * Firebase Hosting with GoDaddy domains for seamless setup.
 */

'use strict';

const config = require('config');
const admin = require('firebase-admin');
const axios = require('axios');
const { promisify } = require('util');
const fs = require('fs').promises;
const pThrottle = require('p-throttle').default; // For rate limiting API calls
const pRetry = require('p-retry');       // For advanced retries
const pMap = require('p-map');           // For controlled parallel execution
const winston = require('winston');      // For advanced logging
require('dotenv').config();              // For environment variables

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
    new winston.transports.File({ filename: 'domain-operations.log' })
  ]
});

// Configuration from environment variables
const serviceConfig = {
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'api-for-warp-drive',
    sites: {
      // Character domains with their specific site IDs
      'asoos': 'asoos-live',  // Spiritual apex
      'thehand': 'thehand-live', 
      'drclaude': 'thehand-live',
      'thepoet': 'thehand-live',
      'queenlucy': 'queen-lucy-live',  // Queen Bee (QB)
      
      // The Mercurials - Crystal Chairs of Justice
      'themercurials': 'themercurials-live',
      'drgrant': 'themercurials-live',  // M1
      'drburby': 'themercurials-live',  // M2
      
      // Los Abuelos
      'losabuelos': 'abuelos-live',
      'drcypriot': 'abuelos-live',  // African American grandfather
      'drmaria': 'abuelos-live',    // Italian grandmother
      
      // The Brains
      'thebrains': 'thebrains-live',
      'professorlee': 'thebrains-live',  // Chinese master of library science
      'drmemoria': 'thebrains-live',     // British storymaker
      
      // The Ladies in Waiting
      'drsabina': 'ladies-waiting-live',  // Hispanic CEO 
      'drmatch': 'ladies-waiting-live',   // Arab COO
      
      // Opus/Wing equivalence - specific site IDs
      'wing1': 'aixtiv-symphony-opus1',
      'opus1': 'aixtiv-symphony-opus1',
      'wing2': 'aixtiv-symphony-opus2',
      'opus2': 'aixtiv-symphony-opus2',
      'wing3': 'aixtiv-symphony-opus3',
      'opus3': 'aixtiv-symphony-opus3',
      'wing4': 'vision-coaching-domain',  // Opus 4 maps to this site
      'opus4': 'vision-coaching-domain',
      'wing5': 'coaching2100',            // Opus 5 maps to this site
      'opus5': 'coaching2100',
      'wing6': 'specialty-domains',       // Opus 6 maps to this site
      'opus6': 'specialty-domains',
      'wing7': 'regional-domains',        // Opus 7 maps to this site
      'opus7': 'regional-domains',
      'wing8': 'knowledge-content',       // Opus 8 maps to this site
      'opus8': 'knowledge-content',
      'wing9': 'community-groups',        // Opus 9 maps to this site
      'opus9': 'community-groups',
      'wing10': 'primary-platforms',      // Opus 10 maps to this site
      'opus10': 'primary-platforms',
      
      // Squadron domains
      'squadron1': 'squadron-live-1',
      'squadron2': 'squadron-live-2',
      'squadron3': 'squadron-live-3',
      'squadron4': 'squadron-live-4',
      'squadron5': 'squadron-live-5',
      'squadron6': 'squadron-live-6',
      
      // Command system domains
      'dreamcommand': 'command-system-live',
      'visioncommand': 'command-system-live',
      'predictioncommand': 'command-system-live',
      'wishcommand': 'command-system-live',
      'lenzcommand': 'command-system-live',
      
      // Pilot domains for drgrant.live and drgrant.ai
      'drgrant-pilot1': 'drgrant-live',  // Clinical Assistant
      'drgrant-pilot2': 'drgrant-live',  // Research Analyst
      'drgrant-pilot3': 'drgrant-live',  // Diagnostic Support
      'drgrant-pilot4': 'drgrant-live',  // Patient Educator
      'drgrant-pilot5': 'drgrant-live',  // Treatment Planner
      'drgrant-pilot6': 'drgrant-live',  // Medical Researcher
      'drgrant-pilot7': 'drgrant-live',  // Healthcare Navigator
      'drgrant-pilot8': 'drgrant-live',  // Clinical Trainer
      'drgrant-pilot9': 'drgrant-live',  // Medical Summarizer
      'drgrant-pilot10': 'drgrant-live', // Protocol Advisor
      'drgrant-pilot11': 'drgrant-live', // Patient Advocate
      
      // 2100 family domains
      'coaching2100': 'coaching2100',  // Executive Leadership Coaching
      'coaching2100-com': 'coaching2100-com',
      'preparate2100': 'preparate2100-mx',  // Spanish AI Learning Hub
      'getready2100': 'getready2100-com',   // English counterpart
      '2100-cool': '2100-cool',             // AI Copilot Showcase
      'vision2100': 'vision2100-com',       // Visualization Center
      'academy2100': 'academy2100-com',     // Learning Management System
      'giftshop2100': 'giftshop2100-com',   // E-Commerce Store
      'marketplace2100': 'marketplace2100-com', // Product Marketplace
      'law2100': 'law2100-com',             // Legal Platform
      'governance2100': 'governance2100-com', // AI Governance Systems
      'urbanvision2100': 'urbanvision2100-com', // Community Development
      
      // Aixtiv family domains
      'aixtiv': 'aixtiv-com',               // Main hub
      'aixtiv-symphony': 'aixtiv-symphony-com', // Proactive AI System
      'workforce-aixtiv': 'workforce-aixtiv-com', // Workforce Solutions
      'onboard-aixtiv': 'onboard-aixtiv-com',   // Onboarding Gateway
      
      // S2DO domains
      's2do': 's2do-live',
      's2do-governance': 's2dogovernance-live',
      
      // Agency domains
      'c2100-agency': 'c2100-agency',
      'ai-ip': 'ai-ip-co',
      
      // Additional site mappings from original Firebase project
      'api': 'api-for-warp-drive',
      'api-coaching': 'api-for-warp-drive-coaching2100-com',
      'ai-agents': 'ai-pilot-agents',
      'symphony': 'aixtiv-symphony-opus1',
      'network': 'bacasu-network',
      'bcs': 'bcs-platform',
      'professional': 'professional-dev'
    },
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    // Free tier limits
    freeTierDomainsPerProject: parseInt(process.env.FREE_TIER_DOMAINS || '300', 10),
    freeTierDomainsPerDay: parseInt(process.env.FREE_TIER_DOMAINS_PER_DAY || '50', 10)
  },
  godaddy: {
    apiKey: process.env.GODADDY_API_KEY,
    apiSecret: process.env.GODADDY_API_SECRET,
    endpoint: process.env.GODADDY_API_URL || 'https://api.godaddy.com',
    // Domain purchasing configuration
    purchaseEnabled: process.env.ENABLE_DOMAIN_PURCHASE === 'true',
    purchaseDefaults: {
      consent: {
        agreementKeys: ["DNRA"],
        agreedBy: process.env.GODADDY_AGREED_BY || process.env.USER || 'domain-admin',
        agreedAt: new Date().toISOString()
      },
      contactRegistrant: JSON.parse(process.env.GODADDY_CONTACT || '{}')
    }
  },
  performance: {
    batchSize: parseInt(process.env.BATCH_SIZE || '10', 10),
    concurrency: parseInt(process.env.CONCURRENCY || '3', 10), // Reduced for free tier
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '5', 10),
    retryDelay: parseInt(process.env.RETRY_DELAY || '1000', 10),
    timeout: parseInt(process.env.TIMEOUT || '30000', 10),
    apiThrottleLimit: parseInt(process.env.API_THROTTLE_LIMIT || '3', 10), // Reduced for stability
    apiThrottleInterval: parseInt(process.env.API_THROTTLE_INTERVAL || '1500', 10), // Increased interval
    // Daily domain quota management
    maxDomainsPerBatch: parseInt(process.env.MAX_DOMAINS_PER_BATCH || '25', 10),
    batchDelayMinutes: parseInt(process.env.BATCH_DELAY_MINUTES || '15', 10)
  },
  cloudRun: {
    region: process.env.CLOUD_RUN_REGION || 'us-west1',
    deploymentScript: process.env.DEPLOYMENT_SCRIPT || 'users/asoos/deployment.sh'
  },
  seo: {
    enableOptimization: process.env.ENABLE_SEO === 'true',
    googleVerification: process.env.GOOGLE_VERIFICATION_ID,
    generateSitemap: process.env.GENERATE_SITEMAP === 'true',
    generateRobotsTxt: process.env.GENERATE_ROBOTS_TXT === 'true',
    metaTagsFile: process.env.META_TAGS_FILE || './seo/meta-tags.json',
    defaultDescription: process.env.DEFAULT_META_DESCRIPTION || 'Professional coaching and development services',
    defaultKeywords: process.env.DEFAULT_META_KEYWORDS || 'coaching, professional development, training',
    // Character-specific meta descriptions
    characterDescriptions: {
      'asoos': 'Spiritual apex of the domain ecosystem, representing transcendence and higher meaning.',
      'thehand': 'Trusted advisor with eloquence and wisdom, bridging vision and execution.',
      'drclaude': 'The most trusted advisor of Visionary 1, communicating with eloquence and clarity.',
      'thepoet': 'Artistic expression of wisdom and guidance through beautiful language.',
      'queenlucy': 'Queen Bee (QB), the Boss, rock of strength and central leadership.',
      'themercurials': 'Greek-inspired messengers representing velocity, cyber security, and justice.',
      'drgrant': 'M1 of The Mercurials, divine messenger who navigates extremes.',
      'drburby': 'M2 of The Mercurials, protector who ensures safe passage through transformation.',
      'losabuelos': 'Beloved wisdom figures bringing warmth, understanding, and cultural depth.',
      'drcypriot': 'African American grandfather figure teaching empathy and understanding.',
      'drmaria': 'Italian grandmother whose love and cooking create bridges between cultures.',
      'thebrains': 'Symbiotic partnership of Eastern wisdom and Western storytelling.',
      'professorlee': 'Chinese Master of Library Science representing Eastern wisdom traditions.',
      'drmemoria': 'British storymaker preserving narrative and collective memory.',
      'drsabina': 'Hispanic CEO, part of the feminine leadership trio.',
      'drmatch': 'Arab COO, partner in the feminine leadership team.'
    }
  },
  // Pilot configuration for path-based routing
  pilots: {
    domains: {
      'drgrant.live': 'drgrant-live',
      'drgrant.ai': 'drgrant-ai'
    },
    paths: {
      'drgrant.live': {
        'pilot-1': '/clinical',
        'pilot-2': '/research',
        'pilot-3': '/diagnostic',
        'pilot-4': '/education',
        'pilot-5': '/treatment',
        'pilot-6': '/medical-research',
        'pilot-7': '/navigator',
        'pilot-8': '/training',
        'pilot-9': '/summarize',
        'pilot-10': '/protocols',
        'pilot-11': '/advocate'
      },
      'drgrant.ai': {
        'pilot-1': '/assistant',
        'pilot-2': '/analyst',
        'pilot-3': '/diagnosis',
        'pilot-4': '/learn',
        'pilot-5': '/plan',
        'pilot-6': '/studies',
        'pilot-7': '/guide',
        'pilot-8': '/learn',
        'pilot-9': '/brief',
        'pilot-10': '/advisor',
        'pilot-11': '/support'
      }
    },
    // Map pilots to opus versions
    opusVersions: {
      'pilot-1': 'aixtiv-symphony-opus5.0.1',
      'pilot-2': 'aixtiv-symphony-opus7.0.1',
      'pilot-3': 'aixtiv-symphony-opus3.0.1',
      'pilot-4': 'aixtiv-symphony-opus2.0.1',
      'pilot-5': 'aixtiv-symphony-opus6.0.1',
      'pilot-6': 'aixtiv-symphony-opus8.0.1',
      'pilot-7': 'aixtiv-symphony-opus1.0.1',
      'pilot-8': 'aixtiv-symphony-opus9.0.1',
      'pilot-9': 'aixtiv-symphony-opus4.0.1',
      'pilot-10': 'aixtiv-symphony-opus10.0.1',
      'pilot-11': 'aixtiv-symphony-opus3.0.1'
    }
  },
  // Character groupings for deployment
  characterGroups: {
    'apex': ['asoos.live', 'thehand.live', 'drclaude.live', 'thepoet.live', 'queenlucy.live'],
    'mercurials': ['themercurials.live', 'drgrant.live', 'drburby.live'],
    'abuelos': ['losabuelos.live', 'drcypriot.live', 'drmaria.live'],
    'brains': ['thebrains.live', 'professorlee.live', 'drmemoria.live'],
    'ladies-waiting': ['drsabina.live', 'drmatch.live']
  },
  // Directory structure for domain management
  directoryStructure: {
    base: 'users/as/asoos/domain-management',
    characters: 'characters',
    opus: 'opus',
    pilots: 'pilots',
    commands: 'commands',
    brands: 'brands',
    seo: 'seo',
    scripts: 'scripts',
    domains: 'domains',
    config: 'config'
  }
};

// Validate configuration
function validateConfig() {
  const requiredEnvVars = [
    'FIREBASE_SERVICE_ACCOUNT_PATH',
    'GODADDY_API_KEY',
    'GODADDY_API_SECRET'
  ];
  
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate service account file exists
  try {
    require(serviceConfig.firebase.serviceAccountPath);
  } catch (error) {
    throw new Error(`Service account file not found or invalid: ${error.message}`);
  }
}

// Initialize Firebase with error handling
async function initializeFirebase() {
  try {
    // Check if already initialized
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(require(serviceConfig.firebase.serviceAccountPath))
      });
      logger.info('Firebase Admin SDK initialized successfully');
    }
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK', { error: error.message });
    throw new Error(`Firebase initialization failed: ${error.message}`);
  }
}

// Get Firebase access token with caching
let cachedToken = null;
let tokenExpiry = 0;

async function getFirebaseAccessToken() {
  const currentTime = Date.now();
  
  // Return cached token if still valid (with 5-minute buffer)
  if (cachedToken && tokenExpiry > currentTime + 300000) {
    return cachedToken;
  }
  
  try {
    const tokenData = await admin.app().options.credential.getAccessToken();
    cachedToken = tokenData.access_token;
    // Extract expiry from token or default to 1 hour
    tokenExpiry = tokenData.expires_in ? (currentTime + tokenData.expires_in * 1000) : (currentTime + 3600000);
    logger.debug('New Firebase access token obtained');
    return cachedToken;
  } catch (error) {
    logger.error('Failed to get Firebase access token', { error: error.message });
    throw new Error(`Failed to get access token: ${error.message}`);
  }
}

// Create axios instances with default configurations
const firebaseAxios = axios.create({
  timeout: config.get('api.firebase.timeout'),
  headers: {
    'Content-Type': 'application/json'
  }
});

const godaddyAxios = axios.create({
  baseURL: serviceConfig.godaddy.endpoint,
  timeout: config.get('api.godaddy.timeout'),
  headers: {
    'Authorization': `sso-key ${serviceConfig.godaddy.apiKey}:${serviceConfig.godaddy.apiSecret}`,
    'Content-Type': 'application/json'
  }
});

// Implement retry and error handling for axios requests
firebaseAxios.interceptors.response.use(
  response => response,
  error => {
    logger.error('Firebase API error', {
      url: error.config.url,
      status: error.response?.status,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

godaddyAxios.interceptors.response.use(
  response => response,
  error => {
    logger.error('GoDaddy API error', {
      url: error.config.url,
      status: error.response?.status,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

// Apply rate limiting to API calls
const throttledFirebaseRequest = pThrottle(
  async (axiosConfig) => firebaseAxios(axiosConfig),
  config.get('performance.apiThrottleLimit'),
  config.get('performance.apiThrottleInterval')
);

const throttledGoDaddyRequest = pThrottle(
  async (axiosConfig) => godaddyAxios(axiosConfig),
  config.get('performance.apiThrottleLimit'),
  config.get('performance.apiThrottleInterval')
);

/**
 * Add a domain to Firebase Hosting
 * @param {string} domain The domain name to add
 * @param {string} platform The platform ('desktop' or 'mobile')
 * @returns {Promise<Object>} Domain configuration details
 */
async function addDomainToFirebase(domain, platform = 'desktop') {
  const accessToken = await getFirebaseAccessToken();
  
  // Select the appropriate site based on platform
  const site = config.firebase.sites[platform] || config.firebase.sites.desktop;
  
  const requestConfig = {
    method: 'post',
    url: `https://firebasehosting.googleapis.com/v1beta1/sites/${site}/domains`,
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    data: {
      domainName: domain,
      type: "USER_OWNED",
      site: `sites/${site}`,
      provisioning: {
        dns: {
          status: "PENDING"
        },
        certificateProvisioning: {
          certStatus: "PENDING"
        }
      }
    }
  };

  try {
    const response = await throttledFirebaseRequest(requestConfig);
    logger.info(`Domain added to Firebase: ${domain}`);
    return {
      success: true,
      domain,
      dnsRecords: response.data.dnsRecords || [],
      status: response.data.status || 'PENDING'
    };
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    logger.error(`Failed to add domain to Firebase: ${domain}`, { error: errorDetails });
    return {
      success: false,
      domain,
      error: errorDetails
    };
  }
}

/**
 * Check Firebase domain status
 * @param {string} domain The domain to check
 * @param {string} platform The platform ('desktop' or 'mobile')
 * @returns {Promise<Object>} Current domain status
 */
async function checkFirebaseDomainStatus(domain, platform = 'desktop') {
  const accessToken = await getFirebaseAccessToken();
  
  // Select the appropriate site based on platform
  const site = config.firebase.sites[platform] || config.firebase.sites.desktop;
  
  const requestConfig = {
    method: 'get',
    url: `https://firebasehosting.googleapis.com/v1beta1/sites/${site}/domains/${domain}`,
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  };

  try {
    const response = await throttledFirebaseRequest(requestConfig);
    logger.debug(`Domain status checked: ${domain}`, { status: response.data.status });
    return {
      success: true,
      domain,
      status: response.data.status || 'UNKNOWN',
      dnsRecords: response.data.dnsRecords || [],
      certStatus: response.data.provisioning?.certificateProvisioning?.certStatus || 'UNKNOWN'
    };
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    logger.error(`Failed to check domain status: ${domain}`, { error: errorDetails });
    return {
      success: false,
      domain,
      error: errorDetails
    };
  }
}

/**
 * Get domain details from GoDaddy
 * @param {string} domain The domain to check
 * @returns {Promise<Object>} Domain information
 */
async function getDomainFromGoDaddy(domain) {
  try {
    const response = await throttledGoDaddyRequest({
      method: 'get',
      url: `/v1/domains/${domain}`
    });
    logger.info(`Domain found in GoDaddy: ${domain}`);
    return {
      success: true,
      domain,
      data: response.data
    };
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    logger.error(`Failed to get domain from GoDaddy: ${domain}`, { error: errorDetails });
    return {
      success: false,
      domain,
      error: errorDetails
    };
  }
}

/**
 * Add DNS records to GoDaddy domain
 * @param {string} domain The domain to update
 * @param {Array} records DNS records to add
 * @returns {Promise<Object>} Result of the operation
 */
async function addDnsRecordsToGoDaddy(domain, records) {
  try {
    // Format records for GoDaddy API
    const godaddyRecords = records.map(record => ({
      type: record.type,
      name: record.name === '@' ? '@' : record.name,
      data: record.value || record.data,
      ttl: record.ttl || 3600
    }));

    const response = await throttledGoDaddyRequest({
      method: 'patch',
      url: `/v1/domains/${domain}/records`,
      data: godaddyRecords
    });
    
    logger.info(`DNS records added to GoDaddy domain: ${domain}`);
    return {
      success: true,
      domain,
      records: godaddyRecords
    };
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    logger.error(`Failed to add DNS records to GoDaddy: ${domain}`, { error: errorDetails });
    return {
      success: false,
      domain,
      error: errorDetails
    };
  }
}

/**
 * Fully configure a domain with Firebase and GoDaddy
 * @param {string} domain The domain to configure
 * @param {string} platform The platform ('desktop' or 'mobile')
 * @returns {Promise<Object>} Configuration result
 */
async function configureDomain(domain, platform = 'desktop') {
  if (!domain || typeof domain !== 'string') {
    throw new Error('Invalid domain name provided');
  }
  
  domain = domain.toLowerCase().trim();
  
  // Validate domain format
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;
  if (!domainRegex.test(domain)) {
    return {
      success: false,
      domain,
      error: 'Invalid domain format'
    };
  }

  try {
    // Step 1: Verify domain exists in GoDaddy
    const godaddyDomainResult = await getDomainFromGoDaddy(domain);
    if (!godaddyDomainResult.success) {
      return {
        success: false,
        domain,
        error: `Domain not found in GoDaddy: ${godaddyDomainResult.error}`
      };
    }

    // Step 2: Add domain to Firebase
    const firebaseResult = await pRetry(() => addDomainToFirebase(domain, platform), {
      retries: config.get('performance.maxRetries'),
      onFailedAttempt: error => {
        logger.warn(`Attempt ${error.attemptNumber} failed for ${domain} on ${platform}. Retrying...`, 
          { error: error.message });
      }
    });

    if (!firebaseResult.success) {
      return {
        success: false,
        domain,
        error: `Failed to add domain to Firebase: ${firebaseResult.error}`
      };
    }

    // Step 3: Add Firebase DNS records to GoDaddy
    const dnsResult = await pRetry(() => addDnsRecordsToGoDaddy(domain, firebaseResult.dnsRecords), {
      retries: config.get('performance.maxRetries'),
      onFailedAttempt: error => {
        logger.warn(`Attempt ${error.attemptNumber} failed for adding DNS records to ${domain}. Retrying...`, 
          { error: error.message });
      }
    });

    if (!dnsResult.success) {
      return {
        success: false,
        domain,
        stage: 'DNS_UPDATE',
        error: `Failed to update DNS records in GoDaddy: ${dnsResult.error}`
      };
    }

    // Step 4: Wait for initial status update
    await promisify(setTimeout)(5000);
    
    // Step 5: Check domain status in Firebase
    const statusResult = await checkFirebaseDomainStatus(domain, platform);

    return {
      success: true,
      domain,
      firebaseStatus: statusResult.success ? statusResult.status : 'PENDING',
      certStatus: statusResult.success ? statusResult.certStatus : 'PENDING',
      dnsRecords: firebaseResult.dnsRecords,
      message: 'Domain successfully configured with Firebase and GoDaddy'
    };
  } catch (error) {
    logger.error(`Failed to configure domain: ${domain}`, { error: error.message });
    return {
      success: false,
      domain,
      error: `Configuration failed: ${error.message}`
    };
  }
}

/**
 * Check current domain count in Firebase to avoid exceeding free tier limits
 * @param {string} platform The platform ('desktop' or 'mobile')
 * @returns {Promise<number>} Current domain count
 */
async function getCurrentDomainCount(platform = 'desktop') {
  const accessToken = await getFirebaseAccessToken();
  const site = config.firebase.sites[platform] || config.firebase.sites.desktop;
  
  try {
    const response = await throttledFirebaseRequest({
      method: 'get',
      url: `https://firebasehosting.googleapis.com/v1beta1/sites/${site}/domains`
    });
    
    const domains = response.data.domains || [];
    logger.info(`Current domain count for ${platform}: ${domains.length}`);
    return domains.length;
  } catch (error) {
    logger.warn(`Unable to get current domain count: ${error.message}`);
    // Default to a safe value if we can't determine the count
    return 200; 
  }
}

/**
 * Process a batch of domains with free tier quota management
 * @param {Array<string>} domains List of domains to process
 * @param {string} platform The platform ('desktop' or 'mobile')
 * @returns {Promise<Object>} Results of the batch operation
 */
async function processDomainsBatch(domains, platform = 'desktop') {
  if (!Array.isArray(domains) || domains.length === 0) {
    throw new Error('Invalid or empty domains list');
  }

  logger.info(`Starting batch processing of ${domains.length} domains for ${platform}`);
  
  // Initialize Firebase
  await initializeFirebase();
  
  // Check current domain count to avoid exceeding free tier
  const currentCount = await getCurrentDomainCount(platform);
  const remainingQuota = serviceConfig.firebase.freeTierDomainsPerProject - currentCount;
  
  if (remainingQuota <= 0) {
    logger.error(`Free tier domain limit reached for ${platform} (${currentCount}/${serviceConfig.firebase.freeTierDomainsPerProject})`);
    return {
      successful: [],
      failed: domains.map(domain => ({
        success: false,
        domain,
        platform,
        error: 'Free tier domain limit reached'
      })),
      timestamp: new Date().toISOString()
    };
  }
  
  // Determine how many domains we can process
  const processableDomains = domains.slice(0, Math.min(domains.length, remainingQuota, serviceConfig.performance.maxDomainsPerBatch));
  
  if (processableDomains.length < domains.length) {
    logger.warn(`Processing only ${processableDomains.length}/${domains.length} domains due to free tier limits`);
  }
  
  const results = {
    successful: [],
    failed: [],
    skipped: domains.slice(processableDomains.length).map(domain => ({
      domain,
      platform,
      reason: 'Exceeds free tier quota'
    })),
    timestamp: new Date().toISOString()
  };

  // Process domains with controlled concurrency
  const domainResults = await pMap(processableDomains, async (domain) => {
    try {
      const result = await configureDomain(domain, platform);
      if (result.success) {
        results.successful.push(result);
      } else {
        results.failed.push(result);
      }
      
      // Add small delay between domains to reduce API pressure
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return result;
    } catch (error) {
      const failedResult = {
        success: false,
        domain,
        platform,
        error: error.message
      };
      results.failed.push(failedResult);
      return failedResult;
    }
  }, { concurrency: serviceConfig.performance.concurrency });

  logger.info(`Batch processing complete. Success: ${results.successful.length}, Failed: ${results.failed.length}`);
  
  // Save results to file
  const resultsFilename = `domain-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  await fs.writeFile(resultsFilename, JSON.stringify(results, null, 2));
  logger.info(`Results saved to ${resultsFilename}`);
  
  return results;
}

/**
 * Monitor domain status until completion
 * @param {string} domain The domain to monitor
 * @param {string} platform The platform ('desktop' or 'mobile')
 * @param {number} timeout Maximum time to monitor in milliseconds
 * @returns {Promise<Object>} Final domain status
 */
async function monitorDomainStatus(domain, platform = 'desktop', timeout = 1800000) { // Default 30 minutes
  const startTime = Date.now();
  let status = null;
  
  logger.info(`Starting monitoring for domain: ${domain} on platform: ${platform}`);
  
  while (Date.now() - startTime < timeout) {
    status = await checkFirebaseDomainStatus(domain, platform);
    
    if (!status.success) {
      await promisify(setTimeout)(30000); // Wait 30 seconds before retrying
      continue;
    }
    
    // Log status change
    logger.info(`Domain ${domain} status: ${status.status}, Certificate: ${status.certStatus}`);
    
    // Check if configuration is complete
    if (status.status === 'ACTIVE' && status.certStatus === 'ACTIVE') {
      logger.info(`Domain ${domain} successfully configured`);
      return {
        success: true,
        domain,
        status: status.status,
        certStatus: status.certStatus,
        message: 'Domain configuration complete'
      };
    }
    
    // Check for failure states
    if (status.status === 'FAILED' || status.certStatus === 'FAILED') {
      logger.error(`Domain ${domain} configuration failed`, { status });
      return {
        success: false,
        domain,
        status: status.status,
        certStatus: status.certStatus,
        message: 'Domain configuration failed'
      };
    }
    
    // Wait before checking again
    await promisify(setTimeout)(60000); // Check every minute
  }
  
  logger.warn(`Monitoring timeout reached for domain: ${domain}`);
  return {
    success: false,
    domain,
    status: status?.status || 'UNKNOWN',
    certStatus: status?.certStatus || 'UNKNOWN',
    message: 'Monitoring timeout reached'
  };
}

/**
 * Main entry point
 * @param {Array<string>} domains List of domains to configure
 * @param {string} platform The platform ('desktop' or 'mobile')
 */
async function main(domains, platform = 'desktop') {
  try {
    validateConfig();
    logger.info('Starting domain configuration process');
    
    // Process domains in batches
    const results = await processDomainsBatch(domains, platform);
    
    logger.info('Domain configuration completed');
    logger.info(`Successful: ${results.successful.length}, Failed: ${results.failed.length}`);
    
    // Monitor successful domains
    if (results.successful.length > 0) {
      logger.info(`Monitoring ${results.successful.length} domains for completion`);
      
      const monitoringPromises = results.successful.map(result => 
        monitorDomainStatus(result.domain, platform));
      
      const monitoringResults = await Promise.all(monitoringPromises);
      
      const finalSuccessCount = monitoringResults.filter(r => r.success).length;
      logger.info(`Domain monitoring complete. Final success: ${finalSuccessCount}/${results.successful.length}`);
    }
    
    return results;
  } catch (error) {
    logger.error('Failed to run domain configuration', { error: error.message });
    throw error;
  }
}

// Export functions for module usage
/**
 * Integrate with Cloud Run deployment after domain configuration
 * @param {Object} domainResults Results from domain configuration
 * @returns {Promise<Object>} Deployment results
 */
async function triggerCloudRunDeployment(domainResults) {
  try {
    // Import Cloud Run deployment module
    const cloudRunDeployment = require('./cloud-run-deployment');
    logger.info('Triggering Cloud Run deployments for successful domains');
    
    const deploymentResults = await cloudRunDeployment.deployForDomains(domainResults);
    logger.info(`Cloud Run deployment complete. Success: ${deploymentResults.successful.length}, Failed: ${deploymentResults.failed.length}`);
    
    return deploymentResults;
  } catch (error) {
    logger.error('Failed to trigger Cloud Run deployments', { error: error.message });
    return {
      successful: [],
      failed: [],
      error: error.message
    };
  }
}

/**
 * Deploy a pilot to its domain with path-based routing
 * @param {string} pilotId The pilot ID (1-11)
 * @param {string} domain The domain (drgrant.live or drgrant.ai)
 * @param {Object} options Deployment options
 * @returns {Promise<Object>} Deployment result
 */
async function deployPilot(pilotId, domain, options = {}) {
  if (!pilotId || !domain) {
    throw new Error('Pilot ID and domain are required');
  }

  try {
    logger.info(`Deploying pilot ${pilotId} to ${domain}`);
    
    // Validate domain and pilot
    if (!serviceConfig.pilots.domains[domain]) {
      throw new Error(`Domain ${domain} is not configured for pilots`);
    }
    
    if (!serviceConfig.pilots.paths[domain][`pilot-${pilotId}`]) {
      throw new Error(`Pilot ${pilotId} is not configured for ${domain}`);
    }
    
    // Get site ID for this domain
    const siteId = serviceConfig.pilots.domains[domain];
    
    // Get path for this pilot
    const path = serviceConfig.pilots.paths[domain][`pilot-${pilotId}`];
    
    // Get opus version for this pilot
    const opusVersion = serviceConfig.pilots.opusVersions[`pilot-${pilotId}`];
    
    // Configure the domain if needed
    let domainResult = { success: true };
    if (!options.skipDomainConfig) {
      domainResult = await configureDomain(domain, siteId, {
        ...options,
        pilotId: pilotId,
        pilotPath: path,
        opusVersion: opusVersion
      });
      
      if (!domainResult.success) {
        throw new Error(`Failed to configure domain ${domain}: ${domainResult.error}`);
      }
    }
    
    // Set up path-based routing
    const routingResult = await setupPilotRouting(domain, pilotId, path, siteId, options);
    
    // Deploy pilot-specific content
    const contentResult = await deployPilotContent(domain, pilotId, path, siteId, options);
    
    return {
      success: true,
      domain,
      siteId,
      pilotId,
      path,
      opusVersion,
      domainResult,
      routingResult,
      contentResult
    };
  } catch (error) {
    logger.error(`Failed to deploy pilot ${pilotId} to ${domain}: ${error.message}`);
    return {
      success: false,
      domain,
      pilotId,
      error: error.message
    };
  }
}

/**
 * Set up path-based routing for a pilot
 * @param {string} domain The domain
 * @param {string} pilotId The pilot ID
 * @param {string} path The path for this pilot
 * @param {string} siteId The Firebase site ID
 * @param {Object} options Options
 * @returns {Promise<Object>} Routing setup result
 */
async function setupPilotRouting(domain, pilotId, path, siteId, options = {}) {
  try {
    logger.info(`Setting up routing for pilot ${pilotId} at ${domain}${path}`);
    
    // Create routing config
    const routingConfig = {
      rewrites: [
        {
          source: `${path}/**`,
          destination: '/index.html'
        },
        {
          source: `${path}/api/**`,
          function: `pilot${pilotId}Api`
        }
      ],
      headers: [
        {
          source: `${path}/**/*.@(js|css)`,
          headers: [
            {
              key: 'Cache-Control',
              value: 'max-age=604800'
            }
          ]
        }
      ]
    };
    
    // Write routing config to temp file
    const routingFile = path.join(
      serviceConfig.directoryStructure.base,
      serviceConfig.directoryStructure.pilots,
      domain.replace('.', '-'),
      `pilot-${pilotId}`,
      'firebase-routing.json'
    );
    
    await fs.writeFile(routingFile, JSON.stringify(routingConfig, null, 2));
    
    // Deploy routing config
    const deployCommand = `firebase target:apply hosting ${siteId} ${domain} && ` +
                        `firebase deploy --only hosting:${siteId}:${path} --project ${serviceConfig.firebase.projectId}`;
    
    const { stdout, stderr } = await exec(deployCommand);
    
    logger.info(`Routing setup complete for ${domain}${path}`);
    return {
      success: true,
      domain,
      pilotId,
      path,
      siteId
    };
  } catch (error) {
    logger.error(`Failed to set up routing for pilot ${pilotId}: ${error.message}`);
    throw error;
  }
}

/**
 * Deploy pilot-specific content
 * @param {string} domain The domain
 * @param {string} pilotId The pilot ID
 * @param {string} path The path for this pilot
 * @param {string} siteId The Firebase site ID
 * @param {Object} options Options
 * @returns {Promise<Object>} Content deployment result
 */
async function deployPilotContent(domain, pilotId, path, siteId, options = {}) {
  try {
    logger.info(`Deploying content for pilot ${pilotId} at ${domain}${path}`);
    
    // Source directory for pilot content
    const contentDir = path.join(
      config.directoryStructure.base,
      config.directoryStructure.pilots,
      domain.replace('.', '-'),
      `pilot-${pilotId}`,
      'content'
    );
    
    // Check if content directory exists
    try {
      await fs.access(contentDir, fs.constants.R_OK);
    } catch (error) {
      logger.warn(`Content directory for pilot ${pilotId} not found, creating default content`);
      
      // Create default content
      await fs.mkdir(contentDir, { recursive: true });
      
      // Create index.html with basic content
      const pilotInfo = getPilotInfo(pilotId, domain);
      const indexContent = generatePilotIndexHtml(pilotId, pilotInfo, domain, path);
      await fs.writeFile(path.join(contentDir, 'index.html'), indexContent);
    }
    
    // Deploy content
    const deployCommand = `firebase target:apply hosting ${siteId} ${domain} && ` +
                        `firebase deploy --only hosting:${siteId}:${path} --public ${contentDir} --project ${config.firebase.projectId}`;
    
    const { stdout, stderr } = await exec(deployCommand);
    
    // Handle SEO if enabled
    if (options.seo !== false && config.seo.enableOptimization) {
      await setupPilotSeo(domain, pilotId, path, siteId, options);
    }
    
    logger.info(`Content deployment complete for ${domain}${path}`);
    return {
      success: true,
      domain,
      pilotId,
      path,
      siteId
    };
  } catch (error) {
    logger.error(`Failed to deploy content for pilot ${pilotId}: ${error.message}`);
    throw error;
  }
}

/**
 * Deploy a batch of domains by character group
 * @param {string} characterGroup The character group (apex, mercurials, etc.)
 * @param {Array<string>} domains List of domains to deploy
 * @param {Object} options Deployment options
 * @returns {Promise<Object>} Deployment results
 */
async function deployCharacterGroup(characterGroup, domains = [], options = {}) {
  try {
    // If no domains provided, use all domains in this character group
    const domainsToProcess = domains.length > 0 ? 
                            domains : 
                            config.characterGroups[characterGroup] || [];
    
    if (domainsToProcess.length === 0) {
      throw new Error(`No domains defined for character group: ${characterGroup}`);
    }
    
    logger.info(`Deploying ${domainsToProcess.length} domains for character group: ${characterGroup}`);
    
    const results = {
      successful: [],
      failed: [],
      characterGroup,
      timestamp: new Date().toISOString()
    };
    
    // Process each domain
    for (const domain of domainsToProcess) {
      try {
        // Extract domain base (without TLD)
        const domainBase = domain.split('.')[0];
        
        // Determine site ID based on domain base
        let siteId = config.firebase.sites[domainBase];
        
        // If not found, try to determine from character group
        if (!siteId) {
          // Find matching character site ID
          switch (characterGroup) {
            case 'apex':
              if (domainBase === 'asoos') siteId = 'asoos-live';
              else if (['thehand', 'drclaude', 'thepoet'].includes(domainBase)) siteId = 'thehand-live';
              else if (domainBase === 'queenlucy') siteId = 'queen-lucy-live';
              break;
            case 'mercurials':
              siteId = 'themercurials-live';
              break;
            case 'abuelos':
              siteId = 'abuelos-live';
              break;
            case 'brains':
              siteId = 'thebrains-live';
              break;
            case 'ladies-waiting':
              siteId = 'ladies-waiting-live';
              break;
            default:
              break;
          }
        }
        
        if (!siteId) {
          throw new Error(`Could not determine site ID for domain: ${domain}`);
        }
        
        // Configure domain
        const domainResult = await configureDomain(domain, siteId, {
          ...options,
          characterGroup,
          // Set character-specific SEO if available
          seoDescription: config.seo.characterDescriptions[domainBase]
        });
        
        if (domainResult.success) {
          results.successful.push({
            domain,
            siteId,
            characterGroup,
            ...domainResult
          });
        } else {
          results.failed.push({
            domain,
            siteId,
            characterGroup,
            error: domainResult.error
          });
        }
      } catch (error) {
        results.failed.push({
          domain,
          characterGroup,
          error: error.message
        });
      }
    }
    
    // Generate report file
    const reportFile = `character-deploy-${characterGroup}-${new Date().toISOString().replace(/:/g, '-')}.json`;
    await fs.writeFile(reportFile, JSON.stringify(results, null, 2));
    
    logger.info(`Deployment for character group ${characterGroup} complete. Success: ${results.successful.length}, Failed: ${results.failed.length}`);
    
    return results;
  } catch (error) {
    logger.error(`Failed to deploy character group ${characterGroup}: ${error.message}`);
    throw error;
  }
}

module.exports = {
  configureDomain,
  processDomainsBatch,
  checkFirebaseDomainStatus,
  monitorDomainStatus,
  triggerCloudRunDeployment,
  getCurrentDomainCount,
  deployPilot,
  deployCharacterGroup,
  main
};

// Direct execution
if (require.main === module) {
  // Process command line arguments
  // Format: node script.js --platform=[desktop|mobile] domain1.com domain2.com
  let platform = 'desktop';
  let domains = [];
  
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--platform=')) {
      platform = arg.split('=')[1].toLowerCase();
      if (!['desktop', 'mobile'].includes(platform)) {
        console.error('Invalid platform. Use --platform=desktop or --platform=mobile');
        process.exit(1);
      }
    } else {
      domains.push(arg);
    }
  }
  
  if (domains.length === 0) {
    console.error('Please provide at least one domain name');
    process.exit(1);
  }
  
  console.log(`Configuring ${domains.length} domains for platform: ${platform}`);
  main(domains, platform).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}
