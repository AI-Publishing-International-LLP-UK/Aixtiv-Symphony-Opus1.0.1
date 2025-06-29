"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAgentSystemIntegration = exports.AgentGallery = exports.AgentPipelineConnector = exports.useAgents = exports.AGENT_CLUSTERS = exports.AGENT_REGISTRY = exports.AgentType = exports.AgentAccessLevel = void 0;
const user_auth_types_1 = require("./user-auth-types");
const use_auth_hook_1 = require("./use-auth-hook");
const react_1 = require("react");
// Define agent access levels based on user authentication
var AgentAccessLevel;
(function (AgentAccessLevel) {
    AgentAccessLevel["BASIC"] = "basic";
    AgentAccessLevel["STANDARD"] = "standard";
    AgentAccessLevel["ENHANCED"] = "enhanced";
    AgentAccessLevel["FULL"] = "full"; // Level 3: Full access to all agents
})(AgentAccessLevel || (exports.AgentAccessLevel = AgentAccessLevel = {}));
// Define agent types
var AgentType;
(function (AgentType) {
    AgentType["ANALYTICAL"] = "analytical";
    AgentType["CREATIVE"] = "creative";
    AgentType["OPERATIONAL"] = "operational";
    AgentType["STRATEGIC"] = "strategic";
    AgentType["SUPPORT"] = "support";
})(AgentType || (exports.AgentType = AgentType = {}));
// Define the 33 agents with appropriate access levels
exports.AGENT_REGISTRY = [
    // Basic Access Level - Available to all users including non-authenticated
    {
        id: 'welcome-guide',
        name: 'Welcome Guide',
        description: 'Introduces new users to the system and provides basic guidance',
        type: AgentType.SUPPORT,
        accessLevel: AgentAccessLevel.BASIC,
        capabilities: ['introduction', 'basic_guidance', 'faq_answers'],
        isActive: true,
        iconUrl: '/icons/welcome-guide.svg'
    },
    {
        id: 'info-retriever',
        name: 'Information Retriever',
        description: 'Retrieves public information from the knowledge base',
        type: AgentType.ANALYTICAL,
        accessLevel: AgentAccessLevel.BASIC,
        capabilities: ['public_info_retrieval', 'basic_search'],
        isActive: true,
        iconUrl: '/icons/info-retriever.svg'
    },
    {
        id: 'account-assistant',
        name: 'Account Assistant',
        description: 'Helps users manage their account and authentication',
        type: AgentType.SUPPORT,
        accessLevel: AgentAccessLevel.BASIC,
        capabilities: ['account_help', 'auth_guidance', 'profile_management'],
        isActive: true,
        iconUrl: '/icons/account-assistant.svg'
    },
    // Standard Access Level - Available to Dr. Grant verified users
    {
        id: 'data-analyst',
        name: 'Data Analyst',
        description: 'Analyses and visualizes data for insights',
        type: AgentType.ANALYTICAL,
        accessLevel: AgentAccessLevel.STANDARD,
        capabilities: ['data_analysis', 'visualization', 'pattern_recognition'],
        isActive: true,
        iconUrl: '/icons/data-analyst.svg'
    },
    {
        id: 'content-creator',
        name: 'Content Creator',
        description: 'Helps users create and edit various types of content',
        type: AgentType.CREATIVE,
        accessLevel: AgentAccessLevel.STANDARD,
        capabilities: ['content_generation', 'editing_assistance', 'formatting'],
        isActive: true,
        iconUrl: '/icons/content-creator.svg'
    },
    {
        id: 'research-assistant',
        name: 'Research Assistant',
        description: 'Assists in research tasks and information gathering',
        type: AgentType.ANALYTICAL,
        accessLevel: AgentAccessLevel.STANDARD,
        capabilities: ['research_planning', 'information_gathering', 'source_evaluation'],
        isActive: true,
        iconUrl: '/icons/research-assistant.svg'
    },
    {
        id: 'process-optimizer',
        name: 'Process Optimizer',
        description: 'Identifies inefficiencies and suggests improvements',
        type: AgentType.OPERATIONAL,
        accessLevel: AgentAccessLevel.STANDARD,
        capabilities: ['process_analysis', 'optimization_suggestions', 'workflow_improvement'],
        isActive: true,
        iconUrl: '/icons/process-optimizer.svg'
    },
    {
        id: 'learning-guide',
        name: 'Learning Guide',
        description: 'Helps users learn new skills and concepts',
        type: AgentType.SUPPORT,
        accessLevel: AgentAccessLevel.STANDARD,
        capabilities: ['learning_path_creation', 'concept_explanation', 'progress_tracking'],
        isActive: true,
        iconUrl: '/icons/learning-guide.svg'
    },
    {
        id: 'collaboration-facilitator',
        name: 'Collaboration Facilitator',
        description: 'Facilitates collaboration between users and teams',
        type: AgentType.SUPPORT,
        accessLevel: AgentAccessLevel.STANDARD,
        capabilities: ['meeting_facilitation', 'team_coordination', 'conflict_resolution'],
        isActive: true,
        iconUrl: '/icons/collaboration-facilitator.svg'
    },
    {
        id: 'task-manager',
        name: 'Task Manager',
        description: 'Helps users manage tasks and projects',
        type: AgentType.OPERATIONAL,
        accessLevel: AgentAccessLevel.STANDARD,
        capabilities: ['task_tracking', 'deadline_management', 'priority_setting'],
        isActive: true,
        iconUrl: '/icons/task-manager.svg'
    },
    // Enhanced Access Level - Available to Payment Verified & Trial Period users
    {
        id: 'strategy-advisor',
        name: 'Strategy Advisor',
        description: 'Provides strategic advice and planning assistance',
        type: AgentType.STRATEGIC,
        accessLevel: AgentAccessLevel.ENHANCED,
        capabilities: ['strategic_analysis', 'goal_setting', 'planning_assistance'],
        isActive: true,
        iconUrl: '/icons/strategy-advisor.svg'
    },
    {
        id: 'creative-director',
        name: 'Creative Director',
        description: 'Guides creative projects and provides artistic direction',
        type: AgentType.CREATIVE,
        accessLevel: AgentAccessLevel.ENHANCED,
        capabilities: ['creative_direction', 'design_guidance', 'aesthetic_evaluation'],
        isActive: true,
        iconUrl: '/icons/creative-director.svg'
    },
    {
        id: 'problem-solver',
        name: 'Problem Solver',
        description: 'Helps identify and solve complex problems',
        type: AgentType.ANALYTICAL,
        accessLevel: AgentAccessLevel.ENHANCED,
        capabilities: ['problem_framing', 'solution_generation', 'decision_analysis'],
        isActive: true,
        iconUrl: '/icons/problem-solver.svg'
    },
    {
        id: 'market-analyzer',
        name: 'Market Analyzer',
        description: 'Analyzes market trends and competitive landscapes',
        type: AgentType.ANALYTICAL,
        accessLevel: AgentAccessLevel.ENHANCED,
        capabilities: ['market_analysis', 'trend_identification', 'competitive_assessment'],
        isActive: true,
        iconUrl: '/icons/market-analyzer.svg'
    },
    {
        id: 'innovation-catalyst',
        name: 'Innovation Catalyst',
        description: 'Facilitates innovation and creative thinking',
        type: AgentType.CREATIVE,
        accessLevel: AgentAccessLevel.ENHANCED,
        capabilities: ['idea_generation', 'innovation_facilitation', 'concept_development'],
        isActive: true,
        iconUrl: '/icons/innovation-catalyst.svg'
    },
    {
        id: 'scenario-planner',
        name: 'Scenario Planner',
        description: 'Helps explore and plan for different future scenarios',
        type: AgentType.STRATEGIC,
        accessLevel: AgentAccessLevel.ENHANCED,
        capabilities: ['scenario_generation', 'future_exploration', 'contingency_planning'],
        isActive: true,
        iconUrl: '/icons/scenario-planner.svg'
    },
    {
        id: 'customer-insight-agent',
        name: 'Customer Insight Agent',
        description: 'Analyzes customer data for insights and patterns',
        type: AgentType.ANALYTICAL,
        accessLevel: AgentAccessLevel.ENHANCED,
        capabilities: ['customer_analysis', 'behavior_insights', 'preference_patterns'],
        isActive: true,
        iconUrl: '/icons/customer-insight-agent.svg'
    },
    {
        id: 'financial-advisor',
        name: 'Financial Advisor',
        description: 'Provides financial analysis and advice',
        type: AgentType.ANALYTICAL,
        accessLevel: AgentAccessLevel.ENHANCED,
        capabilities: ['financial_analysis', 'budget_planning', 'investment_advice'],
        isActive: true,
        iconUrl: '/icons/financial-advisor.svg'
    },
    {
        id: 'growth-strategist',
        name: 'Growth Strategist',
        description: 'Helps identify and plan for growth opportunities',
        type: AgentType.STRATEGIC,
        accessLevel: AgentAccessLevel.ENHANCED,
        capabilities: ['growth_opportunity_analysis', 'expansion_planning', 'market_entry_strategy'],
        isActive: true,
        iconUrl: '/icons/growth-strategist.svg'
    },
    // Full Access Level - Available to Fully Registered users only
    {
        id: 'dream-commander',
        name: 'Dream Commander',
        description: 'Master orchestration agent that coordinates all other agents',
        type: AgentType.STRATEGIC,
        accessLevel: AgentAccessLevel.FULL,
        capabilities: ['cross_agent_coordination', 'strategic_orchestration', 'comprehensive_planning', 'autonomous_decision_making'],
        isActive: true,
        iconUrl: '/icons/dream-commander.svg'
    },
    {
        id: 'executive-coordinator',
        name: 'Executive Coordinator',
        description: 'Provides executive-level coordination and decision support',
        type: AgentType.STRATEGIC,
        accessLevel: AgentAccessLevel.FULL,
        capabilities: ['executive_support', 'strategic_alignment', 'decision_support'],
        isActive: true,
        iconUrl: '/icons/executive-coordinator.svg'
    },
    {
        id: 'advanced-forecaster',
        name: 'Advanced Forecaster',
        description: 'Provides sophisticated forecasting and predictive modeling',
        type: AgentType.ANALYTICAL,
        accessLevel: AgentAccessLevel.FULL,
        capabilities: ['predictive_modeling', 'trend_forecasting', 'scenario_simulation'],
        isActive: true,
        iconUrl: '/icons/advanced-forecaster.svg'
    },
    {
        id: 'systems-architect',
        name: 'Systems Architect',
        description: 'Designs and optimizes complex systems and processes',
        type: AgentType.STRATEGIC,
        accessLevel: AgentAccessLevel.FULL,
        capabilities: ['system_design', 'architecture_planning', 'integration_optimization'],
        isActive: true,
        iconUrl: '/icons/systems-architect.svg'
    },
    {
        id: 'transformation-guide',
        name: 'Transformation Guide',
        description: 'Guides organizational and personal transformation processes',
        type: AgentType.STRATEGIC,
        accessLevel: AgentAccessLevel.FULL,
        capabilities: ['change_management', 'transformation_planning', 'adaptation_facilitation'],
        isActive: true,
        iconUrl: '/icons/transformation-guide.svg'
    },
    {
        id: 'cultural-empathy-coach',
        name: 'Cultural Empathy Coach',
        description: 'Develops cultural intelligence and empathetic understanding',
        type: AgentType.SUPPORT,
        accessLevel: AgentAccessLevel.FULL,
        capabilities: ['cultural_intelligence', 'empathy_development', 'cross_cultural_facilitation'],
        isActive: true,
        iconUrl: '/icons/cultural-empathy-coach.svg'
    },
    {
        id: 'wisdom-synthesizer',
        name: 'Wisdom Synthesizer',
        description: 'Synthesizes insights and wisdom from diverse sources',
        type: AgentType.ANALYTICAL,
        accessLevel: AgentAccessLevel.FULL,
        capabilities: ['insight_synthesis', 'wisdom_integration', 'knowledge_crystallization'],
        isActive: true,
        iconUrl: '/icons/wisdom-synthesizer.svg'
    },
    {
        id: 'co-pilot',
        name: 'Co-Pilot',
        description: 'Works alongside the user as a partner in complex tasks',
        type: AgentType.SUPPORT,
        accessLevel: AgentAccessLevel.FULL,
        capabilities: ['collaborative_problem_solving', 'real_time_support', 'adaptive_assistance'],
        isActive: true,
        iconUrl: '/icons/co-pilot.svg'
    },
    {
        id: 'ethical-guardian',
        name: 'Ethical Guardian',
        description: 'Helps ensure ethical considerations in decisions and actions',
        type: AgentType.SUPPORT,
        accessLevel: AgentAccessLevel.FULL,
        capabilities: ['ethical_analysis', 'value_alignment', 'moral_consideration'],
        isActive: true,
        iconUrl: '/icons/ethical-guardian.svg'
    },
    {
        id: 'innovation-accelerator',
        name: 'Innovation Accelerator',
        description: 'Accelerates innovation processes and implementation',
        type: AgentType.CREATIVE,
        accessLevel: AgentAccessLevel.FULL,
        capabilities: ['innovation_acceleration', 'rapid_prototyping', 'implementation_guidance'],
        isActive: true,
        iconUrl: '/icons/innovation-accelerator.svg'
    },
    {
        id: 'future-navigator',
        name: 'Future Navigator',
        description: 'Helps navigate complex future landscapes and possibilities',
        type: AgentType.STRATEGIC,
        accessLevel: AgentAccessLevel.FULL,
        capabilities: ['future_sensing', 'opportunity_navigation', 'complexity_mapping'],
        isActive: true,
        iconUrl: '/icons/future-navigator.svg'
    },
    {
        id: 'insight-amplifier',
        name: 'Insight Amplifier',
        description: 'Amplifies and enhances insights from data and information',
        type: AgentType.ANALYTICAL,
        accessLevel: AgentAccessLevel.FULL,
        capabilities: ['insight_enhancement', 'pattern_amplification', 'significance_detection'],
        isActive: true,
        iconUrl: '/icons/insight-amplifier.svg'
    },
    {
        id: 'masterful-communicator',
        name: 'Masterful Communicator',
        description: 'Provides advanced communication support and enhancement',
        type: AgentType.SUPPORT,
        accessLevel: AgentAccessLevel.FULL,
        capabilities: ['communication_crafting', 'message_optimization', 'audience_adaptation'],
        isActive: true,
        iconUrl: '/icons/masterful-communicator.svg'
    },
    {
        id: 'lenz',
        name: 'Lenz',
        description: 'Advanced perception and interpretation agent',
        type: AgentType.ANALYTICAL,
        accessLevel: AgentAccessLevel.FULL,
        capabilities: ['deep_perception', 'nuanced_interpretation', 'contextual_understanding'],
        isActive: true,
        iconUrl: '/icons/lenz.svg'
    }
];
// Pre-defined agent clusters
exports.AGENT_CLUSTERS = [
    {
        id: 'basic-support',
        name: 'Basic Support Team',
        description: 'Essential support agents for all users',
        agents: exports.AGENT_REGISTRY.filter(agent => agent.accessLevel === AgentAccessLevel.BASIC),
        accessLevel: AgentAccessLevel.BASIC,
        isActive: true
    },
    {
        id: 'productivity-suite',
        name: 'Productivity Suite',
        description: 'Agents focused on improving productivity and workflow',
        agents: exports.AGENT_REGISTRY.filter(agent => ['task-manager', 'process-optimizer', 'collaboration-facilitator'].includes(agent.id)),
        accessLevel: AgentAccessLevel.STANDARD,
        isActive: true
    },
    {
        id: 'creative-team',
        name: 'Creative Team',
        description: 'Agents focused on creative work and innovation',
        agents: exports.AGENT_REGISTRY.filter(agent => ['content-creator', 'creative-director', 'innovation-catalyst'].includes(agent.id)),
        accessLevel: AgentAccessLevel.ENHANCED,
        isActive: true
    },
    {
        id: 'strategic-advisors',
        name: 'Strategic Advisors',
        description: 'High-level strategic guidance and planning',
        agents: exports.AGENT_REGISTRY.filter(agent => ['strategy-advisor', 'growth-strategist', 'scenario-planner'].includes(agent.id)),
        accessLevel: AgentAccessLevel.ENHANCED,
        isActive: true
    },
    {
        id: 'executive-suite',
        name: 'Executive Suite',
        description: 'Top-tier agents for executive-level support',
        agents: exports.AGENT_REGISTRY.filter(agent => ['dream-commander', 'executive-coordinator', 'systems-architect', 'future-navigator'].includes(agent.id)),
        accessLevel: AgentAccessLevel.FULL,
        isActive: true
    },
    {
        id: 'insight-team',
        name: 'Insight Team',
        description: 'Specialized in generating deep insights and understanding',
        agents: exports.AGENT_REGISTRY.filter(agent => ['lenz', 'insight-amplifier', 'wisdom-synthesizer', 'advanced-forecaster'].includes(agent.id)),
        accessLevel: AgentAccessLevel.FULL,
        isActive: true
    }
];
// Custom hook for accessing agents based on user authentication level
const useAgents = () => {
    var _a;
    const { authState } = (0, use_auth_hook_1.useAuth)();
    const [availableAgents, setAvailableAgents] = (0, react_1.useState)([]);
    const [availableClusters, setAvailableClusters] = (0, react_1.useState)([]);
    // Map user auth level to agent access level
    const mapAuthLevelToAgentAccess = (authLevel) => {
        if (!authLevel)
            return AgentAccessLevel.BASIC;
        if (authLevel >= user_auth_types_1.UserAuthLevel.FULLY_REGISTERED) {
            return AgentAccessLevel.FULL;
        }
        else if (authLevel >= user_auth_types_1.UserAuthLevel.TRIAL_PERIOD || authLevel >= user_auth_types_1.UserAuthLevel.PAYMENT_VERIFIED) {
            return AgentAccessLevel.ENHANCED;
        }
        else if (authLevel >= user_auth_types_1.UserAuthLevel.DR_GRANT) {
            return AgentAccessLevel.STANDARD;
        }
        else {
            return AgentAccessLevel.BASIC;
        }
    };
    // Filter agents based on user's access level
    (0, react_1.useEffect)(() => {
        var _a;
        const agentAccessLevel = mapAuthLevelToAgentAccess((_a = authState.user) === null || _a === void 0 ? void 0 : _a.authLevel);
        // Filter available agents based on access level
        const filterAgentsByAccess = (accessLevel) => {
            switch (accessLevel) {
                case AgentAccessLevel.FULL:
                    return exports.AGENT_REGISTRY.filter(agent => agent.isActive);
                case AgentAccessLevel.ENHANCED:
                    return exports.AGENT_REGISTRY.filter(agent => agent.isActive &&
                        [AgentAccessLevel.BASIC, AgentAccessLevel.STANDARD, AgentAccessLevel.ENHANCED].includes(agent.accessLevel));
                case AgentAccessLevel.STANDARD:
                    return exports.AGENT_REGISTRY.filter(agent => agent.isActive &&
                        [AgentAccessLevel.BASIC, AgentAccessLevel.STANDARD].includes(agent.accessLevel));
                case AgentAccessLevel.BASIC:
                default:
                    return exports.AGENT_REGISTRY.filter(agent => agent.isActive && agent.accessLevel === AgentAccessLevel.BASIC);
            }
        };
        // Filter available clusters based on access level
        const filterClustersByAccess = (accessLevel) => {
            switch (accessLevel) {
                case AgentAccessLevel.FULL:
                    return exports.AGENT_CLUSTERS.filter(cluster => cluster.isActive);
                case AgentAccessLevel.ENHANCED:
                    return exports.AGENT_CLUSTERS.filter(cluster => cluster.isActive &&
                        [AgentAccessLevel.BASIC, AgentAccessLevel.STANDARD, AgentAccessLevel.ENHANCED].includes(cluster.accessLevel));
                case AgentAccessLevel.STANDARD:
                    return exports.AGENT_CLUSTERS.filter(cluster => cluster.isActive &&
                        [AgentAccessLevel.BASIC, AgentAccessLevel.STANDARD].includes(cluster.accessLevel));
                case AgentAccessLevel.BASIC:
                default:
                    return exports.AGENT_CLUSTERS.filter(cluster => cluster.isActive && cluster.accessLevel === AgentAccessLevel.BASIC);
            }
        };
        setAvailableAgents(filterAgentsByAccess(agentAccessLevel));
        setAvailableClusters(filterClustersByAccess(agentAccessLevel));
    }, [(_a = authState.user) === null || _a === void 0 ? void 0 : _a.authLevel]);
    // Methods for interacting with agents
    const getAgentById = (agentId) => {
        return availableAgents.find(agent => agent.id === agentId);
    };
    const getClusterById = (clusterId) => {
        return availableClusters.find(cluster => cluster.id === clusterId);
    };
    const getAgentsByType = (type) => {
        return availableAgents.filter(agent => agent.type === type);
    };
    const getAgentsByCapability = (capability) => {
        return availableAgents.filter(agent => agent.capabilities.includes(capability));
    };
    return {
        availableAgents,
        availableClusters,
        getAgentById,
        getClusterById,
        getAgentsByType,
        getAgentsByCapability,
        agentTypes: AgentType,
        agentAccessLevels: AgentAccessLevel
    };
};
exports.useAgents = useAgents;
// Agent integration with Vertex AI evaluation pipeline
class AgentPipelineConnector {
    constructor() {
        this.projectId = '859242575175';
        this.location = 'us-central1';
        this.modelName = '8290727791268200448@2';
    }
    // Connect an agent to the evaluation pipeline
    connectAgentToEvalPipeline(agent, pipelineId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`Connecting agent ${agent.id} to pipeline ${pipelineId}`);
                // Integration logic would go here in a real implementation
                return true;
            }
            catch (error) {
                console.error(`Error connecting agent to pipeline: ${error}`);
                return false;
            }
        });
    }
    // Connect a specific cluster of agents to GKE
    deployClusterToGKE(cluster) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`Deploying cluster ${cluster.id} to GKE`);
                // Deployment logic would go here in a real implementation
                return true;
            }
            catch (error) {
                console.error(`Error deploying cluster to GKE: ${error}`);
                return false;
            }
        });
    }
    // Scale agents in GKE
    scaleAgentsInGKE() {
        return __awaiter(this, arguments, void 0, function* (targetCount = 45) {
            try {
                console.log(`Scaling agents to ${targetCount} instances in GKE`);
                // Scaling logic would go here in a real implementation
                return true;
            }
            catch (error) {
                console.error(`Error scaling agents in GKE: ${error}`);
                return false;
            }
        });
    }
}
exports.AgentPipelineConnector = AgentPipelineConnector;
// Agent UI components
const AgentGallery = () => {
    const { availableAgents, agentTypes } = (0, exports.useAgents)();
    const [selectedType, setSelectedType] = (0, react_1.useState)('all');
    const filteredAgents = selectedType === 'all'
        ? availableAgents
        : availableAgents.filter(agent => agent.type === selectedType);
    return className = "w-full p-6 bg-white rounded-lg shadow-md" >
        className;
    "text-2xl font-bold mb-6" > Your;
    AI;
    Agents < /h2>
        < div;
    className = "flex flex-wrap gap-2 mb-6" >
        onClick;
    {
        () => setSelectedType('all');
    }
    className = {} `px-4 py-2 rounded-full ${selectedType === 'all'
        ? 'bg-indigo-600 text-white'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
};
exports.AgentGallery = AgentGallery;
    >
        All
    < /button>;
{
    Object.values(agentTypes).map(type => key = { type }, onClick = {}(), setSelectedType(type));
}
className = {} `px-4 py-2 rounded-full ${selectedType === type
    ? 'bg-indigo-600 text-white'
    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
    >
        { type, : .charAt(0).toUpperCase() + type.slice(1) }
    < /button>;
/div>
    < div;
className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" >
    { filteredAgents, : .map(agent => key = { agent, : .id }, className = "border rounded-lg p-4 hover:shadow-md transition-shadow" >
            className, "flex items-start gap-4" >
            className, "w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0" >
            { agent, : .iconUrl ? src = { agent, : .iconUrl } : , alt = { agent, : .name }, className = "w-6 h-6" /  >
             }) }(className, "text-indigo-600 font-bold" > { agent, : .name.charAt(0) } < /span>);
/div>
    < div >
    className;
"font-medium text-lg" > { agent, : .name } < /h3>
    < p;
className = "text-sm text-gray-600 mb-2" > { agent, : .description } < /p>
    < div;
className = "flex flex-wrap gap-1 mt-2" >
    { agent, : .capabilities.slice(0, 3).map(capability => key = { capability }, className = "text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full"
            >
                { capability, : .split('_').join(' ') }
            < /span>) };
{
    agent.capabilities.length > 3 && className;
    "text-xs text-gray-500" > +{ agent, : .capabilities.length - 3 };
    more < /span>;
}
/div>
    < /div>
    < /div>
    < /div>;
/div>;
{
    filteredAgents.length === 0 && className;
    "text-center py-8" >
        className;
    "text-gray-500" > No;
    agents;
    available;
    for (this; category; )
        with (your)
            current;
    access;
    level. < /p>
        < p;
    className = "text-sm text-indigo-600 mt-2" > Upgrade;
    your;
    account;
    to;
    access;
    more;
    agents. < /p>
        < /div>;
}
/div>;
;
;
// Agent system integration context
const useAgentSystemIntegration = () => {
    const { authState } = (0, use_auth_hook_1.useAuth)();
    const { availableAgents } = (0, exports.useAgents)();
    const pipelineConnector = new AgentPipelineConnector();
    // Connect to the evaluation pipeline from the Vertex AI configuration
    const connectToEvaluationPipeline = () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const pipelineId = 'claude-3-5-sonnet-v2-superclaudex-ce9fc56';
            let successCount = 0;
            for (const agent of availableAgents) {
                const success = yield pipelineConnector.connectAgentToEvalPipeline(agent, pipelineId);
                if (success)
                    successCount++;
            }
            console.log(`Successfully connected ${successCount} of ${availableAgents.length} agents to evaluation pipeline`);
            return successCount > 0;
        }
        catch (error) {
            console.error(`Error connecting to evaluation pipeline: ${error}`);
            return false;
        }
    });
    // Expand agent system to 45 instances in GKE
    const expandToGKE = () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            return yield pipelineConnector.scaleAgentsInGKE(45);
        }
        catch (error) {
            console.error(`Error expanding agents to GKE: ${error}`);
            return false;
        }
    });
    // Check if user has access to Dream Commander
    const hasDreamCommanderAccess = () => {
        if (!authState.user)
            return false;
        return authState.user.authLevel >= user_auth_types_1.UserAuthLevel.FULLY_REGISTERED;
    };
    // Get the cultural empathy code for Dream Commander
    const getCulturalEmpathyCode = () => {
        var _a;
        return (_a = authState.user) === null || _a === void 0 ? void 0 : _a.culturalEmpathyCode;
    };
    return {
        connectToEvaluationPipeline,
        expandToGKE,
        hasDreamCommanderAccess,
        getCulturalEmpathyCode,
        totalAgentCount: availableAgents.length
    };
};
exports.useAgentSystemIntegration = useAgentSystemIntegration;
