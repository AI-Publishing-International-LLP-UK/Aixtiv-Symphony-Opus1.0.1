import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import fs from 'fs-extra';
import logger from './logger.js';
import { GodaddyAPI } from './api.js';

class GodaddyCommander {
  constructor() {
    this.program = new Command();
    this.api = null;
    this.spinner = ora();
    this.setupProgram();
    this.setupCommands();
  }

  setupProgram() {
    this.program
      .name('godaddy')
      .description('CLI tool for managing GoDaddy domains and DNS records')
      .version('1.0.0');
  }

  async initialize() {
    dotenv.config();
    this.api = new GodaddyAPI({
      apiKey: process.env.GODADDY_API_KEY,
      apiSecret: process.env.GODADDY_API_SECRET
    });
  }

  setupCommands() {
    this.setupDnsCommands();
    this.setupDomainCommands();
    this.setupVerifyCommand();
  }

  setupDnsCommands() {
    this.program
      .command('dns:update')
      .description('Update DNS records for a domain')
      .option('-d, --domain <domain>', 'Domain name')
      .option('-t, --type <type>', 'Record type (A, CNAME, TXT, etc.)')
      .option('-n, --name <name>', 'Record name (@, www, etc.)')
      .option('-v, --value <value>', 'Record value')
      .option('-f, --file <file>', 'File containing domain records to update')
      .action(async (options) => {
        try {
          if (!options.domain && !options.file) {
            const answers = await inquirer.prompt([
              {
                type: 'input',
                name: 'domain',
                message: 'Enter the domain name:',
                validate: input => input.length > 0
              },
              {
                type: 'list',
                name: 'type',
                message: 'Select the record type:',
                choices: ['A', 'CNAME', 'TXT', 'MX', 'NS']
              },
              {
                type: 'input',
                name: 'name',
                message: 'Enter the record name (@, www, etc.):',
                validate: input => input.length > 0
              },
              {
                type: 'input',
                name: 'value',
                message: 'Enter the record value:',
                validate: input => input.length > 0
              }
            ]);
            Object.assign(options, answers);
          }

          this.spinner.start('Updating DNS records...');
          await this.api.updateDNSRecord(options);
          this.spinner.succeed('DNS records updated successfully');
        } catch (error) {
          this.spinner.fail('Failed to update DNS records');
          logger.error(error.message);
        }
      });
  }

  setupDomainCommands() {
    this.program
      .command('domain:list')
      .description('List all domains')
      .action(async () => {
        try {
          this.spinner.start('Retrieving domains...');
          const domains = await this.api.listDomains();
          this.spinner.succeed('Domains retrieved successfully');
          console.table(domains);
        } catch (error) {
          this.spinner.fail('Failed to retrieve domains');
          logger.error(error.message);
        }
      });
  }

  setupVerifyCommand() {
    this.program
      .command('verify')
      .description('Verify domain ownership')
      .requiredOption('-d, --domain <domain>', 'Domain to verify')
      .action(async (options) => {
        try {
          this.spinner.start('Verifying domain ownership...');
          const result = await this.api.verifyDomain(options.domain);
          this.spinner.succeed('Domain verification complete');
          console.log(chalk.green('Verification status:'), result.status);
        } catch (error) {
          this.spinner.fail('Domain verification failed');
          logger.error(error.message);
        }
      });
  }

  async run() {
    await this.initialize();
    this.program.parse();
  }
}

export default GodaddyCommander;
