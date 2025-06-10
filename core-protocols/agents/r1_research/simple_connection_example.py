# Import the required class
from agent_connection import AgentConnection

# Create an agent connection instance
connection = AgentConnection(project_id="your-project-id")

# Define two agents
agent1 = "agent_alice"
agent2 = "agent_bob"

print(f"Connecting {agent1} and {agent2}...")

try:
    # Connect the two agents
    connection.connect(agent1, agent2)
    print("Connection established!")

    # Send a simple message from agent1 to agent2
    message = "Hello from agent1!"
    connection.send_message(
        from_agent=agent1,
        to_agent=agent2,
        message=message
    )
    print(f"Message sent: {message}")

except Exception as e:
    print(f"Error occurred: {e}")

