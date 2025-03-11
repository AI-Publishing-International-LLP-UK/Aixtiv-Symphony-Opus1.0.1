import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

// Required environment variables
const requiredEnvVars = ['GODADDY_API_KEY', 'GODADDY_API_SECRET'];

// Validate required environment variables
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}

export const config = {
    godaddy: {
        apiKey: process.env.GODADDY_API_KEY,
        apiSecret: process.env.GODADDY_API_SECRET,
        baseUrl: process.env.GODADDY_API_URL || 'https://api.godaddy.com/v1',
        timeout: parseInt(process.env.GODADDY_API_TIMEOUT || '30000', 10),
        retryAttempts: parseInt(process.env.GODADDY_API_RETRY_ATTEMPTS || '3', 10),
        retryDelay: parseInt(process.env.GODADDY_API_RETRY_DELAY || '1000', 10)
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || 'godaddy-cli.log',
        maxSize: parseInt(process.env.LOG_MAX_SIZE || '5242880', 10), // 5MB
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10)
    }
};

export default config;

