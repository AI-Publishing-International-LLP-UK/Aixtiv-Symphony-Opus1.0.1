#!/usr/bin/env python3

import re
from datetime import datetime

# Sample data structure for storing branch information
branches = []

# Parse the data from a text file
branch_data = """
users/as/aixtiv-symphony-opus1.0.1
C2100-PR
 
last week
254
7
feature/build-setup
C2100-PR
 
2 months ago
34
0
feature/agents-deploy
C2100-PR
 
2 months ago
33
0
#43
feature/region-config
C2100-PR
 
2 months ago
32
0
#42
feature/enhance-lucy-auto
C2100-PR
 
2 months ago
34
3
#41
feature/lucy-webhook-deploy
C2100-PR
 
2 months ago
34
2
#40
feature/deploy-setup
C2100-PR
 
2 months ago
34
2
#39
feature/enhance-deploy-workflow
C2100-PR
 
2 months ago
34
1
#38
feature/terraform-deployment
C2100-PR
 
2 months ago
34
2
#37
feature/lucy-webhook
C2100-PR
 
2 months ago
34
1
#36
feature/vision-lake-integration
C2100-PR
 
2 months ago
148
1
#26
feature/api-implementation
C2100-PR
 
2 months ago
148
1
#25
fix/service-routing
C2100-PR
 
2 months ago
149
1
protected
C2100-PR
 
2 months ago
154
0
develop
C2100-PR
 
2 months ago
186
0
update-iam-permissions
C2100-PR
 
3 months ago
194
1
#8
fix-auth-provider
C2100-PR
 
3 months ago
214
2
#6
fix/deployment-workflow
C2100-PR
 
3 months ago
214
0
#5
update-gha-auth
C2100-PR
 
3 months ago
218
1
fix/gcp-deployment-auth
C2100-PR
 
3 months ago
221
1
#3
Footer
"""

# Process the multi-line string to extract branch information
lines = branch_data.strip().split('\n')

i = 0
while i < len(lines):
    branch_info = {}
    
    # Extract branch name (may span multiple lines)
    branch_name = lines[i].strip()
    i += 1
    
    # Skip "C2100-PR" line
    if i < len(lines) and "C2100-PR" in lines[i]:
        i += 1
    
    # Skip empty line
    if i < len(lines) and lines[i].strip() == "":
        i += 1
        
    # Get last updated time
    if i < len(lines):
        branch_info["updated"] = lines[i].strip()
        i += 1
    
    # Get behind count
    if i < len(lines) and lines[i].strip().isdigit():
        branch_info["behind"] = int(lines[i].strip())
        i += 1
    
    # Get ahead count
    if i < len(lines) and lines[i].strip().isdigit():
        branch_info["ahead"] = int(lines[i].strip())
        i += 1
    
    # Check for PR reference
    if i < len(lines) and lines[i].strip().startswith("#"):
        branch_info["pr"] = lines[i].strip()
        i += 1
        
        # Get the next line which might be the feature name
        if i < len(lines) and (lines[i].strip().startswith("feature/") or lines[i].strip().startswith("fix/")):
            branch_name = lines[i].strip()
            i += 1
    
    # Add the branch name to the info dictionary
    branch_info["name"] = branch_name
    
    # Add to our list of branches
    if branch_name and "name" in branch_info:
        branches.append(branch_info)

# Print a summary table
print("\n=== AIXTIV-SYMPHONY Branch Summary ===\n")
print(f"{'Branch Name':<40} {'Updated':<15} {'Behind':<8} {'Ahead':<8} {'PR':<8}")
print("-" * 80)

for branch in branches:
    name = branch.get("name", "")
    updated = branch.get("updated", "")
    behind = branch.get("behind", "")
    ahead = branch.get("ahead", "")
    pr = branch.get("pr", "")
    
    print(f"{name:<40} {updated:<15} {behind:<8} {ahead:<8} {pr:<8}")

# Analytics
active_branches = len([b for b in branches if b.get("updated", "") in ["last week"]])
stale_branches = len([b for b in branches if "months ago" in b.get("updated", "")])
behind_branches = len([b for b in branches if b.get("behind", 0) > 50])
ahead_branches = len([b for b in branches if b.get("ahead", 0) > 1])

print("\n=== Repository Analytics ===\n")
print(f"Total branches: {len(branches)}")
print(f"Active branches (updated last week): {active_branches}")
print(f"Stale branches (older than a month): {stale_branches}")
print(f"Branches significantly behind main (>50 commits): {behind_branches}")
print(f"Branches with unpushed work (>1 commit ahead): {ahead_branches}")

# Common patterns among branch names
feature_branches = len([b for b in branches if "feature/" in b.get("name", "")])
fix_branches = len([b for b in branches if "fix/" in b.get("name", "")])

print(f"Feature branches: {feature_branches}")
print(f"Fix branches: {fix_branches}")

# Check for potential workflow issues based on the WARP App Agents guidelines
print("\n=== Potential Issues (Based on WARP App Agents Guidelines) ===\n")

# Check for branches with both ahead and behind commits (might need rebase)
needs_sync = [b for b in branches if b.get("behind", 0) > 0 and b.get("ahead", 0) > 0]
if needs_sync:
    print("Branches that may need rebasing or synchronization:")
    for branch in needs_sync:
        print(f"  - {branch.get('name', '')} (behind: {branch.get('behind', '')}, ahead: {branch.get('ahead', '')})")

# Check for consistent naming conventions
if feature_branches + fix_branches < len(branches) - 2:  # Allow for develop and protected branches
    print("\nInconsistent branch naming detected. Consider standardizing on feature/*, fix/*, etc.")

# Check for very old branches that may need cleanup
old_branches = [b for b in branches if "3 months ago" in b.get("updated", "")]
if old_branches:
    print("\nOld branches that might need cleanup or archiving:")
    for branch in old_branches:
        print(f"  - {branch.get('name', '')}")

# Check for branches with high commit disparity (might indicate integration issues)
high_disparity = [b for b in branches if b.get("behind", 0) > 100]
if high_disparity:
    print("\nBranches with high commit disparity (potential integration challenges):")
    for branch in high_disparity:
        print(f"  - {branch.get('name', '')} (behind by {branch.get('behind', '')} commits)")
