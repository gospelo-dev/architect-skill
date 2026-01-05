# CLI Extended Tools Reference

## Overview

`cli-ext.sh` provides HTML to image/PDF conversion using Puppeteer + headless Chrome. This is an **optional extension** that requires separate setup.

## Requirements

- Bun runtime
- Puppeteer (auto-installed by init)
- Chrome/Chromium (auto-downloaded by init)

## Setup (REQUIRED before first use)

```bash
./bin/cli-ext.sh init
```

This command:
1. Checks/installs Bun
2. Installs Puppeteer dependency
3. Downloads Chrome for Puppeteer
4. Runs a test to verify installation

### Web Claude Environment Notes

On Web Claude (Ubuntu), you may need to add the following domains to your allowed list for Chrome download:

- `storage.googleapis.com`
- `googlechromelabs.github.io`

The script automatically handles the `no_proxy` configuration issue on Web Claude.

## Commands

### html2png - Convert HTML to PNG

```bash
./bin/cli-ext.sh html2png <input.html> [output.png] [options]
```

Lossless PNG output. Best for diagrams requiring crisp edges.

### html2jpg - Convert HTML to JPEG

```bash
./bin/cli-ext.sh html2jpg <input.html> [output.jpg] [options]
```

Lossy compression. Smaller file size, good for photos/gradients.

### html2pdf - Convert HTML to PDF

```bash
./bin/cli-ext.sh html2pdf <input.html> [output.pdf] [options]
```

Vector PDF output. Best for printing.

## Options

### Common Options

| Option | Description |
|--------|-------------|
| `--paper <size>` | Paper/screen size (overrides --width/--height) |
| `--width <pixels>` | Viewport width (default: 1920) |
| `--height <pixels>` | Viewport height (default: 1080) |

### Image Options (png/jpg)

| Option | Description |
|--------|-------------|
| `--scale <factor>` | Device scale factor (default: 2 for retina) |
| `--full-page` | Capture full scrollable page |

### JPEG-only Options

| Option | Description |
|--------|-------------|
| `--quality <0-100>` | JPEG quality (default: 90) |

### PDF-only Options

| Option | Description |
|--------|-------------|
| `--format <size>` | PDF format: a4, letter, legal, a3, etc. |

## Paper Sizes (96 DPI)

| Size | Landscape | Portrait |
|------|-----------|----------|
| A1 | 3179x2245 | 2245x3179 |
| A2 | 2245x1587 | 1587x2245 |
| A3 | 1587x1123 | 1123x1587 |
| A4 | 1123x794 | 794x1123 |
| B1 (JIS) | 3893x2752 | 2752x3893 |
| B2 (JIS) | 2752x1947 | 1947x2752 |
| B3 (JIS) | 1947x1376 | 1376x1947 |
| B4 (JIS) | 1376x971 | 971x1376 |
| HD | 1280x720 | 720x1280 |
| FHD | 1920x1080 | 1080x1920 |
| 4K | 3840x2160 | 2160x3840 |
| 8K | 7680x4320 | 4320x7680 |

Usage: `--paper a3-landscape`, `--paper fhd-portrait`, etc.

## Examples

```bash
# Basic PNG conversion
./bin/cli-ext.sh html2png diagram.html

# High-resolution A3 landscape
./bin/cli-ext.sh html2png diagram.html --paper a3-landscape --scale 2

# JPEG with custom quality
./bin/cli-ext.sh html2jpg diagram.html --paper fhd-landscape --quality 85

# PDF for printing
./bin/cli-ext.sh html2pdf diagram.html --paper a4-landscape

# Custom output path
./bin/cli-ext.sh html2png diagram.html output/my-diagram.png
```

## Workflow with gospelo-architect

```bash
# 1. Generate HTML from diagram JSON
bun bin/cli.ts preview diagram.json diagram.html

# 2. Convert to image (after init)
./bin/cli-ext.sh html2png diagram.html --paper a3-landscape
```

## Troubleshooting

### Chrome download fails on Web Claude

Add these domains to your allowed list:
- `storage.googleapis.com`
- `googlechromelabs.github.io`

### "Puppeteer not found" error

Run init again:
```bash
./bin/cli-ext.sh init
```

### Custom Chrome path

Set environment variable:
```bash
export PUPPETEER_EXECUTABLE_PATH=/path/to/chrome
./bin/cli-ext.sh html2png diagram.html
```
