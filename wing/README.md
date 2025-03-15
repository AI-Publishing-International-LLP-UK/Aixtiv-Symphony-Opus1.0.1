# Wing Directory

## Purpose

The Wing directory serves as the orchestration and workflow management component of the ASOOS system. It coordinates operations across various agent components while maintaining separation from website-specific content.

## Relationship to domain-management

The Wing directory works alongside the `domain-management` directory but with a clear separation of concerns:

- **domain-management**: Contains all website-related content (such as drgrant.ai, drlucy.live) and their associated resources, pilots, squadrons, domains, characters, brands, and other related systems.
- **wing**: Focuses exclusively on workflows and orchestration of agents, without directly managing website content.

## Directory Structure

```
/wing/
├── workflows/    # Contains orchestration workflows for pilots and agents
├── config/       # Configuration files for Wing components
├── pilots/       # Pilot-related resources (non-website specific)
├── squadrons/    # Squadron organization structure
└── logs/         # Log files for Wing operations
```

## Current Contents

- **workflows/**
  - `day2-pilot-upgrade-workflow.js` - Handles the upgrade process for pilot agents

- **logs/**
  - `pilot-upgrade.log` - Log files for the pilot upgrade process

## Migration Notes

The Wing directory was formerly known as the "day2" directory and has been reorganized to better reflect its role in the system architecture. All website-specific content remains in the `domain-management` directory to maintain system integrity.

## Integration Points

The Wing directory orchestrates with:

1. **Agent Framework** (in integration-gateway): Interfaces with the AIXTIVAgent class and related components
2. **Squadron Structure**: Coordinates with the squadron types (R1_CORE, R2_DEPLOY, R3_ENGAGE, etc.)
3. **Domain Management**: Works with domain-management components through clearly defined interfaces without directly modifying website content

## Future Development

Future development in the Wing directory should:

1. Maintain the separation of concerns (orchestration vs. website content)
2. Add new workflows in the appropriate subdirectories
3. Document integration points with other system components
4. Follow the established aviation metaphor (wing → squadrons → pilots)

