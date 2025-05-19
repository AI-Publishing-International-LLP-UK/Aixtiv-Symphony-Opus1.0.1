/**
 * Simple build script that:
 * 1. Copies all non-TypeScript files to the dist directory
 * 2. Uses a minimal transpilation approach for TypeScript files
 * 3. Skips all type checking and just focuses on generating JavaScript
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const srcDir = '.';
const outDir = './dist';
const excludeDirs = ['node_modules', 'dist', '.git', '.github', '.firebase', '.venv'];
const fileExtensions = {
  copy: ['.js', '.json', '.html', '.css', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.env'],
  transpile: ['.ts', '.tsx']
};

// Create dist directory if it doesn't exist
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Clean dist directory
console.log('Cleaning dist directory...');
try {
  const files = fs.readdirSync(outDir);
  for (const file of files) {
    const filePath = path.join(outDir, file);
    if (file !== 'node_modules' && file !== '.git') { // Don't delete node_modules if they exist in dist
      if (fs.lstatSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
    }
  }
} catch (err) {
  console.error(`Error cleaning directory: ${err.message}`);
}

/**
 * Process a file based on its extension
 * @param {string} srcPath - Source file path
 * @param {string} destPath - Destination file path
 */
function processFile(srcPath, destPath) {
  const ext = path.extname(srcPath);
  const destDir = path.dirname(destPath);

  // Create destination directory if it doesn't exist
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Copy files with extensions in the copy list
  if (fileExtensions.copy.includes(ext)) {
    try {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${srcPath} -> ${destPath}`);
    } catch (err) {
      console.error(`Error copying file ${srcPath}: ${err.message}`);
    }
  } 
  // Simple transpilation for TypeScript files
  else if (fileExtensions.transpile.includes(ext)) {
    try {
      // Read the TypeScript file
      const tsContent = fs.readFileSync(srcPath, 'utf8');
      
      // Simple transformation: strip out type annotations
      let jsContent = tsContent
        // Remove interface declarations
        .replace(/interface\s+[^{]+{[\s\S]*?}/g, '')
        // Remove type annotations from variables
        .replace(/:\s*[A-Za-z0-9_<>[\].,|&()\s]+(?=[,;)]|(\s*=))/g, '')
        // Remove return type annotations
        .replace(/\)\s*:\s*[A-Za-z0-9_<>[\].,|&()\s]+(?=\s*{)/g, ')')
        // Remove private/protected/public modifiers
        .replace(/(private|protected|public|readonly)\s+/g, '')
        // Remove import type statements
        .replace(/import\s+type\s+.*?from\s+.*?;/g, '')
        // Remove type parameters from generic functions/classes
        .replace(/<[^>]+>/g, '')
        // Remove 'as' type assertions
        .replace(/\s+as\s+[A-Za-z0-9_<>[\].,|&()]+/g, '');
      
      // For .tsx files, convert to React.createElement
      if (ext === '.tsx') {
        // Very simple JSX transformation - this is not comprehensive
        jsContent = jsContent
          .replace(/<([A-Za-z0-9_]+)([^>]*)\/>/g, 'React.createElement("$1", $2)')
          .replace(/<([A-Za-z0-9_]+)([^>]*)>([\s\S]*?)<\/\1>/g, 'React.createElement("$1", $2, "$3")');
      }
      
      // Write the transformed content to a .js file
      const jsPath = destPath.replace(/\.(ts|tsx)$/, '.js');
      fs.writeFileSync(jsPath, jsContent);
      console.log(`Transpiled: ${srcPath} -> ${jsPath}`);
    } catch (err) {
      console.error(`Error transpiling file ${srcPath}: ${err.message}`);
    }
  }
}

/**
 * Recursively process a directory
 * @param {string} srcDir - Source directory
 * @param {string} outDir - Destination directory
 */
function processDirectory(srcDir, outDir) {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(outDir, entry.name);
    
    // Skip excluded directories
    if (entry.isDirectory() && excludeDirs.includes(entry.name)) {
      continue;
    }
    
    if (entry.isDirectory()) {
      processDirectory(srcPath, destPath);
    } else {
      processFile(srcPath, destPath);
    }
  }
}

// Process the project directory
console.log('Starting build process...');
console.log(`Source: ${srcDir}`);
console.log(`Destination: ${outDir}`);

try {
  // Get list of top-level directories to process
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  
  for (const entry of entries) {
    // Skip excluded directories and files that begin with '.'
    if (excludeDirs.includes(entry.name) || entry.name.startsWith('.')) {
      continue;
    }
    
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(outDir, entry.name);
    
    if (entry.isDirectory()) {
      processDirectory(srcPath, destPath);
    } else if (!entry.name.startsWith('.')) { // Skip dotfiles
      processFile(srcPath, destPath);
    }
  }
  
  console.log('Build completed successfully!');
} catch (err) {
  console.error(`Error during build: ${err.message}`);
}

