/**
 * R2 Deploy Agency - Pilot Configuration
 * Responsible for deployment operations and system orchestration
 */

module.exports = {
  // Agency information
  agency: {
    name: "R2 Deploy Agency",
    code: "R2_DEPLOY",
    description: "Deployment and orchestration of AI systems",
    priority: 2
  },

  // Team structure
  personnel: {
    lead: {
      name: "Dr. Grant",
      certifications: ["Tower-L4", "Deploy-Master", "System-Orchestrator"],
      specialization: "Deployment Architecture"
    },
    team: [
      {
        name: "Dr. Memoria",
        certifications: ["Tower-L3", "Memory-Systems"],
        specialization: "Memory Optimization"
      },
      {
        name: "Dr. Circuit",
        certifications: ["Tower-L3", "Integration-Specialist"],
        specialization: "System Integration"
      }
    ]
  },

  // Core capabilities
  capabilities: {
    primary: [
      "systemDeployment",
      "infrastructureOrchestration", 
      "integrationManagement",
      "performanceOptimization",
      "scalabilityPlanning"
    ],
    secondary: [
      "securityHardening",
      "resourceAllocation",
      "deploymentTesting"
    ]
  },

  // Integration points
  integrations: {
    primary: [
      {
        system: "Dream-Commander",
        access: "partial",
        endpoints: ["deployment-api", "orchestration-engine"]
      },
      {
        system: "Wish-Vision",
        access: "full",
        endpoints: ["deployment-visualization", "infrastructure-mapping"]
      },
      {
        system: "Tower-Blockchain",
        access: "write",
        endpoints: ["deployment-certification", "system-verification"]
      }
    ],
    secondary: [
      {
        system: "Queen-Mark-Mints",
        access: "read",
        endpoints: ["deployment-validation"]
      }
    ]
  },

  // Training requirements
  training: {
    required: [
      "Tower-Deployment-Foundations",
      "Wish-Vision-Advanced",
      "System-Orchestration-L2",
      "Integration-Framework-L3"
    ],
    recommended: [
      "Advanced-Performance-Tuning",
      "Scalability-Architecture",
      "Security-In-Deployment"
    ],
    certificationPath: "deploy/Tower-Deployment-Track",
    refreshInterval: "biannual"
  },

  // Operational parameters
  operations: {
    empathyBaselineRequired: 82,
    infrastructureCompetency: 95,
    deploymentClearance: "L4",
    auditFrequency: "bimonthly"
  }
};

