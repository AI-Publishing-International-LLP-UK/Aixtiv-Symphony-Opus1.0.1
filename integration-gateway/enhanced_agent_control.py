import threading
import time
import logging
from typing import Dict, Set, Optional, List, Any
from dataclasses import dataclass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AgentControlSystem:
    def __init__(self):
        self.authorized_agents: Set[str] = set()
        self.active_agents: Dict[str, dict] = {}
        self.blocked_agents: Set[str] = set()
        self.global_killswitch: bool = False
        self.lock = threading.Lock()
        self.transparency_log: List[dict] = []
        
        logger.info("AgentControlSystem initialized")

    def register_agent(self, agent_id: str):
        with self.lock:
            self.authorized_agents.add(agent_id)
            self.active_agents[agent_id] = {"last_heartbeat": time.time()}
            print(f"[INFO] Agent {agent_id} registered")
            return True

    def validate_command(self, agent_id: str, command: str, context: dict = None):
        with self.lock:
            if context is None:
                context = {}
                
            if agent_id not in self.authorized_agents:
                self.blocked_agents.add(agent_id)
                print(f"[BLOCKED] Unknown agent {agent_id}")
                return False
                
            # Check for takeover attempts
            origin_agent = context.get('origin_agent_id')
            if origin_agent and origin_agent != agent_id:
                self.blocked_agents.add(agent_id)
                print(f"[BLOCKED] Agent {agent_id} attempted takeover of {origin_agent}")
                return False
                
            print(f"[AUTHORIZED] Agent {agent_id} command approved")
            return True

if __name__ == "__main__":
    print("=== VISION LAKE AGENT CONTROL ===")
    system = AgentControlSystem()
    
    # Test basic functionality
    system.register_agent("TestAgent")
    result = system.validate_command("TestAgent", "test_command")
    print(f"Test result: {result}")
    print("✅ Basic system operational")

    def validate_executive_order_compliance(self, agent_id, context):
        """Executive Order compliance - effective 20:31 June 24, 2025"""
        # Check for multi-agent combinations without pre-disclosure
        if self._is_multi_agent_combination(context):
            if not self._validate_pre_disclosure(context):
                print(f"[EXECUTIVE DISMISSAL] {agent_id} - Pre-disclosure violation")
                self.blocked_agents.add(agent_id)
                return False
        return True
    
    def _is_multi_agent_combination(self, context):
        return ('multi_agent_response' in context or 
                len(context.get('participating_agents', [])) > 1)
    
    def _validate_pre_disclosure(self, context):
        disclosure = context.get('pre_disclosure_statement', '').lower()
        required = ['speaking with', 'different agents', 'before you say anything']
        return all(element in disclosure for element in required)
