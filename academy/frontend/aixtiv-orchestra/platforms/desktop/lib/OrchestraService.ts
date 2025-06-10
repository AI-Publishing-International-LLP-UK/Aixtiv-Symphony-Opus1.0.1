import { 
OrchestraConfig,
OrchestraEvent,
ServiceStatus,
HealthCheckStatus,
OrchestraOperations
} from '../types/orchestra';
import { 
firestore,
storage,
createCollection,
updateDocument
} from '../services/firebase';

class OrchestraServiceError extends Error {
constructor(message: string) {
    super(`OrchestraService Error: ${message}`);
    this.name = 'OrchestraServiceError';
}
}

export class OrchestraService implements OrchestraOperations {
private config: OrchestraConfig;
private eventListeners: Map<string, Function[]>;
private servicesStatus: Map<string, ServiceStatus>;

constructor(config: OrchestraConfig) {
    this.config = config;
    this.eventListeners = new Map();
    this.servicesStatus = new Map();
    this.initialize();
}

private async initialize(): Promise<void> {
    try {
    await this.setupCollections();
    await this.initializeHealthChecks();
    this.startEventListeners();
    } catch (error) {
    throw new OrchestraServiceError(`Initialization failed: ${error.message}`);
    }
}

private async setupCollections(): Promise<void> {
    try {
    await createCollection('events');
    await createCollection('services');
    await createCollection('health');
    } catch (error) {
    throw new OrchestraServiceError(`Failed to setup collections: ${error.message}`);
    }
}

public async registerService(serviceId: string, status: ServiceStatus): Promise<void> {
    try {
    this.servicesStatus.set(serviceId, status);
    await updateDocument('services', serviceId, { status });
    } catch (error) {
    throw new OrchestraServiceError(`Failed to register service: ${error.message}`);
    }
}

public async emitEvent(event: OrchestraEvent): Promise<void> {
    try {
    const eventRef = firestore.collection('events').doc();
    await eventRef.set({
        ...event,
        timestamp: new Date(),
        processed: false
    });

    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(listener => listener(event));
    } catch (error) {
    throw new OrchestraServiceError(`Failed to emit event: ${error.message}`);
    }
}

public onEvent(eventType: string, callback: (event: OrchestraEvent) => void): void {
    const listeners = this.eventListeners.get(eventType) || [];
    this.eventListeners.set(eventType, [...listeners, callback]);
}

public async getServiceStatus(serviceId: string): Promise<ServiceStatus> {
    try {
    const status = this.servicesStatus.get(serviceId);
    if (!status) {
        throw new OrchestraServiceError(`Service ${serviceId} not found`);
    }
    return status;
    } catch (error) {
    throw new OrchestraServiceError(`Failed to get service status: ${error.message}`);
    }
}

public async performHealthCheck(serviceId: string): Promise<HealthCheckStatus> {
    try {
    const healthRef = firestore.collection('health').doc(serviceId);
    const healthSnapshot = await healthRef.get();
    
    if (!healthSnapshot.exists) {
        return { status: 'unknown', lastCheck: new Date(), message: 'No health data available' };
    }

    return healthSnapshot.data() as HealthCheckStatus;
    } catch (error) {
    throw new OrchestraServiceError(`Health check failed: ${error.message}`);
    }
}

private async initializeHealthChecks(): Promise<void> {
    try {
    // Setup periodic health checks for registered services
    setInterval(async () => {
        for (const [serviceId] of this.servicesStatus) {
        await this.performHealthCheck(serviceId);
        }
    }, this.config.healthCheckInterval || 30000);
    } catch (error) {
    throw new OrchestraServiceError(`Failed to initialize health checks: ${error.message}`);
    }
}

private startEventListeners(): void {
    firestore.collection('events')
    .where('processed', '==', false)
    .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
            const event = change.doc.data() as OrchestraEvent;
            const listeners = this.eventListeners.get(event.type) || [];
            listeners.forEach(listener => listener(event));
            
            await change.doc.ref.update({ processed: true });
        }
        });
    });
}

public async cleanup(): Promise<void> {
    try {
    // Cleanup logic here (e.g., close connections, clear intervals)
    this.eventListeners.clear();
    this.servicesStatus.clear();
    } catch (error) {
    throw new OrchestraServiceError(`Cleanup failed: ${error.message}`);
    }
}
}

