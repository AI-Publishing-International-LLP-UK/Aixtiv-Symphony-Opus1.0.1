import React, { useState } from 'react';

const S2DOIntegrationMap = () => {
  const [activeNode, setActiveNode] = useState(null);
  
  const phases = [
    { id: 'foundation', name: 'Foundation', color: '#4285F4', keyCapability: 'Verification' },
    { id: 'expansion', name: 'Expansion', color: '#EA4335', keyCapability: 'Intelligence' },
    { id: 'advanced', name: 'Advanced', color: '#FBBC05', keyCapability: 'Optimization' },
    { id: 'convergence', name: 'Convergence', color: '#34A853', keyCapability: 'Integration' },
    { id: 'ambient', name: 'Ambient', color: '#673AB7', keyCapability: 'Anticipation' },
    { id: 'transcendent', name: 'Transcendent', color: '#9C27B0', keyCapability: 'Symbiosis' }
  ];
  
  const integrationNodes = [
    { 
      id: 'verification', 
      name: 'Unified Verification Layer',
      description: 'Provides authentication, validation, and blockchain-based verification across all system capabilities.',
      phaseOrigin: 'foundation',
      connections: ['intelligence', 'optimization', 'integration', 'anticipation', 'symbiosis'],
      xPos: 1, 
      yPos: 0
    },
    { 
      id: 'intelligence', 
      name: 'Cognitive Intelligence Layer',
      description: 'Enables AI-assisted analysis, prediction, and creative generation across all business domains.',
      phaseOrigin: 'expansion',
      connections: ['verification', 'optimization', 'integration', 'anticipation', 'symbiosis'],
      xPos: 4, 
      yPos: 0
    },
    { 
      id: 'optimization', 
      name: 'Adaptive Optimization Layer',
      description: 'Continuously improves processes, resources, and workflows based on performance data.',
      phaseOrigin: 'advanced',
      connections: ['verification', 'intelligence', 'integration', 'anticipation', 'symbiosis'],
      xPos: 2, 
      yPos: 2
    },
    { 
      id: 'integration', 
      name: 'Ecosystem Integration Layer',
      description: 'Connects and synchronizes systems, organizations, and platforms into a unified ecosystem.',
      phaseOrigin: 'convergence',
      connections: ['verification', 'intelligence', 'optimization', 'anticipation', 'symbiosis'],
      xPos: 5, 
      yPos: 3
    },
    { 
      id: 'anticipation', 
      name: 'Contextual Anticipation Layer',
      description: 'Proactively prepares resources and responses based on environmental awareness.',
      phaseOrigin: 'ambient',
      connections: ['verification', 'intelligence', 'optimization', 'integration', 'symbiosis'],
      xPos: 0, 
      yPos: 4
    },
    { 
      id: 'symbiosis', 
      name: 'Symbiotic Partnership Layer',
      description: 'Creates deep human-AI partnerships that amplify capabilities and transcend limitations.',
      phaseOrigin: 'transcendent',
      connections: ['verification', 'intelligence', 'optimization', 'integration', 'anticipation'],
      xPos: 3, 
      yPos: 5
    }
  ];
  
  const useAlternatives = [
    {
      capability: 'verification',
      alternatives: [
        { name: 'Document Verification', description: 'S2DO:Verify:Document ensures document authenticity and integrity' },
        { name: 'Identity Authentication', description: 'S2DO:Verify:Identity confirms user identity with multi-factor verification' },
        { name: 'Transaction Validation', description: 'S2DO:Verify:Transaction ensures financial transaction compliance' },
        { name: 'Compliance Certification', description: 'S2DO:Verify:Compliance validates regulatory requirements are met' }
      ]
    },
    {
      capability: 'intelligence',
      alternatives: [
        { name: 'Forecasting & Prediction', description: 'S2DO:Predict:Outcome generates data-driven predictions for business planning' },
        { name: 'Content Generation', description: 'S2DO:Generate:Content creates high-quality business content' },
        { name: 'Decision Support', description: 'S2DO:Analyze:Options provides intelligent decision support' },
        { name: 'Strategic Ideation', description: 'S2DO:Ideate:Strategy facilitates creative strategic thinking' }
      ]
    },
    {
      capability: 'optimization',
      alternatives: [
        { name: 'Process Optimization', description: 'S2DO:Optimize:Process improves business workflow efficiency' },
        { name: 'Resource Allocation', description: 'S2DO:Optimize:Resources ensures optimal resource distribution' },
        { name: 'Performance Tuning', description: 'S2DO:Optimize:Performance enhances system and human performance' },
        { name: 'Cost Reduction', description: 'S2DO:Optimize:Costs identifies and implements cost efficiencies' }
      ]
    },
    {
      capability: 'integration',
      alternatives: [
        { name: 'System Integration', description: 'S2DO:Integrate:Systems connects disparate technology platforms' },
        { name: 'Data Synchronization', description: 'S2DO:Synchronize:Data ensures consistency across all systems' },
        { name: 'Partner Integration', description: 'S2DO:Integrate:Partners establishes secure connections with external entities' },
        { name: 'Workflow Orchestration', description: 'S2DO:Orchestrate:Workflow coordinates complex multi-system processes' }
      ]
    },
    {
      capability: 'anticipation',
      alternatives: [
        { name: 'Need Anticipation', description: 'S2DO:Anticipate:Needs predicts and prepares for future requirements' },
        { name: 'Contextual Adaptation', description: 'S2DO:Contextual:Adapt adjusts operations based on environmental context' },
        { name: 'Proactive Preparation', description: 'S2DO:Anticipate:Change prepares for market and organizational shifts' },
        { name: 'Risk Prevention', description: 'S2DO:Anticipate:Risk identifies and mitigates potential issues before they occur' }
      ]
    },
    {
      capability: 'symbiosis',
      alternatives: [
        { name: 'Co-Creation', description: 'S2DO:Symbiotic:Cocreate enables deep human-AI collaborative creation' },
        { name: 'Cognitive Enhancement', description: 'S2DO:Symbiotic:Amplify expands human cognitive capabilities' },
        { name: 'Consciousness Integration', description: 'S2DO:Consciousness:Integrate merges human and system awareness' },
        { name: 'Reality Transcendence', description: 'S2DO:Transdimensional:Navigate enables movement across reality dimensions' }
      ]
    }
  ];
  
  const getPhaseColor = (phaseId) => {
    return phases.find(phase => phase.id === phaseId)?.color || '#333';
  };
  
  const calculatePosition = (node) => {
    // Grid is 6x6
    const gridSize = 6;
    const cellWidth = 100; // percentage
    const cellHeight = 80; // pixels
    
    const left = (node.xPos / gridSize) * 100 + '%';
    const top = node.yPos * cellHeight + 'px';
    
    return { left, top };
  };
  
  return (
    <div className="p-4 max-w-6xl mx-auto bg-gray-50 rounded-lg shadow-lg">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold mb-2">S2DO Unified Capability Model</h1>
        <p className="text-gray-600">How capabilities from all phases integrate into a single cohesive system</p>
      </div>
      
      <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <p>The S2DO system is designed with a modular architecture where capabilities from all phases work together seamlessly. This integration map shows how core capabilities from different phases complement and enhance each other, creating a unified system greater than the sum of its parts.</p>
        <div className="mt-4 flex flex-wrap gap-3 justify-center">
          {phases.map(phase => (
            <div 
              key={phase.id}
              className="flex items-center gap-2"
            >
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: phase.color }}
              ></div>
              <span>{phase.name}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="relative bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6" style={{ height: '500px' }}>
        {/* Connection lines */}
        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
          {integrationNodes.map(node => 
            node.connections.map(targetId => {
              const targetNode = integrationNodes.find(n => n.id === targetId);
              if (!targetNode) return null;
              
              const sourcePos = calculatePosition(node);
              const targetPos = calculatePosition(targetNode);
              
              // Parse percentage to get numeric value
              const sourceLeft = parseFloat(sourcePos.left) / 100 * 100;
              const targetLeft = parseFloat(targetPos.left) / 100 * 100;
              
              // Parse pixels to get numeric value
              const sourceTop = parseFloat(sourcePos.top) + 25;
              const targetTop = parseFloat(targetPos.top) + 25;
              
              return (
                <line
                  key={`${node.id}-${targetId}`}
                  x1={`${sourceLeft}%`}
                  y1={sourceTop}
                  x2={`${targetLeft}%`}
                  y2={targetTop}
                  stroke={getPhaseColor(node.phaseOrigin)}
                  strokeWidth="2"
                  strokeOpacity="0.5"
                  strokeDasharray={activeNode === node.id || activeNode === targetId ? "none" : "5,5"}
                  style={{ transition: "all 0.3s ease" }}
                />
              );
            })
          )}
        </svg>
        
        {/* Nodes */}
        {integrationNodes.map(node => {
          const position = calculatePosition(node);
          
          return (
            <div
              key={node.id}
              className={`absolute p-2 rounded-lg shadow-md cursor-pointer transition-all duration-300 border-2 ${activeNode === node.id ? 'z-20 scale-110' : 'z-10'}`}
              style={{
                left: position.left,
                top: position.top,
                transform: 'translate(-50%, 0)',
                backgroundColor: 'white',
                borderColor: getPhaseColor(node.phaseOrigin),
                width: '180px',
              }}
              onClick={() => setActiveNode(activeNode === node.id ? null : node.id)}
            >
              <div className="font-bold mb-1 text-center" style={{ color: getPhaseColor(node.phaseOrigin) }}>
                {node.name}
              </div>
              <div className="text-xs text-gray-600">
                {activeNode === node.id ? node.description : `From ${phases.find(p => p.id === node.phaseOrigin)?.name} Phase`}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Use Cases Section */}
      <div className="bg-gray-100 p-4 rounded-lg border border-gray-300 mb-6">
        <h3 className="text-lg font-bold mb-3">Capability Implementation Options</h3>
        <p className="mb-4">Each core capability can be implemented in multiple ways depending on your specific needs:</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeNode ? (
            // Show alternatives for selected capability
            useAlternatives.find(a => a.capability === activeNode)?.alternatives.map((alt, idx) => (
              <div key={idx} className="bg-white p-3 rounded shadow-sm border border-gray-200">
                <div className="font-semibold mb-1">{alt.name}</div>
                <div className="text-sm text-gray-600">{alt.description}</div>
              </div>
            ))
          ) : (
            // Show message when no capability is selected
            <div className="md:col-span-2 text-center py-6 text-gray-500">
              Select a capability node above to see implementation options
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-lg font-bold mb-2 text-blue-800">Integrated System Architecture</h3>
        <p>The S2DO system architecture allows capabilities from all phases to be utilized immediately, regardless of their original development timeline. This is possible because:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>All capabilities share the same foundational verification layer</li>
          <li>Common data models enable seamless information exchange</li>
          <li>Standardized APIs allow any capability to interact with any other</li>
          <li>The modular design lets you implement only what you need</li>
          <li>Future compatibility is built into every component</li>
        </ul>
      </div>
    </div>
  );
};

export default S2DOIntegrationMap;
