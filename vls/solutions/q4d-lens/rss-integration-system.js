/**
 * RSS Integration System
 * Connects RSS feeds to Firestore and Pinecone for the Q4D Lens system
 * Project ID: api-for-warp-drive
 * Domain: coaching2100.com
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { PineconeClient } = require('@pinecone-database/pinecone');
const axios = require('axios');
const Parser = require('rss-parser');
const { v4: uuidv4 } = require('uuid');
const natural = require('natural');
const { Embeddings } = require('@google-cloud/aiplatform');

/**
 * Main RSS Integration System
 * Fetches, processes, and stores RSS data
 */
class RSSIntegrationSystem {
  constructor(config) {
    // Initialize configuration
    this.config = {
      fetchInterval: 3600000, // 1 hour in milliseconds
      vectorDimensions: 768,
      processingBatchSize: 25,
      minContentLength: 100,
      maxContentAge: 30, // days
      ...config
    };
    
    // Initialize Firebase
    this.initializeFirebase();
    
    // Initialize Pinecone
    this.initializePinecone();
    
    // Initialize RSS Parser
    this.parser = new Parser({
      customFields: {
        item: [
          ['media:content', 'mediaContent', {keepArray: true}],
          ['content:encoded', 'contentEncoded'],
          ['dc:creator', 'creator']
        ]
      }
    });
    
    // Initialize embeddings API
    this.embeddings = new Embeddings({
      projectId: 'api-for-warp-drive',
      location: 'us-west1'
    });
    
    // Initialize NLP tools
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();
    
    // Initialize feed sources
    this.feedSources = [];
    
    // Load scheduled job
    this.scheduledJob = null;
  }
  
  /**
   * Initialize Firebase connection
   */
  initializeFirebase() {
    const serviceAccount = require('./service-account.json');
    
    initializeApp({
      credential: cert(serviceAccount),
      projectId: 'api-for-warp-drive',
      storageBucket: 'api-for-warp-drive.appspot.com'
    });
    
    this.firestore = getFirestore();
    this.feedsCollection = this.firestore.collection('rss_feeds');
    this.articlesCollection = this.firestore.collection('rss_articles');
    this.categoriesCollection = this.firestore.collection('rss_categories');
  }
  
  /**
   * Initialize Pinecone connection
   */
  async initializePinecone() {
    this.pinecone = new PineconeClient();
    
    await this.pinecone.init({
      apiKey: process.env.PINECONE_API_KEY,
      environment: 'us-west1-gcp'
    });
    
    // Check if index exists, create if not
    const indexList = await this.pinecone.listIndexes();
    
    if (!indexList.includes('q4d-rss-vectors')) {
      await this.pinecone.createIndex({
        name: 'q4d-rss-vectors',
        dimension: this.config.vectorDimensions,
        metric: 'cosine'
      });
    }
    
    this.index = this.pinecone.Index('q4d-rss-vectors');
  }
  
  /**
   * Start the RSS integration system
   */
  async start() {
    try {
      // Load feed sources from Firestore
      await this.loadFeedSources();
      
      // Perform initial fetch
      await this.processAllFeeds();
      
      // Set up scheduled job
      this.scheduledJob = setInterval(
        () => this.processAllFeeds(),
        this.config.fetchInterval
      );
      
      console.log('RSS Integration System started successfully');
      
      return true;
    } catch (error) {
      console.error('Error starting RSS Integration System:', error);
      throw error;
    }
  }
  
  /**
   * Stop the RSS integration system
   */
  stop() {
    if (this.scheduledJob) {
      clearInterval(this.scheduledJob);
      this.scheduledJob = null;
    }
    
    console.log('RSS Integration System stopped');
  }
  
  /**
   * Load feed sources from Firestore
   */
  async loadFeedSources() {
    try {
      const snapshot = await this.feedsCollection.get();
      
      if (snapshot.empty) {
        console.warn('No feed sources found in Firestore');
        await this.initializeDefaultFeeds();
        return this.loadFeedSources();
      }
      
      this.feedSources = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        this.feedSources.push({
          id: doc.id,
          url: data.url,
          name: data.name,
          category: data.category,
          tags: data.tags || [],
          assessmentFrameworks: data.assessmentFrameworks || [],
          priority: data.priority || 'normal',
          fetchInterval: data.fetchInterval || this.config.fetchInterval,
          lastFetched: data.lastFetched ? data.lastFetched.toDate() : null,
          status: data.status || 'active'
        });
      });
      
      console.log(`Loaded ${this.feedSources.length} feed sources from Firestore`);
      return this.feedSources;
    } catch (error) {
      console.error('Error loading feed sources:', error);
      throw error;
    }
  }
  
  /**
   * Initialize default feeds if none exist
   */
  async initializeDefaultFeeds() {
    console.log('Initializing default feeds...');
    
    const defaultFeeds = [
      // Assessment-related feeds
      {
        name: 'Hogan Assessments Blog',
        url: 'https://www.hoganassessments.com/blog/feed',
        category: 'assessments',
        tags: ['personality', 'leadership', 'talent-management'],
        assessmentFrameworks: ['hogan'],
        priority: 'high'
      },
      {
        name: 'MBTI Blog',
        url: 'https://www.themyersbriggs.com/en-US/Connect-With-Us/Blog/RSS',
        category: 'assessments',
        tags: ['personality', 'team-dynamics'],
        assessmentFrameworks: ['mbti'],
        priority: 'high'
      },
      {
        name: 'DiSC Blog',
        url: 'https://www.discprofile.com/blog/rss.xml',
        category: 'assessments',
        tags: ['behavior', 'communication', 'workplace'],
        assessmentFrameworks: ['disc'],
        priority: 'high'
      },
      
      // Career development feeds
      {
        name: 'Harvard Business Review - Career Planning',
        url: 'https://hbr.org/topic/career-planning/feed',
        category: 'career-development',
        tags: ['leadership', 'professional-growth', 'management'],
        assessmentFrameworks: ['multiple'],
        priority: 'high'
      },
      {
        name: 'Indeed Career Guide',
        url: 'https://www.indeed.com/career-advice/feed',
        category: 'career-development',
        tags: ['job-search', 'interviews', 'skills'],
        assessmentFrameworks: ['holland'],
        priority: 'medium'
      },
      
      // Industry feeds
      {
        name: 'McKinsey Insights',
        url: 'https://www.mckinsey.com/insights/rss',
        category: 'industry-insights',
        tags: ['leadership', 'strategy', 'management'],
        assessmentFrameworks: ['multiple'],
        priority: 'high'
      },
      {
        name: 'World Economic Forum',
        url: 'https://www3.weforum.org/feeds/global_agenda.rss',
        category: 'industry-insights',
        tags: ['global-trends', 'future-of-work', 'leadership'],
        assessmentFrameworks: ['multiple'],
        priority: 'medium'
      },
      
      // Leadership feeds
      {
        name: 'Center for Creative Leadership',
        url: 'https://www.ccl.org/feed/',
        category: 'leadership',
        tags: ['development', 'training', 'management'],
        assessmentFrameworks: ['hogan', 'disc'],
        priority: 'high'
      },
      {
        name: 'Leadership Now',
        url: 'https://www.leadershipnow.com/leadingblog/atom.xml',
        category: 'leadership',
        tags: ['development', 'management', 'inspiration'],
        assessmentFrameworks: ['multiple'],
        priority: 'medium'
      }
    ];
    
    // Add default feeds to Firestore
    const batch = this.firestore.batch();
    
    for (const feed of defaultFeeds) {
      const docRef = this.feedsCollection.doc();
      batch.set(docRef, {
        ...feed,
        status: 'active',
        createdAt: new Date(),
        lastFetched: null
      });
    }
    
    await batch.commit();
    console.log(`Added ${defaultFeeds.length} default feeds to Firestore`);
  }
  
  /**
   * Process all RSS feeds
   */
  async processAllFeeds() {
    console.log('Starting to process all feeds...');
    
    // Filter active feeds
    const activeFeeds = this.feedSources.filter(feed => feed.status === 'active');
    
    // Create a batch array to process feeds in parallel but with limits
    const feedBatches = [];
    for (let i = 0; i < activeFeeds.length; i += this.config.processingBatchSize) {
      feedBatches.push(activeFeeds.slice(i, i + this.config.processingBatchSize));
    }
    
    // Process each batch
    for (const batch of feedBatches) {
      await Promise.all(batch.map(feed => this.processFeed(feed)));
    }
    
    console.log('Completed processing all feeds');
  }
  
  /**
   * Process a single RSS feed
   */
  async processFeed(feed) {
    try {
      console.log(`Processing feed: ${feed.name} (${feed.url})`);
      
      // Fetch RSS feed
      const response = await axios.get(feed.url, {
        headers: {
          'User-Agent': 'Q4D RSS Integration System/1.0 (coaching2100.com)'
        },
        timeout: 30000
      });
      
      // Parse the feed
      const parsedFeed = await this.parser.parseString(response.data);
      
      // Process feed items
      const processedItems = await this.processFeedItems(parsedFeed.items, feed);
      
      // Update feed metadata
      await this.feedsCollection.doc(feed.id).update({
        lastFetched: new Date(),
        itemCount: parsedFeed.items.length,
        processedCount: processedItems.length,
        lastSuccessful: true,
        lastError: null
      });
      
      console.log(`Successfully processed feed: ${feed.name} - ${processedItems.length} items`);
      return processedItems;
    } catch (error) {
      console.error(`Error processing feed ${feed.name}:`, error);
      
      // Update feed with error status
      await this.feedsCollection.doc(feed.id).update({
        lastFetched: new Date(),
        lastSuccessful: false,
        lastError: error.message
      });
      
      return [];
    }
  }
  
  /**
   * Process feed items from a parsed feed
   */
  async processFeedItems(items, feed) {
    const processedItems = [];
    
    for (const item of items) {
      try {
        // Check if item already exists
        const existingItem = await this.checkExistingItem(item);
        
        if (existingItem) {
          // Skip if already exists
          continue;
        }
        
        // Extract and clean content
        const cleanedContent = this.extractAndCleanContent(item);
        
        // Skip if content is too short
        if (cleanedContent.length < this.config.minContentLength) {
          continue;
        }
        
        // Extract key phrases
        const keyPhrases = await this.extractKeyPhrases(cleanedContent);
        
        // Get assessment framework relevance
        const frameworkRelevance = await this.analyzeFrameworkRelevance(
          cleanedContent,
          keyPhrases,
          feed.assessmentFrameworks
        );
        
        // Create document in Firestore
        const articleId = await this.storeArticleInFirestore(
          item,
          feed,
          cleanedContent,
          keyPhrases,
          frameworkRelevance
        );
        
        // Create vector embedding
        const vector = await this.createEmbedding(cleanedContent, keyPhrases);
        
        // Store in Pinecone
        await this.storeVectorInPinecone(
          articleId,
          vector,
          item,
          feed,
          keyPhrases,
          frameworkRelevance
        );
        
        processedItems.push({
          id: articleId,
          title: item.title,
          link: item.link
        });
      } catch (error) {
        console.error(`Error processing item "${item.title}":`, error);
      }
    }
    
    return processedItems;
  }
  
  /**
   * Check if an item already exists in Firestore
   */
  async checkExistingItem(item) {
    // Check by link (most reliable unique identifier)
    const linkQuery = await this.articlesCollection.where('link', '==', item.link).limit(1).get();
    
    if (!linkQuery.empty) {
      return true;
    }
    
    // If no link match, check by guid if available
    if (item.guid) {
      const guidQuery = await this.articlesCollection.where('guid', '==', item.guid).limit(1).get();
      return !guidQuery.empty;
    }
    
    return false;
  }
  
  /**
   * Extract and clean content from a feed item
   */
  extractAndCleanContent(item) {
    // Try different content fields in order of preference
    let content = '';
    
    if (item.contentEncoded) {
      content = item.contentEncoded;
    } else if (item.content) {
      content = item.content;
    } else if (item['content:encoded']) {
      content = item['content:encoded'];
    } else if (item.description) {
      content = item.description;
    } else if (item.summary) {
      content = item.summary;
    }
    
    // Clean HTML content
    content = this.cleanHtml(content);
    
    return content;
  }
  
  /**
   * Clean HTML content
   */
  cleanHtml(html) {
    // Basic HTML cleaning
    let cleaned = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Remove excessive whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Replace HTML entities
    cleaned = cleaned
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    return cleaned;
  }
  
  /**
   * Extract key phrases from content
   */
  async extractKeyPhrases(content) {
    // Use TF-IDF to extract important terms
    this.tfidf = new natural.TfIdf();
    this.tfidf.addDocument(content);
    
    const terms = [];
    this.tfidf.listTerms(0).slice(0, 30).forEach(term => {
      if (term.term.length > 3) {
        terms.push({
          term: term.term,
          tfidf: term.tfidf
        });
      }
    });
    
    // Extract bigrams and trigrams
    const tokens = this.tokenizer.tokenize(content);
    const bigrams = this.extractNGrams(tokens, 2).slice(0, 15);
    const trigrams = this.extractNGrams(tokens, 3).slice(0, 10);
    
    return {
      terms,
      bigrams,
      trigrams
    };
  }
  
  /**
   * Extract n-grams from tokens
   */
  extractNGrams(tokens, n) {
    const ngrams = [];
    const ngramsCount = {};
    
    for (let i = 0; i <= tokens.length - n; i++) {
      const ngram = tokens.slice(i, i + n).join(' ');
      if (ngram.length > 5) { // Skip very short ngrams
        if (!ngramsCount[ngram]) {
          ngramsCount[ngram] = 0;
        }
        ngramsCount[ngram]++;
      }
    }
    
    // Convert to array and sort by count
    for (const [ngram, count] of Object.entries(ngramsCount)) {
      ngrams.push({ ngram, count });
    }
    
    return ngrams.sort((a, b) => b.count - a.count);
  }
  
  /**
   * Analyze framework relevance
   */
  async analyzeFrameworkRelevance(content, keyPhrases, feedFrameworks) {
    // Framework-specific terms and phrases
    const frameworkTerms = {
      mbti: [
        'mbti', 'myers-briggs', 'personality type', 'introvert', 'extrovert', 
        'intuition', 'sensing', 'thinking', 'feeling', 'judging', 'perceiving',
        'infj', 'enfp', 'cognitive functions', 'temperament', 'preferences',
        'type dynamics', 'personality assessment'
      ],
      disc: [
        'disc', 'dominance', 'influence', 'steadiness', 'conscientiousness',
        'behavioral style', 'communication style', 'work style', 'personality assessment',
        'behavioral assessment', 'workplace behavior', 'people styles'
      ],
      holland: [
        'holland code', 'riasec', 'career interests', 'vocational interests',
        'realistic', 'investigative', 'artistic', 'social', 'enterprising', 'conventional',
        'career assessment', 'vocational assessment', 'career choice', 'job fit'
      ],
      hogan: [
        'hogan', 'hpi', 'hds', 'mvpi', 'bright side', 'dark side', 'inside',
        'derailer', 'values', 'motives', 'leadership potential', 'leadership derailers',
        'reputation', 'identity', 'potential', 'personality assessment'
      ]
    };
    
    // Score content for each framework
    const relevanceScores = {};
    let maxScore = 0;
    let primaryFramework = 'general';
    
    for (const framework in frameworkTerms) {
      let score = 0;
      
      // Check for term presence
      for (const term of frameworkTerms[framework]) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        const matches = content.match(regex);
        if (matches) {
          score += matches.length;
        }
      }
      
      // Check key phrases
      for (const {term} of keyPhrases.terms) {
        if (frameworkTerms[framework].some(fw => term.includes(fw))) {
          score += 2;
        }
      }
      
      // Check bigrams and trigrams
      for (const {ngram} of [...keyPhrases.bigrams, ...keyPhrases.trigrams]) {
        if (frameworkTerms[framework].some(fw => ngram.includes(fw))) {
          score += 3;
        }
      }
      
      // Boost score for feed's declared frameworks
      if (feedFrameworks && feedFrameworks.includes(framework)) {
        score *= 1.5;
      }
      
      relevanceScores[framework] = score;
      
      // Track maximum score and corresponding framework
      if (score > maxScore) {
        maxScore = score;
        primaryFramework = framework;
      }
    }
    
    // Special case for multiple framework relevance
    if (primaryFramework !== 'general' && maxScore > 0) {
      // Check if there are other frameworks with significant scores
      const secondaryFrameworks = [];
      for (const [framework, score] of Object.entries(relevanceScores)) {
        if (framework !== primaryFramework && score > maxScore * 0.5) {
          secondaryFrameworks.push(framework);
        }
      }
      
      if (secondaryFrameworks.length > 1) {
        primaryFramework = 'multiple';
      } else if (secondaryFrameworks.length === 1) {
        primaryFramework = `${primaryFramework}-${secondaryFrameworks[0]}`;
      }
    }
    
    return {
      scores: relevanceScores,
      primary: primaryFramework,
      confidence: maxScore > 20 ? 'high' : maxScore > 10 ? 'medium' : 'low'
    };
  }
  
  /**
   * Store article in Firestore
   */
  async storeArticleInFirestore(item, feed, content, keyPhrases, frameworkRelevance) {
    const articleId = uuidv4();
    
    // Format isoDate if available
    let pubDate = null;
    if (item.isoDate) {
      pubDate = new Date(item.isoDate);
    } else if (item.pubDate) {
      pubDate = new Date(item.pubDate);
    }
    
    const articleData = {
      id: articleId,
      feedId: feed.id,
      feedName: feed.name,
      feedCategory: feed.category,
      feedTags: feed.tags || [],
      title: item.title,
      link: item.link,
      guid: item.guid || null,
      author: item.creator || item.author || null,
      pubDate: pubDate,
      content: content,
      contentSnippet: content.substring(0, 500),
      keyPhrases: keyPhrases,
      frameworkRelevance: frameworkRelevance,
      createdAt: new Date(),
      processedAt: new Date(),
      isProcessed: true
    };
    
    await this.articlesCollection.doc(articleId).set(articleData);
    return articleId;
  }
  
  /**
   * Create embedding vector for content
   */
  async createEmbedding(content, keyPhrases) {
    try {
      // Prepare text for embedding
      let textForEmbedding = content;
      
      // If content is very long, focus on most important parts
      if (content.length > 10000) {
        // Extract most important sentences
        const importantSentences = this.extractImportantSentences(content, keyPhrases, 15);
        textForEmbedding = importantSentences.join(' ');
      }
      
      // Generate embedding using Google AI Platform
      const embeddingResponse = await this.embeddings.textEmbedding({
        model: 'textembedding-gecko',
        text: textForEmbedding
      });
      
      return embeddingResponse.values;
    } catch (error) {
      console.error('Error creating embedding:', error);
      
      // Fallback to random vector if embedding fails
      return Array(this.config.vectorDimensions).fill().map(() => Math.random() * 2 - 1);
    }
  }
  
  /**
   * Extract important sentences from content
   */
  extractImportantSentences(content, keyPhrases, count = 10) {
    // Split content into sentences
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    // Score sentences based on key phrases
    const scoredSentences = sentences.map(sentence => {
      let score = 0;
      
      // Check for terms
      for (const {term} of keyPhrases.terms) {
        if (sentence.toLowerCase().includes(term)) {
          score += 1;
        }
      }
      
      // Check for n-grams (more valuable)
      for (const {ngram} of [...keyPhrases.bigrams, ...keyPhrases.trigrams]) {
        if (sentence.toLowerCase().includes(ngram)) {
          score += 2;
        }
      }
      
      return { sentence, score };
    });
    
    // Sort by score and take top 'count' sentences
    scoredSentences.sort((a, b) => b.score - a.score);
    return scoredSentences.slice(0, count).map(s => s.sentence);
  }
  
  /**
   * Store vector in Pinecone
   */
  async storeVectorInPinecone(articleId, vector, item, feed, keyPhrases, frameworkRelevance) {
    try {
      // Extract top terms and phrases for metadata
      const topTerms = keyPhrases.terms.slice(0, 10).map(t => t.term);
      const topPhrases = [
        ...keyPhrases.bigrams.slice(0, 5).map(b => b.ngram),
        ...keyPhrases.trigrams.slice(0, 3).map(t => t.ngram)
      ];
      
      // Format date for metadata
      let pubDate = null;
      if (item.isoDate) {
        pubDate = new Date(item.isoDate).toISOString();
      } else if (item.pubDate) {
        pubDate = new Date(item.pubDate).toISOString();
      }
      
      // Prepare vector record
      const record = {
        id: articleId,
        values: vector,
        metadata: {
          title: item.title,
          link: item.link,
          pubDate: pubDate,
          feedId: feed.id,
          feedName: feed.name,
          feedCategory: feed.category,
          feedTags: feed.tags || [],
          primaryFramework: frameworkRelevance.primary,
          relevanceConfidence: frameworkRelevance.confidence,
          terms: topTerms,
          phrases: topPhrases,
          createdAt: new Date().toISOString()
        }
      };
      
      // Upsert to Pinecone
      await this.index.upsert({
        vectors: [record]
      });
      
      return true;
    } catch (error) {
      console.error(`Error storing vector in Pinecone for article ${articleId}:`, error);
      throw error;
    }
  }
  
  /**
   * Search for relevant content in Pinecone
   */
  async searchContentByVector(vector, options = {}) {
    const {
      limit = 10,
      minScore = 0.7,
      filters = {},
      includeContent = false
    } = options;
    
    try {
      // Prepare filter if any
      const filterObj = {};
      for (const [key, value] of Object.entries(filters)) {
        filterObj[`metadata.${key}`] = value;
      }
      
      // Query Pinecone
      const queryResponse = await this.index.query({
        vector,
        topK: limit,
        includeMetadata: true,
        filter: Object.keys(filterObj).length > 0 ? filterObj : undefined
      });
      
      // Process and format results
      const results = queryResponse.matches
        .filter(match => match.score >= minScore)
        .map(async match => {
          const result = {
            id: match.id,
            score: match.score,
            metadata: match.metadata
          };
          
          // Include content if requested
          if (includeContent) {
            const articleDoc = await this.articlesCollection.doc(match.id).get();
            if (articleDoc.exists) {
              const articleData = articleDoc.data();
              result.content = articleData.content;
              result.contentSnippet = articleData.contentSnippet;
            }
          }
          
          return result;
        });
      
      return Promise.all(results);
    } catch (error) {
      console.error('Error searching content by vector:', error);
      throw error;
    }
  }
  
  /**
   * Search content by framework and keywords
   */
  async searchContentByFramework(framework, keywords = [], options = {}) {
    try {
      // First, create an embedding from the keywords
      const keywordText = keywords.join(' ');
      const keywordVector = await this.createEmbedding(keywordText, {
        terms: keywords.map(k => ({ term: k, tfidf: 1 })),
        bigrams: [],
        trigrams: []
      });
      
      // Set up filter for framework
      const filters = {
        ...options.filters
      };
      
      if (framework !== 'all') {
        filters.primaryFramework = framework;
      }
      
      // Search by vector
      return this.searchContentByVector(keywordVector, {
        ...options,
        filters
      });
    } catch (error) {
      console.error(`Error searching content for framework ${framework}:`, error);
      throw error;
    }
  }
  
  /**
   * Add a new RSS feed source
   */
  async addFeedSource(feedData) {
    try {
      // Validate feed URL
      try {
        await axios.get(feedData.url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Q4D RSS Integration System/1.0 (coaching2100.com)'
          }
        });
      } catch (error) {
        throw new Error(`Invalid feed URL: ${error.message}`);
      }
      
      // Create feed document
      const docRef = this.feedsCollection.doc();
      await docRef.set({
        ...feedData,
        status: 'active',
        createdAt: new Date(),
        lastFetched: null
      });
      
      // Reload feed sources
      await this.loadFeedSources();
      
      // Process the new feed immediately
      const newFeed = this.feedSources.find(feed => feed.id === docRef.id);
      if (newFeed) {
        await this.processFeed(newFeed);
      }
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding feed source:', error);
      throw error;
    }
  }
}

/**
 * Q4D RSS Insight Generator
 * Generates insights from RSS content for the Q4D system
 */
class Q4DRSSInsightGenerator {
  constructor(rssSystem) {
    this.rssSystem = rssSystem;
    this.firestore = getFirestore();
    this.insightsCollection = this.firestore.collection('q4d_insights');
  }
  
  /**
   * Generate insights for a specific framework
   */
  async generateFrameworkInsights(framework) {
    try {
      console.log(`Generating insights for framework: ${framework}`);
      
      // Get recent content relevant to this framework
      const recentContent = await this.getRecentFrameworkContent(framework);
      
      if (recentContent.length === 0) {
        console.log(`No recent content found for framework: ${framework}`);
        return [];
      }
      
      // Cluster content by topic
      const contentClusters = await this.clusterContentByTopic(recentContent);
      
      // Generate insights for each cluster
      const generatedInsights = [];
      for (const cluster of contentClusters) {
        const insight = await this.generateInsightFromCluster(cluster, framework);
        if (insight) {
          generatedInsights.push(insight);
        }
      }
      
      // Store insights in Firestore
      for (const insight of generatedInsights) {
        await this.storeInsight(insight);
      }
      
      console.log(`Generated ${generatedInsights.length} insights for framework: ${framework}`);
      return generatedInsights;
    } catch (error) {
      console.error(`Error generating insights for framework ${framework}:`, error);
      throw error;
    }
  }
  
  /**
   * Get recent content relevant to a specific framework
   */
  async getRecentFrameworkContent(framework) {
    // Define common search terms for each framework
    const frameworkTerms = {
      mbti: ['personality type', 'cognitive function', 'preference', 'myers briggs'],
      disc: ['behavioral style', 'communication style', 'workplace behavior'],
      holland: ['career interest', 'vocational', 'job fit', 'career choice'],
      hogan: ['leadership potential', 'derailer', 'values', 'motive']
    };
    
    // Set framework-specific search terms or use default
    const searchTerms = frameworkTerms[framework] || [];
    
    // Query recent articles from Firestore
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    
    let query = this.rssSystem.articlesCollection
      .where('isProcessed', '==', true)
      .where('pubDate', '>=', twoMonthsAgo)
      .orderBy('pubDate', 'desc')
      .limit(100);
    
    // If framework is specified, add framework relevance filter
    if (framework !== 'multiple' && framework !== 'all') {
      query = query.where('frameworkRelevance.primary', '==', framework);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return [];
    }
    
    // Process and filter results
    const results = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      results.push({
        id: doc.id,
        title: data.title,
        link: data.link,
        pubDate: data.pubDate ? data.pubDate.toDate() : null,
        feedName: data.feedName,
        feedCategory: data.feedCategory,
        content: data.content,
        contentSnippet: data.contentSnippet,
        keyPhrases: data.keyPhrases,
        frameworkRelevance: data.frameworkRelevance
      });
    });
    
    return results;
  }
  
  /**
   * Cluster content by topic
   */
  async clusterContentByTopic(contentItems) {
    // Simple clustering based on term overlap
    const clusters = [];
    
    for (const item of contentItems) {
      // Get terms for this item
      const itemTerms = new Set([
        ...item.keyPhrases.terms.map(t => t.term),
        ...item.keyPhrases.bigrams.map(b => b.ngram),
        ...item.keyPhrases.trigrams.map(t => t.ngram)
      ]);
      
      let foundCluster = false;
      
      // Check existing clusters for overlap
      for (let i = 0; i < clusters.length; i++) {
        const clusterTerms = clusters[i].commonTerms;
        
        // Calculate term overlap
        let overlapCount = 0;
        for (const term of clusterTerms) {
          if (itemTerms.has(term)) {
            overlapCount++;
          }
        }
        
        const overlapRatio = overlapCount / Math.min(clusterTerms.size, itemTerms.size);
        
        // If sufficient overlap, add to cluster
        if (overlapRatio > 0.25) {
          clusters[i].items.push(item);
          
          // Update common terms
          const newCommonTerms = new Set();
          for (const term of clusterTerms) {
            if (itemTerms.has(term)) {
              newCommonTerms.add(term);
            }
          }
          clusters[i].commonTerms = newCommonTerms;
          
          foundCluster = true;
          break;
        }
      }
      
      // If no match, create new cluster
      if (!foundCluster) {
        clusters.push({
          items: [item],
          commonTerms: itemTerms
        });
      }
    }
    
    // Only keep clusters with at least 2 items
    return clusters.filter(cluster => cluster.items.length >= 2);
  }
  
  /**
   * Generate insight from a content cluster
   */
  async generateInsightFromCluster(cluster, framework) {
    try {
      // Extract top terms from this cluster
      const termFrequency = {};
      for (const item of cluster.items) {
        for (const { term } of item.keyPhrases.terms) {
          termFrequency[term] = (termFrequency[term] || 0) + 1;
        }
        for (const { ngram } of [...item.keyPhrases.bigrams, ...item.keyPhrases.trigrams]) {
          termFrequency[ngram] = (termFrequency[ngram] || 0) + 1;
        }
      }
      
      // Sort terms by frequency
      const sortedTerms = Object.entries(termFrequency)
        .sort((a, b) => b[1] - a[1])
        .map(([term]) => term)
        .slice(0, 10);
      
      // Generate insight title based on top terms
      const insightTitle = this.generateInsightTitle(sortedTerms, framework);
      
      // Extract key points from articles
      const keyPoints = this.extractKeyPointsFromCluster(cluster);
      
      // Format the insight
      const insight = {
        id: uuidv4(),
        title: insightTitle,
        framework,
        createdAt: new Date(),
        terms: sortedTerms,
        keyPoints,
        sourceCount: cluster.items.length,
        sources: cluster.items.map(item => ({
          id: item.id,
          title: item.title,
          link: item.link,
          feedName: item.feedName,
          pubDate: item.pubDate
        })),
        confidence: cluster.items.length >= 5 ? 'high' : cluster.items.length >= 3 ? 'medium' : 'low'
      };
      
      return insight;
    } catch (error) {
      console.error('Error generating insight from cluster:', error);
      return null;
    }
  }
  
  /**
   * Generate insight title based on key terms
   */
  generateInsightTitle(terms, framework) {
    // Framework-specific prefixes
    const frameworkPrefixes = {
      mbti: [
        'Personality Insights:',
        'MBTI Trends:',
        'Type Development:'
      ],
      disc: [
        'Behavioral Insights:',
        'DISC Trends:',
        'Workplace Communication:'
      ],
      holland: [
        'Career Trends:',
        'Vocational Insights:',
        'Job Fit Patterns:'
      ],
      hogan: [
        'Leadership Insights:',
        'Performance Trends:',
        'Potential Development:'
      ],
      multiple: [
        'Assessment Insights:',
        'Development Trends:',
        'Integration Patterns:'
      ]
    };
    
    // Select a prefix
    const prefixes = frameworkPrefixes[framework] || ['Trend Insights:'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    
    // Select 2-3 key terms to include in title
    const selectedTerms = terms.slice(0, Math.floor(Math.random() * 2) + 2);
    
    // Combine into title
    return `${prefix} ${selectedTerms.join(' and ')}`;
  }
  
  /**
   * Extract key points from cluster
   */
  extractKeyPointsFromCluster(cluster) {
    const keyPoints = [];
    
    // Extract important sentences from each article
    for (const item of cluster.items) {
      const sentences = item.content.split(/[.!?]+/).filter(s => s.trim().length > 20);
      
      // Score sentences based on term relevance
      const scoredSentences = sentences.map(sentence => {
        let score = 0;
        
        // Check against common cluster terms
        for (const term of cluster.commonTerms) {
          if (sentence.toLowerCase().includes(term.toLowerCase())) {
            score += 1;
          }
        }
        
        return { sentence, score, source: item.title };
      });
      
      // Take top sentences
      scoredSentences.sort((a, b) => b.score - a.score);
      
      // Add top 2 sentences from each article
      for (const scored of scoredSentences.slice(0, 2)) {
        if (scored.score > 0) {
          keyPoints.push({
            point: scored.sentence.trim(),
            source: scored.source,
            relevance: scored.score
          });
        }
      }
    }
    
    // Sort points by relevance and deduplicate
    keyPoints.sort((a, b) => b.relevance - a.relevance);
    
    // Remove duplicate/similar points
    const uniquePoints = [];
    const addedContent = new Set();
    
    for (const point of keyPoints) {
      // Create a simplified version for comparison
      const simplified = point.point.toLowerCase().replace(/\s+/g, ' ').trim();
      
      // Check if we already have something very similar
      let isDuplicate = false;
      for (const existing of addedContent) {
        const similarity = this.calculateStringSimilarity(simplified, existing);
        if (similarity > 0.7) {
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        uniquePoints.push(point);
        addedContent.add(simplified);
        
        // Limit to 10 points
        if (uniquePoints.length >= 10) {
          break;
        }
      }
    }
    
    return uniquePoints;
  }
  
  /**
   * Calculate string similarity (Jaccard similarity of words)
   */
  calculateStringSimilarity(str1, str2) {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    // Calculate intersection size
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    
    // Calculate union size
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
  
  /**
   * Store insight in Firestore
   */
  async storeInsight(insight) {
    await this.insightsCollection.doc(insight.id).set(insight);
    return insight.id;
  }
  
  /**
   * Get recent insights for a framework
   */
  async getRecentInsights(framework, limit = 10) {
    try {
      const query = framework === 'all' 
        ? this.insightsCollection.orderBy('createdAt', 'desc').limit(limit)
        : this.insightsCollection.where('framework', '==', framework)
                               .orderBy('createdAt', 'desc')
                               .limit(limit);
      
      const snapshot = await query.get();
      
      const insights = [];
      snapshot.forEach(doc => {
        insights.push(doc.data());
      });
      
      return insights;
    } catch (error) {
      console.error(`Error getting insights for framework ${framework}:`, error);
      throw error;
    }
  }
}

module.exports = {
  RSSIntegrationSystem,
  Q4DRSSInsightGenerator
};
