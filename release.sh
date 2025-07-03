#!/bin/bash

# Release script for DigiAgriFoodDB
# Handles semantic versioning (major.minor.patch) and git tagging

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}Error: You have uncommitted changes. Please commit or stash them first.${NC}"
    exit 1
fi

# Read current version from VERSION.txt or initialize
if [ -f src/assets/VERSION.txt ]; then
    CURRENT_VERSION=$(cat src/assets/VERSION.txt)
else
    # Initialize from package.json if VERSION.txt doesn't exist
    CURRENT_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "0.1.0")
    echo "$CURRENT_VERSION" > src/assets/VERSION.txt
fi

echo -e "${GREEN}Current version: $CURRENT_VERSION${NC}"

# Parse version components
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Ask user for version bump type
echo ""
echo "Select version bump type:"
echo "1) Major (${MAJOR}.${MINOR}.${PATCH} -> $((MAJOR + 1)).0.0)"
echo "2) Minor (${MAJOR}.${MINOR}.${PATCH} -> ${MAJOR}.$((MINOR + 1)).0)"
echo "3) Patch (${MAJOR}.${MINOR}.${PATCH} -> ${MAJOR}.${MINOR}.$((PATCH + 1)))"
echo "4) Cancel"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        NEW_VERSION="$((MAJOR + 1)).0.0"
        BUMP_TYPE="major"
        ;;
    2)
        NEW_VERSION="${MAJOR}.$((MINOR + 1)).0"
        BUMP_TYPE="minor"
        ;;
    3)
        NEW_VERSION="${MAJOR}.${MINOR}.$((PATCH + 1))"
        BUMP_TYPE="patch"
        ;;
    4)
        echo "Release cancelled."
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice. Release cancelled.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${YELLOW}New version will be: $NEW_VERSION${NC}"
read -p "Continue with release? (y/n): " confirm

if [ "$confirm" != "y" ]; then
    echo "Release cancelled."
    exit 0
fi

echo ""
echo "📝 Writing new version to files..."

# Update VERSION.txt
echo "$NEW_VERSION" > src/assets/VERSION.txt

# Update package.json
if [ -f package.json ]; then
    # Use Node.js to update package.json to preserve formatting
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        pkg.version = '$NEW_VERSION';
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
    "
    echo "✅ Updated package.json"
fi

# Commit version changes
echo ""
echo "📦 Committing version changes..."
git add src/assets/VERSION.txt package.json
git commit -m "chore: bump version to $NEW_VERSION

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Create git tag
echo ""
echo "🏷️  Creating git tag..."
TAG_NAME="v$NEW_VERSION"
git tag -a "$TAG_NAME" -m "Release version $NEW_VERSION"

echo ""
echo -e "${GREEN}✨ Release $NEW_VERSION created successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Push changes: git push origin $(git rev-parse --abbrev-ref HEAD)"
echo "  2. Push tag: git push origin $TAG_NAME"
echo "  3. Create a GitHub release from tag $TAG_NAME"
echo ""
echo "To undo this release (if not pushed):"
echo "  git reset --hard HEAD~1"
echo "  git tag -d $TAG_NAME"
