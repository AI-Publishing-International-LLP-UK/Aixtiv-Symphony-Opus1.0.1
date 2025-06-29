// Event Types
export enum OrchestraEventType {
SERVICE_START = 'SERVICE_START',
SERVICE_STOP = 'SERVICE_STOP',
SERVICE_ERROR = 'SERVICE_ERROR',
CONFIG_UPDATE = 'CONFIG_UPDATE',
HEALTH_CHECK = 'HEALTH_CHECK'
}

// Service Status
export enum ServiceStatus {
STARTING = 'STARTING',
RUNNING = 'RUNNING',
STOPPING = 'STOPPING',
STOPPED = 'STOPPED',
ERROR = 'ERROR',
UNKNOWN = 'UNKNOWN'
}

// Event Payload Types
export interface BaseEvent {
timestamp: number;
type: OrchestraEventType;
serviceId: string;
}

export interface ServiceStartEvent extends BaseEvent {
type: OrchestraEventType.SERVICE_START;
config: ServiceConfig;
}

export interface ServiceStopEvent extends BaseEvent {
type: OrchestraEventType.SERVICE_STOP;
reason?: string;
}

export interface ServiceErrorEvent extends BaseEvent {
type: OrchestraEventType.SERVICE_ERROR;
error: Error;
stack?: string;
}

export interface HealthCheckEvent extends BaseEvent {
type: OrchestraEventType.HEALTH_CHECK;
status: ServiceStatus;
metrics: ServiceMetrics;
}

// Configuration Types
export interface ServiceConfig {
id: string;
name: string;
version: string;
dependencies: string[];
maxRetries: number;
timeoutMs: number;
healthCheck: HealthCheckConfig;
}

export interface HealthCheckConfig {
enabled: boolean;
intervalMs: number;
timeoutMs: number;
retries: number;
}

export interface ServiceMetrics {
uptime: number;
memory: {
    used: number;
    total: number;
};
lastHealthCheck: number;
status: ServiceStatus;
}

// Orchestra Events Union Type
export type OrchestraEvent =
| ServiceStartEvent
| ServiceStopEvent
| ServiceErrorEvent
| HealthCheckEvent;

// Orchestra Operations Interface
export interface OrchestraOperations {
startService(config: ServiceConfig): Promise<void>;
stopService(serviceId: string, reason?: string): Promise<void>;
restartService(serviceId: string): Promise<void>;
getServiceStatus(serviceId: string): Promise<ServiceStatus>;
getServiceMetrics(serviceId: string): Promise<ServiceMetrics>;
subscribeToEvents(callback: (event: OrchestraEvent) => void): () => void;
updateConfiguration(serviceId: string, config: Partial<ServiceConfig>): Promise<void>;
}

