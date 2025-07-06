"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrMatchLinkedInConfig = exports.DrMatchLinkedInService = exports.LinkedInQuotaManager = void 0;
/**
 * Rate Limiter and Quota Management Service
 */
class LinkedInQuotaManager {
    constructor() {
        this.quotas = new Map();
        // Initialize predefined quotas based on LinkedIn's 24-hour quotas
        const quotaDefinitions = [
            {
                endpoint: 'ugcPosts',
                method: 'CREATE',
                totalLimit: 125000,
                userLimit: 200
            },
            {
                endpoint: 'assets/mediaArtifactPublicUrls',
                method: 'FINDER',
                totalLimit: 4000000,
                userLimit: 40000
            },
            {
                endpoint: 'images',
                method: 'BATCH_GET',
                totalLimit: 500000,
                userLimit: 50000
            },
            {
                endpoint: 'posts',
                method: 'CREATE',
                totalLimit: 150000,
                userLimit: 500
            },
            {
                endpoint: 'adLibrary',
                method: 'FINDER',
                totalLimit: 1000,
                userLimit: 500
            }
        ];
        quotaDefinitions.forEach(quota => {
            const key = `${quota.endpoint}:${quota.method}`;
            this.quotas.set(key, Object.assign(Object.assign({}, quota), { currentUsage: 0, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
             }));
        });
    }
    /**
     * Singleton instance getter
     */
    static getInstance() {
        if (!LinkedInQuotaManager.INSTANCE) {
            LinkedInQuotaManager.INSTANCE = new LinkedInQuotaManager();
        }
        return LinkedInQuotaManager.INSTANCE;
    }
    /**
     * Check if an API call is within quota
     * @param endpoint Endpoint being called
     * @param method HTTP method
     * @param requiredUnits Number of quota units required
     */
    canMakeApiCall(endpoint, method, requiredUnits = 1) {
        const key = `${endpoint}:${method}`;
        const quota = this.quotas.get(key);
        if (!quota) {
            console.warn(`No quota found for ${key}`);
            return true; // Assume allowed if no specific quota
        }
        // Check if reset is needed
        if (new Date() > quota.resetTime) {
            this.resetQuota(key);
        }
        // Check total and user limits
        const withinTotalLimit = quota.currentUsage + requiredUnits <= quota.totalLimit;
        const withinUserLimit = quota.currentUsage + requiredUnits <= quota.userLimit;
        return withinTotalLimit && withinUserLimit;
    }
    /**
     * Record API call usage
     * @param endpoint Endpoint being called
     * @param method HTTP method
     * @param units Number of quota units used
     */
    recordApiCall(endpoint, method, units = 1) {
        const key = `${endpoint}:${method}`;
        const quota = this.quotas.get(key);
        if (quota) {
            quota.currentUsage += units;
        }
    }
    /**
     * Reset quota for a specific endpoint
     * @param key Endpoint:Method key
     */
    resetQuota(key) {
        const quota = this.quotas.get(key);
        if (quota) {
            quota.currentUsage = 0;
            quota.resetTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        }
    }
    /**
     * Get remaining quota for an endpoint
     * @param endpoint Endpoint being checked
     * @param method HTTP method
     */
    getRemainingQuota(endpoint, method) {
        const key = `${endpoint}:${method}`;
        const quota = this.quotas.get(key);
        if (!quota) {
            return {
                totalRemaining: 0,
                userRemaining: 0,
                resetTime: new Date()
            };
        }
        return {
            totalRemaining: quota.totalLimit - quota.currentUsage,
            userRemaining: quota.userLimit - quota.currentUsage,
            resetTime: quota.resetTime
        };
    }
}
exports.LinkedInQuotaManager = LinkedInQuotaManager;
/**
 * Enhanced LinkedIn Service with Quota Management
 */
class DrMatchLinkedInService {
    constructor(config) {
        this.accessToken = null;
        this.config = config;
        this.quotaManager = LinkedInQuotaManager.getInstance();
    }
    /**
     * Wrapper method for API calls with quota management
     */
    async executeApiCall(apiCall, endpoint, method, requiredUnits = 1) {
        // Check quota before making the call
        if (!this.quotaManager.canMakeApiCall(endpoint, method, requiredUnits)) {
            const remainingQuota = this.quotaManager.getRemainingQuota(endpoint, method);
            throw new Error(`Quota exceeded. Reset time: ${remainingQuota.resetTime}. 
        Total remaining: ${remainingQuota.totalRemaining}, 
        User remaining: ${remainingQuota.userRemaining}`);
        }
        try {
            const result = await apiCall();
            // Record the API call usage
            this.quotaManager.recordApiCall(endpoint, method, requiredUnits);
            return result;
        }
        catch (error) {
            console.error(`API Call failed for ${endpoint}:${method}`, error);
            throw error;
        }
    }
    /**
     * Existing methods remain the same, but wrapped with executeApiCall
     * Example for one method (others would be similar):
     */
    async searchAdLibrary(criteria) {
        return this.executeApiCall(async () => {
            if (!this.accessToken) {
                throw new Error('Not authenticated');
            }
            const response = await axios_1.default.get('https://api.linkedin.com/rest/adLibrary', {
                params: Object.assign(Object.assign({}, criteria), { version: '202308' }),
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'LinkedIn-Version': '202308',
                    'Content-Type': 'application/json'
                }
            });
            return {
                ads: response.data.elements.map((ad) => ({
                    id: ad.id,
                    advertiser: ad.advertiser,
                    content: ad.content,
                    platforms: ad.platforms,
                    datePublished: ad.publishedDate
                })),
                totalResults: response.data.paging.total
            };
        }, 'adLibrary', 'FINDER', 1 // Default to 1 unit
        );
    }
    /**
     * Get current API usage statistics
     */
    getApiUsageStatistics() {
        const endpoints = [
            'ugcPosts:CREATE',
            'assets/mediaArtifactPublicUrls:FINDER',
            'images:BATCH_GET',
            'posts:CREATE',
            'adLibrary:FINDER'
        ];
        return endpoints.reduce((stats, endpointKey) => {
            const [endpoint, method] = endpointKey.split(':');
            const quota = this.quotaManager.getRemainingQuota(endpoint, method);
            stats[endpointKey] = {
                method,
                totalRemaining: quota.totalRemaining,
                userRemaining: quota.userRemaining,
                resetTime: quota.resetTime
            };
            return stats;
        }, {});
    }
}
exports.DrMatchLinkedInService = DrMatchLinkedInService;
// Update demonstration function to showcase quota management
async function demonstrateDrMatchLinkedInCapabilities() {
    const linkedInService = new DrMatchLinkedInService(exports.DrMatchLinkedInConfig);
    try {
        // Authenticate
        await linkedInService.authenticate();
        // Demonstrate quota management
        const usageStatistics = linkedInService.getApiUsageStatistics();
        console.log('API Usage Statistics:', usageStatistics);
        // Attempt Ad Library Search
        const adLibraryResults = await linkedInService.searchAdLibrary({
            keywords: ['marketing', 'business consulting'],
            dateRange: {
                start: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
                end: Date.now()
            },
            maxResults: 10
        });
        console.log('Ad Library Search Results:', adLibraryResults);
    }
    catch (error) {
        console.error('Dr. Match LinkedIn Integration Demonstration Failed', error);
    }
}
exports.default = {
    DrMatchLinkedInService,
    LinkedInQuotaManager,
    DrMatchLinkedInConfig: exports.DrMatchLinkedInConfig,
    demonstrateDrMatchLinkedInCapabilities
};
/**
 * Dr. Match LinkedIn Integration Framework
 *
 * Comprehensive LinkedIn API Integration with Extended Capabilities
 */
const axios_1 = require("axios");
/**
 * Dr. Match LinkedIn Integration Service
 */
class DrMatchLinkedInService {
    constructor(config) {
        this.accessToken = null;
        this.config = config;
    }
    /**
     * Authenticate and obtain access token
     */
    async authenticate() {
        try {
            const response = await axios_1.default.post('https://www.linkedin.com/oauth/v2/accessToken', {
                grant_type: 'authorization_code',
                code: '', // Authorization code from OAuth flow
                redirect_uri: this.config.redirectUri,
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret
            });
            this.accessToken = response.data.access_token;
            return response.data;
        }
        catch (error) {
            console.error('LinkedIn Authentication Failed', error);
            throw new Error('Authentication failed');
        }
    }
    /**
     * Search LinkedIn Ad Library
     */
    async searchAdLibrary(criteria) {
        if (!this.accessToken) {
            throw new Error('Not authenticated');
        }
        try {
            const response = await axios_1.default.get('https://api.linkedin.com/rest/adLibrary', {
                params: Object.assign(Object.assign({}, criteria), { version: '202308' }),
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'LinkedIn-Version': '202308',
                    'Content-Type': 'application/json'
                }
            });
            return {
                ads: response.data.elements.map((ad) => ({
                    id: ad.id,
                    advertiser: ad.advertiser,
                    content: ad.content,
                    platforms: ad.platforms,
                    datePublished: ad.publishedDate
                })),
                totalResults: response.data.paging.total
            };
        }
        catch (error) {
            console.error('Ad Library Search Failed', error);
            throw new Error('Ad library search failed');
        }
    }
    /**
     * Initialize Content Upload
     */
    async initializeContentUpload(contentType) {
        if (!this.accessToken) {
            throw new Error('Not authenticated');
        }
        try {
            const endpoint = contentType === 'document'
                ? '/rest/documents/initializeUpload'
                : contentType === 'image'
                    ? '/rest/images/initializeUpload'
                    : '/rest/videos/initializeUpload';
            const response = await axios_1.default.post(`https://api.linkedin.com${endpoint}`, {}, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'LinkedIn-Version': '202401',
                    'Content-Type': 'application/json'
                }
            });
            return {
                uploadUrl: response.data.uploadUrl,
                uploadToken: response.data.uploadToken
            };
        }
        catch (error) {
            console.error('Content Upload Initialization Failed', error);
            throw new Error('Content upload initialization failed');
        }
    }
    /**
     * Share Content on LinkedIn
     */
    async shareContent(content) {
        if (!this.accessToken) {
            throw new Error('Not authenticated');
        }
        try {
            const response = await axios_1.default.post('https://api.linkedin.com/rest/posts', {
                content: {
                    title: content.title,
                    description: content.description,
                    contentEntities: [{
                            entityLocation: content.content.source,
                            thumbnails: [{
                                    resolvedUrl: content.content.source
                                }]
                        }],
                    contentType: content.content.type
                },
                visibility: {
                    com, : .linkedin.ugc.MemberVisibility, content, : .visibility || 'PUBLIC'
                },
                targeting: content.targetAudience ? {
                    industries: content.targetAudience.industries,
                    jobTitles: content.targetAudience.jobTitles
                } : undefined
            }, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'LinkedIn-Version': '202401',
                    'Content-Type': 'application/json'
                }
            });
            return {
                postUrn: response.data.urn,
                shareUrl: response.data.shareUrl
            };
        }
        catch (error) {
            console.error('Content Sharing Failed', error);
            throw new Error('Content sharing failed');
        }
    }
    /**
     * Retrieve User Information via OpenID Connect
     */
    async getUserInfo() {
        if (!this.accessToken) {
            throw new Error('Not authenticated');
        }
        try {
            const response = await axios_1.default.get('https://api.linkedin.com/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            return response.data;
        }
        catch (error) {
            console.error('User Info Retrieval Failed', error);
            throw new Error('User info retrieval failed');
        }
    }
}
exports.DrMatchLinkedInService = DrMatchLinkedInService;
/**
 * Dr. Match LinkedIn Integration Configuration
 */
exports.DrMatchLinkedInConfig = {
    clientId: '7874fjg5h9t5la',
    clientSecret: process.env.LINKEDIN_DR_MATCH_CLIENT_SECRET || '',
    redirectUri: 'https://coaching2100.com',
    alternateRedirectUris: [
        'https://www.linkedin.com/developers/tools/oauth/redirect'
    ],
    scopes: [
        'openid', // Use name and photo
        'profile', // Use name and photo
        'r_events', // Retrieve organization events
        'rw_events', // Manage organization events
        'w_member_social', // Create, modify, delete posts
        'email' // Access primary email
    ],
    appName: 'Dr. Match',
    privacyPolicyUrl: 'https://coaching2100.com/privacy-policy.html',
    tokenConfig: {
        timeToLive: 5184000, // 2 months in seconds
        refreshTokenSupport: true
    }
};
/**
 * Demonstration of Dr. Match's Extended LinkedIn Integration Capabilities
 */
async function demonstrateDrMatchLinkedInCapabilities() {
    const linkedInService = new DrMatchLinkedInService(exports.DrMatchLinkedInConfig);
    try {
        // Authenticate
        await linkedInService.authenticate();
        // Search Ad Library
        const adLibraryResults = await linkedInService.searchAdLibrary({
            keywords: ['marketing', 'business consulting'],
            dateRange: {
                start: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
                end: Date.now()
            },
            maxResults: 10
        });
        console.log('Ad Library Search Results:', adLibraryResults);
        // Initialize Content Upload
        const uploadInitiation = await linkedInService.initializeContentUpload('image');
        console.log('Content Upload Initiated:', uploadInitiation);
        // Share Content
        const contentShare = await linkedInService.shareContent({
            title: 'Coaching 2100 Insights',
            description: 'Innovative business consulting strategies',
            content: {
                type: 'image',
                source: 'https://coaching2100.com/insights-image.jpg'
            },
            visibility: 'PUBLIC',
            targetAudience: {
                industries: ['Professional Services', 'Consulting'],
                jobTitles: ['Business Leader', 'Entrepreneur']
            }
        });
        console.log('Content Shared:', contentShare);
        // Retrieve User Information
        const userInfo = await linkedInService.getUserInfo();
        console.log('User Information:', userInfo);
    }
    catch (error) {
        console.error('Dr. Match LinkedIn Integration Demonstration Failed', error);
    }
}
exports.default = {
    DrMatchLinkedInService,
    DrMatchLinkedInConfig: exports.DrMatchLinkedInConfig,
    demonstrateDrMatchLinkedInCapabilities
};
/**
 * Dr. Match LinkedIn Integration Service
 */
class DrMatchLinkedInService {
    constructor(config) {
        this.accessToken = null;
        this.config = config;
    }
    /**
     * Authenticate and obtain access token
     */
    async authenticate() {
        try {
            const response = await axios_1.default.post('https://www.linkedin.com/oauth/v2/accessToken', {
                grant_type: 'authorization_code',
                code: '', // Authorization code from OAuth flow
                redirect_uri: this.config.redirectUri,
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret
            });
            this.accessToken = response.data.access_token;
            return response.data;
        }
        catch (error) {
            console.error('LinkedIn Authentication Failed', error);
            throw new Error('Authentication failed');
        }
    }
    /**
     * Manage LinkedIn Events
     */
    async createEvent(eventDetails) {
        if (!this.accessToken) {
            throw new Error('Not authenticated');
        }
        try {
            const response = await axios_1.default.post('https://api.linkedin.com/rest/events', {
                name: eventDetails.name,
                description: eventDetails.description,
                startTime: eventDetails.startTime,
                endTime: eventDetails.endTime,
                organizerUrn: eventDetails.organizerUrn,
                eventType: eventDetails.eventType,
                visibility: eventDetails.visibility,
                registrationUrl: eventDetails.registrationUrl
            }, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'LinkedIn-Version': '202405',
                    'Content-Type': 'application/json'
                }
            });
            return response.data.urn;
        }
        catch (error) {
            console.error('Failed to create event', error);
            throw new Error('Event creation failed');
        }
    }
    /**
     * Retrieve Event Attendees and Roles
     */
    async getEventAttendees(eventUrn) {
        if (!this.accessToken) {
            throw new Error('Not authenticated');
        }
        try {
            const response = await axios_1.default.get('https://api.linkedin.com/rest/eventRoleAssignments', {
                params: {
                    eventUrn: eventUrn
                },
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'LinkedIn-Version': '202405'
                }
            });
            return {
                attendees: response.data.elements.map((attendee) => ({
                    memberUrn: attendee.memberUrn,
                    role: attendee.role,
                    registrationStatus: attendee.registrationStatus
                }))
            };
        }
        catch (error) {
            console.error('Failed to retrieve event attendees', error);
            throw new Error('Event attendees retrieval failed');
        }
    }
    /**
     * Manage LinkedIn Live Videos
     */
    async createLiveVideo(videoDetails) {
        if (!this.accessToken) {
            throw new Error('Not authenticated');
        }
        try {
            const response = await axios_1.default.post('https://api.linkedin.com/rest/liveVideos', {
                title: videoDetails.title,
                description: videoDetails.description,
                streamUrl: videoDetails.streamUrl,
                organizationUrn: videoDetails.organizationUrn
            }, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'LinkedIn-Version': '202405',
                    'Content-Type': 'application/json'
                }
            });
            return {
                videoUrn: response.data.urn,
                streamKey: response.data.streamKey
            };
        }
        catch (error) {
            console.error('Failed to create live video', error);
            throw new Error('Live video creation failed');
        }
    }
    /**
     * Retrieve Live Video Viewer Analytics
     */
    async getLiveVideoViewerAnalytics(videoUrn) {
        if (!this.accessToken) {
            throw new Error('Not authenticated');
        }
        try {
            const response = await axios_1.default.get('https://api.linkedin.com/rest/liveViewerCountAnalytics', {
                params: {
                    videoUrn: videoUrn
                },
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'LinkedIn-Version': '202405'
                }
            });
            return {
                totalViewers: response.data.totalViewerCount,
                peakConcurrentViewers: response.data.peakConcurrentViewerCount,
                averageWatchTime: response.data.averageWatchTime
            };
        }
        catch (error) {
            console.error('Failed to retrieve live video analytics', error);
            throw new Error('Live video analytics retrieval failed');
        }
    }
    /**
     * Domain Mapping for Organization
     */
    async getOrganizationDomainMapping() {
        if (!this.accessToken) {
            throw new Error('Not authenticated');
        }
        try {
            const response = await axios_1.default.get('https://api.linkedin.com/rest/organizationEmailDomainMapping', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'LinkedIn-Version': '202405'
                }
            });
            return {
                domains: response.data.domains,
                verificationStatus: response.data.verificationStatus
            };
        }
        catch (error) {
            console.error('Failed to retrieve domain mapping', error);
            throw new Error('Domain mapping retrieval failed');
        }
    }
    /**
     * Retrieve Business Manager Account Details
     */
    async getBusinessManagerAccounts() {
        if (!this.accessToken) {
            throw new Error('Not authenticated');
        }
        try {
            const response = await axios_1.default.get('https://api.linkedin.com/rest/businessManagerAccounts', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'LinkedIn-Version': '202405'
                }
            });
            return {
                accounts: response.data.elements.map((account) => ({
                    id: account.id,
                    name: account.name,
                    organizationUrn: account.organizationUrn
                }))
            };
        }
        catch (error) {
            console.error('Failed to retrieve business manager accounts', error);
            throw new Error('Business manager accounts retrieval failed');
        }
    }
}
exports.DrMatchLinkedInService = DrMatchLinkedInService;
/**
 * Dr. Match LinkedIn Integration Configuration
 */
exports.DrMatchLinkedInConfig = {
    clientId: '7874fjg5h9t5la',
    clientSecret: process.env.LINKEDIN_DR_MATCH_CLIENT_SECRET || '',
    redirectUri: 'https://coaching2100.com',
    alternateRedirectUris: [
        'https://www.linkedin.com/developers/tools/oauth/redirect'
    ],
    scopes: [
        'openid', // Use name and photo
        'profile', // Use name and photo
        'r_events', // Retrieve organization events
        'rw_events', // Manage organization events
        'w_member_social', // Create, modify, delete posts
        'email' // Access primary email
    ],
    appName: 'Dr. Match',
    privacyPolicyUrl: 'https://coaching2100.com/privacy-policy.html',
    tokenConfig: {
        timeToLive: 5184000, // 2 months in seconds
        refreshTokenSupport: true
    }
};
/**
 * Demonstration of Dr. Match's LinkedIn Integration Capabilities
 */
async function demonstrateDrMatchLinkedInCapabilities() {
    const linkedInService = new DrMatchLinkedInService(exports.DrMatchLinkedInConfig);
    try {
        // Authenticate
        await linkedInService.authenticate();
        // Create a LinkedIn Event
        const eventUrn = await linkedInService.createEvent({
            name: 'Coaching 2100 Networking Session',
            description: 'Connecting professionals through strategic networking',
            startTime: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
            endTime: Date.now() + 31 * 24 * 60 * 60 * 1000,
            organizerUrn: 'urn:li:organization:coaching2100',
            eventType: 'VIRTUAL',
            visibility: 'PUBLIC'
        });
        // Retrieve Event Attendees
        const attendees = await linkedInService.getEventAttendees(eventUrn);
        console.log('Event Attendees:', attendees);
        // Create a Live Video
        const liveVideo = await linkedInService.createLiveVideo({
            title: 'Marketing Strategies Masterclass',
            description: 'Advanced marketing techniques for professionals',
            streamUrl: 'rtmp://streaming.example.com/coaching2100',
            organizationUrn: 'urn:li:organization:coaching2100'
        });
        // Get Live Video Analytics
        const videoAnalytics = await linkedInService.getLiveVideoViewerAnalytics(liveVideo.videoUrn);
        console.log('Live Video Analytics:', videoAnalytics);
        // Retrieve Business Manager Accounts
        const businessAccounts = await linkedInService.getBusinessManagerAccounts();
        console.log('Business Manager Accounts:', businessAccounts);
    }
    catch (error) {
        console.error('Dr. Match LinkedIn Integration Demonstration Failed', error);
    }
}
exports.default = {
    DrMatchLinkedInService,
    DrMatchLinkedInConfig: exports.DrMatchLinkedInConfig,
    demonstrateDrMatchLinkedInCapabilities
};
//# sourceMappingURL=dr-match-linkedin-integration.js.map