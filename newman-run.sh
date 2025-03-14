#!/bin/bash
echo "Running ASOOS API tests using Newman..."
newman run ASOOS_API_MasterCollection.json -e ASOOS_API_Environment.json --reporters cli,json --reporter-json-export newman-report.json
