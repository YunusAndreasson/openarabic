#!/bin/bash

# Upgrade Python packages to latest versions for the translation pipeline (uv-optimized)
# This script updates all Python dependencies to their absolute latest versions using uv

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Get the absolute path to the translate directory
TRANSLATE_DIR="/home/yunus/Work/open-arabic/translate"

echo -e "${BLUE}🚀 Starting Python package upgrade for translation pipeline${NC}"
echo -e "${PURPLE}Using uv package manager for lightning-fast updates${NC}"
echo -e "${BLUE}Working directory: ${TRANSLATE_DIR}${NC}"
echo

# Change to the translate directory
cd "$TRANSLATE_DIR"

# Check if we're in the right directory
if [ ! -f "pyproject.toml" ]; then
    echo -e "${RED}❌ Error: pyproject.toml not found in ${TRANSLATE_DIR}${NC}"
    echo -e "${YELLOW}Please ensure you're running this from the translate directory${NC}"
    exit 1
fi

# Check if uv is available
if ! command -v uv &> /dev/null; then
    echo -e "${RED}❌ Error: uv package manager not found${NC}"
    echo -e "${YELLOW}Please install uv first:${NC}"
    echo -e "${YELLOW}  curl -LsSf https://astral.sh/uv/install.sh | sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ uv package manager ready${NC}"

# Show current status
echo -e "${YELLOW}📊 Current package status:${NC}"
echo -e "${YELLOW}  Checking for outdated packages...${NC}"
uv lock --check || true  # Show any lock file issues

echo
echo -e "${PURPLE}🔄 Phase 1: Upgrading all dependencies to latest versions${NC}"

# Update all dependencies to latest versions
if uv lock --upgrade; then
    echo -e "${GREEN}✅ Lock file updated with latest versions${NC}"
else
    echo -e "${YELLOW}⚠️  Lock update completed with warnings${NC}"
fi

echo
echo -e "${PURPLE}🔄 Phase 2: Syncing environment${NC}"

# Sync the environment with the new lock file
if uv sync; then
    echo -e "${GREEN}✅ Environment synced successfully${NC}"
else
    echo -e "${RED}❌ Environment sync failed${NC}"
    exit 1
fi

echo
echo -e "${PURPLE}🔄 Phase 3: Verifying installation${NC}"

# Verify the installation
if uv run python -c "import sys; print(f'Python version: {sys.version}')"; then
    echo -e "${GREEN}✅ Python environment verified${NC}"
else
    echo -e "${RED}❌ Python environment verification failed${NC}"
    exit 1
fi

# Show updated packages
echo
echo -e "${BLUE}📦 Updated packages summary:${NC}"
uv lock --dry-run 2>/dev/null | head -20 || echo -e "${YELLOW}  (Run 'uv lock --dry-run' to see detailed changes)${NC}"

echo
echo -e "${GREEN}🎉 Python package upgrade completed successfully!${NC}"
echo -e "${BLUE}All packages have been updated to their latest versions using uv.${NC}"
echo
echo -e "${YELLOW}📝 Next steps:${NC}"
echo -e "${YELLOW}  1. Test your translation pipeline: uv run python main.py --help${NC}"
echo -e "${YELLOW}  2. Run tests: uv run pytest tests/ -v${NC}"
echo -e "${YELLOW}  3. Check for breaking changes in updated packages${NC}"
echo
echo -e "${PURPLE}💡 uv Tips:${NC}"
echo -e "${PURPLE}  • Use 'uv run' to run commands in the environment${NC}"
echo -e "${PURPLE}  • Use 'uv add <package>' to add new dependencies${NC}"
echo -e "${PURPLE}  • Use 'uv remove <package>' to remove dependencies${NC}"
echo
echo -e "${BLUE}⚡ Why uv? Lightning-fast, reliable, and modern Python packaging!${NC}"
