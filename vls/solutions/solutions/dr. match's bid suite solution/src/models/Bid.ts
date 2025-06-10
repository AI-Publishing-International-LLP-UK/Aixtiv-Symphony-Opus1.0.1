/**
 * Bid.ts - Core model definitions for the Bid Suite solution
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Enumeration of possible bid statuses
 */
export enum BidStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  SHORTLISTED = 'shortlisted',
  AWARDED = 'awarded',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
  EXPIRED = 'expired'
}

/**
 * Enumeration of bid categories
 */
export enum BidCategory {
  TECHNOLOGY = 'technology',
  CONSTRUCTION = 'construction',
  CONSULTING = 'consulting',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  GOVERNMENT = 'government',
  RESEARCH = 'research',
  MANUFACTURING = 'manufacturing',
  TRANSPORTATION = 'transportation',
  ENERGY = 'energy',
  OTHER = 'other'
}

/**
 * Sorting options for bid listings
 */
export enum BidSortBy {
  DATE_CREATED_ASC = 'dateCreated_asc',
  DATE_CREATED_DESC = 'dateCreated_desc',
  DEADLINE_ASC = 'deadline_asc',
  DEADLINE_DESC = 'deadline_desc',
  VALUE_ASC = 'value_asc',
  VALUE_DESC = 'value_desc',
  RELEVANCE = 'relevance',
  MATCH_SCORE = 'matchScore'
}

/**
 * Main Bid interface representing a bidding opportunity
 */
export interface Bid {
  id: string;
  title: string;
  description: string;
  category: BidCategory;
  status: BidStatus;
  organization: {
    id: string;
    name: string;
    logo?: string;
  };
  value?: {
    amount: number;
    currency: string;
    rangeMin?: number;
    rangeMax?: number;
  };
  location: {
    country: string;
    region?: string;
    city?: string;
    remote?: boolean;
  };
  dateCreated: Timestamp;
  dateUpdated: Timestamp;
  deadline: Timestamp;
  duration?: {
    value: number;
    unit: 'days' | 'weeks' | 'months' | 'years';
  };
  requirements: {
    description: string;
    documents?: Array<{
      id: string;
      name: string;
      url: string;
      type: string;
      size?: number;
    }>;
    qualifications?: string[];
    certifications?: string[];
  };
  contact?: {
    name: string;
    email: string;
    phone?: string;
    role?: string;
  };
  visibility: 'public' | 'private' | 'invited';
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Interface for bid search criteria
 */
export interface BidSearchCriteria {
  keywords?: string;
  categories?: BidCategory[];
  statuses?: BidStatus[];
  organizations?: string[];
  locations?: {
    countries?: string[];
    regions?: string[];
    cities?: string[];
    remote?: boolean;
  };
  valueRange?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  dateRange?: {
    from?: Timestamp;
    to?: Timestamp;
  };
  deadlineRange?: {
    from?: Timestamp;
    to?: Timestamp;
  };
  tags?: string[];
  sortBy?: BidSortBy;
  limit?: number;
  offset?: number;
}

/**
 * Interface for bid search results
 */
export interface BidSearchResult {
  bids: Bid[];
  totalCount: number;
  hasMore: boolean;
  stats?: {
    categoryCounts: Record<BidCategory, number>;
    statusCounts: Record<BidStatus, number>;
    averageValue?: number;
    nearestDeadline?: Timestamp;
  };
}

/**
 * Interface for bid seeking context
 */
export interface BidSeekingContext {
  userId: string;
  userProfile?: {
    skills: string[];
    interests: string[];
    certifications: string[];
    previousBids?: string[];
    successfulBids?: string[];
  };
  organizationId?: string;
  organizationProfile?: {
    type: string;
    size: string;
    industries: string[];
    capabilities: string[];
    previousContracts?: Array<{
      id: string;
      client: string;
      value: number;
      completed: boolean;
    }>;
  };
  preferences?: {
    preferredCategories: BidCategory[];
    minimumValue?: number;
    maximumDistance?: number;
    excludedOrganizations?: string[];
  };
  currentLocation?: {
    latitude: number;
    longitude: number;
    country: string;
    region?: string;
  };
}

/**
 * Interface for bid ranking settings
 */
export interface BidRankingSettings {
  criteria: Array<{
    name: string;
    weight: number;
    evaluator: (bid: Bid, context: BidSeekingContext) => number;
  }>;
  minimumThreshold?: number;
  boostFactors?: Array<{
    condition: (bid: Bid, context: BidSeekingContext) => boolean;
    multiplier: number;
  }>;
  penaltyFactors?: Array<{
    condition: (bid: Bid, context: BidSeekingContext) => boolean;
    multiplier: number;
  }>;
}

/**
 * Interface for a ranked bid
 */
export interface RankedBid {
  bid: Bid;
  score: number;
  matchDetails?: {
    criteriaScores: Record<string, number>;
    strengths: string[];
    weaknesses: string[];
    recommendations?: string;
  };
}

/**
 * Interface for complete bid ranking results
 */
export interface BidRankingResult {
  rankedBids: RankedBid[];
  totalProcessed: number;
  timestamp: Timestamp;
  context: BidSeekingContext;
  settings: BidRankingSettings;
}

/**
 * Interface for bid monitoring settings
 */
export interface BidMonitoringSettings {
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  notificationChannels: Array<'email' | 'push' | 'sms' | 'in-app'>;
  alertConditions: {
    statusChanges: boolean;
    newDocuments: boolean;
    deadlineApproaching: boolean;
    deadlineThresholdHours: number;
  };
}

/**
 * Interface for bid response
 */
export interface BidResponse {
  id: string;
  bidId: string;
  responderId: string;
  responderName: string;
  responseDate: Timestamp;
  content: {
    coverLetter?: string;
    proposedValue?: {
      amount: number;
      currency: string;
    };
    proposedTimeline?: {
      startDate: Timestamp;
      endDate: Timestamp;
      milestones?: Array<{
        title: string;
        description: string;
        dueDate: Timestamp;
      }>;
    };
    documents?: Array<{
      id: string;
      name: string;
      url: string;
      type: string;
    }>;
  };
  status: 'draft' | 'submitted' | 'under_review' | 'accepted' | 'rejected';
  feedback?: {
    rating?: number;
    comments?: string;
    providedDate?: Timestamp;
  };
}

/**
 * Interface for bid analytics
 */
export interface BidAnalytics {
  bidId: string;
  views: number;
  responses: number;
  averageResponseValue?: number;
  responseRate?: number;
  demographicBreakdown?: Record<string, number>;
  conversionEvents?: Array<{
    eventType: string;
    count: number;
    conversion: number;
  }>;
}

