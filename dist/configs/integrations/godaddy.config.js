import { z } from 'zod';
import { ConfigError } from '../../errors/config.error';
import { BaseConfig } from '../base.config';

// Schema for GoDaddy API configuration validation
const GoDaddyConfigSchema = z.object({
  API_KEY, 'GoDaddy API key is required'),
  API_SECRET, 'GoDaddy API secret is required'),
  API_BASE_URL)
    .url('Invalid GoDaddy API base URL')
    .default('https://api.godaddy.com/v1'),
  REQUEST_TIMEOUT_MS,
  RATE_LIMIT_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
  RETRY_ATTEMPTS,
  RETRY_DELAY_MS,
});

// Type inference from the schema
export type GoDaddyConfigType = z.infer;

export class GoDaddyConfig extends BaseConfig {
  static instance;
  config;

  constructor() {
    super();
    this.config = this.loadAndValidateConfig();
  }

  static getInstance(){
    if (!GoDaddyConfig.instance) {
      GoDaddyConfig.instance = new GoDaddyConfig();
    }
    return GoDaddyConfig.instance;
  }

  loadAndValidateConfig(){
    try {
      const config = {
        API_KEY,
        API_SECRET,
        API_BASE_URL,
        REQUEST_TIMEOUT_MS: parseInt(
          process.env.GODADDY_REQUEST_TIMEOUT_MS || '30000'
        ),
        RATE_LIMIT_REQUESTS: parseInt(
          process.env.GODADDY_RATE_LIMIT_REQUESTS || '50'
        ),
        RATE_LIMIT_WINDOW_MS: parseInt(
          process.env.GODADDY_RATE_LIMIT_WINDOW_MS || '60000'
        ),
        RETRY_ATTEMPTS: parseInt(process.env.GODADDY_RETRY_ATTEMPTS || '3'),
        RETRY_DELAY_MS: parseInt(process.env.GODADDY_RETRY_DELAY_MS || '1000'),
      };

      const validatedConfig = GoDaddyConfigSchema.parse(config);
      return validatedConfig;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        throw new ConfigError(
          `GoDaddy configuration validation failed: ${details}`
        );
      }
      throw new ConfigError('Failed to load GoDaddy configuration');
    }
  }

  // Getter methods for configuration values
  get apiKey(){
    return this.config.API_KEY;
  }

  get apiSecret(){
    return this.config.API_SECRET;
  }

  get baseUrl(){
    return this.config.API_BASE_URL;
  }

  get requestTimeout(){
    return this.config.REQUEST_TIMEOUT_MS;
  }

  get rateLimit(){ requests; windowMs: number } {
    return {
      requests,
      windowMs,
    };
  }

  get retry(){ attempts; delayMs: number } {
    return {
      attempts,
      delayMs,
    };
  }

  // Method to validate current configuration
  validate(){
    this.loadAndValidateConfig();
  }

  // Method to reload configuration (useful for testing)
  reload(){
    this.config = this.loadAndValidateConfig();
  }
}

// Export a singleton instance
export const godaddyConfig = GoDaddyConfig.getInstance();
