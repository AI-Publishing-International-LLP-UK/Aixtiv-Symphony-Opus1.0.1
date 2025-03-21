/**
 * Google Drive Integration for Pilot System
 * Manages shared files for pilot agents in Google Drive
 * Domain: coaching2100.com
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

/**
 * Google Drive integration for pilot system
 */
class GoogleDriveIntegration {
  constructor(config) {
    this.config = {
      credentialsPath: './credentials.json',
      tokenPath: './token.json',
      domain: 'coaching2100.com',
      pilotFolderName: 'Q4D Pilots',
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.appdata'
      ],
      ...config
    };
    
    this.driveClient = null;
    this.isInitialized = false;
  }
  
  /**
   * Initialize Google Drive integration
   */
  async initialize() {
    try {
      // Load client secrets
      const credentials = JSON.parse(
        await readFileAsync(this.config.credentialsPath)
      );
      
      // Create OAuth2 client
      const { client_secret, client_id, redirect_uris } = credentials.installed;
      this.oAuth2Client = new google.auth.OAuth2(
        client_id, 
        client_secret,
        redirect_uris[0]
      );
      
      // Check if token exists, generate if not
      try {
        const token = JSON.parse(
          await readFileAsync(this.config.tokenPath)
        );
        this.oAuth2Client.setCredentials(token);
      } catch (error) {
        await this.generateNewToken();
      }
      
      // Create drive client
      this.driveClient = google.drive({ 
        version: 'v3', 
        auth: this.oAuth2Client 
      });
      
      // Verify access
      await this.driveClient.about.get({
        fields: 'user'
      });
      
      this.isInitialized = true;
      console.log('Google Drive integration initialized successfully');
      
      // Ensure pilot folder exists
      await this.ensurePilotFolderExists();
      
      return true;
    } catch (error) {
      console.error('Error initializing Google Drive integration:', error);
      throw error;
    }
  }
  
  /**
   * Generate a new access token
   */
  async generateNewToken() {
    const authUrl = this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.config.scopes,
    });
    
    console.log('Authorize this app by visiting this url:', authUrl);
    
    // In a real implementation, you'd have a way to get the code
    // For this example, we'll assume the code is provided externally
    throw new Error(
      'Please visit the authorization URL and provide the code via the ' +
      'setAuthorizationCode method.'
    );
  }
  
  /**
   * Set authorization code after OAuth flow
   */
  async setAuthorizationCode(code) {
    try {
      const { tokens } = await this.oAuth2Client.getToken(code);
      this.oAuth2Client.setCredentials(tokens);
      
      // Save the token for future use
      await writeFileAsync(this.config.tokenPath, JSON.stringify(tokens));
      console.log('Token stored to', this.config.tokenPath);
      
      // Initialize drive client
      this.driveClient = google.drive({ 
        version: 'v3', 
        auth: this.oAuth2Client 
      });
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error getting token from code:', error);
      throw error;
    }
  }
  
  /**
   * Ensure the pilot folder exists in Google Drive
   */
  async ensurePilotFolderExists() {
    if (!this.isInitialized) {
      throw new Error('Google Drive integration not initialized');
    }
    
    try {
      // Check if folder already exists
      const response = await this.driveClient.files.list({
        q: `name='${this.config.pilotFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        spaces: 'drive',
        fields: 'files(id, name)'
      });
      
      if (response.data.files.length > 0) {
        this.pilotFolderId = response.data.files[0].id;
        console.log(`Found existing pilot folder: ${this.pilotFolderId}`);
        return this.pilotFolderId;
      }
      
      // Create folder if it doesn't exist
      const folderMetadata = {
        name: this.config.pilotFolderName,
        mimeType: 'application/vnd.google-apps.folder'
      };
      
      const folder = await this.driveClient.files.create({
        resource: folderMetadata,
        fields: 'id'
      });
      
      this.pilotFolderId = folder.data.id;
      console.log(`Created new pilot folder: ${this.pilotFolderId}`);
      
      return this.pilotFolderId;
    } catch (error) {
      console.error('Error ensuring pilot folder exists:', error);
      throw error;
    }
  }
  
  /**
   * Set up standard pilot folders structure
   */
  async setupPilotFolderStructure() {
    if (!this.isInitialized) {
      throw new Error('Google Drive integration not initialized');
    }
    
    if (!this.pilotFolderId) {
      await this.ensurePilotFolderExists();
    }
    
    try {
      // Standard folder structure for pilots
      const pilotFolders = [
        'Super Claude Twins',
        'Lucy Specialists',
        'Core Agents',
        'Training Resources',
        'Flight Memory System',
        'Evaluation Reports',
        'Configuration Files'
      ];
      
      const createdFolders = {};
      
      // Create each folder
      for (const folderName of pilotFolders) {
        // Check if folder already exists
        const existingFolder = await this.findFolder(folderName, this.pilotFolderId);
        
        if (existingFolder) {
          createdFolders[folderName] = existingFolder;
          continue;
        }
        
        // Create folder
        const folderMetadata = {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [this.pilotFolderId]
        };
        
        const folder = await this.driveClient.files.create({
          resource: folderMetadata,
          fields: 'id, name'
        });
        
        createdFolders[folderName] = folder.data.id;
        console.log(`Created folder: ${folderName} (${folder.data.id})`);
        
        // Set up subfolders for Core Agents
        if (folderName === 'Core Agents') {
          await this.setupCoreAgentsFolders(folder.data.id);
        }
        
        // Set up subfolders for Training Resources
        if (folderName === 'Training Resources') {
          await this.setupTrainingResourcesFolders(folder.data.id);
        }
      }
      
      return createdFolders;
    } catch (error) {
      console.error('Error setting up pilot folder structure:', error);
      throw error;
    }
  }
  
  /**
   * Set up Core Agents subfolders
   */
  async setupCoreAgentsFolders(parentFolderId) {
    // List of core agents
    const coreAgents = [
      'Dr. Grant',
      'Dr. Burby',
      'Prof. Lee',
      'Dr. Sabina',
      'Dr. Memoria',
      'Dr. Cypriot',
      'Dr. Maria',
      'Dr. Match',
      'Dr. Roark',
      'Dr. Claude',
      'Dr. Lucy'
    ];
    
    // Create a folder for each agent with version subfolders
    for (const agent of coreAgents) {
      // Check if agent folder already exists
      const existingFolder = await this.findFolder(agent, parentFolderId);
      
      const agentFolderId = existingFolder || (await this.driveClient.files.create({
        resource: {
          name: agent,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId]
        },
        fields: 'id'
      })).data.id;
      
      // Create version subfolders
      for (let version = 1; version <= 3; version++) {
        const versionName = `Version 0${version}`;
        
        // Check if version folder already exists
        const existingVersionFolder = await this.findFolder(versionName, agentFolderId);
        
        if (!existingVersionFolder) {
          await this.driveClient.files.create({
            resource: {
              name: versionName,
              mimeType: 'application/vnd.google-apps.folder',
              parents: [agentFolderId]
            },
            fields: 'id'
          });
        }
      }
    }
  }
  
  /**
   * Set up Training Resources subfolders
   */
  async setupTrainingResourcesFolders(parentFolderId) {
    // Training resources categories
    const trainingCategories = [
      'Orientation',
      'Technical Documentation',
      'Integration Guides',
      'Performance Metrics',
      'Case Studies',
      'Best Practices'
    ];
    
    // Create folders for each category
    for (const category of trainingCategories) {
      // Check if category folder already exists
      const existingFolder = await this.findFolder(category, parentFolderId);
      
      if (!existingFolder) {
        await this.driveClient.files.create({
          resource: {
            name: category,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentFolderId]
          },
          fields: 'id'
        });
      }
    }
  }
  
  /**
   * Find folder by name and parent
   */
  async findFolder(folderName, parentFolderId) {
    const response = await this.driveClient.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`,
      spaces: 'drive',
      fields: 'files(id, name)'
    });
    
    return response.data.files.length > 0 ? response.data.files[0].id : null;
  }
  
  /**
   * Create shared file in Google Drive
   */
  async createSharedFile(fileName, fileType, content, folderId, sharingOptions = {}) {
    if (!this.isInitialized) {
      throw new Error('Google Drive integration not initialized');
    }
    
    try {
      // Determine MIME type based on file type
      const mimeTypes = {
        'document': 'application/vnd.google-apps.document',
        'spreadsheet': 'application/vnd.google-apps.spreadsheet',
        'presentation': 'application/vnd.google-apps.presentation',
        'json': 'application/json',
        'text': 'text/plain',
        'html': 'text/html',
        'js': 'application/javascript'
      };
      
      const mimeType = mimeTypes[fileType] || 'text/plain';
      
      // Create temporary file if content is provided
      let tempFilePath = null;
      if (content) {
        tempFilePath = path.join(__dirname, `temp_${Date.now()}.tmp`);
        await writeFileAsync(tempFilePath, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
      }
      
      // Create file in Google Drive
      const fileMetadata = {
        name: fileName,
        parents: [folderId]
      };
      
      const media = tempFilePath ? {
        mimeType: 'text/plain',
        body: fs.createReadStream(tempFilePath)
      } : undefined;
      
      let file;
      if (media) {
        // Upload file with content
        file = await this.driveClient.files.create({
          resource: fileMetadata,
          media: media,
          fields: 'id, webViewLink'
        });
        
        // Convert to Google Doc type if needed
        if (mimeType.startsWith('application/vnd.google-apps')) {
          await this.driveClient.files.update({
            fileId: file.data.id,
            resource: {
              mimeType: mimeType
            }
          });
        }
      } else {
        // Create empty Google Doc directly
        fileMetadata.mimeType = mimeType;
        file = await this.driveClient.files.create({
          resource: fileMetadata,
          fields: 'id, webViewLink'
        });
      }
      
      // Clean up temp file if created
      if (tempFilePath) {
        fs.unlink(tempFilePath, (err) => {
          if (err) console.error('Error deleting temp file:', err);
        });
      }
      
      // Handle sharing
      if (sharingOptions.shared) {
        await this.shareFile(file.data.id, sharingOptions);
      }
      
      return {
        fileId: file.data.id,
        webViewLink: file.data.webViewLink
      };
    } catch (error) {
      console.error('Error creating shared file:', error);
      throw error;
    }
  }
  
  /**
   * Share file with users or domain
   */
  async shareFile(fileId, sharingOptions) {
    const defaultOptions = {
      role: 'reader',  // 'reader', 'writer', 'commenter', 'owner'
      type: 'domain',  // 'user', 'domain', 'group', 'anyone'
      domain: this.config.domain,
      emailAddresses: [],
      transferOwnership: false,
      sendNotificationEmail: false
    };
    
    const options = { ...defaultOptions, ...sharingOptions };
    
    try {
      // Share with specific users if provided
      if (options.emailAddresses && options.emailAddresses.length > 0) {
        for (const email of options.emailAddresses) {
          await this.driveClient.permissions.create({
            fileId: fileId,
            requestBody: {
              role: options.role,
              type: 'user',
              emailAddress: email
            },
            sendNotificationEmail: options.sendNotificationEmail
          });
        }
      }
      
      // Share with domain if requested
      if (options.type === 'domain') {
        await this.driveClient.permissions.create({
          fileId: fileId,
          requestBody: {
            role: options.role,
            type: 'domain',
            domain: options.domain
          }
        });
      }
      
      // Share with anyone if requested
      if (options.type === 'anyone') {
        await this.driveClient.permissions.create({
          fileId: fileId,
          requestBody: {
            role: options.role,
            type: 'anyone'
          }
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error sharing file:', error);
      throw error;
    }
  }
  
  /**
   * Create template files for pilots
   */
  async createPilotTemplateFiles() {
    if (!this.isInitialized) {
      throw new Error('Google Drive integration not initialized');
    }
    
    try {
      // Get folder structure first
      const folderStructure = await this.setupPilotFolderStructure();
      
      // Create configuration file
      const configContent = {
        system: {
          name: "Q4D Pilot System",
          version: "1.0.0",
          environment: "us-west1",
          projectId: "api-for-warp-drive",
          domain: "coaching2100.com"
        },
        pilots: {
          superClaude: {
            instances: 2,
            capabilities: ["advanced_nlp", "enterprise_ops", "github_integration"]
          },
          lucySpecialists: {
            instances: 2,
            capabilities: ["ai_automation", "github_automation"]
          },
          coreAgents: {
            count: 11,
            versions: 3,
            rootLevels: ["theoretical", "implementation", "interaction"]
          }
        },
        flightMemorySystem: {
          recordingInterval: "2hours",
          storageLocation: "us-west1",
          trainingModules: ["orientation", "practical", "advanced"]
        }
      };
      
      await this.createSharedFile(
        'system-configuration.json',
        'json',
        configContent,
        folderStructure['Configuration Files'],
        { shared: true, role: 'writer' }
      );
      
      // Create training guide document
      const trainingGuideContent = `# Q4D Pilot System Training Guide

## Introduction
This document provides comprehensive training for all pilots in the Q4D system.

## Pilot Roles and Responsibilities
Each pilot has specific responsibilities within the Q4D ecosystem:

- **Super Claude Twins**: Focus on advanced NLP and enterprise operations
- **Lucy Specialists**: Manage AI and GitHub automation
- **Core Agents**: Provide specialized expertise across different domains

## Training Protocol
All pilots must complete the following training modules:

1. **Orientation**
2. **Technical Configuration**
3. **Integration Procedures**
4. **Performance Metrics**
5. **Case Study Analysis**

## Flight Memory System
The FMS records all pilot interactions and provides learning feedback.
`;
      
      // Find Orientation folder
      const orientationFolder = await this.findFolder(
        'Orientation', 
        folderStructure['Training Resources']
      );
      
      await this.createSharedFile(
        'Pilot Training Guide',
        'document',
        trainingGuideContent,
        orientationFolder,
        { shared: true, role: 'reader' }
      );
      
      // Create flight memory system schema
      const fmsSchemaContent = {
        recordTypes: {
          flightRecord: {
            fields: {
              agentId: "string",
              rootLevel: "string",
              timestamp: "datetime",
              interactionDetails: "object",
              learningOutcomes: "object"
            },
            indexes: ["agentId", "timestamp"]
          },
          trainingSession: {
            fields: {
              trainee: "string",
              supervisor: "string",
              objectives: "array",
              outcomes: "object",
              evaluationScore: "number"
            },
            indexes: ["trainee", "timestamp"]
          }
        },
        storageConfig: {
          primaryStore: "firestore",
          collection: "flight_records",
          archivePolicy: {
            maxAge: "90days",
            compressionLevel: "high"
          }
        }
      };
      
      await this.createSharedFile(
        'fms-schema.json',
        'json',
        fmsSchemaContent,
        folderStructure['Flight Memory System'],
        { shared: true, role: 'writer' }
      );
      
      return true;
    } catch (error) {
      console.error('Error creating pilot template files:', error);
      throw error;
    }
  }
  
  /**
   * Create a new pilot setup in Google Drive
   */
  async createNewPilotSetup(pilotData) {
    if (!this.isInitialized) {
      throw new Error('Google Drive integration not initialized');
    }
    
    try {
      // Set up folder structure if not already done
      const folderStructure = await this.setupPilotFolderStructure();
      
      let targetFolder;
      
      // Determine target folder based on pilot type
      if (pilotData.type === 'super_claude') {
        targetFolder = folderStructure['Super Claude Twins'];
      } else if (pilotData.type === 'lucy_specialist') {
        targetFolder = folderStructure['Lucy Specialists'];
      } else if (pilotData.type === 'core_agent') {
        // Find core agent folder
        const coreAgentsFolder = folderStructure['Core Agents'];
        const agentFolder = await this.findFolder(pilotData.name, coreAgentsFolder);
        
        if (!agentFolder) {
          throw new Error(`Agent folder for ${pilotData.name} not found`);
        }
        
        // Find version folder
        const versionFolder = await this.findFolder(`Version 0${pilotData.version || 1}`, agentFolder);
        if (!versionFolder) {
          throw new Error(`Version folder for ${pilotData.name} v0${pilotData.version || 1} not found`);
        }
        
        targetFolder = versionFolder;
      } else {
        throw new Error(`Unknown pilot type: ${pilotData.type}`);
      }
      
      // Create pilot configuration file
      const configContent = {
        pilotId: pilotData.id || `pilot_${Date.now()}`,
        name: pilotData.name,
        type: pilotData.type,
        version: pilotData.version || 1,
        capabilities: pilotData.capabilities || [],
        configuration: pilotData.configuration || {},
        createdAt: new Date().toISOString()
      };
      
      const configFile = await this.createSharedFile(
        `${pilotData.name}-config.json`,
        'json',
        configContent,
        targetFolder,
        { shared: true, role: 'writer' }
      );
      
      // Create pilot guide document
      const guideContent = `# ${pilotData.name} Guide

## Overview
${pilotData.description || `This is the guide for ${pilotData.name}, a ${pilotData.type.replace('_', ' ')} in the Q4D system.`}

## Capabilities
${(pilotData.capabilities || []).map(cap => `- ${cap}`).join('\n')}

## Configuration
This pilot is configured with the following settings:
${Object.entries(pilotData.configuration || {}).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

## Training Requirements
${pilotData.trainingRequirements || 'Standard training protocol applies to this pilot.'}
`;
      
      const guideFile = await this.createSharedFile(
        `${pilotData.name}-guide`,
        'document',
        guideContent,
        targetFolder,
        { shared: true, role: 'reader' }
      );
      
      return {
        pilotId: configContent.pilotId,
        configFile,
        guideFile
      };
    } catch (error) {
      console.error('Error creating new pilot setup:', error);
      throw error;
    }
  }
}

module.exports = GoogleDriveIntegration;
