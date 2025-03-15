/**
 * Firebase Site Selector and Domain Distribution Service
 *
 * Intelligently selects the optimal Firebase Hosting site for domain configuration
 * based on usage patterns, domain type, and free tier quota management.
 */

'use strict';

const admin = require('firebase-admin');
const axios = require('axios');
const winston = require('winston');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

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
    new winston.transports.File({ filename: 'site-selector.log' })
  ]
});

  // Configuration
const config = {
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'api-for-warp-drive',
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    // Map of site categories to site IDs
    siteCategoryMap: {
      // Character domains
      character: [
        'thehand-live',         // DrClaude/ThePoet
        'queen-lucy-live',      // Queen Lucy (QB)
        'themercurials-live',   // DrGrant (M1) and DrBurby (M2)
        'abuelos-live',         // Dr. Cypriot and Dr. Maria
        'thebrains-live',       // Professor Lee and Dr. Memoria
        'ladies-waiting-live',  // Sabina and Match
        'asoos-live'            // Spiritual apex
      ],
      
      // Opus/Wing domains
      opus: [
        'aixtiv-symphony-opus1', // Wing 1
        'aixtiv-symphony-opus2', // Wing 2
        'aixtiv-symphony-opus3', // Wing 3
        'vision-coaching-domain', // Wing 4
        'coaching2100',          // Wing 5
        'specialty-domains',     // Wing 6
        'regional-domains',      // Wing 7
        'knowledge-content',     // Wing 8
        'community-groups',      // Wing 9
        'primary-platforms'      // Wing 10
      ],
      
      // Pilot domains
      pilot: [
        'drgrant-live',  // 11 pilots for DrGrant.live
        'drgrant-ai'     // 11 pilots for DrGrant.ai
      ],
      
      // Command domains
      command: [
        'command-system-live'  // All command domains
      ],
      
      // 2100 family
      2100: [
        'coaching2100',
        'coaching2100-com',
        '2100-cool',
        'vision2100-com',
        'academy2100-com',
        'preparate2100-mx',
        'getready2100-com',
        'giftshop2100-com',
        'marketplace2100-com',
        'law2100-com',
        'governance2100-com',
        'urbanvision2100-com'
      ],
      
      // Aixtiv family
      aixtiv: [
        'aixtiv-com',
        'aixtiv-symphony-com',
        'workforce-aixtiv-com',
        'onboard-aixtiv-com'
      ],
      
      // Governance
      governance: [
        's2do-live',
        's2dogovernance-live',
        'law2100-com',
        'governance2100-com'
      ],
      
      // API and technical
      api: [
        'api-for-warp-drive',
        'api-for-warp-drive-coaching2100-com'
      ],
      
      // Content and community
      content: [
        'knowledge-content',
        'community-groups',
        'digital-art-nfts'
      ]
    },
    // Domain pattern matching for automatic categorization
    domainPatterns: [
      // Character patterns
      { pattern: /^(drclaude|thehand|thepoet)\./, category: 'character' },
      { pattern: /^queenlucy\./, category: 'character' },
      { pattern: /^(themercurials|drgrant|drburby)\./, category: 'character' },
      { pattern: /^(losabuelos|drcypriot|drmaria)\./, category: 'character' },
      { pattern: /^(thebrains|professorlee|drmemoria)\./, category: 'character' },
      { pattern: /^(drsabina|drmatch)\./, category: 'character' },
      { pattern: /^asoos\./, category: 'character' },
      
      // Opus/Wing patterns
      { pattern: /^(wing|opus)[0-9]+\./, category: 'opus' },
      { pattern: /^squadron[0-9]+\./, category: 'opus' },
      
      // Pilot patterns
      { pattern: /^pilot-[0-9]+\.drgrant\.(live|ai)/, category: 'pilot' },
      { pattern: /^(clinical|research|diagnostic)\.drgrant\.(live|ai)/, category: 'pilot' },
      
      // Command patterns
      { pattern: /^(dream|vision|prediction|wish|lenz)command\./, category: 'command' },
      
      // 2100 family patterns
      { pattern: /^.*2100\.(com|org|net|live|ai)/, category: '2100' },
      { pattern: /^2100\.(cool|news|education|systems)/, category: '2100' },
      
      // Aixtiv family patterns
      { pattern: /^aixtiv\.(com|co\.uk|world|eu)/, category: 'aixtiv' },
      { pattern: /^aixtiv-symphony\./, category: 'aixtiv' },
      { pattern: /^(workforce|onboard)\.aixtiv\./, category: 'aixtiv' },
      
      // Governance patterns
      { pattern: /^s2do(governance)?\./, category: 'governance' },
      { pattern: /^(law|governance)2100\./, category: 'governance' },
      
      // API patterns
      { pattern: /^api\./, category: 'api' },
      
      // Content patterns
      { pattern: /^(content|knowledge|community)\./, category: 'content' }
    ],
    // Free tier limits and management
    freeTierLimit: parseInt(process.env.FREE_TIER_LIMIT || '300', 10),
    domainsPerSite: parseInt(process.env.DOMAINS_PER_SITE || '20', 10),
    reservedDomainsPerSite: parseInt(process.env.RESERVED_DOMAINS || '5', 10),
    // Cache settings
    siteCountCacheTTL: parseInt(process.env.SITE_COUNT_CACHE_TTL || '3600000', 10), // 1 hour
  }
};

// Cache for site domain counts
const siteCountCache = {
  timestamp: 0,
  counts: {}
};

/**
 * Initialize Firebase Admin
 * @returns {Promise<void>}
 */
async function initializeFirebase() {
  if (admin.apps.length === 0) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(require(config.firebase.serviceAccountPath))
      });
      logger.info('Firebase Admin SDK initialized');
    } catch (error) {
      logger.error(`Failed to initialize Firebase: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Get Firebase access token for API requests
 * @returns {Promise<string>} The access token
 */
async function getAccessToken() {
  try {
    const token = await admin.app().options.credential.getAccessToken();
    return token.access_token;
  } catch (error) {
    logger.error(`Failed to get access token: ${error.message}`);
    throw error;
  }
}

/**
 * Get all Firebase Hosting sites for a project
 * @param {string} projectId Firebase project ID
 * @returns {Promise<Array>} List of sites
 */
async function getProjectSites(projectId = config.firebase.projectId) {
  try {
    logger.info(`Getting Firebase Hosting sites for project: ${projectId}`);
    
    const accessToken = await getAccessToken();
    const url = `https://firebasehosting.googleapis.com/v1beta1/projects/${projectId}/sites`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const sites = response.data.sites || [];
    logger.info(`Found ${sites.length} Firebase Hosting sites`);
    
    return sites;
  } catch (error) {
    logger.error(`Failed to get project sites: ${error.message}`);
    throw error;
  }
}

/**
 * Get domain count for a specific site
 * @param {string} siteId Firebase Hosting site ID
 * @returns {Promise<number>} Number of domains
 */
async function getSiteDomainCount(siteId) {
  try {
    logger.debug(`Getting domain count for site: ${siteId}`);
    
    const accessToken = await getAccessToken();
    const url = `https://firebasehosting.googleapis.com/v1beta1/sites/${siteId}/domains`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const domains = response.data.domains || [];
    return domains.length;
  } catch (error) {
    logger.error(`Failed to get domain count for site ${siteId}: ${error.message}`);
    return -1; // Indicate error
  }
}

/**
 * Get domain counts for all sites in the project
 * @param {boolean} useCache Whether to use cached counts
 * @returns {Promise<Object>} Map of site IDs to domain counts
 */
async function getAllSiteDomainCounts(useCache = true) {
  // Check if cache is valid
  const now = Date.now();
  if (useCache && now - siteCountCache.timestamp < config.firebase.siteCountCacheTTL) {
    logger.debug('Using cached site domain counts');
    return siteCountCache.counts;
  }
  
  try {
    logger.info('Getting domain counts for all sites');
    
    // Get all sites first
    const sites = await getProjectSites();
    const counts = {};
    
    // Get counts in batches to avoid rate limiting
    for (let i = 0; i < sites.length; i += 5) {
      const batch = sites.slice(i, i + 5);
      
      const countPromises = batch.map(async (site) => {
        const count = await getSiteDomainCount(site.name);
        return { site: site.name, count };
      });
      
      const results = await Promise.all(countPromises);
      
      results.forEach(({ site, count }) => {
        counts[site] = count;
      });
      
      // Small delay between batches
      if (i + 5 < sites.length) {
        await sleep(1000);
      }
    }
    
    // Update cache
    siteCountCache.timestamp = now;
    siteCountCache.counts = counts;
    
    logger.info(`Retrieved domain counts for ${Object.keys(counts).length} sites`);
    return counts;
  } catch (error) {
    logger.error(`Failed to get all site domain counts: ${error.message}`);
    throw error;
  }
}

/**
 * Determine the category for a domain based on patterns
 * @param {string} domain The domain to categorize
 * @returns {string} The category ('specialty' if no match)
 */
function categorizeDomain(domain) {
  if (!domain) {
    return 'specialty';
  }
  
  // Convert to lowercase for consistent matching
  const lowerDomain = domain.toLowerCase();
  
  // Check against patterns
  for (const { pattern, category } of config.firebase.domainPatterns) {
    if (pattern.test(lowerDomain)) {
      return category;
    }
  }
  
  // Default to specialty
  return 'specialty';
}

/**
 * Select the best site for a domain based on category and usage
 * @param {string} domain The domain to find a site for
 * @param {string} preferredCategory Optional preferred category
 * @returns {Promise<string>} The selected site ID
 */
async function selectSiteForDomain(domain, preferredCategory = null) {
  try {
    logger.info(`Selecting site for domain: ${domain}`);
    
    // Step 1: Determine category
    const category = preferredCategory || categorizeDomain(domain);
    logger.info(`Domain ${domain} categorized as: ${category}`);
    
    // Step 2: Get sites in this category
    const categorySites = config.firebase.siteCategoryMap[category] || [];
    
    if (categorySites.length === 0) {
      logger.warn(`No sites found for category ${category}, using specialty`);
      return selectSiteForDomain(domain, 'specialty');
    }
    
    // Step 3: Get current domain counts for all sites
    const allCounts = await getAllSiteDomainCounts();
    
    // Step 4: Find the best site with available capacity
    const candidates = [];
    
    for (const siteId of categorySites) {
      const count = allCounts[siteId] || 0;
      
      // Check if site has capacity
      if (count < config.firebase.domainsPerSite - config.firebase.reservedDomainsPerSite) {
        candidates.push({
          siteId,
          count,
          available: config.firebase.domainsPerSite - count
        });
      }
    }
    
    // Sort by most available capacity
    candidates.sort((a, b) => b.available - a.available);
    
    if (candidates.length > 0) {
      logger.info(`Selected site ${candidates[0].siteId} with ${candidates[0].available} slots available`);
      return candidates[0].siteId;
    }
    
    // Fall back to any site in the project with capacity
    logger.warn(`No sites with capacity in category ${category}, searching all sites`);
    
    for (const [siteId, count] of Object.entries(allCounts)) {
      if (count < config.firebase.domainsPerSite - config.firebase.reservedDomainsPerSite) {
        logger.info(`Selected fallback site ${siteId} with ${config.firebase.domainsPerSite - count} slots available`);
        return siteId;
      }
    }
    
    // If we get here, all sites are at capacity
    logger.error(`No sites with available capacity for domain: ${domain}`);
    throw new Error('All Firebase Hosting sites are at capacity');
  } catch (error) {
    logger.error(`Site selection failed: ${error.message}`);
    throw error;
  }
}

/**
 * Distribute multiple domains across sites optimally
 * @param {Array<string>} domains List of domains to distribute
 * @returns {Promise<Object>} Map of site IDs to domains
 */
async function distributeDomains(domains) {
  if (!domains || domains.length === 0) {
    return {};
  }
  
  try {
    logger.info(`Distributing ${domains.length} domains across sites`);
    
    const distribution = {};
    
    // Process each domain
    for (const domain of domains) {
      const siteId = await selectSiteForDomain(domain);
      
      if (!distribution[siteId]) {
        distribution[siteId] = [];
      }
      
      distribution[siteId].push(domain);
      
      // Update cache to reflect this allocation
      if (siteCountCache.counts[siteId] !== undefined) {
        siteCountCache.counts[siteId]++;
      }
    }
    
    // Log distribution
    for (const [siteId, siteDomains] of Object.entries(distribution)) {
      logger.info(`Site ${siteId}: ${siteDomains.length} domains`);
    }
    
    return distribution;
  } catch (error) {
    logger.error(`Domain distribution failed: ${error.message}`);
    throw error;
  }
}

/**
 * Get recommended site for a domain type
 * @param {string} domainType The type of domain (api, coaching, etc.)
 * @returns {Promise<Object>} Recommendation information
 */
async function getRecommendedSite(domainType) {
  try {
    const category = domainType || 'specialty';
    const sites = config.firebase.siteCategoryMap[category] || [];
    
    if (sites.length === 0) {
      return {
        success: false,
        domainType,
        message: `No sites found for domain type: ${domainType}`
      };
    }
    
    // Get domain counts
    const counts = await getAllSiteDomainCounts();
    
    // Find site with most capacity
    let bestSite = null;
    let bestAvailable = -1;
    
    for (const siteId of sites) {
      const count = counts[siteId] || 0;
      const available = config.firebase.domainsPerSite - count;
      
      if (available > bestAvailable) {
        bestSite = siteId;
        bestAvailable = available;
      }
    }
    
    return {
      success: true,
      domainType,
      recommendedSite: bestSite,
      availableSlots: bestAvailable,
      alternativeSites: sites.filter(s => s !== bestSite)
    };
  } catch (error) {
    logger.error(`Failed to get recommended site: ${error.message}`);
    return {
      success: false,
      domainType,
      error: error.message
    };
  }
}

// Export functions for module usage
module.exports = {
  initializeFirebase,
  getProjectSites,
  getSiteDomainCount,
  getAllSiteDomainCounts,
  categorizeDomain,
  selectSiteForDomain,
  distributeDomains,
  getRecommendedSite
};
