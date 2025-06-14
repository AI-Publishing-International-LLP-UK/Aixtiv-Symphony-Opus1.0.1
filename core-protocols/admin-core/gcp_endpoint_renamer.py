#!/usr/bin/env python3
"""
GCP Endpoint Renamer

This script renames specific endpoints in Google Cloud Platform (GCP) using the AI Platform API.
It specifically handles renaming 'dr-memoria-01-endpoint' to 'Super Claude 1' and
'warp-drive-endpoint' to 'Super Claude 2'.

Prerequisites:
    - Google Cloud SDK installed
    - Authenticated GCP credentials
    - google-cloud-aiplatform Python library installed
    - Appropriate permissions to modify endpoints in the project
"""

from google.cloud import aiplatform_v1
from google.cloud.aiplatform_v1 import services
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def rename_endpoints(project_id):
    """
    Rename two specific endpoints in the given GCP project.
    
    Args:
        project_id (str): The GCP project ID

    Raises:
        Exception: If there's an error during the renaming process
    """
    # Initialize the Endpoints client
    client = aiplatform_v1.EndpointServiceClient()
    
    # Endpoint configurations to rename
    endpoints_to_rename = [
        {
            'current_name': 'dr-memoria-01-endpoint',
            'new_name': 'Super Claude 1'
        },
        {
            'current_name': 'warp-drive-endpoint',
            'new_name': 'Super Claude 2'
        }
    ]
    
    # Iterate through endpoints to rename
    for endpoint_config in endpoints_to_rename:
        try:
            # List endpoints to find the exact resource name
            request = aiplatform_v1.ListEndpointsRequest(
                parent=f'projects/{project_id}/locations/us-west1'
            )
            page_result = client.list_endpoints(request=request)
            
            # Find the specific endpoint
            endpoint_found = False
            for endpoint in page_result:
                if endpoint_config['current_name'] in endpoint.name:
                    endpoint_found = True
                    # Prepare the update request
                    update_request = aiplatform_v1.UpdateEndpointRequest(
                        endpoint=aiplatform_v1.Endpoint(
                            name=endpoint.name,
                            display_name=endpoint_config['new_name']
                        ),
                        update_mask={'paths': ['display_name']}
                    )
                    
                    # Execute the update
                    updated_endpoint = client.update_endpoint(request=update_request)
                    logging.info(
                        f"Successfully renamed {endpoint_config['current_name']} "
                        f"to {endpoint_config['new_name']}"
                    )
                    break
            
            if not endpoint_found:
                logging.warning(
                    f"Endpoint {endpoint_config['current_name']} not found"
                )
                
        except Exception as e:
            logging.error(
                f"Error renaming {endpoint_config['current_name']}: {str(e)}"
            )
            raise

if __name__ == '__main__':
    try:
        project_id = 'api-for-warp-drive'
        rename_endpoints(project_id)
    except Exception as e:
        logging.error(f"Script execution failed: {str(e)}")
        exit(1)

