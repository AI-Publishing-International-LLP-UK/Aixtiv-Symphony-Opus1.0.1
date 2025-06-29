export class AuditLogger {
    private logs: Array<{
        timestamp: Date;
        action: string;
        details: any;
        userId?: string;
    }>;

    constructor() {
        this.logs = [];
    }

    log(action: string, details: any, userId?: string): void {
        this.logs.push({
            timestamp: new Date(),
            action,
            details,
            userId
        });
    }

    getLogs(): any[] {
        return this.logs;
    }

    clearLogs(): void {
        this.logs = [];
    }
}

