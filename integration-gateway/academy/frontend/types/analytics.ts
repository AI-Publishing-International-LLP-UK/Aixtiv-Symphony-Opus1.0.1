export interface AnalyticsConfig {
    enabled: boolean;
    trackingId: string;
    metrics: MetricsConfig;
    events: EventsConfig;
    reporting: ReportingConfig;
}

export interface MetricsConfig {
    performance: PerformanceMetrics;
    usage: UsageMetrics;
    security: SecurityMetrics;
    custom: CustomMetric[];
}

export interface PerformanceMetrics {
    responseTime: boolean;
    throughput: boolean;
    errorRate: boolean;
    resourceUtilization: boolean;
    latency: boolean;
}

export interface UsageMetrics {
    activeUsers: boolean;
    sessionDuration: boolean;
    userActions: boolean;
    featureUsage: boolean;
    retention: boolean;
}

export interface SecurityMetrics {
    failedLogins: boolean;
    accessAttempts: boolean;
    vulnerabilities: boolean;
    threats: boolean;
    compliance: boolean;
}

export interface CustomMetric {
    name: string;
    type: MetricType;
    unit: string;
    description: string;
    aggregation: AggregationType;
}

export enum MetricType {
    COUNTER = 'counter',
    GAUGE = 'gauge',
    HISTOGRAM = 'histogram',
    SUMMARY = 'summary'
}

export enum AggregationType {
    SUM = 'sum',
    AVERAGE = 'average',
    MIN = 'min',
    MAX = 'max',
    PERCENTILE = 'percentile',
    COUNT = 'count',
    DISTINCT = 'distinct'
}

/** Strategy for archiving analytics data */
export enum ArchiveStrategy {
    COMPRESS = 'compress',
    DELETE = 'delete',
    COLD_STORAGE = 'cold_storage',
    SUMMARIZE = 'summarize'
}

/** Parameter validation rules and configurations */
export interface ParameterValidation {
    required: boolean;
    type: string;
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: any) => boolean;
}

/** Strategy for handling errors in analytics processing */
export enum ErrorHandlingStrategy {
    RETRY = 'retry',
    IGNORE = 'ignore',
    ALERT = 'alert',
    FALLBACK = 'fallback'
}

/** Type of validation to be performed */
export enum ValidationType {
    SCHEMA = 'schema',
    RANGE = 'range',
    FORMAT = 'format',
    CUSTOM = 'custom'
}

/** Type of data destination */
export enum DestinationType {
    DATABASE = 'database',
    FILE = 'file',
    API = 'api',
    QUEUE = 'queue',
    STREAM = 'stream'
}

/** Threshold levels for analytics alerts */
export enum ThresholdLevel {
    CRITICAL = 'critical',
    WARNING = 'warning',
    INFO = 'info',
    DEBUG = 'debug'
}

/** Configuration for analytics alerts */
export interface AlertConfig {
    level: ThresholdLevel;
    condition: string;
    threshold: number;
    cooldown: number;
    recipients: string[];
    channels: string[];
    template: string;
}

/** Supported compression algorithms */
export enum CompressionAlgorithm {
    GZIP = 'gzip',
    ZLIB = 'zlib',
    BROTLI = 'brotli',
    LZ4 = 'lz4'
}

/** Types of data partitioning */
export enum PartitionType {
    TIME = 'time',
    RANGE = 'range',
    HASH = 'hash',
    LIST = 'list'
}

/** Interactive features available in analytics */
export enum InteractiveFeature {
    ZOOM = 'zoom',
    PAN = 'pan',
    DRILL_DOWN = 'drill_down',
    FILTER = 'filter',
    SORT = 'sort'
}

/** Restrictions on user interactions */
export interface InteractionRestriction {
    feature: InteractiveFeature;
    enabled: boolean;
    minLevel: number;
    maxLevel: number;
    conditions?: string[];
}

/** Types of analytics layouts */
export enum LayoutType {
    GRID = 'grid',
    FLEX = 'flex',
    DASHBOARD = 'dashboard',
    CUSTOM = 'custom'
}

/** Types of analytics widgets */
export enum WidgetType {
    CHART = 'chart',
    TABLE = 'table',
    METRIC = 'metric',
    MAP = 'map',
    CUSTOM = 'custom'
}

/** Types of data filters */
export enum FilterType {
    RANGE = 'range',
    CATEGORY = 'category',
    TEXT = 'text',
    DATE = 'date',
    BOOLEAN = 'boolean'
}

/** Options for data filtering */
export interface FilterOptions {
    type: FilterType;
    field: string;
    operator: string;
    value: any;
    caseSensitive?: boolean;
    multiple?: boolean;
}

/** Types of data sources */
export enum DataSourceType {
    API = 'api',
    DATABASE = 'database',
    FILE = 'file',
    STREAM = 'stream',
    REALTIME = 'realtime'
}

/** Strategy for data refresh */
export enum RefreshStrategy {
    MANUAL = 'manual',
    INTERVAL = 'interval',
    TRIGGER = 'trigger',
    REALTIME = 'realtime'
}

/** Styles for chart legends */
export enum LegendStyle {
    NONE = 'none',
    TOP = 'top',
    RIGHT = 'right',
    BOTTOM = 'bottom',
    LEFT = 'left',
    FLOATING = 'floating'
}

/** Levels for data drill-down */
export enum DrillDownLevel {
    SUMMARY = 'summary',
    DETAIL = 'detail',
    TRANSACTION = 'transaction',
    RAW = 'raw'
}

export interface EventsConfig {
    tracking: EventTracking;
    filters: EventFilter[];
    categories: EventCategory[];
}

export interface EventTracking {
    userEvents: boolean;
    systemEvents: boolean;
    customEvents: boolean;
    retention: number;
}

export interface EventFilter {
    type: string;
    pattern: string;
    exclude: boolean;
}

export interface EventCategory {
    name: string;
    priority: EventPriority;
    retention: number;
}

export enum EventPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

export interface ReportingConfig {
    schedule: ReportSchedule;
    format: ReportFormat[];
    delivery: ReportDelivery[];
    retention: number;
}

export interface ReportSchedule {
    frequency: ReportFrequency;
    dayOfWeek?: number;
    dayOfMonth?: number;
    time?: string;
}

export enum ReportFrequency {
    DAILY = 'daily',
    WEEKLY = 'weekly',
    MONTHLY = 'monthly',
    QUARTERLY = 'quarterly'
}

export enum ReportFormat {
    PDF = 'pdf',
    CSV = 'csv',
    JSON = 'json',
    HTML = 'html'
}

export interface ReportDelivery {
    method: DeliveryMethod;
    destination: string;
    encryption: boolean;
}

export enum DeliveryMethod {
    EMAIL = 'email',
    API = 'api',
    WEBHOOK = 'webhook',
    STORAGE = 'storage'
}

