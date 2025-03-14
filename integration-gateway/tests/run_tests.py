#!/usr/bin/env python3

import subprocess
import sys
import os
import json
from datetime import datetime

def run_command(command, env=None):
    """Run a shell command and return the result"""
    try:
        result = subprocess.run(
            command,
            shell=True,
            check=True,
            text=True,
            capture_output=True,
            env=env
        )
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, e.stderr

def run_postman_tests():
    """Run Postman API tests using Newman"""
    print("\n🚀 Running API Tests...")
    success, output = run_command("npm run test:api")
    if not success:
        print("❌ API Tests failed:")
        print(output)
        return False
    print("✅ API Tests passed")
    return True

def run_agent_tests():
    """Run Agent workflow tests using Jest"""
    print("\n🤖 Running Agent Tests...")
    success, output = run_command("npm run test:agents")
    if not success:
        print("❌ Agent Tests failed:")
        print(output)
        return False
    print("✅ Agent Tests passed")
    return True

def generate_report(api_success, agent_success):
    """Generate test report"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    report = {
        "timestamp": timestamp,
        "results": {
            "api_tests": "PASS" if api_success else "FAIL",
            "agent_tests": "PASS" if agent_success else "FAIL",
            "overall": "PASS" if (api_success and agent_success) else "FAIL"
        }
    }
    
    report_dir = "test-reports"
    os.makedirs(report_dir, exist_ok=True)
    
    report_file = f"{report_dir}/test-report-{timestamp.replace(' ', '_')}.json"
    with open(report_file, "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📊 Test report generated: {report_file}")
    return report["results"]["overall"] == "PASS"

def main():
    print("🧪 Starting Integration Tests...")
    
    api_success = run_postman_tests()
    agent_success = run_agent_tests()
    
    success = generate_report(api_success, agent_success)
    
    if not success:
        sys.exit(1)
    
    print("\n✨ All tests passed successfully!")

if __name__ == "__main__":
    main()

