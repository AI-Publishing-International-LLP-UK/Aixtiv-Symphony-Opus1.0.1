from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime
import json
import sqlite3
import numpy as np
from pathlib import Path

@dataclass
class MemoryRecord:
    timestamp: datetime
    category: str
    content: Dict[str, Any]
    importance: float
    context: Optional[Dict[str, Any]] = None
    
class MemoryStore:
    def __init__(self, db_path: str = "agent_memory.db"):
        self.db_path = db_path
        self._initialize_db()
        
    def _initialize_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY,
                agent_id TEXT,
                timestamp DATETIME,
                category TEXT,
                content TEXT,
                importance REAL,
                context TEXT,
                embedding BLOB
            )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_agent_time ON memories(agent_id, timestamp)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_importance ON memories(importance)")

class AgentMemory:
    def __init__(self, agent_id: str, capacity: int = 1000):
        self.agent_id = agent_id
        self.capacity = capacity
        self.store = MemoryStore()
        self.short_term: List[MemoryRecord] = []
        self.learning_rate = 0.1
        
    def add_memory(self, category: str, content: Dict[str, Any], importance: float, context: Optional[Dict[str, Any]] = None):
        record = MemoryRecord(
            timestamp=datetime.now(),
            category=category,
            content=content,
            importance=importance,
            context=context
        )
        
        # Add to short-term memory
        self.short_term.append(record)
        if len(self.short_term) > self.capacity:
            self._consolidate_memories()
            
        # Persist important memories immediately
        if importance > 0.7:
            self._persist_memory(record)
            
    def retrieve_memories(self, category: str, limit: int = 10) -> List[MemoryRecord]:
        with sqlite3.connect(self.store.db_path) as conn:
            cursor = conn.execute("""
            SELECT timestamp, category, content, importance, context
            FROM memories
            WHERE agent_id = ? AND category = ?
            ORDER BY importance DESC, timestamp DESC
            LIMIT ?
            """, (self.agent_id, category, limit))
            
            return [
                MemoryRecord(
                    timestamp=datetime.fromisoformat(row[0]),
                    category=row[1],
                    content=json.loads(row[2]),
                    importance=row[3],
                    context=json.loads(row[4]) if row[4] else None
                )
                for row in cursor.fetchall()
            ]
            
    def _consolidate_memories(self):
        # Sort by importance
        self.short_term.sort(key=lambda x: x.importance, reverse=True)
        
        # Keep important memories and persist them
        keep_count = self.capacity // 2
        for memory in self.short_term[:keep_count]:
            self._persist_memory(memory)
            
        # Clear short-term memory
        self.short_term = self.short_term[:keep_count]
        
    def _persist_memory(self, record: MemoryRecord):
        with sqlite3.connect(self.store.db_path) as conn:
            conn.execute("""
            INSERT INTO memories (agent_id, timestamp, category, content, importance, context)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (
                self.agent_id,
                record.timestamp.isoformat(),
                record.category,
                json.dumps(record.content),
                record.importance,
                json.dumps(record.context) if record.context else None
            ))
            
    def learn_from_experience(self, category: str) -> Dict[str, Any]:
        memories = self.retrieve_memories(category, limit=100)
        
        if not memories:
            return {}
            
        # Analyze patterns and extract learnings
        learnings = {
            "patterns": self._extract_patterns(memories),
            "importance_threshold": self._calculate_importance_threshold(memories),
            "frequent_contexts": self._analyze_contexts(memories)
        }
        
        return learnings
        
    def _extract_patterns(self, memories: List[MemoryRecord]) -> Dict[str, Any]:
        patterns = {}
        for memory in memories:
            # Extract common patterns from memory content
            for key, value in memory.content.items():
                if key not in patterns:
                    patterns[key] = []
                patterns[key].append(value)
                
        # Analyze frequency of patterns
        return {
            key: max(set(values), key=values.count)
            for key, values in patterns.items()
        }
        
    def _calculate_importance_threshold(self, memories: List[MemoryRecord]) -> float:
        importances = [m.importance for m in memories]
        return np.percentile(importances, 75)
        
    def _analyze_contexts(self, memories: List[MemoryRecord]) -> Dict[str, int]:
        contexts = {}
        for memory in memories:
            if memory.context:
                context_key = json.dumps(memory.context, sort_keys=True)
                contexts[context_key] = contexts.get(context_key, 0) + 1
        return contexts
        
    def cleanup_old_memories(self, days_threshold: int = 30):
        threshold_date = datetime.now().replace(days=-days_threshold)
        
        with sqlite3.connect(self.store.db_path) as conn:
            conn.execute("""
            DELETE FROM memories 
            WHERE agent_id = ? 
            AND timestamp < ? 
            AND importance < 0.8
            """, (self.agent_id, threshold_date.isoformat()))

