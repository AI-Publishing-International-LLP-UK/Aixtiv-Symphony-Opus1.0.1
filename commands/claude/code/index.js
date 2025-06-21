/**
 * Dr. Claude Code Generation Module
 * 
 * This module exports the code generation functionality for the Dr. Claude suite.
 * It serves as the entry point for code-related commands including code:generate
 * and github-release.
 */

// Import the code generation and github-release functionality
const generate = require('./generate');
const githubRelease = require('./github-release');

// Export the modules as a command map
module.exports = {
  generate,
  'github-release': githubRelease
};
