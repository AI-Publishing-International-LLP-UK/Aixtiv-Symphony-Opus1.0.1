import type { AuthProviderType, OAuthConfig } from './integration'
import type { OrchestraEventType } from './orchestra'

// RSS Feed Configuration Types
export interface RSSFeedConfig {
feedUrl: string
updateFrequency: number // in minutes
enabled: boolean
lastUpdated?: Date
metadata: RSSFeedMetadata
storage: GoogleDriveStorage
}

export interface RSSFeedMetadata {
title: string
description: string
category: RSSCategory
tags: string[]
owner: string
clientId: string
segmentType: 'R1' | 'R2' | 'R3'
}

export enum RSSCategory {
SECTOR = 'sector',
FUNCTIONAL = 'functional'
}

// Google Drive Storage Configuration
export interface GoogleDriveStorage {
parentFolderId: string
lake: DataLakeType
folderStructure: FolderConfig
permissions: DrivePermission[]
}

export enum DataLakeType {
VISION = 'vision_lake',
COACH = 'lake_coach',
ZENA = 'lake_zena'
}

export interface FolderConfig {
basePath: string
segmentFolders: {
    R1: string
    R2: string
    R3: string
}
archivePath?: string
}

export interface DrivePermission {
email: string
role: 'reader' | 'writer' | 'owner'
type: 'user' | 'group' | 'domain'
}

// Orchestra Event Types for RSS Operations
export enum RSSEventType {
FEED_CREATED = 'rss.feed.created',
FEED_UPDATED = 'rss.feed.updated',
FEED_DELETED = 'rss.feed.deleted',
CONTENT_SCRAPED = 'rss.content.scraped',
CONTENT_PROCESSED = 'rss.content.processed',
CONTENT_STORED = 'rss.content.stored',
LAKE_SYNCHRONIZED = 'rss.lake.synchronized'
}

// Register RSS events with Orchestra
export const RSS_ORCHESTRA_EVENTS: OrchestraEventType[] = [
{
    type: RSSEventType.FEED_CREATED,
    description: 'RSS feed has been created',
    schema: {} as RSSFeedConfig
},
{
    type: RSSEventType.FEED_UPDATED,
    description: 'RSS feed has been updated',
    schema: {} as RSSFeedConfig
},
{
    type: RSSEventType.FEED_DELETED,
    description: 'RSS feed has been deleted',
    schema: { feedUrl: '' }
},
{
    type: RSSEventType.CONTENT_SCRAPED,
    description: 'Content has been scraped from RSS feed',
    schema: { feedUrl: '', items: [] }
},
{
    type: RSSEventType.CONTENT_PROCESSED,
    description: 'RSS content has been processed',
    schema: { feedUrl: '', processedItems: [] }
},
{
    type: RSSEventType.CONTENT_STORED,
    description: 'RSS content has been stored in Google Drive',
    schema: { feedUrl: '', storagePath: '' }
},
{
    type: RSSEventType.LAKE_SYNCHRONIZED,
    description: 'Data lake has been synchronized',
    schema: { lake: '' as DataLakeType, status: '' }
}
]

// Integration Configuration
export interface RSSIntegrationConfig extends OAuthConfig {
provider: AuthProviderType.GOOGLE
scopes: string[]
storageConfig: GoogleDriveStorage
feeds: RSSFeedConfig[]
}

