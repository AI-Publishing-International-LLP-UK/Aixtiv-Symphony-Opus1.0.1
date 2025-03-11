# BidSeeker eProcurement Data Mapping Guide

## Overview

This guide provides detailed mapping instructions for integrating external eProcurement systems with the AIXTIV Bid Suite. Based on the `Bid` interface definition, we've created standardized field mappings for major eProcurement platforms to ensure complete and accurate data synchronization.

## Core Data Model

The Bid Suite uses a comprehensive data model with the following key components:

```typescript
export interface Bid {
  id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  status: BidStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp;
  ownerId: string;
  ownerName: string;
  category: BidCategory;
  tags: string[];
  location?: BidLocation;
  requirements?: BidRequirement[];
  attachments?: BidAttachment[];
  visibility: BidVisibility;
  responses?: BidResponse[];
  metadata?: Record<string, any>;
}
```

## Standard Field Mappings

Below are the standard field mappings for major eProcurement systems:

| Bid Suite Field | SAP Ariba | Coupa | Jaggaer | Oracle Procurement |
|-----------------|-----------|-------|---------|-------------------|
| id | Doc_ID | id | EventId | HeaderId |
| title | Title | title | EventTitle | Description |
| description | Description | description | EventDescription | LongDescription |
| amount | EstimatedValue.Amount | estimated_value | EstimatedValue | TargetAmount |
| currency | EstimatedValue.Currency | currency_code | Currency | CurrencyCode |
| status | Status → mapStatus() | status → mapStatus() | EventStatus → mapStatus() | PhaseCode → mapStatus() |
| createdAt | CreationDate | created_at | CreateDate | CreationDate |
| updatedAt | LastModified | updated_at | LastModifiedDate | LastUpdateDate |
| expiresAt | ResponseDueDate | expiry_date | ResponseDueDate | ResponseDueDate |
| ownerId | OwnerUserId | owner.id | CreatedByUser | CreatedBy |
| ownerName | OwnerUserName | owner.name | CreatedByUserName | CreatedByName |
| category | Category → mapCategory() | commodity.code → mapCategory() | Commodity → mapCategory() | CategoryCode → mapCategory() |
| tags | Keywords.split(',') | tags | EventKeywords.split(';') | Attributes.KeywordList |
| visibility | Public/Private | visibility | Access | VisibilityCode |

## Complex Field Mappings

### Location Mapping

```typescript
// SAP Ariba Location Mapping
const aribaLocationMapping = {
  country: 'DeliveryCountry',
  state: 'DeliveryState',
  city: 'DeliveryCity',
  postalCode: 'DeliveryPostalCode',
  remote: (data) => data.VirtualEvent === 'true',
  coordinates: {
    latitude: 'DeliveryGeocode.Latitude',
    longitude: 'DeliveryGeocode.Longitude'
  }
};

// Coupa Location Mapping
const coupaLocationMapping = {
  country: 'ship_to_location.country',
  state: 'ship_to_location.state',
  city: 'ship_to_location.city',
  postalCode: 'ship_to_location.postal_code',
  remote: 'is_virtual',
  coordinates: null // Coupa doesn't provide coordinates
};
```

### Requirements Mapping

```typescript
// Function to transform Ariba requirements to Bid Suite format
function transformAribaRequirements(aribaData) {
  const requirements = [];
  
  // Map questionnaire items to requirements
  if (aribaData.Questionnaire && aribaData.Questionnaire.Items) {
    aribaData.Questionnaire.Items.forEach((item, index) => {
      requirements.push({
        id: item.ItemId || `req-${index}`,
        title: item.Title,
        description: item.Description || '',
        mandatory: item.Required === 'true',
        type: mapAribaRequirementType(item.Type),
        valueOptions: item.Options ? item.Options.split(',') : undefined
      });
    });
  }
  
  // Map specifications to requirements
  if (aribaData.Specifications) {
    aribaData.Specifications.forEach((spec, index) => {
      requirements.push({
        id: spec.SpecId || `spec-${index}`,
        title: spec.Name,
        description: spec.Description || '',
        mandatory: spec.Mandatory === 'true',
        type: BidRequirementType.QUALIFICATION,
      });
    });
  }
  
  return requirements;
}

// Function to map Ariba requirement types to Bid Suite types
function mapAribaRequirementType(aribaType) {
  const typeMap = {
    'Qualification': BidRequirementType.QUALIFICATION,
    'Certification': BidRequirementType.CERTIFICATION,
    'Experience': BidRequirementType.EXPERIENCE,
    'Availability': BidRequirementType.AVAILABILITY,
    'Legal': BidRequirementType.LEGAL,
    'Technical': BidRequirementType.SKILL
  };
  
  return typeMap[aribaType] || BidRequirementType.OTHER;
}
```

### Attachments Mapping

```typescript
// Function to transform Ariba attachments to Bid Suite format
function transformAribaAttachments(aribaData) {
  const attachments = [];
  
  if (aribaData.Attachments) {
    aribaData.Attachments.forEach((attachment) => {
      attachments.push({
        id: attachment.AttachmentId,
        name: attachment.FileName,
        type: attachment.FileType || 'application/octet-stream',
        url: attachment.URL,
        size: parseInt(attachment.FileSize) || 0,
        uploadedAt: new Timestamp(
          Math.floor(new Date(attachment.UploadDate).getTime() / 1000), 
          0
        )
      });
    });
  }
  
  return attachments;
}
```

## Status Mapping

Status mapping is critical for consistent bid lifecycle tracking:

```typescript
// SAP Ariba status mapping
function mapAribaStatus(aribaStatus) {
  const statusMap = {
    'Draft': BidStatus.DRAFT,
    'Open': BidStatus.OPEN,
    'Pending Selection': BidStatus.UNDER_REVIEW,
    'Awarded': BidStatus.AWARDED,
    'Closed': BidStatus.CLOSED,
    'Canceled': BidStatus.CANCELLED,
    'Expired': BidStatus.EXPIRED
  };
  
  return statusMap[aribaStatus] || BidStatus.OPEN;
}

// Coupa status mapping
function mapCoupaStatus(coupaStatus) {
  const statusMap = {
    'draft': BidStatus.DRAFT,
    'published': BidStatus.OPEN,
    'evaluation': BidStatus.UNDER_REVIEW,
    'awarded': BidStatus.AWARDED,
    'completed': BidStatus.CLOSED,
    'canceled': BidStatus.CANCELLED,
    'expired': BidStatus.EXPIRED
  };
  
  return statusMap[coupaStatus] || BidStatus.OPEN;
}

// Jaggaer status mapping
function mapJaggaerStatus(jaggaerStatus) {
  const statusMap = {
    'Draft': BidStatus.DRAFT,
    'Published': BidStatus.OPEN,
    'Evaluation': BidStatus.UNDER_REVIEW,
    'Awarded': BidStatus.AWARDED,
    'Completed': BidStatus.CLOSED,
    'Canceled': BidStatus.CANCELLED,
    'Expired': BidStatus.EXPIRED
  };
  
  return statusMap[jaggaerStatus] || BidStatus.OPEN;
}
```

## Category Mapping

Standardize industry categorizations across systems:

```typescript
// SAP Ariba category mapping
function mapAribaCategory(aribaCategory) {
  if (aribaCategory.includes('Service') || aribaCategory.includes('Consulting')) {
    return BidCategory.SERVICES;
  } else if (aribaCategory.includes('Product') || aribaCategory.includes('Goods')) {
    return BidCategory.PRODUCTS;
  } else if (aribaCategory.includes('Project')) {
    return BidCategory.PROJECTS;
  } else if (aribaCategory.includes('Consulting')) {
    return BidCategory.CONSULTING;
  } else if (aribaCategory.includes('IT') || aribaCategory.includes('Technology')) {
    return BidCategory.TECHNOLOGY;
  } else if (aribaCategory.includes('Health') || aribaCategory.includes('Medical')) {
    return BidCategory.HEALTHCARE;
  } else if (aribaCategory.includes('Education') || aribaCategory.includes('Training')) {
    return BidCategory.EDUCATION;
  } else if (aribaCategory.includes('Creative') || aribaCategory.includes('Design')) {
    return BidCategory.CREATIVE;
  }
  
  return BidCategory.OTHER;
}
```

## Response Mapping

Map vendor responses to the Bid Suite format:

```typescript
// Transform Ariba responses to Bid Suite format
function transformAribaResponses(aribaData) {
  const responses = [];
  
  if (aribaData.Responses) {
    aribaData.Responses.forEach((response) => {
      const requirementResponses = [];
      
      // Transform requirement responses
      if (response.QuestionnaireResponses) {
        response.QuestionnaireResponses.forEach((qResponse) => {
          requirementResponses.push({
            requirementId: qResponse.QuestionId,
            value: qResponse.Response,
            notes: qResponse.Notes
          });
        });
      }
      
      responses.push({
        id: response.ResponseId,
        responderId: response.SupplierId,
        responderName: response.SupplierName,
        proposal: response.Proposal || '',
        amount: parseFloat(response.BidAmount) || undefined,
        submittedAt: new Timestamp(
          Math.floor(new Date(response.SubmissionDate).getTime() / 1000), 
          0
        ),
        status: mapAribaResponseStatus(response.Status),
        attachments: transformAribaAttachments(response),
        requirementResponses: requirementResponses,
        notes: response.Notes
      });
    });
  }
  
  return responses;
}

// Map Ariba response status to Bid Suite format
function mapAribaResponseStatus(aribaStatus) {
  const statusMap = {
    'Submitted': BidResponseStatus.SUBMITTED,
    'Under Evaluation': BidResponseStatus.UNDER_REVIEW,
    'Accepted': BidResponseStatus.ACCEPTED,
    'Rejected': BidResponseStatus.REJECTED,
    'Shortlisted': BidResponseStatus.SHORTLISTED
  };
  
  return statusMap[aribaStatus] || BidResponseStatus.SUBMITTED;
}
```

## Complete Mapping Profile Example

Here's a complete example of a mapping profile for SAP Ariba:

```typescript
const aribaMappingProfile = {
  // Basic field mappings
  fieldMappings: {
    id: 'Doc_ID',
    title: 'Title',
    description: 'Description',
    amount: {
      field: 'EstimatedValue.Amount',
      transform: (value) => parseFloat(value) || 0
    },
    currency: 'EstimatedValue.Currency',
    status: {
      field: 'Status',
      transform: (value) => mapAribaStatus(value)
    },
    createdAt: {
      field: 'CreationDate',
      transform: (value) => new Timestamp(
        Math.floor(new Date(value).getTime() / 1000), 
        0
      )
    },
    updatedAt: {
      field: 'LastModified',
      transform: (value) => new Timestamp(
        Math.floor(new Date(value).getTime() / 1000), 
        0
      )
    },
    expiresAt: {
      field: 'ResponseDueDate',
      transform: (value) => new Timestamp(
        Math.floor(new Date(value).getTime() / 1000), 
        0
      )
    },
    ownerId: 'OwnerUserId',
    ownerName: 'OwnerUserName',
    category: {
      field: 'Category',
      transform: (value) => mapAribaCategory(value)
    },
    tags: {
      field: 'Keywords',
      transform: (value) => value ? value.split(',').map(t => t.trim()) : []
    },
    visibility: {
      field: 'Visibility',
      transform: (value) => value === 'Public' ? BidVisibility.PUBLIC : BidVisibility.PRIVATE
    }
  },
  
  // Complex field transformations
  complexTransformations: {
    location: (data) => ({
      country: data.DeliveryCountry || '',
      state: data.DeliveryState,
      city: data.DeliveryCity,
      postalCode: data.DeliveryPostalCode,
      remote: data.VirtualEvent === 'true',
      coordinates: data.DeliveryGeocode ? {
        latitude: parseFloat(data.DeliveryGeocode.Latitude),
        longitude: parseFloat(data.DeliveryGeocode.Longitude)
      } : undefined
    }),
    requirements: (data) => transformAribaRequirements(data),
    attachments: (data) => transformAribaAttachments(data),
    responses: (data) => transformAribaResponses(data)
  },
  
  // Unique identifier field in Ariba
  externalIdField: 'Doc_ID',
  
  // Status value mappings for filtering
  statusMappings: {
    [BidStatus.DRAFT]: 'Draft',
    [BidStatus.OPEN]: 'Open',
    [BidStatus.UNDER_REVIEW]: 'Pending Selection',
    [BidStatus.AWARDED]: 'Awarded',
    [BidStatus.CLOSED]: 'Closed',
    [BidStatus.CANCELLED]: 'Canceled',
    [BidStatus.EXPIRED]: 'Expired'
  }
};
```

## Search Criteria Mapping

When performing searches across systems, the `BidSearchCriteria` needs to be translated for each platform:

```typescript
// Transform BidSearchCriteria to Ariba search format
function transformAribaSearchCriteria(criteria: BidSearchCriteria): AribaSearchParams {
  const aribaParams: AribaSearchParams = {};
  
  // Map status filters
  if (criteria.statuses && criteria.statuses.length > 0) {
    aribaParams.status = criteria.statuses.map(
      status => aribaMappingProfile.statusMappings[status]
    ).filter(Boolean);
  }
  
  // Map categories
  if (criteria.categories && criteria.categories.length > 0) {
    aribaParams.category = criteria.categories.map(
      category => reverseMapCategory(category)
    ).filter(Boolean);
  }
  
  // Map amount range
  if (criteria.minAmount !== undefined || criteria.maxAmount !== undefined) {
    aribaParams.estimatedValue = {
      min: criteria.minAmount,
      max: criteria.maxAmount
    };
  }
  
  // Map date range
  if (criteria.dateRange) {
    if (criteria.dateRange.startDate) {
      aribaParams.createdFrom = criteria.dateRange.startDate.toISOString();
    }
    if (criteria.dateRange.endDate) {
      aribaParams.createdTo = criteria.dateRange.endDate.toISOString();
    }
  }
  
  // Map location filters
  if (criteria.location) {
    if (criteria.location.country) {
      aribaParams.country = criteria.location.country;
    }
    if (criteria.location.state) {
      aribaParams.state = criteria.location.state;
    }
    if (criteria.location.city) {
      aribaParams.city = criteria.location.city;
    }
    if (criteria.location.remote !== undefined) {
      aribaParams.isVirtual = criteria.location.remote;
    }
  }
  
  // Map keywords
  if (criteria.keywords && criteria.keywords.length > 0) {
    aribaParams.keyword = criteria.keywords.join(' ');
  }
  
  // Map pagination
  aribaParams.limit = criteria.limit || 20;
  aribaParams.offset = criteria.offset || 0;
  
  // Map sorting
  if (criteria.sortBy) {
    const sortField = mapSortField(criteria.sortBy);
    const sortDir = criteria.sortDirection === 'desc' ? 'desc' : 'asc';
    aribaParams.sort = `${sortField}:${sortDir}`;
  }
  
  return aribaParams;
}

// Map sort fields to Ariba format
function mapSortField(sortBy: BidSortBy): string {
  const fieldMap = {
    [BidSortBy.CREATED_AT]: 'CreationDate',
    [BidSortBy.EXPIRES_AT]: 'ResponseDueDate',
    [BidSortBy.AMOUNT]: 'EstimatedValue.Amount',
    [BidSortBy.RELEVANCE]: 'Score' // Ariba's relevance score field
  };
  
  return fieldMap[sortBy] || 'CreationDate';
}
```

## Requirements Filtering

For platforms that support requirement-based filtering:

```typescript
// Add requirement filters to Ariba search
function addRequirementFilters(aribaParams: AribaSearchParams, criteria: BidSearchCriteria) {
  if (!criteria.requirementFilters || criteria.requirementFilters.length === 0) {
    return aribaParams;
  }
  
  aribaParams.requirements = criteria.requirementFilters.map(filter => ({
    id: filter.requirementId,
    value: filter.value
  }));
  
  return aribaParams;
}
```

## Implementation for Multiple Platforms

To implement a complete system that works with multiple eProcurement platforms:

1. Create standardized mapping profiles for each platform
2. Implement platform-specific API clients
3. Use the SynchronizationEngine to manage data consistency
4. Implement the EnhancedBidSeeker to search across all platforms

```typescript
// Initialize the multi-platform BidSeeker
const bidSeeker = new EnhancedBidSeeker(firestore, 'bids');

// Add SAP Ariba integration
const aribaConnector = new AribaConnector({
  apiEndpoint: process.env.ARIBA_API_ENDPOINT,
  apiKey: process.env.ARIBA_API_KEY,
  mappingProfile: aribaMappingProfile
});
bidSeeker.registerConnector(aribaConnector);

// Add Coupa integration
const coupaConnector = new CoupaConnector({
  apiEndpoint: process.env.COUPA_API_ENDPOINT,
  apiKey: process.env.COUPA_API_KEY,
  mappingProfile: coupaMappingProfile
});
bidSeeker.registerConnector(coupaConnector);

// Search across all platforms
const results = await bidSeeker.searchAcrossSystems({
  statuses: [BidStatus.OPEN],
  categories: [BidCategory.TECHNOLOGY, BidCategory.CONSULTING],
  minAmount: 50000,
  keywords: ['cloud', 'migration'],
  sortBy: BidSortBy.CREATED_AT,
  sortDirection: 'desc',
  limit: 20
});
```

## Data Quality Enforcement

To ensure data quality when integrating with external systems:

1. **Validation Rules**:
   ```typescript
   function validateBid(bid: Partial<Bid>): ValidationResult {
     const errors = [];
     
     // Required fields validation
     if (!bid.title) errors.push('Title is required');
     if (!bid.description) errors.push('Description is required');
     if (bid.amount === undefined) errors.push('Amount is required');
     
     // Type validation
     if (typeof bid.amount !== 'number') errors.push('Amount must be a number');
     
     // Enum validation
     if (bid.status && !Object.values(BidStatus).includes(bid.status)) {
       errors.push(`Invalid status: ${bid.status}`);
     }
     
     return {
       valid: errors.length === 0,
       errors
     };
   }
   ```

2. **Data Cleaning**:
   ```typescript
   function cleanBidData(bid: Partial<Bid>): Partial<Bid> {
     const cleaned = { ...bid };
     
     // Trim strings
     if (typeof cleaned.title === 'string') cleaned.title = cleaned.title.trim();
     if (typeof cleaned.description === 'string') cleaned.description = cleaned.description.trim();
     
     // Default values
     if (!cleaned.tags) cleaned.tags = [];
     if (!cleaned.currency) cleaned.currency = 'USD';
     
     // Ensure valid status
     if (!cleaned.status || !Object.values(BidStatus).includes(cleaned.status)) {
       cleaned.status = BidStatus.DRAFT;
     }
     
     return cleaned;
   }
   ```

## Special Considerations by Platform

### SAP Ariba

- **Authentication**: Uses OAuth 2.0 with refresh tokens
- **Rate Limits**: 100 requests per minute
- **Event Types**: Distinguish between RFIs, RFPs, and Auctions
- **Questionnaire Handling**: Map complex questionnaires to requirements

### Coupa

- **API Authentication**: API keys in headers
- **Webhooks**: Supports event-based notifications
- **Supplier Portal**: Additional supplier-specific fields
- **Custom Fields**: Extensive support for customer-specific fields

### Jaggaer/Sciquest

- **SOAP API**: Some endpoints still use SOAP
- **Multi-round Events**: Support for multi-stage bidding processes
- **Document Extraction**: Special handling for embedded documents
- **Scoring Systems**: Complex scoring rules for bid evaluation

## Next Steps

1. Implement custom connectors for your specific eProcurement systems
2. Create a mapping configuration UI for easy field mapping
3. Add data validation and transformation rules
4. Implement bidirectional data sync for responses
5. Add monitoring and alerting for integration health
