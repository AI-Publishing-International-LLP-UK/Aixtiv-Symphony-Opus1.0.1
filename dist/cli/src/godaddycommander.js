const ora = require('ora');
const inquirer = require('inquirer');
const fs = require('fs').promises;
const path = require('path');
const { GodaddyService } = require('../../services/godaddy.service');

class GodaddyCommander {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.service = new GodaddyService(config);
    }

    /**
     * Register all CLI commands
     * @param {Command} program Commander program instance
     */
    registerCommands(program) {
        this.registerDnsCommands(program);
        this.registerDomainCommands(program);
        this.registerUtilityCommands(program);
    }

    /**
     * Register DNS management commands
     * @param {Command} program Commander program instance
     */
    registerDnsCommands(program) {
        program
            .command('dns:update')
            .description('Update DNS records for one or more domains')
            .option('-d, --domain <domains...>', 'Domain names to update')
            .option('-f, --file <path>', 'File containing domain names')
            .option('-t, --type <type>', 'DNS record type (A, CNAME, TXT, etc.)')
            .option('-n, --name <name>', 'DNS record name')
            .option('-v, --value <value>', 'DNS record value')
            .option('-l, --ttl <ttl>', 'Time to live in seconds', '3600')
            .action(async (options) => {
                const spinner = ora('Processing DNS update request...').start();
                try {
                    const domains = await this.getDomainList(options);
                    const records = await this.service.updateDnsRecords(domains, {
                        type: options.type,
                        name: options.name,
                        value: options.value,
                        ttl: parseInt(options.ttl)
                    });
                    spinner.succeed(`Updated DNS records for ${domains.length} domain(s)`);
                    this.logger.info(JSON.stringify(records, null, 2));
                } catch (error) {
                    spinner.fail(`DNS update failed: ${error.message}`);
                    process.exit(1);
                }
            });
    }

    /**
     * Register domain management commands
     * @param {Command} program Commander program instance
     */
    registerDomainCommands(program) {
        program
            .command('domain:list')
            .description('List all domains in your account')
            .action(async () => {
                const spinner = ora('Fetching domain list...').start();
                try {
                    const domains = await this.service.listDomains();
                    spinner.succeed(`Found ${domains.length} domains`);
                    this.logger.info(JSON.stringify(domains, null, 2));
                } catch (error) {
                    spinner.fail(`Failed to fetch domains: ${error.message}`);
                    process.exit(1);
                }
            });
    }

    /**
     * Register utility commands
     * @param {Command} program Commander program instance
     */
    registerUtilityCommands(program) {
        program
            .command('verify')
            .description('Verify domain ownership using DNS TXT record')
            .option('-d, --domain <domains...>', 'Domains to verify')
            .option('-f, --file <path>', 'File containing domain names')
            .action(async (options) => {
                const spinner = ora('Processing domain verification...').start();
                try {
                    const domains = await this.getDomainList(options);
                    const results = await this.service.verifyDomains(domains);
                    spinner.succeed(`Verified ${domains.length} domain(s)`);
                    this.logger.info(JSON.stringify(results, null, 2));
                } catch (error) {
                    spinner.fail(`Verification failed: ${error.message}`);
                    process.exit(1);
                }
            });
    }

    /**
     * Get list of domains from command options
     * @param {Object} options Command options
     * @returns {Promise<string[]>} List of domains
     */
    async getDomainList(options) {
        if (options.file) {
            const content = await fs.readFile(path.resolve(options.file), 'utf8');
            return content.split('\n').map(d => d.trim()).filter(Boolean);
        }
        return options.domain || [];
    }
}

module.exports = {
    GodaddyCommander
};

#!/usr/bin/env node

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { GoDaddyService } from '../../services/godaddy.service.js';
import { loadConfig } from '../../configs/integrations/godaddy.config.js';
import fs from 'fs/promises';

const program = new Command();
const spinner = ora();

// Initialize GoDaddy service
const initializeService = () => {
  try {
    const config = loadConfig();
    return new GoDaddyService(config);
  } catch (error) {
    console.error(chalk.red('Error initializing GoDaddy service:'), error.message);
    process.exit(1);
  }
};

// Validate domain format
const validateDomain = (domain) => {
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
};

// Parse domains from file or command line
const parseDomains = async (domainsArg, options) => {
  try {
    if (options.file) {
      const content = await fs.readFile(options.file, 'utf-8');
      return content.split('\n').filter(domain => domain.trim() && validateDomain(domain.trim()));
    }
    return domainsArg.split(',').filter(domain => validateDomain(domain.trim()));
  } catch (error) {
    throw new Error(`Error parsing domains: ${error.message}`);
  }
};

// Set up CLI commands
program
  .name('godaddycommander')
  .description('CLI tool for managing GoDaddy domains')
  .version('1.0.0');

program
  .command('list-records <domain>')
  .description('List DNS records for a domain')
  .action(async (domain) => {
    const service = initializeService();
    spinner.start('Fetching DNS records...');
    
    try {
      const records = await service.getDNSRecords(domain);
      spinner.succeed('DNS records retrieved successfully');
      console.table(records);
    } catch (error) {
      spinner.fail(`Failed to fetch DNS records: ${error.message}`);
    }
  });

program
  .command('add-record <domain>')
  .description('Add a DNS record to a domain')
  .requiredOption('-t, --type <type>', 'Record type (A, CNAME, TXT, etc.)')
  .requiredOption('-n, --name <name>', 'Record name')
  .requiredOption('-d, --data <data>', 'Record data')
  .option('--ttl <ttl>', 'Time to live in seconds', '3600')
  .action(async (domain, options) => {
    const service = initializeService();
    spinner.start('Adding DNS record...');
    
    try {
      await service.addDNSRecord(domain, {
        type: options.type,
        name: options.name,
        data: options.data,
        ttl: parseInt(options.ttl)
      });
      spinner.succeed('DNS record added successfully');
    } catch (error) {
      spinner.fail(`Failed to add DNS record: ${error.message}`);
    }
  });

program
  .command('update-records <domains>')
  .description('Update DNS records for multiple domains')
  .requiredOption('-t, --type <type>', 'Record type')
  .requiredOption('-n, --name <name>', 'Record name')
  .requiredOption('-d, --data <data>', 'Record data')
  .option('-f, --file <file>', 'File containing list of domains')
  .option('--ttl <ttl>', 'Time to live in seconds', '3600')
  .action(async (domains, options) => {
    const service = initializeService();
    
    try {
      const domainList = await parseDomains(domains, options);
      const total = domainList.length;
      let completed = 0;
      
      spinner.start(`Updating DNS records for ${total} domains...`);
      
      const record = {
        type: options.type,
        name: options.name,
        data: options.data,
        ttl: parseInt(options.ttl)
      };
      
      for (const domain of domainList) {
        try {
          await service.updateDNSRecord(domain, record);
          completed++;
          spinner.text = `Updated ${completed}/${total} domains`;
        } catch (error) {
          console.error(chalk.yellow(`Failed to update ${domain}: ${error.message}`));
        }
      }
      
      spinner.succeed(`Completed updating ${completed}/${total} domains`);
    } catch (error) {
      spinner.fail(`Operation failed: ${error.message}`);
    }
  });

program
  .command('verify <domains>')
  .description('Verify domain ownership')
  .option('-f, --file <file>', 'File containing list of domains')
  .action(async (domains, options) => {
    const service = initializeService();
    
    try {
      const domainList = await parseDomains(domains, options);
      const total = domainList.length;
      let verified = 0;
      
      spinner.start(`Verifying ${total} domains...`);
      
      for (const domain of domainList) {
        try {
          const isVerified = await service.verifyDomain(domain);
          if (isVerified) {
            verified++;
            console.log(chalk.green(`✓ ${domain} verified`));
          } else {
            console.log(chalk.yellow(`⚠ ${domain} not verified`));
          }
        } catch (error) {
          console.error(chalk.red(`✗ ${domain}: ${error.message}`));
        }
      }
      
      spinner.succeed(`Verification complete: ${verified}/${total} domains verified`);
    } catch (error) {
      spinner.fail(`Operation failed: ${error.message}`);
    }
  });

program
  .command('manage-records <domains>')
  .description('Manage DNS records in bulk')
  .option('-f, --file <file>', 'File containing list of domains')
  .option('--add', 'Add new records')
  .option('--update', 'Update existing records')
  .option('--delete', 'Delete records')
  .requiredOption('--records <file>', 'JSON file containing record definitions')
  .action(async (domains, options) => {
    const service = initializeService();
    
    try {
      const domainList = await parseDomains(domains, options);
      const recordsData = JSON.parse(await fs.readFile(options.records, 'utf-8'));
      
      spinner.start(`Processing DNS records for ${domainList.length} domains...`);
      
      const results = await service.bulkManageRecords(domainList, recordsData, {
        add: options.add,
        update: options.update,
        delete: options.delete
      });
      
      spinner.succeed('Bulk operation completed');
      console.table(results);
    } catch (error) {
      spinner.fail(`Operation failed: ${error.message}`);
    }
  });

// Error handling for invalid commands
program.on('command:*', () => {
  console.error(chalk.red('Invalid command.'));
  console.error(chalk.yellow('Use --help for a list of available commands.'));
  process.exit(1);
});

// Parse command line arguments
program.parse(process.argv);

// Show help if no arguments provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

