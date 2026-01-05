#!/bin/bash
# setup-puppeteer.sh - Puppeteer setup script for Web Claude / macOS
#
# This script installs Bun, Puppeteer, and Chrome for html2png functionality.
# Called by: ./bin/cli-ext.sh init

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============================================
# Fix no_proxy for Web Claude environment
# ============================================
# The default no_proxy includes *.googleapis.com which prevents Chrome download.
export no_proxy="localhost,127.0.0.1,169.254.169.254,metadata.google.internal,*.svc.cluster.local,*.local"
export NO_PROXY="$no_proxy"

echo -e "${CYAN}=== Puppeteer Setup for gospelo-architect ===${NC}"
echo ""

# Step 1: Check/Install Bun
echo -e "${YELLOW}[1/4] Checking Bun...${NC}"
if command -v bun &> /dev/null; then
    echo -e "  ${GREEN}✓ Bun is installed: $(bun --version)${NC}"
else
    echo -e "  Installing Bun..."
    if command -v npm &> /dev/null; then
        npm install -g bun
    else
        curl -fsSL https://bun.sh/install | bash
        # Source profile to make bun available
        if [[ -f "$HOME/.bashrc" ]]; then
            source "$HOME/.bashrc"
        elif [[ -f "$HOME/.zshrc" ]]; then
            source "$HOME/.zshrc"
        fi
    fi
    echo -e "  ${GREEN}✓ Bun installed: $(bun --version)${NC}"
fi

# Step 2: Install Puppeteer
echo -e "${YELLOW}[2/4] Installing Puppeteer...${NC}"
cd "$PROJECT_DIR"
if grep -q '"puppeteer"' package.json 2>/dev/null; then
    echo -e "  ${GREEN}✓ Puppeteer already in package.json${NC}"
else
    bun add puppeteer
    echo -e "  ${GREEN}✓ Puppeteer installed${NC}"
fi

# Step 3: Download Chrome
echo -e "${YELLOW}[3/4] Downloading Chrome for Puppeteer...${NC}"
CHROME_PATH="$HOME/.cache/puppeteer/chrome"
if [[ -d "$CHROME_PATH" ]] && [[ -n "$(ls -A "$CHROME_PATH" 2>/dev/null)" ]]; then
    echo -e "  ${GREEN}✓ Chrome already downloaded${NC}"
else
    bunx puppeteer browsers install chrome
    echo -e "  ${GREEN}✓ Chrome downloaded${NC}"
fi

# Step 4: Test installation
echo -e "${YELLOW}[4/4] Testing installation...${NC}"
TEST_OUTPUT="/tmp/puppeteer-test-$$.png"

# Run test from project directory to use installed puppeteer
cd "$PROJECT_DIR"
TEST_RESULT=$(bun -e "
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
});
const page = await browser.newPage();
await page.setContent('<h1 style=\"color:green\">OK</h1>');
await page.screenshot({ path: '$TEST_OUTPUT' });
await browser.close();
console.log('OK');
" 2>&1)

if [[ "$TEST_RESULT" == *"OK"* ]] && [[ -f "$TEST_OUTPUT" ]]; then
    echo -e "  ${GREEN}✓ Test passed - screenshot generated${NC}"
    rm -f "$TEST_OUTPUT"
else
    echo -e "  ${RED}✗ Test failed${NC}"
    echo -e "  ${RED}$TEST_RESULT${NC}"
    rm -f "$TEST_OUTPUT"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo "You can now use:"
echo -e "  ${CYAN}./bin/cli-ext.sh html2png <input.html> [output.png]${NC}"
echo ""
