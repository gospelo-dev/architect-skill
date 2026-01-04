# gospelo-architect

**You describe. AI designs. Diagrams appear.**

A new paradigm for creating system architecture diagrams: humans provide intent, AI agents handle design and layout. No manual dragging, no pixel adjustments - just describe what you want and let the AI do the rest.

Built for the AI Agent era. While traditional diagramming tools require humans to manually place icons and draw lines, gospelo-architect is designed from the ground up for AI agents to operate autonomously - reading JSON definitions, generating professional diagrams, and iterating based on human feedback.

## Why gospelo-architect?

- **AI-Native Design**: JSON-based definitions that AI agents can read, write, and modify
- **Iterative Workflow**: Describe changes in natural language, AI updates the diagram
- **Professional Output**: Production-ready SVG and HTML with 1,500+ cloud icons
- **Fine-Tuning When Needed**: Visual editor available for precise adjustments when required

## Features

- **Zero Dependencies**: Pure TypeScript with no external runtime dependencies
- **Multiple Output Formats**: SVG, standalone HTML, SVG-embedded Markdown, enriched JSON with metadata
- **Incremental Editing**: Fluent builder API for programmatic diagram modifications
- **Cloud Icons**: Built-in support for AWS, Azure, Google Cloud, and Tech Stack icons (1,500+ icons)
- **CLI Tool**: Full-featured command-line interface

## Output Formats

gospelo-architect supports multiple output formats for different use cases:

| Format | Command | Description |
|--------|---------|-------------|
| **HTML (Shareable)** | `render` | Interactive HTML with hover tooltips and Shift+drag area selection for copying resource IDs (requires CDN) |
| **HTML (Preview)** | `preview` | Read-only HTML with Base64 embedded icons, Shift+drag multi-select for copying resource IDs (offline-capable) |
| **SVG** | `svg` | Clean SVG output for embedding in documents |
| **SVG (Embedded)** | `embed` | Base64 embedded icons + Confidential badge for GitHub README |
| **ZIP (Embed Bundle)** | `embed --zip` | SVG + Markdown bundle with Japanese filename support |
| **JSON (Enriched)** | `enrich` | Original JSON + computed metadata (positions, sizes) |
| **JSON (Meta only)** | `meta` | Metadata only for AI consumption |

### Embed Command

Generate GitHub-ready SVG with embedded icons:

```bash
# Generate embedded SVG only
gospelo-architect embed diagram.json

# Generate ZIP bundle (SVG + Markdown)
gospelo-architect embed --zip diagram.json
```

The `--zip` option creates a ZIP file containing:
- `{title}.svg` - SVG with Base64 embedded icons and Confidential badge
- `{title}.md` - Markdown file with SVG reference

ZIP files use UTF-8 encoding flag (bit 11) for Windows Japanese filename compatibility.

## Installation

```bash
# Using Bun
bun add gospelo-architect

# Using npm
npm install gospelo-architect
```

## Quick Start

### CLI Usage

```bash
# Render diagram to HTML
gospelo-architect render diagram.json output.html

# Render to SVG only
gospelo-architect svg diagram.json output.svg

# Add metadata for AI consumption
gospelo-architect enrich diagram.json enriched.json

# Output metadata only
gospelo-architect meta diagram.json --pretty
```

### Programmatic Usage

```typescript
import { renderShareable, renderSvg, enrichDiagram } from "gospelo-architect";

const diagram = {
  title: "My Architecture",
  nodes: [
    {
      id: "lambda",
      icon: "aws:lambda",
      label: "Function",
      position: [100, 100],
    },
    { id: "db", icon: "aws:dynamodb", label: "Database", position: [300, 100] },
  ],
  connections: [{ from: "lambda", to: "db", type: "data" }],
};

// Render to HTML
const html = renderShareable(diagram, { width: 800, height: 600 });

// Render to SVG
const svg = renderSvg(diagram);

// Enrich with metadata
const enriched = enrichDiagram(diagram);
```

## Diagram Definition Format

Diagrams are defined in JSON format:

```json
{
  "title": "System Architecture",
  "subtitle": "Production Environment",
  "background": {
    "type": "gradient",
    "startColor": "#f5f5f5",
    "endColor": "#ffffff",
    "direction": "south"
  },
  "nodes": [
    {
      "id": "api",
      "icon": "aws:api_gateway",
      "label": "API Gateway",
      "position": [200, 100]
    },
    {
      "id": "backend",
      "type": "group",
      "label": "Backend Services",
      "position": [100, 200],
      "size": [400, 300],
      "children": [
        { "id": "lambda", "icon": "aws:lambda", "label": "Function" },
        { "id": "db", "icon": "aws:dynamodb", "label": "Database" }
      ]
    }
  ],
  "connections": [
    { "from": "api", "to": "lambda", "type": "data" },
    { "from": "lambda", "to": "db", "type": "data", "bidirectional": true }
  ]
}
```

## CLI Commands

### Render Commands

| Command                             | Description                                      |
| ----------------------------------- | ------------------------------------------------ |
| `render <input.json> [output.html]` | Render diagram to standalone HTML                |
| `svg <input.json> [output.svg]`     | Render diagram to SVG only                       |
| `enrich <input.json> [output.json]` | Add computed metadata to diagram JSON            |
| `meta <input.json>`                 | Output metadata only (JSON to stdout)            |
| `preview <input.json>`              | Generate SVG and output file path for AI viewing |

### Edit Commands

| Command                                             | Description                             |
| --------------------------------------------------- | --------------------------------------- |
| `eval <input.json> '<expr>' [output.json]`          | Evaluate JS expression with builder 'b' |
| `edit <input.json> <patch.json> [output.json]`      | Apply patch to diagram                  |
| `add-node <input.json> <node.json> [output.json]`   | Add a node from JSON                    |
| `remove-node <input.json> <node-id> [output.json]`  | Remove a node by ID                     |
| `move-node <input.json> <node-id> <x> <y> [output]` | Move node to position                   |
| `add-connection <input.json> <from> <to> [output]`  | Add a connection                        |

### Options

| Option              | Description                   |
| ------------------- | ----------------------------- |
| `--width <number>`  | Diagram width (default: 800)  |
| `--height <number>` | Diagram height (default: 600) |
| `--pretty`          | Pretty-print JSON output      |
| `--in-place`        | Modify input file in place    |

## Incremental Editing with Builder

The `eval` command provides a fluent builder API for diagram modifications:

```bash
# Add a new node
bun bin/cli.ts eval diagram.json 'b.addNode({id:"new",icon:"aws:lambda",label:"New",position:[400,300]})'

# Chain multiple operations
bun bin/cli.ts eval diagram.json 'b.removeNode("old").addConnection({from:"a",to:"b"})'

# Move and update nodes
bun bin/cli.ts eval diagram.json 'b.moveNode("lambda",500,400).setNodeLabel("lambda","Updated")' --pretty
```

### Builder Methods

| Method                                         | Description                    |
| ---------------------------------------------- | ------------------------------ |
| `addNode(node)`                                | Add a new node                 |
| `removeNode(id)`                               | Remove a node by ID            |
| `moveNode(id, x, y)` or `moveNode(id, [x, y])` | Move node to position          |
| `setNodeLabel(id, label)`                      | Update node label              |
| `addConnection({from, to, ...})`               | Add a connection               |
| `removeConnection(from, to)`                   | Remove a connection            |
| `applyPatch(patch)`                            | Apply multiple changes at once |
| `build()`                                      | Get the modified diagram       |

## Icon Reference

Icons use the format `provider:name` (e.g., `aws:lambda`, `azure:functions`, `gcp:cloud_run`, `tech:python`).

Over 1,500 icons available across AWS, Azure, Google Cloud, and Tech Stack providers.

See the [Icon Catalog](docs/references/ICON_CATALOG.md) for browsing and searching icons.

### Common Icons

**AWS**: `aws:lambda`, `aws:ec2`, `aws:s3`, `aws:rds`, `aws:dynamodb`, `aws:api_gateway`, `aws:cloudfront`, `aws:cognito`, `aws:sqs`, `aws:sns`

**Azure**: `azure:virtual_machines`, `azure:app_service`, `azure:functions`, `azure:blob_storage`, `azure:cosmos_db`, `azure:sql_database`

**Google Cloud**: `gcp:cloud_run`, `gcp:cloud_functions`, `gcp:compute_engine`, `gcp:cloud_storage`

**Tech Stack**: `tech:python`, `tech:typescript`, `tech:react`, `tech:docker`, `tech:kubernetes`

## Node Types

| Type               | Description                      |
| ------------------ | -------------------------------- |
| `icon`             | Single icon with label (default) |
| `group`            | Container for child nodes        |
| `composite`        | Multiple icons in a single node  |
| `text_box`         | Text-only node                   |
| `person`           | Person icon                      |
| `person_pc_mobile` | Person with PC and mobile        |
| `pc_mobile`        | PC and mobile devices            |
| `pc`               | PC device                        |

## Connection Types

| Type   | Description                       |
| ------ | --------------------------------- |
| `data` | Data flow (solid line with arrow) |
| `auth` | Authentication flow (dashed line) |

## API Reference

### Core Functions

```typescript
// Render to shareable HTML with embedded SVG and CSS (requires CDN for icons)
renderShareable(diagram: DiagramDefinition, options?: RenderOptions): string

// Render to SVG only
renderSvg(diagram: DiagramDefinition, options?: RenderOptions): string

// Add computed metadata to diagram
enrichDiagram(diagram: unknown, options?: RenderOptions): object

// Generate metadata for AI consumption
generateMeta(diagram: unknown, options?: RenderOptions): DiagramMeta

// Create a builder for incremental editing
createBuilder(diagram: DiagramDefinition): DiagramBuilder
```

### Render Options

```typescript
interface RenderOptions {
  width?: number; // Default: 1200
  height?: number; // Default: 800
  iconSize?: number; // Default: 48
  fontSize?: number; // Default: 11
  embedCss?: boolean; // Default: true
  externalIcons?: boolean; // Default: true
}
```

## Web Claude Compatibility

When using with Web Claude, the diagram can be rendered and viewed using the AI's file preview capabilities:

1. Use the `preview` command to generate an SVG in a temporary location
2. The AI can then read and display the SVG file

```bash
gospelo-architect preview diagram.json
# Output: Preview SVG generated: /tmp/diagram_preview_xxx.svg
```

### Required Domains

To use gospelo-architect with Web Claude, add the following domains to **Capabilities > Additional allowed domains**:

```
raw.githubusercontent.com
cdn.jsdelivr.net
architect.gospelo.dev
w3.org
```

| Domain | Purpose |
|--------|---------|
| `raw.githubusercontent.com` | AWS and Google Cloud icon SVGs |
| `cdn.jsdelivr.net` | Azure and Tech Stack icon SVGs |
| `architect.gospelo.dev` | Icon catalog CDN (metadata) |
| `w3.org` | SVG namespace definitions |

## Agent Skills (Claude)

gospelo-architect can be used as a Claude Agent Skill. A pre-built skill package is available at `.github/skills/gospelo-architect/`.

### Building the Skill ZIP

```bash
# Generate Agent Skills ZIP
bun run build:skill
# or
npm run build:skill
```

**Output**: `dist/skills/gospelo-architect-skill.zip` (~7KB)

**Contents**:
- `SKILL.md` - Skill definition (placed at root)
- `references/` - CLI reference, Builder API, Schema documentation

### Skill ZIP Structure

```
gospelo-architect-skill.zip
├── SKILL.md              # Skill definition (root)
└── references/
    ├── builder-api.md    # DiagramBuilder API reference
    ├── cli-reference.md  # CLI command reference
    └── schema.md         # TypeScript types & JSON examples
```

### Skill ZIP License

The generated `gospelo-architect-skill.zip` is licensed under MIT License, same as the main package. You are free to:
- Use the skill in your Claude projects
- Modify the skill definition
- Redistribute the skill (with attribution)

## License

[MIT](https://github.com/gospelo-dev/architect-skill/blob/main/LICENSE.md)

## Repository

https://github.com/gospelo-dev/architect-skill
