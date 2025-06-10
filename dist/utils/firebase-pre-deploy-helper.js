#!/usr/bin/env node
const chalk = require('chalk').default; // Using default export for chalk
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  requiredDependencies: {
    'firebase-admin': '^11.0.0',
    'firebase-functions': '^4.0.0',
  },
  checkPaths: ['./firebase.json', './.firebaserc'],
  adminInitPattern: /admin\.initializeApp\(\)/,
};

console.log(chalk.blue('🔍 Firebase Pre-Deployment Helper Script'));
console.log(chalk.blue('======================================='));

// Check if we're in a Firebase project root
function checkFirebaseProject() {
  console.log(chalk.yellow('\n📁 Checking Firebase project structure...'));

  let allFilesExist = true;

  CONFIG.checkPaths.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      console.log(chalk.green(`✅ Found ${filePath}`));
    } else {
      console.log(chalk.red(`❌ Missing ${filePath}`));
      allFilesExist = false;
    }
  });

  if (!allFilesExist) {
    console.log(
      chalk.red(
        '\n⚠️ Some required Firebase files are missing. Make sure you are in the root of your Firebase project.'
      )
    );
    return false;
  }

  return true;
}

// Get the Firebase project ID
function getProjectId() {
  try {
    const rcContent = fs.readFileSync('./.firebaserc', 'utf8');
    const rcJson = JSON.parse(rcContent);
    const projectId = rcJson.projects.default;

    if (projectId) {
      console.log(chalk.green(`\n🔑 Firebase Project ID: ${projectId}`));
      return projectId;
    } else {
      console.log(chalk.red('\n⚠️ No default project found in .firebaserc'));
      return null;
    }
  } catch (error) {
    console.log(chalk.red(`\n⚠️ Error reading .firebaserc: ${error.message}`));
    return null;
  }
}

// Check and fix Firebase Admin initialization
function checkAndFixAdminInitialization() {
  console.log(chalk.yellow('\n🔄 Checking Firebase Admin initialization...'));

  const functionsIndexPath = './functions/index.js';

  if (!fs.existsSync(functionsIndexPath)) {
    console.log(
      chalk.red(`❌ Functions index file not found at ${functionsIndexPath}`)
    );
    return false;
  }

  let content = fs.readFileSync(functionsIndexPath, 'utf8');

  // Check if firebase-admin is imported
  if (
    !content.includes('firebase-admin') &&
    !content.includes('firebase admin')
  ) {
    console.log(chalk.red('❌ Firebase Admin import not found'));

    // Add the import at the top of the file
    const adminImport = "const admin = require('firebase-admin');\n";
    content = adminImport + content;
    console.log(chalk.green('✅ Added Firebase Admin import'));
  } else {
    console.log(chalk.green('✅ Firebase Admin import found'));
  }

  // Check if initializeApp is called
  if (!CONFIG.adminInitPattern.test(content)) {
    console.log(chalk.red('❌ Firebase Admin initializeApp() call not found'));

    // Find the best place to add initialization (after imports, before exports)
    const lines = content.split('\n');
    let lastImportIndex = -1;
    let firstExportIndex = lines.length;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('require(') || lines[i].includes('import ')) {
        lastImportIndex = i;
      }
      if (
        lines[i].includes('exports.') ||
        lines[i].includes('module.exports')
      ) {
        firstExportIndex = i;
        break;
      }
    }

    const insertIndex = lastImportIndex + 1;
    const adminInit =
      '\n// Initialize Firebase Admin\nadmin.initializeApp();\n';

    lines.splice(insertIndex, 0, adminInit);
    content = lines.join('\n');

    console.log(chalk.green('✅ Added Firebase Admin initialization'));
  } else {
    console.log(chalk.green('✅ Firebase Admin initializeApp() call found'));
  }

  // Write the updated content back to the file
  fs.writeFileSync(functionsIndexPath, content, 'utf8');

  return true;
}

// Check and update dependencies in package.json
function checkAndUpdateDependencies() {
  console.log(chalk.yellow('\n📦 Checking Firebase dependencies...'));

  const packageJsonPath = './functions/package.json';

  if (!fs.existsSync(packageJsonPath)) {
    console.log(chalk.red(`❌ Package.json not found at ${packageJsonPath}`));
    return false;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    let needsUpdate = false;

    Object.entries(CONFIG.requiredDependencies).forEach(([dep, version]) => {
      if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
        console.log(chalk.red(`❌ Missing dependency: ${dep}`));
        if (!packageJson.dependencies) packageJson.dependencies = {};
        packageJson.dependencies[dep] = version;
        needsUpdate = true;
      } else if (
        packageJson.dependencies[dep].startsWith('^1') ||
        packageJson.dependencies[dep].startsWith('^2') ||
        packageJson.dependencies[dep].startsWith('^3')
      ) {
        console.log(
          chalk.yellow(
            `⚠️ Outdated dependency: ${dep} (${packageJson.dependencies[dep]})`
          )
        );
        packageJson.dependencies[dep] = version;
        needsUpdate = true;
      } else {
        console.log(chalk.green(`✅ Dependency ${dep} is up to date`));
      }
    });

    if (needsUpdate) {
      fs.writeFileSync(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2),
        'utf8'
      );
      console.log(
        chalk.green('\n✅ Updated package.json with required dependencies')
      );

      console.log(chalk.yellow('\n🔄 Installing updated dependencies...'));
      try {
        execSync('cd functions && npm install', { stdio: 'inherit' });
        console.log(chalk.green('✅ Dependencies installed successfully'));
      } catch (error) {
        console.log(
          chalk.red(`❌ Error installing dependencies: ${error.message}`)
        );
        return false;
      }
    }

    return true;
  } catch (error) {
    console.log(chalk.red(`❌ Error parsing package.json: ${error.message}`));
    return false;
  }
}

// Check Firebase configuration
function checkFirebaseConfig() {
  console.log(chalk.yellow('\n🔧 Checking Firebase configuration...'));

  const firebaseJsonPath = './firebase.json';

  if (!fs.existsSync(firebaseJsonPath)) {
    console.log(
      chalk.red(`❌ Firebase configuration not found at ${firebaseJsonPath}`)
    );
    return false;
  }

  try {
    const firebaseConfig = JSON.parse(
      fs.readFileSync(firebaseJsonPath, 'utf8')
    );

    if (!firebaseConfig.functions) {
      console.log(
        chalk.red('❌ Functions configuration missing in firebase.json')
      );
      return false;
    }

    console.log(chalk.green('✅ Firebase configuration looks good'));
    return true;
  } catch (error) {
    console.log(chalk.red(`❌ Error parsing firebase.json: ${error.message}`));
    return false;
  }
}

// Perform pre-deployment validation
function validateDeployment() {
  console.log(chalk.yellow('\n🧪 Validating Firebase deployment...'));

  try {
    console.log(
      chalk.blue(
        'Running Firebase functions:config:get to check credentials...'
      )
    );
    execSync('firebase functions:config:get', { stdio: 'pipe' });
    console.log(chalk.green('✅ Firebase credentials validated'));

    return true;
  } catch (error) {
    console.log(
      chalk.red(
        `❌ Firebase credentials validation failed. You may need to run 'firebase login' first.`
      )
    );
    return false;
  }
}

// Main function
function main() {
  let success = true;

  if (!checkFirebaseProject()) success = false;

  const projectId = getProjectId();
  if (!projectId) success = false;

  if (!checkAndFixAdminInitialization()) success = false;

  if (!checkAndUpdateDependencies()) success = false;

  if (!checkFirebaseConfig()) success = false;

  if (success && validateDeployment()) {
    console.log(
      chalk.green('\n✅ Firebase project is aligned and ready for deployment!')
    );
    console.log(chalk.blue('\nRun the following command to deploy:'));
    console.log(chalk.cyan('  firebase deploy'));
  } else {
    console.log(
      chalk.red('\n⚠️ Some issues need to be resolved before deployment.')
    );
    console.log(
      chalk.yellow('Fix the issues above and run this script again.')
    );
  }
}

main();
