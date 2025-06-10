#!/usr/bin/env python3

from agent_connection import AgentConnection
from typing import Dict, List
import logging
import sys

# Configure logging
logging.basicConfig(level=logging.INFO,
                format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    # Initialize the AgentConnection with project details
    try:
        agent_conn = AgentConnection(
            project_id="your-project-id",
            region="us-west1"
        )
        logger.info("Successfully initialized AgentConnection")
    except Exception as e:
        logger.error(f"Failed to initialize AgentConnection: {str(e)}")
        sys.exit(1)

    try:
        # Connect the first agent (DrBurby)
        drburby_status = agent_conn.connect_agent(
            agent_id="drburby",
            agent_type="researcher",
            capabilities=["analysis", "planning"]
        )
        logger.info("DrBurby connection status: %s", drburby_status)

        # Connect the second agent (ProfLee)
        proflee_status = agent_conn.connect_agent(
            agent_id="proflee",
            agent_type="professor",
            capabilities=["teaching", "review"]
        )
        logger.info("ProfLee connection status: %s", proflee_status)

        # Verify both agents are connected
        if agent_conn.check_connection_status(["drburby", "proflee"]):
            logger.info("Both agents successfully connected")

            # Create a collaborative session
            session_id = agent_conn.create_session(
                participants=["drburby", "proflee"],
                session_type="research_collaboration"
            )
            logger.info("Created collaboration session: %s", session_id)

            # Send a test message from DrBurby to ProfLee
            message_status = agent_conn.send_message(
                from_agent="drburby",
                to_agent="proflee",
                message="Hello Professor, shall we begin our research?",
                session_id=session_id
            )
            logger.info("Message sent successfully: %s", message_status)

            # Wait for and process the response
            response = agent_conn.receive_message(
                agent_id="drburby",
                timeout=30  # Wait up to 30 seconds for response
            )
            if response:
                logger.info("Received response: %s", response)

        else:
            logger.error("Failed to connect both agents")

    except ConnectionError as ce:
        logger.error(f"Connection error: {str(ce)}")
    except TimeoutError as te:
        logger.error(f"Timeout error: {str(te)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
    finally:
        # Clean up connections
        try:
            agent_conn.disconnect_all()
            logger.info("Successfully disconnected all agents")
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")

if __name__ == "__main__":
    main()

