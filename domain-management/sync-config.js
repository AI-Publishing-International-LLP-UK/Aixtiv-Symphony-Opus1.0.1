#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const BASE_CONFIG_PATH = path.join(__dirname, 'base-package.json');
const PROJECTS = ['domain-management', 'integration-gateway'];

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function mergeConfigs(baseConfig, projectConfig) {
  return {
    ...projectConfig,
    scripts: {
      ...baseConfig.scripts,
      ...projectConfig.scripts
    },
    engines: baseConfig.engines,
    devDependencies: {
      ...baseConfig.devDependencies,
      ...projectConfig.devDependencies
    }
  };
}

function backupConfig(filePath) {
  const backupPath = `${filePath}.backup`;
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log(`Backup created: ${backupPath}`);
  }
}

function syncProject(projectName) {
  const baseConfig = readJSON(BASE_CONFIG_PATH);
  const projectPath = path.join(__dirname, '..', projectName);
  const packagePath = path.join(projectPath, 'package.json');

  try {
    // Create backup
    backupConfig(packagePath);

    // Read existing config or use base config as starting point
    let projectConfig = fs.existsSync(packagePath)
      ? readJSON(packagePath)
      : { name: projectName, version: "1.0.0" };

    // Merge configurations
    const newConfig = mergeConfigs(baseConfig, projectConfig);

    // Write updated config
    writeJSON(packagePath, newConfig);
    console.log(`Updated ${projectName}/package.json`);

    // Create test directories if they don't exist
    const testDirs = [
      path.join(projectPath, 'tests'),
      path.join(projectPath, 'tests', 'postman'),
      path.join(projectPath, 'tests', 'unit')
    ];

    testDirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    });

  } catch (error) {
    console.error(`Error processing ${projectName}:`, error);
  }
}

// Execute sync for all projects
PROJECTS.forEach(syncProject);
console.log('Configuration sync completed!');
