/**
 * Q4D-Lenz Agent Adapter for LLM Integration
 *
 * This module serves as an adapter between Q4D-Lenz, Dream Commander, and various LLM providers
 * (OpenAI, Anthropic, Hugging Face) for the Co-Pilot agents to interpret and execute commands.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Firebase setup
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Import utility functions
const { getDocumentById, createDocument, updateDocument } = require('./utils');

/**
 * LLM Provider Adapter
 * Handles interactions with different LLM providers (OpenAI, Anthropic, Hugging Face)
 */
class LLMProviderAdapter {
  /**
   * Initialize the LLM provider adapter
   * @param {Object} config - Configuration for the LLM provider
   */
  constructor(config) {
    this.config = config || {};
    this.provider = config.provider || 'openai'; // Default to OpenAI
    this.apiKey = config.apiKey || functions.config().openai.apikey;
    this.model = config.model || 'gpt-4-turbo'; // Default model
    this.maxTokens = config.maxTokens || 2048;
    this.temperature = config.temperature || 0.7;
    this.baseUrl = this._getBaseUrl();
    this.headers = this._getHeaders();
  }

  /**
   * Get the base URL for the selected provider
   * @returns {string} - Base URL
   * @private
   */
  _getBaseUrl() {
    switch (this.provider.toLowerCase()) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      case 'huggingface':
        return 'https://api-inference.huggingface.co/models';
      default:
        throw new Error(`Unsupported LLM provider: ${this.provider}`);
    }
  }

  /**
   * Get the headers for API requests to the selected provider
   * @returns {Object} - Headers object
   * @private
   */
  _getHeaders() {
    switch (this.provider.toLowerCase()) {
      case 'openai':
        return {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        };
      case 'anthropic':
        return {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        };
      case 'huggingface':
        return {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        };
      default:
        throw new Error(`Unsupported LLM provider: ${this.provider}`);
    }
  }

  /**
   * Format a prompt for the selected provider
   * @param {Array|string} messages - Messages to format
   * @returns {Object} - Formatted request body
   * @private
   */
  _formatPrompt(messages) {
    switch (this.provider.toLowerCase()) {
      case 'openai':
        // OpenAI expects an array of message objects with role and content
        return {
          model: this.model,
          messages: Array.isArray(messages)
            ? messages
            : [{ role: 'user', content: messages }],
          max_tokens: this.maxTokens,
          temperature: this.temperature,
        };

      case 'anthropic':
        // Anthropic expects a different format
        let content = '';
        if (Array.isArray(messages)) {
          // Convert message array to Anthropic format
          messages.forEach(msg => {
            if (msg.role === 'user') {
              content += `\n\nHuman: ${msg.content}`;
            } else if (msg.role === 'assistant') {
              content += `\n\nAssistant: ${msg.content}`;
            } else if (msg.role === 'system') {
              content = `${msg.content}\n\n${content}`;
            }
          });
          content += '\n\nAssistant:';
        } else {
          content = `Human: ${messages}\n\nAssistant:`;
        }

        return {
          model: this.model,
          prompt: content,
          max_tokens_to_sample: this.maxTokens,
          temperature: this.temperature,
        };

      case 'huggingface':
        // Hugging Face accepts different formats depending on the model
        // This is a simplified implementation
        return {
          inputs: Array.isArray(messages)
            ? messages.map(msg => msg.content).join('\n')
            : messages,
          parameters: {
            max_new_tokens: this.maxTokens,
            temperature: this.temperature,
            return_full_text: false,
          },
        };

      default:
        throw new Error(`Unsupported LLM provider: ${this.provider}`);
    }
  }

  /**
   * Extract the response text from the provider's response
   * @param {Object} response - API response from the provider
   * @returns {string} - Extracted text
   * @private
   */
  _extractResponseText(response) {
    switch (this.provider.toLowerCase()) {
      case 'openai':
        return response.data.choices[0].message.content;

      case 'anthropic':
        return response.data.completion;

      case 'huggingface':
        // Different Hugging Face models have different response formats
        if (Array.isArray(response.data)) {
          return response.data[0].generated_text || '';
        }
        return response.data.generated_text || '';

      default:
        throw new Error(`Unsupported LLM provider: ${this.provider}`);
    }
  }

  /**
   * Generate a response from the LLM
   * @param {Array|string} messages - Messages to send to the LLM
   * @param {Object} options - Additional options for the request
   * @returns {Promise<string>} - LLM response text
   */
  async generateResponse(messages, options = {}) {
    try {
      const requestBody = this._formatPrompt(messages);

      // Merge additional options
      Object.assign(requestBody, options);

      // Determine the endpoint based on provider
      let endpoint = '';
      switch (this.provider.toLowerCase()) {
        case 'openai':
          endpoint = `${this.baseUrl}/chat/completions`;
          break;
        case 'anthropic':
          endpoint = `${this.baseUrl}/messages`;
          break;
        case 'huggingface':
          endpoint = `${this.baseUrl}/${this.model}`;
          break;
        default:
          throw new Error(`Unsupported LLM provider: ${this.provider}`);
      }

      // Make the API request
      const response = await axios.post(endpoint, requestBody, {
        headers: this.headers,
      });

      // Extract and return the response text
      return this._extractResponseText(response);
    } catch (error) {
      console.error(`Error generating response from ${this.provider}:`, error);

      // Attempt to extract error message for better debugging
      const errorMessage =
        error.response?.data?.error?.message || error.message;
      throw new Error(`LLM provider error: ${errorMessage}`);
    }
  }
}

/**
 * Q4D-Lenz Agent Adapter
 * Manages the Q4D-Lenz perspective for Co-Pilots and coordinates with LLM providers
 */
class Q4DLenzAgentAdapter {
  /**
   * Initialize the Q4D-Lenz Agent Adapter
   * @param {Object} config - Configuration for the adapter
   */
  constructor(config = {}) {
    this.agentId = config.agentId || uuidv4();
    this.ownerSubscriberId = config.ownerSubscriberId;
    this.lenzType = config.lenzType || 'professional';
    this.llmConfig = config.llmConfig || {};
    this.llmProvider = new LLMProviderAdapter(this.llmConfig);
    this.linkedInIntegration = config.linkedInIntegration || false;
    this.failoverEnabled = config.failoverEnabled !== false; // Default to true
    this.cachingEnabled = config.cachingEnabled !== false; // Default to true
    this.collections = {
      agents: db.collection('agents'),
      lenzProfiles: db.collection('q4dLenzProfiles'),
      prompts: db.collection('dreamCommanderPrompts'),
      interpretations: db.collection('lenzInterpretations'),
      activities: db.collection('activities'),
      deliverables: db.collection('deliverables'),
    };
  }

  /**
   * Initialize the agent with Q4D-Lenz capabilities
   * @returns {Promise<Object>} - Initialization result
   */
  async initialize() {
    try {
      // Check if agent already exists
      const existingAgent = await getDocumentById('agents', this.agentId);

      if (existingAgent) {
        // Update existing agent
        await updateDocument('agents', this.agentId, {
          lastInitialized: admin.firestore.FieldValue.serverTimestamp(),
          lenzType: this.lenzType,
          llmProvider: this.llmProvider.provider,
          llmModel: this.llmProvider.model,
        });
      } else {
        // Create new agent
        await createDocument('agents', this.agentId, {
          agentId: this.agentId,
          ownerSubscriberId: this.ownerSubscriberId,
          lenzType: this.lenzType,
          llmProvider: this.llmProvider.provider,
          llmModel: this.llmProvider.model,
          linkedInIntegration: this.linkedInIntegration,
          failoverEnabled: this.failoverEnabled,
          cachingEnabled: this.cachingEnabled,
          status: 'active',
        });
      }

      // Initialize Q4D-Lenz profile
      const lenzProfile = await this._initializeLenzProfile();

      return {
        agentId: this.agentId,
        lenzType: this.lenzType,
        initialized: true,
        lenzProfile,
      };
    } catch (error) {
      console.error('Error initializing Q4D-Lenz Agent:', error);
      throw error;
    }
  }

  /**
   * Initialize the Q4D-Lenz profile for the agent
   * @returns {Promise<Object>} - Lens profile data
   * @private
   */
  async _initializeLenzProfile() {
    try {
      // Check if lens profile already exists
      const existingProfile = await getDocumentById(
        'q4dLenzProfiles',
        this.agentId
      );

      const dimensions = this._getLenzDimensions();

      if (existingProfile) {
        // Update existing profile
        await updateDocument('q4dLenzProfiles', this.agentId, {
          dimensions,
          updated: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
          ...existingProfile,
          dimensions,
        };
      } else {
        // Create new profile
        const profileData = {
          agentId: this.agentId,
          ownerSubscriberId: this.ownerSubscriberId,
          lenzType: this.lenzType,
          dimensions,
          skills: [],
          expertise: [],
          learningRate: 0.8,
          adaptabilityScore: 0.7,
        };

        await createDocument('q4dLenzProfiles', this.agentId, profileData);

        return profileData;
      }
    } catch (error) {
      console.error('Error initializing Q4D-Lenz profile:', error);
      throw error;
    }
  }

  /**
   * Get the dimensions for the current lens type
   * @returns {Object} - Lens dimensions
   * @private
   */
  _getLenzDimensions() {
    switch (this.lenzType) {
      case 'personal':
        return {
          self: true,
          social: true,
          professional: false,
          enterprise: false,
          temporal: ['past', 'present', 'future'],
          perspective: '1st person',
        };

      case 'professional':
        return {
          self: true,
          social: true,
          professional: true,
          enterprise: false,
          temporal: ['past', 'present', 'future'],
          perspective: '3rd person',
        };

      case 'enterprise':
        return {
          self: true,
          social: true,
          professional: true,
          enterprise: true,
          temporal: ['past', 'present', 'future', 'strategic'],
          perspective: '4th dimensional',
        };

      default:
        return {
          self: true,
          social: true,
          professional: false,
          enterprise: false,
          temporal: ['present'],
          perspective: '3rd person',
        };
    }
  }

  /**
   * Prepare the system prompt for the Q4D-Lenz perspective
   * @param {Object} context - Additional context
   * @returns {Object} - System prompt message
   * @private
   */
  _prepareSystemPrompt(context = {}) {
    const dimensions = this._getLenzDimensions();
    const lenzType = this.lenzType;

    let systemPrompt = `You are a Q4D-Lenz equipped Professional Co-Pilot with a ${lenzType} perspective. `;
    systemPrompt += `Your lenz provides you with a ${dimensions.perspective} view across ${dimensions.temporal.join(', ')} timeframes. `;

    if (dimensions.self) {
      systemPrompt += `You can see the individual's personal aspirations, skills, and growth areas. `;
    }

    if (dimensions.social) {
      systemPrompt += `You can perceive social connections, relationships, and network dynamics. `;
    }

    if (dimensions.professional) {
      systemPrompt += `You can analyze professional trajectories, career paths, and skill development. `;
    }

    if (dimensions.enterprise) {
      systemPrompt += `You can understand organizational structures, business ecosystems, and strategic imperatives. `;
    }

    systemPrompt += `\nYour role is to interpret Dream Commander prompts and identify the most beneficial activities for the owner-subscriber. `;
    systemPrompt += `You should align your suggestions with their life and career goals while providing clear, actionable plans. `;
    systemPrompt += `When interpreting prompts, provide structured analysis with reasoning, potential activities, and recommendations.`;

    // Add owner-subscriber context if available
    if (context.ownerProfile) {
      systemPrompt += `\n\nOwner-Subscriber Context:\n`;
      systemPrompt += `Name: ${context.ownerProfile.name || 'Unknown'}\n`;
      systemPrompt += `Career: ${context.ownerProfile.career || 'Unknown'}\n`;
      systemPrompt += `Goals: ${Array.isArray(context.ownerProfile.goals) ? context.ownerProfile.goals.join(', ') : 'Unknown'}\n`;
    }

    // Add LinkedIn context if enabled and available
    if (this.linkedInIntegration && context.linkedInData) {
      systemPrompt += `\n\nLinkedIn Information:\n`;
      systemPrompt += `Industry: ${context.linkedInData.industry || 'Unknown'}\n`;
      systemPrompt += `Position: ${context.linkedInData.position || 'Unknown'}\n`;
      systemPrompt += `Network Size: ${context.linkedInData.connections || 'Unknown'}\n`;
    }

    return {
      role: 'system',
      content: systemPrompt,
    };
  }

  /**
   * Format the Dream Commander prompt for LLM processing
   * @param {Object} prompt - Dream Commander prompt object
   * @param {Object} context - Additional context
   * @returns {Array} - Formatted messages
   * @private
   */
  _formatPromptMessages(prompt, context = {}) {
    // Start with the system prompt
    const messages = [this._prepareSystemPrompt(context)];

    // Add user prompt
    messages.push({
      role: 'user',
      content: `Interpret the following Dream Commander prompt through your Q4D-Lenz:\n\n${prompt.text || prompt}`,
    });

    // Add instruction for structured response
    messages.push({
      role: 'system',
      content: `Provide your interpretation in the following structured format:
1. Analysis: Your understanding of the prompt through your Q4D-Lenz
2. Alignment: How this connects to the owner-subscriber's goals
3. Potential Activities: List 3-5 possible activities to address this prompt
4. Recommendation: The most beneficial activity to execute
5. Execution Plan: Steps to accomplish the recommended activity`,
    });

    return messages;
  }

  /**
   * Interpret a Dream Commander prompt with Q4D-Lenz perspective
   * @param {Object|string} prompt - Dream Commander prompt object or string
   * @returns {Promise<Object>} - Interpretation result
   */
  async interpretPrompt(prompt) {
    try {
      // Get owner-subscriber context if available
      const ownerContext = await this._getOwnerContext();

      // Format messages for the LLM
      const messages = this._formatPromptMessages(prompt, ownerContext);

      // Generate interpretation from LLM
      const interpretationText =
        await this.llmProvider.generateResponse(messages);

      // Parse the interpretation
      const parsedInterpretation =
        this._parseInterpretation(interpretationText);

      // Store the interpretation
      const interpretationId = await this._storeInterpretation(
        prompt,
        parsedInterpretation
      );

      return {
        interpretationId,
        agentId: this.agentId,
        promptId: typeof prompt === 'object' ? prompt.id : null,
        interpretation: parsedInterpretation,
        rawText: interpretationText,
      };
    } catch (error) {
      console.error('Error interpreting Dream Commander prompt:', error);

      // If failover is enabled, try with a backup provider
      if (this.failoverEnabled) {
        return this._failoverInterpretation(prompt);
      }

      throw error;
    }
  }

  /**
   * Failover to a backup LLM provider in case of failure
   * @param {Object|string} prompt - Dream Commander prompt
   * @returns {Promise<Object>} - Interpretation result
   * @private
   */
  async _failoverInterpretation(prompt) {
    try {
      console.log('Attempting failover interpretation with backup provider');

      // Create a backup provider (different from the current one)
      const backupConfig = { ...this.llmConfig };
      backupConfig.provider =
        this.llmProvider.provider === 'openai' ? 'anthropic' : 'openai';

      // Initialize the backup provider
      const backupProvider = new LLMProviderAdapter(backupConfig);

      // Store the original provider
      const originalProvider = this.llmProvider;

      // Set the backup provider
      this.llmProvider = backupProvider;

      // Try interpretation with the backup provider
      const interpretation = await this.interpretPrompt(prompt);

      // Restore the original provider
      this.llmProvider = originalProvider;

      // Add metadata about the failover
      interpretation.usedFailover = true;
      interpretation.failoverProvider = backupConfig.provider;

      return interpretation;
    } catch (error) {
      console.error('Failover interpretation also failed:', error);
      throw new Error('All interpretation attempts failed');
    }
  }

  /**
   * Get context about the owner-subscriber
   * @returns {Promise<Object>} - Owner context
   * @private
   */
  async _getOwnerContext() {
    try {
      if (!this.ownerSubscriberId) {
        return {};
      }

      // Get owner profile from Firestore
      const ownerProfile = await getDocumentById(
        'ownerSubscribers',
        this.ownerSubscriberId
      );

      // Get LinkedIn data if integration is enabled
      let linkedInData = null;
      if (this.linkedInIntegration) {
        linkedInData = await getDocumentById(
          'linkedInData',
          this.ownerSubscriberId
        );
      }

      return {
        ownerProfile: ownerProfile || {},
        linkedInData: linkedInData || {},
      };
    } catch (error) {
      console.error('Error getting owner context:', error);
      return {};
    }
  }

  /**
   * Parse the interpretation text into structured data
   * @param {string} interpretationText - Raw interpretation text from LLM
   * @returns {Object} - Structured interpretation
   * @private
   */
  _parseInterpretation(interpretationText) {
    try {
      // Simple parsing based on section headers
      const sections = {
        analysis: this._extractSection(
          interpretationText,
          'Analysis:',
          'Alignment:'
        ),
        alignment: this._extractSection(
          interpretationText,
          'Alignment:',
          'Potential Activities:'
        ),
        potentialActivities: this._extractActivities(interpretationText),
        recommendation: this._extractSection(
          interpretationText,
          'Recommendation:',
          'Execution Plan:'
        ),
        executionPlan: this._extractSection(
          interpretationText,
          'Execution Plan:',
          null
        ),
      };

      return sections;
    } catch (error) {
      console.error('Error parsing interpretation:', error);

      // Return a basic structure if parsing fails
      return {
        analysis: interpretationText.substring(0, 500),
        potentialActivities: [],
        recommendation: '',
        executionPlan: '',
      };
    }
  }

  /**
   * Extract a section from the interpretation text
   * @param {string} text - Full interpretation text
   * @param {string} startMarker - Start marker for the section
   * @param {string|null} endMarker - End marker for the section, or null for end of text
   * @returns {string} - Extracted section text
   * @private
   */
  _extractSection(text, startMarker, endMarker) {
    const startIndex = text.indexOf(startMarker);

    if (startIndex === -1) {
      return '';
    }

    const startPosition = startIndex + startMarker.length;

    if (!endMarker) {
      return text.substring(startPosition).trim();
    }

    const endIndex = text.indexOf(endMarker, startPosition);

    if (endIndex === -1) {
      return text.substring(startPosition).trim();
    }

    return text.substring(startPosition, endIndex).trim();
  }

  /**
   * Extract potential activities from the interpretation text
   * @param {string} text - Full interpretation text
   * @returns {Array} - Extracted activities
   * @private
   */
  _extractActivities(text) {
    const activitiesSection = this._extractSection(
      text,
      'Potential Activities:',
      'Recommendation:'
    );

    if (!activitiesSection) {
      return [];
    }

    // Split by numbered list items (1., 2., 3., etc.)
    const activityMatches = activitiesSection.match(
      /\d+\.\s+([^\d]+)(?=\d+\.|\s*$)/g
    );

    if (!activityMatches) {
      // Try alternative parsing - split by new lines
      return activitiesSection
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim());
    }

    return activityMatches.map(activity =>
      activity.replace(/^\d+\.\s+/, '').trim()
    );
  }

  /**
   * Store the interpretation in Firestore
   * @param {Object|string} prompt - Dream Commander prompt
   * @param {Object} interpretation - Parsed interpretation
   * @returns {Promise<string>} - Interpretation ID
   * @private
   */
  async _storeInterpretation(prompt, interpretation) {
    try {
      const promptId = typeof prompt === 'object' ? prompt.id : null;
      const promptText = typeof prompt === 'object' ? prompt.text : prompt;

      const interpretationData = {
        agentId: this.agentId,
        ownerSubscriberId: this.ownerSubscriberId,
        promptId,
        promptText,
        lenzType: this.lenzType,
        interpretation,
        llmProvider: this.llmProvider.provider,
        llmModel: this.llmProvider.model,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Store in Firestore
      const interpretationId = await createDocument(
        'lenzInterpretations',
        null,
        interpretationData
      );

      // If promptId exists, update the prompt with interpretation information
      if (promptId) {
        await updateDocument('dreamCommanderPrompts', promptId, {
          interpreted: true,
          interpretationId,
          interpretedBy: this.agentId,
          interpretedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return interpretationId;
    } catch (error) {
      console.error('Error storing interpretation:', error);
      throw error;
    }
  }

  /**
   * Generate activities based on the interpretation
   * @param {string} interpretationId - ID of the interpretation
   * @returns {Promise<Array>} - Generated activities
   */
  async generateActivities(interpretationId) {
    try {
      // Get the interpretation
      const interpretation = await getDocumentById(
        'lenzInterpretations',
        interpretationId
      );

      if (!interpretation) {
        throw new Error(`Interpretation ${interpretationId} not found`);
      }

      const activities = [];

      // Create an activity for the recommended action
      if (interpretation.interpretation.recommendation) {
        const recommendedActivity = {
          title: interpretation.interpretation.recommendation.substring(0, 100),
          description: interpretation.interpretation.recommendation,
          type: 'recommended',
          executionPlan: interpretation.interpretation.executionPlan,
          status: 'planned',
          agentId: this.agentId,
          ownerSubscriberId: this.ownerSubscriberId,
          interpretationId,
          promptId: interpretation.promptId,
        };

        const activityId = await createDocument(
          'activities',
          null,
          recommendedActivity
        );
        activities.push({ id: activityId, ...recommendedActivity });
      }

      // Create activities for the other potential activities
      if (Array.isArray(interpretation.interpretation.potentialActivities)) {
        for (const potentialActivity of interpretation.interpretation
          .potentialActivities) {
          // Skip if this is too similar to the recommended activity
          if (
            activities.length > 0 &&
            this._calculateSimilarity(potentialActivity, activities[0].title) >
              0.8
          ) {
            continue;
          }

          const activity = {
            title: potentialActivity.substring(0, 100),
            description: potentialActivity,
            type: 'alternative',
            status: 'proposed',
            agentId: this.agentId,
            ownerSubscriberId: this.ownerSubscriberId,
            interpretationId,
            promptId: interpretation.promptId,
          };

          const activityId = await createDocument('activities', null, activity);
          activities.push({ id: activityId, ...activity });
        }
      }

      // Update the interpretation with activity IDs
      await updateDocument('lenzInterpretations', interpretationId, {
        activityIds: activities.map(activity => activity.id),
        activitiesGenerated: true,
      });

      return activities;
    } catch (error) {
      console.error('Error generating activities:', error);
      throw error;
    }
  }

  /**
   * Calculate similarity between two strings (simple implementation)
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} - Similarity score (0-1)
   * @private
   */
  _calculateSimilarity(str1, str2) {
    // Simple Jaccard similarity
    const set1 = new Set(str1.toLowerCase().split(' '));
    const set2 = new Set(str2.toLowerCase().split(' '));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Execute an activity and generate a deliverable
   * @param {string} activityId - ID of the activity to execute
   * @returns {Promise<Object>} - Execution result with deliverable
   */
  async executeActivity(activityId) {
    try {
      // Get the activity
      const activity = await getDocumentById('activities', activityId);

      if (!activity) {
        throw new Error(`Activity ${activityId} not found`);
      }

      // Update activity status
      await updateDocument('activities', activityId, {
        status: 'in_progress',
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Prepare context for execution
      const ownerContext = await this._getOwnerContext();

      // Format messages for the LLM
      const messages = [
        this._prepareSystemPrompt(ownerContext),
        {
          role: 'user',
          content: `Execute the following activity as a Q4D-Lenz Co-Pilot:
          
Activity: ${activity.title}
Description: ${activity.description}
${activity.executionPlan ? `Execution Plan: ${activity.executionPlan}` : ''}

Create a complete, detailed, and professional deliverable that I can provide to the owner-subscriber. 
The deliverable should be comprehensive and ready to use or implement.`,
        },
      ];

      // Generate deliverable content from LLM
      const deliverableContent =
        await this.llmProvider.generateResponse(messages);

      // Create a deliverable
      const deliverableData = {
        activityId,
        agentId: this.agentId,
        ownerSubscriberId: this.ownerSubscriberId,
        promptId: activity.promptId,
        interpretationId: activity.interpretationId,
        title: `Deliverable for: ${activity.title}`,
        content: deliverableContent,
        status: 'completed',
        requiresAuthorization: true,
        authorized: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Store the deliverable
      const deliverableId = await createDocument(
        'deliverables',
        null,
        deliverableData
      );

      // Update activity status
      await updateDocument('activities', activityId, {
        status: 'completed',
        deliverableId,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        deliverableId,
        activityId,
        status: 'completed',
        content: deliverableContent,
      };
    } catch (error) {
      console.error('Error executing activity:', error);

      // Update activity status to reflect failure
      if (activityId) {
        await updateDocument('activities', activityId, {
          status: 'failed',
          error: error.message,
          failedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      throw error;
    }
  }

  /**
   * Process feedback and improve the agent's capabilities
   * @param {string} deliverableId - ID of the deliverable
   * @param {Object} feedback - Feedback data
   * @returns {Promise<Object>} - Learning results
   */
  async learnFromFeedback(deliverableId, feedback) {
    try {
      // Get the deliverable
      const deliverable = await getDocumentById('deliverables', deliverableId);

      if (!deliverable) {
        throw new Error(`Deliverable ${deliverableId} not found`);
      }

      // Store feedback
      const feedbackData = {
        deliverableId,
        activityId: deliverable.activityId,
        agentId: this.agentId,
        ownerSubscriberId: this.ownerSubscriberId,
        feedback: feedback.text || feedback,
        rating: feedback.rating || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        processed: false,
      };

      const feedbackId = await createDocument('feedbacks', null, feedbackData);

      // Update deliverable with feedback information
      await updateDocument('deliverables', deliverableId, {
        hasFeedback: true,
        feedbackId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Generate learning insights
      const learningInsights = await this._generateLearningInsights(
        deliverable,
        feedbackData
      );

      // Update agent profile with learnings
      await this._updateAgentWithLearnings(learningInsights);

      // Mark feedback as processed
      await updateDocument('feedbacks', feedbackId, {
        processed: true,
        insights: learningInsights,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        feedbackId,
        insights: learningInsights,
        agentUpdated: true,
      };
    } catch (error) {
      console.error('Error learning from feedback:', error);
      throw error;
    }
  }

  /**
   * Generate learning insights from feedback
   * @param {Object} deliverable - Deliverable object
   * @param {Object} feedback - Feedback data
   * @returns {Promise<Object>} - Learning insights
   * @private
   */
  async _generateLearningInsights(deliverable, feedback) {
    try {
      // Format messages for the LLM
      const messages = [
        {
          role: 'system',
          content: `You are a Q4D-Lenz Co-Pilot learning system. Analyze the deliverable and feedback to extract learning insights that will improve future performance.`,
        },
        {
          role: 'user',
          content: `Analyze this deliverable and the owner's feedback:
          
Deliverable Title: ${deliverable.title}
Deliverable Content: ${deliverable.content.substring(0, 1000)}...

Feedback: ${feedback.feedback}
${feedback.rating ? `Rating: ${feedback.rating}/5` : ''}

Generate structured learning insights in the following format:
1. Strengths: What aspects were well-received?
2. Areas for Improvement: What could be improved?
3. Suggested Adjustments: Specific changes to make in future deliverables
4. Learning Priority: The most important learning from this feedback`,
        },
      ];

      // Generate insights from LLM
      const insightsText = await this.llmProvider.generateResponse(messages);

      // Parse the insights
      const insights = {
        strengths: this._extractSection(
          insightsText,
          'Strengths:',
          'Areas for Improvement:'
        ),
        areasForImprovement: this._extractSection(
          insightsText,
          'Areas for Improvement:',
          'Suggested Adjustments:'
        ),
        suggestedAdjustments: this._extractSection(
          insightsText,
          'Suggested Adjustments:',
          'Learning Priority:'
        ),
        learningPriority: this._extractSection(
          insightsText,
          'Learning Priority:',
          null
        ),
        rawText: insightsText,
      };

      return insights;
    } catch (error) {
      console.error('Error generating learning insights:', error);

      // Return basic insights if LLM fails
      return {
        strengths: 'Could not analyze strengths due to processing error',
        areasForImprovement:
          'Could not analyze areas for improvement due to processing error',
        learningPriority: 'Improve error handling',
      };
    }
  }

  /**
   * Update agent profile with learning insights
   * @param {Object} insights - Learning insights
   * @returns {Promise<void>}
   * @private
   */
  async _updateAgentWithLearnings(insights) {
    try {
      // Get agent profile
      const agent = await getDocumentById('agents', this.agentId);

      if (!agent) {
        throw new Error(`Agent ${this.agentId} not found`);
      }

      // Update learning metrics
      const learnings = agent.learnings || [];

      learnings.push({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        priority: insights.learningPriority,
        type: 'feedback',
      });

      // Keep only the most recent 10 learnings
      while (learnings.length > 10) {
        learnings.shift();
      }

      // Update agent profile
      await updateDocument('agents', this.agentId, {
        learnings,
        lastLearningAt: admin.firestore.FieldValue.serverTimestamp(),
        learningCount: admin.firestore.FieldValue.increment(1),
      });
    } catch (error) {
      console.error('Error updating agent with learnings:', error);
      throw error;
    }
  }
}

// Export the LLM Provider Adapter and Q4D-Lenz Agent Adapter
module.exports = {
  LLMProviderAdapter,
  Q4DLenzAgentAdapter,
};
