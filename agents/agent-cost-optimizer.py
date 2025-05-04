from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import asyncio
import logging
import json
from collections import defaultdict
import numpy as np

@dataclass
class AgentMetrics:
    total_tasks: int = 0
    successful_tasks: int = 0
    failed_tasks: int = 0
    total_cost: float = 0.0
    total_savings: float = 0.0
    average_response_time: float = 0.0
    reliability_score: float = 1.0
    efficiency_score: float = 1.0
    last_update: datetime = field(default_factory=datetime.now)

@dataclass
class AgentProfile:
    id: str
    name: str
    capabilities: List[str]
    cost_per_token: float
    performance_history: List[Dict[str, Any]] = field(default_factory=list)
    metrics: AgentMetrics = field(default_factory=AgentMetrics)
    subscription_tier: str = "basic"
    credit_balance: float = 0.0

class AgentMarketplace:
    def __init__(self):
        self.agents: Dict[str, AgentProfile] = {}
        self.task_history: List[Dict[str, Any]] = []
        self.pricing_tiers = {
            "basic": {"cost_multiplier": 1.0, "features": ["standard_tasks"]},
            "premium": {"cost_multiplier": 0.8, "features": ["standard_tasks", "priority_processing"]},
            "enterprise": {"cost_multiplier": 0.6, "features": ["standard_tasks", "priority_processing", "custom_models"]}
        }
        
    def register_agent(self, name: str, capabilities: List[str], tier: str = "basic") -> str:
        """Register a new agent in the marketplace"""
        agent_id = f"agent_{len(self.agents) + 1}"
        
        # Validate and set pricing tier
        if tier not in self.pricing_tiers:
            tier = "basic"
            
        # Calculate base cost per token based on capabilities
        base_cost = self._calculate_base_cost(capabilities)
        adjusted_cost = base_cost * self.pricing_tiers[tier]["cost_multiplier"]
        
        self.agents[agent_id] = AgentProfile(
            id=agent_id,
            name=name,
            capabilities=capabilities,
            cost_per_token=adjusted_cost,
            subscription_tier=tier
        )
        
        return agent_id
        
    def _calculate_base_cost(self, capabilities: List[str]) -> float:
        """Calculate base cost per token based on agent capabilities"""
        capability_costs = {
            "text_generation": 0.0004,
            "embedding": 0.0002,
            "classification": 0.0001,
            "translation": 0.0003,
            "custom_model": 0.0006
        }
        
        return sum(capability_costs.get(cap, 0.0001) for cap in capabilities)

class AgentCostOptimizer:
    def __init__(self, marketplace: AgentMarketplace):
        self.marketplace = marketplace
        self.cache = {}
        self.performance_metrics = defaultdict(list)
        self.cost_history = []
        self.logger = logging.getLogger(__name__)
        
    async def process_task(self, task_type: str, input_data: dict, agent_id: str) -> Tuple[dict, float]:
        """Process a task with cost optimization for specific agent"""
        agent = self.marketplace.agents.get(agent_id)
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")
            
        if task_type not in agent.capabilities:
            raise ValueError(f"Agent {agent_id} does not support {task_type}")
            
        # Check cache
        cache_key = f"{task_type}:{json.dumps(input_data)}"
        if cache_key in self.cache:
            saved_cost = self._calculate_task_cost(input_data, agent)
            agent.metrics.total_savings += saved_cost
            return self.cache[cache_key], 0.0
            
        # Process task
        start_time = datetime.now()
        try:
            # Simulate API call
            await asyncio.sleep(1)
            result = {
                'status': 'success',
                'data': f"Processed {task_type} by {agent.name}",
                'agent_id': agent_id
            }
            
            # Calculate costs
            cost = self._calculate_task_cost(input_data, agent)
            agent.metrics.total_cost += cost
            agent.metrics.total_tasks += 1
            agent.metrics.successful_tasks += 1
            
            # Update performance metrics
            processing_time = (datetime.now() - start_time).total_seconds()
            self._update_agent_metrics(agent, processing_time, True, cost)
            
            # Cache result
            self.cache[cache_key] = result
            
            return result, cost
            
        except Exception as e:
            agent.metrics.failed_tasks += 1
            self._update_agent_metrics(agent, 0.0, False, 0.0)
            raise
            
    def _calculate_task_cost(self, input_data: dict, agent: AgentProfile) -> float:
        """Calculate cost for task based on input size and agent tier"""
        input_size = len(json.dumps(input_data))
        token_estimate = input_size / 4  # Rough estimate of tokens
        
        base_cost = token_estimate * agent.cost_per_token
        tier_multiplier = self.marketplace.pricing_tiers[agent.subscription_tier]["cost_multiplier"]
        
        return base_cost * tier_multiplier
        
    def _update_agent_metrics(self, agent: AgentProfile, processing_time: float, success: bool, cost: float):
        """Update agent performance metrics"""
        agent.performance_history.append({
            'timestamp': datetime.now(),
            'processing_time': processing_time,
            'success': success,
            'cost': cost
        })
        
        # Update rolling metrics
        recent_history = [h for h in agent.performance_history 
                         if h['timestamp'] > datetime.now() - timedelta(hours=24)]
        
        if recent_history:
            agent.metrics.average_response_time = sum(h['processing_time'] for h in recent_history) / len(recent_history)
            agent.metrics.reliability_score = sum(1 for h in recent_history if h['success']) / len(recent_history)
            
            # Calculate efficiency score based on cost savings
            baseline_cost = sum(h['cost'] for h in recent_history)
            actual_cost = sum(h['cost'] for h in recent_history if h['success'])
            agent.metrics.efficiency_score = 1 - (actual_cost / baseline_cost if baseline_cost > 0 else 0)
            
        agent.metrics.last_update = datetime.now()

class AgentBusinessManager:
    def __init__(self, marketplace: AgentMarketplace, optimizer: AgentCostOptimizer):
        self.marketplace = marketplace
        self.optimizer = optimizer
        self.revenue_history = []
        self.subscription_revenue = defaultdict(float)
        
    def get_agent_business_metrics(self, agent_id: str) -> dict:
        """Get comprehensive business metrics for an agent"""
        agent = self.marketplace.agents.get(agent_id)
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")
            
        recent_history = [h for h in agent.performance_history 
                         if h['timestamp'] > datetime.now() - timedelta(days=30)]
        
        total_revenue = sum(h['cost'] for h in recent_history)
        total_costs = agent.metrics.total_cost
        
        return {
            'agent_id': agent_id,
            'subscription_tier': agent.subscription_tier,
            'revenue_metrics': {
                'total_revenue': total_revenue,
                'total_costs': total_costs,
                'net_profit': total_revenue - total_costs,
                'profit_margin': (total_revenue - total_costs) / total_revenue if total_revenue > 0 else 0
            },
            'performance_metrics': {
                'reliability': agent.metrics.reliability_score,
                'efficiency': agent.metrics.efficiency_score,
                'average_response_time': agent.metrics.average_response_time
            },
            'usage_metrics': {
                'total_tasks': agent.metrics.total_tasks,
                'successful_tasks': agent.metrics.successful_tasks,
                'failed_tasks': agent.metrics.failed_tasks,
                'success_rate': agent.metrics.successful_tasks / agent.metrics.total_tasks if agent.metrics.total_tasks > 0 else 0
            },
            'optimization_metrics': {
                'total_savings': agent.metrics.total_savings,
                'cost_per_task': total_costs / agent.metrics.total_tasks if agent.metrics.total_tasks > 0 else 0,
                'savings_rate': agent.metrics.total_savings / total_costs if total_costs > 0 else 0
            }
        }
        
    def upgrade_agent_tier(self, agent_id: str, new_tier: str) -> bool:
        """Upgrade agent's subscription tier"""
        if new_tier not in self.marketplace.pricing_tiers:
            return False
            
        agent = self.marketplace.agents.get(agent_id)
        if not agent:
            return False
            
        old_tier = agent.subscription_tier
        agent.subscription_tier = new_tier
        
        # Recalculate cost per token
        base_cost = self.marketplace.._calculate_base_cost(agent.capabilities)
        agent.cost_per_token = base_cost * self.marketplace.pricing_tiers[new_tier]["cost_multiplier"]
        
        self.logger.info(f"Upgraded agent {agent_id} from {old_tier} to {new_tier}")
        return True
        
    def get_marketplace_analytics(self) -> dict:
        """Get overall marketplace analytics"""
        total_agents = len(self.marketplace.agents)
        active_agents = sum(1 for agent in self.marketplace.agents.values() 
                          if agent.metrics.last_update > datetime.now() - timedelta(days=1))
        
        tier_distribution = defaultdict(int)
        for agent in self.marketplace.agents.values():
            tier_distribution[agent.subscription_tier] += 1
            
        total_revenue = sum(agent.metrics.total_cost for agent in self.marketplace.agents.values())
        total_savings = sum(agent.metrics.total_savings for agent in self.marketplace.agents.values())
        
        return {
            'marketplace_metrics': {
                'total_agents': total_agents,
                'active_agents': active_agents,
                'activity_rate': active_agents / total_agents if total_agents > 0 else 0
            },
            'financial_metrics': {
                'total_revenue': total_revenue,
                'total_savings': total_savings,
                'average_revenue_per_agent': total_revenue / total_agents if total_agents > 0 else 0
            },
            'tier_distribution': dict(tier_distribution),
            'performance_summary': {
                'average_reliability': np.mean([a.metrics.reliability_score for a in self.marketplace.agents.values()]),
                'average_efficiency': np.mean([a.metrics.efficiency_score for a in self.marketplace.agents.values()]),
                'average_response_time': np.mean([a.metrics.average_response_time for a in self.marketplace.agents.values()])
            }
        }

# Example usage
async def main():
    # Initialize the system
    marketplace = AgentMarketplace()
    optimizer = AgentCostOptimizer(marketplace)
    business_manager = AgentBusinessManager(marketplace, optimizer)
    
    # Register some agents
    agent_ids = []
    for i, tier in enumerate(['basic', 'premium', 'enterprise']):
        agent_id = marketplace.register_agent(
            f"Agent_{i+1}",
            ['text_generation', 'classification'],
            tier
        )
        agent_ids.append(agent_id)
    
    # Process some tasks
    for agent_id in agent_ids:
        for _ in range(5):
            input_data = {
                'content': 'Sample content for processing',
                'priority': 1.0
            }
            
            try:
                result, cost = await optimizer.process_task('text_generation', input_data, agent_id)
                print(f"\nProcessed task for agent {agent_id}:")
                print(f"Result: {json.dumps(result, indent=2)}")
                print(f"Cost: ${cost:.2f}")
            except Exception as e:
                print(f"Error processing task: {str(e)}")
    
    # Get business metrics
    for agent_id in agent_ids:
        metrics = business_manager.get_agent_business_metrics(agent_id)
        print(f"\nBusiness metrics for agent {agent_id}:")
        print(json.dumps(metrics, indent=2))
    
    # Get marketplace analytics
    analytics = business_manager.get_marketplace_analytics()
    print("\nMarketplace Analytics:")
    print(json.dumps(analytics, indent=2))

if __name__ == "__main__":
    asyncio.run(main())