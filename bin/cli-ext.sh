#!/bin/bash
# cli-ext.sh - Extended CLI tools for gospelo-architect
#
# Usage:
#   ./bin/cli-ext.sh <command> [options]
#
# Requirements:
#   - Bun runtime
#   - Puppeteer (for html2png, auto-installed if missing)
#
# Environment:
#   - Works on macOS and Ubuntu (Web Claude)
#   - Uses headless Chromium for rendering
#
# Note for Web Claude:
#   The default no_proxy setting includes *.googleapis.com which blocks Chrome download.
#   This script sets a proper no_proxy value that excludes googleapis.com.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fix no_proxy for Web Claude environment
# The default no_proxy includes *.googleapis.com which prevents Puppeteer from downloading Chrome.
# We set a proper no_proxy that allows googleapis.com to go through proxy.
fix_no_proxy() {
    local safe_no_proxy="localhost,127.0.0.1,169.254.169.254,metadata.google.internal,*.svc.cluster.local,*.local"
    export no_proxy="$safe_no_proxy"
    export NO_PROXY="$safe_no_proxy"
}

# Check if Bun is available
check_bun() {
    if ! command -v bun &> /dev/null; then
        echo -e "${RED}Error: Bun is not installed${NC}"
        echo "Install from: https://bun.sh"
        exit 1
    fi
}

# Paper sizes in pixels at 96 DPI (same as cli.ts)
# Returns "width height" for given paper name
get_paper_size() {
    local paper="$1"
    case "$paper" in
        # A series (96 DPI)
        a1-landscape) echo "3179 2245" ;;
        a1-portrait)  echo "2245 3179" ;;
        a2-landscape) echo "2245 1587" ;;
        a2-portrait)  echo "1587 2245" ;;
        a3-landscape) echo "1587 1123" ;;
        a3-portrait)  echo "1123 1587" ;;
        a4-landscape) echo "1123 794" ;;
        a4-portrait)  echo "794 1123" ;;
        # B series - JIS (96 DPI)
        b1-landscape) echo "3893 2752" ;;
        b1-portrait)  echo "2752 3893" ;;
        b2-landscape) echo "2752 1947" ;;
        b2-portrait)  echo "1947 2752" ;;
        b3-landscape) echo "1947 1376" ;;
        b3-portrait)  echo "1376 1947" ;;
        b4-landscape) echo "1376 971" ;;
        b4-portrait)  echo "971 1376" ;;
        # Screen sizes
        hd-landscape)  echo "1280 720" ;;
        hd-portrait)   echo "720 1280" ;;
        fhd-landscape) echo "1920 1080" ;;
        fhd-portrait)  echo "1080 1920" ;;
        4k-landscape)  echo "3840 2160" ;;
        4k-portrait)   echo "2160 3840" ;;
        8k-landscape)  echo "7680 4320" ;;
        8k-portrait)   echo "4320 7680" ;;
        *)
            echo ""
            ;;
    esac
}

# Ensure puppeteer is installed
ensure_puppeteer() {
    cd "$PROJECT_DIR"

    # Check if puppeteer is in package.json dependencies
    if ! grep -q '"puppeteer"' package.json 2>/dev/null; then
        echo -e "${YELLOW}Installing puppeteer...${NC}"
        fix_no_proxy
        bun add puppeteer
    fi

    # Check if Chrome is downloaded
    local chrome_path="$HOME/.cache/puppeteer/chrome"
    if [[ ! -d "$chrome_path" ]] || [[ -z "$(ls -A "$chrome_path" 2>/dev/null)" ]]; then
        echo -e "${YELLOW}Downloading Chrome for Puppeteer...${NC}"
        fix_no_proxy
        bunx puppeteer browsers install chrome
    fi
}

# Show help
show_help() {
    cat << 'EOF'
cli-ext.sh - Extended CLI tools for gospelo-architect

Usage:
  ./bin/cli-ext.sh <command> [options]

Commands:
  init
    First-time setup: install Bun, Puppeteer, and Chrome
    Run this before using html2png/html2jpg/html2pdf on a new environment

  html2png <input.html> [output.png]
    Convert HTML file to PNG image (lossless)

  html2jpg <input.html> [output.jpg]
    Convert HTML file to JPEG image (smaller file size)

  html2pdf <input.html> [output.pdf]
    Convert HTML file to PDF document

Options (common):
  --paper <size>      Paper/screen size (overrides --width/--height)
                      Paper: a1-a4, b1-b4 with -landscape or -portrait
                      Screen: hd, fhd, 4k, 8k with -landscape or -portrait
  --width <pixels>    Viewport width (default: 1920)
  --height <pixels>   Viewport height (default: 1080)

Options (for html2png/html2jpg):
  --scale <factor>    Device scale factor (default: 2 for retina)
  --full-page         Capture full scrollable page

Options (for html2jpg only):
  --quality <0-100>   JPEG quality (default: 90)

Options (for html2pdf):
  --format <size>     PDF format: a4, letter, legal, a3, etc. (default: a4)
                      Note: Use --paper for precise pixel control

Common Options:
  --help              Show this help

Paper Sizes (96 DPI):
  a1-landscape (3179x2245)   a1-portrait (2245x3179)
  a2-landscape (2245x1587)   a2-portrait (1587x2245)
  a3-landscape (1587x1123)   a3-portrait (1123x1587)
  a4-landscape (1123x794)    a4-portrait (794x1123)
  b1-landscape (3893x2752)   b1-portrait (2752x3893)
  b2-landscape (2752x1947)   b2-portrait (1947x2752)
  b3-landscape (1947x1376)   b3-portrait (1376x1947)
  b4-landscape (1376x971)    b4-portrait (971x1376)
  hd-landscape (1280x720)    hd-portrait (720x1280)
  fhd-landscape (1920x1080)  fhd-portrait (1080x1920)
  4k-landscape (3840x2160)   4k-portrait (2160x3840)
  8k-landscape (7680x4320)   8k-portrait (4320x7680)

Examples:
  ./bin/cli-ext.sh init
  ./bin/cli-ext.sh html2png diagram.html --paper fhd-landscape
  ./bin/cli-ext.sh html2png diagram.html --paper a3-landscape --scale 2
  ./bin/cli-ext.sh html2jpg diagram.html --paper fhd-landscape --quality 85
  ./bin/cli-ext.sh html2pdf diagram.html --paper a4-landscape
  ./bin/cli-ext.sh html2pdf diagram.html output.pdf --format a3

Environment Variables:
  PUPPETEER_EXECUTABLE_PATH   Custom Chrome/Chromium path
  PUPPETEER_SKIP_DOWNLOAD     Skip Chromium download (use system Chrome)
EOF
}

# Run initial setup
run_init() {
    if [[ ! -x "$SCRIPT_DIR/setup-puppeteer.sh" ]]; then
        chmod +x "$SCRIPT_DIR/setup-puppeteer.sh"
    fi
    exec "$SCRIPT_DIR/setup-puppeteer.sh"
}

# HTML to PNG conversion
html2png() {
    local input_html="$1"
    shift

    if [[ -z "$input_html" ]]; then
        echo -e "${RED}Error: Input HTML file required${NC}"
        echo "Usage: ./bin/cli-ext.sh html2png <input.html> [output.png]"
        exit 1
    fi

    if [[ ! -f "$input_html" ]]; then
        echo -e "${RED}Error: File not found: $input_html${NC}"
        exit 1
    fi

    # Parse remaining arguments
    local output_png=""
    local width=1920
    local height=1080
    local scale=2
    local full_page=false
    local paper=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            --paper)
                paper="$2"
                shift 2
                ;;
            --width)
                width="$2"
                shift 2
                ;;
            --height)
                height="$2"
                shift 2
                ;;
            --scale)
                scale="$2"
                shift 2
                ;;
            --full-page)
                full_page=true
                shift
                ;;
            -*)
                echo -e "${RED}Unknown option: $1${NC}"
                exit 1
                ;;
            *)
                if [[ -z "$output_png" ]]; then
                    output_png="$1"
                fi
                shift
                ;;
        esac
    done

    # Apply paper size if specified
    if [[ -n "$paper" ]]; then
        local paper_dims
        paper_dims=$(get_paper_size "$paper")
        if [[ -z "$paper_dims" ]]; then
            echo -e "${RED}Error: Unknown paper size: $paper${NC}"
            echo "Use --help to see available paper sizes"
            exit 1
        fi
        width=$(echo "$paper_dims" | cut -d' ' -f1)
        height=$(echo "$paper_dims" | cut -d' ' -f2)
    fi

    # Default output filename
    if [[ -z "$output_png" ]]; then
        output_png="${input_html%.html}.png"
    fi

    # Convert to absolute path
    input_html="$(cd "$(dirname "$input_html")" && pwd)/$(basename "$input_html")"

    # Ensure output directory exists
    mkdir -p "$(dirname "$output_png")"

    echo -e "${GREEN}Converting: $input_html${NC}"
    echo -e "  Output: $output_png"
    echo -e "  Viewport: ${width}x${height} @ ${scale}x"

    # Run Puppeteer script via Bun (with fixed no_proxy for Web Claude)
    fix_no_proxy
    bun run "$SCRIPT_DIR/html-render.ts" \
        png \
        "$input_html" \
        "$output_png" \
        "$width" \
        "$height" \
        "$scale" \
        "$full_page"

    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}Done: $output_png${NC}"
    else
        echo -e "${RED}Failed to convert${NC}"
        exit 1
    fi
}

# HTML to JPEG conversion
html2jpg() {
    local input_html="$1"
    shift

    if [[ -z "$input_html" ]]; then
        echo -e "${RED}Error: Input HTML file required${NC}"
        echo "Usage: ./bin/cli-ext.sh html2jpg <input.html> [output.jpg]"
        exit 1
    fi

    if [[ ! -f "$input_html" ]]; then
        echo -e "${RED}Error: File not found: $input_html${NC}"
        exit 1
    fi

    # Parse remaining arguments
    local output_jpg=""
    local width=1920
    local height=1080
    local scale=2
    local full_page=false
    local paper=""
    local quality=90

    while [[ $# -gt 0 ]]; do
        case $1 in
            --paper)
                paper="$2"
                shift 2
                ;;
            --width)
                width="$2"
                shift 2
                ;;
            --height)
                height="$2"
                shift 2
                ;;
            --scale)
                scale="$2"
                shift 2
                ;;
            --full-page)
                full_page=true
                shift
                ;;
            --quality)
                quality="$2"
                shift 2
                ;;
            -*)
                echo -e "${RED}Unknown option: $1${NC}"
                exit 1
                ;;
            *)
                if [[ -z "$output_jpg" ]]; then
                    output_jpg="$1"
                fi
                shift
                ;;
        esac
    done

    # Apply paper size if specified
    if [[ -n "$paper" ]]; then
        local paper_dims
        paper_dims=$(get_paper_size "$paper")
        if [[ -z "$paper_dims" ]]; then
            echo -e "${RED}Error: Unknown paper size: $paper${NC}"
            echo "Use --help to see available paper sizes"
            exit 1
        fi
        width=$(echo "$paper_dims" | cut -d' ' -f1)
        height=$(echo "$paper_dims" | cut -d' ' -f2)
    fi

    # Default output filename
    if [[ -z "$output_jpg" ]]; then
        output_jpg="${input_html%.html}.jpg"
    fi

    # Convert to absolute path
    input_html="$(cd "$(dirname "$input_html")" && pwd)/$(basename "$input_html")"

    # Ensure output directory exists
    mkdir -p "$(dirname "$output_jpg")"

    echo -e "${GREEN}Converting: $input_html${NC}"
    echo -e "  Output: $output_jpg"
    echo -e "  Viewport: ${width}x${height} @ ${scale}x"
    echo -e "  Quality: ${quality}%"

    # Run Puppeteer script via Bun (with fixed no_proxy for Web Claude)
    fix_no_proxy
    bun run "$SCRIPT_DIR/html-render.ts" \
        jpg \
        "$input_html" \
        "$output_jpg" \
        "$width" \
        "$height" \
        "$scale" \
        "$full_page" \
        "$quality"

    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}Done: $output_jpg${NC}"
    else
        echo -e "${RED}Failed to convert${NC}"
        exit 1
    fi
}

# HTML to PDF conversion
html2pdf() {
    local input_html="$1"
    shift

    if [[ -z "$input_html" ]]; then
        echo -e "${RED}Error: Input HTML file required${NC}"
        echo "Usage: ./bin/cli-ext.sh html2pdf <input.html> [output.pdf]"
        exit 1
    fi

    if [[ ! -f "$input_html" ]]; then
        echo -e "${RED}Error: File not found: $input_html${NC}"
        exit 1
    fi

    # Parse remaining arguments
    local output_pdf=""
    local width=1920
    local height=1080
    local format="a4"
    local landscape=false
    local paper=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            --paper)
                paper="$2"
                shift 2
                ;;
            --width)
                width="$2"
                shift 2
                ;;
            --height)
                height="$2"
                shift 2
                ;;
            --format)
                format="$2"
                shift 2
                ;;
            --landscape)
                landscape=true
                shift
                ;;
            -*)
                echo -e "${RED}Unknown option: $1${NC}"
                exit 1
                ;;
            *)
                if [[ -z "$output_pdf" ]]; then
                    output_pdf="$1"
                fi
                shift
                ;;
        esac
    done

    # Apply paper size if specified
    if [[ -n "$paper" ]]; then
        local paper_dims
        paper_dims=$(get_paper_size "$paper")
        if [[ -z "$paper_dims" ]]; then
            echo -e "${RED}Error: Unknown paper size: $paper${NC}"
            echo "Use --help to see available paper sizes"
            exit 1
        fi
        width=$(echo "$paper_dims" | cut -d' ' -f1)
        height=$(echo "$paper_dims" | cut -d' ' -f2)
        # Detect landscape from paper name
        if [[ "$paper" == *"-landscape"* ]]; then
            landscape=true
        fi
    fi

    # Default output filename
    if [[ -z "$output_pdf" ]]; then
        output_pdf="${input_html%.html}.pdf"
    fi

    # Convert to absolute path
    input_html="$(cd "$(dirname "$input_html")" && pwd)/$(basename "$input_html")"

    # Ensure output directory exists
    mkdir -p "$(dirname "$output_pdf")"

    echo -e "${GREEN}Converting: $input_html${NC}"
    echo -e "  Output: $output_pdf"
    echo -e "  Viewport: ${width}x${height}"
    echo -e "  PDF: ${format} $([ "$landscape" = true ] && echo "(landscape)" || echo "(portrait)")"

    # Run Puppeteer script via Bun (with fixed no_proxy for Web Claude)
    fix_no_proxy
    bun run "$SCRIPT_DIR/html-render.ts" \
        pdf \
        "$input_html" \
        "$output_pdf" \
        "$width" \
        "$height" \
        "$format" \
        "$landscape"

    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}Done: $output_pdf${NC}"
    else
        echo -e "${RED}Failed to convert${NC}"
        exit 1
    fi
}

# Main
case "${1:-}" in
    init)
        run_init
        ;;
    html2png)
        check_bun
        shift
        ensure_puppeteer
        html2png "$@"
        ;;
    html2jpg|html2jpeg)
        check_bun
        shift
        ensure_puppeteer
        html2jpg "$@"
        ;;
    html2pdf)
        check_bun
        shift
        ensure_puppeteer
        html2pdf "$@"
        ;;
    --help|-h|"")
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac
