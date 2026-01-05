---
name: gospelo-diagramjs
description: Generate and edit system architecture diagrams from JSON definitions. Supports incremental editing with eval command. Outputs HTML, SVG, or enriched JSON. Use when asked to create, modify, or visualize AWS/Azure/GCP architecture diagrams.
allowed-tools: Read, Bash(bun:*)
---

# System Diagram Generator Skill

A skill for generating and editing system architecture diagrams from JSON definitions. Supports AWS, Azure, GCP, and other tech stack icons.

## When to Use

Activate this skill when the user asks to:

- Create a system architecture diagram
- Modify an existing diagram (add/remove/move nodes)
- Generate infrastructure visualization
- Create AWS/Azure/GCP architecture diagrams
- Export diagram to HTML, SVG, or enriched JSON

## Prerequisites

- Bun runtime (installed via `npm install -g bun`)

## Quick Start - Flag-style Commands (Recommended)

Flag-style commands for Agent Skills. Use `--diagram` option to specify the target file.

```bash
# Show diagram structure
gospelo-architect --open --diagram system.json

# HTML/SVG output
gospelo-architect --output html --diagram system.json
gospelo-architect --output svg --diagram system.json

# Specify output directory (auto-created)
gospelo-architect --output html --diagram system.json --output-dir ./output

# Add node (positioned above/below reference node)
gospelo-architect --insert-above api_gateway --node '{"id":"waf","icon":"aws:waf","label":"WAF"}' --diagram system.json
gospelo-architect --insert-below lambda --node '{"id":"db","icon":"aws:dynamodb","label":"DynamoDB"}' --diagram system.json

# Update node
gospelo-architect --update-node lambda --node '{"label":"Updated Lambda","sublabel":"Python 3.12"}' --diagram system.json

# Remove node
gospelo-architect --remove-node old_node --diagram system.json
```

## Eval Command (Advanced)

The most flexible method is the `eval` command. `b` is available as a DiagramBuilder instance.

```bash
# Add node
bun bin/cli.ts eval diagram.json 'b.addNode({id:"lambda",icon:"aws:lambda",label:"Lambda",position:[400,300]})'

# Move node
bun bin/cli.ts eval diagram.json 'b.moveNode("lambda",[500,400])'

# Chain multiple operations
bun bin/cli.ts eval diagram.json 'b.addNode({...}).addConnection({from:"a",to:"b"}).removeNode("old")'

# Change label
bun bin/cli.ts eval diagram.json 'b.setNodeLabel("lambda","New Label","New Sublabel")'
```

## CLI Commands

### Flag-style Commands (for Agent Skills)

```bash
# Show diagram structure
gospelo-architect --open --diagram <file.json>

# HTML/SVG output
gospelo-architect --output html --diagram <file.json>
gospelo-architect --output svg --diagram <file.json>

# Node operations (auto-positioned above/below reference node)
gospelo-architect --insert-above <ref-node-id> --node '<json>' --diagram <file.json>
gospelo-architect --insert-below <ref-node-id> --node '<json>' --diagram <file.json>
gospelo-architect --update-node <node-id> --node '<json>' --diagram <file.json>
gospelo-architect --remove-node <node-id> --diagram <file.json>
```

### Traditional Render Commands

```bash
# Generate JSON with metadata
bun bin/cli.ts enrich diagram.json output.json --pretty

# Generate standalone HTML
bun bin/cli.ts render diagram.json output.html

# Generate SVG file
bun bin/cli.ts svg diagram.json output.svg

# Show metadata only
bun bin/cli.ts meta diagram.json --pretty
```

### Traditional Edit Commands

```bash
# eval - Most flexible (execute JS expression)
bun bin/cli.ts eval <input.json> '<expression>' [output.json]

# Individual commands
bun bin/cli.ts add-node <input.json> '<node-json>' [output.json]
bun bin/cli.ts remove-node <input.json> <node-id> [output.json]
bun bin/cli.ts move-node <input.json> <node-id> <x> <y> [output.json]
bun bin/cli.ts add-connection <input.json> <from> <to> [output.json]
bun bin/cli.ts remove-connection <input.json> <from> <to> [output.json]
bun bin/cli.ts edit <input.json> <patch.json> [output.json]
```

## DiagramBuilder Methods

Methods available in `eval` command:

| Method | Description |
| ------ | ----------- |
| `addNode({id, icon, label, position, ...})` | Add a node |
| `insertAbove(refNodeId, nodeInput, offsetY?)` | Add node above reference node |
| `insertBelow(refNodeId, nodeInput, offsetY?)` | Add node below reference node |
| `insertLeft(refNodeId, nodeInput, offsetX?)` | Add node left of reference node |
| `insertRight(refNodeId, nodeInput, offsetX?)` | Add node right of reference node |
| `removeNode(id)` | Remove node and related connections |
| `updateNode(id, {label, icon, ...})` | Update a node |
| `moveNode(id, [x, y])` | Move a node |
| `setNodeLabel(id, label, sublabel?)` | Change label |
| `setNodeIcon(id, icon)` | Change icon |
| `addConnection({from, to, type?, color?, bidirectional?})` | Add connection (bidirectional: true for two-way arrows) |
| `removeConnection(from, to)` | Remove connection |
| `updateConnection(from, to, {...})` | Update connection |
| `setTitle(title)` | Set title |
| `setSubtitle(subtitle)` | Set subtitle |

## Options

| Option             | Description                          |
| ------------------ | ------------------------------------ |
| `--width <number>` | Diagram width (default: 1920)        |
| `--height <number>`| Diagram height (default: 1080)       |
| `--paper <size>`   | Paper/screen size for print output   |
| `--pretty`         | Pretty-print JSON output             |
| `--in-place`       | Modify input file in place           |
| `--help`           | Show help                            |

## Print Settings

Use the `--paper` option to generate print-optimized output.

### Available `--paper` options

**Paper sizes**: `a1-landscape`, `a1-portrait`, `a2-landscape`, `a2-portrait`, `a3-landscape`, `a3-portrait`, `a4-landscape`, `a4-portrait`, `b1-landscape`, `b1-portrait`, `b2-landscape`, `b2-portrait`, `b3-landscape`, `b3-portrait`, `b4-landscape`, `b4-portrait`

**Screen sizes**: `hd-landscape`, `hd-portrait`, `fhd-landscape`, `fhd-portrait`, `4k-landscape`, `4k-portrait`, `8k-landscape`, `8k-portrait`

### Usage Examples

```bash
# A4 landscape output (for office printing)
bun bin/cli.ts html diagram.json output.html --paper a4-landscape

# A3 portrait output (for presentations)
bun bin/cli.ts html diagram.json output.html --paper a3-portrait

# B2 landscape output (for posters)
bun bin/cli.ts html diagram.json output.html --paper b2-landscape

# 4K landscape output (for large displays)
bun bin/cli.ts html diagram.json output.html --paper 4k-landscape

# Full HD portrait output (for vertical monitors)
bun bin/cli.ts html diagram.json output.html --paper fhd-portrait
```

### Behavior

- **ViewBox**: Set to specified paper size
- **Content fit**: Auto-fit within paper bounds (shrink only, no enlargement)
- **Aspect ratio**: Preserved
- **Alignment**: Top-aligned, horizontally centered
- **Icon size**: Fixed at 48px in viewBox coordinates

### High-DPI Display Support

Diagrams defined at 96 DPI display sharply on high-resolution screens:

| Display | Rendering |
|---------|-----------|
| Normal | 96 DPI |
| Retina 2x | 192 DPI |
| Retina 3x | 288 DPI |

SVG (vector format) output ensures no quality loss on any display.

## Diagram JSON Schema

```json
{
  "title": "My Architecture",
  "subtitle": "Optional subtitle",
  "background": {
    "type": "gradient",
    "direction": "south"
  },
  "nodes": [
    {
      "id": "lambda",
      "icon": "aws:lambda",
      "label": "Lambda Function",
      "sublabel": "Python 3.9",
      "position": [400, 250]
    }
  ],
  "connections": [
    {
      "from": "api_gateway",
      "to": "lambda",
      "type": "data",
      "color": "orange"
    },
    {
      "from": "client",
      "to": "cognito",
      "bidirectional": true
    }
  ]
}
```

## Supported Icon Providers

| Provider | Prefix   | Example                    |
| -------- | -------- | -------------------------- |
| AWS      | `aws:`   | `aws:lambda`, `aws:s3`     |
| Azure    | `azure:` | `azure:functions`          |
| GCP      | `gcp:`   | `gcp:cloud_functions`      |
| Tech     | `tech:`  | `tech:python`, `tech:react`|

## Examples

### Create a new diagram from scratch

```bash
# Create empty diagram
echo '{"title":"New Diagram","nodes":[],"connections":[]}' > diagram.json

# Add nodes
bun bin/cli.ts eval diagram.json 'b.addNode({id:"api",icon:"aws:api_gateway",label:"API Gateway",position:[200,150]})' diagram.json --in-place
bun bin/cli.ts eval diagram.json 'b.addNode({id:"lambda",icon:"aws:lambda",label:"Lambda",position:[400,150]})' diagram.json --in-place
bun bin/cli.ts eval diagram.json 'b.addNode({id:"db",icon:"aws:dynamodb",label:"DynamoDB",position:[600,150]})' diagram.json --in-place

# Add connections
bun bin/cli.ts eval diagram.json 'b.addConnection({from:"api",to:"lambda"}).addConnection({from:"lambda",to:"db"})' diagram.json --in-place

# Render to HTML
bun bin/cli.ts render diagram.json output.html
```

### Batch edit with patch file

```json
// patch.json
{
  "addNodes": [
    {"id": "cache", "icon": "aws:elasticache", "label": "Cache", "position": [400, 300]}
  ],
  "updateNodes": [
    {"id": "lambda", "sublabel": "Node.js 18"}
  ],
  "addConnections": [
    {"from": "lambda", "to": "cache"}
  ]
}
```

```bash
bun bin/cli.ts edit diagram.json patch.json updated.json --pretty
```

## AI Preview (Claude Code / Web Claude)

### Claude Code (CLI)

```bash
# Generate preview SVG (output to temp directory)
bun bin/cli.ts preview diagram.json

# Output example: Preview SVG generated: /tmp/diagram_preview_diagram_1234567890.svg
# → Read SVG file with Read tool to check contents
```

### Web Claude

In Web Claude, you can preview HTML using the "Presented file" feature:

```bash
# Generate HTML and output to /tmp
bun bin/cli.ts render diagram.json /tmp/diagram.html

# Or directly with Bun script
bun -e '
import { renderShareable } from "./src/index.ts";
import { readFileSync } from "fs";

const diagram = JSON.parse(readFileSync("diagram.json", "utf-8"));
const html = renderShareable(diagram);
await Bun.write("/tmp/diagram.html", html);
console.log("Created: /tmp/diagram.html");
'
```

Display the generated HTML file as "Presented file" to visually verify the diagram.
