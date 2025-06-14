# 🏗️ Aixtiv Symphony Build Architecture

This document outlines the build architecture for Aixtiv Symphony, explaining our deployment structure, build processes, and best practices.

## 📚 Table of Contents

1. [Current Build Architecture](#current-build-architecture)
2. [Website Build Structure](#website-build-structure)
3. [Best Practices](#best-practices)
4. [Common Issues](#common-issues)

## Current Build Architecture

The Aixtiv Symphony project follows a structured build approach designed for clean separation of concerns and efficient deployment:

### 📂 Key Directories

- **`public/`**: Serves as the primary Firebase hosting target
  - Contains static assets and the final compiled frontend assets
  - Is directly referenced in `firebase.json` hosting configuration
  - Should contain only production-ready assets

- **`build/`**: Contains intermediate build artifacts
  - Temporary files during the build process
  - Generated files that may be processed further
  - Build configurations like `cloudbuild.yaml`

### 🔄 Multiple Hosting Targets

Our `firebase.json` configuration supports multiple hosting targets:

```json
"hosting": [
  {
    "target": "drclaude-live",
    "public": "public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [...]
  },
  {
    "target": "asoos.2100.cool",
    "public": "public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [...]
  }
]
```

This configuration allows different domains to share the same codebase while maintaining separate routing rules.

### 🚀 Deployment Script Workflow

Our deployment pipeline consists of:

1. **Build Step**: `build-frontend.sh` compiles frontend assets to the `build` directory
2. **Process Step**: Assets are processed, optimized, and moved to the `public` directory
3. **Deploy Step**: Firebase deploy command targets specific hosting configurations

## Website Build Structure

### ⛔ Why `website-build` Should NOT Be a Submodule

**The `website-build` directory should NOT be a submodule.** It should be removed if it contains a nested Git repository.

We've explicitly chosen **not to use a `website-build` submodule** in our architecture for the following reasons:

1. **Redundancy**: A `website-build` submodule would duplicate functionality already provided by our `public` and `build` directories.

2. **Integration Complexity**: Adding another layer through a submodule would complicate our Firebase hosting configuration, which already works efficiently with the current directory structure.

3. **CI/CD Pipeline Conflicts**: Our automated deployment processes are configured for the current structure; a submodule would require significant pipeline modifications.

4. **Modular Architecture Principles**: Our system follows a modular, multi-tenant approach that separates concerns through services rather than nested repositories.

5. **Maintenance Overhead**: Managing submodule references, especially in nested configurations, adds unnecessary complexity to contribution workflows.

### 🌐 How Current Architecture Supports Modular Deployment

Our architecture already supports modularity through:

- Separation of build processes from hosting targets
- Multiple hosting targets in Firebase configuration
- Shared build infrastructure with domain-specific routing

## Best Practices

### 🧹 Maintaining Clean Build Separation

1. **Use `build/` for transient artifacts only**
   - Do not commit build artifacts to version control
   - Clear the build directory before each build (`npm run clean`)

2. **Use `public/` for hosting-ready assets only**
   - Keep the public directory clean and organized
   - Structure follows the URL paths (e.g., `/images`, `/css`, `/js`)

3. **Never nest Git repositories**
   - Do not create `.git` directories inside the project
   - Use proper submodules if component separation is needed

### 📊 When to Use Which Directory

| Directory | Purpose | Versioned? | Example Content |
|-----------|---------|------------|----------------|
| `build/` | Intermediate artifacts | No | Transpiled JS, processed CSS |
| `public/` | Hosting-ready files | Yes | Final HTML, minified JS/CSS, images |
| `src/` | Source code | Yes | Component source, unprocessed assets |

### 🔀 Handling Multiple Hosting Targets

1. **Use Firebase target-specific commands**:
   ```bash
   firebase target:apply hosting drclaude-live drclaude-live
   firebase target:apply hosting asoos asoos.2100.cool
   ```

2. **Deploy to specific targets**:
   ```bash
   firebase deploy --only hosting:drclaude-live
   ```

3. **Use environment-specific configurations**:
   - Create `.env.drclaude` and `.env.asoos` files
   - Reference the appropriate file during build

## Common Issues

### 🐛 Nested Git Repository Detection

If Git detects a nested repository at `website-build` (or any other directory), it likely indicates an accidental `.git` directory. This should be removed, not converted to a submodule.

**Solution**:
```bash
# Check for accidental git repositories
find . -name ".git" -type d | grep -v "^./.git$"

# Remove the accidental git directory
rm -rf path/to/accidental/.git
```

### 🚨 Deployment Failures

If deployment fails with path-related errors, ensure:

1. The correct `public` directory is specified in `firebase.json`
2. Build scripts output to the expected directories
3. There are no duplicate asset paths across hosting targets

---

For specific deployment instructions, see the [Deployment Guide](DEPLOYMENT.md).

