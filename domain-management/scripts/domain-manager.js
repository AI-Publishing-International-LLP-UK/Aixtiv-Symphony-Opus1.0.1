const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const openai = require('openai');
const winston = require('winston');

// Initialize Firebase
const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
const app = initializeApp({
  credential: cert(serviceAccount)
});

// Initialize Firestore
const db = getFirestore();

// Initialize OpenAI
const openaiClient = new openai.OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

/**
 * Validates a domain
 * @param {string} domain - The domain to validate
 * @returns {Promise<Object>} - Validation result
 */
async function validateDomain(domain) {
  try {
    logger.info(`Validating domain: ${domain}`);
    
    // Basic domain syntax validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return {
        isValid: false,
        reason: 'Invalid domain format'
      };
    }

    // Check if domain exists in our system
    const domainDoc = await db.collection('domains').doc(domain).get();
    
    // Domain validation result
    return {
      isValid: true,
      exists: domainDoc.exists,
      details: domainDoc.exists ? domainDoc.data() : null
    };
  } catch (error) {
    logger.error(`Error validating domain ${domain}:`, error);
    throw new Error(`Domain validation failed: ${error.message}`);
  }
}

/**
 * Runs the domain service with specified options
 * @param {string} domain - The domain to process
 * @param {Object} options - Service options
 * @returns {Promise<Object>} - Service result
 */
async function runDomainService(domain, options = {}) {
  try {
    logger.info(`Running domain service for: ${domain}`);

    // Validate domain first
    const validationResult = await validateDomain(domain);
    if (!validationResult.isValid) {
      throw new Error(`Invalid domain: ${validationResult.reason}`);
    }

    // Get AI analysis if enabled
    let aiAnalysis = null;
    if (process.env.ENABLE_AI_ANALYSIS === 'true') {
      const aiResponse = await openaiClient.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a domain analysis expert."
          },
          {
            role: "user",
            content: `Analyze this domain name for business potential: ${domain}`
          }
        ],
        max_tokens: 150
      });
      aiAnalysis = aiResponse.choices[0].message.content;
    }

    // Store the processing result
    const result = {
      domain,
      timestamp: new Date().toISOString(),
      validation: validationResult,
      aiAnalysis,
      status: 'processed'
    };

    // Save to Firestore
    await db.collection('domain-processing').doc(domain).set(result);

    return result;
  } catch (error) {
    logger.error(`Error running domain service for ${domain}:`, error);
    throw error;
  }
}

module.exports = {
  validateDomain,
  runDomainService
};

