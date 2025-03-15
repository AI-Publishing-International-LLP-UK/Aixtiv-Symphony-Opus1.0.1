/**
 * SEO Optimization and Google Verification Service
 *
 * Provides functionality for SEO optimization, Google Search Console verification,
 * sitemap generation, and Firebase Hosting configuration for optimal SEO.
 */

'use strict';

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const winston = require('winston');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const xml2js = require('xml2js');

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
    new winston.transports.File({ filename: 'seo-optimization.log' })
  ]
});

// Configuration
const config = {
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'api-for-warp-drive',
    sites: JSON.parse(process.env.FIREBASE_SITES || '{}')
  },
  seo: {
    verificationMethod: process.env.VERIFICATION_METHOD || 'FILE', // FILE, DNS, META, HTML
    googleVerificationId: process.env.GOOGLE_VERIFICATION_ID,
    defaultMetaTags: {
      title: process.env.DEFAULT_TITLE || 'Professional Coaching Services',
      description: process.env.DEFAULT_DESCRIPTION || 'Expert coaching and professional development services',
      keywords: process.env.DEFAULT_KEYWORDS || 'coaching, professional development, training',
      author: process.env.DEFAULT_AUTHOR || 'Coaching 2100',
      robots: 'index, follow',
      viewport: 'width=device-width, initial-scale=1',
      'og:type': 'website',
      'twitter:card': 'summary_large_image'
    },
    robotsTxtTemplate: process.env.ROBOTS_TXT_TEMPLATE || './templates/robots.txt',
    sitemapTemplate: process.env.SITEMAP_TEMPLATE || './templates/sitemap.xml',
    temporaryDir: './seo-temp'
  },
  google: {
    searchConsoleApiKey: process.env.GOOGLE_API_KEY,
    searchConsoleScopes: ['https://www.googleapis.com/auth/webmasters'],
    analyticsId: process.env.GOOGLE_ANALYTICS_ID
  }
};

/**
 * Create Google site verification file for Firebase Hosting
 * @param {string} site The Firebase site ID
 * @param {string} verificationId The Google verification ID
 * @returns {Promise<Object>} Verification result
 */
async function createVerificationFile(site, verificationId) {
  if (!site || !verificationId) {
    throw new Error('Site ID and verification ID are required');
  }

  try {
    logger.info(`Creating Google verification file for site: ${site}`);
    
    // Create directory if it doesn't exist
    await fs.mkdir(config.seo.temporaryDir, { recursive: true });
    
    // Write verification file
    const filePath = path.join(config.seo.temporaryDir, `google${verificationId}.html`);
    const verificationContent = `google-site-verification: google${verificationId}.html`;
    
    await fs.writeFile(filePath, verificationContent);
    
    logger.info(`Created verification file at: ${filePath}`);
    
    // Deploy verification file to Firebase
    await exec(`firebase deploy --only hosting:${site} --public ${config.seo.temporaryDir}`);
    
    logger.info(`Successfully deployed verification file to Firebase site: ${site}`);
    
    return {
      success: true,
      site,
      verificationId,
      method: 'FILE'
    };
  } catch (error) {
    logger.error(`Failed to create verification file: ${error.message}`);
    throw new Error(`Verification file creation failed: ${error.message}`);
  }
}

/**
 * Create meta tag verification for Firebase Hosting
 * @param {string} site The Firebase site ID
 * @param {string} verificationId The Google verification ID
 * @param {string} indexPath Path to the index.html file
 * @returns {Promise<Object>} Verification result
 */
async function addMetaTagVerification(site, verificationId, indexPath = 'public/index.html') {
  if (!site || !verificationId) {
    throw new Error('Site ID and verification ID are required');
  }

  try {
    logger.info(`Adding meta tag verification for site: ${site}`);
    
    // Read index.html file
    const html = await fs.readFile(indexPath, 'utf8');
    
    // Check if verification meta tag already exists
    if (html.includes(`google-site-verification" content="${verificationId}"`)) {
      logger.info(`Verification meta tag already exists for site: ${site}`);
      return {
        success: true,
        site,
        verificationId,
        method: 'META',
        updated: false
      };
    }
    
    // Add verification meta tag
    const updatedHtml = html.replace(
      '<head>',
      `<head>\n    <meta name="google-site-verification" content="${verificationId}">`
    );
    
    // Write updated index.html
    await fs.writeFile(indexPath, updatedHtml);
    
    logger.info(`Added verification meta tag to: ${indexPath}`);
    
    // Deploy updated index.html
    await exec(`firebase deploy --only hosting:${site} --public ${path.dirname(indexPath)}`);
    
    logger.info(`Successfully deployed verification meta tag to Firebase site: ${site}`);
    
    return {
      success: true,
      site,
      verificationId,
      method: 'META',
      updated: true
    };
  } catch (error) {
    logger.error(`Failed to add meta tag verification: ${error.message}`);
    throw new Error(`Meta tag verification failed: ${error.message}`);
  }
}

/**
 * Generate robots.txt file for Firebase Hosting
 * @param {string} site The Firebase site ID
 * @param {Object} options Robots.txt configuration options
 * @returns {Promise<Object>} Generation result
 */
async function generateRobotsTxt(site, options = {}) {
  if (!site) {
    throw new Error('Site ID is required');
  }

  try {
    logger.info(`Generating robots.txt for site: ${site}`);
    
    // Create directory if it doesn't exist
    await fs.mkdir(config.seo.temporaryDir, { recursive: true });
    
    // Default template
    let robotsTxt = `User-agent: *
Allow: /
Sitemap: https://${options.domain || `${site}.web.app`}/sitemap.xml
`;

    // Add custom directives
    if (options.disallow && Array.isArray(options.disallow)) {
      options.disallow.forEach(path => {
        robotsTxt += `Disallow: ${path}\n`;
      });
    }
    
    if (options.crawlDelay) {
      robotsTxt += `Crawl-delay: ${options.crawlDelay}\n`;
    }
    
    // Write robots.txt file
    const filePath = path.join(config.seo.temporaryDir, 'robots.txt');
    await fs.writeFile(filePath, robotsTxt);
    
    logger.info(`Created robots.txt at: ${filePath}`);
    
    // Deploy robots.txt to Firebase
    await exec(`firebase deploy --only hosting:${site}:robots.txt --public ${config.seo.temporaryDir}`);
    
    logger.info(`Successfully deployed robots.txt to Firebase site: ${site}`);
    
    return {
      success: true,
      site,
      robotsTxt
    };
  } catch (error) {
    logger.error(`Failed to generate robots.txt: ${error.message}`);
    throw new Error(`Robots.txt generation failed: ${error.message}`);
  }
}

/**
 * Generate sitemap.xml file for Firebase Hosting
 * @param {string} site The Firebase site ID
 * @param {Array} pages List of pages to include in the sitemap
 * @returns {Promise<Object>} Generation result
 */
async function generateSitemap(site, pages = []) {
  if (!site) {
    throw new Error('Site ID is required');
  }

  try {
    logger.info(`Generating sitemap.xml for site: ${site}`);
    
    // Create directory if it doesn't exist
    await fs.mkdir(config.seo.temporaryDir, { recursive: true });
    
    // Default base URL
    const baseUrl = `https://${pages[0]?.domain || `${site}.web.app`}`;
    
    // Create sitemap XML
    const builder = new xml2js.Builder({
      rootName: 'urlset',
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: true, indent: '  ', newline: '\n' },
      headless: false,
      doctype: { sysID: 'http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd' },
      xmlns: { '': 'http://www.sitemaps.org/schemas/sitemap/0.9' }
    });
    
    // Add home page if no pages provided
    if (!pages || pages.length === 0) {
      pages = [{ path: '/', priority: 1.0 }];
    }
    
    // Build sitemap entries
    const urlset = {
      url: pages.map(page => {
        const url = page.path === '/' ? baseUrl : `${baseUrl}${page.path}`;
        return {
          loc: url,
          lastmod: page.lastmod || new Date().toISOString().split('T')[0],
          changefreq: page.changefreq || 'weekly',
          priority: page.priority || 0.8
        };
      })
    };
    
    const sitemapXml = builder.buildObject(urlset);
    
    // Write sitemap.xml file
    const filePath = path.join(config.seo.temporaryDir, 'sitemap.xml');
    await fs.writeFile(filePath, sitemapXml);
    
    logger.info(`Created sitemap.xml at: ${filePath}`);
    
    // Deploy sitemap.xml to Firebase
    await exec(`firebase deploy --only hosting:${site}:sitemap.xml --public ${config.seo.temporaryDir}`);
    
    logger.info(`Successfully deployed sitemap.xml to Firebase site: ${site}`);
    
    return {
      success: true,
      site,
      sitemapUrl: `${baseUrl}/sitemap.xml`,
      pages: pages.length
    };
  } catch (error) {
    logger.error(`Failed to generate sitemap: ${error.message}`);
    throw new Error(`Sitemap generation failed: ${error.message}`);
  }
}

/**
 * Add default SEO meta tags to an HTML file
 * @param {string} indexPath Path to the index.html file
 * @param {Object} metaTags Custom meta tags to add
 * @returns {Promise<Object>} Result of the operation
 */
async function addSeoMetaTags(indexPath, metaTags = {}) {
  try {
    logger.info(`Adding SEO meta tags to: ${indexPath}`);
    
    // Read index.html file
    const html = await fs.readFile(indexPath, 'utf8');
    
    // Combine default and custom meta tags
    const tags = { ...config.seo.defaultMetaTags, ...metaTags };
    
    // Generate meta tags HTML
    let metaTagsHtml = '';
    Object.entries(tags).forEach(([name, content]) => {
      // Skip if already exists
      if (html.includes(`name="${name}"`) || html.includes(`property="${name}"`)) {
        return;
      }
      
      // Handle special tags
      if (name.startsWith('og:')) {
        metaTagsHtml += `    <meta property="${name}" content="${content}">\n`;
      } else if (name.startsWith('twitter:')) {
        metaTagsHtml += `    <meta name="${name}" content="${content}">\n`;
      } else {
        metaTagsHtml += `    <meta name="${name}" content="${content}">\n`;
      }
    });
    
    // Add canonical URL if provided
    if (metaTags.canonicalUrl) {
      metaTagsHtml += `    <link rel="canonical" href="${metaTags.canonicalUrl}">\n`;
    }
    
    // Add Google Analytics if configured
    if (config.google.analyticsId && !html.includes('gtag')) {
      metaTagsHtml += `    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${config.google.analyticsId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${config.google.analyticsId}');
    </script>\n`;
    }
    
    // Add meta tags to head
    const updatedHtml = html.replace(
      '<head>',
      `<head>\n${metaTagsHtml}`
    );
    
    // Write updated index.html
    await fs.writeFile(indexPath, updatedHtml);
    
    logger.info(`Added SEO meta tags to: ${indexPath}`);
    
    return {
      success: true,
      path: indexPath,
      tagsAdded: Object.keys(tags).length
    };
  } catch (error) {
    logger.error(`Failed to add SEO meta tags: ${error.message}`);
    throw new Error(`Meta tags addition failed: ${error.message}`);
  }
}

/**
 * Complete SEO optimization for a Firebase Hosting site
 * @param {string} site The Firebase site ID
 * @param {Object} options SEO optimization options
 * @returns {Promise<Object>} Optimization result
 */
async function optimizeSite(site, options = {}) {
  if (!site) {
    throw new Error('Site ID is required');
  }

  try {
    logger.info(`Starting complete SEO optimization for site: ${site}`);
    
    const results = {
      site,
      verificationResult: null,
      robotsTxtResult: null,
      sitemapResult: null,
      metaTagsResult: null
    };
    
    // Step 1: Google verification
    if (options.googleVerificationId || config.seo.googleVerificationId) {
      const verificationId = options.googleVerificationId || config.seo.googleVerificationId;
      
      if (config.seo.verificationMethod === 'FILE') {
        results.verificationResult = await createVerificationFile(site, verificationId);
      } else if (config.seo.verificationMethod === 'META') {
        results.verificationResult = await addMetaTagVerification(site, verificationId, options.indexPath);
      }
    }
    
    // Step 2: Generate robots.txt
    if (options.generateRobotsTxt) {
      results.robotsTxtResult = await generateRobotsTxt(site, {
        domain: options.domain,
        disallow: options.disallowPaths,
        crawlDelay: options.crawlDelay
      });
    }
    
    // Step 3: Generate sitemap.xml
    if (options.generateSitemap) {
      results.sitemapResult = await generateSitemap(site, options.pages);
    }
    
    // Step 4: Add SEO meta tags to index.html
    if (options.addMetaTags && options.indexPath) {
      results.metaTagsResult = await addSeoMetaTags(options.indexPath, options.metaTags);
    }
    
    logger.info(`Completed SEO optimization for site: ${site}`);
    
    return {
      success: true,
      ...results
    };
  } catch (error) {
    logger.error(`SEO optimization failed: ${error.message}`);
    return {
      success: false,
      site,
      error: error.message
    };
  }
}

/**
 * Submit a site to Google Search Console
 * @param {string} domain The domain to submit
 * @param {string} verificationToken The verification token
 * @returns {Promise<Object>} Submission result
 */
async function submitToSearchConsole(domain, verificationToken) {
  // Note: This function requires Google Search Console API integration
  // which needs OAuth2 authentication. A simplified version is provided.
  
  logger.info(`Submitting site to Google Search Console is a manual process.`);
  logger.info(`Please visit https://search.google.com/search-console/welcome`);
  logger.info(`Use verification token: ${verificationToken}`);
  
  return {
    success: true,
    domain,
    instructions: "Manual submission required. See logs for details."
  };
}

// Export functions for module usage
module.exports = {
  createVerificationFile,
  addMetaTagVerification,
  generateRobotsTxt,
  generateSitemap,
  addSeoMetaTags,
  optimizeSite,
  submitToSearchConsole
};
