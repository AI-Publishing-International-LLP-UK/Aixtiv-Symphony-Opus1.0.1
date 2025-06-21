# AIXTIV-SYMPHONY - Vision Lake Demo

API integration layer for Warp Drive project with GCP, AI services, and content automation.

![WarpApp Stability](https://img.shields.io/badge/WarpApp--Integrity-Lockdown%20Active-green?style=flat-square)
![CI Status](https://github.com/AI-Publishing-International-LLP-UK/AIXTIV-SYMPHONY/actions/workflows/warp-guardian.yml/badge.svg)
![License](https://img.shields.io/github/license/AI-Publishing-International-LLP-UK/AIXTIV-SYMPHONY?style=flat-square)
![Last Commit](https://img.shields.io/github/last-commit/AI-Publishing-International-LLP-UK/AIXTIV-SYMPHONY?style=flat-square)

## Vision Lake Demo Component

This component is a [Next.js](https://nextjs.org) project that serves as the frontend interface for the Vision Lake demo within the AIXTIV-SYMPHONY ecosystem.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Project Structure

This is part of the larger AIXTIV-SYMPHONY project which includes:
- Integration Gateway services
- AI agent orchestration
- GCP infrastructure automation
- Content management systems


## Security

![Security Scanning](https://github.com/AI-Publishing-International-LLP-UK/AIXTIV-SYMPHONY/actions/workflows/security-scan.yml/badge.svg)
![Dependencies](https://img.shields.io/badge/dependencies-up%20to%20date-brightgreen.svg)
![Security Policy](https://img.shields.io/badge/security%20policy-active-blue.svg)

### Security Overview

The Integration Gateway follows the AIXTIV SYMPHONY vision of creating reliable AI-Human synchronization through secure, ethical, and trustworthy software. Our comprehensive security approach includes:

- **Code Security**: Rigorous code reviews, static analysis, and secure coding practices
- **Data Protection**: Encryption at rest and in transit for all sensitive data
- **Authentication & Authorization**: Role-based access control and secure authentication flows
- **Infrastructure Security**: Secure cloud configurations and network access controls
- **Dependency Management**: Regular vulnerability scanning and automated updates
- **Compliance**: GDPR, SOC 2, and industry-standard security frameworks

For detailed information about our security practices, vulnerability reporting process, and compliance standards, please refer to our [Security Policy](./SECURITY.md).

### Quick Start for Security Compliance

To ensure your development environment and contributions comply with our security standards:

1. **Environment Setup**:
   ```bash
   # Copy the environment template (never commit .env files)
   cp .env.example .env
   
   # Set required security variables
   # Use Secret Manager for credentials in production
   ```

2. **Security Validation**:
   ```bash
   # Run the security validation script
   ./deployments/day1-integration-gateway-validation.sh
   
   # Verify dependencies are secure
   npm run validate-deps
   ```

3. **Run Local Security Checks**:
   ```bash
   # Check for security issues in your code
   npm run lint
   
   # Check for dependency vulnerabilities
   npm audit
   ```

### Automated Security Scanning

We've implemented comprehensive automated security scanning that runs on:
- Every pull request
- Every push to main and develop branches
- Weekly scheduled scans

Our security pipeline includes:
- Dependency vulnerability scanning (npm audit, Snyk)
- Code security analysis (CodeQL, ESLint security plugin)
- Infrastructure-as-code security validation
- Secret detection (TruffleHog)
- Security policy compliance checks

### Dependencies and Version Requirements

To maintain security, we enforce strict versioning policies:

- Node.js: >= 18.x (LTS)
- npm: >= 9.x
- Key Dependencies:
  - Express: ^4.18.2 (with security middleware)
  - Firebase-Admin: ^13.4.0 (patched version)
  - Helmet: ^7.1.0 (for HTTP security headers)

Security-critical dependencies have version pinning and overrides to prevent supply chain attacks. View our complete dependencies in `package.json`.

### Security Best Practices for Contributors

When contributing to this project, please follow these security best practices:

1. **Never commit secrets** or credentials to the repository
2. **Use environment variables** for configuration (following `.env.example`)
3. **Validate all user inputs** to prevent injection attacks
4. **Implement proper error handling** that doesn't leak sensitive information
5. **Follow the principle of least privilege** when requesting permissions
6. **Keep dependencies updated** and report vulnerabilities promptly
7. **Use secure coding patterns** from our style guide
8. **Run security linting** before submitting PRs

Security is everyone's responsibility. If you have questions about security practices or find potential vulnerabilities, please follow our [vulnerability reporting process](./SECURITY.md#2-vulnerability-reporting-process).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## WarpApp Stability

This patch locks down repository hygiene for WarpApp. It prevents overreach in agent-driven branches and protects the integrity of the Integration Gateway configuration.
