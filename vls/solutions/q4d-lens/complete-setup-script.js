/**
 * Q4D System Complete Setup Script
 * Sets up RSS feeds and Google Drive for pilot training
 * Project ID: api-for-warp-drive
 * Domain: coaching2100.com
 */

const { RSSIntegrationSystem, Q4DRSSInsightGenerator } = require('./rss-integration-system');
const GoogleDriveIntegration = require('./google-drive-integration');
const { initializePilotTrainingFeeds } = require('./pilot-training-rss');

// Optional command line arguments
const argv = require('minimist')(process.argv.slice(2));
const skipRss = argv['skip-rss'] || false;
const skipDrive = argv['skip-drive'] || false;
const onlySetupFeeds = argv['only-feeds'] || false;
const onlySetupDrive = argv['only-drive'] || false;

// Configuration
const config = {
  rss: {
    fetchInterval: 3600000, // 1 hour
    vectorDimensions: 768,
    minContentLength: 100
  },
  googleDrive: {
    credentialsPath: argv['credentials-path'] || './credentials.json',
    tokenPath: argv['token-path'] || './token.json',
    domain: argv['domain'] || 'coaching2100.com',
    pilotFolderName: argv['folder-name'] || 'Q4D Pilots'
  },
  existingPilots: argv['existing-pilots'] ? argv['existing-pilots'].split(',') : []
};

/**
 * Main setup function
 */
async function runSetup() {
  console.log('Starting Q4D System Setup...');
  
  try {
    // Setup RSS Integration if not skipped
    let rssSystem = null;
    if (!skipRss && !onlySetupDrive) {
      console.log('Setting up RSS Integration System...');
      rssSystem = new RSSIntegrationSystem(config.rss);
      await rssSystem.start();
      
      // Initialize pilot training RSS feeds
      console.log('Setting up Pilot Training RSS feeds...');
      await initializePilotTrainingFeeds(rssSystem);
      
      // Create insight generator
      const insightGenerator = new Q4DRSSInsightGenerator(rssSystem);
      
      // Generate initial insights for each framework
      console.log('Generating initial insights...');
      await generateInitialInsights(insightGenerator);
      
      console.log('RSS Integration System setup complete.');
    }
    
    // Exit if only setting up feeds
    if (onlySetupFeeds) {
      console.log('Exiting after RSS setup as requested.');
      return true;
    }
    
    // Setup Google Drive Integration if not skipped
    if (!skipDrive && !onlySetupFeeds) {
      console.log('Setting up Google Drive Integration...');
      const driveIntegration = new GoogleDriveIntegration(config.googleDrive);
      
      try {
        await driveIntegration.initialize();
      } catch (error) {
        if (error.message.includes('Please visit the authorization URL')) {
          console.log('\n' + error.message);
          console.log('\nAfter authorizing, run this script again with the authorization code:');
          console.log('node setup.js --auth-code=YOUR_AUTH_CODE\n');
          return false;
        }
        throw error;
      }
      
      // Handle authorization code if provided
      if (argv['auth-code']) {
        await driveIntegration.setAuthorizationCode(argv['auth-code']);
      }
      
      // Setup folder structure
      console.log('Setting up Google Drive folder structure...');
      await driveIntegration.setupPilotFolderStructure();
      
      // Create template files
      console.log('Creating template files...');
      await driveIntegration.createPilotTemplateFiles();
      
      // Set up existing pilots if specified
      if (config.existingPilots.length > 0) {
        console.log('Setting up existing pilots...');
        await setupExistingPilots(driveIntegration, config.existingPilots);
      }
      
      console.log('Google Drive Integration setup complete.');
    }
    
    console.log('Q4D System Setup completed successfully!');
    return true;
  } catch (error) {
    console.error('Error during setup:', error);
    return false;
  }
}

/**
 * Generate initial insights for each framework
 */
async function generateInitialInsights(insightGenerator) {
  const frameworks = ['mbti', 'disc', 'holland', 'hogan', 'training'];
  
  for (const framework of frameworks) {
    console.log(`Generating insights for ${framework} framework...`);
    try {
      const insights = await insightGenerator.generateFrameworkInsights(framework);
      console.log(`Generated ${insights.length} insights for ${framework}`);
    } catch (error) {
      console.error(`Error generating insights for ${framework}:`, error);
    }
  }
}

/**
 * Setup existing pilots in Google Drive
 */
async function setupExistingPilots(driveIntegration, pilotNames) {
  // Define common pilot templates
  const pilotTemplates = {
    'Dr. Grant': {
      type: 'core_agent',
      description: 'Leadership and strategy specialist',
      capabilities: ['strategic_planning', 'leadership_coaching', 'decision_making'],
      configuration: {
        domain: 'leadership',
        focus: 'strategy'
      }
    },
    'Dr. Lucy Auto': {
      type: 'lucy_specialist',
      description: 'AI automation specialist',
      capabilities: ['ai_automation', 'model_deployment', 'service_orchestration'],
      configuration: {
        focus: 'ai_automation',
        modelDeployment: true,
        serviceOrchestration: true
      }
    },
    'Super Claude 1': {
      type: 'super_claude',
      description: 'Advanced natural language processing specialist',
      capabilities: ['language_processing', 'github_integration', 'vertex_ai_integration'],
      configuration: {
        focus: 'language_processing',
        githubIntegration: true,
        vertexAIIntegration: true
      }
    }
  };
  
  // Create each pilot
  for (const pilotName of pilotNames) {
    try {
      // Get template or create generic one
      const pilotTemplate = pilotTemplates[pilotName] || {
        type: pilotName.includes('Claude') ? 'super_claude' : 
              pilotName.includes('Lucy') ? 'lucy_specialist' : 'core_agent',
        description: `${pilotName} agent in the Q4D system`,
        capabilities: ['core_functionality'],
        configuration: {}
      };
      
      // Create pilot data
      const pilotData = {
        ...pilotTemplate,
        name: pilotName,
        id: `pilot_${pilotName.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
        version: pilotName.includes('Version') ? 
          parseInt(pilotName.match(/Version\s*(\d+)/i)[1]) : 1
      };
      
      console.log(`Setting up ${pilotName}...`);
      const result = await driveIntegration.createNewPilotSetup(pilotData);
      console.log(`Created ${pilotName} setup: ${result.pilotId}`);
    } catch (error) {
      console.error(`Error setting up pilot ${pilotName}:`, error);
    }
  }
}

// Run the setup
runSetup().then(result => {
  if (result) {
    console.log('Setup completed successfully');
  } else {
    console.log('Setup did not complete successfully');
    process.exit(1);
  }
}).catch(error => {
  console.error('Unhandled error during setup:', error);
  process.exit(1);
});
