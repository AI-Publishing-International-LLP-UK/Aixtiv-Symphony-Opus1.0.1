/**
 * OnboardingService
 * Responsible for handling the various onboarding flows for different gateway tiers
 * in Aixtiv Symphony Opus1 System.
 */

const { EventEmitter } = require('events');
const logger = require('../utils/logger');

// Import the gateway implementations
let GatewayFactory;
try {
  GatewayFactory = require('./gateway-factory');
} catch (error) {
  // Gateway factory might not exist yet, will be handled gracefully
  logger.warn('Gateway factory not found, some functionality may be limited', { error: error.message });
}

/**
 * Templates for different project types
 */
const ONBOARDING_TEMPLATES = {
  MEMOIR: {
    id: 'memoir',
    name: 'Personal Memoir',
    description: 'Share your life story or significant experiences',
    defaultStructure: [
      'Introduction/About Me',
      'Early Life',
      'Key Events',
      'Reflections',
      'Legacy/Impact'
    ]
  },
  HOW_TO: {
    id: 'how-to',
    name: 'How-To Guide',
    description: 'Step-by-step instructions to accomplish a specific task',
    defaultStructure: [
      'Introduction/Problem Statement',
      'Required Tools/Resources',
      'Step-by-Step Process',
      'Troubleshooting',
      'Advanced Tips'
    ]
  },
  FICTION: {
    id: 'fiction',
    name: 'Fiction Story',
    description: 'Create an engaging fictional narrative',
    defaultStructure: [
      'Setting',
      'Main Characters',
      'Plot Introduction',
      'Conflict Development',
      'Resolution'
    ]
  },
  BUSINESS: {
    id: 'business',
    name: 'Business Publication',
    description: 'Professional content for business audiences',
    defaultStructure: [
      'Executive Summary',
      'Market Analysis',
      'Solution Description',
      'Implementation Plan',
      'ROI Projections'
    ]
  },
  EDUCATIONAL: {
    id: 'educational',
    name: 'Educational Content',
    description: 'Instructional material for teaching and learning',
    defaultStructure: [
      'Learning Objectives',
      'Core Concepts',
      'Practical Examples',
      'Assessment Activities',
      'Additional Resources'
    ]
  }
};

/**
 * Onboarding flow types
 */
const ONBOARDING_FLOW = {
  QUICK_START: 'quick_start',
  GUIDED_JOURNEY: 'guided_journey',
  TEMPLATE_BASED: 'template_based',
  EXPERT_MODE: 'expert_mode'
};

/**
 * OnboardingService class for managing the onboarding process across different gateway tiers
 */
class OnboardingService extends EventEmitter {
  /**
   * Constructor for the OnboardingService
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super();
    this.options = {
      analyticsEnabled: true,
      enableProgressTracking: true,
      defaultFlow: ONBOARDING_FLOW.QUICK_START,
      ...options
    };
    
    this.activeOnboardingSessions = new Map();
    this.templates = { ...ONBOARDING_TEMPLATES };
    this.completionMetrics = {
      started: 0,
      completed: 0,
      abandoned: 0,
      conversionRate: 0
    };
    
    // Initialize analytics tracking
    this._initAnalytics();
    
    logger.info('OnboardingService initialized with options', { 
      analyticsEnabled: this.options.analyticsEnabled,
      defaultFlow: this.options.defaultFlow 
    });
  }
  
  /**
   * Initialize analytics tracking
   * @private
   */
  _initAnalytics() {
    if (this.options.analyticsEnabled) {
      // Set up event listeners for tracking
      this.on('onboarding:started', this._trackOnboardingStarted.bind(this));
      this.on('onboarding:step_completed', this._trackStepCompleted.bind(this));
      this.on('onboarding:completed', this._trackOnboardingCompleted.bind(this));
      this.on('onboarding:abandoned', this._trackOnboardingAbandoned.bind(this));
      
      logger.info('Onboarding analytics tracking initialized');
    }
  }
  
  /**
   * Track when onboarding starts
   * @param {Object} data Session data
   * @private
   */
  _trackOnboardingStarted(data) {
    this.completionMetrics.started++;
    logger.info('Onboarding started', { 
      userId: data.userId, 
      gatewayTier: data.gatewayTier,
      flow: data.flow 
    });
  }
  
  /**
   * Track when a step is completed
   * @param {Object} data Step data
   * @private
   */
  _trackStepCompleted(data) {
    logger.info('Onboarding step completed', { 
      userId: data.userId, 
      sessionId: data.sessionId,
      step: data.step,
      completionTime: data.completionTime
    });
  }
  
  /**
   * Track when onboarding is completed
   * @param {Object} data Session data
   * @private
   */
  _trackOnboardingCompleted(data) {
    this.completionMetrics.completed++;
    this._updateConversionRate();
    
    logger.info('Onboarding completed successfully', { 
      userId: data.userId, 
      sessionId: data.sessionId,
      totalTime: data.totalTime,
      stepsCompleted: data.stepsCompleted
    });
  }
  
  /**
   * Track when onboarding is abandoned
   * @param {Object} data Session data
   * @private
   */
  _trackOnboardingAbandoned(data) {
    this.completionMetrics.abandoned++;
    this._updateConversionRate();
    
    logger.info('Onboarding abandoned', { 
      userId: data.userId, 
      sessionId: data.sessionId,
      lastCompletedStep: data.lastCompletedStep,
      reason: data.reason
    });
  }
  
  /**
   * Update the conversion rate calculation
   * @private
   */
  _updateConversionRate() {
    const totalSessions = this.completionMetrics.completed + this.completionMetrics.abandoned;
    if (totalSessions > 0) {
      this.completionMetrics.conversionRate = 
        (this.completionMetrics.completed / totalSessions) * 100;
    }
  }
  
  /**
   * Start a new onboarding session
   * @param {String} userId User identifier
   * @param {String} gatewayTier The gateway tier (owner, team, group, practitioner, enterprise)
   * @param {String} flow The onboarding flow type
   * @param {Object} options Additional options
   * @returns {Object} The session object with ID and initial state
   */
  async startOnboarding(userId, gatewayTier, flow = null, options = {}) {
    // Determine which flow to use
    const selectedFlow = flow || this.options.defaultFlow;
    
    // Create a session ID
    const sessionId = `onboard_${userId}_${Date.now()}`;
    
    // Create initial session state
    const session = {
      id: sessionId,
      userId,
      gatewayTier,
      flow: selectedFlow,
      startTime: Date.now(),
      currentStep: 0,
      completedSteps: [],
      status: 'active',
      data: {
        ...options
      }
    };
    
    // Store the session
    this.activeOnboardingSessions.set(sessionId, session);
    
    // Configure the flow based on the gateway tier
    await this._configureFlowForTier(session, gatewayTier);
    
    // Emit event for tracking
    this.emit('onboarding:started', {
      userId,
      sessionId,
      gatewayTier,
      flow: selectedFlow
    });
    
    logger.info('New onboarding session started', { 
      userId, 
      sessionId,
      gatewayTier,
      flow: selectedFlow
    });
    
    return {
      sessionId,
      flow: selectedFlow,
      nextStep: this._getStepForSession(session)
    };
  }
  
  /**
   * Configure the onboarding flow based on the gateway tier
   * @param {Object} session The session object
   * @param {String} gatewayTier The gateway tier
   * @private
   */
  async _configureFlowForTier(session, gatewayTier) {
    // Set up steps based on the flow type
    switch (session.flow) {
      case ONBOARDING_FLOW.QUICK_START:
        session.steps = this._getQuickStartSteps(gatewayTier);
        break;
      case ONBOARDING_FLOW.GUIDED_JOURNEY:
        session.steps = this._getGuidedJourneySteps(gatewayTier);
        break;
      case ONBOARDING_FLOW.TEMPLATE_BASED:
        session.steps = this._getTemplateBasedSteps(gatewayTier);
        break;
      case ONBOARDING_FLOW.EXPERT_MODE:
        session.steps = this._getExpertModeSteps(gatewayTier);
        break;
      default:
        session.steps = this._getQuickStartSteps(gatewayTier);
        break;
    }
    
    // Add gateway tier specific customizations
    try {
      if (GatewayFactory) {
        const gateway = await GatewayFactory.createGateway(gatewayTier, session.userId);
        if (gateway && typeof gateway.customizeOnboarding === 'function') {
          await gateway.customizeOnboarding(session);
        }
      }
    } catch (error) {
      logger.error('Error customizing onboarding for gateway tier', {
        error: error.message,
        gatewayTier,
        userId: session.userId
      });
    }
  }
  
  /**
   * Get the steps for a quick start flow
   * @param {String} gatewayTier The gateway tier
   * @returns {Array} The steps for the flow
   * @private
   */
  _getQuickStartSteps(gatewayTier) {
    // Simplified set of steps for quick start flow
    const baseSteps = [
      {
        id: 'project_type',
        title: 'Choose Your Project Type',
        description: 'Select what kind of content you want to create',
        action: 'select_template',
        required: true
      },
      {
        id: 'basic_info',
        title: 'Basic Information',
        description: 'Enter the core details of your project',
        action: 'collect_info',
        required: true
      },
      {
        id: 'content_generation',
        title: 'Generate Initial Content',
        description: 'We\'ll create a starting point for your content',
        action: 'generate_content',
        required: true
      },
      {
        id: 'review_publish',
        title: 'Review and Publish',
        description: 'Review your content and publish it',
        action: 'review_content',
        required: true
      }
    ];
    
    // Add tier-specific steps
    switch (gatewayTier) {
      case 'enterprise':
        baseSteps.splice(3, 0, {
          id: 'compliance_check',
          title: 'Compliance Check',
          description: 'Ensure content meets enterprise standards',
          action: 'verify_compliance',
          required: true
        });
        break;
      case 'team':
        baseSteps.splice(3, 0, {
          id: 'team_review',
          title: 'Team Review',
          description: 'Get feedback from your team members',
          action: 'team_review',
          required: false
        });
        break;
    }
    
    return baseSteps;
  }
  
  /**
   * Get the steps for a guided journey flow
   * @param {String} gatewayTier The gateway tier
   * @returns {Array} The steps for the flow
   * @private
   */
  _getGuidedJourneySteps(gatewayTier) {
    // More comprehensive set of steps for guided journey
    const baseSteps = [
      {
        id: 'welcome',
        title: 'Welcome to Aixtiv Symphony Opus1',
        description: 'Let\'s walk through the process of creating and publishing your content',
        action: 'display_welcome',
        required: true
      },
      {
        id: 'project_type',
        title: 'Choose Your Project Type',
        description: 'Select what kind of content you want to create',
        action: 'select_template',
        required: true
      },
      {
        id: 'audience',
        title: 'Define Your Audience',
        description: 'Who will be reading your content?',
        action: 'define_audience',
        required: true
      },
      {
        id: 'structure',
        title: 'Content Structure',
        description: 'Set up the framework for your content',
        action: 'define_structure',
        required: true
      },
      {
        id: 'content_planning',
        title: 'Content Planning',
        description: 'Outline the key points for each section',
        action: 'plan_content',
        required: true
      },
      {
        id: 'initial_draft',
        title: 'Generate Initial Draft',
        description: 'Create the first version of your content',
        action: 'generate_content',
        required: true
      },
      {
        id: 'review_enhance',
        title: 'Review and Enhance',
        description: 'Review your content and make improvements',
        action: 'enhance_content',
        required: true
      },
      {
        id: 'publish_settings',
        title: 'Publishing Settings',
        description: 'Configure how and where your content will be published',
        action: 'configure_publishing',
        required: true
      },
      {
        id: 'publish',
        title: 'Publish Your Content',
        description: 'Share your content with the world',
        action: 'publish_content',
        required: true
      }
    ];
    
    // Add tier-specific steps
    switch (gatewayTier) {
      case 'enterprise':
        baseSteps.splice(7, 0, {
          id: 'compliance_review',
          title: 'Compliance Review',
          description: 'Ensure content meets enterprise guidelines',
          action: 'compliance_review',
          required: true
        });
        baseSteps.splice(8, 0, {
          id: 'legal_approval',
          title: 'Legal Approval',
          description: '

