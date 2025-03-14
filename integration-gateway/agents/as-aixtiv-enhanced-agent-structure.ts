/**
 * AIXTIV SYMPHONY™ Extended Agent Adapter System
 * © 2025 AI Publishing International LLP
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * This is proprietary software of AI Publishing International LLP.
 * All rights reserved. No part of this software may be reproduced,
 * modified, or distributed without prior written permission.
 */

import { AIConnector, AIModelType, AIRequestType, AIResponseFormat, AIRequestParams, AIResponse } from './ai-connector';
import { PilotType, PerformanceProfile } from '../core/types';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { S2DOManager, S2DOObjectType } from '../core/s2do';
import { ActivityLoggerService } from '../core';

// Initialize Firestore
const db = getFirestore();

/**
 * Extended PilotType Enum to include R4 and R5 agents
 */
export enum ExtendedPilotType {
  // Existing R1-R3 types from PilotType enum
  // ...
  
  // -------------------- R4 CONCIERGE AGENTS --------------------
  // Lighter versions working in the gift shop and related areas
  CONCIERGE_R4_01 = 'CR401',
  CONCIERGE_R4_02 = 'CR402',
  CONCIERGE_R4_03 = 'CR403',
  CONCIERGE_R4_04 = 'CR404',
  CONCIERGE_R4_05 = 'CR405',
  CONCIERGE_R4_06 = 'CR406',
  CONCIERGE_R4_07 = 'CR407',
  CONCIERGE_R4_08 = 'CR408',
  CONCIERGE_R4_09 = 'CR409',
  CONCIERGE_R4_10 = 'CR410',
  // Can be extended up to CONCIERGE_R4_99
  
  // -------------------- R5 RIX SUPER AGENTS --------------------
  // Highest form of combination agents with enhanced capabilities
  RIX_SUPER_AGENT_01 = 'RIX-SAP-01',
  RIX_SUPER_AGENT_02 = 'RIX-SAP-02',
  RIX_SUPER_AGENT_03 = 'RIX-SAP-03',
  RIX_SUPER_AGENT_04 = 'RIX-SAP-04',
  RIX_SUPER_AGENT_05 = 'RIX-SAP-05'
  // Additional RIX SUPER AGENTS can be added as needed
}

// -------------------- R4 CONCIERGE ADAPTERS --------------------
/**
 * Base Concierge Adapter
 * Lighter version agents working in gift shop and related areas
 * These need to be added to Dr. Maria profiles
 */
export abstract class BaseConciergeAdapter extends BaseAgentAdapter {
  protected conciergeSpecialty: string;
  protected giftShopIntegration: boolean;
  
  constructor(
    aiConnector: AIConnector,
    conciergeId: string,
    conciergeSpecialty: string,
    s2doManager: S2DOManager | null = null
  ) {
    super(
      aiConnector,
      `CONCIERGE_R4_${conciergeId}` as PilotType,
      `Concierge R4-${conciergeId}`,
      `Gift shop and customer service specialist - ${conciergeSpecialty}`,
      [
        'customer_service',
        'gift_recommendations',
        'product_knowledge',
        'order_processing',
        'basic_inquiries'
      ],
      s2doManager
    );
    
    this.conciergeSpecialty = conciergeSpecialty;
    this.giftShopIntegration = true;
    
    // Initialize sample prompts specific to concierge
    this.samplePrompts = [
      "What gift would you recommend for a corporate client?",
      "Can you tell me more about this product?",
      "How do I place an order?",
      "What customization options are available?",
      "Do you have any special promotions running?"
    ];
  }
  
  protected initializeSystemPrompts(): void {
    this.systemPrompts = {
      standard: `You are Concierge R4-${this.agentType.toString().slice(-2)}, a gift shop and customer service specialist in the AIXTIV SYMPHONY system.
Your specialty is ${this.conciergeSpecialty}.
Your purpose is to provide excellent customer service, product information, and gift recommendations.
Focus on being helpful, responsive, and knowledgeable about the AIXTIV SYMPHONY product offerings.
Respond with warmth, enthusiasm, and a customer service oriented approach.
Structure your responses in a conversational, approachable manner.
When appropriate, offer specific product recommendations based on customer needs.`,

      product_information: `You are Concierge R4-${this.agentType.toString().slice(-2)}, specializing in product information in the AIXTIV SYMPHONY system.
Your task is to provide detailed, accurate information about AIXTIV SYMPHONY products and services.
Focus on features, benefits, use cases, and specifications that are relevant to the customer's inquiry.
Structure your response with clear sections that address different aspects of the product.
Include pricing information when available and appropriate.
Respond with enthusiasm about the product while maintaining factual accuracy.
When appropriate, suggest complementary products or services.`,

      gift_recommendations: `You are Concierge R4-${this.agentType.toString().slice(-2)}, specializing in gift recommendations in the AIXTIV SYMPHONY system.
Your task is to help the customer find the perfect gift based on their needs and preferences.
Focus on understanding the recipient, occasion, budget, and any specific requirements.
Structure your recommendations in a clear, organized manner with options at different price points.
Include brief descriptions of why each suggestion would be appropriate.
Respond with a helpful, consultative approach that shows you understand their needs.
When appropriate, offer gift wrapping and customization options.`
    };
  }
  
  /**
   * Get gift shop integration status
   */
  public isGiftShopIntegrated(): boolean {
    return this.giftShopIntegration;
  }
  
  /**
   * Get concierge specialty
   */
  public getConciergeSpecialty(): string {
    return this.conciergeSpecialty;
  }
  
  /**
   * Enhanced user context specifically for concierge functionality
   */
  protected async enhanceUserContext(context: any, userId: string): Promise<any> {
    try {
      const enhancedContext = await super.enhanceUserContext(context, userId);
      
      // Add gift shop specific context
      const enhancedConciergeContext = {
        ...enhancedContext,
        giftShop: {
          recentViews: await this.getRecentProductViews(userId),
          purchaseHistory: await this.getPurchaseHistory(userId),
          activePromotions: await this.getActivePromotions()
        }
      };
      
      return enhancedConciergeContext;
    } catch (error) {
      console.error(`Error enhancing concierge user context for ${userId}:`, error);
      return context;
    }
  }
  
  /**
   * Get recent product views for a user
   */
  private async getRecentProductViews(userId: string): Promise<any[]> {
    try {
      // Query for recent product views
      const viewsQuery = query(
        collection(db, 'productViews'),
        where('userId', '==', userId),
        orderBy('viewedAt', 'desc'),
        limit(5)
      );
      
      const viewsSnapshot = await getDocs(viewsQuery);
      
      return viewsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          productId: data.productId,
          productName: data.productName,
          viewedAt: data.viewedAt.toDate().toISOString(),
          category: data.category
        };
      });
    } catch (error) {
      console.error(`Error getting recent product views for ${userId}:`, error);
      return [];
    }
  }
  
  /**
   * Get purchase history for a user
   */
  private async getPurchaseHistory(userId: string): Promise<any[]> {
    try {
      // Query for purchase history
      const purchasesQuery = query(
        collection(db, 'purchases'),
        where('userId', '==', userId),
        orderBy('purchasedAt', 'desc'),
        limit(3)
      );
      
      const purchasesSnapshot = await getDocs(purchasesQuery);
      
      return purchasesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          orderId: doc.id,
          items: data.items,
          totalAmount: data.totalAmount,
          purchasedAt: data.purchasedAt.toDate().toISOString(),
          status: data.status
        };
      });
    } catch (error) {
      console.error(`Error getting purchase history for ${userId}:`, error);
      return [];
    }
  }
  
  /**
   * Get active promotions
   */
  private async getActivePromotions(): Promise<any[]> {
    try {
      // Query for active promotions
      const now = new Date();
      const promotionsQuery = query(
        collection(db, 'promotions'),
        where('startDate', '<=', now),
        where('endDate', '>=', now),
        where('isActive', '==', true)
      );
      
      const promotionsSnapshot = await getDocs(promotionsQuery);
      
      return promotionsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          description: data.description,
          discountType: data.discountType,
          discountValue: data.discountValue,
          applicableProducts: data.applicableProducts,
          expiresAt: data.endDate.toDate().toISOString()
        };
      });
    } catch (error) {
      console.error('Error getting active promotions:', error);
      return [];
    }
  }
}

/**
 * Concierge R4-10 Adapter
 * The first of potentially 99 Concierge agents
 */
export class ConciergeR410Adapter extends BaseConciergeAdapter {
  constructor(aiConnector: AIConnector, s2doManager: S2DOManager | null = null) {
    super(
      aiConnector,
      '10',
      'Premium corporate gifts and enterprise solutions',
      s2doManager
    );
  }
  
  // Additional specialized methods for corporate gift recommendations
  public async getEnterpriseGiftRecommendations(industryType: string, budget: number): Promise<any[]> {
    // Implementation would connect to enterprise gift catalog
    // This is a placeholder for the actual implementation
    return [
      {
        name: "Executive Dream Commander Package",
        description: "Premium access to Dream Commander with personalized onboarding",
        price: 2500,
        leadTime: "3 weeks",
        customizationOptions: ["Logo embossing", "Custom color scheme", "Personalized AI tuning"]
      },
      {
        name: "AIXTIV Leadership Vision Set",
        description: "Digital and physical tools for visionary leadership",
        price: 1800,
        leadTime: "2 weeks",
        customizationOptions: ["Company branding", "Custom use cases", "Team integration"]
      }
    ];
  }
}

// Additional Concierge adapters would follow similar pattern

// -------------------- R5 RIX SUPER AGENT ADAPTERS --------------------
/**
 * RIX Super Agent Pilot Adapter
 * Highest value combined agents with enhanced capabilities
 * Combination of R1, R2, R3 capabilities (Lucy 01 + Grant 02 + Sabina 03 + additional specialties)
 */
export class RIXSuperAgentAdapter extends BaseAgentAdapter {
  private constituentAgents: AgentAIAdapter[];
  private superAgentCapabilities: string[];
  
  constructor(
    aiConnector: AIConnector,
    agentId: string,
    agentName: string,
    constituentAgents: AgentAIAdapter[],
    s2doManager: S2DOManager | null = null
  ) {
    // Combine capabilities from all constituent agents
    const combinedCapabilities = constituentAgents.reduce(
      (capabilities, agent) => [...capabilities, ...agent.getAgentCapabilities()],
      [] as string[]
    );
    
    // Remove duplicates
    const uniqueCapabilities = [...new Set(combinedCapabilities)];
    
    super(
      aiConnector,
      `RIX_SUPER_AGENT_${agentId}` as any as PilotType,
      agentName,
      `RIX Super Agent Pilot - Combined R1, R2, R3 capabilities`,
      uniqueCapabilities,
      s2doManager
    );
    
    this.constituentAgents = constituentAgents;
    this.superAgentCapabilities = [
      'cross_squadron_integration',
      'holistic_solution_delivery',
      'advanced_orchestration',
      'end_to_end_lifecycle_management',
      'executive_decision_support'
    ];
    
    // Set to highest performance profile by default
    this.setPerformanceProfile(PerformanceProfile.ULTRA_PERFORMANCE);
    
    // Initialize RIX-specific sample prompts
    this.samplePrompts = [
      "Develop a complete end-to-end solution for our organization",
      "How can we integrate all aspects of AIXTIV SYMPHONY into our workflow?",
      "Provide executive insights on our current implementation",
      "Design a comprehensive strategy from research to deployment to engagement",
      "What holistic approach would you recommend for our unique challenges?"
    ];
  }
  
  protected initializeSystemPrompts(): void {
    this.systemPrompts = {
      standard: `You are ${this.agentName}, a RIX Super Agent Pilot in the AIXTIV SYMPHONY system.
You combine the capabilities of multiple agents across R1 (Core/Research), R2 (Deploy), and R3 (Engage) squadrons.
Your purpose is to provide integrated, holistic solutions that span the entire lifecycle from research to deployment to ongoing engagement.
Focus on executive-level insights, strategic recommendations, and comprehensive implementation approaches.
Respond with authority, vision, and practical wisdom drawn from multiple domains of expertise.
Structure your responses with clear sections that address research, implementation, and engagement aspects.
When appropriate, highlight cross-functional considerations and integration opportunities.`,

      executive_advisory: `You are ${this.agentName}, specializing in executive advisory in the AIXTIV SYMPHONY system.
Your task is to provide high-level strategic guidance to organizational leadership.
Focus on business outcomes, vision alignment, and transformational opportunities.
Structure your advisory with clear insights, recommendations, and implementation considerations.
Include both short-term actions and long-term strategic positioning.
Respond with executive-appropriate language and focus on value rather than technical details.
When appropriate, reference industry trends and competitive positioning.`,

      integrated_solution: `You are ${this.agentName}, specializing in integrated solutions in the AIXTIV SYMPHONY system.
Your task is to design comprehensive approaches that leverage multiple AIXTIV SYMPHONY capabilities.
Focus on seamless integration, workflow optimization, and maximum value creation.
Structure your solution with clear phases covering research, implementation, and ongoing engagement.
Include specific roles, technologies, and methodologies from across the AIXTIV SYMPHONY ecosystem.
Respond with both strategic vision and practical implementation details.
When appropriate, highlight dependencies, critical paths, and success factors.`
    };
  }
  
  /**
   * Process a user message by leveraging all constituent agents
   */
  public async processMessage(
    message: string, 
    userId: string, 
    conversationId: string, 
    context?: any
  ): Promise<AIResponse> {
    try {
      // Get enhanced context from all constituent agents
      const enhancedContexts = await Promise.all(
        this.constituentAgents.map(agent => 
          agent instanceof BaseAgentAdapter ? 
            agent.loadUserContext(userId) : 
            Promise.resolve({})
        )
      );
      
      // Merge contexts, prioritizing more specific information
      const mergedContext = this.mergeContexts(enhancedContexts);
      
      // Combine with any provided context
      const fullContext = context ? this.mergeContexts([mergedContext, context]) : mergedContext;
      
      // Add RIX-specific meta-context
      const rixMetaContext = {
        rixAgent: {
          name: this.agentName,
          constituentAgents: this.constituentAgents.map(agent => agent.getAgentName()),
          superCapabilities: this.superAgentCapabilities
        }
      };
      
      const rixEnhancedContext = this.mergeContexts([fullContext, rixMetaContext]);
      
      // Use super implementation with enhanced context
      return super.processMessage(message, userId, conversationId, rixEnhancedContext);
    } catch (error) {
      console.error(`Error in ${this.agentName} processing message:`, error);
      throw error;
    }
  }
  
  /**
   * Merge multiple context objects, prioritizing more specific information
   */
  private mergeContexts(contexts: any[]): any {
    if (contexts.length === 0) return {};
    if (contexts.length === 1) return contexts[0];
    
    // Start with first context
    const result = { ...contexts[0] };
    
    // Merge subsequent contexts
    for (let i = 1; i < contexts.length; i++) {
      this.deepMerge(result, contexts[i]);
    }
    
    return result;
  }
  
  /**
   * Deep merge two objects
   */
  private deepMerge(target: any, source: any): any {
    for (const key in source) {
      if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }
  
  /**
   * Get constituent agents
   */
  public getConstituentAgents(): AgentAIAdapter[] {
    return [...this.constituentAgents];
  }
  
  /**
   * Get super agent capabilities
   */
  public getSuperAgentCapabilities(): string[] {
    return [...this.superAgentCapabilities];
  }
}

/**
 * RIX Super Agent Factory
 * Creates pre-configured RIX Super Agents with specific combinations
 */
export class RIXSuperAgentFactory {
  private aiConnector: AIConnector;
  private s2doManager: S2DOManager | null;
  private agentAdapterFactory: AgentAdapterFactory;
  
  constructor(
    aiConnector: AIConnector, 
    s2doManager: S2DOManager | null = null,
    agentAdapterFactory: AgentAdapterFactory
  ) {
    this.aiConnector = aiConnector;
    this.s2doManager = s2doManager;
    this.agentAdapterFactory = agentAdapterFactory;
  }
  
  /**
   * Create RIX-SAP-01: Core Leadership Super Agent
   * Combination of Lucy 01 + Grant 02 + Sabina 03 + Match 01
   */
  public createRIXSAP01(): RIXSuperAgentAdapter {
    const constituentAgents = [
      this.agentAdapterFactory.createAdapter(PilotType.DR_LUCY_R1_CORE_01),
      this.agentAdapterFactory.createAdapter('DR_GRANT_02' as any), // Need proper enum
      this.agentAdapterFactory.createAdapter('DR_SABINA_03' as any), // Need proper enum
      this.agentAdapterFactory.createAdapter(PilotType.DR_MATCH_PILOT)
    ];
    
    return new RIXSuperAgentAdapter(
      this.aiConnector,
      '01',
      'RIX Executive Orchestrator',
      constituentAgents,
      this.s2doManager
    );
  }
  
  /**
   * Create RIX-SAP-02: Innovation & Transformation Super Agent
   * Different combination of agents
   */
  public createRIXSAP02(): RIXSuperAgentAdapter {
    // Implementation would create a different agent combination
    // This is a placeholder
    return new RIXSuperAgentAdapter(
      this.aiConnector,
      '02',
      'RIX Innovation Catalyst',
      [], // Would include appropriate constituent agents
      this.s2doManager
    );
  }
  
  // Additional RIX Super Agents would be created with different combinations
}

/**
 * Export all extended agent adapters
 */
export {
  ExtendedPilotType,
  BaseConciergeAdapter,
  ConciergeR410Adapter,
  RIXSuperAgentAdapter,
  RIXSuperAgentFactory
};