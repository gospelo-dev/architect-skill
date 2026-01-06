# Gospelo Architect

**You describe. AI designs. Diagrams appear.**

A new paradigm for creating system architecture diagrams: humans provide intent, AI agents handle design and layout. No manual dragging, no pixel adjustments - just describe what you want and let the AI do the rest.

Built for the AI Agent era. While traditional diagramming tools require humans to manually place icons and draw lines, gospelo-architect is designed from the ground up for AI agents to operate autonomously - reading JSON definitions, generating professional diagrams, and iterating based on human feedback.

## Why Gospelo Architect?

- **AI-Native Design**: JSON-based definitions that AI agents can read, write, and modify
- **Iterative Workflow**: Describe changes in natural language, AI updates the diagram
- **Professional Output**: Production-ready SVG and HTML with 1,500+ cloud icons
- **Fine-Tuning When Needed**: Visual editor available for precise adjustments when required

## Features

- **Zero Dependencies**: Pure TypeScript with no external runtime dependencies
- **Multiple Output Formats**: SVG, HTML, Markdown+SVG ZIP, enriched JSON with metadata
- **Incremental Editing**: Fluent builder API for programmatic diagram modifications
- **Cloud Icons**: Built-in support for AWS, Azure, Google Cloud, and Tech Stack icons (3,500+ icons)
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

| ID  | Difficulty | Architecture                   | Use Cases                                    | Prompt Example                                                                                                                                                                                                                                         |
| :-: | :--------: | ------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|  1  |     ★      | Serverless REST API            | E-commerce API, Mobile BFF                   | `Create an API Gateway routing to multiple Lambda functions (User API, Order API, Product API), each accessing DynamoDB, with CloudWatch Logs for log collection`                                                                                      |
|  2  |     ★      | Typical Web App                | Internal Portal, CMS                         | `Create an ALB distributing to multiple EC2 instances, connecting to RDS (primary and read replica) and ElastiCache, with CloudWatch for metrics monitoring`                                                                                           |
|  3  |     ★      | Container App                  | SaaS Backend, API Server                     | `Design an ALB distributing to multiple ECS Fargate tasks, connecting to RDS Aurora and Secrets Manager, with CloudWatch Container Insights for monitoring`                                                                                            |
|  4  |     ★★     | Authenticated API              | Membership Service, User Portal              | `Create a Cognito-authenticated API Gateway routing to multiple Lambda functions, accessing DynamoDB and S3, with CloudWatch for logs and metrics`                                                                                                     |
|  5  |     ★★     | Async Message Processing       | Order Processing, Notification Delivery      | `Create API Gateway → Lambda → SNS → fan-out to multiple SQS queues, each processed by separate Lambda functions, with DLQ for error handling and CloudWatch for queue monitoring`                                                                     |
|  6  |     ★★     | Workflow Orchestration         | Approval Flow, Batch Processing              | `Design EventBridge triggering Step Functions, executing multiple Lambda functions in parallel, saving to DynamoDB and notifying via SNS on success, falling back to SQS on failure`                                                                   |
|  7  |     ★★     | Caching                        | Product Search, Ranking Display              | `Create API Gateway → Lambda → ElastiCache (return immediately on cache hit), on cache miss fetch from RDS and write to ElastiCache, with CloudWatch monitoring hit rate`                                                                              |
|  8  |     ★★     | Data Lake                      | Log Analytics, BI Dashboard                  | `Create S3 data ingestion → Glue Crawler for cataloging → query from both Athena and QuickSight, Glue ETL transforming to another S3, with CloudWatch for job monitoring`                                                                              |
|  9  |     ★★     | Streaming Processing           | Clickstream Analytics, Real-time Aggregation | `Create Kinesis Data Streams → Lambda for transformation → output to both DynamoDB and S3, Kinesis Data Analytics for aggregation, CloudWatch for stream monitoring with SNS alerts`                                                                   |
| 10  |     ★★     | CI/CD Pipeline                 | Auto Deploy, Continuous Delivery             | `Design CodeCommit → CodeBuild (parallel test, build, security scan) → push to ECR → CodePipeline with approval gate → deploy to ECS, SNS notification on failure`                                                                                     |
| 11  |    ★★★     | Real-time IoT Analytics        | Smart Factory, Vehicle Telematics            | `Create IoT Core → Kinesis Data Streams → Lambda for transformation, saving to both Timestream and S3, Grafana for real-time visualization, CloudWatch for device monitoring with SNS alerts`                                                          |
| 12  |    ★★★     | Multi-Region Disaster Recovery | Global E-commerce, Financial Systems         | `Create Route 53 routing to multiple regions, each region with CloudFront → ALB → ECS Fargate, Aurora Global Database for replication, CloudWatch for health checks with SNS failover notification`                                                    |
| 13  |    ★★★     | Microservices + Event-Driven   | E-commerce Platform, Reservation System      | `Design API Gateway → multiple Lambda microservices, each writing to DynamoDB → DynamoDB Streams → EventBridge → routing to other services, SQS for async processing, X-Ray for distributed tracing`                                                   |
| 14  |    ★★★     | Zero-Trust Security            | AI Chatbot, Internal LLM                     | `Create WAF → CloudFront → Cognito authentication → API Gateway → Lambda in VPC, fetching credentials from Secrets Manager, accessing Bedrock and DynamoDB via VPC Endpoints, CloudTrail for audit logging`                                            |
| 15  |    ★★★     | Event Sourcing + CQRS          | Inventory Management, Transaction History    | `Design API Gateway for writes → Lambda → Kinesis → event store Lambda → DynamoDB, DynamoDB Streams → read model updater Lambda → ElastiCache, separate API Gateway for reads → read-only Lambda querying cache`                                       |
| 16  |    ★★★     | ML Pipeline with Branching     | Recommendations, Sentiment Analysis          | `Create S3 upload → Lambda preprocessing → Step Functions running SageMaker training and Comprehend analysis in parallel, results aggregated to S3, Athena querying both outputs, CloudWatch for pipeline monitoring with SNS completion notification` |

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
