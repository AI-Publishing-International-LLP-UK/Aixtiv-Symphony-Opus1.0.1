/**
 * Pilot Training RSS Feed Configuration
 * Extension to main RSS Integration System
 */

/**
 * Initialize pilot training feeds
 * @param {RSSIntegrationSystem} rssSystem - The main RSS integration system
 */
async function initializePilotTrainingFeeds(rssSystem) {
  console.log('Initializing pilot training RSS feeds...');
  
  const pilotTrainingFeeds = [
    // AI Agent Training Feeds
    {
      name: 'Google DeepMind Blog',
      url: 'https://deepmind.google/blog/rss.xml',
      category: 'ai-training',
      tags: ['deepmind', 'ai-research', 'machine-learning', 'agent-training'],
      priority: 'high'
    },
    {
      name: 'Anthropic Research Blog',
      url: 'https://www.anthropic.com/research/rss',
      category: 'ai-training',
      tags: ['anthropic', 'ai-alignment', 'agent-capabilities', 'language-models'],
      priority: 'high'
    },
    {
      name: 'Hugging Face Blog',
      url: 'https://huggingface.co/blog/feed.xml',
      category: 'ai-training',
      tags: ['models', 'training-techniques', 'fine-tuning', 'prompt-engineering'],
      priority: 'medium'
    },
    
    // Agent Design & Architecture
    {
      name: 'Berkeley Artificial Intelligence Research',
      url: 'https://bair.berkeley.edu/blog/feed.xml',
      category: 'agent-architecture',
      tags: ['research', 'reinforcement-learning', 'multi-agent', 'architecture'],
      priority: 'high'
    },
    {
      name: 'Microsoft Research AI Blog',
      url: 'https://www.microsoft.com/en-us/research/feed/',
      category: 'agent-architecture',
      tags: ['research', 'agent-design', 'enterprise-ai', 'applications'],
      priority: 'medium'
    },
    
    // Co-Pilot Design
    {
      name: 'GitHub Blog',
      url: 'https://github.blog/feed/',
      category: 'copilot-design',
      tags: ['github-copilot', 'developer-tools', 'code-assistance'],
      priority: 'high'
    },
    {
      name: 'Stack Overflow Blog',
      url: 'https://stackoverflow.blog/feed/',
      category: 'copilot-design',
      tags: ['developer-experience', 'coding-assistance', 'best-practices'],
      priority: 'medium'
    },
    
    // Flight Memory Systems
    {
      name: 'AWS Machine Learning Blog',
      url: 'https://aws.amazon.com/blogs/machine-learning/feed/',
      category: 'memory-systems',
      tags: ['cloud', 'infrastructure', 'memory-systems', 'scaling'],
      priority: 'high'
    },
    {
      name: 'Google Cloud Blog - AI & ML',
      url: 'https://cloud.google.com/blog/products/ai-machine-learning/rss',
      category: 'memory-systems',
      tags: ['gcp', 'vertexai', 'infrastructure', 'scalable-systems'],
      priority: 'high'
    },
    
    // Multimodal Training
    {
      name: 'Papers with Code',
      url: 'https://paperswithcode.com/rss',
      category: 'multimodal',
      tags: ['vision', 'audio', 'multimodal', 'implementation'],
      priority: 'medium'
    },
    {
      name: 'OpenAI Blog',
      url: 'https://openai.com/blog/rss',
      category: 'multimodal',
      tags: ['gpt', 'vision', 'multimodal', 'capabilities'],
      priority: 'high'
    },
    
    // Evaluation & Testing
    {
      name: 'Towards Data Science',
      url: 'https://towardsdatascience.com/feed',
      category: 'evaluation',
      tags: ['testing', 'metrics', 'benchmarks', 'performance'],
      priority: 'medium'
    },
    {
      name: 'arXiv AI',
      url: 'http://arxiv.org/rss/cs.AI',
      category: 'evaluation',
      tags: ['research', 'academic', 'evaluation', 'metrics'],
      priority: 'medium'
    },
    
    // Human-AI Interaction
    {
      name: 'Nielsen Norman Group',
      url: 'https://www.nngroup.com/feed/rss/',
      category: 'human-ai-interaction',
      tags: ['ux', 'usability', 'interaction-design', 'user-research'],
      priority: 'high'
    },
    {
      name: 'Interaction Design Foundation',
      url: 'https://www.interaction-design.org/literature/rss',
      category: 'human-ai-interaction',
      tags: ['hci', 'design-principles', 'ai-interaction', 'user-experience'],
      priority: 'medium'
    }
  ];
  
  // Add custom metadata for pilot training
  pilotTrainingFeeds.forEach(feed => {
    feed.pilotTraining = true;
    feed.assessmentFrameworks = ['training'];
  });
  
  // Add each feed to the system
  for (const feed of pilotTrainingFeeds) {
    try {
      await rssSystem.addFeedSource(feed);
      console.log(`Added pilot training feed: ${feed.name}`);
    } catch (error) {
      console.error(`Error adding feed ${feed.name}:`, error.message);
    }
  }
  
  console.log('Pilot training feeds initialization complete');
}

/**
 * Search for training content relevant to a specific pilot type
 * @param {RSSIntegrationSystem} rssSystem - The RSS integration system
 * @param {string} pilotType - Type of pilot (e.g., 'co-pilot', 'agent', 'memory-system')
 * @param {Object} options - Search options
 */
async function searchPilotTrainingContent(rssSystem, pilotType, options = {}) {
  // Map pilot types to relevant categories and tags
  const pilotTypeMap = {
    'co-pilot': {
      categories: ['copilot-design', 'human-ai-interaction'],
      tags: ['github-copilot', 'code-assistance', 'interaction-design']
    },
    'agent': {
      categories: ['ai-training', 'agent-architecture'],
      tags: ['agent-training', 'agent-capabilities', 'agent-design']
    },
    'memory-system': {
      categories: ['memory-systems'],
      tags: ['memory-systems', 'infrastructure', 'scalable-systems']
    },
    'multimodal': {
      categories: ['multimodal'],
      tags: ['vision', 'audio', 'multimodal']
    },
    'evaluator': {
      categories: ['evaluation'],
      tags: ['testing', 'metrics', 'benchmarks', 'performance']
    }
  };
  
  // Get mapping for the requested pilot type
  const mapping = pilotTypeMap[pilotType] || {
    categories: ['ai-training'],
    tags: ['agent-training']
  };
  
  // Prepare filters
  const filters = {
    pilotTraining: true
  };
  
  if (options.filterByCategory !== false) {
    filters.feedCategory = { $in: mapping.categories };
  }
  
  // Create search vector for relevant tags
  const searchTerms = [...mapping.tags];
  if (options.additionalTerms) {
    searchTerms.push(...options.additionalTerms);
  }
  
  // Search for relevant content
  return rssSystem.searchContentByFramework('training', searchTerms, {
    limit: options.limit || 20,
    minScore: options.minScore || 0.65,
    filters,
    includeContent: options.includeContent || false
  });
}

module.exports = {
  initializePilotTrainingFeeds,
  searchPilotTrainingContent
};
