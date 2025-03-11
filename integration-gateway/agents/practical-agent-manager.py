class SimpleAgent:
    def __init__(self, name, skills):
        self.name = name
        self.skills = skills
        self.tasks_completed = 0
        self.total_cost = 0.0
        self.is_busy = False

    def __str__(self):
        return f"Agent: {self.name} | Skills: {', '.join(self.skills)}"

class AgentManager:
    def __init__(self):
        self.agents = {}
        self.task_history = []
        self.cache = {}

    def add_agent(self, name, skills):
        """Add a new agent to the system"""
        agent_id = f"agent_{len(self.agents) + 1}"
        self.agents[agent_id] = SimpleAgent(name, skills)
        print(f"Added agent: {name} with ID: {agent_id}")
        return agent_id

    def find_agent(self, skill):
        """Find available agent with specific skill"""
        for agent_id, agent in self.agents.items():
            if skill in agent.skills and not agent.is_busy:
                return agent_id
        return None

    def assign_task(self, skill, task_data):
        """Assign task to agent with matching skill"""
        # Check cache first
        cache_key = f"{skill}:{task_data}"
        if cache_key in self.cache:
            print("Using cached result")
            return self.cache[cache_key]

        agent_id = self.find_agent(skill)
        if not agent_id:
            return "No available agent with required skill"

        agent = self.agents[agent_id]
        agent.is_busy = True

        # Process task
        result = self._process_task(agent, skill, task_data)
        
        # Update agent stats
        agent.tasks_completed += 1
        agent.is_busy = False

        # Cache result
        self.cache[cache_key] = result
        
        return result

    def _process_task(self, agent, skill, task_data):
        """Process a task (simplified simulation)"""
        # Simulate task processing
        result = f"Task processed by {agent.name} using {skill}"
        
        # Record in history
        self.task_history.append({
            'agent': agent.name,
            'skill': skill,
            'data': task_data,
            'result': result
        })
        
        return result

    def get_agent_stats(self, agent_id):
        """Get statistics for specific agent"""
        agent = self.agents.get(agent_id)
        if not agent:
            return "Agent not found"

        return {
            'name': agent.name,
            'skills': agent.skills,
            'tasks_completed': agent.tasks_completed,
            'is_busy': agent.is_busy
        }

    def get_system_stats(self):
        """Get overall system statistics"""
        return {
            'total_agents': len(self.agents),
            'total_tasks': len(self.task_history),
            'available_skills': self._get_all_skills(),
            'cache_size': len(self.cache)
        }

    def _get_all_skills(self):
        """Get list of all available skills"""
        skills = set()
        for agent in self.agents.values():
            skills.update(agent.skills)
        return list(skills)

# Example usage
def main():
    # Create manager
    manager = AgentManager()

    # Add some agents
    agent1 = manager.add_agent("TextBot", ["writing", "translation"])
    agent2 = manager.add_agent("DataBot", ["analysis", "classification"])

    # Assign some tasks
    print("\nAssigning tasks:")
    print(manager.assign_task("writing", "Write a story"))
    print(manager.assign_task("analysis", "Analyze this data"))

    # Get agent stats
    print("\nAgent stats:")
    print(manager.get_agent_stats(agent1))

    # Get system stats
    print("\nSystem stats:")
    print(manager.get_system_stats())

if __name__ == "__main__":
    main()