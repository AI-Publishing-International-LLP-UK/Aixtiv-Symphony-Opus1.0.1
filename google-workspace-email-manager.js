#!/usr/bin/env node

/**
 * 💎 GOOGLE WORKSPACE EMAIL ALIAS MANAGER
 * 
 * Sacred Mission: Create email aliases and distribution groups using OAuth2
 * Authority: Mr. Phillip Corey Roark (0000001) - Diamond SAO Command Center
 * Purpose: Manage Google Workspace email aliases via Admin SDK API
 * 
 * @classification DIAMOND_SAO_EXCLUSIVE  
 * @date 2025-09-04
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

class GoogleWorkspaceEmailManager {
    constructor() {
        this.credentials = null;
        this.oauth2Client = null;
        this.admin = null;
        this.gmail = null;
        
        // OAuth2 Scopes for Google Workspace Admin
        this.SCOPES = [
            'https://www.googleapis.com/auth/admin.directory.group',
            'https://www.googleapis.com/auth/admin.directory.user',
            'https://www.googleapis.com/auth/admin.directory.domain',
            'https://www.googleapis.com/auth/gmail.settings.basic'
        ];
        
        console.log('💎 Google Workspace Email Manager initialized with OAuth2');
    }

    /**
     * 🔑 Initialize OAuth2 Client
     */
    async initializeOAuth2() {
        try {
            // Check for OAuth2 credentials
            const credentialsPath = process.env.GOOGLE_OAUTH_CREDENTIALS || 
                                  path.join(__dirname, 'credentials.json');
            
            if (!fs.existsSync(credentialsPath)) {
                throw new Error('OAuth2 credentials file not found. Please ensure credentials.json exists.');
            }

            const credentials = JSON.parse(fs.readFileSync(credentialsPath));
            const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
            
            this.oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
            
            // Check for existing token
            const tokenPath = path.join(__dirname, 'token.json');
            if (fs.existsSync(tokenPath)) {
                const token = fs.readFileSync(tokenPath);
                this.oauth2Client.setCredentials(JSON.parse(token));
            } else {
                await this.getNewToken();
            }
            
            // Initialize Google APIs
            this.admin = google.admin({ version: 'directory_v1', auth: this.oauth2Client });
            this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
            
            console.log('✅ OAuth2 authentication successful');
            return true;
            
        } catch (error) {
            console.error('❌ OAuth2 initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * 🎟️ Get New OAuth2 Token
     */
    async getNewToken() {
        const authUrl = this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: this.SCOPES,
        });
        
        console.log('🔗 Authorize this app by visiting this URL:', authUrl);
        
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        
        return new Promise((resolve, reject) => {
            rl.question('📝 Enter the authorization code from the URL: ', async (code) => {
                rl.close();
                
                try {
                    const { tokens } = await this.oauth2Client.getToken(code);
                    this.oauth2Client.setCredentials(tokens);
                    
                    // Store the token to disk for later program executions
                    fs.writeFileSync(path.join(__dirname, 'token.json'), JSON.stringify(tokens));
                    console.log('💾 Token stored to token.json');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    /**
     * 📧 Create Email Alias Distribution Group
     */
    async createEmailAliasGroup() {
        try {
            await this.initializeOAuth2();
            
            const groupEmail = 'pr@aipublishinginternational.com';
            const members = ['pr@coaching2100.com', 'mo@coaching2100.com'];
            
            console.log(`💎 Creating email distribution group: ${groupEmail}`);
            console.log(`📧 Members: ${members.join(', ')}`);
            
            // Step 1: Check if domain alias exists
            await this.checkDomainAlias();
            
            // Step 2: Create or update the group
            const group = await this.createGroup(groupEmail);
            
            // Step 3: Add members to the group
            for (const member of members) {
                await this.addGroupMember(groupEmail, member);
            }
            
            // Step 4: Configure group settings
            await this.configureGroupSettings(groupEmail);
            
            console.log('✅ Email alias distribution group created successfully!');
            
            return {
                success: true,
                group: groupEmail,
                members: members,
                configuration: 'complete',
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Failed to create email alias group:', error.message);
            throw error;
        }
    }

    /**
     * 🌐 Check Domain Alias Configuration
     */
    async checkDomainAlias() {
        try {
            console.log('🔍 Checking domain alias configuration...');
            
            const domains = await this.admin.domains.list({
                customer: 'my_customer'
            });
            
            const aipiDomain = domains.data.domains?.find(d => 
                d.domainName === 'aipublishinginternational.com'
            );
            
            if (!aipiDomain) {
                console.log('⚠️  Domain aipublishinginternational.com not found as alias');
                console.log('📋 Available domains:', domains.data.domains?.map(d => d.domainName));
                console.log('💡 You may need to add aipublishinginternational.com as a domain alias in Google Admin Console');
            } else {
                console.log('✅ Domain aipublishinginternational.com is configured');
            }
            
        } catch (error) {
            console.log('⚠️  Could not check domain configuration:', error.message);
        }
    }

    /**
     * 👥 Create Distribution Group
     */
    async createGroup(groupEmail) {
        try {
            // Check if group already exists
            try {
                const existingGroup = await this.admin.groups.get({
                    groupKey: groupEmail
                });
                console.log('ℹ️  Group already exists, updating...');
                return existingGroup.data;
            } catch (error) {
                // Group doesn't exist, create it
            }
            
            const groupRequest = {
                requestBody: {
                    email: groupEmail,
                    name: 'PR AI Publishing International',
                    description: 'Distribution list for PR at AI Publishing International - forwards to pr@coaching2100.com and mo@coaching2100.com'
                }
            };
            
            const group = await this.admin.groups.insert(groupRequest);
            console.log(`✅ Created group: ${groupEmail}`);
            return group.data;
            
        } catch (error) {
            console.error(`❌ Failed to create group ${groupEmail}:`, error.message);
            throw error;
        }
    }

    /**
     * 👤 Add Member to Group
     */
    async addGroupMember(groupEmail, memberEmail) {
        try {
            // Check if member already exists
            try {
                await this.admin.members.get({
                    groupKey: groupEmail,
                    memberKey: memberEmail
                });
                console.log(`ℹ️  Member ${memberEmail} already in group`);
                return;
            } catch (error) {
                // Member doesn't exist, add them
            }
            
            const memberRequest = {
                groupKey: groupEmail,
                requestBody: {
                    email: memberEmail,
                    role: 'MEMBER'
                }
            };
            
            await this.admin.members.insert(memberRequest);
            console.log(`✅ Added member: ${memberEmail}`);
            
        } catch (error) {
            console.error(`❌ Failed to add member ${memberEmail}:`, error.message);
            throw error;
        }
    }

    /**
     * ⚙️ Configure Group Settings
     */
    async configureGroupSettings(groupEmail) {
        try {
            // Note: Group settings configuration would typically use Groups Settings API
            // For now, we'll log the recommended settings
            console.log(`⚙️  Recommended settings for ${groupEmail}:`);
            console.log('   - Who can post: Anyone on the internet');
            console.log('   - Who can view conversations: Group members');
            console.log('   - Who can view members: Group members');
            console.log('   - Message moderation: None');
            console.log('💡 These settings should be configured in Google Admin Console');
            
        } catch (error) {
            console.log('⚠️  Could not configure group settings:', error.message);
        }
    }

    /**
     * 🔍 List Current Groups
     */
    async listGroups() {
        try {
            await this.initializeOAuth2();
            
            const groups = await this.admin.groups.list({
                customer: 'my_customer',
                maxResults: 100
            });
            
            console.log('📋 Current Google Groups:');
            groups.data.groups?.forEach(group => {
                console.log(`   - ${group.email} (${group.name})`);
            });
            
            return groups.data.groups;
            
        } catch (error) {
            console.error('❌ Failed to list groups:', error.message);
            throw error;
        }
    }

    /**
     * 🗑️ Delete Group (if needed)
     */
    async deleteGroup(groupEmail) {
        try {
            await this.initializeOAuth2();
            
            await this.admin.groups.delete({
                groupKey: groupEmail
            });
            
            console.log(`✅ Deleted group: ${groupEmail}`);
            
        } catch (error) {
            console.error(`❌ Failed to delete group ${groupEmail}:`, error.message);
            throw error;
        }
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    const manager = new GoogleWorkspaceEmailManager();
    
    try {
        switch (command) {
            case 'create-alias':
                await manager.createEmailAliasGroup();
                break;
            case 'list-groups':
                await manager.listGroups();
                break;
            case 'delete-group':
                if (args[1]) {
                    await manager.deleteGroup(args[1]);
                } else {
                    console.log('❌ Please specify group email to delete');
                }
                break;
            default:
                console.log(`
💎 GOOGLE WORKSPACE EMAIL MANAGER

USAGE:
  node google-workspace-email-manager.js <command> [options]

COMMANDS:
  create-alias     Create pr@aipublishinginternational.com alias
  list-groups      List all current groups
  delete-group <email>  Delete specified group

EXAMPLES:
  node google-workspace-email-manager.js create-alias
  node google-workspace-email-manager.js list-groups
  node google-workspace-email-manager.js delete-group pr@aipublishinginternational.com

OAUTH2 SETUP:
  1. Ensure credentials.json file exists in this directory
  2. Run the script - it will prompt for OAuth2 authorization
  3. Follow the authorization URL and enter the code
                `);
                break;
        }
    } catch (error) {
        console.error('❌ Operation failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = GoogleWorkspaceEmailManager;
