#!/bin/bash

set -euo pipefail

BUMP_TYPE=${1:-patch}

case "$BUMP_TYPE" in
  patch|minor|major)
    ;;
  *)
    echo "Usage: $0 [patch|minor|major]"
    exit 2
    ;;
esac

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Release aborted: commit or stash the current working tree first."
  exit 1
fi

if ! npm whoami >/dev/null 2>&1; then
  echo "Release aborted: npm authentication is required. Run 'npm login' first."
  exit 1
fi

CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Releasing from v$CURRENT_VERSION with a $BUMP_TYPE version bump..."

# Fail before creating a release commit or tag if the repository is not healthy.
npm run check

# npm version runs the version lifecycle, creates a release commit, and tags it.
npm version "$BUMP_TYPE"

# prepublishOnly runs the complete local quality gate before publication.
npm publish --access public

NEW_VERSION=$(node -p "require('./package.json').version")
echo "Published v$NEW_VERSION."
echo "Push the release commit and tag with: git push --follow-tags"
