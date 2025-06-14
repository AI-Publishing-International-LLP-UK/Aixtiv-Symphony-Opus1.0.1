export class ContainerManager {
    private containers: Map<string, any>;

    constructor() {
        this.containers = new Map();
    }

    createContainer(id: string, config: any): void {
        this.containers.set(id, {
            id,
            config,
            status: 'created',
            createdAt: new Date()
        });
    }

    getContainer(id: string): any {
        return this.containers.get(id);
    }

    listContainers(): any[] {
        return Array.from(this.containers.values());
    }
}

