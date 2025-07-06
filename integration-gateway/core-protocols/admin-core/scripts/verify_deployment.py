import os
import logging
from typing import Dict, List, Any
from datetime import datetime
from google.cloud import aiplatform
from google.cloud import compute_v1
from google.cloud import firestore
from google.cloud import pubsub_v1
from google.api_core import exceptions

class DeploymentVerification:
    def __init__(self, project_id: str = "api-for-warp-drive", region: str = "us-west1"):
        self.project_id = project_id
        self.region = region
        self.setup_logging()

    def setup_logging(self):
        """Configure logging with detailed formatting"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)

    def check_gcp_credentials(self) -> Dict[str, Any]:
        """Verify GCP credentials and project access"""
        try:
            # Initialize compute client to test credentials
            compute_client = compute_v1.InstancesClient()
            project = compute_client.get_project(project=self.project_id)
            
            return {
                "status": "success",
                "project_id": self.project_id,
                "project_number": project.number if project else None,
                "message": "Successfully authenticated with GCP"
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to authenticate: {str(e)}",
                "error": str(e)
            }

    def check_compute_instances(self) -> Dict[str, Any]:
        """Check existing Compute Engine instances"""
        try:
            instance_client = compute_v1.InstancesClient()
            request = compute_v1.ListInstancesRequest(
                project=self.project_id,
                zone=f"{self.region}-b"
            )
            instances = instance_client.list(request=request)
            
            instance_list = []
            for instance in instances:
                instance_list.append({
                    "name": instance.name,
                    "status": instance.status,
                    "machine_type": instance.machine_type.split('/')[-1],
                    "zone": instance.zone.split('/')[-1],
                    "creation_time": instance.creation_timestamp
                })
            
            return {
                "status": "success",
                "instances": instance_list,
                "count": len(instance_list)
            }
        except exceptions.PermissionDenied:
            return {
                "status": "error",
                "message": "Permission denied for Compute Engine access",
                "instances": []
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error checking compute instances: {str(e)}",
                "instances": []
            }

    def check_vertex_ai(self) -> Dict[str, Any]:
        """Verify Vertex AI endpoints and models"""
        try:
            ai_client = aiplatform.EndpointServiceClient()
            parent = f"projects/{self.project_id}/locations/{self.region}"
            endpoints = ai_client.list_endpoints(parent=parent)
            
            endpoint_list = []
            for endpoint in endpoints:
                endpoint_list.append({
                    "name": endpoint.display_name,
                    "resource_name": endpoint.name,
                    "deployed_models": len(endpoint.deployed_models)
                })
            
            return {
                "status": "success",
                "endpoints": endpoint_list,
                "count": len(endpoint_list)
            }
        except exceptions.PermissionDenied:
            return {
                "status": "error",
                "message": "Permission denied for Vertex AI access",
                "endpoints": []
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error checking Vertex AI: {str(e)}",
                "endpoints": []
            }

    def check_firestore(self) -> Dict[str, Any]:
        """Check Firestore database and collections"""
        try:
            db = firestore.Client(project=self.project_id)
            collections = db.collections()
            
            collection_list = []
            for collection in collections:
                collection_list.append({
                    "name": collection.id,
                    "path": collection.path
                })
            
            return {
                "status": "success",
                "collections": collection_list,
                "count": len(collection_list)
            }
        except exceptions.PermissionDenied:
            return {
                "status": "error",
                "message": "Permission denied for Firestore access",
                "collections": []
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error checking Firestore: {str(e)}",
                "collections": []
            }

    def check_pubsub(self) -> Dict[str, Any]:
        """Verify Pub/Sub topics and subscriptions"""
        try:
            publisher = pubsub_v1.PublisherClient()
            subscriber = pubsub_v1.SubscriberClient()
            project_path = f"projects/{self.project_id}"
            
            topics = publisher.list_topics(project=project_path)
            subscriptions = subscriber.list_subscriptions(project=project_path)
            
            topic_list = []
            subscription_list = []
            
            for topic in topics:
                topic_list.append({
                    "name": topic.name.split('/')[-1],
                    "path": topic.name
                })
            
            for subscription in subscriptions:
                subscription_list.append({
                    "name": subscription.name.split('/')[-1],
                    "topic": subscription.topic.split('/')[-1]
                })
            
            return {
                "status": "success",
                "topics": topic_list,
                "subscriptions": subscription_list,
                "topic_count": len(topic_list),
                "subscription_count": len(subscription_list)
            }
        except exceptions.PermissionDenied:
            return {
                "status": "error",
                "message": "Permission denied for Pub/Sub access",
                "topics": [],
                "subscriptions": []
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error checking Pub/Sub: {str(e)}",
                "topics": [],
                "subscriptions": []
            }

    def generate_status_report(self) -> Dict[str, Any]:
        """Generate comprehensive status report"""
        report = {
            "timestamp": datetime.utcnow().isoformat(),
            "project_info": self.check_gcp_credentials(),
            "compute_instances": self.check_compute_instances(),
            "vertex_ai": self.check_vertex_ai(),
            "firestore": self.check_firestore(),
            "pubsub": self.check_pubsub()
        }
        
        # Calculate overall status
        failures = [
            component["status"] == "error"
            for component in report.values()
            if isinstance(component, dict) and "status" in component
        ]
        
        report["overall_status"] = "error" if any(failures) else "success"
        
        return report

def main():
    verifier = DeploymentVerification()
    
    try:
        report = verifier.generate_status_report()
        
        # Print report
        print("\n=== GCP Deployment Verification Report ===")
        print(f"Timestamp: {report['timestamp']}")
        print(f"Overall Status: {report['overall_status']}")
        
        # Print component details
        for component, details in report.items():
            if isinstance(details, dict) and "status" in details:
                print(f"\n{component.replace('_', ' ').title()}:")
                print(f"Status: {details['status']}")
                if details.get("message"):
                    print(f"Message: {details['message']}")
                
        return report
        
    except Exception as e:
        logging.error(f"Failed to generate verification report: {str(e)}")
        raise

if __name__ == "__main__":
    main()

