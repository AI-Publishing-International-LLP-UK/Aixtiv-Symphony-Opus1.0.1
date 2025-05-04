import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import asyncio
import logging
from sklearn.ensemble import GradientBoostingRegressor
from collections import OrderedDict
import json

@dataclass
class CostPrediction:
    estimated_cost: float
    confidence_level: float
    predicted_duration: float
    resource_usage: Dict[str, float]

class SmartCache:
    def __init__(self, max_size: int = 1000):
        self.cache = OrderedDict()
        self.max_size = max_size
        self.hits = 0
        self.misses = 0
        self.cost_savings = 0.0
        self.usage_patterns = {}
        
    def get(self, key: str) -> Optional[dict]:
        if key in self.cache:
            self.hits += 1
            value = self.cache.pop(key)  # Remove and re-add to maintain LRU order
            self.cache[key] = value
            self.update_usage_pattern(key, "hit")
            return value
        self.misses += 1
        self.update_usage_pattern(key, "miss")
        return None
        
    def put(self, key: str, value: dict, cost: float):
        if len(self.cache) >= self.max_size:
            # Use sophisticated eviction strategy
            self.evict_least_valuable()
        
        self.cache[key] = value
        self.cost_savings += cost
        self.update_usage_pattern(key, "insert")
        
    def evict_least_valuable(self):
        """Evict cache entries based on value score"""
        if not self.cache:
            return
            
        # Calculate value scores for each entry
        value_scores = {}
        for key in self.cache:
            frequency = self.usage_patterns.get(key, {}).get('frequency', 0)
            recency = self.usage_patterns.get(key, {}).get('last_access', datetime.min)
            size = len(json.dumps(self.cache[key]))
            
            # Value score calculation
            time_factor = (datetime.now() - recency).total_seconds()
            value_score = (frequency * 0.4 + 1/(time_factor + 1) * 0.6) / size
            value_scores[key] = value_score
        
        # Remove least valuable entry
        least_valuable_key = min(value_scores, key=value_scores.get)
        self.cache.pop(least_valuable_key)
        
    def update_usage_pattern(self, key: str, action: str):
        if key not in self.usage_patterns:
            self.usage_patterns[key] = {
                'frequency': 0,
                'last_access': datetime.now(),
                'access_history': []
            }
        
        pattern = self.usage_patterns[key]
        pattern['frequency'] += 1
        pattern['last_access'] = datetime.now()
        pattern['access_history'].append({
            'timestamp': datetime.now(),
            'action': action
        })

class CostPredictor:
    def __init__(self):
        self.model = GradientBoostingRegressor()
        self.training_data = []
        self.training_labels = []
        self.feature_importance = {}
        
    def add_training_data(self, features: Dict[str, float], actual_cost: float):
        """Add new training data to improve predictions"""
        feature_vector = [
            features.get('input_size', 0),
            features.get('complexity', 0),
            features.get('priority', 0),
            features.get('time_of_day', 0),
            features.get('day_of_week', 0)
        ]
        self.training_data.append(feature_vector)
        self.training_labels.append(actual_cost)
        
        if len(self.training_data) >= 100:  # Retrain after collecting enough data
            self.train_model()
            
    def train_model(self):
        """Train the cost prediction model"""
        if len(self.training_data) < 2:
            return
            
        X = np.array(self.training_data)
        y = np.array(self.training_labels)
        
        self.model.fit(X, y)
        
        # Update feature importance
        feature_names = ['input_size', 'complexity', 'priority', 'time_of_day', 'day_of_week']
        self.feature_importance = dict(zip(feature_names, self.model.feature_importances_))
        
    def predict_cost(self, features: Dict[str, float]) -> CostPrediction:
        """Predict cost for a given task"""
        if not self.training_data:
            # Fallback to basic estimation if no training data
            return self._basic_estimation(features)
            
        feature_vector = [
            features.get('input_size', 0),
            features.get('complexity', 0),
            features.get('priority', 0),
            features.get('time_of_day', 0),
            features.get('day_of_week', 0)
        ]
        
        try:
            predicted_cost = self.model.predict([feature_vector])[0]
            confidence = self._calculate_confidence(feature_vector)
            
            return CostPrediction(
                estimated_cost=predicted_cost,
                confidence_level=confidence,
                predicted_duration=self._estimate_duration(features),
                resource_usage=self._estimate_resources(features)
            )
        except Exception as e:
            logging.error(f"Prediction error: {str(e)}")
            return self._basic_estimation(features)
            
    def _calculate_confidence(self, feature_vector: List[float]) -> float:
        """Calculate confidence level for the prediction"""
        if not self.training_data:
            return 0.5
            
        # Calculate distance to nearest training examples
        distances = []
        for train_vector in self.training_data:
            distance = np.sqrt(np.sum((np.array(feature_vector) - np.array(train_vector)) ** 2))
            distances.append(distance)
            
        min_distance = min(distances)
        confidence = 1 / (1 + min_distance)  # Convert distance to confidence score
        return min(confidence, 0.95)  # Cap confidence at 95%
        
    def _estimate_duration(self, features: Dict[str, float]) -> float:
        """Estimate task duration based on features"""
        base_duration = features.get('input_size', 0) * 0.1
        complexity_factor = features.get('complexity', 1)
        return base_duration * complexity_factor
        
    def _estimate_resources(self, features: Dict[str, float]) -> Dict[str, float]:
        """Estimate resource usage for the task"""
        input_size = features.get('input_size', 0)
        complexity = features.get('complexity', 1)
        
        return {
            'cpu': min(input_size * complexity * 0.1, 100),
            'memory': min(input_size * complexity * 0.2, 1000),
            'bandwidth': input_size * 0.05
        }
        
    def _basic_estimation(self, features: Dict[str, float]) -> CostPrediction:
        """Fallback basic cost estimation"""
        input_size = features.get('input_size', 0)
        complexity = features.get('complexity', 1)
        base_cost = input_size * complexity * 0.001
        
        return CostPrediction(
            estimated_cost=base_cost,
            confidence_level=0.5,
            predicted_duration=self._estimate_duration(features),
            resource_usage=self._estimate_resources(features)
        )

class BusinessOptimizer:
    def __init__(self, budget_limit: float = 1000.0):
        self.cache = SmartCache()
        self.cost_predictor = CostPredictor()
        self.budget_limit = budget_limit
        self.total_costs = 0.0
        self.total_savings = 0.0
        self.usage_history = []
        
    async def process_request(self, request_type: str, input_data: dict) -> Tuple[dict, float]:
        """Process a request with cost optimization"""
        cache_key = f"{request_type}:{json.dumps(input_data)}"
        
        # Check cache first
        cached_result = self.cache.get(cache_key)
        if cached_result:
            self.total_savings += cached_result.get('original_cost', 0)
            return cached_result, 0.0
            
        # Predict cost
        features = self._extract_features(request_type, input_data)
        prediction = self.cost_predictor.predict_cost(features)
        
        # Budget check
        if self.total_costs + prediction.estimated_cost > self.budget_limit:
            raise ValueError("Budget limit would be exceeded")
            
        # Process request (simulate API call)
        await asyncio.sleep(1)
        result = {
            'status': 'success',
            'data': f"Processed {request_type}",
            'original_cost': prediction.estimated_cost
        }
        
        # Update metrics
        actual_cost = prediction.estimated_cost  # In real system, this would be actual API cost
        self.total_costs += actual_cost
        self.usage_history.append({
            'timestamp': datetime.now(),
            'request_type': request_type,
            'predicted_cost': prediction.estimated_cost,
            'actual_cost': actual_cost,
            'features': features
        })
        
        # Train predictor with actual data
        self.cost_predictor.add_training_data(features, actual_cost)
        
        # Cache result
        self.cache.put(cache_key, result, actual_cost)
        
        return result, actual_cost
        
    def _extract_features(self, request_type: str, input_data: dict) -> Dict[str, float]:
        """Extract features for cost prediction"""
        now = datetime.now()
        return {
            'input_size': len(json.dumps(input_data)),
            'complexity': self._calculate_complexity(request_type, input_data),
            'priority': input_data.get('priority', 1.0),
            'time_of_day': now.hour / 24.0,
            'day_of_week': now.weekday() / 7.0
        }
        
    def _calculate_complexity(self, request_type: str, input_data: dict) -> float:
        """Calculate request complexity score"""
        type_complexity = {
            'text_generation': 2.0,
            'embedding': 1.5,
            'classification': 1.0
        }
        base_complexity = type_complexity.get(request_type, 1.0)
        
        # Adjust for input complexity
        content_length = len(json.dumps(input_data))
        if content_length > 1000:
            base_complexity *= 1.5
        
        return base_complexity
        
    def get_business_metrics(self) -> dict:
        """Get business performance metrics"""
        return {
            'total_costs': self.total_costs,
            'total_savings': self.total_savings,
            'roi': (self.total_savings / self.total_costs * 100) if self.total_costs > 0 else 0,
            'cache_efficiency': {
                'hits': self.cache.hits,
                'misses': self.cache.misses,
                'hit_ratio': self.cache.hits / (self.cache.hits + self.cache.misses) if (self.cache.hits + self.cache.misses) > 0 else 0
            },
            'budget_utilization': self.total_costs / self.budget_limit * 100,
            'prediction_accuracy': self._calculate_prediction_accuracy(),
            'feature_importance': self.cost_predictor.feature_importance
        }
        
    def _calculate_prediction_accuracy(self) -> float:
        """Calculate accuracy of cost predictions"""
        if not self.usage_history:
            return 0.0
            
        errors = []
        for usage in self.usage_history:
            predicted = usage['predicted_cost']
            actual = usage['actual_cost']
            if actual > 0:
                error = abs(predicted - actual) / actual
                errors.append(error)
                
        return (1 - sum(errors) / len(errors)) * 100 if errors else 0.0

# Example usage
async def main():
    optimizer = BusinessOptimizer(budget_limit=1000.0)
    
    # Process some requests
    request_types = ['text_generation', 'embedding', 'classification']
    priorities = [1.0, 2.0, 3.0]
    
    for request_type in request_types:
        for priority in priorities:
            input_data = {
                'content': 'Sample content for processing',
                'priority': priority
            }
            
            try:
                result, cost = await optimizer.process_request(request_type, input_data)
                print(f"\nProcessed {request_type} (priority {priority}):")
                print(f"Result: {json.dumps(result, indent=2)}")
                print(f"Cost: ${cost:.2f}")
            except Exception as e:
                print(f"Error processing request: {str(e)}")
    
    # Get business metrics
    metrics = optimizer.get_business_metrics()
    print("\nBusiness Metrics:")
    print(json.dumps(metrics, indent=2))

if __name__ == "__main__":
    asyncio.run(main())