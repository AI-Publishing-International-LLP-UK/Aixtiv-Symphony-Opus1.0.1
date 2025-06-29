import { z } from 'zod';
import { ConfigError } from '../../errors/config.error';
import { BaseConfig } from '../base.config';

// Schema for GoDaddy API configuration validation
const GoDaddyConfigSchema = z.object({
    API_KEY: z.string().min(1, 'GoDaddy API key is required'),
    API_SECRET: z.string().min(1, 'GoDaddy API secret is required'),
    API_BASE_URL: z.string().url('Invalid GoDaddy API base URL').default('https://api.godaddy.com/v1'),
    REQUEST_TIMEOUT_MS: z.number().int().positive().default(30000),
    RATE_LIMIT_REQUESTS: z.number().int().positive().default(50),
    RATE_LIMIT_WINDOW_MS: z.number().int().positive().default(60000),
    RETRY_ATTEMPTS: z.number().int().min(0).default(3),
    RETRY_DELAY_MS: z.number().int().positive().default(1000),
});

// Type inference from the schema
export type GoDaddyConfigType = z.infer<typeof GoDaddyConfigSchema>;

export class GoDaddyConfig extends BaseConfig {
    private static instance: GoDaddyConfig;
    private config: GoDaddyConfigType;

    private constructor() {
        super();
        this.config = this.loadAndValidateConfig();
    }

    public static getInstance(): GoDaddyConfig {
        if (!GoDaddyConfig.instance) {
            GoDaddyConfig.instance = new GoDaddyConfig();
        }
        return GoDaddyConfig.instance;
    }

    private loadAndValidateConfig(): GoDaddyConfigType {
        try {
            const config = {
                API_KEY: process.env.GODADDY_API_KEY,
                API_SECRET: process.env.GODADDY_API_SECRET,
                API_BASE_URL: process.env.GODADDY_API_BASE_URL,
                REQUEST_TIMEOUT_MS: parseInt(process.env.GODADDY_REQUEST_TIMEOUT_MS || '30000'),
                RATE_LIMIT_REQUESTS: parseInt(process.env.GODADDY_RATE_LIMIT_REQUESTS || '50'),
                RATE_LIMIT_WINDOW_MS: parseInt(process.env.GODADDY_RATE_LIMIT_WINDOW_MS || '60000'),
                RETRY_ATTEMPTS: parseInt(process.env.GODADDY_RETRY_ATTEMPTS || '3'),
                RETRY_DELAY_MS: parseInt(process.env.GODADDY_RETRY_DELAY_MS || '1000'),
            };

            const validatedConfig = GoDaddyConfigSchema.parse(config);
            return validatedConfig;
        } catch (error) {
            if (error instanceof z.ZodError) {
                const details = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
                throw new ConfigError(`GoDaddy configuration validation failed: ${details}`);
            }
            throw new ConfigError('Failed to load GoDaddy configuration');
        }
    }

    // Getter methods for configuration values
    public get apiKey(): string {
        return this.config.API_KEY;
    }

    public get apiSecret(): string {
        return this.config.API_SECRET;
    }

    public get baseUrl(): string {
        return this.config.API_BASE_URL;
    }

    public get requestTimeout(): number {
        return this.config.REQUEST_TIMEOUT_MS;
    }

    public get rateLimit(): { requests: number; windowMs: number } {
        return {
            requests: this.config.RATE_LIMIT_REQUESTS,
            windowMs: this.config.RATE_LIMIT_WINDOW_MS,
        };
    }

    public get retry(): { attempts: number; delayMs: number } {
        return {
            attempts: this.config.RETRY_ATTEMPTS,
            delayMs: this.config.RETRY_DELAY_MS,
        };
    }

    // Method to validate current configuration
    public validate(): void {
        this.loadAndValidateConfig();
    }

    // Method to reload configuration (useful for testing)
    public reload(): void {
        this.config = this.loadAndValidateConfig();
    }
}

// Export a singleton instance
export const godaddyConfig = GoDaddyConfig.getInstance();

