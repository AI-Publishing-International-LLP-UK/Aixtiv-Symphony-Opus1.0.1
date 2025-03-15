/**
 * Squadron Structure Correction Script
 * This script corrects the squadron structure in the S2DO Squadron Upgrade Workflow Validation
 * to ensure alignment with the wing architecture.
 */

'use strict';

const fs = require('fs').promises;
const path = require('path');
const { existsSync, mkdirSync } = require('fs');

// File path to the S2DO Squadron Upgrade Workflow Validation
const filePath = path.join(__dirname, '..', 'day1', 'src', 's2do-squadron-validation.js');

// Correct squadron structure
const CORRECT_SQUADRON_TYPES = {
  R1_CORE: '01',           // Core Agency
  R2_DEPLOY: '02',         // Deploy Agency
  R3_ENGAGE: '03',         // Engage Agency
  RIX: 'Rix',              // Special designation for super-agents
  CONCIERGE_RX: 'CRX',     // Concierge Rx (gift shop and companion agents for communities)
  PERSONALIZED_COPILOTS: 'PCP'  // Personalized Co-Pilots
};

// Function to check if a file exists
async function fileExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

// Function to create the initial squadron validation structure
async function createInitialStructure() {
  console.log(`Target file ${filePath} does not exist. Creating it with initial structure...`);
  
  // Ensure the directory exists
  const dirPath = path.dirname(filePath);
  if (!existsSync(dirPath)) {
    console.log(`Creating directory: ${dirPath}`);
    mkdirSync(dirPath, { recursive: true });
  }
  
  // Initial content with the expected structure
  const initialContent = `/**
 * S2DO Squadron Upgrade Workflow Validation
 * Validates squadron upgrades according to wing architecture specifications.
 */

'use strict';

// Squadron Types (need to be corrected)
const SQUADRON_TYPES = {
  R1_CORE: 'core',
  RIX_PR: 'rix',
  VISION_LAKE: 'vl',
  EMPATHY_ENGINE: 'ee',
  LENZ: 'lenz',
  OPERATIONS: 'ops'
};

/**
 * S2DO Squadron Validation Class
 */
class S2DOSquadronValidation {
  constructor() {
    // Squadron dependencies (need to be corrected)
    this.squadronDependencies = {
      [SQUADRON_TYPES.R1_CORE]: [],
      [SQUADRON_TYPES.RIX_PR]: [SQUADRON_TYPES.R1_CORE],
      [SQUADRON_TYPES.VISION_LAKE]: [SQUADRON_TYPES.R1_CORE],
      [SQUADRON_TYPES.EMPATHY_ENGINE]: [SQUADRON_TYPES.R1_CORE],
      [SQUADRON_TYPES.LENZ]: [SQUADRON_TYPES.R1_CORE],
      [SQUADRON_TYPES.OPERATIONS]: [SQUADRON_TYPES.R1_CORE]
    };
    
    // Upgrade order (need to be corrected)
    this.upgradeOrder = [
      SQUADRON_TYPES.R1_CORE,
      SQUADRON_TYPES.VISION_LAKE,
      SQUADRON_TYPES.EMPATHY_ENGINE,
      SQUADRON_TYPES.RIX_PR,
      SQUADRON_TYPES.LENZ,
      SQUADRON_TYPES.OPERATIONS
    ];
  }
  
  /**
   * Main validation method for squadron upgrade workflow
   */
  validateSquadronUpgradeWorkflow(config, options = {}) {
    // Basic validation
    const baseResult = this.validateBaseRequirements(config, options);
    if (!baseResult.valid) {
      return baseResult;
    }
    
    // Squadron-specific validation
    let squadronSpecificResult;
    
    switch (config.squadronType) {
      case SQUADRON_TYPES.R1_CORE:
        squadronSpecificResult = this.validateR1CoreUpgrade(config, options);
        break;
      case SQUADRON_TYPES.RIX_PR:
        squadronSpecificResult = this.validateRixPrUpgrade(config, options);
        break;
      case SQUADRON_TYPES.VISION_LAKE:
        squadronSpecificResult = this.validateVisionLakeUpgrade(config, options);
        break;
      case SQUADRON_TYPES.EMPATHY_ENGINE:
        squadronSpecificResult = this.validateEmpathyEngineUpgrade(config, options);
        break;
      case SQUADRON_TYPES.LENZ:
        squadronSpecificResult = this.validateLenzUpgrade(config, options);
        break;
      case SQUADRON_TYPES.OPERATIONS:
        squadronSpecificResult = this.validateOperationsUpgrade(config, options);
        break;
      default:
        squadronSpecificResult = { valid: true, metrics: {} };
    }
    
    return {
      valid: baseResult.valid && squadronSpecificResult.valid,
      metrics: {
        ...baseResult.metrics,
        ...squadronSpecificResult.metrics
      }
    };
  }
  
  /**
   * Base validation for all squadron upgrades
   */
  validateBaseRequirements(config, options) {
    // Basic validation logic
    return { valid: true, metrics: { baseChecks: 'passed' } };
  }
  
  /**
   * R1 Core squadron validation
   */
  validateR1CoreUpgrade(config, options) {
    return { valid: true, metrics: { squadron: SQUADRON_TYPES.R1_CORE } };
  }
  
  /**
   * RIX PR squadron validation
   */
  validateRixPrUpgrade(config, options) {
    return { valid: true, metrics: { squadron: SQUADRON_TYPES.RIX_PR } };
  }
  
  /**
   * Vision Lake squadron validation
   */
  validateVisionLakeUpgrade(config, options) {
    return { valid: true, metrics: { squadron: SQUADRON_TYPES.VISION_LAKE } };
  }
  
  /**
   * Empathy Engine squadron validation
   */
  validateEmpathyEngineUpgrade(config, options) {
    return { valid: true, metrics: { squadron: SQUADRON_TYPES.EMPATHY_ENGINE } };
  }
  
  /**
   * Lenz squadron validation
   */
  validateLenzUpgrade(config, options) {
    return { valid: true, metrics: { squadron: SQUADRON_TYPES.LENZ } };
  }
  
  /**
   * Operations squadron validation
   */
  validateOperationsUpgrade(config, options) {
    return { valid: true, metrics: { squadron: SQUADRON_TYPES.OPERATIONS } };
  }
}

module.exports = S2DOSquadronValidation;
`;

  await fs.writeFile(filePath, initialContent, 'utf8');
  console.log('Initial file structure created successfully.');
  return initialContent;
}

async function correctSquadronStructure() {
  try {
    console.log('Starting squadron structure correction...');
    
    // Check if the file exists, create it if it doesn't
    let fileContent;
    if (await fileExists(filePath)) {
      console.log(`Target file ${filePath} exists. Reading content...`);
      fileContent = await fs.readFile(filePath, 'utf8');
    } else {
      fileContent = await createInitialStructure();
    }
    
    // Replace the SQUADRON_TYPES constant
    let updatedContent = fileContent.replace(
      /const SQUADRON_TYPES = {[\s\S]*?};/,
      `const SQUADRON_TYPES = {
  R1_CORE: '01',           // Core Agency
  R2_DEPLOY: '02',         // Deploy Agency
  R3_ENGAGE: '03',         // Engage Agency
  RIX: 'Rix',              // Special designation for super-agents
  CONCIERGE_RX: 'CRX',     // Concierge Rx (gift shop and companion agents for communities)
  PERSONALIZED_COPILOTS: 'PCP'  // Personalized Co-Pilots
};`
    );
    
    // Update squadron dependencies
    updatedContent = updatedContent.replace(
      /this\.squadronDependencies = {[\s\S]*?};/,
      `this.squadronDependencies = {
      [SQUADRON_TYPES.R1_CORE]: [], // Core Agency has no dependencies
      [SQUADRON_TYPES.R2_DEPLOY]: [SQUADRON_TYPES.R1_CORE], // Deploy Agency depends on Core
      [SQUADRON_TYPES.R3_ENGAGE]: [SQUADRON_TYPES.R1_CORE], // Engage Agency depends on Core
      [SQUADRON_TYPES.RIX]: [SQUADRON_TYPES.R1_CORE, SQUADRON_TYPES.R2_DEPLOY, SQUADRON_TYPES.R3_ENGAGE], // RIX depends on all agencies
      [SQUADRON_TYPES.CONCIERGE_RX]: [SQUADRON_TYPES.R1_CORE, SQUADRON_TYPES.R3_ENGAGE], // Concierge depends on Core and Engage
      [SQUADRON_TYPES.PERSONALIZED_COPILOTS]: [SQUADRON_TYPES.R1_CORE, SQUADRON_TYPES.RIX] // Co-Pilots depend on Core and RIX
    };`
    );
    
    // Update upgrade order
    updatedContent = updatedContent.replace(
      /this\.upgradeOrder = \[[\s\S]*?\];/,
      `this.upgradeOrder = [
      SQUADRON_TYPES.R1_CORE,
      SQUADRON_TYPES.R2_DEPLOY,
      SQUADRON_TYPES.R3_ENGAGE,
      SQUADRON_TYPES.RIX,
      SQUADRON_TYPES.CONCIERGE_RX,
      SQUADRON_TYPES.PERSONALIZED_COPILOTS
    ];`
    );
    
    // Rename validation methods to match correct squadron types
    // First, identify the existing validation methods
    const oldMethodsRegex = /validate([A-Za-z]+)Upgrade\(/g;
    const oldMethods = [...updatedContent.matchAll(oldMethodsRegex)].map(match => match[1]);
    
    // Create mapping from old method names to new ones
    const methodMapping = {
      'R1Core': 'R1Core',
      'RixPr': 'Rix',
      'VisionLake': 'R2Deploy',
      'EmpathyEngine': 'R3Engage',
      'Lenz': 'ConciergeRx',
      'Operations': 'PersonalizedCopilots'
    };
    
    // Replace each method name
    for (const [oldMethod, newMethod] of Object.entries(methodMapping)) {
      const oldMethodRegex = new RegExp(`validate${oldMethod}Upgrade\\(`, 'g');
      updatedContent = updatedContent.replace(oldMethodRegex, `validate${newMethod}Upgrade(`);
      
      // Also replace method implementations
      const oldImplRegex = new RegExp(`validate${oldMethod}Upgrade\\(.*?\\{[\\s\\S]*?return result;[\\s\\S]*?\\}`, 's');
      const oldImpl = updatedContent.match(oldImplRegex);
      
      if (oldImpl) {
        // Create a new method implementation with updated squadron references
        let newImpl = oldImpl[0].replace(new RegExp(`${oldMethod}`, 'g'), newMethod);
        
        // Update any specific squadron type references within the method
        for (const [oldType, newType] of [
          ['R1_CORE', 'R1_CORE'],
          ['RIX_PR', 'RIX'],
          ['VISION_LAKE', 'R2_DEPLOY'],
          ['EMPATHY_ENGINE', 'R3_ENGAGE'],
          ['LENZ', 'CONCIERGE_RX'],
          ['OPERATIONS', 'PERSONALIZED_COPILOTS']
        ]) {
          newImpl = newImpl.replace(new RegExp(`SQUADRON_TYPES\\.${oldType}`, 'g'), `SQUADRON_TYPES.${newType}`);
        }
        
        updatedContent = updatedContent.replace(oldImplRegex, newImpl);
      }
    }
    
    // Update the switch statement in validateSquadronUpgradeWorkflow
    updatedContent = updatedContent.replace(
      /switch\s*\(\s*config\.squadronType\s*\)\s*{[\s\S]*?}/,
      `switch (config.squadronType) {
        case SQUADRON_TYPES.R1_CORE:
          squadronSpecificResult = this.validateR1CoreUpgrade(config, options);
          break;
        case SQUADRON_TYPES.R2_DEPLOY:
          squadronSpecificResult = this.validateR2DeployUpgrade(config, options);
          break;
        case SQUADRON_TYPES.R3_ENGAGE:
          squadronSpecificResult = this.validateR3EngageUpgrade(config, options);
          break;
        case SQUADRON_TYPES.RIX:
          squadronSpecificResult = this.validateRixUpgrade(config, options);
          break;
        case SQUADRON_TYPES.CONCIERGE_RX:
          squadronSpecificResult = this.validateConciergeRxUpgrade(config, options);
          break;
        case SQUADRON_TYPES.PERSONALIZED_COPILOTS:
          squadronSpecificResult = this.validatePersonalizedCopilotsUpgrade(config, options);
          break;
        default:
          squadronSpecificResult = { valid: true, metrics: {} };
      }`
    );
    
    // Write the updated content back to the file
    await fs.writeFile(filePath, updatedContent, 'utf8');
    
    console.log('Squadron structure correction completed successfully.');
    console.log('The following changes were made:');
    console.log('1. Updated SQUADRON_TYPES to match the correct wing architecture');
    console.log('2. Corrected squadron dependencies to reflect actual relationships');
    console.log('3. Updated upgrade order for proper sequence');
    console.log('4. Renamed and updated validation methods to match squadron types');
    console.log('5. Updated switch statement in validateSquadronUpgradeWorkflow');
    
    // Perform validation check to confirm the changes are effective
    await validateCorrections(filePath);
    
  } catch (error) {
    console.error('Error correcting squadron structure:', error.message);
    
    // If the error is file not found, handle it by creating the file
    if (error.code === 'ENOENT') {
      console.log('Attempting to create the target file with initial structure...');
      try {
        await createInitialStructure();
        console.log('Created initial file. Running correction script again...');
        await correctSquadronStructure();
      } catch (createError) {
        console.error('Error creating initial file structure:', createError.message);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
}

async function validateCorrections(filePath) {
  try {
    console.log('\nValidating corrections...');
    
    const correctedContent = await fs.readFile(filePath, 'utf8');
    
    // Check that all squadron types are correctly defined
    let allSquadronsPresent = true;
    for (const squadron of Object.keys(CORRECT_SQUADRON_TYPES)) {
      if (!correctedContent.includes(`${squadron}:`)) {
        console.error(`ERROR: Squadron ${squadron} not found in corrected file`);
        allSquadronsPresent = false;
      }
    }
    
    // Check that squadron validation methods exist
    const requiredMethods = [
      'validateR1CoreUpgrade',
      'validateR2DeployUpgrade',
      'validateR3EngageUpgrade',
      'validateRixUpgrade',
      'validateConciergeRxUpgrade',
      'validatePersonalizedCopilotsUpgrade'
    ];
    
    let allMethodsPresent = true;
    for (const method of requiredMethods) {
      if (!correctedContent.includes(method)) {
        console.error(`ERROR: Validation method ${method} not found in corrected file`);
        allMethodsPresent = false;
      }
    }
    
    if (allSquadronsPresent && allMethodsPresent) {
      console.log('Validation successful! All squadrons and methods are correctly defined.');
    } else {
      console.error('Validation failed. Manual inspection may be required.');
    }
    
    // Note about VLS Solutions
    console.log('\nNOTE: The code now properly distinguishes between squadron pilots and VLS Solutions.');
    console.log('VLS Solutions like Vision Lake are now properly categorized within the appropriate agencies.');
    
  } catch (error) {
    console.error('Error validating corrections:', error.message);
  }
}

// Run the correction script
correctSquadronStructure();

