#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
// Shared development dependencies that should be consistent across projects
const sharedDevDependencies = {
  "@types/jest": "^29.5.11",
  "@types/node": "^20.10.5",
  "@typescript-eslint/eslint-plugin": "^6.15.0",
  "@typescript-eslint/parser": "^6.15.0",
  "eslint": "^8.56.0",
  "jest": "^29.7.0",
  "rimraf": "^5.0.5",
  "ts-jest": "^29.1.1",
  "ts-node": "^10.9.2",
  "typescript": "^5.3.3"
};

// Shared Jest configuration
const sharedJestConfig = {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "moduleFileExtensions": ["ts", "js", "json"],
  "transform": {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  "coverageDirectory": "coverage"
};

// Shared script commands
const sharedScripts = {
  "build": "tsc",
  "clean": "rimraf dist",
  "lint": "eslint . --ext .ts,.js",
  "test": "jest"
};

function updatePackageJson(projectPath) {
  const pkgPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.warn(`No package.json found in ${projectPath}`);
    return;
  }

  const pkg = require(pkgPath);
  
  // Update devDependencies while preserving project-specific ones
  pkg.devDependencies = {
    ...pkg.devDependencies,
    ...sharedDevDependencies
  };

  // Update Jest config while preserving project-specific settings
  pkg.jest = {
    ...sharedJestConfig,
    ...pkg.jest,
    testMatch: [
      "**/tests/**/*.test.(ts|js)",
      ...(pkg.jest?.testMatch || [])
    ]
  };

  // Update scripts while preserving project-specific ones
  pkg.scripts = {
    ...pkg.scripts,
    ...sharedScripts
  };

  // Write updated package.json
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Updated ${pkgPath}`);
}

/**
 * Synchronizes build files from the build directory to the integration-gateway directory
 * @param {string} sourceBuildDir - Path to the source build directory
 * @param {string} targetDir - Path to the target integration-gateway directory
 */
function syncBuildFiles(sourceBuildDir, targetDir) {
  console.log('\nSynchronizing build files...');
  
  // Define build files to sync
  const buildFiles = [
    'scripts-day1-integration-gateway-config.sh',
    'scripts-day1-integration-gateway-validation.sh',
    'deployment-config-day1-integration-gateway-config.sh',
    'deployment-config-day1-integration-gateway-validation.sh'
  ];
  
  // Create config directory if it doesn't exist
  const configDir = path.join(targetDir, 'config');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    console.log(`Created directory: ${configDir}`);
  }
  
  // Copy each build file to the config directory
  buildFiles.forEach(file => {
    const sourcePath = path.join(sourceBuildDir, file);
    const targetPath = path.join(configDir, file);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`Synced file: ${file}`);
      
      // Make shell scripts executable
      if (file.endsWith('.sh')) {
        fs.chmodSync(targetPath, '755');
        console.log(`Made executable: ${file}`);
      }
    } else {
      console.warn(`Source file not found: ${sourcePath}`);
    }
  });
  
  // Sync deployment files from the deployments/integration-gateway directory
  const sourceDeploymentDir = path.join(sourceBuildDir, 'deployments/integration-gateway');
  const targetDeploymentDir = path.join(targetDir, 'deployments');
  
  if (fs.existsSync(sourceDeploymentDir)) {
    // Create target deployment directory if it doesn't exist
    if (!fs.existsSync(targetDeploymentDir)) {
      fs.mkdirSync(targetDeploymentDir, { recursive: true });
      console.log(`Created directory: ${targetDeploymentDir}`);
    }
    
    // Copy deployment files
    const deploymentFiles = [
      'day1-integration-gateway-validation.sh',
      'day1-integration-gateway-config.sh'
    ];
    
    deploymentFiles.forEach(file => {
      const sourcePath = path.join(sourceDeploymentDir, file);
      const targetPath = path.join(targetDeploymentDir, file);
      
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`Synced deployment file: ${file}`);
        
        // Make shell scripts executable
        fs.chmodSync(targetPath, '755');
        console.log(`Made executable: ${file}`);
      } else {
        console.warn(`Source deployment file not found: ${sourcePath}`);
      }
    });
  } else {
    console.warn(`Source deployment directory not found: ${sourceDeploymentDir}`);
  }
}

/**
 * Synchronizes changes with GitHub repository
 * @param {string} projectDir - Path to the project directory
 */
function syncWithGitHub(projectDir) {
  console.log('\nSynchronizing with GitHub...');
  
  try {
    // Check if the directory is a git repository
    const isGitRepo = fs.existsSync(path.join(projectDir, '.git'));
    
    if (!isGitRepo) {
      console.warn(`Not a git repository: ${projectDir}`);
      return;
    }
    
    // Get current directory
    const currentDir = process.cwd();
    
    // Change to project directory
    process.chdir(projectDir);
    
    // Check if there are changes to commit
    const status = execSync('git status --porcelain').toString();
    
    if (status.trim() === '') {
      console.log('No changes to commit');
    } else {
      console.log('Changes detected, syncing with GitHub...');
      
      // Add all changes
      execSync('git add .', { stdio: 'inherit' });
      console.log('Added changes to staging');
      
      // Commit changes with meaningful message
      const commitMessage = 'Update integration gateway configuration and sync build files';
      execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
      console.log('Committed changes');
      
      // Check if remote is configured before pushing
      const remotes = execSync('git remote -v').toString().trim();
      if (remotes) {
        // Push to GitHub
        console.log('Pushing changes to remote repository...');
        execSync('git push', { stdio: 'inherit' });
        console.log('Pushed changes to GitHub repository');
      } else {
        console.log('No remote repository configured. Skipping push operation.');
        console.log('To add a remote, use: git remote add origin YOUR_REPO_URL');
      }
    }
    
    // Return to original directory
    process.chdir(currentDir);
  } catch (error) {
    console.error('Error syncing with GitHub:', error.message);
  }
}

// Main execution
const projectsRoot = path.resolve(__dirname, '..');
const domainManagementPath = path.join('/Users/as/asoos', 'domain-management');
const projects = ['domain-management'];

projects.forEach(project => {
  let projectPath;
  if (project === 'domain-management') {
    projectPath = domainManagementPath;
  } else {
    projectPath = path.join(projectsRoot, project);
  }
  
  if (fs.existsSync(projectPath)) {
    updatePackageJson(projectPath);
  } else {
    console.warn(`Project directory not found: ${projectPath}`);
  }
});

console.log('Package.json configuration sync complete!');

// Define paths for build file synchronization
const buildDir = '/Users/as/asoos/build';
const integrationGatewayDir = path.resolve(__dirname, '..');

// Sync build files
syncBuildFiles(buildDir, integrationGatewayDir);

// GitHub synchronization is available since we've initialized the git repository
syncWithGitHub('/Users/as/asoos/integration-gateway');

console.log('\nAll synchronization tasks completed successfully!');
