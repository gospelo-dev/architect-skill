# CLI Reference

Complete command-line interface reference for gospelo-architect.

## Usage

```bash
bun bin/cli.ts <command> [options]
```

## Render Commands

| Command | Description |
|---------|-------------|
| `html <input.json> [output.html]` | Render diagram to standalone HTML |
| `svg <input.json> [output.svg]` | Render diagram to SVG (CDN icons) |
| `svg-embed <input.json> [output.svg]` | Render SVG with Base64 embedded icons |
| `preview <input.json> [output.html]` | Generate preview HTML with embedded icons |
| `markdown <input.json> [output.zip]` | Generate ZIP with Markdown + embedded SVG |
| `enrich <input.json> [output.json]` | Add computed metadata to diagram JSON |
| `meta <input.json>` | Output metadata only (JSON to stdout) |

### Examples

```bash
# Render to HTML
bun bin/cli.ts html diagram.json output.html

# Render to SVG (CDN icons)
bun bin/cli.ts svg diagram.json output.svg

# Render to SVG with embedded icons (offline-capable)
bun bin/cli.ts svg-embed diagram.json output.svg

# Generate Markdown + SVG ZIP bundle
bun bin/cli.ts markdown diagram.json output.zip

# Add metadata for AI consumption
bun bin/cli.ts enrich diagram.json enriched.json

# Output metadata only
bun bin/cli.ts meta diagram.json --pretty
```

## Edit Commands

| Command | Description |
|---------|-------------|
| `eval <input.json> '<expr>' [output.json]` | Evaluate JS expression with builder 'b' |
| `edit <input.json> <patch.json> [output.json]` | Apply patch to diagram |
| `add-node <input.json> <node.json> [output.json]` | Add a node from JSON |
| `remove-node <input.json> <node-id> [output.json]` | Remove a node by ID |
| `move-node <input.json> <node-id> <x> <y> [output]` | Move node to position |
| `add-connection <input.json> <from> <to> [output]` | Add a connection |
| `remove-connection <input.json> <from> <to> [output]` | Remove a connection |

### Examples

```bash
# Add a new node
bun bin/cli.ts eval diagram.json 'b.addNode({id:"@new",icon:"aws:lambda",label:"New",position:[400,300]})'

# Chain multiple operations
bun bin/cli.ts eval diagram.json 'b.removeNode("@old").addConnection({from:"@a",to:"@b"})'

# Move and update nodes
bun bin/cli.ts eval diagram.json 'b.moveNode("@lambda",500,400).setNodeLabel("@lambda","Updated")' --pretty

# Add node using individual command
bun bin/cli.ts add-node diagram.json '{"id":"@cache","icon":"aws:elasticache","label":"Cache","position":[400,300]}'

# Remove a node
bun bin/cli.ts remove-node diagram.json @old_node

# Move a node
bun bin/cli.ts move-node diagram.json @lambda 500 400

# Add a connection
bun bin/cli.ts add-connection diagram.json @api @lambda
```

## Options

| Option | Description |
|--------|-------------|
| `--width <number>` | Diagram width (default: 1920) |
| `--height <number>` | Diagram height (default: 1080) |
| `--paper <size>` | Paper/screen size for print-optimized output |
| `--pretty` | Pretty-print JSON output |
| `--in-place` | Modify input file in place |

## Print Settings

Use `--paper` option for print-optimized output.

### Available Sizes

**Paper sizes**: `a1-landscape`, `a1-portrait`, `a2-landscape`, `a2-portrait`, `a3-landscape`, `a3-portrait`, `a4-landscape`, `a4-portrait`, `b1-landscape`, `b1-portrait`, `b2-landscape`, `b2-portrait`, `b3-landscape`, `b3-portrait`, `b4-landscape`, `b4-portrait`

**Screen sizes**: `hd-landscape`, `hd-portrait`, `fhd-landscape`, `fhd-portrait`, `4k-landscape`, `4k-portrait`, `8k-landscape`, `8k-portrait`

### Examples

```bash
# A4 landscape for office printing
bun bin/cli.ts html diagram.json output.html --paper a4-landscape

# 4K landscape for large displays
bun bin/cli.ts html diagram.json output.html --paper 4k-landscape

# B2 portrait for posters
bun bin/cli.ts html diagram.json output.html --paper b2-portrait
```

See [Print Settings Reference](PRINT_SETTINGS.md) for detailed documentation.

## Builder Methods

Methods available in `eval` command expressions:

| Method | Description |
|--------|-------------|
| `addNode(node)` | Add a new node |
| `removeNode(id)` | Remove a node by ID |
| `moveNode(id, x, y)` or `moveNode(id, [x, y])` | Move node to position |
| `setNodeLabel(id, label)` | Update node label |
| `addConnection({from, to, ...})` | Add a connection |
| `removeConnection(from, to)` | Remove a connection |
| `applyPatch(patch)` | Apply multiple changes at once |
| `build()` | Get the modified diagram |

## Web Claude Compatibility

When using with Web Claude, generate a preview SVG:

```bash
bun bin/cli.ts preview diagram.json
# Output: Preview SVG generated: /tmp/diagram_preview_xxx.svg
```

### Required Domains

Add these domains to **Capabilities > Additional allowed domains**:

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
