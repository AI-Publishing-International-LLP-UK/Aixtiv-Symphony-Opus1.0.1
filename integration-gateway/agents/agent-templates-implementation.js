"use strict";
// src/wing/proactive-framework/core/initiative-engine/initiative-agent.ts
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
exports.VerificationAgent = exports.ContentOpportunityAgent = exports.BidOpportunityAgent = exports.ProactiveAgent = void 0;
const workflow_boundary_1 = require("../boundary-awareness/workflow-boundary");
const completion_verifier_1 = require("../completion-verification/completion-verifier");
const next_steps_generator_1 = require("../next-steps-engine/next-steps-generator");
/**
 * ProactiveAgent - Base class for all proactive "speak-first" agents
 *
 * These agents actively initiate conversations, understand workflow boundaries,
 * confirm completion, and offer next steps aligned with the AIXTIV SYMPHONY architecture.
 */
class ProactiveAgent {
    /**
     * Creates a new ProactiveAgent
     */
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.solution = config.solution;
        this.s2doProtocol = config.s2doProtocol;
        this.flightMemory = config.flightMemory;
        this.solutionConnector = config.solutionConnector;
        this.boundaryManager = new workflow_boundary_1.WorkflowBoundary(config.boundaryConfig, this.s2doProtocol, this.flightMemory);
        this.completionVerifier = new completion_verifier_1.CompletionVerifier(config.verificationConfig, this.s2doProtocol);
        this.nextStepsGenerator = new next_steps_generator_1.NextStepsGenerator(config.nextStepsConfig, this.flightMemory, this.solutionConnector);
        this.marketingInterface = config.marketingInterface;
        this.initiativeThreshold = config.initiativeThreshold || 0.75;
        this.confidenceThreshold = config.confidenceThreshold || 0.85;
        this.verificationLevel = config.verificationLevel || 'standard';
    }
    /**
     * Evaluates the current context to determine if proactive initiative should be taken
     * @param context Current context information
     * @returns Whether the agent should take initiative
     */
    shouldTakeInitiative(context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Analyze context for initiative opportunity
            const analysisResult = yield this.analyzeInitiativeOpportunity(context);
            // Check if initiative score exceeds threshold
            return analysisResult.score >= this.initiativeThreshold;
        });
    }
    /**
     * Generates a proactive initiative message based on context
     * @param context Current context information
     * @returns The initiative message to present to user
     */
    generateInitiativeMessage(context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Generate base initiative message
            let message = yield this.createBaseInitiativeMessage(context);
            // Define workflow boundaries in message
            message = yield this.addWorkflowBoundaries(message, context);
            // Apply marketing enhancements if available
            if (this.marketingInterface) {
                const enhancedMessage = yield this.marketingInterface.transformMessage({
                    originalMessage: message,
                    context: context,
                    solution: this.solution,
                    agentName: this.name,
                    messageType: 'initiative'
                });
                message = enhancedMessage.message;
            }
            // Record initiative in S2DO protocol
            yield this.s2doProtocol.recordAction({
                agent: this.id,
                action: 'INITIATIVE:PROACTIVE_ENGAGEMENT',
                context: context,
                timestamp: new Date(),
                parameters: {
                    messageType: 'initiative',
                    solution: this.solution,
                    confidence: yield this.calculateInitiativeConfidence(context)
                }
            });
            return message;
        });
    }
    /**
     * Confirms completion of a task or workflow
     * @param context Current context including task information
     * @returns Completion confirmation message
     */
    confirmCompletion(context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Verify task completion
            const verificationResult = yield this.completionVerifier.verifyCompletion(context);
            // Generate base completion message
            let message = yield this.createBaseCompletionMessage(context, verificationResult);
            // Apply marketing enhancements if available
            if (this.marketingInterface) {
                const enhancedMessage = yield this.marketingInterface.transformMessage({
                    originalMessage: message,
                    context: context,
                    solution: this.solution,
                    agentName: this.name,
                    messageType: 'completion'
                });
                message = enhancedMessage.message;
            }
            // Record completion in S2DO protocol
            yield this.s2doProtocol.recordAction({
                agent: this.id,
                action: 'COMPLETION:VERIFICATION',
                context: context,
                timestamp: new Date(),
                parameters: {
                    success: verificationResult.success,
                    evidence: verificationResult.evidence,
                    solution: this.solution
                }
            });
            return message;
        });
    }
    /**
     * Generates next steps guidance after task completion
     * @param context Current context after task completion
     * @returns Next steps guidance message
     */
    generateNextSteps(context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Generate recommended next steps
            const nextSteps = yield this.nextStepsGenerator.generateNextSteps(context);
            // Create base next steps message
            let message = yield this.createBaseNextStepsMessage(context, nextSteps);
            // Apply marketing enhancements if available
            if (this.marketingInterface) {
                const enhancedSteps = yield this.marketingInterface.enhanceNextSteps(nextSteps);
                const enhancedMessage = yield this.marketingInterface.transformMessage({
                    originalMessage: message,
                    context: context,
                    solution: this.solution,
                    agentName: this.name,
                    messageType: 'nextSteps',
                    enhancedData: enhancedSteps
                });
                message = enhancedMessage.message;
            }
            // Record next steps in S2DO protocol
            yield this.s2doProtocol.recordAction({
                agent: this.id,
                action: 'GUIDANCE:NEXT_STEPS',
                context: context,
                timestamp: new Date(),
                parameters: {
                    nextStepsCount: nextSteps.length,
                    highestValueStep: (_a = nextSteps[0]) === null || _a === void 0 ? void 0 : _a.id,
                    solution: this.solution
                }
            });
            return message;
        });
    }
    /**
     * Analyzes context for initiative opportunities
     * @param context Current context
     * @private
     */
    analyzeInitiativeOpportunity(context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementation will vary by specific agent type
            // Base implementation with default scoring
            return {
                score: 0.8,
                confidence: 0.85
            };
        });
    }
    /**
     * Creates the base initiative message
     * @param context Current context
     * @private
     */
    createBaseInitiativeMessage(context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementation will vary by specific agent type
            return "I notice an opportunity to assist with your current task. Would you like me to help?";
        });
    }
    /**
     * Adds workflow boundary information to a message
     * @param message Base message
     * @param context Current context
     * @private
     */
    addWorkflowBoundaries(message, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const boundaries = yield this.boundaryManager.defineWorkflowBoundaries(context);
            // Add workflow start and end information
            return `${message}\n\nI'll start by ${boundaries.startPoint} and we'll finish when ${boundaries.endPoint}. This process typically involves ${boundaries.stepCount} steps.`;
        });
    }
    /**
     * Creates a completion confirmation message
     * @param context Current context
     * @param verificationResult Result of completion verification
     * @private
     */
    createBaseCompletionMessage(context, verificationResult) {
        return __awaiter(this, void 0, void 0, function* () {
            if (verificationResult.success) {
                return `I've successfully completed ${context.taskName}. ${verificationResult.summary}`;
            }
            else {
                return `I wasn't able to fully complete ${context.taskName}. ${verificationResult.issues.join(' ')}`;
            }
        });
    }
    /**
     * Creates a next steps guidance message
     * @param context Current context
     * @param nextSteps Generated next steps
     * @private
     */
    createBaseNextStepsMessage(context, nextSteps) {
        return __awaiter(this, void 0, void 0, function* () {
            if (nextSteps.length === 0) {
                return "That completes this workflow. Is there anything else you'd like assistance with?";
            }
            let message = "Based on what we've accomplished, here are the recommended next steps:\n\n";
            nextSteps.forEach((step, index) => {
                message += `${index + 1}. ${step.description}\n`;
            });
            message += "\nWould you like to proceed with any of these next steps?";
            return message;
        });
    }
    /**
     * Calculates confidence level for initiative action
     * @param context Current context
     * @private
     */
    calculateInitiativeConfidence(context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementation will vary by specific agent type
            return 0.85;
        });
    }
}
exports.ProactiveAgent = ProactiveAgent;
// src/vls/solutions/dr-match-bid-suite/proactive-agents/bid-opportunity-agent.ts
const initiative_agent_1 = require("../../../../wing/proactive-framework/core/initiative-engine/initiative-agent");
/**
 * BidOpportunityAgent - Proactive agent for identifying and suggesting bid opportunities
 */
class BidOpportunityAgent extends initiative_agent_1.ProactiveAgent {
    /**
     * Creates a new BidOpportunityAgent
     */
    constructor(config, bidService, opportunityThreshold = 0.7, maxOpportunities = 5) {
        super(config);
        this.bidService = bidService;
        this.opportunityThreshold = opportunityThreshold;
        this.maxOpportunities = maxOpportunities;
    }
    /**
     * Analyzes context for bid opportunity initiative
     * @param context Current context
     * @private
     */
    analyzeInitiativeOpportunity(context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check for relevant opportunities matching user profile
            const opportunities = yield this.bidService.findMatchingOpportunities(context.userProfile, this.opportunityThreshold, this.maxOpportunities);
            if (!opportunities || opportunities.length === 0) {
                return { score: 0.3, confidence: 0.9 };
            }
            // Calculate initiative score based on opportunity quality and quantity
            const avgMatchScore = opportunities.reduce((sum, opp) => sum + opp.matchScore, 0) / opportunities.length;
            const quantityFactor = Math.min(opportunities.length / 3, 1.0); // Maxes out at 3+ opportunities
            // Combine factors for final score
            const score = (avgMatchScore * 0.7) + (quantityFactor * 0.3);
            const confidence = 0.85 + (avgMatchScore * 0.1); // Higher match scores increase confidence
            return {
                score: score,
                confidence: confidence
            };
        });
    }
    /**
     * Creates initiative message for bid opportunities
     * @param context Current context
     * @private
     */
    createBaseInitiativeMessage(context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Find matching opportunities
            const opportunities = yield this.bidService.findMatchingOpportunities(context.userProfile, this.opportunityThreshold, this.maxOpportunities);
            // Store opportunities in context for later use
            context.opportunities = opportunities;
            // Create dynamic opening based on opportunity quantity and quality
            if (opportunities.length === 1) {
                const opp = opportunities[0];
                return `I've identified a high-potential bid opportunity with ${opp.clientName} that matches your capabilities (${Math.round(opp.matchScore * 100)}% match). Would you like me to analyze it further?`;
            }
            else {
                const topMatch = opportunities[0];
                const avgMatch = Math.round(opportunities.reduce((sum, opp) => sum + opp.matchScore, 0) / opportunities.length * 100);
                return `I've discovered ${opportunities.length} new bid opportunities that match your capabilities (${avgMatch}% average match), including a ${Math.round(topMatch.matchScore * 100)}% match with ${topMatch.clientName}. Would you like me to present the top opportunities?`;
            }
        });
    }
    /**
     * Adds workflow boundaries for opportunity analysis
     * @param message Base message
     * @param context Current context
     * @private
     */
    addWorkflowBoundaries(message, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const opportunities = context.opportunities || [];
            // Define process steps based on number of opportunities
            let processSteps = "qualification assessment, competitive analysis, and bid strategy development";
            if (opportunities.length > 1) {
                processSteps = "opportunity comparison, qualification assessment, and prioritization";
            }
            return `${message}\n\nIf you'd like to proceed, I'll start by presenting the key details and requirements, then guide you through ${processSteps}. The process will conclude with a clear bid/no-bid recommendation and next steps.`;
        });
    }
    /**
     * Confirms completion of opportunity analysis
     * @param context Current context
     * @param verificationResult Verification result
     * @private
     */
    createBaseCompletionMessage(context, verificationResult) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const opportunities = context.opportunities || [];
            if (opportunities.length === 1) {
                const opp = opportunities[0];
                if (verificationResult.recommendation === 'pursue') {
                    return `I've completed the analysis of the ${opp.clientName} opportunity. Based on your ${Math.round(opp.matchScore * 100)}% capability match and a ${verificationResult.winProbability}% estimated win probability, I recommend pursuing this bid. The key factors supporting this decision are: ${verificationResult.factors.join(', ')}.`;
                }
                else {
                    return `I've completed the analysis of the ${opp.clientName} opportunity. Despite the ${Math.round(opp.matchScore * 100)}% capability match, I recommend NOT pursuing this bid due to: ${verificationResult.factors.join(', ')}. The estimated win probability is only ${verificationResult.winProbability}%.`;
                }
            }
            else {
                const recommendedCount = ((_a = verificationResult.recommendedOpportunities) === null || _a === void 0 ? void 0 : _a.length) || 0;
                if (recommendedCount > 0) {
                    return `I've completed the analysis of ${opportunities.length} opportunities and identified ${recommendedCount} high-potential bids worth pursuing. The top opportunity is ${verificationResult.recommendedOpportunities[0].clientName} with a ${verificationResult.recommendedOpportunities[0].winProbability}% estimated win probability.`;
                }
                else {
                    return `I've completed the analysis of all ${opportunities.length} opportunities. Unfortunately, none of them meet our qualification criteria at this time. The main disqualifying factors were: ${verificationResult.disqualificationReasons.join(', ')}.`;
                }
            }
        });
    }
    /**
     * Generates next steps for bid opportunities
     * @param context Current context
     * @param nextSteps Generated next steps
     * @private
     */
    createBaseNextStepsMessage(context, nextSteps) {
        return __awaiter(this, void 0, void 0, function* () {
            // If no opportunities are worth pursuing
            if (nextSteps.length === 0 || context.noQualifiedOpportunities) {
                return "Since none of the current opportunities are a good fit, I recommend we take the following actions:\n\n1. Update your capability profile to improve future opportunity matching\n2. Adjust your opportunity search criteria\n3. Set up an alert for new opportunities in your target sectors\n\nWould you like me to help with any of these actions?";
            }
            // For qualified opportunities
            let message = "Based on the opportunity analysis, here are the recommended next steps:\n\n";
            nextSteps.forEach((step, index) => {
                message += `${index + 1}. ${step.description}\n`;
            });
            if (context.topOpportunity) {
                message += `\nThe most time-sensitive action is to begin the proposal development for the ${context.topOpportunity.clientName} opportunity, which has a submission deadline in ${context.topOpportunity.daysUntilDeadline} days.`;
            }
            message += "\nWhich of these steps would you like to begin with?";
            return message;
        });
    }
}
exports.BidOpportunityAgent = BidOpportunityAgent;
/**
 * ContentOpportunityAgent - Proactive agent for identifying and suggesting content creation opportunities
 */
class ContentOpportunityAgent extends initiative_agent_1.ProactiveAgent {
    /**
     * Creates a new ContentOpportunityAgent
     */
    constructor(config, anthologyService, insightThreshold = 0.7, maxInsights = 5) {
        super(config);
        this.anthologyService = anthologyService;
        this.insightThreshold = insightThreshold;
        this.maxInsights = maxInsights;
    }
    /**
     * Analyzes context for content creation opportunity
     * @param context Current context
     * @private
     */
    analyzeInitiativeOpportunity(context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Identify potential content insights from user data
            const insights = yield this.anthologyService.identifyContentInsights(context.userProfile, context.recentActivity, this.insightThreshold, this.maxInsights);
            if (!insights || insights.length === 0) {
                return { score: 0.3, confidence: 0.9 };
            }
            // Calculate initiative score based on insight quality and quantity
            const avgValueScore = insights.reduce((sum, insight) => sum + insight.valueScore, 0) / insights.length;
            const quantityFactor = Math.min(insights.length / 3, 1.0); // Maxes out at 3+ insights
            const audienceMatchFactor = insights[0].audienceMatchScore || 0.5;
            // Combine factors for final score
            const score = (avgValueScore * 0.6) + (quantityFactor * 0.2) + (audienceMatchFactor * 0.2);
            const confidence = 0.8 + (avgValueScore * 0.15); // Higher value insights increase confidence
            return {
                score: score,
                confidence: confidence
            };
        });
    }
    /**
     * Creates initiative message for content opportunities
     * @param context Current context
     * @private
     */
    createBaseInitiativeMessage(context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Identify potential content insights
            const insights = yield this.anthologyService.identifyContentInsights(context.userProfile, context.recentActivity, this.insightThreshold, this.maxInsights);
            // Store insights in context for later use
            context.contentInsights = insights;
            // Create dynamic opening based on insight quantity and quality
            if (insights.length === 1) {
                const insight = insights[0];
                return `I've identified a valuable content opportunity based on your recent ${insight.sourceType}: "${insight.title}". This insight could make an impactful ${insight.recommendedFormat} for your audience. Would you like me to develop this further?`;
            }
            else {
                const topInsight = insights[0];
                return `I've identified ${insights.length} insights from your recent activity that would make compelling content. The highest-value opportunity is "${topInsight.title}" which would resonate strongly with your ${topInsight.targetAudience} audience. Would you like me to present these content opportunities?`;
            }
        });
    }
    /**
     * Adds workflow boundaries for content development
     * @param message Base message
     * @param context Current context
     * @private
     */
    addWorkflowBoundaries(message, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const insights = context.contentInsights || [];
            // Define process steps based on number of insights
            let processSteps = "outline creation, content development, and distribution planning";
            if (insights.length > 1) {
                processSteps = "insight review, prioritization, and content strategy development";
            }
            return `${message}\n\nIf you'd like to proceed, I'll guide you through ${processSteps}. The process will conclude with publication-ready content and a distribution strategy to maximize impact.`;
        });
    }
    /**
     * Confirms completion of content development
     * @param context Current context
     * @param verificationResult Verification result
     * @private
     */
    createBaseCompletionMessage(context, verificationResult) {
        return __awaiter(this, void 0, void 0, function* () {
            const insights = context.contentInsights || [];
            const contentItems = verificationResult.contentItems || [];
            if (contentItems.length === 1) {
                const content = contentItems[0];
                return `I've completed the development of "${content.title}" as a ${content.format}. The final piece includes ${content.wordCount} words, ${content.sections} sections, and is optimized for your ${content.targetAudience} audience. All quality checks have been passed with a quality score of ${content.qualityScore}/100.`;
            }
            else {
                return `I've completed the content strategy and developed ${contentItems.length} content pieces from your insights. The complete package includes ${verificationResult.totalWordCount} words across various formats, all optimized for your target audiences. All pieces have passed our quality checks with an average score of ${verificationResult.averageQualityScore}/100.`;
            }
        });
    }
    /**
     * Generates next steps for content opportunities
     * @param context Current context
     * @param nextSteps Generated next steps
     * @private
     */
    createBaseNextStepsMessage(context, nextSteps) {
        return __awaiter(this, void 0, void 0, function* () {
            const contentItems = context.contentItems || [];
            let message = "Now that your content is ready, here are the recommended next steps to maximize its impact:\n\n";
            nextSteps.forEach((step, index) => {
                message += `${index + 1}. ${step.description}\n`;
            });
            if (contentItems.length > 0) {
                message += `\nThe most impactful immediate action would be to publish "${contentItems[0].title}" ${contentItems[0].distributionChannel ? `on ${contentItems[0].distributionChannel}` : ''}, which has a potential reach of ${contentItems[0].potentialReach.toLocaleString()} people based on current analytics.`;
            }
            message += "\nWhich of these steps would you like to prioritize?";
            return message;
        });
    }
}
exports.ContentOpportunityAgent = ContentOpportunityAgent;
/**
 * VerificationAgent - Proactive agent for S2DO verification and authentication
 */
class VerificationAgent extends initiative_agent_1.ProactiveAgent {
    /**
     * Creates a new VerificationAgent
     */
    constructor(config, blockchainService, verificationThreshold = 0.65) {
        super(config);
        this.blockchainService = blockchainService;
        this.verificationThreshold = verificationThreshold;
    }
    /**
     * Analyzes context for verification opportunity
     * @param context Current context
     * @private
     */
    analyzeInitiativeOpportunity(context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check for unverified actions or content that should be verified
            const verificationOpportunities = yield this.blockchainService.identifyVerificationOpportunities(context.recentActions, context.contentItems, this.verificationThreshold);
            if (!verificationOpportunities || verificationOpportunities.length === 0) {
                return { score: 0.3, confidence: 0.9 };
            }
            // Calculate initiative score based on verification importance and quantity
            const avgImportanceScore = verificationOpportunities.reduce((sum, opp) => sum + opp.importanceScore, 0) / verificationOpportunities.length;
            const urgencyFactor = verificationOpportunities.some(opp => opp.isUrgent) ? 0.3 : 0.0;
            const quantityFactor = Math.min(verificationOpportunities.length / 5, 0.2); // Max 0.2 for 5+ items
            // Combine factors for final score
            const score = (avgImportanceScore * 0.5) + urgencyFactor + quantityFactor;
            const confidence = 0.85 + (avgImportanceScore * 0.15); // Higher importance increases confidence
            return {
                score: score,
                confidence: confidence
            };
        });
    }
    /**
     * Creates initiative message for verification opportunities
     * @param context Current context
     * @private
     */
    createBaseInitiativeMessage(context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Identify verification opportunities
            const verificationOpportunities = yield this.blockchainService.identifyVerificationOpportunities(context.recentActions, context.contentItems, this.verificationThreshold);
            // Store opportunities in context for later use
            context.verificationOpportunities = verificationOpportunities;
            // Create dynamic opening based on opportunity quantity and type
            const urgentOpportunities = verificationOpportunities.filter(opp => opp.isUrgent);
            if (urgentOpportunities.length > 0) {
                const topUrgent = urgentOpportunities[0];
                return `I've identified ${urgentOpportunities.length} urgent verification ${urgentOpportunities.length === 1 ? 'task' : 'tasks'} requiring your attention, including ${topUrgent.description}. Would you like me to initiate the verification process?`;
            }
            else if (verificationOpportunities.length === 1) {
                const opportunity = verificationOpportunities[0];
                return `I've identified that "${opportunity.itemName}" requires blockchain verification to ensure ${opportunity.verificationType} integrity. Would you like me to initiate the verification process?`;
            }
            else {
                return `I've identified ${verificationOpportunities.length} items that would benefit from blockchain verification to ensure data integrity and compliance. Would you like me to present these verification opportunities?`;
            }
        });
    }
    /**
     * Adds workflow boundaries for verification process
     * @param message Base message
     * @param context Current context
     * @private
     */
    addWorkflowBoundaries(message, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const opportunities = context.verificationOpportunities || [];
            // Define process steps based on verification types
            const hasOwnership = opportunities.some(opp => opp.verificationType === 'ownership');
            const hasAuthenticity = opportunities.some(opp => opp.verificationType === 'authenticity');
            const hasCompliance = opportunities.some(opp => opp.verificationType === 'compliance');
            let processSteps = "data preparation, blockchain submission, and verification confirmation";
            if (hasOwnership && hasAuthenticity && hasCompliance) {
                processSteps = "data preparation, ownership verification, authenticity validation, compliance checking, and blockchain registration";
            }
            else if (hasOwnership && hasAuthenticity) {
                processSteps = "data preparation, ownership verification, authenticity validation, and blockchain registration";
            }
            return `${message}\n\nIf you'd like to proceed, I'll guide you through ${processSteps}. The process will conclude with blockchain-verified records and verification certificates for your records.`;
        });
    }
    /**
     * Confirms completion of verification process
     * @param context Current context
     * @param verificationResult Verification result
     * @private
     */
    createBaseCompletionMessage(context, verificationResult) {
        return __awaiter(this, void 0, void 0, function* () {
            const opportunities = context.verificationOpportunities || [];
            if (opportunities.length === 1) {
                const opportunity = opportunities[0];
                return `I've successfully completed the blockchain verification for "${opportunity.itemName}". The verification process has generated a secure blockchain record with transaction ID ${verificationResult.transactionId}. A verification certificate has been created and stored in your secure document repository.`;
            }
            else {
                const successCount = verificationResult.successCount || 0;
                const failureCount = (opportunities.length - successCount) || 0;
                let message = `I've completed the blockchain verification process for ${opportunities.length} items. `;
                if (failureCount === 0) {
                    message += `All items were successfully verified and have been recorded on the blockchain. `;
                }
                else {
                    message += `${successCount} items were successfully verified, while ${failureCount} ${failureCount === 1 ? 'item requires' : 'items require'} additional information. `;
                }
                message += `Verification certificates have been created for all successful verifications and stored in your secure document repository.`;
                return message;
            }
        });
    }
    /**
     * Generates next steps for verification process
     * @param context Current context
     * @param nextSteps Generated next steps
     * @private
     */
    createBaseNextStepsMessage(context, nextSteps) {
        return __awaiter(this, void 0, void 0, function* () {
            const opportunities = context.verificationOpportunities || [];
            const verificationResult = context.verificationResult || {};
            let message = "Based on the completed verifications, here are the recommended next steps:\n\n";
            nextSteps.forEach((step, index) => {
                message += `${index + 1}. ${step.description}\n`;
            });
            if (verificationResult.failedItems && verificationResult.failedItems.length > 0) {
                message += `\nAdditionally, ${verificationResult.failedItems.length} items require further attention before they can be verified. The most critical is "${verificationResult.failedItems[0].itemName}" which needs ${verificationResult.failedItems[0].requiredAction}.`;
            }
            message += "\nWhich action would you like to take next?";
            return message;
        });
    }
}
exports.VerificationAgent = VerificationAgent;
