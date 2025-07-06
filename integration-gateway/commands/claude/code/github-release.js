const { spawn, execSync } = require('child_process');
const fetch = require('node-fetch');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { parseOptions, withSpinner, displayResult } = require('../../../lib/utils');
const { logAgentAction, getCurrentAgentId } = require('../../../lib/agent-tracking');
const { debugDisplay } = require('../../../lib/debug-display');
const telemetry = require('../../../lib/telemetry');
const generateCode = require('./generate');

// AIXTIV SYMPHONY vision statement for alignment with ASOOS principles
const AIXTIV_SYMPHONY_VISION = `AIXTIV SYMPHONY ORCHESTRATING OPERATING SYSTEM - The Definitive Architecture & Vision Statement

ASOOS defines a new technology category with OS of ASOOS referring to the first AI-Human focused OS. A smart Operating System designed to accelerate AI-Human-Synchronization. The acceleration increases AI-Human Synchronosity (AI-H-SYN) through an array of methods that involves the overall authentication process, professional skills, experience, and deep behavioral research modeling for a highly reliable outcome that forms the foundation of many key functions of the innovative OS, ASOOS.`;

/**
 * Check if github-release CLI is installed
 * @returns {boolean} True if installed, false otherwise
 */
function isGitHubReleaseCLIInstalled() {
  try {
    execSync('github-release --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Execute a command and return the result
 * @param {string} command - Command to execute
 * @param {string[]} args - Command arguments
 * @param {Object} options - Spawn options
 * @returns {Promise<Object>} Command execution result
 */
function executeCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
      if (options.debug) {
        debugDisplay.addLine('command-output', data.toString());
      }
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
      if (options.debug) {
        debugDisplay.addLine('command-error', data.toString());
      }
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, stdout, stderr });
      } else {
        resolve({ success: false, stdout, stderr, code });
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Create a GitHub release using the github-release CLI
 * @param {Object} options - Release options
 * @returns {Promise<Object>} Release result
 */
async function createGitHubRelease(options) {
  const { tag, title, descriptionFile, assets, repo, owner, debug } = options;
  
  // Validate required options
  if (!tag) {
    throw new Error('Tag is required for GitHub release');
  }
  
  // Check if github-release CLI is installed
  const cliInstalled = isGitHubReleaseCLIInstalled();
  
  if (!cliInstalled) {
    console.warn(chalk.yellow('\nWARNING: github-release CLI not found. Using API fallback mode.'));
    return createGitHubReleaseAPI(options);
  }
  
  // Build command arguments
  const args = ['release'];
  
  // Add required tag
  args.push('--tag', tag);
  
  // Add optional title
  if (title) {
    args.push('--name', title);
  }
  
  // Add optional description from file
  if (descriptionFile && fs.existsSync(descriptionFile)) {
    const description = fs.readFileSync(descriptionFile, 'utf8');
    args.push('--description', description);
  }
  
  // Add owner/repo if specified
  if (owner && repo) {
    args.push('--user', owner);
    args.push('--repo', repo);
  }
  
  // Execute github-release command
  try {
    const result = await executeCommand('github-release', args, { debug });
    
    if (!result.success) {
      throw new Error(`Failed to create GitHub release: ${result.stderr}`);
    }
    
    // Upload assets if specified
    if (assets && assets.length > 0) {
      for (const asset of assets) {
        if (!fs.existsSync(asset.path)) {
          console.warn(chalk.yellow(`WARNING: Asset file not found: ${asset.path}`));
          continue;
        }
        
        const uploadArgs = ['upload', '--tag', tag, '--name', asset.name || path.basename(asset.path), '--file', asset.path];
        
        if (owner && repo) {
          uploadArgs.push('--user', owner);
          uploadArgs.push('--repo', repo);
        }
        
        const uploadResult = await executeCommand('github-release', uploadArgs, { debug });
        
        if (!uploadResult.success) {
          console.warn(chalk.yellow(`WARNING: Failed to upload asset ${asset.path}: ${uploadResult.stderr}`));
        }
      }
    }
    
    return { success: true, message: 'GitHub release created successfully', tag, cliMode: true };
  } catch (error) {
    console.warn(chalk.yellow(`\nWARNING: CLI command failed: ${error.message}. Falling back to API mode.`));
    return createGitHubReleaseAPI(options);
  }
}

/**
 * Create a GitHub release using the GitHub API (fallback mode)
 * @param {Object} options - Release options
 * @returns {Promise<Object>} Release result
 */
async function createGitHubReleaseAPI(options) {
  const { tag, title, descriptionFile, assets, repo, owner, debug } = options;
  
  // Validate required options
  if (!tag) {
    throw new Error('Tag is required for GitHub release');
  }
  
  // Get GitHub token from environment
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    throw new Error('GitHub token not found. Set GITHUB_TOKEN or GH_TOKEN environment variable.');
  }
  
  // Determine owner and repo
  const repoOwner = owner || process.env.GITHUB_REPOSITORY_OWNER;
  const repoName = repo || process.env.GITHUB_REPOSITORY;
  
  if (!repoOwner || !repoName) {
    throw new Error('Repository owner and name are required. Specify them or set GITHUB_REPOSITORY_OWNER and GITHUB_REPOSITORY environment variables.');
  }
  
  // Prepare release data
  const releaseData = {
    tag_name: tag,
    name: title || tag,
    draft: false,
    prerelease: false
  };
  
  // Add description from file if specified
  if (descriptionFile && fs.existsSync(descriptionFile)) {
    releaseData.body = fs.readFileSync(descriptionFile, 'utf8');
  }
  
  // Create an agent that ignores SSL certificate validation
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
  });
  
  try {
    // Create release
    if (debug) {
      debugDisplay.addLine('api-request', `Creating GitHub release for tag ${tag}`);
    }
    
    const releaseUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases`;
    const releaseResponse = await fetch(releaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AIXTIV-Symphony-Integration-Gateway'
      },
      body: JSON.stringify(releaseData),
      agent: httpsAgent,
      timeout: 15000
    });
    
    if (!releaseResponse.ok) {
      const errorBody = await releaseResponse.text();
      throw new Error(`GitHub API responded with status ${releaseResponse.status}: ${errorBody}`);
    }
    
    const release = await releaseResponse.json();
    
    // Upload assets if specified
    if (assets && assets.length > 0) {
      for (const asset of assets) {
        if (!fs.existsSync(asset.path)) {
          console.warn(chalk.yellow(`WARNING: Asset file not found: ${asset.path}`));
          continue;
        }
        
        const assetName = asset.name || path.basename(asset.path);
        const uploadUrl = release.upload_url.replace('{?name,label}', `?name=${encodeURIComponent(assetName)}`);
        
        if (debug) {
          debugDisplay.addLine('api-request', `Uploading asset ${assetName} to ${uploadUrl}`);
        }
        
        const fileContent = fs.readFileSync(asset.path);
        const contentType = asset.contentType || 'application/octet-stream';
        
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': contentType,
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'AIXTIV-Symphony-Integration-Gateway',
            'Content-Length': fileContent.length
          },
          body: fileContent,
          agent: httpsAgent,
          timeout: 30000
        });
        
        if (!uploadResponse.ok) {
          const errorBody = await uploadResponse.text();
          console.warn(chalk.yellow(`WARNING: Failed to upload asset ${assetName}: ${errorBody}`));
        }
      }
    }
    
    return { success: true, message: 'GitHub release created successfully via API', tag, cliMode: false, releaseUrl: release.html_url };
  } catch (error) {
    throw new Error(`Failed to create GitHub release via API: ${error.message}`);
  }
}

/**
 * Generate code and create a GitHub release
 * @param {Object} options - Command options
 */
module.exports = async function githubRelease(options) {
  // Record knowledge access for telemetry
  telemetry.recordKnowledgeAccess('ai-model');
  telemetry.recordKnowledgeAccess('github-release');
  
  // Capture internal reasoning
  const internalThought = `Processing githubRelease command with parameters: ${JSON.stringify(options)}`;
  
  // Parse options
  const { 
    task, 
    language, 
    outputFile, 
    context,
    tag,
    title,
    descriptionFile,
    repo,
    owner,
    assets: assetPaths,
    debug
  } = parseOptions(options);
  
  // Log the GitHub release request with agent attribution
  logAgentAction('github_release_request', {
    task,
    language: language || 'javascript',
    has_context: !!context,
    tag,
    agent_id: getCurrentAgentId(),
  });
  
  try {
    // Step 1: Generate code first if task is specified
    let generatedCode = null;
    let generatedOutputFile = outputFile;
    
    if (task) {
      console.log(chalk.blue('Step 1/2: Generating code...'));
      
      // Call the code generation function
      await generateCode({
        ...options,
        // Override the outputFile to ensure it's saved
        outputFile: outputFile || `generated-${Date.now()}.${language || 'js'}`
      });
      
      // Set the generated output file for the release
      generatedOutputFile = outputFile || `generated-${Date.now()}.${language || 'js'}`;
      
      console.log(chalk.green('✓ Code generated successfully!'));
    }
    
    // Step 2: Create GitHub release
    console.log(chalk.blue('Step 2/2: Creating GitHub release...'));
    
    // Prepare assets
    let assets = [];
    
    // Add generated code file if available
    if (generatedOutputFile && fs.existsSync(generatedOutputFile)) {
      assets.push({
        path: generatedOutputFile,
        name: path.basename(generatedOutputFile)
      });
    }
    
    // Add additional assets if specified
    if (assetPaths) {
      const additionalAssets = assetPaths.split(',').map(assetPath => ({
        path: assetPath.trim(),
        name: path.basename(assetPath.trim())
      }));
      
      assets = [...assets, ...additionalAssets];
    }
    
    // Execute GitHub release with spinner
    const result = await withSpinner(
      `Creating GitHub release for tag ${chalk.cyan(tag)}`,
      async () => {
        try {
          return await createGitHubRelease({
            tag,
            title,
            descriptionFile,
            assets,
            repo,
            owner,
            debug
          });
        } catch (error) {
          throw new Error(`Failed to create GitHub release: ${error.message}`);
        }
      }
    );
    
    // Log the result with agent attribution
    logAgentAction('github_release_result', {
      success: result.success,
      tag,
      assets_count: assets.length,
      cli_mode: result.cliMode,
      agent_id: getCurrentAgentId(),
    });
    
    // Display result
    displayResult({
      success: result.success,
      message: result.message || `GitHub release ${result.success ? 'successfully created' : 'failed'}`,
      details: {
        tag,
        release_mode: result.cliMode ? 'cli' : 'api',
        assets: assets.map(a => a.name),
        performed_by: getCurrentAgentId(),
      },
    });
    
    if (result.success) {
      console.log(chalk.bold('\nGitHub Release Details:'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`Tag: ${chalk.cyan(tag)}`);
      console.log(`Title: ${chalk.cyan(title || tag)}`);
      
      if (assets.length > 0) {
        console.log(`\nAssets:`);
        assets.forEach(asset => {
          console.log(`  - ${chalk.yellow(asset.name)}`);
        });
      }
      
      if (result.releaseUrl) {
        console.log(`\nRelease URL: ${chalk.blue(result.releaseUrl)}`);
      }
      
      console.log(chalk.gray('─'.repeat(50)));
    }
  } catch (error) {
    console.error(chalk.red('\nGitHub release process failed:'), error.message);
    
    // Log error with agent attribution
    logAgentAction('github_release_error', {
      error: error.message,
      tag,
      agent_id: getCurrentAgentId(),
    });
    
    // Show more helpful error information
    if (error.message.includes('ENOENT') && error.message.includes('github-release')) {
      console.error(chalk.yellow('\nTroubleshooting tips:'));
      console.error('1. Make sure github-release CLI is installed correctly');
      console.error('2. Verify it\'s in your PATH by running: github-release --version');
      console.error('3. If you prefer to use the API mode only, set GITHUB_TOKEN environment variable');
    } else if (error.message.includes('GitHub token not found')) {
      console.error(chalk.yellow('\nTroubleshooting tips:'));
      console.error('1. Set the GITHUB_TOKEN or GH_TOKEN environment variable');
      console.error('   Example: export GITHUB_TOKEN=your_github_personal_access_token');
      console.error('2. Ensure the token has the "repo" scope for private repositories');
    }
  }
};
