from typing import Dict, List, Optional, Set, Tuple
import asyncio
from dataclasses import dataclass
from enum import Enum
import heapq
import time
import uuid
from concurrent.futures import ThreadPoolExecutor

class TaskStatus(Enum):
    PENDING = "pending"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRY = "retry"

class TaskPriority(Enum):
    CRITICAL = 0
    HIGH = 1
    MEDIUM = 2
    LOW = 3

@dataclass
class Task:
    id: str
    name: str
    priority: TaskPriority
    dependencies: Set[str]
    payload: Dict
    status: TaskStatus
    created_at: float
    scheduled_at: Optional[float] = None
    completed_at: Optional[float] = None
    assigned_agent: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    
    def __lt__(self, other):
        if self.priority.value == other.priority.value:
            return self.created_at < other.created_at
        return self.priority.value < other.priority.value

class AgentScheduler:
    def __init__(self, max_concurrent_tasks: int = 100):
        self.task_queue: List[Task] = []
        self.running_tasks: Dict[str, Task] = {}
        self.completed_tasks: Dict[str, Task] = {}
        self.failed_tasks: Dict[str, Task] = {}
        self.dependency_graph: Dict[str, Set[str]] = {}
        self.max_concurrent_tasks = max_concurrent_tasks
        self.executor = ThreadPoolExecutor(max_workers=max_concurrent_tasks)
        self._lock = asyncio.Lock()
        
    async def submit_task(
        self,
        name: str,
        payload: Dict,
        priority: TaskPriority,
        dependencies: Optional[Set[str]] = None
    ) -> str:
        task_id = str(uuid.uuid4())
        task = Task(
            id=task_id,
            name=name,
            priority=priority,
            dependencies=dependencies or set(),
            payload=payload,
            status=TaskStatus.PENDING,
            created_at=time.time()
        )
        
        async with self._lock:
            heapq.heappush(self.task_queue, task)
            if dependencies:
                self.dependency_graph[task_id] = dependencies
            
        await self._schedule_pending_tasks()
        return task_id
        
    async def _schedule_pending_tasks(self):
        async with self._lock:
            while (
                len(self.running_tasks) < self.max_concurrent_tasks
                and self.task_queue
            ):
                task = heapq.heappop(self.task_queue)
                
                if not self._are_dependencies_met(task):
                    heapq.heappush(self.task_queue, task)
                    continue
                    
                await self._start_task(task)
                
    def _are_dependencies_met(self, task: Task) -> bool:
        if not task.dependencies:
            return True
            
        return all(
            dep_id in self.completed_tasks
            for dep_id in task.dependencies
        )
        
    async def _start_task(self, task: Task):
        task.status = TaskStatus.SCHEDULED
        task.scheduled_at = time.time()
        self.running_tasks[task.id] = task
        
        try:
            task.status = TaskStatus.RUNNING
            result = await self._execute_task(task)
            await self._handle_task_completion(task, result)
        except Exception as e:
            await self._handle_task_failure(task, str(e))
            
    async def _execute_task(self, task: Task) -> Dict:
        # Simulate task execution with the payload
        await asyncio.sleep(0.1 * task.priority.value)
        return {"status": "success", "result": f"Completed {task.name}"}
        
    async def _handle_task_completion(self, task: Task, result: Dict):
        async with self._lock:
            task.status = TaskStatus.COMPLETED
            task.completed_at = time.time()
            self.completed_tasks[task.id] = task
            del self.running_tasks[task.id]
            
            # Clean up dependency graph
            if task.id in self.dependency_graph:
                del self.dependency_graph[task.id]
                
            await self._schedule_pending_tasks()
            
    async def _handle_task_failure(self, task: Task, error: str):
        async with self._lock:
            task.retry_count += 1
            
            if task.retry_count <= task.max_retries:
                task.status = TaskStatus.RETRY
                heapq.heappush(self.task_queue, task)
            else:
                task.status = TaskStatus.FAILED
                self.failed_tasks[task.id] = task
                
            if task.id in self.running_tasks:
                del self.running_tasks[task.id]
                
            await self._schedule_pending_tasks()
            
    async def get_task_status(self, task_id: str) -> Optional[TaskStatus]:
        for task_dict in [self.running_tasks, self.completed_tasks, self.failed_tasks]:
            if task_id in task_dict:
                return task_dict[task_id].status
                
        for task in self.task_queue:
            if task.id == task_id:
                return task.status
                
        return None
        
    async def get_metrics(self) -> Dict:
        return {
            "pending_tasks": len(self.task_queue),
            "running_tasks": len(self.running_tasks),
            "completed_tasks": len(self.completed_tasks),
            "failed_tasks": len(self.failed_tasks)
        }

# Example usage
async def main():
    scheduler = AgentScheduler(max_concurrent_tasks=5)
    
    # Create some tasks with dependencies
    task1_id = await scheduler.submit_task(
        "Task 1",
        {"data": "task1"},
        TaskPriority.HIGH
    )
    
    task2_id = await scheduler.submit_task(
        "Task 2",
        {"data": "task2"},
        TaskPriority.MEDIUM,
        dependencies={task1_id}
    )
    
    # Monitor task status
    while True:
        task1_status = await scheduler.get_task_status(task1_id)
        task2_status = await scheduler.get_task_status(task2_id)
        
        if (
            task1_status == TaskStatus.COMPLETED
            and task2_status == TaskStatus.COMPLETED
        ):
            break
            
        metrics = await scheduler.get_metrics()
        print(f"Current metrics: {metrics}")
        await asyncio.sleep(0.1)

if __name__ == "__main__":
    asyncio.run(main())

