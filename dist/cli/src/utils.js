import fs from 'fs/promises';
import { createInterface } from 'readline';

/**
 * Validates a domain name format
 * @param {string} domain - Domain name to validate
 * @throws {Error} If domain format is invalid
 */
export function validateDomain(domain) {
  const domainRegex =
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  if (!domainRegex.test(domain)) {
    throw new Error(`Invalid domain format: ${domain}`);
  }
}

/**
 * Reads lines from a file, ignoring empty lines and comments
 * @param {string} filePath - Path to the file
 * @returns {Promise<string[]>} Array of lines
 */
export async function readFileLines(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error.message}`);
  }
}

/**
 * Prompts for user confirmation
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>} User's response
 */
export async function confirm(message) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(`${message} (y/N) `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Formats a DNS record for display
 * @param {Object} record - DNS record object
 * @returns {Object} Formatted record
 */
export function formatDNSRecord(record) {
  return {
    Type: record.type,
    Name: record.name,
    Data: record.data,
    TTL: record.ttl,
  };
}

/**
 * Groups array elements into chunks
 * @param {Array} array - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array} Array of chunks
 */
export function chunk(array, size) {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  );
}

/**
 * Retries a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Function result
 */
export async function retry(fn, { attempts = 3, delay = 1000 } = {}) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === attempts - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
}
