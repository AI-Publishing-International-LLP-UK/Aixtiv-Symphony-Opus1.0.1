#!/bin/bash

# 🚀 Claude 4.0 Status Checker

PROJECT_ID="api-for-warp-drive"
gcloud config set project "$PROJECT_ID" --quiet

echo "🚀 Dr. Claude 4.0 Infrastructure Status:"
echo ""

echo "MOCORIX2 (us-central1) - Master Orchestration Hub:"
for i in 01 02 03 04 05; do
    service="dr-claude-$i"
    url=$(gcloud run services describe "$service" --region="us-central1" --format="value(status.url)" 2>/dev/null || echo "NOT_DEPLOYED")
    echo "  $service: $url"
done

echo ""
echo "MOCORIX (us-west1) - AI R&D Environment:"
echo "  dr-claude-06a (Timeliners/CRX): $(gcloud run services describe dr-claude-06a --region=us-west1 --format="value(status.url)" 2>/dev/null || echo 'NOT_DEPLOYED')"
echo "  dr-claude-06b (Timerpressers/RIX/QRIX): $(gcloud run services describe dr-claude-06b --region=us-west1 --format="value(status.url)" 2>/dev/null || echo 'NOT_DEPLOYED')"

echo ""
echo "MOCOA (Client-Facing):"
for i in 07 08; do
    service="dr-claude-$i"
    url=$(gcloud run services describe "$service" --region="us-west1" --format="value(status.url)" 2>/dev/null || echo "NOT_DEPLOYED")
    echo "  $service (us-west1): $url"
done

service="dr-claude-09"
url=$(gcloud run services describe "$service" --region="europe-west1" --format="value(status.url)" 2>/dev/null || echo "NOT_DEPLOYED")
echo "  $service (europe-west1): $url"

echo ""
echo "Summary:"
echo "• Claude 4.0 Sonnet from Anthropic (not Vertex AI)"
echo "• 505K agent orchestration capability"  
echo "• dr-claude-06a: Timeliners and CRX"
echo "• dr-claude-06b: Timerpressers and RIX/QRIX"
