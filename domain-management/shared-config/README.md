# Shared Configuration

This directory contains shared configuration templates and synchronization tools for maintaining consistent development environments across all projects in the solution.

## Structure

- `base-package.json`: Base configuration template with common dependencies and scripts
- `sync-config.js`: Script to synchronize configurations across projects
- Additional configuration files for TypeScript, ESLint, and Jest

## Features

- Common development dependencies and configurations
- Standardized testing setup (Jest + Newman)
- Unified code style (ESLint + Prettier)
- Shared scripts for building, testing, and development
- Automatic dependency management

## Usage

### Initial Setup

1. Make the sync script executable:
   ```bash
   chmod +x sync-config.js
   ```

2. Run the sync script:
   ```bash
   ./sync-config.js
   ```

This will:
- Update package.json in all projects
- Install required dependencies
- Create necessary configuration files
- Backup existing configurations

### Adding New Projects

1. Add the project name to the PROJECTS array in sync-config.js
2. Run the sync script
3. The new project will receive all shared configurations

### Updating Shared Configuration

1. Update base-package.json with new dependencies or scripts
2. Run the sync script to propagate changes
3. Review changes in each project's package.json

## Project-Specific Overrides

Projects can override shared configurations by:
1. Adding project-specific dependencies to their package.json
2. Creating custom scripts in their package.json
3. Extending shared configuration files

The sync script will preserve these project-specific modifications while updating shared configurations.

## Testing Setup

### Unit Tests (Jest)
- Run unit tests: `npm test`
- Watch mode: `npm run test:watch`
- Coverage report: `npm run test:coverage`

### API Tests (Newman)
- Run API tests: `npm run test:api`
- Generate HTML report: `npm run test:api:report`
- Run all tests: `npm run test:all`

## Development Scripts

- Start development server: `npm run dev`
- Build project: `npm run build`
- Lint code: `npm run lint`
- Format code: `npm run format`
- Clean build artifacts: `npm run clean`

## Best Practices

1. Always run sync-config.js after pulling changes
2. Review backup files before deleting them
3. Test changes in development before pushing to production
4. Keep project-specific configurations minimal
5. Document any deviations from shared configurations

# Shared Configuration Management

This directory contains shared configuration settings and tools for managing configurations across multiple projects.

## Overview

- `base-package.json`: Common development dependencies and configurations
- `sync-config.js`: Script to sync configurations across projects
- Project-specific overrides are preserved during sync

## Usage

1. Update projects with shared configuration:
   ```bash
   node sync-config.js ./path/to/project1 ./path/to/project2
   ```

2. Example with specific paths:
   ```bash
   node sync-config.js ../domain-management ../integration-gateway
   ```

## Features

- Standardized development dependencies
- Common testing configuration (Jest)
- TypeScript configuration
- Linting and formatting rules
- Build scripts

## Adding New Projects

1. Ensure the project has a package.json
2. Run the sync script with the project path
3. Project-specific configurations will be preserved

## Update Base Configuration

1. Modify base-package.json
2. Run sync script to update all projects
3. Commit changes to version control

## Testing Scripts

Common test scripts available in all projects:
- `npm test`: Run all tests
- `npm run test:watch`: Watch mode
- `npm run test:coverage`: Generate coverage report

## Build Process

Standard build process in all projects:
- `npm run prebuild`: Install dependencies
- `npm run build`: Compile TypeScript
- `npm run postbuild`: Run tests

