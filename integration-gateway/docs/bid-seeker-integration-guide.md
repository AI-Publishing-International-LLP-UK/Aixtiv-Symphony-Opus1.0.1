# BidSeeker eProcurement Integration Guide

## Overview

This guide details how to implement the BidSeeker component to integrate with external eProcurement systems through the AIXTIV Enterprise Integration Gateway (EIG). The BidSeeker module serves as the core search and discovery engine within the Bid Suite, enabling real-time monitoring and intelligent filtering of opportunities across multiple procurement platforms.

![BidSeeker Architecture Diagram](https://placeholder.com/wp-content/uploads/2018/10/placeholder.com-logo1.png)

## Implementation Architecture

BidSeeker functions as a bridge between your Firestore database and external eProcurement systems. The current implementation utilizes Firebase/Firestore for data storage, with the Integration Gateway handling data synchronization from external sources.

### Key Components

1. **BidSeeker Service**: Core search and discovery functionality
2. **eProcurement Connectors**: Platform-specific adapters
3. **Data Transformation Service**: Normalizes data across platforms
4. **Synchronization Engine**: Maintains data consistency

## Core BidSeeker Implementation

The BidSeeker service is implemented as follows:

```typescript
/**
 * BidSeeker - Service for finding and monitoring bids
 * 
 * Responsible for translating search criteria into efficient Firestore queries
 * and processing the results into structured bid data.
 */
export class BidSeeker {
  private firestore: Firestore;
  private bidCollection: string;
  
  /**
   * Creates a new BidSeeker instance
   * @param firestore Firestore instance
   * @param bidCollection Name of the bids collection
   */
  constructor(firestore: Firestore, bidCollection: string) {
    this.firestore = firestore;
    this.bidCollection = bidCollection;
  }
  
  // Existing methods as in the provided implementation...

  // Additional methods for eProcurement integration below
}
```

## Integration Gateway Extensions

To connect BidSeeker with external eProcurement databases, add these extension methods to the BidSeeker class:

```typescript
/**
 * Registers an eProcurement system for bid synchronization
 * @param connector The configured connector for the eProcurement system
 * @returns A handle to manage the connection
 */
registerEprocurementSource(connector: EprocurementConnector): ConnectionHandle {
  // Validate connector configuration
  if (!connector.isConfigured()) {
    throw new Error(`Connector ${connector.name} is not properly configured`);
  }
  
  // Initialize synchronization
  const handle = this.syncEngine.registerSource({
    connectorId: connector.id,
    bidCollection: this.bidCollection,
    mappingProfile: connector.getMappingProfile(),
    syncFrequency: connector.syncFrequency || '15m'
  });
  
  // Trigger initial synchronization
  this.syncEngine.triggerSync(connector.id);
  
  return handle;
}

/**
 * Searches for bids across all connected eProcurement systems
 * @param criteria Search criteria
 * @param includeExternalSources Whether to include external sources in search
 * @returns Unified search results from all sources
 */
async searchAcrossSystems(
  criteria: BidSearchCriteria,
  includeExternalSources: boolean = true
): Promise<UnifiedBidSearchResult> {
  // First, search local Firestore database
  const localResults = await this.searchBids(criteria);
  
  // If external sources not requested, return local results only
  if (!includeExternalSources) {
    return {
      ...localResults,
      sources: ['local']
    };
  }
  
  // Get list of active external sources
  const activeSources = this.syncEngine.getActiveSources();
  
  // Search each external source if real-time search is supported
  const externalSearchPromises = activeSources
    .filter(source => source.supportsRealtimeSearch)
    .map(source => this.searchExternalSource(source.id, criteria));
  
  // Wait for all external searches to complete
  const externalResults = await Promise.all(externalSearchPromises);
  
  // Merge results, removing duplicates (based on external ID mapping)
  const mergedResults = this.mergeSearchResults(
    localResults,
    externalResults,
    criteria.limit || 20
  );
  
  return mergedResults;
}

/**
 * Searches a specific external eProcurement system
 * @param sourceId ID of the external source
 * @param criteria Search criteria
 * @returns Search results from the external system
 */
private async searchExternalSource(
  sourceId: string, 
  criteria: BidSearchCriteria
): Promise<ExternalBidSearchResult> {
  const connector = this.syncEngine.getConnector(sourceId);
  
  if (!connector) {
    throw new Error(`Unknown source: ${sourceId}`);
  }
  
  // Transform criteria to format expected by external system
  const transformedCriteria = this.transformSearchCriteria(criteria, connector.getMappingProfile());
  
  // Execute search against external system
  const rawResults = await connector.searchBids(transformedCriteria);
  
  // Transform results to standard Bid format
  const transformedBids = rawResults.items.map(item => 
    this.transformExternalBid(item, sourceId, connector.getMappingProfile())
  );
  
  return {
    bids: transformedBids,
    totalCount: rawResults.totalCount || transformedBids.length,
    hasMore: rawResults.hasMore || false,
    source: sourceId
  };
}
```

## eProcurement Connector Implementation

Create specialized connectors for each eProcurement system. Here's an example for SAP Ariba:

```typescript
/**
 * SAP Ariba connector for bid synchronization and search
 */
export class AribaConnector implements EprocurementConnector {
  id: string = 'ariba';
  name: string = 'SAP Ariba';
  supportsRealtimeSearch: boolean = true;
  syncFrequency: string = '15m';
  
  private apiClient: AribaClient;
  private mappingProfile: DataMappingProfile;
  
  constructor(config: AribaConnectorConfig) {
    this.apiClient = new AribaClient({
      baseUrl: config.apiEndpoint,
      apiKey: config.apiKey,
      realm: config.realm
    });
    
    this.mappingProfile = this.createMappingProfile();
  }
  
  isConfigured(): boolean {
    return Boolean(this.apiClient && this.apiClient.isAuthenticated());
  }
  
  getMappingProfile(): DataMappingProfile {
    return this.mappingProfile;
  }
  
  /**
   * Search for bids in Ariba
   */
  async searchBids(criteria: any): Promise<ExternalSearchResult> {
    const aribaQuery = this.buildAribaQuery(criteria);
    
    const response = await this.apiClient.searchOpportunities(aribaQuery);
    
    return {
      items: response.data.items || [],
      totalCount: response.data.totalCount,
      hasMore: response.data.hasMore
    };
  }
  
  /**
   * Synchronize bids from Ariba to local database
   */
  async syncBids(since: Date): Promise<SyncResult> {
    const response = await this.apiClient.getOpportunitiesUpdatedSince(since);
    
    return {
      items: response.data.items || [],
      totalProcessed: response.data.items?.length || 0,
      success: true
    };
  }
  
  /**
   * Create data mapping profile for Ariba
   */
  private createMappingProfile(): DataMappingProfile {
    return {
      // Field mappings from Ariba to standard Bid model
      fieldMappings: {
        id: 'Doc_ID',
        title: 'Title',
        description: 'Description',
        status: {
          field: 'Status',
          transform: (value) => this.mapAribaStatus(value)
        },
        amount: {
          field: 'EstimatedValue.Amount',
          transform: (value) => parseFloat(value)
        },
        currency: 'EstimatedValue.Currency',
        createdAt: {
          field: 'PublicationDate',
          transform: (value) => new Date(value)
        },
        expiresAt: {
          field: 'CloseDate',
          transform: (value) => new Date(value)
        },
        location: {
          country: 'ProjectLocation.Country',
          state: 'ProjectLocation.State',
          city: 'ProjectLocation.City'
        },
        category: {
          field: 'Category',
          transform: (value) => this.mapAribaCategory(value)
        },
        tags: {
          field: 'Keywords',
          transform: (value) => value.split(',').map(k => k.trim())
        }
      },
      // Unique identifier field in Ariba
      externalIdField: 'Doc_ID',
      // Status value mappings
      statusMappings: {
        'Open': BidStatus.OPEN,
        'Closed': BidStatus.CLOSED,
        'Awarded': BidStatus.AWARDED,
        'Canceled': BidStatus.CANCELLED
      }
    };
  }
  
  /**
   * Map Ariba status to standard BidStatus
   */
  private mapAribaStatus(aribaStatus: string): BidStatus {
    const statusMap: Record<string, BidStatus> = {
      'Active': BidStatus.OPEN,
      'Closed': BidStatus.CLOSED,
      'Awarded': BidStatus.AWARDED,
      'Canceled': BidStatus.CANCELLED
    };
    
    return statusMap[aribaStatus] || BidStatus.UNKNOWN;
  }
  
  /**
   * Map Ariba category to standard BidCategory
   */
  private mapAribaCategory(aribaCategory: string): BidCategory {
    // Implementation depends on Ariba category structure
    // Simplified example:
    if (aribaCategory.includes('IT') || aribaCategory.includes('Software')) {
      return BidCategory.IT_SOFTWARE;
    }
    if (aribaCategory.includes('Construction')) {
      return BidCategory.CONSTRUCTION;
    }
    // Add more mappings as needed
    
    return BidCategory.OTHER;
  }
  
  /**
   * Build Ariba-specific query from standard search criteria
   */
  private buildAribaQuery(criteria: any): AribaSearchParams {
    // Transform standard criteria into Ariba-specific query format
    const query: AribaSearchParams = {
      status: criteria.statuses?.map(s => this.reverseMapStatus(s)),
      keyword: criteria.keywords?.join(' '),
      dateRangeStart: criteria.dateRange?.startDate?.toISOString(),
      dateRangeEnd: criteria.dateRange?.endDate?.toISOString(),
      categories: criteria.categories?.map(c => this.reverseMapCategory(c)),
      limit: criteria.limit || 20,
      offset: criteria.offset || 0
    };
    
    // Add value range if specified
    if (criteria.minAmount !== undefined || criteria.maxAmount !== undefined) {
      query.valueRange = {
        min: criteria.minAmount,
        max: criteria.maxAmount,
        currency: criteria.currency || 'USD'
      };
    }
    
    return query;
  }
  
  /**
   * Reverse map from standard BidStatus to Ariba status
   */
  private reverseMapStatus(standardStatus: BidStatus): string {
    const reverseMap: Record<BidStatus, string> = {
      [BidStatus.OPEN]: 'Active',
      [BidStatus.CLOSED]: 'Closed',
      [BidStatus.AWARDED]: 'Awarded',
      [BidStatus.CANCELLED]: 'Canceled',
      [BidStatus.DRAFT]: 'Draft',
      [BidStatus.UNKNOWN]: 'Active'
    };
    
    return reverseMap[standardStatus] || 'Active';
  }
  
  /**
   * Reverse map from standard BidCategory to Ariba category
   */
  private reverseMapCategory(standardCategory: BidCategory): string {
    // Implementation depends on Ariba category structure
    // Simplified example:
    const reverseMap: Record<BidCategory, string> = {
      [BidCategory.IT_SOFTWARE]: 'Information Technology',
      [BidCategory.CONSTRUCTION]: 'Construction Services',
      [BidCategory.HEALTHCARE]: 'Healthcare Services',
      [BidCategory.CONSULTING]: 'Professional Services',
      [BidCategory.OTHER]: 'Other'
    };
    
    return reverseMap[standardCategory] || 'Other';
  }
}
```

## Data Synchronization Engine

Implement a synchronization engine to manage data consistency between Firestore and external systems:

```typescript
/**
 * Manages synchronization between external eProcurement systems and Firestore
 */
export class SynchronizationEngine {
  private firestore: Firestore;
  private connectors: Map<string, EprocurementConnector>;
  private syncJobs: Map<string, NodeJS.Timeout>;
  private bidCollection: string;
  
  constructor(firestore: Firestore, bidCollection: string) {
    this.firestore = firestore;
    this.bidCollection = bidCollection;
    this.connectors = new Map();
    this.syncJobs = new Map();
  }
  
  /**
   * Register a new data source for synchronization
   */
  registerSource(config: SyncSourceConfig): ConnectionHandle {
    const { connectorId, syncFrequency } = config;
    const connector = this.connectors.get(connectorId);
    
    if (!connector) {
      throw new Error(`Unknown connector: ${connectorId}`);
    }
    
    // Set up recurring synchronization
    const intervalMs = this.parseIntervalToMs(syncFrequency);
    const syncJob = setInterval(() => this.syncSource(connectorId), intervalMs);
    
    this.syncJobs.set(connectorId, syncJob);
    
    // Return handle for managing the connection
    return {
      sourceId: connectorId,
      pause: () => this.pauseSync(connectorId),
      resume: () => this.resumeSync(connectorId),
      triggerSync: () => this.syncSource(connectorId),
      disconnect: () => this.removeSource(connectorId)
    };
  }
  
  /**
   * Get a list of all active data sources
   */
  getActiveSources(): SourceInfo[] {
    return Array.from(this.connectors.entries())
      .filter(([id]) => this.syncJobs.has(id))
      .map(([id, connector]) => ({
        id,
        name: connector.name,
        supportsRealtimeSearch: connector.supportsRealtimeSearch
      }));
  }
  
  /**
   * Get a specific connector by ID
   */
  getConnector(connectorId: string): EprocurementConnector | undefined {
    return this.connectors.get(connectorId);
  }
  
  /**
   * Add a connector to the engine
   */
  addConnector(connector: EprocurementConnector): void {
    this.connectors.set(connector.id, connector);
  }
  
  /**
   * Trigger synchronization for a specific source
   */
  async triggerSync(connectorId: string): Promise<SyncResult> {
    return this.syncSource(connectorId);
  }
  
  /**
   * Pause synchronization for a source
   */
  pauseSync(connectorId: string): void {
    const job = this.syncJobs.get(connectorId);
    if (job) {
      clearInterval(job);
      this.syncJobs.delete(connectorId);
    }
  }
  
  /**
   * Resume synchronization for a source
   */
  resumeSync(connectorId: string): void {
    const connector = this.connectors.get(connectorId);
    if (connector && !this.syncJobs.has(connectorId)) {
      const intervalMs = this.parseIntervalToMs(connector.syncFrequency);
      const syncJob = setInterval(() => this.syncSource(connectorId), intervalMs);
      this.syncJobs.set(connectorId, syncJob);
    }
  }
  
  /**
   * Remove a source from synchronization
   */
  removeSource(connectorId: string): void {
    this.pauseSync(connectorId);
    this.connectors.delete(connectorId);
  }
  
  /**
   * Synchronize data from an external source
   */
  private async syncSource(connectorId: string): Promise<SyncResult> {
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new Error(`Unknown connector: ${connectorId}`);
    }
    
    try {
      // Get last sync timestamp from Firestore
      const lastSync = await this.getLastSyncTimestamp(connectorId);
      
      // Fetch updates from external system
      const syncResult = await connector.syncBids(lastSync);
      
      // Process and store the updates
      await this.processUpdates(connectorId, syncResult.items, connector.getMappingProfile());
      
      // Update last sync timestamp
      await this.updateLastSyncTimestamp(connectorId);
      
      return syncResult;
    } catch (error) {
      console.error(`Sync failed for ${connectorId}:`, error);
      return {
        items: [],
        totalProcessed: 0,
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Process updates from external system and store in Firestore
   */
  private async processUpdates(
    sourceId: string,
    items: any[],
    mappingProfile: DataMappingProfile
  ): Promise<void> {
    // Get batches of 500 items (Firestore batch limit)
    const batches = this.chunkArray(items, 500);
    
    for (const batch of batches) {
      const writeBatch = writeBatch(this.firestore);
      
      for (const item of batch) {
        // Transform external item to Bid format
        const transformedBid = this.transformExternalItem(item, sourceId, mappingProfile);
        
        // Generate a document ID based on external ID
        const docId = `${sourceId}_${item[mappingProfile.externalIdField]}`;
        
        // Add to batch
        const docRef = doc(this.firestore, this.bidCollection, docId);
        writeBatch.set(docRef, transformedBid, { merge: true });
      }
      
      // Commit the batch
      await writeBatch.commit();
    }
  }
  
  /**
   * Transform an external item to Bid format using mapping profile
   */
  private transformExternalItem(
    item: any,
    sourceId: string,
    mappingProfile: DataMappingProfile
  ): any {
    const result: any = {
      source: sourceId,
      externalId: item[mappingProfile.externalIdField],
      lastSyncedAt: Timestamp.now()
    };
    
    // Apply field mappings
    for (const [targetField, mapping] of Object.entries(mappingProfile.fieldMappings)) {
      if (typeof mapping === 'string') {
        // Simple field mapping
        const value = this.getNestedProperty(item, mapping);
        if (value !== undefined) {
          result[targetField] = value;
        }
      } else if (typeof mapping === 'object') {
        // Complex mapping with transformation
        const value = this.getNestedProperty(item, mapping.field);
        if (value !== undefined && mapping.transform) {
          result[targetField] = mapping.transform(value);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Get a nested property from an object using dot notation
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((prev, curr) => 
      prev && prev[curr] !== undefined ? prev[curr] : undefined, obj);
  }
  
  /**
   * Get the last synchronization timestamp for a source
   */
  private async getLastSyncTimestamp(sourceId: string): Promise<Date> {
    try {
      const syncRef = doc(this.firestore, 'syncMetadata', sourceId);
      const syncDoc = await getDoc(syncRef);
      
      if (syncDoc.exists() && syncDoc.data().lastSync) {
        return syncDoc.data().lastSync.toDate();
      }
    } catch (error) {
      console.error(`Error getting last sync time for ${sourceId}:`, error);
    }
    
    // Default to 7 days ago if no sync metadata exists
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() - 7);
    return defaultDate;
  }
  
  /**
   * Update the last synchronization timestamp for a source
   */
  private async updateLastSyncTimestamp(sourceId: string): Promise<void> {
    const syncRef = doc(this.firestore, 'syncMetadata', sourceId);
    await setDoc(syncRef, {
      sourceId,
      lastSync: Timestamp.now(),
      syncCount: increment(1)
    }, { merge: true });
  }
  
  /**
   * Parse interval string (e.g., "15m") to milliseconds
   */
  private parseIntervalToMs(interval: string): number {
    const match = interval.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 15 * 60 * 1000; // Default: 15 minutes
    }
    
    const [, value, unit] = match;
    const numValue = parseInt(value, 10);
    
    switch (unit) {
      case 's': return numValue * 1000;
      case 'm': return numValue * 60 * 1000;
      case 'h': return numValue * 60 * 60 * 1000;
      case 'd': return numValue * 24 * 60 * 60 * 1000;
      default: return 15 * 60 * 1000;
    }
  }
  
  /**
   * Split array into chunks of specified size
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
```

## Integration Usage Example

Here's how to put everything together to integrate BidSeeker with eProcurement systems:

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { BidSeeker } from './services/BidSeeker';
import { SynchronizationEngine } from './services/SynchronizationEngine';
import { AribaConnector } from './connectors/AribaConnector';
import { CoupaConnector } from './connectors/CoupaConnector';
import { JaggaerConnector } from './connectors/JaggaerConnector';

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// Initialize Synchronization Engine
const syncEngine = new SynchronizationEngine(firestore, 'bids');

// Create and configure connectors
const aribaConnector = new AribaConnector({
  apiEndpoint: process.env.ARIBA_API_ENDPOINT,
  apiKey: process.env.ARIBA_API_KEY,
  realm: process.env.ARIBA_REALM
});

const coupaConnector = new CoupaConnector({
  apiEndpoint: process.env.COUPA_API_ENDPOINT,
  apiKey: process.env.COUPA_API_KEY
});

const jaggaerConnector = new JaggaerConnector({
  apiEndpoint: process.env.JAGGAER_API_ENDPOINT,
  username: process.env.JAGGAER_USERNAME,
  password: process.env.JAGGAER_PASSWORD
});

// Add connectors to sync engine
syncEngine.addConnector(aribaConnector);
syncEngine.addConnector(coupaConnector);
syncEngine.addConnector(jaggaerConnector);

// Initialize BidSeeker with enhanced capabilities
const bidSeeker = new EnhancedBidSeeker(firestore, 'bids', syncEngine);

// Register data sources for synchronization
const aribaConnection = bidSeeker.registerEprocurementSource(aribaConnector);
const coupaConnection = bidSeeker.registerEprocurementSource(coupaConnector);
const jaggaerConnection = bidSeeker.registerEprocurementSource(jaggaerConnector);

// Use the enhanced BidSeeker for cross-system searches
async function searchAllOpportunities(keywords: string[]) {
  const results = await bidSeeker.searchAcrossSystems({
    keywords,
    statuses: [BidStatus.OPEN],
    limit: 50,
    sortBy: BidSortBy.RELEVANCE
  });
  
  console.log(`Found ${results.totalCount} opportunities across ${results.sources.length} systems`);
  return results;
}

// Set up real-time monitoring
function monitorHighValueOpportunities(callback: (bids: Bid[]) => void) {
  return bidSeeker.monitorBids({
    statuses: [BidStatus.OPEN],
    minAmount: 1000000,
    sortBy: BidSortBy.CREATED_AT,
    sortDirection: 'desc',
    limit: 20
  }, callback);
}
```

## Data Transformation Profiles

Create standardized data mapping profiles for different eProcurement systems:

```typescript
// Example mapping profile for SAP Ariba
const aribaMappingProfile: DataMappingProfile = {
  fieldMappings: {
    id: 'Doc_ID',
    title: 'Title',
    description: 'Description',
    status: {
      field: 'Status',
      transform: (value) => mapAribaStatus(value)
    },
    // Other field mappings...
  },
  externalIdField: 'Doc_ID',
  statusMappings: {
    'Open': BidStatus.OPEN,
    'Closed': BidStatus.CLOSED,
    'Awarded': BidStatus.AWARDED,
    'Canceled': BidStatus.CANCELLED
  }
};

// Example mapping profile for Coupa
const coupaMappingProfile: DataMappingProfile = {
  fieldMappings: {
    id: 'id',
    title: 'title',
    description: 'description',
    status: {
      field: 'status',
      transform: (value) => mapCoupaStatus(value)
    },
    // Other field mappings...
  },
  externalIdField: 'id',
  statusMappings: {
    'open': BidStatus.OPEN,
    'closed': BidStatus.CLOSED,
    'awarded': BidStatus.AWARDED,
    'canceled': BidStatus.CANCELLED
  }
};
```

## Configuration for Popular eProcurement Systems

Below are configuration snippets for common eProcurement systems:

### SAP Ariba

```typescript
const aribaConfig = {
  apiEndpoint: 'https://openapi.ariba.com/api/sourcing-event/v1/events',
  apiKey: 'your-ariba-api-key',
  realm: 'your-ariba-realm',
  syncFrequency: '30m' // Sync every 30 minutes
};
```

### Coupa

```typescript
const coupaConfig = {
  apiEndpoint: 'https://yourcompany.coupahost.com/api/sourcing_events',
  apiKey: 'your-coupa-api-key',
  syncFrequency: '1h' // Sync every hour
};
```

### Jaggaer/Sciquest

```typescript
const jaggaerConfig = {
  apiEndpoint: 'https://solutions.sciquest.com/apps/Router/SupplierAuth',
  username: 'your-jaggaer-username',
  password: 'your-jaggaer-password',
  syncFrequency: '2h' // Sync every 2 hours
};
```

## Advanced Usage: Creating a Custom Connector

For eProcurement systems without pre-built connectors, create a custom connector:

```typescript
/**
 * Custom connector template for any eProcurement system
 */
export class CustomConnector implements EprocurementConnector {
  id: string;
  name: string;
  supportsRealtimeSearch: boolean;
  syncFrequency: string;
  
  private apiClient: any;
  private mappingProfile: DataMappingProfile;
  
  constructor(config: CustomConnectorConfig) {
    this.id = config.id;
    this.name = config.name;
    this.supportsRealtimeSearch = config.supportsRealtimeSearch || false;
    this.syncFrequency = config.syncFrequency || '1h';
    
    // Initialize your API client with the provided configuration
    this.apiClient = this.createApiClient(config);
    
    // Create mapping profile
    this.mappingProfile = this.createMappingProfile(config.mappingProfile);
  }
  
  /**
   * Initialize API client for the external system
   */
  private createApiClient(config: CustomConnectorConfig): any {
    // Implement the appropriate client for your eProcurement system
    return {
      // Your implementation...
    };
  }
  
  /**
   * Create data mapping profile based on configuration
   */
  private createMappingProfile(mappingConfig: any): DataMappingProfile {
    // Create mapping profile from configuration
    return {
      fieldMappings: mappingConfig.fieldMappings || {},
      externalIdField: mappingConfig.externalIdField || 'id',
      statusMappings: mappingConfig.statusMappings || {}
    };
  }
  
  /**
   * Search for bids in the external system
   */
  async searchBids(criteria: any): Promise<ExternalSearchResult> {
    // Implement search functionality for your system
    // Transform criteria to the format expected by your API
    
    // Example implementation
    const response = await this.apiClient.search({
      // Transform criteria to your API's format
    });
    
    return {
      items: response.items || [],
      totalCount: response.totalCount,
      hasMore: response.hasMore
    };
  }
  
  /**
   * Synchronize bids from the external system
   */
  async syncBids(since: Date): Promise<SyncResult> {
    // Implement synchronization functionality
    
    // Example implementation
    const response = await this.apiClient.getUpdatedSince(since);
    
    return {
      items: response.items || [],
      totalProcessed: response.items?.length || 0,
      success: true
    };
  }
  
  /**
   * Check if the connector is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.apiClient);
  }
  
  /**
   * Get the data mapping profile
   */
  getMappingProfile(): DataMappingProfile {
    return this.mappingProfile;
  }
}
```

## Performance Considerations

1. **Connection Pooling**: Implement connection pooling for external systems to minimize connection overhead.

2. **Caching Strategy**: Implement a caching layer for frequently accessed data:

```typescript
// Add caching to the BidSeeker
class CachedBidSeeker extends BidSeeker {
  private cache: LRUCache<string, BidSearchResult>;
  
  constructor(firestore: Firestore, bidCollection: string, cacheSize: number = 100) {
    super(firestore, bidCollection);
    this.cache = new LRUCache<string, BidSearchResult>({ max: cacheSize });
  }
  
  async searchBids(criteria: BidSearchCriteria): Promise<BidSearchResult> {
    // Generate cache key based on criteria
    const cacheKey = this.generateCacheKey(criteria);
    
    // Check cache first
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    
    // Perform actual search
    const result = await super.searchBids(criteria);
    
    // Cache the result
    this.cache.set(cacheKey, result);
    
    return result;
  }
  
  private generateCacheKey(criteria: BidSearchCriteria): string {
    return JSON.stringify(criteria);
  }
}
```

3. **Batch Processing**: Process updates in batches to reduce Firestore write operations.

4. **Selective Synchronization**: Implement selective field synchronization to minimize data transfer.

## Monitoring and Diagnostics

Add monitoring capabilities to track the health of eProcurement integrations:

```typescript
/**
 * Integration health monitoring service
 */
export class IntegrationMonitor {
  private syncEngine: SynchronizationEngine;
  private metrics: Map<string, IntegrationMetrics>;
  
  constructor(syncEngine: SynchronizationEngine) {
    this.syncEngine = syncEngine;
    this.metrics = new Map();
    this.initializeMetrics();
  }
  
  private initializeMetrics() {
    const sources = this.syncEngine.getActiveSources();
    for (const source of sources) {
      this.metrics.set(source.id, {
        successfulSyncs: 0,
        failedSyncs: 0,
        lastSyncTime: null,
        lastSyncDuration: 0,
        itemsSynced: 0,
        errors: []
      });
    }
  }
  
  /**
   * Record a successful synchronization
   */
  recordSuccessfulSync(sourceId: string, duration: number, itemCount: number) {
    const metric = this.getOrCreateMetric(sourceId);
    metric.successfulSyncs++;
    metric.lastSyncTime = new Date();
    metric.lastSyncDuration = duration;
    metric.itemsSynced += itemCount;
  }
  
  /**
   * Record a failed synchronization
   */
  recordFailedSync(sourceId: string, error: string) {
    const metric = this.getOrCreateMetric(sourceId);
    metric.failedSyncs++;
    metric.errors.push({
      timestamp: new Date(),
      message: error
    });
    
    // Keep only the last 10 errors
    if (metric.errors.length > 10) {
      metric.errors = metric.errors.slice(-10);
    }
  }
  
  /**
   * Get integration health metrics
   */
  getIntegrationHealth(): IntegrationHealthReport {
    const report: IntegrationHealthReport = {
      sources: [],
      overallHealth: 'healthy'
    };
    
    for (const [sourceId, metric] of this.metrics.entries()) {
      const source = this.syncEngine.getConnector(sourceId);
      if (!source) continue;
      
      const health = this.calculateSourceHealth(metric);
      
      report.sources.push({
        id: sourceId,
        name: source.name,
        health,
        metrics: { ...metric }
      });
      
      // If any source is unhealthy, the overall health is degraded
      if (health === 'unhealthy' && report.overallHealth === 'healthy') {
        report.overallHealth = 'degraded';
      }
    }
    
    return report;
  }
  
  /**
   * Calculate health status for a source
   */
  private calculateSourceHealth(metric: IntegrationMetrics): 'healthy' | 'degraded' | 'unhealthy' {
    // No successful syncs
    if (metric.successfulSyncs === 0) {
      return 'unhealthy';
    }
    
    // More than 3 consecutive failures
    if (metric.errors.length >= 3) {
      return 'unhealthy';
    }
    
    // Recent failures but some successes
    if (metric.errors.length > 0) {
      return 'degraded';
    }
    
    return 'healthy';
  }
  
  /**
   * Get or create metrics for a source
   */
  private getOrCreateMetric(sourceId: string): IntegrationMetrics {
    if (!this.metrics.has(sourceId)) {
      this.metrics.set(sourceId, {
        successfulSyncs: 0,
        failedSyncs: 0,
        lastSyncTime: null,
        lastSyncDuration: 0,
        itemsSynced: 0,
        errors: []
      });
    }
    
    return this.metrics.get(sourceId)!;
  }
}
```

## Next Steps

1. **Implement additional connectors** for specialized eProcurement systems in your industry.

2. **Create custom data validation logic** for each eProcurement system to ensure data quality.

3. **Develop a mapping configuration UI** to make it easier to map fields between systems.

4. **Implement bidirectional synchronization** to push bid responses back to eProcurement systems.

5. **Add analytics capabilities** to track performance metrics across eProcurement platforms.

## Troubleshooting Common Issues

### Connection Failures

If connections to eProcurement systems fail:

1. Verify API credentials and endpoints
2. Check network connectivity and firewall settings
3. Ensure API rate limits are not exceeded
4. Implement exponential backoff for retries

### Data Mapping Issues

If data is incorrectly mapped:

1. Review the mapping profile for the specific connector
2. Check for schema changes in the external system
3. Add validation logic to detect and handle unexpected data formats
4. Implement data cleaning routines for problematic fields

### Synchronization Performance

If synchronization is slow or resource-intensive:

1. Implement incremental synchronization using change tokens or timestamps
2. Adjust synchronization frequency based on data volume and change rate
3. Use field filtering to synchronize only necessary data
4. Implement parallel processing for independent operations
