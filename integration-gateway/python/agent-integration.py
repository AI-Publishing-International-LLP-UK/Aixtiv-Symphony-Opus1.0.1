#!/usr/bin/env python3
"""
Integration Point Validation Agent

This script uses your agent framework to verify all integration points
before and during the build process.
"""

import sys
import json
import logging
import time
import requests
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("integration_validation.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("IntegrationValidator")

class IntegrationPoint:
    """Represents an integration point to validate"""
    
    def __init__(self, name, endpoint, method="GET", expected_status=200, 
                 headers=None, payload=None, validation_function=None):
        self.name = name
        self.endpoint = endpoint
        self.method = method
        self.expected_status = expected_status
        self.headers = headers or {}
        self.payload = payload
        self.validation_function = validation_function
        
    def validate(self):
        """Tests the integration point and returns success/failure"""
        logger.info(f"Validating integration point: {self.name}")
        
        try:
            if self.method == "GET":
                response = requests.get(
                    self.endpoint, 
                    headers=self.headers,
                    timeout=10
                )
            elif self.method == "POST":
                response = requests.post(
                    self.endpoint,
                    headers=self.headers,
                    json=self.payload,
                    timeout=10
                )
            else:
                logger.error(f"Unsupported method: {self.method}")
                return False
                
            # Check status code
            if response.status_code != self.expected_status:
                logger.error(f"Integration point {self.name} returned status {response.status_code}, expected {self.expected_status}")
                return False
                
            # If there's a custom validation function, use it
            if self.validation_function:
                if not self.validation_function(response):
                    logger.error(f"Integration point {self.name} failed custom validation")
                    return False
                    
            logger.info(f"Integration point {self.name} validated successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error validating {self.name}: {str(e)}")
            return False


class ValidationAgent:
    """Agent that validates all integration points"""
    
    def __init__(self, config_file="integration_points.json"):
        self.config_file = config_file
        self.integration_points = []
        self.load_config()
        
    def load_config(self):
        """Loads integration points from configuration"""
        try:
            with open(self.config_file, 'r') as f:
                config = json.load(f)
                
            for point in config.get("integration_points", []):
                # Create validation function if specified
                validation_func = None
                if "validation_criteria" in point:
                    criteria = point["validation_criteria"]
                    if criteria.get("type") == "json_path":
                        # Example: Check if a specific JSON path exists and has expected value
                        json_path = criteria.get("path")
                        expected_value = criteria.get("expected_value")
                        
                        def validate_json(response):
                            try:
                                data = response.json()
                                # Very simple implementation - for complex paths use jsonpath library
                                path_parts = json_path.strip('$').strip('.').split('.')
                                current = data
                                for part in path_parts:
                                    current = current[part]
                                return current == expected_value
                            except Exception as e:
                                logger.error(f"JSON validation error: {str(e)}")
                                return False
                                
                        validation_func = validate_json
                
                self.integration_points.append(
                    IntegrationPoint(
                        name=point["name"],
                        endpoint=point["endpoint"],
                        method=point.get("method", "GET"),
                        expected_status=point.get("expected_status", 200),
                        headers=point.get("headers"),
                        payload=point.get("payload"),
                        validation_function=validation_func
                    )
                )
                
            logger.info(f"Loaded {len(self.integration_points)} integration points from configuration")
            
        except Exception as e:
            logger.error(f"Error loading configuration: {str(e)}")
            
    def validate_all(self):
        """Validates all integration points"""
        results = []
        success = True
        
        for point in self.integration_points:
            point_success = point.validate()
            results.append({
                "name": point.name,
                "success": point_success,
                "timestamp": datetime.now().isoformat()
            })
            
            if not point_success:
                success = False
                
        # Write results to file
        with open("integration_results.json", "w") as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "overall_success": success,
                "results": results
            }, f, indent=2)
            
        return success
    
    def continuous_monitoring(self, interval=300):
        """Continuously monitors integration points at specified interval (seconds)"""
        logger.info(f"Starting continuous monitoring with {interval}s interval")
        
        try:
            while True:
                self.validate_all()
                time.sleep(interval)
        except KeyboardInterrupt:
            logger.info("Monitoring stopped by user")
            

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Integration Point Validation Agent")
    parser.add_argument("--config", default="integration_points.json", help="Path to configuration file")
    parser.add_argument("--monitor", action="store_true", help="Run in continuous monitoring mode")
    parser.add_argument("--interval", type=int, default=300, help="Monitoring interval in seconds")
    
    args = parser.parse_args()
    
    agent = ValidationAgent(config_file=args.config)
    
    if args.monitor:
        agent.continuous_monitoring(interval=args.interval)
    else:
        success = agent.validate_all()
        sys.exit(0 if success else 1)
