#!/bin/bash

# Auto-tag the next version of the WarpApp integrity patch
latest_tag=$(git describe --tags --abbrev=0)
echo "Latest tag: $latest_tag"

# Extract numeric portion and increment
next_tag=$(echo $latest_tag | awk -F. '{OFS="."; $NF+=1; print}')
echo "Tagging next version: $next_tag"

git tag -a "$next_tag" -m "Auto-tagged $next_tag"
git push origin "$next_tag"
