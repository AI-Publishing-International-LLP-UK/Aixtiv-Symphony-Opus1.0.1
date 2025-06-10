"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.godaddyConfig = exports.GoDaddyConfig = void 0;
const zod_1 = require("zod");
const config_error_1 = require("../../errors/config.error");
const base_config_1 = require("../base.config");
// Schema for GoDaddy API configuration validation
const GoDaddyConfigSchema = zod_1.z.object({
    API_KEY: zod_1.z.string().min(1, 'GoDaddy API key is required'),
    API_SECRET: zod_1.z.string().min(1, 'GoDaddy API secret is required'),
    API_BASE_URL: zod_1.z
        .string()
        .url('Invalid GoDaddy API base URL')
        .default('https://api.godaddy.com/v1'),
    REQUEST_TIMEOUT_MS: zod_1.z.number().int().positive().default(30000),
    RATE_LIMIT_REQUESTS: zod_1.z.number().int().positive().default(50),
    RATE_LIMIT_WINDOW_MS: zod_1.z.number().int().positive().default(60000),
    RETRY_ATTEMPTS: zod_1.z.number().int().min(0).default(3),
    RETRY_DELAY_MS: zod_1.z.number().int().positive().default(1000),
});
class GoDaddyConfig extends base_config_1.BaseConfig {
    constructor() {
        super();
        this.config = this.loadAndValidateConfig();
    }
    static getInstance() {
        if (!GoDaddyConfig.instance) {
            GoDaddyConfig.instance = new GoDaddyConfig();
        }
        return GoDaddyConfig.instance;
    }
    loadAndValidateConfig() {
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
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const details = error.errors
                    .map(err => `${err.path.join('.')}: ${err.message}`)
                    .join(', ');
                throw new config_error_1.ConfigError(`GoDaddy configuration validation failed: ${details}`);
            }
            throw new config_error_1.ConfigError('Failed to load GoDaddy configuration');
        }
    }
    // Getter methods for configuration values
    get apiKey() {
        return this.config.API_KEY;
    }
    get apiSecret() {
        return this.config.API_SECRET;
    }
    get baseUrl() {
        return this.config.API_BASE_URL;
    }
    get requestTimeout() {
        return this.config.REQUEST_TIMEOUT_MS;
    }
    get rateLimit() {
        return {
            requests: this.config.RATE_LIMIT_REQUESTS,
            windowMs: this.config.RATE_LIMIT_WINDOW_MS,
        };
    }
    get retry() {
        return {
            attempts: this.config.RETRY_ATTEMPTS,
            delayMs: this.config.RETRY_DELAY_MS,
        };
    }
    // Method to validate current configuration
    validate() {
        this.loadAndValidateConfig();
    }
    // Method to reload configuration (useful for testing)
    reload() {
        this.config = this.loadAndValidateConfig();
    }
}
exports.GoDaddyConfig = GoDaddyConfig;
// Export a singleton instance
exports.godaddyConfig = GoDaddyConfig.getInstance();
//# sourceMappingURL=godaddy.config.js.map