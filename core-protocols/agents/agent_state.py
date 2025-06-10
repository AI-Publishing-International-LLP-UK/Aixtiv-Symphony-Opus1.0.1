from typing import Dict, List, Callable, Any, Optional
from enum import Enum
import json
import asyncio
import threading
from datetime import datetime
import uuid
from dataclasses import dataclass, asdict

class AgentState(Enum):
    INITIALIZING = "initializing"
    IDLE = "idle"
    BUSY = "busy"
    WAITING = "waiting"
    ERROR = "error"
    TERMINATED = "terminated"

class EventType(Enum):
    STATE_CHANGE = "state_change"
    TASK_ASSIGNED = "task_assigned"
    TASK_COMPLETED = "task_completed"
    RESOURCE_REQUEST = "resource_request"
    RESOURCE_RELEASE = "resource_release"
    ERROR = "error"

@dataclass
class Event:
    event_type: EventType
    source_id: str
    timestamp: float
    data: Dict[str, Any]
    target_id: Optional[str] = None

class EventBus:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(EventBus, cls).__new__(cls)
                cls._instance._initialize()
            return cls._instance

    def _initialize(self):
        self.subscribers: Dict[EventType, List[Callable]] = {}
        self.event_history: List[Event] = []
        self.event_loop = asyncio.get_event_loop()

    def subscribe(self, event_type: EventType, callback: Callable) -> None:
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(callback)

    async def publish(self, event: Event) -> None:
        self.event_history.append(event)
        if event.event_type in self.subscribers:
            for callback in self.subscribers[event.event_type]:
                await self.event_loop.create_task(callback(event))

class StateManager:
    def __init__(self):
        self.agent_states: Dict[str, Dict[str, Any]] = {}
        self.event_bus = EventBus()
        self.lock = threading.Lock()
        self.state_file = "agent_states.json"

    async def update_agent_state(
        self, 
        agent_id: str, 
        state: AgentState, 
        metadata: Optional[Dict] = None
    ) -> None:
        with self.lock:
            current_state = {
                "state": state.value,
                "last_updated": datetime.now().isoformat(),
                "metadata": metadata or {}
            }
            self.agent_states[agent_id] = current_state
            
            await self.event_bus.publish(Event(
                event_type=EventType.STATE_CHANGE,
                source_id=agent_id,
                timestamp=datetime.now().timestamp(),
                data=current_state
            ))
            
            self._persist_states()

    def get_agent_state(self, agent_id: str) -> Optional[Dict]:
        return self.agent_states.get(agent_id)

    def _persist_states(self) -> None:
        with open(self.state_file, 'w') as f:
            json.dump(self.agent_states, f)

    def load_states(self) -> None:
        try:
            with open(self.state_file, 'r') as f:
                self.agent_states = json.load(f)
        except FileNotFoundError:
            self.agent_states = {}

class AgentStateHandler:
    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self.state_manager = StateManager()
        self.event_bus = EventBus()
        self._setup_event_handlers()

    def _setup_event_handlers(self) -> None:
        self.event_bus.subscribe(EventType.TASK_ASSIGNED, self._handle_task_assigned)
        self.event_bus.subscribe(EventType.TASK_COMPLETED, self._handle_task_completed)
        self.event_bus.subscribe(EventType.ERROR, self._handle_error)

    async def _handle_task_assigned(self, event: Event) -> None:
        if event.target_id == self.agent_id:
            await self.state_manager.update_agent_state(
                self.agent_id,
                AgentState.BUSY,
                {"task_id": event.data.get("task_id")}
            )

    async def _handle_task_completed(self, event: Event) -> None:
        if event.source_id == self.agent_id:
            await self.state_manager.update_agent_state(
                self.agent_id,
                AgentState.IDLE,
                {"last_task_id": event.data.get("task_id")}
            )

    async def _handle_error(self, event: Event) -> None:
        if event.source_id == self.agent_id:
            await self.state_manager.update_agent_state(
                self.agent_id,
                AgentState.ERROR,
                {"error": event.data.get("error")}
            )

class StateSynchronizer:
    def __init__(self):
        self.state_manager = StateManager()
        self.event_bus = EventBus()
        self.sync_interval = 60  # seconds

    async def start_sync(self):
        while True:
            self.state_manager.load_states()
            await asyncio.sleep(self.sync_interval)

    async def force_sync(self):
        self.state_manager.load_states()

# Example usage
async def main():
    # Initialize state management system
    state_manager = StateManager()
    synchronizer = StateSynchronizer()
    
    # Create agent state handlers
    agent1_handler = AgentStateHandler("agent1")
    agent2_handler = AgentStateHandler("agent2")
    
    # Start state synchronization
    await synchronizer.start_sync()

if __name__ == "__main__":
    asyncio.run(main())

