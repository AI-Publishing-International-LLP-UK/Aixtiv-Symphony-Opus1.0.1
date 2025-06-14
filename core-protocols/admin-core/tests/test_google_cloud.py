from google.cloud.orgpolicy import OrgPolicyClient
from google.cloud.kms import KeyManagementServiceClient

def test_clients():
    try:
        org_client = OrgPolicyClient()
        print("OrgPolicyClient initialization successful")
    except Exception as e:
        print(f"OrgPolicyClient error: {str(e)}")
    
    try:
        kms_client = KeyManagementServiceClient()
        print("KeyManagementServiceClient initialization successful")
    except Exception as e:
        print(f"KeyManagementServiceClient error: {str(e)}")

if __name__ == "__main__":
    test_clients()

