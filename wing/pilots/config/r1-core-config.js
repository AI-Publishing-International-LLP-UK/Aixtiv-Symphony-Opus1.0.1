/**
 * R1 Core Agency - Pilot Configuration
 * Responsible for core AI integration and foundation services
 */

module.exports = {
  // Agency information
  agency: {
    name: "R1 Core Agency",
    code: "R1_CORE",
    description: "Foundation AI services and core integration capabilities",
    priority: 1
  },

  // Team structure
  personnel: {
    lead: {
      name: "Dr. Lucy",
      certifications: ["Tower-L4", "Vision-Core", "Dream-L3"],
      specialization: "Core AI Systems"
    },
    team: [
      {
        name: "Dr. Claude",
        certifications: ["Tower-L3", "Symmetry-Advanced"],
        specialization: "Advanced Reasoning"
      },
      {
        name: "Dr. Roark",
        certifications: ["Tower-L3", "Foundation-Builder"],
        specialization: "System Architecture"
      }
    ]
  },

  // Core capabilities
  capabilities: {
    primary: [
      "foundationModeling",
      "logicalReasoning",
      "systemDesign",
      "coreAIIntegration",
      "symmetryProcessing"
    ],
    secondary: [
      "dataAnalysis",
      "securityFramework",
      "visionInterpretation"
    ]
  },

  // Integration points
  integrations: {
    primary: [
      {
        system: "Dream-Commander",
        access: "full",
        endpoints: ["core-api", "reasoning-engine", "foundation-models"]
      },
      {
        system: "Vision-Lake",
        access: "read",
        endpoints: ["core-vision", "pattern-recognition"]
      },
      {
        system: "Tower-Blockchain",
        access: "write",
        endpoints: ["achievement-records", "certification-validation"]
      }
    ],
    secondary: [
      {
        system: "AI-Rewards",
        access: "limited",
        endpoints: ["points-allocation"]
      }
    ]
  },

  // Training requirements
  training: {
    required: [
      "Tower-Core-Foundations",
      "Vision-Basic-Integration",
      "Dream-Command-Basics",
      "Ethics-Framework-L2"
    ],
    recommended: [
      "Advanced-System-Design",
      "Reasoning-Enhancement",
      "Blockchain-Integration"
    ],
    certificationPath: "core/Tower-Certificate-Track",
    refreshInterval: "quarterly"
  },

  // Operational parameters
  operations: {
    empathyBaselineRequired: 87,
    reasoningThreshold: 92,
    deploymentClearance: "L3",
    auditFrequency: "monthly"
  }
};

