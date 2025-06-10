# Code Search Techniques for Integration Gateway

This document provides comprehensive guidance on effectively searching and navigating the Integration Gateway codebase. It includes basic and advanced search techniques, system architecture analysis approaches, practical examples, and efficiency tools.

## Table of Contents

- [Introduction](#introduction)
- [Basic Search Techniques](#basic-search-techniques)
- [Advanced Search Techniques](#advanced-search-techniques)
- [System Architecture Analysis](#system-architecture-analysis)
- [Practical Examples](#practical-examples)
- [Efficiency Tools](#efficiency-tools)
- [Integration with Dewey Digital Card System](#integration-with-dewey-digital-card-system)

## Introduction

The Integration Gateway codebase is a substantial Node.js project with various services, components, and modules. This guide will help you efficiently navigate and understand the codebase structure, focusing on gateway services, authentication components, and various other modules.

### Project Structure Overview

The project contains several key directories:

```
./services/           - Core services including gateway implementations
./auth/               - Authentication components
./deployments/        - Deployment configurations for Cloud Run and Kubernetes
./integrations/       - External service integrations
```

## Basic Search Techniques

These fundamental search commands will help you find code across the project:

### Finding Files

```bash
# Find all JavaScript files in the project (excluding node_modules and dist)
find . -name "*.js" -not -path "./node_modules/*" -not -path "./dist/*"

# Find all files with "Gateway" in the name
find . -name "*Gateway*" | grep -v "node_modules" | grep -v "dist"

# Find recently modified files (last 7 days)
find . -type f -name "*.js" -mtime -7 | grep -v "node_modules" | grep -v "dist"
```

### Searching File Contents

```bash
# Search for a specific term in all JavaScript files
grep -r "SallyPort" --include="*.js" . --exclude-dir={node_modules,dist}

# Search with context (3 lines before and after)
grep -r "authenticate" --include="*.js" -A 3 -B 3 . --exclude-dir={node_modules,dist}

# Search for multiple patterns
grep -r "authenticate\|verify\|token" --include="*.js" . --exclude-dir={node_modules,dist}

# Count occurrences in files
grep -r "SallyPort" --include="*.js" . --exclude-dir={node_modules,dist} -c | grep -v ":0$"
```

### Combining Find and Grep

```bash
# Find all gateway files and search for a specific pattern
find . -name "*Gateway.js" -not -path "./node_modules/*" -not -path "./dist/*" | xargs grep "authenticate"

# Find all test files
find . -type f -name "*test.js" -o -name "*spec.js" | grep -v "node_modules" | grep -v "dist"
```

## Advanced Search Techniques

These more advanced techniques are tailored to our Integration Gateway project structure:

### Gateway Implementation Searches

```bash
# Find all gateway implementations
find . -type f -name "*Gateway.js" | grep -v "node_modules" | grep -v "dist"

# Search for SallyPort verification logic
grep -r "_performAuthentication" --include="*.js" . --exclude-dir={node_modules,dist}

# Find where sallyPortVerifier is being used
grep -r "sallyPortVerifier" --include="*.js" . --exclude-dir={node_modules,dist}
```

### Authentication Flow Analysis

```bash
# Find function calls to specific authentication methods
grep -r "authenticate(" --include="*.js" . --exclude-dir={node_modules,dist}

# Find error handling in authentication
grep -r "catch" --include="*.js" -A 5 . --exclude-dir={node_modules,dist} | grep -i "auth"

# Trace SallyPort verification
grep -r "sallyPortVerifier.verify" --include="*.js" . --exclude-dir={node_modules,dist}
```

### Dependency Analysis

```bash
# Find all module imports/requires in gateway files
find ./services/gateway -name "*.js" | xargs grep -l "require" | xargs grep "require"

# Map service dependencies
grep -r "this.service" --include="*Gateway.js" . --exclude-dir={node_modules,dist}

# Find where specific gateways are used
grep -r "new.*Gateway" --include="*.js" . --exclude-dir={node_modules,dist}
```

## System Architecture Analysis

These techniques help you understand the overall architecture of the Integration Gateway system:

### API Route Mapping

```bash
# Find all API route definitions
grep -r "app\.\(get\|post\|put\|delete\)" --include="*.js" . --exclude-dir={node_modules,dist}

# Sort and organize route patterns
grep -r "app\.\(get\|post\|put\|delete\)" --include="*.js" . --exclude-dir={node_modules,dist} | 
  sed -E 's/.*app\.(get|post|put|delete)\("([^"]+)".*/\1 \2/' | sort
```

### Deployment Configuration Analysis

```bash
# Find all Cloud Run service definitions
grep -r "service:" --include="*.yaml" --include="*.yml" ./deployments

# Extract memory and CPU settings
grep -r "resources:" -A 5 --include="*.yaml" --include="*.yml" ./deployments

# Find environment variable configurations
grep -r "env:" -A 10 --include="*.yaml" --include="*.yml" ./deployments

# Find secret references in deployments
grep -r "secretName\|secretKeyRef" --include="*.yaml" --include="*.yml" ./deployments
```

### Service Connection Points

```bash
# Find service integration points
grep -r "new.*Client\|connect\|createClient" --include="*.js" . --exclude-dir={node_modules,dist}

# Locate external service connections
grep -r "http\|https\|url\|endpoint" --include="*.js" . --exclude-dir={node_modules,dist}
```

### Authentication Flow Analysis

```bash
# Map the authentication flow from request to validation
grep -r "authenticate" --include="*.js" -A 5 -B 5 . --exclude-dir={node_modules,dist}

# Find middleware chains
grep -r "app\.use" --include="*.js" . --exclude-dir={node_modules,dist}
```

## Practical Examples

Here are examples of how to use these search techniques to answer specific questions about the Integration Gateway codebase:

### Example 1: How does authentication flow through my system?

```bash
# 1. Find where authentication begins
grep -r "authenticate" --include="*.js" . --exclude-dir={node_modules,dist} | grep "function"

# 2. Find middleware that applies authentication
grep -r "app.use" --include="*.js" . --exclude-dir={node_modules,dist} | grep -i "auth"

# 3. Trace SallyPort verification
grep -r "sallyPortVerifier.verify" --include="*.js" . --exclude-dir={node_modules,dist}

# 4. See what happens after successful authentication
grep -r "authenticate.*then" --include="*.js" -A 5 . --exclude-dir={node_modules,dist}

# 5. Find error handling for failed authentication
grep -r "authenticate.*catch" --include="*.js" -A 5 . --exclude-dir={node_modules,dist}
```

### Example 2: How are services deployed to Cloud Run?

```bash
# 1. Find deployment scripts
find ./deployments -name "*.sh" | xargs grep -l "gcloud run deploy"

# 2. Examine the deployment configuration
grep -r "gcloud run deploy" --include="*.sh" -A 10 . 

# 3. Find where environment variables are configured
grep -r "env:" -A 15 --include="*.yaml" --include="*.yml" ./deployments

# 4. See how secrets are managed
grep -r "secretManager" --include="*.js" --include="*.yaml" . --exclude-dir={node_modules,dist}

# 5. Find memory/CPU allocations
grep -r "memory\|cpu" --include="*.yaml" --include="*.yml" ./deployments
```

### Example 3: How do gateway classes interact with their services?

```bash
# 1. Find all gateway implementations
find . -type f -name "*Gateway.js" | grep -v "node_modules" | grep -v "dist"

# 2. Examine a specific gateway's constructor
grep -r "constructor" --include="*Gateway.js" -A 10 . --exclude-dir={node_modules,dist}

# 3. Find how services are injected
grep -r "this.service" --include="*Gateway.js" . --exclude-dir={node_modules,dist}

# 4. See how gateways are used
grep -r "new.*Gateway" --include="*.js" . --exclude-dir={node_modules,dist}

# 5. Find where gateway authentication is called
grep -r "gateway.*authenticate" --include="*.js" . --exclude-dir={node_modules,dist}
```

### Example 4: Security Assessment

```bash
# 1. Find direct token exposures
grep -r "token.*return" --include="*.js" . --exclude-dir={node_modules,dist}

# 2. Check for insecure error handling
grep -r "catch" --include="*.js" -A 5 . --exclude-dir={node_modules,dist} | grep -i "send.*error"

# 3. Look for hard-coded credentials
grep -r "password\|secret\|key\|token" --include="*.js" . --exclude-dir={node_modules,dist} | grep "="

# 4. Find potential injection points
grep -r "eval\|Function\|exec\|spawn" --include="*.js" . --exclude-dir={node_modules,dist}

# 5. Check input validation
grep -r "req.body\|req.query\|req.params" --include="*.js" -A 3 . --exclude-dir={node_modules,dist}
```

### Example 5: Tracing Requests

```bash
# 1. Find the entry point of a specific route
grep -r "app.\(get\|post\)" --include="*.js" . --exclude-dir={node_modules,dist} | grep "/api/users"

# 2. Locate the route handler function
grep -r "function handleUserRequest" --include="*.js" . --exclude-dir={node_modules,dist}

# 3. Find what services this handler calls
grep -r "service." --include="*.js" -A 3 -B 3 . --exclude-dir={node_modules,dist} | grep "handleUserRequest"

# 4. See how responses are formed
grep -r "res.\(json\|send\)" --include="*.js" -A 3 -B 3 . --exclude-dir={node_modules,dist} | grep "handleUserRequest"

# 5. Find error handling for this route
grep -r "catch" --include="*.js" -A 5 . --exclude-dir={node_modules,dist} | grep "handleUserRequest"
```

## Efficiency Tools

### Shell Aliases

Add these aliases to your `~/.zshrc` file to create helpful search shortcuts:

```bash
# Find in JS/TS files (excluding node_modules and dist)
alias jsgrep='grep -r --include="*.js" --include="*.ts" . --exclude-dir={node_modules,dist}'

# Find all gateway files
alias findgw='find . -type f -name "*Gateway.js" | grep -v "node_modules" | grep -v "dist"'

# Search for authentication patterns
alias authgrep='grep -r "authenticate\|verify\|validate" --include="*.js" . --exclude-dir={node_modules,dist}'

# Search deployment configurations
alias deploygrep='grep -r --include="*.yaml" --include="*.yml" --include="*.sh" ./deployments'

# Find API endpoints
alias apiroutes='grep -r "app\.\(get\|post\|put\|delete\)" --include="*.js" . --exclude-dir={node_modules,dist}'

# Environmental variable usage
alias envgrep='grep -r "process\.env\." --include="*.js" --include="*.ts" . --exclude-dir={node_modules,dist}'
```

After adding these to your `~/.zshrc`, run `source ~/.zshrc` to make them available immediately.

### Custom Search Script

Create a custom search script for even more power:

```bash
# Save this as ~/bin/codesearch.sh and chmod +x ~/bin/codesearch.sh

#!/bin/bash
# codesearch.sh - Advanced code search utility

case "$1" in
  "gateway")
    find . -type f -name "*Gateway.js" | grep -v "node_modules" | grep -v "dist"
    ;;
  "auth")
    grep -r "authenticate\|verify\|validate" --include="*.js" . --exclude-dir={node_modules,dist}
    ;;
  "routes")
    grep -r "app\.\(get\|post\|put\|delete\)" --include="*.js" . --exclude-dir={node_modules,dist}
    ;;
  "deploy")
    grep -r --include="*.yaml" --include="*.yml" --include="*.sh" "$2" ./deployments
    ;;
  "env")
    grep -r "process\.env\." --include="*.js" --include="*.ts" . --exclude-dir={node_modules,dist}
    ;;
  "deps")
    grep -r "require\|import" --include="*.js" . --exclude-dir={node_modules,dist} | grep "$2"
    ;;
  *)
    echo "Usage: codesearch.sh [gateway|auth|routes|deploy|env|deps] [optional search term]"
    ;;
esac
```

This gives you commands like:
- `codesearch.sh gateway` - Find all gateway files
- `codesearch.sh auth` - Search for authentication patterns
- `codesearch.sh routes` - Find all API route definitions
- `codesearch.sh deploy Cloud` - Find Cloud-related deployment configurations
- `codesearch.sh env` - Find environment variable usage
- `codesearch.sh deps sallyport` - Find where sallyport is imported/required

## Integration with Dewey Digital Card System

The Dewey Digital Card System can be integrated with these code search techniques to create a powerful knowledge management workflow for your codebase.

### Creating Code Reference Cards

Use these search techniques to populate your Dewey cards with relevant code references:

```bash
# Example: Creating a SallyPort Authentication reference card
# 1. Find all SallyPort verification implementations
grep -r "sallyPortVerifier.verify" --include="*.js" . --exclude-dir={node_modules,dist} > sallyport_refs.txt

# 2. Extract the relevant context
grep -r "_performAuthentication" --include="*Gateway.js" -A 10 -B 2 . --exclude-dir={node_modules,dist} > sallyport_auth_methods.txt
```

### Linking Search Results to Cards

Create a script to automatically generate Dewey cards from search results:

```bash
#!/bin/bash
# dewey-card-gen.sh - Generate Dewey cards from code search

SEARCH_TERM=$1
CARD_TITLE=$2

echo "Creating Dewey card: $CARD_TITLE"
echo "Search term: $SEARCH_TERM"

# Perform the search
RESULTS=$(grep -r "$SEARCH_TERM" --include="*.js" . --exclude-dir={node_modules,dist})

# Generate card content (replace with actual Dewey card API calls)
echo "Results to add to card:"
echo "$RESULTS"

# Add to Dewey system (placeholder for actual implementation)
echo "Card created in Dewey system"
```

### Example Dewey Card Categories for Integration Gateway

Organize your Dewey cards around these key code concepts:

1. **Gateway Implementations**
   - Card for each Gateway class
   - Authentication flow references
   - SallyPort verification patterns

2. **API Routes**
   - Organized by service
   - Authentication requirements
   - Required parameters

3. **Deployment Configurations**
   - Cloud Run settings
   - Environment variables
   - Secret management

4. **Authentication Patterns**
   - SallyPort token usage
   - Verification workflows
   - Error handling patterns

### Workflow Integration

Combine the search techniques and Dewey cards in your development workflow:

1. Use code search to find relevant parts of the codebase
2. Create/update Dewey cards with the findings
3. Link related cards together to form knowledge graphs
4. Reference card IDs in code comments for better documentation

> **Note**: The specific implementation details for Dewey Digital Card System integration would depend on the system's API and capabilities. This section provides a conceptual framework that should be adapted to your specific Dewey implementation.
