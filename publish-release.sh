#!/bin/bash

# GitHub Release Publisher for WarpApp Integrity Patch
# Requires GitHub CLI (gh) and authentication via gh auth login

REPO="AI-Publishing-International-LLP-UK/AIXTIV-SYMPHONY"
TAG="v1.1"
TITLE="WarpApp Integrity Lockdown Patch"
BODY=$(cat <<EOM
✅ Hardened .gitignore and .gitattributes
✅ warp-guardian.yml to block risky PRs
✅ rollback-warpapp.sh included
✅ CI, license, and last commit badges added

This release locks down repository hygiene and deployment reliability.
EOM
)

# Ensure tag exists
if ! git rev-parse "$TAG" >/dev/null 2>&1; then
  git tag -a "$TAG" -m "$TITLE"
  git push origin "$TAG"
fi

# Publish release
gh release create "$TAG" --title "$TITLE" --notes "$BODY" --repo "$REPO"
