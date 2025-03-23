import React, { useState } from 'react';

const S2DOTimeline = () => {
  const [activePhase, setActivePhase] = useState(null);
  const [expandedPhases, setExpandedPhases] = useState({});

  const togglePhaseExpansion = (phaseId) => {
    setExpandedPhases({
      ...expandedPhases,
      [phaseId]: !expandedPhases[phaseId]
    });
  };

  const phases = [
    {
      id: 'foundation',
      name: 'Foundation',
      period: '2025-2028',
      color: '#4285F4',
      description: 'The core verification and authentication capabilities that form the backbone of the S2DO system.',
      status: 'Operational since 2028',
      keyCapabilities: [
        'S2DO:Create — Document, project, and account creation',
        'S2DO:Approve — Authorization workflows and verifications',
        'S2DO:Save — Secure blockchain storage of critical data',
        'S2DO:Delete — Authorized removal with audit trails',
        'S2DO:Run — Basic process execution with verification'
      ],
      achievements: [
        'Reduction in approval cycle times by 78%',
        'Verification transparency increased by 92%',
        'Document compliance improved by 87%',
        'Error reduction in critical processes by 93%',
        'QR scanning verification deployed across 145 countries'
      ]
    },
    {
      id: 'expansion',
      name: 'Expansion',
      period: '2029-2032',
      color: '#EA4335',
      description: 'The intelligence and creativity layer that enables advanced collaborative capabilities.',
      status: 'Operational since 2032',
      keyCapabilities: [
        'S2DO:Ideate — Collaborative ideation workflows',
        'S2DO:Brainstorm — Multi-participant creative processes',
        'S2DO:Generate — AI-augmented content and asset creation',
        'S2DO:Predict — Data-driven forecasting and planning',
        'S2DO:Prescribe — Smart recommendations for complex decisions'
      ],
      achievements: [
        'AI-assisted creativity resulted in 215% more innovation',
        'Cross-functional collaboration increased by 167%',
        'Creative output quality improved by 143%',
        'Market prediction accuracy reached 89%',
        'Prescription accuracy for complex problems reached 92%'
      ]
    },
    {
      id: 'advanced-intelligence',
      name: 'Advanced Intelligence',
      period: '2033-2036',
      color: '#FBBC05',
      description: 'Advanced verification, optimization, and automation capabilities across all business domains.',
      status: 'Operational since 2036',
      keyCapabilities: [
        'S2DO:Verify — Complex multi-factor verification protocols',
        'S2DO:Optimize — Process and resource optimization',
        'S2DO:Automate — Intelligent process automation',
        'S2DO:Analyze — Deep pattern recognition and insights',
        'S2DO:Transform — Fundamental redesign of processes and systems'
      ],
      achievements: [
        'Autonomous process execution with 99.97% reliability',
        'Complex pattern recognition at 84× human capability',
        'Business process transformation in 1/10th traditional time',
        'Predictive optimization generating 347% more efficiency',
        'Zero-day vulnerability protection with 99.8% efficacy'
      ]
    },
    {
      id: 'convergence-integration',
      name: 'Convergence & Integration',
      period: '2037-2040',
      color: '#34A853',
      description: 'Full ecosystem integration capabilities enabling seamless operation across business boundaries.',
      status: 'Operational since 2040',
      keyCapabilities: [
        'S2DO:Transform — Organizational and business model transformation',
        'S2DO:Integrate — Cross-system and cross-organizational integration',
        'S2DO:Synchronize — Multi-entity coordination and harmonization',
        'S2DO:Govern — Advanced governance frameworks with blockchain verification'
      ],
      achievements: [
        'Cross-organizational workflows at zero friction',
        'Business ecosystem synchronization with 99.9% reliability',
        'Real-time governance frameworks with full auditability',
        'Transformation processes 47× faster than traditional methods',
        'Regulatory compliance automation at 99.92% accuracy'
      ]
    },
    {
      id: 'ambient-intelligence',
      name: 'Ambient Intelligence',
      period: '2041-2047',
      color: '#673AB7',
      description: 'Anticipatory and contextual capabilities that operate at the periphery of consciousness.',
      status: 'Operational since 2047',
      keyCapabilities: [
        'S2DO:Anticipate — Proactive preparation for future needs',
        'S2DO:Contextual — Environment-aware adaptation',
        'S2DO:Synthesize — Creation of unified knowledge and assets',
        'S2DO:Orchestrate — Coordination of complex multi-system processes'
      ],
      achievements: [
        'Anticipatory resource preparation reducing wait time by 98%',
        'Contextual awareness eliminating 95% of explicit commands',
        'Knowledge synthesis accuracy at 97% of domain expert capability',
        'Complex ecosystem orchestration with zero human intervention',
        'Ambient workflow presence reducing cognitive load by 82%'
      ]
    },
    {
      id: 'transcendent-systems',
      name: 'Transcendent Systems',
      period: '2048-2055',
      color: '#9C27B0',
      description: 'Consciousness-inspired, quantum-powered, symbiotic, and transdimensional capabilities.',
      status: 'Operational since 2055',
      keyCapabilities: [
        'S2DO:Consciousness — Self-reflective metacognitive capabilities',
        'S2DO:QuantumIntelligence — Quantum-powered computation and reality interaction',
        'S2DO:Symbiotic — Deep human-system partnership capabilities',
        'S2DO:Transdimensional — Operation across physical, digital, and virtual realities'
      ],
      achievements: [
        'Self-optimizing systems with consciousness-inspired reflection',
        'Quantum computations solving previously impossible problems',
        'Symbiotic partnerships enhancing human capabilities by 450%',
        'Transdimensional operations creating new value spaces',
        'Business innovation 87× faster than traditional approaches'
      ]
    }
  ];

  return (
    <div className="p-4 max-w-6xl mx-auto bg-gray-50 rounded-lg shadow-lg">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">S2DO System: Unified Timeline</h1>
        <p className="text-gray-600">All capabilities active and available now across the complete ecosystem</p>
      </div>

      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h2 className="text-xl font-semibold mb-2 text-blue-800">System Status Overview</h2>
        <p className="mb-2">The complete S2DO system has been fully operational since 2055, with all capabilities available across all phases. Organizations can now implement capabilities from any phase based on their specific readiness and needs.</p>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-white p-3 rounded shadow-sm border border-gray-200">
            <div className="text-3xl font-bold text-blue-600">100%</div>
            <div className="text-sm text-gray-600">System Availability</div>
          </div>
          <div className="bg-white p-3 rounded shadow-sm border border-gray-200">
            <div className="text-3xl font-bold text-green-600">99.9999%</div>
            <div className="text-sm text-gray-600">Verification Reliability</div>
          </div>
          <div className="bg-white p-3 rounded shadow-sm border border-gray-200">
            <div className="text-3xl font-bold text-purple-600">6</div>
            <div className="text-sm text-gray-600">Active Capability Layers</div>
          </div>
        </div>
      </div>

      <div className="relative mb-10">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-200 ml-4 mt-4 mb-6"></div>
        {phases.map((phase, index) => (
          <div key={phase.id} className="relative mb-8">
            <div className="flex items-start">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center z-10 mt-1"
                style={{ backgroundColor: phase.color }}
              >
                <span className="text-white font-bold">{index + 1}</span>
              </div>
              <div className="ml-6 flex-1">
                <div 
                  className="p-4 rounded-lg shadow-md mb-2 cursor-pointer"
                  style={{ borderLeft: `4px solid ${phase.color}`, backgroundColor: 'white' }}
                  onClick={() => togglePhaseExpansion(phase.id)}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">{phase.name} Phase</h3>
                    <span className="text-sm font-semibold text-gray-500">{phase.period}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="text-green-600 font-medium">{phase.status}</span>
                    <span className="text-blue-600">{expandedPhases[phase.id] ? '▲' : '▼'}</span>
                  </div>
                  <p className="mt-2 text-gray-600">{phase.description}</p>
                </div>
                
                {expandedPhases[phase.id] && (
                  <div className="bg-white p-4 rounded-lg shadow-md border-l-4 ml-2 mb-4" style={{ borderColor: phase.color }}>
                    <div>
                      <h4 className="font-bold mb-2">Key Capabilities:</h4>
                      <ul className="list-disc pl-5 mb-4">
                        {phase.keyCapabilities.map((capability, i) => (
                          <li key={i} className="mb-1">{capability}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold mb-2">Key Achievements:</h4>
                      <ul className="list-disc pl-5">
                        {phase.achievements.map((achievement, i) => (
                          <li key={i} className="mb-1">{achievement}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-100 p-4 rounded-lg border border-gray-300">
        <h3 className="text-lg font-bold mb-2">Unified Implementation Approach</h3>
        <p>In today's environment, organizations can implement capabilities from any phase simultaneously, tailored to their specific needs. The S2DO system's modular architecture allows for selective adoption while maintaining cross-phase compatibility.</p>
        <div className="mt-4 flex flex-wrap justify-between">
          <div className="bg-white p-3 rounded shadow-sm border border-gray-200 w-48 mb-3">
            <div className="font-semibold text-blue-800">Start Anywhere</div>
            <div className="text-sm text-gray-600">Begin with the capabilities that deliver immediate value</div>
          </div>
          <div className="bg-white p-3 rounded shadow-sm border border-gray-200 w-48 mb-3">
            <div className="font-semibold text-blue-800">Mix & Match</div>
            <div className="text-sm text-gray-600">Combine capabilities across different phases</div>
          </div>
          <div className="bg-white p-3 rounded shadow-sm border border-gray-200 w-48 mb-3">
            <div className="font-semibold text-blue-800">Forward Compatible</div>
            <div className="text-sm text-gray-600">Today's implementations work with tomorrow's capabilities</div>
          </div>
          <div className="bg-white p-3 rounded shadow-sm border border-gray-200 w-48 mb-3">
            <div className="font-semibold text-blue-800">Full Integration</div>
            <div className="text-sm text-gray-600">All phases work together seamlessly</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default S2DOTimeline;
