const admin = require('firebase-admin');
admin.initializeApp();
const functions = require('firebase-functions');
const ethers = require('ethers');
const axios = require('axios');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Import the content service
const contentService = require('./services/contentService');

// Import error logging utility
const { logger, logError, ErrorTypes } = require('./utils/errorLogging');

// Initialize Firebase Admin
admin.initializeApp();

/**
 * Roark Authorship Function
 * Manages creative work attribution and validation
 */
exports.roarkAuthorship = functions.https.onCall(async (data, context) => {
  // Validate user authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  try {
    // Validate creative work submission
    const { workTitle, contributionDetails, aiContributionPercentage } = data;

    // Roark 5.0 Authorship Model Validation
    const MAX_AI_CONTRIBUTION = 0.3;
    const MIN_HUMAN_CONTRIBUTION = 0.7;

    if (aiContributionPercentage > MAX_AI_CONTRIBUTION) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'AI contribution exceeds maximum allowed percentage'
      );
    }

    // Create creative passport
    const creativePassport = {
      id: ethers.utils.id(workTitle + Date.now()),
      title: workTitle,
      authorId: context.auth.uid,
      aiContributionPercentage,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      contributionDetails,
    };

    // Store in Firestore
    await admin
      .firestore()
      .collection('creativePassports')
      .doc(creativePassport.id)
      .set(creativePassport);

    return creativePassport;
  } catch (error) {
    console.error('Roark Authorship Error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Blockchain Integration Function
 * Handles IP registration and tracking on blockchain
 */
exports.blockchainIntegration = functions.https.onCall(
  async (data, context) => {
    // Validate user authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    try {
      const { creativePassportId, blockchainNetwork = 'ethereum' } = data;

      // Retrieve creative passport
      const passportSnapshot = await admin
        .firestore()
        .collection('creativePassports')
        .doc(creativePassportId)
        .get();

      if (!passportSnapshot.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Creative passport not found'
        );
      }

      const passportData = passportSnapshot.data();

      // Blockchain registration logic
      let provider;
      switch (blockchainNetwork) {
        case 'ethereum':
          provider = new ethers.providers.JsonRpcProvider(
            functions.config().blockchain.ethereum_rpc_url
          );
          break;
        default:
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Unsupported blockchain network'
          );
      }

      // Example blockchain transaction (requires actual smart contract ABI and address)
      const wallet = new ethers.Wallet(
        functions.config().blockchain.private_key,
        provider
      );

      // Placeholder for actual smart contract interaction
      const ipRegistryContract = new ethers.Contract(
        functions.config().blockchain.ip_registry_address,
        IPRegistryABI,
        wallet
      );

      const transaction = await ipRegistryContract.registerCreativeWork(
        passportData.id,
        passportData.title,
        passportData.authorId,
        passportData.aiContributionPercentage * 100
      );

      // Update passport with blockchain details
      await passportSnapshot.ref.update({
        blockchainTransaction: transaction.hash,
        blockchainNetwork,
        registeredAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        transactionHash: transaction.hash,
        blockNumber: transaction.blockNumber,
      };
    } catch (error) {
      console.error('Blockchain Integration Error:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  }
);

/**
 * Continuous Integration Governance (CIG) Framework
 * Manages automated testing and deployment workflows
 */
exports.cigFramework = functions.https.onCall(async (data, context) => {
  // Validate user authentication and permissions
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Admin access required'
    );
  }

  try {
    const {
      repositoryUrl,
      branch = 'main',
      deploymentEnvironment = 'staging',
    } = data;

    // Trigger CI/CD pipeline
    const githubToken = functions.config().github.token;
    const workflowDispatchUrl = `https://api.github.com/repos/${repositoryUrl}/actions/workflows/ci-cd.yml/dispatches`;

    const response = await axios.post(
      workflowDispatchUrl,
      {
        ref: branch,
        inputs: {
          environment: deploymentEnvironment,
        },
      },
      {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    return {
      status: 'triggered',
      workflowRunId: response.data.id,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };
  } catch (error) {
    console.error('CIG Framework Error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Content Submission Endpoint
exports.submitContent = functions.https.onCall(async (data, context) => {
  // Validate user authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  try {
    const { title, body, contributions, contentType = 'ARTICLE' } = data;

    // Validate required fields
    if (!title || !body || !contributions) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Content submission requires title, body, and contributions'
      );
    }

    // Submit content using ContentService
    const result = await contentService.submitContent(
      {
        title,
        body,
        contributions,
        contentType,
      },
      context.auth.uid
    );

    return result;
  } catch (error) {
    logger.error('Content submission error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Content Certification Endpoint
exports.certifyContent = functions.https.onCall(async (data, context) => {
  // Validate user authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  try {
    const { contentId } = data;

    if (!contentId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Content ID is required for certification'
      );
    }

    // Certify content using ContentService
    const result = await contentService.certifyContent(
      contentId,
      context.auth.uid
    );

    return result;
  } catch (error) {
    logger.error('Content certification error:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Content Publishing Endpoint
exports.publishContent = functions.https.onCall(async (data, context) => {
  // Validate user authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  try {
    const { contentId, platforms } = data;

    if (!contentId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Content ID is required for publishing'
      );
    }

    // Publish content using ContentService
    const result = await contentService.publishContent(
      contentId,
      context.auth.uid,
      platforms || []
    );

    return result;
  } catch (error) {
    logger.error('Content publishing error:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Content Analytics Update Endpoint
exports.updateContentAnalytics = functions.https.onCall(
  async (data, context) => {
    // Validate user authentication and admin rights
    if (!context.auth || !context.auth.token.admin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Admin access required'
      );
    }

    try {
      const { contentId } = data;

      if (!contentId) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Content ID is required for analytics update'
        );
      }

      // Update analytics using ContentService
      const result = await contentService.updateAnalytics(contentId);

      return result;
    } catch (error) {
      logger.error('Content analytics update error:', error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', error.message);
    }
  }
);

// Content Search Endpoint
exports.searchContent = functions.https.onCall(async (data, context) => {
  try {
    const { query, contentType, limit = 10 } = data;

    // Search content in Firestore
    let contentQuery = admin.firestore().collection('anthology_content');

    if (contentType) {
      contentQuery = contentQuery.where('contentType', '==', contentType);
    }

    if (query) {
      // Simple search by title (in a real implementation, this would use Firestore full-text search)
      contentQuery = contentQuery
        .orderBy('title')
        .startAt(query)
        .endAt(query + '\uf8ff');
    }

    contentQuery = contentQuery.limit(limit);

    const snapshot = await contentQuery.get();

    const results = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      results.push({
        id: doc.id,
        title: data.title,
        contentType: data.contentType,
        status: data.status,
        humanContributionPercentage: data.humanContributionPercentage,
        createdAt: data.createdAt
          ? data.createdAt.toDate().toISOString()
          : null,
      });
    });

    return {
      success: true,
      results,
      count: results.length,
    };
  } catch (error) {
    logger.error('Content search error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Scheduled function to periodically update content certifications
exports.updateCIGCertifications = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async context => {
    try {
      logger.info('Running scheduled CIG certification update');

      // Get content that needs certification renewal
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const snapshot = await admin
        .firestore()
        .collection('anthology_content')
        .where('status', '==', 'certified')
        .where('certification.certifiedAt', '<', oneYearAgo)
        .limit(100)
        .get();

      if (snapshot.empty) {
        logger.info('No certifications require renewal at this time');
        return null;
      }

      logger.info(`Found ${snapshot.size} certifications requiring renewal`);

      // Process each content item that needs renewal
      const updatePromises = [];
      snapshot.forEach(doc => {
        const contentData = doc.data();

        // Update the certification with a new expiration date
        const updateData = {
          'certification.renewedAt':
            admin.firestore.FieldValue.serverTimestamp(),
          'certification.expiresAt': new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000
          ),
        };

        updatePromises.push(
          admin
            .firestore()
            .collection('anthology_content')
            .doc(doc.id)
            .update(updateData)
            .then(() => {
              logger.info(`Renewed certification for content: ${doc.id}`);
              return null;
            })
            .catch(error => {
              logger.error(
                `Error renewing certification for content ${doc.id}:`,
                error
              );
              return null;
            })
        );
      });

      await Promise.all(updatePromises);
      logger.info('Certification renewal process completed');

      return null;
    } catch (error) {
      logger.error('Error in scheduled certification update:', error);
      return null;
    }
  });

// Background function to process content creation events
exports.processContentCreation = functions.firestore
  .document('anthology_content/{contentId}')
  .onCreate(async (snapshot, context) => {
    try {
      const contentData = snapshot.data();
      const contentId = context.params.contentId;

      logger.info(`Processing new content creation: ${contentId}`);

      // Generate additional metadata for the content
      const metadata = {
        processingTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        contentHash: generateContentHash(contentData),
        wordCount: countWords(contentData.body || ''),
        readingTime: calculateReadingTime(contentData.body || ''),
      };

      // Update the content record with additional metadata
      await snapshot.ref.update({
        metadata: metadata,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`Content processing completed for: ${contentId}`);
      return null;
    } catch (error) {
      logger.error('Error processing content creation:', error);
      return null;
    }
  });

// Background function to handle blockchain revenue split events
exports.handleRevenueSplitEvent = functions.firestore
  .document('anthology_revenue/{contentId}/transactions/{transactionId}')
  .onCreate(async (snapshot, context) => {
    try {
      const transactionData = snapshot.data();
      const contentId = context.params.contentId;
      const transactionId = context.params.transactionId;

      logger.info(
        `Processing revenue split for content: ${contentId}, transaction: ${transactionId}`
      );

      if (!transactionData.amount || transactionData.processed) {
        logger.warn(
          `Invalid transaction data or already processed: ${transactionId}`
        );
        return null;
      }

      // Get content ownership information
      const contentSnapshot = await admin
        .firestore()
        .collection('anthology_content')
        .doc(contentId)
        .get();

      if (!contentSnapshot.exists) {
        logger.error(`Content not found for revenue split: ${contentId}`);
        return null;
      }

      const contentData = contentSnapshot.data();
      const authorId = contentData.userId;

      // Calculate revenue shares (80% author, 20% platform)
      const totalAmount = transactionData.amount;
      const authorShare = totalAmount * 0.8;
      const platformShare = totalAmount * 0.2;

      // Create revenue split record
      const revenueSplitData = {
        transactionId: transactionId,
        contentId: contentId,
        authorId: authorId,
        totalAmount: totalAmount,
        authorShare: authorShare,
        platformShare: platformShare,
        currency: transactionData.currency || 'USD',
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: transactionData.source || 'unknown',
      };

      // Update transaction record as processed
      await snapshot.ref.update({
        processed: true,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        authorShare: authorShare,
        platformShare: platformShare,
      });

      // Create revenue split record
      await admin
        .firestore()
        .collection('revenue_splits')
        .doc(transactionId)
        .set(revenueSplitData);

      // Update author's balance
      await admin
        .firestore()
        .collection('users')
        .doc(authorId)
        .collection('earnings')
        .doc(transactionId)
        .set({
          amount: authorShare,
          contentId: contentId,
          transactionId: transactionId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: 'pending',
          source: transactionData.source || 'unknown',
        });

      logger.info(`Revenue split processed for transaction: ${transactionId}`);
      return null;
    } catch (error) {
      logger.error('Error processing revenue split:', error);
      return null;
    }
  });

// Utility functions
function generateContentHash(content) {
  const contentString = JSON.stringify({
    title: content.title,
    body: content.body,
    userId: content.userId,
    contentType: content.contentType,
  });

  return crypto.createHash('sha256').update(contentString).digest('hex');
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function calculateReadingTime(text) {
  const wordsPerMinute = 200;
  const wordCount = countWords(text);
  return Math.ceil(wordCount / wordsPerMinute);
}

// Export functions for deployment
module.exports = {
  roarkAuthorship,
  blockchainIntegration,
  cigFramework,
  submitContent,
  certifyContent,
  publishContent,
  updateContentAnalytics,
  searchContent,
  updateCIGCertifications,
  processContentCreation,
  handleRevenueSplitEvent,
};
