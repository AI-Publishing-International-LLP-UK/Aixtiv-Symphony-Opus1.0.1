import asyncio
import json
from datetime import datetime
from typing import List, Dict
from concurrent_agents import (
    ConcurrentAgent,
    RequestPriority,
    ServiceAccount,
    Workflow,
    WorkflowStep,
    Permission
)

async def create_service_accounts():
    print("\n=== Creating Service Accounts ===")
    
    # Create service accounts with different permission levels
    accounts = {
        "data_scientist": ServiceAccount(
            name="data_scientist",
            permissions=[
                Permission.READ_DATA,
                Permission.WRITE_DATA,
                Permission.EXECUTE_WORKFLOW
            ]
        ),
        "analyst": ServiceAccount(
            name="analyst",
            permissions=[Permission.READ_DATA]
        ),
        "admin": ServiceAccount(
            name="admin",
            permissions=[p for p in Permission]  # All permissions
        )
    }
    
    for name, account in accounts.items():
        print(f"Created service account: {name}")
        print(f"Permissions: {[p.name for p in account.permissions]}")
    
    return accounts

def create_sample_workflow() -> Workflow:
    print("\n=== Creating Sample Workflow ===")
    
    # Define workflow steps
    data_prep = WorkflowStep(
        name="data_preparation",
        required_permissions=[Permission.READ_DATA],
        compute_units=10
    )
    
    analysis = WorkflowStep(
        name="data_analysis",
        required_permissions=[Permission.READ_DATA, Permission.WRITE_DATA],
        compute_units=20,
        dependencies=[data_prep]
    )
    
    reporting = WorkflowStep(
        name="generate_report",
        required_permissions=[Permission.READ_DATA, Permission.WRITE_DATA],
        compute_units=15,
        dependencies=[analysis]
    )
    
    # Create workflow
    workflow = Workflow(
        name="data_processing_pipeline",
        steps=[data_prep, analysis, reporting]
    )
    
    print(f"Created workflow: {workflow.name}")
    print("Steps:")
    for step in workflow.steps:
        print(f"- {step.name} (Compute Units: {step.compute_units})")
        if step.dependencies:
            print(f"  Dependencies: {[dep.name for dep in step.dependencies]}")
    
    return workflow

async def create_agents(accounts: Dict[str, ServiceAccount]) -> List[ConcurrentAgent]:
    print("\n=== Creating Agents ===")
    
    agents = [
        ConcurrentAgent(
            name="DataScientist_Agent",
            priority=RequestPriority.R1,
            service_account=accounts["data_scientist"]
        ),
        ConcurrentAgent(
            name="Analyst_Agent",
            priority=RequestPriority.R2,
            service_account=accounts["analyst"]
        ),
        ConcurrentAgent(
            name="Admin_Agent",
            priority=RequestPriority.CEO,
            service_account=accounts["admin"]
        )
    ]
    
    # Connect all agents
    for agent in agents:
        connected = await agent.connect()
        print(f"Agent {agent.name} connected: {connected}")
    
    return agents

async def execute_workflow(workflow: Workflow, agents: List[ConcurrentAgent]):
    print("\n=== Executing Workflow ===")
    print(f"Starting workflow execution at {datetime.now()}")
    
    data_scientist = agents[0]  # Use data scientist agent for processing
    
    try:
        # Submit workflow for execution
        workflow_id = await data_scientist.submit_workflow(workflow)
        print(f"Workflow submitted with ID: {workflow_id}")
        
        # Monitor workflow progress
        while True:
            status = await data_scientist.get_workflow_status(workflow_id)
            print(f"\nWorkflow Status:")
            print(f"Overall Progress: {status.progress}%")
            print("Step Status:")
            for step, step_status in status.step_status.items():
                print(f"- {step}: {step_status}")
            
            if status.completed:
                print(f"\nWorkflow completed at {datetime.now()}")
                print("Final Metrics:")
                print(json.dumps(status.metrics, indent=2))
                break
            
            await asyncio.sleep(1)
    
    except Exception as e:
        print(f"Error executing workflow: {e}")

async def main():
    # Create service accounts
    accounts = await create_service_accounts()
    
    # Create workflow
    workflow = create_sample_workflow()
    
    # Create and connect agents
    agents = await create_agents(accounts)
    
    # Execute and monitor workflow
    await execute_workflow(workflow, agents)

if __name__ == "__main__":
    asyncio.run(main())

