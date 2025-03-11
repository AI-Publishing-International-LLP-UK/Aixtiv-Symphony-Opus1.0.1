import json
import os

# Generate a more robust Postman collection with environment variables and auth headers
postman_collection = {
    "info": {
        "name": "ASOOS API Validation Suite",
        "description": "API validation suite for ASOOS system with authorization and environment variables",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "item": [
        {
            "name": "Health Check",
            "request": {
                "method": "GET",
                "header": [
                    {
                        "key": "Authorization",
                        "value": "{{authToken}}",
                        "type": "text",
                        "description": "API authentication token"
                    }
                ],
                "url": {
                    "raw": "{{apiBaseUrl}}/api/health",
                    "host": ["{{apiBaseUrl}}"],
                    "path": ["api", "health"]
                }
            },
            "event": [
                {
                    "listen": "test",
                    "script": {
                        "exec": [
                            "pm.test(\"Status code is 200\", function () {",
                            "    pm.response.to.have.status(200);",
                            "});",
                            "",
                            "pm.test(\"Health endpoint returns success\", function () {",
                            "    var jsonData = pm.response.json();",
                            "    pm.expect(jsonData.status).to.eql(\"ok\");",
                            "});"
                        ],
                        "type": "text/javascript"
                    }
                }
            ]
        },
        {
            "name": "Status Check",
            "request": {
                "method": "GET",
                "header": [
                    {
                        "key": "Authorization",
                        "value": "{{authToken}}",
                        "type": "text",
                        "description": "API authentication token"
                    }
                ],
                "url": {
                    "raw": "{{apiBaseUrl}}/api/status",
                    "host": ["{{apiBaseUrl}}"],
                    "path": ["api", "status"]
                }
            },
            "event": [
                {
                    "listen": "test",
                    "script": {
                        "exec": [
                            "pm.test(\"Status code is 200\", function () {",
                            "    pm.response.to.have.status(200);",
                            "});",
                            "",
                            "pm.test(\"Status endpoint returns correct data\", function () {",
                            "    var jsonData = pm.response.json();",
                            "    pm.expect(jsonData).to.be.an('object');",
                            "});"
                        ],
                        "type": "text/javascript"
                    }
                }
            ]
        },
        {
            "name": "API Documentation",
            "request": {
                "method": "GET",
                "header": [
                    {
                        "key": "Authorization",
                        "value": "{{authToken}}",
                        "type": "text",
                        "description": "API authentication token"
                    }
                ],
                "url": {
                    "raw": "{{apiBaseUrl}}/docs",
                    "host": ["{{apiBaseUrl}}"],
                    "path": ["docs"]
                }
            },
            "event": [
                {
                    "listen": "test",
                    "script": {
                        "exec": [
                            "pm.test(\"Status code is 200\", function () {",
                            "    pm.response.to.have.status(200);",
                            "});",
                            "",
                            "pm.test(\"Documentation page loads\", function () {",
                            "    pm.expect(pm.response.text()).to.include(\"html\");",
                            "});"
                        ],
                        "type": "text/javascript"
                    }
                }
            ]
        }
    ]
}

# Create a Postman environment file with variables
postman_environment = {
    "name": "ASOOS API Environment",
    "values": [
        {
            "key": "apiBaseUrl",
            "value": "https://academy-website-859242575175.us-west1.run.app",
            "type": "default",
            "enabled": True
        },
        {
            "key": "authToken",
            "value": "Bearer YOUR_TOKEN_HERE",
            "type": "secret",
            "enabled": True
        }
    ]
}

# Save the Postman collection as a JSON file in the current directory
postman_file_path = "ASOOS_API_Postman_Collection.json"
with open(postman_file_path, "w") as f:
    json.dump(postman_collection, f, indent=4)

# Save the Postman environment as a JSON file
environment_file_path = "ASOOS_API_Environment.json"
with open(environment_file_path, "w") as f:
    json.dump(postman_environment, f, indent=4)

# Create a Newman run script for CI/CD integration
newman_script = """#!/bin/bash
# Newman script for running ASOOS API tests in CI/CD environment

# Install newman if not present
if ! command -v newman &> /dev/null; then
    echo "Newman not found, installing..."
    npm install -g newman
fi

# Run the collection
echo "Running API tests with Newman..."
newman run ASOOS_API_Postman_Collection.json \\
    --environment ASOOS_API_Environment.json \\
    --reporters cli,json \\
    --reporter-json-export results/newman-results.json

# Check exit status
if [ $? -eq 0 ]; then
    echo "API tests passed successfully!"
    exit 0
else
    echo "API tests failed. See results for details."
    exit 1
fi
"""

# Save the Newman run script
newman_script_path = "run_api_tests.sh"
with open(newman_script_path, "w") as f:
    f.write(newman_script)

# Make the script executable
os.chmod(newman_script_path, 0o755)

print(f"Postman collection created successfully at: {postman_file_path}")
print(f"Postman environment created successfully at: {environment_file_path}")
print(f"Newman run script created at: {newman_script_path}")
print("Added test scripts, auth headers, and environment variables for all endpoints")
print("Collection and scripts are ready for CI/CD integration with Newman")
