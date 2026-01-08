---
name: gospelo-architect
description: Generate and edit system architecture diagrams from JSON definitions. Supports incremental editing with eval command. Outputs HTML, SVG, or enriched JSON. Also provides icon catalog search. Use when asked to create, modify, or visualize AWS/Azure/GCP architecture diagrams, or when searching for available icons.
allowed-tools: Read, Bash(bun:*), Bash(gospelo-architect:*), WebSearch
---

# System Diagram Generator Skill

## License Notice

By using this skill, you agree to the terms in [LICENSE.md](../../../LICENSE.md).

- **Preview output**: Internal use only (redistribution prohibited)
- **Icons**: Subject to third-party licenses (AWS, Azure, GCP, etc.)
- **Image export**: See LICENSE.md for cli-ext.sh restrictions

Generate and edit system architecture diagrams from JSON definitions. Supports AWS, Azure, GCP, and other tech stack icons.

## CRITICAL: Environment Setup (MUST DO FIRST)

**BEFORE doing anything else, you MUST verify and install dependencies:**

```bash
# 1. Check and install bun
which bun || npm install -g bun

# 2. Check and install gospelo-architect
which gospelo-architect || PUPPETEER_SKIP_DOWNLOAD=true npm install -g gospelo-architect
```

**IMPORTANT**:
- Run these checks EVERY TIME before using this skill
- Do NOT proceed to icon search or diagram creation until both `bun` and `gospelo-architect` are confirmed installed
- If installation fails, troubleshoot before continuing
- `PUPPETEER_SKIP_DOWNLOAD=true` skips Chrome download (~200MB) - image export (cli-ext.sh) won't work, but all other features will work normally

## When to Use

Activate this skill when the user asks to:
- Create a system architecture diagram
- Modify an existing diagram (add/remove/move nodes)
- Create AWS/Azure/GCP architecture diagrams
- Search for available icons

## Workflow: Creating/Editing Diagrams

### Step 1: Search for Icon IDs (MANDATORY)

**CRITICAL**: NEVER guess icon names. Always search first.

```bash
gospelo-architect --icon-search lambda
gospelo-architect --icon-search "api gateway"
gospelo-architect --icon-search s3
```

**Why this matters**: Icon IDs are not intuitive.
- ❌ `aws:s3` → 404 error
- ✅ `aws:simple_storage_service` → correct

### Step 2: Research Architecture Best Practices (MANDATORY for new diagrams)

Before designing connections, use WebSearch to find best practices:

```
WebSearch: "AWS Lambda S3 architecture best practices"
WebSearch: "API Gateway Lambda DynamoDB connection pattern"
```

Consider:
- Data flow direction (who initiates requests)
- Sync vs async communication
- Security boundaries (VPC, IAM)

### Step 3: Create Diagram JSON

```json
{
  "title": "My Architecture",
  "render": { "width": 700, "height": 400 },
  "resources": {
    "@api": { "icon": "aws:api_gateway", "desc": "REST API" },
    "@lambda": { "icon": "aws:lambda", "desc": "Business logic" }
  },
  "nodes": [
    {"id": "@api", "label": "API Gateway", "position": [200, 150]},
    {"id": "@lambda", "label": "Lambda", "position": [400, 150]}
  ],
  "connections": [
    {"from": "@api", "to": "@lambda"},
    {"from": "@client", "to": "@auth", "bidirectional": true}
  ]
}
```

**Rules**:
- Node IDs must start with `@`
- Each node needs a matching resource
- Spacing: ~150px horizontal, ~150px vertical
- Use `"bidirectional": true` for two-way communication (e.g., Client ↔ Auth service)

### Step 4: Generate Preview

```bash
# HTML preview (default)
bun bin/cli.ts preview diagram.json
open diagram_preview.html

# PNG preview (for visual verification in AI context)
bun bin/cli.ts preview diagram.json --png
# → diagram_preview.png (requires: ./bin/cli-ext.sh init)
```

**When to use `--png`**:
- When AI needs to visually verify the diagram result
- When sharing the diagram in environments that don't support HTML
- When the user requests image output directly

## Adding Nodes to Existing Diagram

**Always follow this sequence:**

1. **Search icon**: `gospelo-architect --icon-search "service name"`
2. **Research connection**: WebSearch for architecture patterns if unsure
3. **Add resource + node + connection**: Never add orphaned nodes
4. **Regenerate preview**

## Output Commands

| Command | Description |
|---------|-------------|
| `preview <input>` | Preview HTML (Base64 embedded) |
| `preview <input> --png` | Preview PNG image (requires cli-ext.sh init) |
| `html <input>` | Interactive HTML with tooltips |
| `svg <input>` | Clean SVG |
| `svg-embed <input>` | SVG with embedded icons (offline) |
| `markdown <input>` | Markdown + SVG ZIP bundle |

## CLI Quick Reference

```bash
# Search icons
gospelo-architect --icon-search lambda

# Add resource
gospelo-architect --add-resource "@db" --icon "aws:dynamodb" --desc "Storage" --diagram system.json

# Add node
gospelo-architect --insert-below @lambda --node '{"id":"@db","label":"DynamoDB"}' --diagram system.json

# Update node
gospelo-architect --update-node @lambda --node '{"label":"New Label"}' --diagram system.json

# Remove node
gospelo-architect --remove-node @old --diagram system.json
```

## Layout Options

Control diagram flow direction with `--portrait` or `--landscape` options:

| Option | Description |
|--------|-------------|
| `--portrait` | Top-to-bottom flow (720x1280 default) |
| `--landscape` | Left-to-right flow (1280x720 default) |

```bash
# Portrait layout (top-to-bottom)
bun bin/cli.ts preview diagram.json --portrait

# Landscape layout (left-to-right, default)
bun bin/cli.ts preview diagram.json --landscape

# Override JSON's layout setting
gospelo-architect --output html --diagram system.json --portrait
```

You can also set layout in the JSON file:
```json
{
  "title": "My Architecture",
  "layout": "portrait",
  "nodes": [...]
}
```

CLI options (`--portrait`, `--landscape`) override the JSON `layout` property.

## Supported Icon Providers

| Provider | Prefix | Example |
|----------|--------|---------|
| AWS | `aws:` | `aws:lambda` |
| Azure | `azure:` | `azure:functions` |
| GCP | `gcp:` | `gcp:cloud_functions` |
| Tech Stack | `tech-stack:` | `tech-stack:python` |
| Heroicons | `heroicons:` | `heroicons:star` |
| Lucide | `lucide:` | `lucide:house` |

## Common Mistakes to Avoid

- ❌ Guessing icon names without searching
- ❌ Adding nodes without connections (orphaned)
- ❌ Skipping best practices research for unfamiliar architectures

## Advanced Topics

### Grouping Nodes (VPC, Region, AZ)

Use group nodes to organize related components:

```json
{
  "id": "@vpc",
  "type": "group",
  "label": "VPC",
  "borderColor": "blue",
  "position": [100, 100],
  "size": [500, 300],
  "children": [
    { "id": "@subnet", "label": "Subnet", "parentId": "@vpc", "position": [200, 200] }
  ]
}
```

**Key points**:
- Group nodes need `type: "group"` and `children` array
- Each child MUST have `parentId` set to the group's `id`
- Groups can be nested (Region > VPC > AZ > Subnet)

See [Grouping Guide](references/grouping-guide.md) for detailed examples.

---

## Optional Extension: Image/PDF Export

Convert diagram HTML to PNG, JPEG, or PDF images using Puppeteer + headless Chrome.

### When to Use

Activate this extension when the user asks to:
- Export diagram as PNG/JPEG/PDF image
- Create high-resolution diagram for printing
- Generate image files from HTML diagrams

### IMPORTANT: User Confirmation Required

**Before using image export features, you MUST:**

1. **Ask user for confirmation** - This extension requires additional setup (Puppeteer + Chrome download ~200MB)
2. **Run init command** - First-time setup is required before any html2png/html2jpg/html2pdf commands

Example confirmation:
```
Image export requires Puppeteer and Chrome (~200MB download).
Do you want to proceed with setup?
- Run: ./bin/cli-ext.sh init
```

### Web Claude Environment

On Web Claude (Ubuntu), the following domains must be accessible for Chrome download:
- `storage.googleapis.com`
- `googlechromelabs.github.io`

### Setup

```bash
# First-time setup (REQUIRED)
./bin/cli-ext.sh init
```

### Image Export Workflow

```bash
# 1. Generate HTML from diagram
bun bin/cli.ts preview diagram.json diagram.html

# 2. Convert to image
./bin/cli-ext.sh html2png diagram.html --paper a3-landscape
./bin/cli-ext.sh html2jpg diagram.html --paper fhd-landscape --quality 85
./bin/cli-ext.sh html2pdf diagram.html --paper a4-landscape
```

### Paper Sizes

Use `--paper` option with size name:
- Paper: `a1` - `a4`, `b1` - `b4` (JIS) with `-landscape` or `-portrait`
- Screen: `hd`, `fhd`, `4k`, `8k` with `-landscape` or `-portrait`

Example: `--paper a3-landscape`, `--paper fhd-portrait`

### Reference

See [cli-ext-reference.md](references/cli-ext-reference.md) for full documentation.
