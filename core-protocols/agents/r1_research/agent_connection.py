import logging
import os
import time
from typing import Dict, List, Optional, Any
from datetime import datetime

from google.cloud import firestore
from google.cloud import aiplatform
from google.api_core import retry

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AgentConnection:
    """
    A class to manage connections and communication between AI agents.
    
    This class provides a unified interface for agent-to-agent communication,
    message passing, and collaborative task execution using Google Cloud Platform
    services (Vertex AI and Firestore).
    
    Attributes:
        project_id (str): The GCP project ID
        location (str): The GCP region/location
        db (firestore.Client): Firestore client instance
        vertex_ai_client (aiplatform.PredictionServiceClient): Vertex AI client
    """
    
    def __init__(self, project_id: str, location: str = "us-west1"):
        """
        Initialize the AgentConnection instance.
        
        Args:
            project_id (str): The GCP project ID
            location (str): The GCP region/location (default: "us-west1")
        """
        self.project_id = project_id
        self.location = location
        
        # Initialize GCP clients
        try:
            self.db = firestore.Client(project=project_id)
            aiplatform.init(project=project_id, location=location)
            self.vertex_ai_client = aiplatform.PredictionServiceClient()
            logger.info("Successfully initialized GCP clients")
        except Exception as e:
            logger.error(f"Failed to initialize GCP clients: {str(e)}")
            raise
        
        # Initialize connection state
        self._connected_agents: Dict[str, Dict] = {}
        
    @retry.Retry(predicate=retry.if_exception_type(Exception))
    def connect_agent(self, agent_id: str, endpoint_id: str) -> bool:
        """
        Connect to an AI agent using Vertex AI endpoint.
        
        Args:
            agent_id (str): Unique identifier for the agent
            endpoint_id (str): Vertex AI endpoint ID for the agent
            
        Returns:
            bool: True if connection successful, False otherwise
        """
        try:
            endpoint = aiplatform.Endpoint(endpoint_id)
            self._connected_agents[agent_id] = {
                "endpoint": endpoint,
                "connected_at": datetime.utcnow(),
                "status": "connected"
            }
            logger.info(f"Successfully connected to agent: {agent_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to agent {agent_id}: {str(e)}")
            return False
        
    def send_message(
        self, 
        from_agent: str, 
        to_agent: str, 
        message: Dict[str, Any],
        timeout: int = 30
    ) -> Optional[Dict]:
        """
        Send a message from one agent to another.
        
        Args:
            from_agent (str): ID of the sending agent
            to_agent (str): ID of the receiving agent
            message (Dict[str, Any]): Message content
            timeout (int): Timeout in seconds (default: 30)
            
        Returns:
            Optional[Dict]: Response from the receiving agent if successful
        """
        if not all(agent in self._connected_agents for agent in [from_agent, to_agent]):
            logger.error("Both agents must be connected before sending messages")
            return None
            
        try:
            # Store message in Firestore
            message_ref = self.db.collection("agent_messages").document()
            message_data = {
                "from_agent": from_agent,
                "to_agent": to_agent,
                "content": message,
                "timestamp": datetime.utcnow(),
                "status": "pending"
            }
            message_ref.set(message_data)
            
            # Send to receiving agent's endpoint
            endpoint = self._connected_agents[to_agent]["endpoint"]
            response = endpoint.predict(instances=[message])
            
            # Update message status
            message_ref.update({
                "status": "delivered",
                "response": response
            })
            
            return response
        except Exception as e:
            logger.error(f"Failed to send message: {str(e)}")
            return None
        
    def create_collaborative_session(
        self, 
        agents: List[str], 
        session_config: Dict[str, Any]
    ) -> Optional[str]:
        """
        Create a collaborative session between multiple agents.
        
        Args:
            agents (List[str]): List of agent IDs to participate
            session_config (Dict[str, Any]): Configuration for the session
            
        Returns:
            Optional[str]: Session ID if successful
        """
        if not all(agent in self._connected_agents for agent in agents):
            logger.error("All agents must be connected to create a session")
            return None
            
        try:
            session_ref = self.db.collection("collaborative_sessions").document()
            session_data = {
                "agents": agents,
                "config": session_config,
                "status": "active",
                "created_at": datetime.utcnow(),
                "last_activity": datetime.utcnow()
            }
            session_ref.set(session_data)
            logger.info(f"Created collaborative session: {session_ref.id}")
            return session_ref.id
        except Exception as e:
            logger.error(f"Failed to create collaborative session: {str(e)}")
            return None
        
    def disconnect_agent(self, agent_id: str) -> bool:
        """
        Disconnect an agent from the system.
        
        Args:
            agent_id (str): ID of the agent to disconnect
            
        Returns:
            bool: True if successfully disconnected
        """
        try:
            if agent_id in self._connected_agents:
                self._connected_agents[agent_id]["status"] = "disconnected"
                del self._connected_agents[agent_id]
                logger.info(f"Successfully disconnected agent: {agent_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error disconnecting agent {agent_id}: {str(e)}")
            return False
        
    def get_connection_status(self) -> Dict[str, Dict]:
        """
        Get the current connection status of all agents.
        
        Returns:
            Dict[str, Dict]: Dictionary of agent IDs and their connection status
        """
        return self._connected_agents

