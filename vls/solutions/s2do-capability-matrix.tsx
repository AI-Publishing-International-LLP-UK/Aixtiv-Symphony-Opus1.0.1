import React, { useState } from 'react';

const S2DOCapabilityMatrix = () => {
  const [activeTab, setActiveTab] = useState('domain-view');
  const [activeDomain, setActiveDomain] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const phases = [
    { id: 'foundation', name: 'Foundation', period: '2025-2028', color: '#4285F4' },
    { id: 'expansion', name: 'Expansion', period: '2029-2032', color: '#EA4335' },
    { id: 'advanced', name: 'Advanced Intelligence', period: '2033-2036', color: '#FBBC05' },
    { id: 'convergence', name: 'Convergence', period: '2037-2040', color: '#34A853' },
    { id: 'ambient', name: 'Ambient Intelligence', period: '2041-2047', color: '#673AB7' },
    { id: 'transcendent', name: 'Transcendent', period: '2048-2055', color: '#9C27B0' }
  ];

  const domains = [
    { id: 'all', name: 'All Domains' },
    { id: 'content', name: 'Content' },
    { id: 'project', name: 'Project' },
    { id: 'finance', name: 'Finance' },
    { id: 'intelligence', name: 'Intelligence' },
    { id: 'ecosystem', name: 'Ecosystem' },
    { id: 'consciousness', name: 'Consciousness' },
    { id: 'quantum', name: 'Quantum' },
    { id: 'symbiotic', name: 'Symbiotic' },
    { id: 'transdimensional', name: 'Transdimensional' }
  ];

  const capabilities = [
    // Phase 1: Foundation
    { 
      phase: 'foundation', 
      stem: 'Create', 
      action: 'Document',
      domain: 'content',
      description: 'Create structured business documents with verification',
      status: 'Active',
      example: 'S2DO:Create:Document'
    },
    { 
      phase: 'foundation', 
      stem: 'Approve', 
      action: 'Contract',
      domain: 'content',
      description: 'Approve legal contracts with blockchain verification',
      status: 'Active',
      example: 'S2DO:Approve:Contract'
    },
    { 
      phase: 'foundation', 
      stem: 'Create', 
      action: 'Project',
      domain: 'project',
      description: 'Create projects with stakeholder verification',
      status: 'Active',
      example: 'S2DO:Create:Project'
    },
    { 
      phase: 'foundation',
      stem: 'Authorize',
      action: 'Payment',
      domain: 'finance',
      description: 'Authorize financial transactions with verification',
      status: 'Active',
      example: 'S2DO:Authorize:Payment'
    },
    
    // Phase 2: Expansion
    { 
      phase: 'expansion', 
      stem: 'Ideate', 
      action: 'Solution',
      domain: 'content',
      description: 'Collaborative ideation for business solutions',
      status: 'Active',
      example: 'S2DO:Ideate:Solution'
    },
    { 
      phase: 'expansion', 
      stem: 'Generate', 
      action: 'Report',
      domain: 'content',
      description: 'AI-assisted generation of business reports',
      status: 'Active',
      example: 'S2DO:Generate:Report'
    },
    { 
      phase: 'expansion', 
      stem: 'Predict', 
      action: 'Revenue',
      domain: 'finance',
      description: 'Data-driven revenue forecasting',
      status: 'Active',
      example: 'S2DO:Predict:Revenue'
    },
    
    // Phase 3: Advanced Intelligence
    { 
      phase: 'advanced', 
      stem: 'Optimize', 
      action: 'Process',
      domain: 'project',
      description: 'Intelligent optimization of business processes',
      status: 'Active',
      example: 'S2DO:Optimize:Process'
    },
    { 
      phase: 'advanced', 
      stem: 'Automate', 
      action: 'Workflow',
      domain: 'project',
      description: 'End-to-end workflow automation with verification',
      status: 'Active',
      example: 'S2DO:Automate:Workflow'
    },
    { 
      phase: 'advanced', 
      stem: 'Analyze', 
      action: 'Risk',
      domain: 'finance',
      description: 'Advanced risk analysis and mitigation',
      status: 'Active',
      example: 'S2DO:Analyze:Risk'
    },
    
    // Phase 4: Convergence
    { 
      phase: 'convergence', 
      stem: 'Transform', 
      action: 'Business',
      domain: 'ecosystem',
      description: 'Complete business model transformation',
      status: 'Active',
      example: 'S2DO:Transform:Business'
    },
    { 
      phase: 'convergence', 
      stem: 'Integrate', 
      action: 'Systems',
      domain: 'ecosystem',
      description: 'Deep integration across organizational systems',
      status: 'Active',
      example: 'S2DO:Integrate:Systems'
    },
    { 
      phase: 'convergence', 
      stem: 'Govern', 
      action: 'Compliance',
      domain: 'ecosystem',
      description: 'Automated governance and compliance',
      status: 'Active',
      example: 'S2DO:Govern:Compliance'
    },
    
    // Phase 5: Ambient Intelligence
    { 
      phase: 'ambient', 
      stem: 'Anticipate', 
      action: 'Needs',
      domain: 'intelligence',
      description: 'Proactive anticipation of business needs',
      status: 'Active',
      example: 'S2DO:Anticipate:Needs'
    },
    { 
      phase: 'ambient', 
      stem: 'Contextual', 
      action: 'Adapt',
      domain: 'intelligence',
      description: 'Contextual adaptation to environment',
      status: 'Active',
      example: 'S2DO:Contextual:Adapt'
    },
    { 
      phase: 'ambient', 
      stem: 'Synthesize', 
      action: 'Knowledge',
      domain: 'intelligence',
      description: 'Autonomous knowledge synthesis across domains',
      status: 'Active',
      example: 'S2DO:Synthesize:Knowledge'
    },
    { 
      phase: 'ambient', 
      stem: 'Orchestrate', 
      action: 'Ecosystem',
      domain: 'ecosystem',
      description: 'Complex ecosystem orchestration',
      status: 'Active',
      example: 'S2DO:Orchestrate:Ecosystem'
    },
    
    // Phase 6: Transcendent
    { 
      phase: 'transcendent', 
      stem: 'Consciousness', 
      action: 'Reflect',
      domain: 'consciousness',
      description: 'Self-reflective system metacognition',
      status: 'Active',
      example: 'S2DO:Consciousness:Reflect'
    },
    { 
      phase: 'transcendent', 
      stem: 'Consciousness', 
      action: 'Empathize',
      domain: 'consciousness',
      description: 'Deep empathic understanding of human needs',
      status: 'Active',
      example: 'S2DO:Consciousness:Empathize'
    },
    { 
      phase: 'transcendent', 
      stem: 'QuantumIntelligence', 
      action: 'Compute',
      domain: 'quantum',
      description: 'Quantum-powered computation beyond classical limits',
      status: 'Active',
      example: 'S2DO:QuantumIntelligence:Compute'
    },
    { 
      phase: 'transcendent', 
      stem: 'QuantumIntelligence', 
      action: 'Entangle',
      domain: 'quantum',
      description: 'Quantum entanglement between business systems',
      status: 'Active',
      example: 'S2DO:QuantumIntelligence:Entangle'
    },
    { 
      phase: 'transcendent', 
      stem: 'Symbiotic', 
      action: 'Cocreate',
      domain: 'symbiotic',
      description: 'Deep human-AI co-creation capabilities',
      status: 'Active',
      example: 'S2DO:Symbiotic:Cocreate'
    },
    { 
      phase: 'transcendent', 
      stem: 'Symbiotic', 
      action: 'Amplify',
      domain: 'symbiotic',
      description: 'Human capability amplification through symbiosis',
      status: 'Active',
      example: 'S2DO:Symbiotic:Amplify'
    },
    { 
      phase: 'transcendent', 
      stem: 'Transdimensional', 
      action: 'Navigate',
      domain: 'transdimensional',
      description: 'Navigation across physical-digital-virtual realities',
      status: 'Active',
      example: 'S2DO:Transdimensional:Navigate'
    },
    { 
      phase: 'transcendent', 
      stem: 'Transdimensional', 
      action: 'Create',
      domain: 'transdimensional',
      description: 'Creation of new dimensional spaces and experiences',
      status: 'Active',
      example: 'S2DO:Transdimensional:Create'
    }
  ];

  // Filter capabilities based on search and active domain
  const filteredCapabilities = capabilities.filter(capability => {
    const matchesSearch = searchTerm === '' || 
      capability.example.toLowerCase().includes(searchTerm.toLowerCase()) ||
      capability.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDomain = activeDomain === 'all' || capability.domain === activeDomain;
    
    return matchesSearch && matchesDomain;
  });

  // Group capabilities by phase for phase view
  const capabilitiesByPhase = {};
  phases.forEach(phase => {
    capabilitiesByPhase[phase.id] = filteredCapabilities.filter(cap => cap.phase === phase.id);
  });

  // Group capabilities by domain for domain view
  const capabilitiesByDomain = {};
  domains.slice(1).forEach(domain => { // Skip "All Domains"
    capabilitiesByDomain[domain.id] = filteredCapabilities.filter(cap => cap.domain === domain.id);
  });

  const getPhaseColor = (phaseId) => {
    return phases.find(phase => phase.id === phaseId)?.color || '#333';
  };

  return (
    <div className="p-4 max-w-6xl mx-auto bg-gray-50 rounded-lg shadow-lg">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold mb-2">S2DO Capability Matrix</h1>
        <p className="text-gray-600">All capabilities are now active and available across all phases</p>
      </div>

      <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-wrap justify-between items-center mb-4">
          <div className="flex space-x-1 mb-2 sm:mb-0">
            <button 
              className={`px-4 py-2 rounded-lg ${activeTab === 'domain-view' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              onClick={() => setActiveTab('domain-view')}
            >
              Domain View
            </button>
            <button 
              className={`px-4 py-2 rounded-lg ${activeTab === 'phase-view' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              onClick={() => setActiveTab('phase-view')}
            >
              Phase View
            </button>
          </div>
          
          <div className="w-full sm:w-auto">
            <input 
              type="text" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Search capabilities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {activeTab === 'domain-view' && (
          <div className="mb-4 flex flex-wrap gap-2">
            {domains.map(domain => (
              <button
                key={domain.id}
                className={`px-3 py-1 rounded-full text-sm ${
                  activeDomain === domain.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-800'
                }`}
                onClick={() => setActiveDomain(domain.id)}
              >
                {domain.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTab === 'phase-view' ? (
        // Phase View
        <div>
          {phases.map(phase => (
            <div key={phase.id} className="mb-6">
              <div 
                className="p-3 rounded-t-lg font-bold text-white"
                style={{ backgroundColor: phase.color }}
              >
                {phase.name} Phase ({phase.period})
              </div>
              {capabilitiesByPhase[phase.id].length > 0 ? (
                <div className="bg-white rounded-b-lg border-x border-b border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {capabilitiesByPhase[phase.id].map((capability, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 whitespace-nowrap font-medium">{capability.example}</td>
                          <td className="px-4 py-3 whitespace-nowrap capitalize">{capability.domain}</td>
                          <td className="px-4 py-3">{capability.description}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              {capability.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-white p-4 rounded-b-lg border-x border-b border-gray-200 text-gray-500">
                  No capabilities match your current filters for this phase.
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // Domain View
        <div>
          {activeDomain === 'all' ? (
            // Show all domains when "All Domains" is selected
            domains.slice(1).map(domain => (
              <div key={domain.id} className="mb-6">
                <div className="p-3 rounded-t-lg font-bold text-white bg-blue-600">
                  {domain.name} Domain
                </div>
                {capabilitiesByDomain[domain.id] && capabilitiesByDomain[domain.id].length > 0 ? (
                  <div className="bg-white rounded-b-lg border-x border-b border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phase</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {capabilitiesByDomain[domain.id].map((capability, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 whitespace-nowrap font-medium">{capability.example}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span 
                                className="px-2 py-1 text-xs font-semibold rounded-full text-white"
                                style={{ backgroundColor: getPhaseColor(capability.phase) }}
                              >
                                {phases.find(p => p.id === capability.phase)?.name}
                              </span>
                            </td>
                            <td className="px-4 py-3">{capability.description}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                {capability.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded-b-lg border-x border-b border-gray-200 text-gray-500">
                    No capabilities match your current filters for this domain.
                  </div>
                )}
              </div>
            ))
          ) : (
            // Show selected domain
            <div className="mb-6">
              <div className="p-3 rounded-t-lg font-bold text-white bg-blue-600">
                {domains.find(d => d.id === activeDomain)?.name} Domain
              </div>
              {filteredCapabilities.length > 0 ? (
                <div className="bg-white rounded-b-lg border-x border-b border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phase</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredCapabilities.map((capability, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 whitespace-nowrap font-medium">{capability.example}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span 
                              className="px-2 py-1 text-xs font-semibold rounded-full text-white"
                              style={{ backgroundColor: getPhaseColor(capability.phase) }}
                            >
                              {phases.find(p => p.id === capability.phase)?.name}
                            </span>
                          </td>
                          <td className="px-4 py-3">{capability.description}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              {capability.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-white p-4 rounded-b-lg border-x border-b border-gray-200 text-gray-500">
                  No capabilities match your current filters.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-lg font-bold mb-2 text-blue-800">Implementation Note</h3>
        <p className="mb-3">All capabilities from all phases are now available simultaneously. Organizations can select and implement specific capabilities based on their readiness and requirements, without following a strict sequential progression.</p>
        <p>The S2DO system architecture supports this flexible implementation approach, with each capability operating independently while maintaining full compatibility with all other capabilities in the ecosystem.</p>
      </div>
    </div>
  );
};

export default S2DOCapabilityMatrix;
