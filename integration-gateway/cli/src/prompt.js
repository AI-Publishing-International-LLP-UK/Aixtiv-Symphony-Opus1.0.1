import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { logger } from './logger.js';
import { ValidationError } from './errors.js';

/**
 * Handles interactive prompts and user input validation
 */
class PromptManager {
    constructor() {
        this.spinner = ora();
    }

    /**
     * Prompts for domain input with validation
     * @param {Object} options - Prompt options
     * @returns {Promise<string>} - Validated domain
     */
    async promptForDomain(options = {}) {
        const { 
            message = 'Enter domain name:',
            defaultValue = '',
            required = true 
        } = options;

        const response = await inquirer.prompt([{
            type: 'input',
            name: 'domain',
            message,
            default: defaultValue,
            validate: (input) => {
                if (required && !input.trim()) {
                    return 'Domain name is required';
                }
                if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(input)) {
                    return 'Please enter a valid domain name';
                }
                return true;
            }
        }]);

        return response.domain;
    }

    /**
     * Prompts user to select from multiple domains
     * @param {string[]} domains - List of available domains
     * @returns {Promise<string>} - Selected domain
     */
    async selectDomain(domains) {
        const response = await inquirer.prompt([{
            type: 'list',
            name: 'selectedDomain',
            message: 'Select a domain:',
            choices: domains,
            pageSize: 10
        }]);

        return response.selectedDomain;
    }

    /**
     * Prompts for DNS record details
     * @returns {Promise<Object>} - DNS record configuration
     */
    async promptForDNSRecord() {
        const questions = [
            {
                type: 'list',
                name: 'type',
                message: 'Select DNS record type:',
                choices: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV']
            },
            {
                type: 'input',
                name: 'name',
                message: 'Enter record name:',
                validate: (input) => input.trim() ? true : 'Record name is required'
            },
            {
                type: 'input',
                name: 'value',
                message: 'Enter record value:',
                validate: (input) => input.trim() ? true : 'Record value is required'
            },
            {
                type: 'input',
                name: 'ttl',
                message: 'Enter TTL (in seconds):',
                default: '3600',
                validate: (input) => {
                    const ttl = parseInt(input);
                    if (isNaN(ttl) || ttl < 0) {
                        return 'Please enter a valid TTL value';
                    }
                    return true;
                },
                filter: (input) => parseInt(input)
            }
        ];

        return inquirer.prompt(questions);
    }

    /**
     * Displays a confirmation prompt
     * @param {string} message - Confirmation message
     * @param {boolean} defaultValue - Default selection
     * @returns {Promise<boolean>} - User's choice
     */
    async confirm(message, defaultValue = false) {
        const response = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirmed',
            message,
            default: defaultValue
        }]);

        return response.confirmed;
    }

    /**
     * Shows a progress spinner with the given message
     * @param {string} message - Progress message
     */
    startProgress(message) {
        this.spinner.start(message);
    }

    /**
     * Updates the progress spinner text
     * @param {string} message - New progress message
     */
    updateProgress(message) {
        this.spinner.text = message;
    }

    /**
     * Stops the progress spinner with success
     * @param {string} message - Success message
     */
    succeedProgress(message) {
        this.spinner.succeed(message);
    }

    /**
     * Stops the progress spinner with failure
     * @param {string} message - Error message
     */
    failProgress(message) {
        this.spinner.fail(message);
    }

    /**
     * Creates a progress bar for batch operations
     * @param {number} total - Total number of items
     * @returns {Object} - Progress bar instance
     */
    createProgressBar(total) {
        return new Progress.Bar({
            format: 'Progress |' + chalk.cyan('{bar}') + '| {percentage}% || {value}/{total} Domains',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            total
        });
    }
}

export const promptManager = new PromptManager();

