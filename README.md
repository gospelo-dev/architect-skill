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
- **Multiple Output Formats**: SVG, HTML, Markdown+SVG ZIP, enriched JSON with metadata
- **Incremental Editing**: Fluent builder API for programmatic diagram modifications
- **Cloud Icons**: Built-in support for AWS, Azure, Google Cloud, and Tech Stack icons (1,500+ icons)
- **Rich Tooltips**: Hover to see resource ID, icon name, license, and description
- **CLI Tool**: Full-featured command-line interface

## Output Formats

gospelo-architect supports multiple output formats for different use cases:

| Format               | Command     | Description                                                                  |
| -------------------- | ----------- | ---------------------------------------------------------------------------- |
| **HTML**             | `html`      | Interactive HTML with hover tooltips and Shift+drag multi-select (CDN icons) |
| **SVG**              | `svg`       | Clean SVG with CDN icon references                                           |
| **SVG (Embedded)**   | `svg-embed` | SVG with Base64 embedded icons (offline-capable)                             |
| **Preview HTML**     | `preview`   | HTML with Base64 embedded icons for offline viewing                          |
| **Markdown ZIP**     | `markdown`  | ZIP containing Markdown + embedded SVG                                       |
| **JSON (Enriched)**  | `enrich`    | Original JSON + computed metadata (positions, sizes)                         |
| **JSON (Meta only)** | `meta`      | Metadata only for AI consumption                                             |

## Installation

```bash
# Using Bun
bun add gospelo-architect

# Using npm
npm install gospelo-architect
```

## Quick Start

Just describe what you want to the AI:

```
Create an AWS architecture diagram with API Gateway, Lambda, and DynamoDB
```

```
Add an S3 bucket for static assets to the diagram
```

```
Connect the Lambda function to the S3 bucket
```

```
Export the diagram as HTML for A4 landscape printing
```

The AI handles all the technical details - JSON definitions, positioning, connections, and rendering.

## Diagram Definition

For JSON schema details, see [Gospelo Model 1.0 Specification](docs/specs/1.0/GOSPELO_MODEL.md).

## What You Can Ask

### Creating Diagrams

```
Create a serverless architecture with AWS Lambda, API Gateway, and DynamoDB
```

```
Design a microservices architecture with 3 services and a message queue
```

```
Show me a typical web application stack with load balancer, app servers, and database
```

### Modifying Diagrams

```
Add a caching layer between the API and database
```

```
Remove the legacy service from the diagram
```

```
Move the Lambda function below the API Gateway
```

### Exporting

```
Export as HTML for printing on A4 paper
```

```
Generate an SVG file for the documentation
```

```
Create a 4K version for the presentation
```

For CLI command details, see [CLI Reference](docs/references/CLI_REFERENCE.md).

## Print & Export Options

Diagrams can be exported in various sizes for different purposes:

| Use Case        | Example Prompt                          |
| --------------- | --------------------------------------- |
| Office printing | "Export for A4 landscape printing"      |
| Presentation    | "Create an A3 version for the meeting"  |
| Large display   | "Generate a 4K version for the monitor" |
| Poster          | "Export as B2 portrait for printing"    |

### High-DPI Display Support

Diagrams look **sharp and crisp** on any screen - MacBook Retina, iPhone, 4K/8K monitors. Zoom in without blur.

See [Print Settings Reference](docs/references/PRINT_SETTINGS.md) for detailed documentation.

## Iterative Editing

The AI supports natural iterative editing:

```
Add a Redis cache between Lambda and DynamoDB
```

```
Change the Lambda label to "Order Processor"
```

```
Connect the new cache to both services with bidirectional arrows
```

For programmatic editing, see [CLI Reference](docs/references/CLI_REFERENCE.md).

## Icon Reference

<a href="https://architect.gospelo.dev/icons/v1/"><img src="https://architect.gospelo.dev/icons/v1/og-image.png" alt="" onerror="this.style.display='none'"></a>

Icons use the format `provider:name` (e.g., `aws:lambda`, `azure:functions`, `gcp:cloud_run`, `heroicons:star`).

Over 3,500 icons available across AWS, Azure, Google Cloud, Tech Stack, Heroicons, and Lucide providers.

Browse all icons: [GOSPELO ICONS](https://architect.gospelo.dev/icons/v1/)

## Node Types

| Type               | Description                       |
| ------------------ | --------------------------------- |
| `icon`             | Single icon with label (default)  |
| `group`            | Container for child nodes         |
| `composite`        | Multiple icons in a single node   |
| `text_box`         | Text-only node (no icon required) |
| `person`           | Person icon                       |
| `person_pc_mobile` | Person with PC and mobile         |
| `pc_mobile`        | PC and mobile devices             |
| `pc`               | PC device                         |

## Connection Types

| Type   | Description                       |
| ------ | --------------------------------- |
| `data` | Data flow (solid line with arrow) |
| `auth` | Authentication flow (dashed line) |

## Web Claude Setup

To use gospelo-architect with Web Claude, add the following domains to **Capabilities > Additional allowed domains**:

```
raw.githubusercontent.com
cdn.jsdelivr.net
architect.gospelo.dev
w3.org
```

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
