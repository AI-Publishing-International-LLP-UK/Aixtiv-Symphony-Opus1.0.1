#!/bin/bash

# Check current directory
if [[ $(pwd) != *"aixtiv-symphony-opus1.0.1"* ]]; then
  echo "Error: Please run this script from the aixtiv-symphony-opus1.0.1 directory"
  exit 1
fi

echo "Starting secure deployment to ASOOS environment..."

# Deploy only to asoos.2100.cool target and necessary functions
firebase deploy --only hosting:asoos.2100.cool,functions

if [ $? -eq 0 ]; then
  echo "Deployment successful! ASOOS environment updated."
  echo "Administrative functions accessible via authenticated routes."
else
  echo "Deployment failed. Please check logs for details."
  exit 1
fi

