# Website Build Repository - Jira Integration

This document provides comprehensive information about the integration between this GitHub repository and our Jira instance at c2100pcr.atlassian.net.

## Table of Contents
- [Integration Setup](#integration-setup)
- [Workflow Configuration](#workflow-configuration)
- [Smart Commits](#smart-commits)
- [Branch Naming Conventions](#branch-naming-conventions)
- [PR Status and Jira Issues](#pr-status-and-jira-issues)
- [Required GitHub Secrets](#required-github-secrets)
- [Troubleshooting](#troubleshooting)

## Integration Setup

The integration between this repository and Jira is established through GitHub Actions workflows and the Jira DVCS Connector.

### Initial Setup

1. The repository is connected to Jira via the DVCS Connector in Jira administration
2. GitHub Actions workflows automate the integration process
3. Configuration files are stored in:
   - `.github/workflows/jira-integration.yml` - The GitHub Actions workflow
   - `automation/jira-sync.yaml` - Jira synchronization configuration

### Access Requirements

- Admin access to the Jira instance (c2100pcr.atlassian.net) is required for initial setup
- GitHub repository admin rights are needed to configure secrets

## Workflow Configuration

The Jira integration workflow is triggered by the following events:

- Pull request actions (creation, updates, closing)
- Push events to the main branch
- Issue comments (for smart commits)

### Workflow Steps

1. **Authentication**: Authenticates with Jira using repository secrets
2. **Issue Identification**: Extracts Jira issue keys from commit messages, branch names, and PR titles
3. **Status Updates**: Updates Jira issue statuses based on PR and branch activities
4. **Comment Synchronization**: Syncs relevant GitHub comments to Jira issues
5. **Transition Handling**: Moves Jira issues through the workflow based on repository activities

## Smart Commits

Smart commits allow developers to update Jira issues directly from commit messages.

### Format

```
<ISSUE_KEY> #<command> <parameters>
```

### Supported Commands

- **#comment**: Adds a comment to the issue
  ```
  PCR-123 #comment Added new header component
  ```

- **#time**: Logs work against the issue
  ```
  PCR-123 #time 2h 30m Added responsive styling
  ```

- **#transition**: Transitions the issue to a different state
  ```
  PCR-123 #transition "In Progress"
  ```

### Multiple Commands

You can use multiple commands in a single commit:
```
PCR-123 #time 3h #comment Implemented search functionality #transition "In Review"
```

## Branch Naming Conventions

Branch names should include the Jira issue key to maintain proper linking.

### Format

```
<type>/<ISSUE_KEY>-<short-description>
```

### Examples

- `feature/PCR-123-header-component`
- `bugfix/PCR-456-fix-navigation-links`
- `hotfix/PCR-789-security-patch`
- `release/PCR-321-v1.2.0`

### Automatic Linking

When a branch follows this naming convention:
- It's automatically linked to the corresponding Jira issue
- The branch appears in the Development panel of the Jira issue
- Status transitions may be triggered based on branch creation (configurable)

## PR Status and Jira Issues

Pull request activities automatically trigger updates to linked Jira issues.

### Status Transitions

| PR Action | Jira Issue Transition |
|-----------|------------------------|
| PR Created | Moves to "In Review" |
| PR Merged | Moves to "Done" |
| PR Closed (unmerged) | Moves back to "To Do" |
| PR Comments | Added as comments to the issue |

### Requirements Checking

The workflow checks for:
- Presence of Jira issue key in PR title or description
- PR body containing sufficient details (configurable minimum length)
- Appropriate labeling based on issue type

## Required GitHub Secrets

The following secrets must be configured in the GitHub repository settings:

| Secret Name | Description |
|-------------|-------------|
| `JIRA_BASE_URL` | URL of the Jira instance (https://c2100pcr.atlassian.net) |
| `JIRA_USER_EMAIL` | Email address of the Jira integration user |
| `JIRA_API_TOKEN` | API token generated for the integration user |
| `JIRA_PROJECT_KEY` | The project key for the Jira project (e.g., PCR) |

### Setting Up Secrets

1. Navigate to the repository settings
2. Select "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Add each required secret with its corresponding value

## Troubleshooting

### Common Issues

- **Jira Integration Not Working**: Verify the secrets are correctly configured
- **Issue Not Linking**: Ensure branch names and commit messages contain valid issue keys
- **Transition Failures**: Check that the transition is valid for the issue's current status
- **Authentication Issues**: Regenerate and update the JIRA_API_TOKEN

### Support Contacts

For integration issues, contact:
- Jira Administration: jira-admin@c2100.org
- GitHub Repository Maintainers: github-admin@c2100.org

---

*Last Updated: [Current Date]*

