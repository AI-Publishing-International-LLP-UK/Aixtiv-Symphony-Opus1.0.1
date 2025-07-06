'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.LinkedInContentSeriesService =
  exports.LinkedInOAuthService =
  exports.DrMemoriaLinkedInConfig =
    void 0;
/**
 * Dr. Memoria LinkedIn Integration Configuration
 */
exports.DrMemoriaLinkedInConfig = {
  clientId: process.env.LINKEDIN_DR_MEMORIA_CLIENT_ID || '',
  clientSecret: process.env.LINKEDIN_DR_MEMORIA_CLIENT_SECRET || '',
  redirectUri: 'https://drmemoria.live', // Primary redirect URL
  alternateRedirectUris: [
    'https://www.linkedin.com/developers/tools/oauth/redirect',
  ],
  scopes: [
    'openid', // Use name and photo
    'profile', // Use name and photo
    'w_member_social', // Create, modify, delete posts
    'email', // Access primary email
  ],
  appName: 'Dr. Memoria',
  privacyPolicyUrl: 'https://coaching2100.com/privacy-policy.html',
  tokenConfig: {
    timeToLive: 5184000, // 2 months in seconds
    refreshTokenSupport: true,
  },
};
/**
 * Enhanced OAuth 2.0 Authentication Service
 */
class LinkedInOAuthService {
  constructor(config) {
    this.config = config;
  }
  /**
   * Generate OAuth 2.0 Authorization URL
   */
  generateAuthorizationUrl(state, additionalScopes) {
    const baseScopes = this.config.scopes;
    const scopesParam = [...baseScopes, ...(additionalScopes || [])].join(' ');
    return (
      `https://www.linkedin.com/oauth/v2/authorization?` +
      `response_type=code` +
      `&client_id=${this.config.clientId}` +
      `&redirect_uri=${encodeURIComponent(this.config.redirectUri)}` +
      `&scope=${encodeURIComponent(scopesParam)}` +
      `&state=${state || this.generateState()}`
    );
  }
  /**
   * Generate a secure state parameter for CSRF protection
   */
  generateState() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
  /**
   * Exchange authorization code for access token
   */
  exchangeCodeForToken(authorizationCode) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const response = yield axios_1.default.post(
          'https://www.linkedin.com/oauth/v2/accessToken',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code: authorizationCode,
            redirect_uri: this.config.redirectUri,
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );
        return {
          access_token: response.data.access_token,
          expires_in: response.data.expires_in,
          refresh_token: response.data.refresh_token,
        };
      } catch (error) {
        console.error('Token Exchange Failed', error);
        throw new Error('Failed to exchange authorization code for token');
      }
    });
  }
  /**
   * Refresh access token
   */
  refreshAccessToken(refreshToken) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const response = yield axios_1.default.post(
          'https://www.linkedin.com/oauth/v2/accessToken',
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );
        return {
          access_token: response.data.access_token,
          expires_in: response.data.expires_in,
          refresh_token: response.data.refresh_token,
        };
      } catch (error) {
        console.error('Token Refresh Failed', error);
        throw new Error('Failed to refresh access token');
      }
    });
  }
  /**
   * Validate and inspect access token
   */
  inspectAccessToken(accessToken) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const response = yield axios_1.default.post(
          'https://www.linkedin.com/oauth/v2/introspect',
          new URLSearchParams({
            token: accessToken,
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );
        return {
          active: response.data.active,
          scope: response.data.scope.split(' '),
          client_id: response.data.client_id,
          username: response.data.username,
        };
      } catch (error) {
        console.error('Token Inspection Failed', error);
        throw new Error('Failed to inspect access token');
      }
    });
  }
}
exports.LinkedInOAuthService = LinkedInOAuthService;
/**
 * Demonstration of OAuth Flow
 */
function demonstrateLinkedInOAuthFlow() {
  return __awaiter(this, void 0, void 0, function* () {
    const oauthService = new LinkedInOAuthService(
      exports.DrMemoriaLinkedInConfig
    );
    // Generate Authorization URL
    const authUrl = oauthService.generateAuthorizationUrl();
    console.log('Authorization URL:', authUrl);
    // Note: In a real application, this would involve user interaction
    // 1. User visits authUrl and grants permissions
    // 2. Receives authorization code
    // 3. Exchange code for access token
    // Simulated authorization code exchange
    try {
      const tokenResponse = yield oauthService.exchangeCodeForToken(
        'SIMULATED_AUTH_CODE'
      );
      console.log('Access Token:', tokenResponse.access_token);
      // Inspect the token
      const tokenInspection = yield oauthService.inspectAccessToken(
        tokenResponse.access_token
      );
      console.log('Token Inspection:', tokenInspection);
    } catch (error) {
      console.error('OAuth Flow Demonstration Failed', error);
    }
  });
}
exports.default = {
  LinkedInOAuthService,
  DrMemoriaLinkedInConfig: exports.DrMemoriaLinkedInConfig,
  demonstrateLinkedInOAuthFlow,
};
/**
 * Dr. Memoria LinkedIn Integration Framework
 *
 * Specialized LinkedIn API Integration for MEMORIA_ANTHOLOGY™
 * Focusing on Content Publishing and Workflow Automation
 */
const axios_1 = __importDefault(require('axios'));
/**
 * LinkedIn Content Series Management
 */
class LinkedInContentSeriesService {
  constructor(config) {
    this.accessToken = null;
    this.config = config;
  }
  /**
   * Authenticate and obtain access token
   */
  authenticate() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const response = yield axios_1.default.post(
          'https://www.linkedin.com/oauth/v2/accessToken',
          {
            grant_type: 'authorization_code',
            code: '', // Authorization code from OAuth flow
            redirect_uri: this.config.redirectUri,
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
          }
        );
        this.accessToken = response.data.access_token;
        return response.data;
      } catch (error) {
        console.error('LinkedIn Authentication Failed', error);
        throw new Error('Authentication failed');
      }
    });
  }
  /**
   * Create a new content series for automated publishing
   */
  createContentSeries(seriesDetails) {
    return __awaiter(this, void 0, void 0, function* () {
      if (!this.accessToken) {
        throw new Error('Not authenticated');
      }
      try {
        const response = yield axios_1.default.post(
          'https://api.linkedin.com/rest/contentSeries',
          {
            name: seriesDetails.name,
            description: seriesDetails.description,
            frequency: seriesDetails.frequency || 'weekly',
            topics: seriesDetails.topics || [],
          },
          {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'LinkedIn-Version': '202405',
              'Content-Type': 'application/json',
            },
          }
        );
        return response.data.urn;
      } catch (error) {
        console.error('Failed to create content series', error);
        throw new Error('Content series creation failed');
      }
    });
  }
  /**
   * Publish content to a specific series
   */
  publishContent(workflow) {
    return __awaiter(this, void 0, void 0, function* () {
      if (!this.accessToken) {
        throw new Error('Not authenticated');
      }
      try {
        const response = yield axios_1.default.post(
          'https://api.linkedin.com/rest/originalArticles',
          {
            title: workflow.title,
            content: workflow.content,
            // Add additional metadata
            customMetadata: {
              tags: workflow.tags,
              targetAudience: workflow.targetAudience,
              seriesUrn: workflow.linkedInSeries,
            },
            scheduledPublishTime: workflow.scheduledPublishTime || Date.now(),
          },
          {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'LinkedIn-Version': '202405',
              'Content-Type': 'application/json',
            },
          }
        );
        return {
          postUrn: response.data.urn,
          publishTime: response.data.publishTime,
        };
      } catch (error) {
        console.error('Failed to publish content', error);
        throw new Error('Content publishing failed');
      }
    });
  }
  /**
   * Retrieve content performance analytics
   */
  getContentAnalytics(contentUrn) {
    return __awaiter(this, void 0, void 0, function* () {
      if (!this.accessToken) {
        throw new Error('Not authenticated');
      }
      try {
        const response = yield axios_1.default.get(
          'https://api.linkedin.com/rest/contentAnalytics',
          {
            params: {
              contentUrn: contentUrn,
            },
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'LinkedIn-Version': '202405',
            },
          }
        );
        return {
          impressions: response.data.impressions,
          engagements: response.data.engagements,
          uniqueViewers: response.data.uniqueViewers,
        };
      } catch (error) {
        console.error('Failed to retrieve content analytics', error);
        throw new Error('Content analytics retrieval failed');
      }
    });
  }
  /**
   * Analyze subscriber demographics for a content series
   */
  getSeriesSubscriberDemographics(seriesUrn) {
    return __awaiter(this, void 0, void 0, function* () {
      if (!this.accessToken) {
        throw new Error('Not authenticated');
      }
      try {
        const response = yield axios_1.default.get(
          'https://api.linkedin.com/rest/seriesSubscribers',
          {
            params: {
              series: seriesUrn,
              demographics: true,
            },
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'LinkedIn-Version': '202405',
            },
          }
        );
        return {
          totalSubscribers: response.data.totalCount,
          industriesBreakdown: response.data.industriesDemographics,
          jobTitlesBreakdown: response.data.jobTitlesDemographics,
        };
      } catch (error) {
        console.error('Failed to retrieve subscriber demographics', error);
        throw new Error('Subscriber demographics retrieval failed');
      }
    });
  }
}
exports.LinkedInContentSeriesService = LinkedInContentSeriesService;
/**
 * Dr. Memoria LinkedIn Integration Configuration
 */
exports.DrMemoriaLinkedInConfig = {
  clientId: process.env.LINKEDIN_DR_MEMORIA_CLIENT_ID || '',
  clientSecret: process.env.LINKEDIN_DR_MEMORIA_CLIENT_SECRET || '',
  redirectUri: 'https://coaching2100.com/linkedin-callback',
  scopes: ['r_dma_admin_pages_content', 'w_member_social', 'r_publishing'],
  appName: 'Dr. Memoria',
  privacyPolicyUrl: 'https://coaching2100.com/privacy-policy.html',
};
/**
 * Demonstration of LinkedIn Content Publishing Workflow
 */
function demonstrateContentPublishingWorkflow() {
  return __awaiter(this, void 0, void 0, function* () {
    const linkedInService = new LinkedInContentSeriesService(
      exports.DrMemoriaLinkedInConfig
    );
    try {
      // Authenticate
      yield linkedInService.authenticate();
      // Create a new content series
      const seriesUrn = yield linkedInService.createContentSeries({
        name: 'MEMORIA_ANTHOLOGY™ Insights',
        description:
          'Cutting-edge insights in publishing and workflow automation',
        frequency: 'weekly',
        topics: ['AI', 'Publishing', 'Workflow Automation'],
      });
      // Publish content to the series
      const publishedContent = yield linkedInService.publishContent({
        title: 'Revolutionizing Content Creation with AI',
        content: 'In the era of AI-driven publishing...',
        linkedInSeries: seriesUrn,
        tags: ['AI', 'Publishing', 'Innovation'],
        targetAudience: {
          industries: ['Technology', 'Media', 'Publishing'],
          jobTitles: ['Content Creator', 'Editor', 'Publisher'],
        },
      });
      // Retrieve content analytics
      const contentAnalytics = yield linkedInService.getContentAnalytics(
        publishedContent.postUrn
      );
      // Get subscriber demographics
      const subscriberDemographics =
        yield linkedInService.getSeriesSubscriberDemographics(seriesUrn);
      console.log('Content Published:', publishedContent);
      console.log('Content Analytics:', contentAnalytics);
      console.log('Subscriber Demographics:', subscriberDemographics);
    } catch (error) {
      console.error('LinkedIn Content Publishing Workflow Failed', error);
    }
  });
}
exports.default = {
  LinkedInContentSeriesService,
  DrMemoriaLinkedInConfig: exports.DrMemoriaLinkedInConfig,
  demonstrateContentPublishingWorkflow,
};
