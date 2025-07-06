import asyncio
from typing import Dict, List, Optional, Callable, Awaitable
import logging
from dataclasses import dataclass
from datetime import datetime
import json
import uuid

# Performance monitoring
@dataclass
class PerformanceMetrics:
    cpu_usage: float
    memory_usage: float
    response_time: float
    timestamp: datetime

# Security and authentication
class SecurityManager:
    def __init__(self):
        self.auth_tokens: Dict[str, datetime] = {}
        self.permissions: Dict[str, List[str]] = {}
        
    def authenticate(self, token: str) -> bool:
        return token in self.auth_tokens
        
    def authorize(self, token: str, required_permission: str) -> bool:
        if not self.authenticate(token):
            return False
        return required_permission in self.permissions.get(token, [])
        
    def generate_token(self, permissions: List[str]) -> str:
        token = str(uuid.uuid4())
        self.auth_tokens[token] = datetime.now()
        self.permissions[token] = permissions
        return token

# Agent definition
@dataclass
class Agent:
    id: str
    name: str
    skills: List[str]
    performance_history: List[PerformanceMetrics]
    is_busy: bool = False
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "skills": self.skills,
            "is_busy": self.is_busy
        }

# Multi-agent manager with security and performance monitoring
class EnhancedMultiAgentManager:
    def __init__(self):
        self.agents: Dict[str, Agent] = {}
        self.security_manager = SecurityManager()
        self.performance_history: Dict[str, List[PerformanceMetrics]] = {}
        self.logger = logging.getLogger(__name__)
        
    def register_agent(self, name: str, skills: List[str], auth_token: str) -> Optional[str]:
        """Register a new agent with security check"""
        if not self.security_manager.authorize(auth_token, "register_agent"):
            self.logger.warning(f"Unauthorized attempt to register agent: {name}")
            return None
            
        agent_id = str(uuid.uuid4())
        self.agents[agent_id] = Agent(
            id=agent_id,
            name=name,
            skills=skills,
            performance_history=[]
        )
        self.logger.info(f"Registered new agent: {name} with ID: {agent_id}")
        return agent_id
        
    async def assign_task(self, skill: str, task: Callable[..., Awaitable], auth_token: str):
        """Assign task with security and performance monitoring"""
        if not self.security_manager.authorize(auth_token, "assign_task"):
            raise PermissionError("Unauthorized task assignment attempt")
            
        available_agents = [
            agent for agent in self.agents.values()
            if skill in agent.skills and not agent.is_busy
        ]
        
        if not available_agents:
            raise ValueError(f"No available agents with skill: {skill}")
            
        # Select agent with best recent performance
        selected_agent = max(
            available_agents,
            key=lambda a: sum(m.response_time for m in a.performance_history[-5:] or [PerformanceMetrics(0,0,0,datetime.now())])
        )
        
        start_time = datetime.now()
        selected_agent.is_busy = True
        
        try:
            result = await task()
            
            # Record performance metrics
            end_time = datetime.now()
            metrics = PerformanceMetrics(
                cpu_usage=0.0,  # Would need actual CPU monitoring
                memory_usage=0.0,  # Would need actual memory monitoring
                response_time=(end_time - start_time).total_seconds(),
                timestamp=end_time
            )
            selected_agent.performance_history.append(metrics)
            
            return result
            
        finally:
            selected_agent.is_busy = False
            
    def get_system_status(self, auth_token: str) -> dict:
        """Get overall system status with security check"""
        if not self.security_manager.authorize(auth_token, "view_status"):
            raise PermissionError("Unauthorized status check attempt")
            
        return {
            "active_agents": len(self.agents),
            "busy_agents": sum(1 for agent in self.agents.values() if agent.is_busy),
            "available_skills": list(set(
                skill 
                for agent in self.agents.values() 
                for skill in agent.skills
            )),
            "agents": [agent.to_dict() for agent in self.agents.values()]
        }

# Example implementation
async def main():
    # Initialize the manager
    manager = EnhancedMultiAgentManager()
    
    # Generate admin token
    admin_token = manager.security_manager.generate_token([
        "register_agent",
        "assign_task",
        "view_status"
    ])
    
    # Register some agents
    agent1_id = manager.register_agent(
        "Agent1",
        ["natural_language", "image_processing"],
        admin_token
    )
    
    agent2_id = manager.register_agent(
        "Agent2",
        ["data_analysis", "natural_language"],
        admin_token
    )
    
    # Define a sample task
    async def sample_task():
        await asyncio.sleep(1)  # Simulate work
        return "Task completed"
    
    # Assign and execute task
    try:
        result = await manager.assign_task("natural_language", sample_task, admin_token)
        print(f"Task result: {result}")
        
        # Get system status
        status = manager.get_system_status(admin_token)
        print(f"System status: {json.dumps(status, indent=2)}")
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())