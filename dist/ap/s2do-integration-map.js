import React, { useState } from 'react';

const S2DOIntegrationMap = () => {
  const [activeNode, setActiveNode] = useState(null);

  const phases = [
    {
      id: 'foundation',
      name: 'Foundation',
      color: '#4285F4',
      keyCapability: 'Verification',
    },
    {
      id: 'expansion',
      name: 'Expansion',
      color: '#EA4335',
      keyCapability: 'Intelligence',
    },
    {
      id: 'advanced',
      name: 'Advanced',
      color: '#FBBC05',
      keyCapability: 'Optimization',
    },
    {
      id: 'convergence',
      name: 'Convergence',
      color: '#34A853',
      keyCapability: 'Integration',
    },
    {
      id: 'ambient',
      name: 'Ambient',
      color: '#673AB7',
      keyCapability: 'Anticipation',
    },
    {
      id: 'transcendent',
      name: 'Transcendent',
      color: '#9C27B0',
      keyCapability: 'Symbiosis',
    },
  ];

  const integrationNodes = [
    {
      id: 'verification',
      name: 'Unified Verification Layer',
      description:
        'Provides authentication, validation, and blockchain-based verification across all system capabilities.',
      phaseOrigin: 'foundation',
      connections: [
        'intelligence',
        'optimization',
        'integration',
        'anticipation',
        'symbiosis',
      ],
      xPos,
      yPos,
    },
    {
      id: 'intelligence',
      name: 'Cognitive Intelligence Layer',
      description:
        'Enables AI-assisted analysis, prediction, and creative generation across all business domains.',
      phaseOrigin: 'expansion',
      connections: [
        'verification',
        'optimization',
        'integration',
        'anticipation',
        'symbiosis',
      ],
      xPos,
      yPos,
    },
    {
      id: 'optimization',
      name: 'Adaptive Optimization Layer',
      description:
        'Continuously improves processes, resources, and workflows based on performance data.',
      phaseOrigin: 'advanced',
      connections: [
        'verification',
        'intelligence',
        'integration',
        'anticipation',
        'symbiosis',
      ],
      xPos,
      yPos,
    },
    {
      id: 'integration',
      name: 'Ecosystem Integration Layer',
      description:
        'Connects and synchronizes systems, organizations, and platforms into a unified ecosystem.',
      phaseOrigin: 'convergence',
      connections: [
        'verification',
        'intelligence',
        'optimization',
        'anticipation',
        'symbiosis',
      ],
      xPos,
      yPos,
    },
    {
      id: 'anticipation',
      name: 'Contextual Anticipation Layer',
      description:
        'Proactively prepares resources and responses based on environmental awareness.',
      phaseOrigin: 'ambient',
      connections: [
        'verification',
        'intelligence',
        'optimization',
        'integration',
        'symbiosis',
      ],
      xPos,
      yPos,
    },
    {
      id: 'symbiosis',
      name: 'Symbiotic Partnership Layer',
      description:
        'Creates deep human-AI partnerships that amplify capabilities and transcend limitations.',
      phaseOrigin: 'transcendent',
      connections: [
        'verification',
        'intelligence',
        'optimization',
        'integration',
        'anticipation',
      ],
      xPos,
      yPos,
    },
  ];

  const useAlternatives = [
    {
      capability: 'verification',
      alternatives: [
        {
          name: 'Document Verification',
          description:
            'S2DO:Verify:Document ensures document authenticity and integrity',
        },
        {
          name: 'Identity Authentication',
          description:
            'S2DO:Verify:Identity confirms user identity with multi-factor verification',
        },
        {
          name: 'Transaction Validation',
          description:
            'S2DO:Verify:Transaction ensures financial transaction compliance',
        },
        {
          name: 'Compliance Certification',
          description:
            'S2DO:Verify:Compliance validates regulatory requirements are met',
        },
      ],
    },
    {
      capability: 'intelligence',
      alternatives: [
        {
          name: 'Forecasting & Prediction',
          description:
            'S2DO:Predict:Outcome generates data-driven predictions for business planning',
        },
        {
          name: 'Content Generation',
          description:
            'S2DO:Generate:Content creates high-quality business content',
        },
        {
          name: 'Decision Support',
          description:
            'S2DO:Analyze:Options provides intelligent decision support',
        },
        {
          name: 'Strategic Ideation',
          description:
            'S2DO:Ideate:Strategy facilitates creative strategic thinking',
        },
      ],
    },
    {
      capability: 'optimization',
      alternatives: [
        {
          name: 'Process Optimization',
          description:
            'S2DO:Optimize:Process improves business workflow efficiency',
        },
        {
          name: 'Resource Allocation',
          description:
            'S2DO:Optimize:Resources ensures optimal resource distribution',
        },
        {
          name: 'Performance Tuning',
          description:
            'S2DO:Optimize:Performance enhances system and human performance',
        },
        {
          name: 'Cost Reduction',
          description:
            'S2DO:Optimize:Costs identifies and implements cost efficiencies',
        },
      ],
    },
    {
      capability: 'integration',
      alternatives: [
        {
          name: 'System Integration',
          description:
            'S2DO:Integrate:Systems connects disparate technology platforms',
        },
        {
          name: 'Data Synchronization',
          description:
            'S2DO:Synchronize:Data ensures consistency across all systems',
        },
        {
          name: 'Partner Integration',
          description:
            'S2DO:Integrate:Partners establishes secure connections with external entities',
        },
        {
          name: 'Workflow Orchestration',
          description:
            'S2DO:Orchestrate:Workflow coordinates complex multi-system processes',
        },
      ],
    },
    {
      capability: 'anticipation',
      alternatives: [
        {
          name: 'Need Anticipation',
          description:
            'S2DO:Anticipate:Needs predicts and prepares for future requirements',
        },
        {
          name: 'Contextual Adaptation',
          description:
            'S2DO:Contextual:Adapt adjusts operations based on environmental context',
        },
        {
          name: 'Proactive Preparation',
          description:
            'S2DO:Anticipate:Change prepares for market and organizational shifts',
        },
        {
          name: 'Risk Prevention',
          description:
            'S2DO:Anticipate:Risk identifies and mitigates potential issues before they occur',
        },
      ],
    },
    {
      capability: 'symbiosis',
      alternatives: [
        {
          name: 'Co-Creation',
          description:
            'S2DO:Symbiotic:Cocreate enables deep human-AI collaborative creation',
        },
        {
          name: 'Cognitive Enhancement',
          description:
            'S2DO:Symbiotic:Amplify expands human cognitive capabilities',
        },
        {
          name: 'Consciousness Integration',
          description:
            'S2DO:Consciousness:Integrate merges human and system awareness',
        },
        {
          name: 'Reality Transcendence',
          description:
            'S2DO:Transdimensional:Navigate enables movement across reality dimensions',
        },
      ],
    },
  ];

  const getPhaseColor = phaseId => {
    return phases.find(phase => phase.id === phaseId)?.color || '#333';
  };

  const calculatePosition = node => {
    // Grid is 6x6
    const gridSize = 6;
    const cellWidth = 100; // percentage
    const cellHeight = 80; // pixels

    const left = (node.xPos / gridSize) * 100 + '%';
    const top = node.yPos * cellHeight + 'px';

    return { left, top };
  };

  return (
    
      
        
          S2DO Unified Capability Model
        
        
          How capabilities from all phases integrate into a single cohesive
          system
        
      

      
        
          The S2DO system is designed with a modular architecture where
          capabilities from all phases work together seamlessly. This
          integration map shows how core capabilities from different phases
          complement and enhance each other, creating a unified system greater
          than the sum of its parts.
        
        
          {phases.map(phase => (
            
              
              {phase.name}
            
          ))}
        
      

      
        {/* Connection lines */}
        
          {integrationNodes.map(node =>
            node.connections.map(targetId => {
              const targetNode = integrationNodes.find(n => n.id === targetId);
              if (!targetNode) return null;

              const sourcePos = calculatePosition(node);
              const targetPos = calculatePosition(targetNode);

              // Parse percentage to get numeric value
              const sourceLeft = (parseFloat(sourcePos.left) / 100) * 100;
              const targetLeft = (parseFloat(targetPos.left) / 100) * 100;

              // Parse pixels to get numeric value
              const sourceTop = parseFloat(sourcePos.top) + 25;
              const targetTop = parseFloat(targetPos.top) + 25;

              return (
                
              );
            })
          )}
        

        {/* Nodes */}
        {integrationNodes.map(node => {
          const position = calculatePosition(node);

          return (
            
                setActiveNode(activeNode === node.id ? null )
              }
            >
              
                {node.name}
              
              
                {activeNode === node.id
                  ? node.description
                  : `From ${phases.find(p => p.id === node.phaseOrigin)?.name} Phase`}
              
            
          );
        })}
      

      {/* Use Cases Section */}
      
        
          Capability Implementation Options
        
        
          Each core capability can be implemented in multiple ways depending on
          your specific needs:
        

        
          {activeNode ? (
            // Show alternatives for selected capability
            useAlternatives
              .find(a => a.capability === activeNode)
              ?.alternatives.map((alt, idx) => (
                
                  {alt.name}
                  {alt.description}
                
              ))
          ) : (
            // Show message when no capability is selected
            
              Select a capability node above to see implementation options
            
          )}
        
      

      
        
          Integrated System Architecture
        
        
          The S2DO system architecture allows capabilities from all phases to be
          utilized immediately, regardless of their original development
          timeline. This is possible because:
        
        
          
            All capabilities share the same foundational verification layer
          
          Common data models enable seamless information exchange
          
            Standardized APIs allow any capability to interact with any other
          
          The modular design lets you implement only what you need
          Future compatibility is built into every component
        
      
    
  );
};

export default S2DOIntegrationMap;
