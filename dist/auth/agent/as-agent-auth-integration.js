import { User, UserAuthLevel } from './user-auth-types';
import { useAuth } from './use-auth-hook';
import { useState, useEffect } from 'react';

// Define agent access levels based on user authentication
export enum AgentAccessLevel {
  BASIC = 'basic',           // Level 0-1= 'standard',     // Level 2= 'enhanced',     // Level 2.5-2.75= 'full'              // Level 3: Full access to all agents
}

// Define agent types
export enum AgentType {
  ANALYTICAL = 'analytical',
  CREATIVE = 'creative',
  OPERATIONAL = 'operational',
  STRATEGIC = 'strategic',
  SUPPORT = 'support'
}

// Agent 

// Agent cluster for managing groups of agents
export 

// Define the 33 agents with appropriate access levels
export const AGENT_REGISTRY= [
  // Basic Access Level - Available to all users including non-authenticated
  {
    id: 'welcome-guide',
    name: 'Welcome Guide',
    description: 'Introduces new users to the system and provides basic guidance',
    type,
    accessLevel,
    capabilities: ['introduction', 'basic_guidance', 'faq_answers'],
    isActive,
    iconUrl: '/icons/welcome-guide.svg'
  },
  {
    id: 'info-retriever',
    name: 'Information Retriever',
    description: 'Retrieves information from the knowledge base',
    type,
    accessLevel,
    capabilities: ['public_info_retrieval', 'basic_search'],
    isActive,
    iconUrl: '/icons/info-retriever.svg'
  },
  {
    id: 'account-assistant',
    name: 'Account Assistant',
    description: 'Helps users manage their account and authentication',
    type,
    accessLevel,
    capabilities: ['account_help', 'auth_guidance', 'profile_management'],
    isActive,
    iconUrl: '/icons/account-assistant.svg'
  },

  // Standard Access Level - Available to Dr. Grant verified users
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'Analyses and visualizes data for insights',
    type,
    accessLevel,
    capabilities: ['data_analysis', 'visualization', 'pattern_recognition'],
    isActive,
    iconUrl: '/icons/data-analyst.svg'
  },
  {
    id: 'content-creator',
    name: 'Content Creator',
    description: 'Helps users create and edit various types of content',
    type,
    accessLevel,
    capabilities: ['content_generation', 'editing_assistance', 'formatting'],
    isActive,
    iconUrl: '/icons/content-creator.svg'
  },
  {
    id: 'research-assistant',
    name: 'Research Assistant',
    description: 'Assists in research tasks and information gathering',
    type,
    accessLevel,
    capabilities: ['research_planning', 'information_gathering', 'source_evaluation'],
    isActive,
    iconUrl: '/icons/research-assistant.svg'
  },
  {
    id: 'process-optimizer',
    name: 'Process Optimizer',
    description: 'Identifies inefficiencies and suggests improvements',
    type,
    accessLevel,
    capabilities: ['process_analysis', 'optimization_suggestions', 'workflow_improvement'],
    isActive,
    iconUrl: '/icons/process-optimizer.svg'
  },
  {
    id: 'learning-guide',
    name: 'Learning Guide',
    description: 'Helps users learn new skills and concepts',
    type,
    accessLevel,
    capabilities: ['learning_path_creation', 'concept_explanation', 'progress_tracking'],
    isActive,
    iconUrl: '/icons/learning-guide.svg'
  },
  {
    id: 'collaboration-facilitator',
    name: 'Collaboration Facilitator',
    description: 'Facilitates collaboration between users and teams',
    type,
    accessLevel,
    capabilities: ['meeting_facilitation', 'team_coordination', 'conflict_resolution'],
    isActive,
    iconUrl: '/icons/collaboration-facilitator.svg'
  },
  {
    id: 'task-manager',
    name: 'Task Manager',
    description: 'Helps users manage tasks and projects',
    type,
    accessLevel,
    capabilities: ['task_tracking', 'deadline_management', 'priority_setting'],
    isActive,
    iconUrl: '/icons/task-manager.svg'
  },

  // Enhanced Access Level - Available to Payment Verified & Trial Period users
  {
    id: 'strategy-advisor',
    name: 'Strategy Advisor',
    description: 'Provides strategic advice and planning assistance',
    type,
    accessLevel,
    capabilities: ['strategic_analysis', 'goal_setting', 'planning_assistance'],
    isActive,
    iconUrl: '/icons/strategy-advisor.svg'
  },
  {
    id: 'creative-director',
    name: 'Creative Director',
    description: 'Guides creative projects and provides artistic direction',
    type,
    accessLevel,
    capabilities: ['creative_direction', 'design_guidance', 'aesthetic_evaluation'],
    isActive,
    iconUrl: '/icons/creative-director.svg'
  },
  {
    id: 'problem-solver',
    name: 'Problem Solver',
    description: 'Helps identify and solve complex problems',
    type,
    accessLevel,
    capabilities: ['problem_framing', 'solution_generation', 'decision_analysis'],
    isActive,
    iconUrl: '/icons/problem-solver.svg'
  },
  {
    id: 'market-analyzer',
    name: 'Market Analyzer',
    description: 'Analyzes market trends and competitive landscapes',
    type,
    accessLevel,
    capabilities: ['market_analysis', 'trend_identification', 'competitive_assessment'],
    isActive,
    iconUrl: '/icons/market-analyzer.svg'
  },
  {
    id: 'innovation-catalyst',
    name: 'Innovation Catalyst',
    description: 'Facilitates innovation and creative thinking',
    type,
    accessLevel,
    capabilities: ['idea_generation', 'innovation_facilitation', 'concept_development'],
    isActive,
    iconUrl: '/icons/innovation-catalyst.svg'
  },
  {
    id: 'scenario-planner',
    name: 'Scenario Planner',
    description: 'Helps explore and plan for different future scenarios',
    type,
    accessLevel,
    capabilities: ['scenario_generation', 'future_exploration', 'contingency_planning'],
    isActive,
    iconUrl: '/icons/scenario-planner.svg'
  },
  {
    id: 'customer-insight-agent',
    name: 'Customer Insight Agent',
    description: 'Analyzes customer data for insights and patterns',
    type,
    accessLevel,
    capabilities: ['customer_analysis', 'behavior_insights', 'preference_patterns'],
    isActive,
    iconUrl: '/icons/customer-insight-agent.svg'
  },
  {
    id: 'financial-advisor',
    name: 'Financial Advisor',
    description: 'Provides financial analysis and advice',
    type,
    accessLevel,
    capabilities: ['financial_analysis', 'budget_planning', 'investment_advice'],
    isActive,
    iconUrl: '/icons/financial-advisor.svg'
  },
  {
    id: 'growth-strategist',
    name: 'Growth Strategist',
    description: 'Helps identify and plan for growth opportunities',
    type,
    accessLevel,
    capabilities: ['growth_opportunity_analysis', 'expansion_planning', 'market_entry_strategy'],
    isActive,
    iconUrl: '/icons/growth-strategist.svg'
  },

  // Full Access Level - Available to Fully Registered users only
  {
    id: 'dream-commander',
    name: 'Dream Commander',
    description: 'Master orchestration agent that coordinates all other agents',
    type,
    accessLevel,
    capabilities: ['cross_agent_coordination', 'strategic_orchestration', 'comprehensive_planning', 'autonomous_decision_making'],
    isActive,
    iconUrl: '/icons/dream-commander.svg'
  },
  {
    id: 'executive-coordinator',
    name: 'Executive Coordinator',
    description: 'Provides executive-level coordination and decision support',
    type,
    accessLevel,
    capabilities: ['executive_support', 'strategic_alignment', 'decision_support'],
    isActive,
    iconUrl: '/icons/executive-coordinator.svg'
  },
  {
    id: 'advanced-forecaster',
    name: 'Advanced Forecaster',
    description: 'Provides sophisticated forecasting and predictive modeling',
    type,
    accessLevel,
    capabilities: ['predictive_modeling', 'trend_forecasting', 'scenario_simulation'],
    isActive,
    iconUrl: '/icons/advanced-forecaster.svg'
  },
  {
    id: 'systems-architect',
    name: 'Systems Architect',
    description: 'Designs and optimizes complex systems and processes',
    type,
    accessLevel,
    capabilities: ['system_design', 'architecture_planning', 'integration_optimization'],
    isActive,
    iconUrl: '/icons/systems-architect.svg'
  },
  {
    id: 'transformation-guide',
    name: 'Transformation Guide',
    description: 'Guides organizational and personal transformation processes',
    type,
    accessLevel,
    capabilities: ['change_management', 'transformation_planning', 'adaptation_facilitation'],
    isActive,
    iconUrl: '/icons/transformation-guide.svg'
  },
  {
    id: 'cultural-empathy-coach',
    name: 'Cultural Empathy Coach',
    description: 'Develops cultural intelligence and empathetic understanding',
    type,
    accessLevel,
    capabilities: ['cultural_intelligence', 'empathy_development', 'cross_cultural_facilitation'],
    isActive,
    iconUrl: '/icons/cultural-empathy-coach.svg'
  },
  {
    id: 'wisdom-synthesizer',
    name: 'Wisdom Synthesizer',
    description: 'Synthesizes insights and wisdom from diverse sources',
    type,
    accessLevel,
    capabilities: ['insight_synthesis', 'wisdom_integration', 'knowledge_crystallization'],
    isActive,
    iconUrl: '/icons/wisdom-synthesizer.svg'
  },
  {
    id: 'co-pilot',
    name: 'Co-Pilot',
    description: 'Works alongside the user partner in complex tasks',
    type,
    accessLevel,
    capabilities: ['collaborative_problem_solving', 'real_time_support', 'adaptive_assistance'],
    isActive,
    iconUrl: '/icons/co-pilot.svg'
  },
  {
    id: 'ethical-guardian',
    name: 'Ethical Guardian',
    description: 'Helps ensure ethical considerations in decisions and actions',
    type,
    accessLevel,
    capabilities: ['ethical_analysis', 'value_alignment', 'moral_consideration'],
    isActive,
    iconUrl: '/icons/ethical-guardian.svg'
  },
  {
    id: 'innovation-accelerator',
    name: 'Innovation Accelerator',
    description: 'Accelerates innovation processes and implementation',
    type,
    accessLevel,
    capabilities: ['innovation_acceleration', 'rapid_prototyping', 'implementation_guidance'],
    isActive,
    iconUrl: '/icons/innovation-accelerator.svg'
  },
  {
    id: 'future-navigator',
    name: 'Future Navigator',
    description: 'Helps navigate complex future landscapes and possibilities',
    type,
    accessLevel,
    capabilities: ['future_sensing', 'opportunity_navigation', 'complexity_mapping'],
    isActive,
    iconUrl: '/icons/future-navigator.svg'
  },
  {
    id: 'insight-amplifier',
    name: 'Insight Amplifier',
    description: 'Amplifies and enhances insights from data and information',
    type,
    accessLevel,
    capabilities: ['insight_enhancement', 'pattern_amplification', 'significance_detection'],
    isActive,
    iconUrl: '/icons/insight-amplifier.svg'
  },
  {
    id: 'masterful-communicator',
    name: 'Masterful Communicator',
    description: 'Provides advanced communication support and enhancement',
    type,
    accessLevel,
    capabilities: ['communication_crafting', 'message_optimization', 'audience_adaptation'],
    isActive,
    iconUrl: '/icons/masterful-communicator.svg'
  },
  {
    id: 'lenz',
    name: 'Lenz',
    description: 'Advanced perception and interpretation agent',
    type,
    accessLevel,
    capabilities: ['deep_perception', 'nuanced_interpretation', 'contextual_understanding'],
    isActive,
    iconUrl: '/icons/lenz.svg'
  }
];

// Pre-defined agent clusters
export const AGENT_CLUSTERS= [
  {
    id: 'basic-support',
    name: 'Basic Support Team',
    description: 'Essential support agents for all users',
    agents=> 
      agent.accessLevel === AgentAccessLevel.BASIC
    ),
    accessLevel,
    isActive: true
  },
  {
    id: 'productivity-suite',
    name: 'Productivity Suite',
    description: 'Agents focused on improving productivity and workflow',
    agents=> 
      ['task-manager', 'process-optimizer', 'collaboration-facilitator'].includes(agent.id)
    ),
    accessLevel,
    isActive: true
  },
  {
    id: 'creative-team',
    name: 'Creative Team',
    description: 'Agents focused on creative work and innovation',
    agents=> 
      ['content-creator', 'creative-director', 'innovation-catalyst'].includes(agent.id)
    ),
    accessLevel,
    isActive: true
  },
  {
    id: 'strategic-advisors',
    name: 'Strategic Advisors',
    description: 'High-level strategic guidance and planning',
    agents=> 
      ['strategy-advisor', 'growth-strategist', 'scenario-planner'].includes(agent.id)
    ),
    accessLevel,
    isActive: true
  },
  {
    id: 'executive-suite',
    name: 'Executive Suite',
    description: 'Top-tier agents for executive-level support',
    agents=> 
      ['dream-commander', 'executive-coordinator', 'systems-architect', 'future-navigator'].includes(agent.id)
    ),
    accessLevel,
    isActive: true
  },
  {
    id: 'insight-team',
    name: 'Insight Team',
    description: 'Specialized in generating deep insights and understanding',
    agents=> 
      ['lenz', 'insight-amplifier', 'wisdom-synthesizer', 'advanced-forecaster'].includes(agent.id)
    ),
    accessLevel,
    isActive: true
  }
];

// Custom hook for accessing agents based on user authentication level
export const useAgents = () => {
  const { authState } = useAuth();
  const [availableAgents, setAvailableAgents] = useState([]);
  const [availableClusters, setAvailableClusters] = useState([]);

  // Map user auth level to agent access level
  const mapAuthLevelToAgentAccess = (authLevel)=> {
    if (!authLevel) return AgentAccessLevel.BASIC;
    
    if (authLevel >= UserAuthLevel.FULLY_REGISTERED) {
      return AgentAccessLevel.FULL;
    } else if (authLevel >= UserAuthLevel.TRIAL_PERIOD || authLevel >= UserAuthLevel.PAYMENT_VERIFIED) {
      return AgentAccessLevel.ENHANCED;
    } else if (authLevel >= UserAuthLevel.DR_GRANT) {
      return AgentAccessLevel.STANDARD;
    } else {
      return AgentAccessLevel.BASIC;
    }
  };

  // Filter agents based on user's access level
  useEffect(() => {
    const agentAccessLevel = mapAuthLevelToAgentAccess(authState.user?.authLevel);
    
    // Filter available agents based on access level
    const filterAgentsByAccess = (accessLevel)=> {
      switch (accessLevel) {
        case AgentAccessLevel.FULL=> agent.isActive);
        case AgentAccessLevel.ENHANCED=> 
            agent.isActive && 
            [AgentAccessLevel.BASIC, AgentAccessLevel.STANDARD, AgentAccessLevel.ENHANCED].includes(agent.accessLevel)
          );
        case AgentAccessLevel.STANDARD=> 
            agent.isActive && 
            [AgentAccessLevel.BASIC, AgentAccessLevel.STANDARD].includes(agent.accessLevel)
          );
        case AgentAccessLevel.BASIC:
        default=> 
            agent.isActive && agent.accessLevel === AgentAccessLevel.BASIC
          );
      }
    };
    
    // Filter available clusters based on access level
    const filterClustersByAccess = (accessLevel)=> {
      switch (accessLevel) {
        case AgentAccessLevel.FULL=> cluster.isActive);
        case AgentAccessLevel.ENHANCED=> 
            cluster.isActive && 
            [AgentAccessLevel.BASIC, AgentAccessLevel.STANDARD, AgentAccessLevel.ENHANCED].includes(cluster.accessLevel)
          );
        case AgentAccessLevel.STANDARD=> 
            cluster.isActive && 
            [AgentAccessLevel.BASIC, AgentAccessLevel.STANDARD].includes(cluster.accessLevel)
          );
        case AgentAccessLevel.BASIC:
        default=> 
            cluster.isActive && cluster.accessLevel === AgentAccessLevel.BASIC
          );
      }
    };
    
    setAvailableAgents(filterAgentsByAccess(agentAccessLevel));
    setAvailableClusters(filterClustersByAccess(agentAccessLevel));
  }, [authState.user?.authLevel]);

  // Methods for interacting with agents
  const getAgentById = (agentId)=> {
    return availableAgents.find(agent => agent.id === agentId);
  };

  const getClusterById = (clusterId)=> {
    return availableClusters.find(cluster => cluster.id === clusterId);
  };

  const getAgentsByType = (type)=> {
    return availableAgents.filter(agent => agent.type === type);
  };

  const getAgentsByCapability = (capability)=> {
    return availableAgents.filter(agent => agent.capabilities.includes(capability));
  };

  return {
    availableAgents,
    availableClusters,
    getAgentById,
    getClusterById,
    getAgentsByType,
    getAgentsByCapability,
    agentTypes,
    agentAccessLevels: AgentAccessLevel
  };
};

// Agent integration with Vertex AI evaluation pipeline
export class AgentPipelineConnector {
  projectId= '859242575175';
  location= 'us-central1';
  modelName= '8290727791268200448@2';
  
  // Connect an agent to the evaluation pipeline
  async connectAgentToEvalPipeline(agent, pipelineId){
    try {
      console.log(`Connecting agent ${agent.id} to pipeline ${pipelineId}`);
      // Integration logic would go here in a real implementation
      return true;
    } catch (error) {
      console.error(`Error connecting agent to pipeline: ${error}`);
      return false;
    }
  }
  
  // Connect a specific cluster of agents to GKE
  async deployClusterToGKE(cluster){
    try {
      console.log(`Deploying cluster ${cluster.id} to GKE`);
      // Deployment logic would go here in a real implementation
      return true;
    } catch (error) {
      console.error(`Error deploying cluster to GKE: ${error}`);
      return false;
    }
  }
  
  // Scale agents in GKE
  async scaleAgentsInGKE(targetCount= 45){
    try {
      console.log(`Scaling agents to ${targetCount} instances in GKE`);
      // Scaling logic would go here in a real implementation
      return true;
    } catch (error) {
      console.error(`Error scaling agents in GKE: ${error}`);
      return false;
    }
  }
}

// Agent UI components
export const AgentGallery = () => {
  const { availableAgents, agentTypes } = useAgents();
  const [selectedType, setSelectedType] = useState('all');
  
  const filteredAgents = selectedType === 'all' 
    ? availableAgents 
    => agent.type === selectedType);
  
  return (
    
      Your AI Agents
      
      
         setSelectedType('all')}
          className={`px-4 py-2 rounded-full ${
            selectedType === 'all' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All
        
        {Object.values(agentTypes).map(type => (
           setSelectedType(type)}
            className={`px-4 py-2 rounded-full ${
              selectedType === type 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          
        ))}
      
      
      
        {filteredAgents.map(agent => (
          
            
              
                {agent.iconUrl ? (
                  
                ) ="text-indigo-600 font-bold">{agent.name.charAt(0)}
                )}
              
              
                {agent.name}
                {agent.description}
                
                  {agent.capabilities.slice(0, 3).map(capability => (
                    
                      {capability.split('_').join(' ')}
                    
                  ))}
                  {agent.capabilities.length > 3 && (
                    +{agent.capabilities.length - 3} more
                  )}
                
              
            
          
        ))}
      
      
      {filteredAgents.length === 0 && (
        
          No agents available for this category with your current access level.
          Upgrade your account to access more agents.
        
      )}
    
  );
};

// Agent system integration context
export const useAgentSystemIntegration = () => {
  const { authState } = useAuth();
  const { availableAgents } = useAgents();
  const pipelineConnector = new AgentPipelineConnector();
  
  // Connect to the evaluation pipeline from the Vertex AI configuration
  const connectToEvaluationPipeline = async ()=> {
    try {
      const pipelineId = 'claude-3-5-sonnet-v2-superclaudex-ce9fc56';
      let successCount = 0;
      
      for (const agent of availableAgents) {
        const success = await pipelineConnector.connectAgentToEvalPipeline(agent, pipelineId);
        if (success) successCount++;
      }
      
      console.log(`Successfully connected ${successCount} of ${availableAgents.length} agents to evaluation pipeline`);
      return successCount > 0;
    } catch (error) {
      console.error(`Error connecting to evaluation pipeline: ${error}`);
      return false;
    }
  };
  
  // Expand agent system to 45 instances in GKE
  const expandToGKE = async ()=> {
    try {
      return await pipelineConnector.scaleAgentsInGKE(45);
    } catch (error) {
      console.error(`Error expanding agents to GKE: ${error}`);
      return false;
    }
  };
  
  // Check if user has access to Dream Commander
  const hasDreamCommanderAccess = ()=> {
    if (!authState.user) return false;
    return authState.user.authLevel >= UserAuthLevel.FULLY_REGISTERED;
  };
  
  // Get the cultural empathy code for Dream Commander
  const getCulturalEmpathyCode = ()=> {
    return authState.user?.culturalEmpathyCode;
  };
  
  return {
    connectToEvaluationPipeline,
    expandToGKE,
    hasDreamCommanderAccess,
    getCulturalEmpathyCode,
    totalAgentCount: availableAgents.length
  };
};
