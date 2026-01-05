# Gospelo JSON Schema Reference

Based on Gospelo Model Specification 1.0.

## TypeScript Type Definitions

```typescript
// === Core Types ===
type NodeType = "icon" | "group" | "composite" | "text_box" | "label"
              | "person" | "person_pc_mobile" | "pc_mobile" | "pc";
type ConnectionType = "data" | "auth" | "flow";
type ConnectionStyle = "solid" | "dashed" | "dotted" | "orthogonal" | "curved";
type AnchorSide = "top" | "bottom" | "left" | "right";
type LabelPosition = "top-center" | "top-left" | "inside-top-left";
type BackgroundType = "white" | "solid" | "gradient";
type GradientDirection = "south" | "east" | "north" | "west";

// === Diagram Definition ===
interface DiagramDefinition {
  title?: string;
  subtitle?: string;
  background?: Background;
  resources: Record<string, Resource>;   // Required. Keys must start with "@"
  nodes: Node[];
  connections?: Connection[];
  colors?: Record<string, string>;
  render?: RenderOptions;
}

// === Resource ===
// All nodes MUST have a corresponding resource entry for unique identification
interface Resource {
  icon?: string;  // Required for icon-type nodes, optional for text_box/group/label
  desc?: string;  // Optional description for AI context
}

// === Node ===
interface Node {
  id: string;                      // Required: must match a resource ID (with "@" prefix)
  type?: NodeType;                 // Default: "icon"
  icon?: string;                   // Icon override (normally resolved from resource)
  label?: string;                  // Primary label
  sublabel?: string;               // Secondary label
  position?: [number, number];     // [x, y]
  size?: [number, number];         // [width, height]
  parentId?: string;               // Parent group ID (required for children)
  borderColor?: string;            // Border color
}

// Group-specific properties (when type: "group")
interface GroupNode extends Node {
  type: "group";
  children?: Node[];               // Child nodes
  layout?: "horizontal" | "vertical";
  labelPosition?: LabelPosition;
  groupIcon?: string;
}

// Composite-specific properties (when type: "composite")
interface CompositeNode extends Node {
  type: "composite";
  icons: Array<{ id: string; icon?: string; label?: string }>;  // icon resolved from resources if omitted
}

// === Connection ===
interface Connection {
  from: string;                    // Required: source node ID
  to: string;                      // Required: target node ID
  type?: ConnectionType;           // Default: "data"
  label?: string;
  style?: ConnectionStyle;         // Default: "orthogonal"
  color?: string;
  width?: number;                  // Default: 2
  bidirectional?: boolean;         // Default: false
  fromSide?: AnchorSide;           // Auto-calculated if omitted
  toSide?: AnchorSide;             // Auto-calculated if omitted
}

// === Background ===
type Background =
  | { type: "white" }
  | { type: "solid"; color: string }
  | { type: "gradient"; startColor?: string; endColor?: string; direction?: GradientDirection };

// === Render Options ===
interface RenderOptions {
  width?: number;    // Default: 1200
  height?: number;   // Default: 800
  iconSize?: number; // Default: 48
  fontSize?: number; // Default: 11
}
```

## Icon Providers

| Provider | Prefix   | Examples                                    |
| -------- | -------- | ------------------------------------------- |
| AWS      | `aws:`   | `aws:lambda`, `aws:s3`, `aws:api_gateway`   |
| Azure    | `azure:` | `azure:functions`, `azure:blob_storage`     |
| GCP      | `gcp:`   | `gcp:cloud_functions`, `gcp:cloud_storage`  |
| Tech     | `tech:`  | `tech:python`, `tech:react`, `tech:docker`  |

## Default Colors

| Name     | Value     |
| -------- | --------- |
| `blue`   | `#0073BB` |
| `orange` | `#FF9900` |
| `dark`   | `#232F3E` |
| `gray`   | `#666666` |

## Property Naming

Both camelCase and snake_case are accepted:
`borderColor` = `border_color`, `startColor` = `start_color`, `parentId` = `parent_id`

## Examples

### Basic Diagram

```json
{
  "title": "Serverless API",
  "resources": {
    "@api": { "icon": "aws:api_gateway", "desc": "REST API" },
    "@fn": { "icon": "aws:lambda", "desc": "Handler" },
    "@db": { "icon": "aws:dynamodb", "desc": "Database" }
  },
  "render": { "width": 700, "height": 400 },
  "nodes": [
    { "id": "@api", "label": "API Gateway", "position": [100, 200] },
    { "id": "@fn", "label": "Lambda", "position": [300, 200] },
    { "id": "@db", "label": "DynamoDB", "position": [500, 200] }
  ],
  "connections": [
    { "from": "@api", "to": "@fn" },
    { "from": "@fn", "to": "@db", "bidirectional": true }
  ]
}
```

### With Group

```json
{
  "resources": {
    "@vpc": { "desc": "Virtual Private Cloud" },
    "@ec2": { "icon": "aws:ec2", "desc": "Web server" }
  },
  "nodes": [
    {
      "id": "@vpc",
      "type": "group",
      "label": "VPC",
      "borderColor": "blue",
      "position": [50, 50],
      "size": [400, 200],
      "children": [
        { "id": "@ec2", "label": "EC2", "parentId": "@vpc", "position": [100, 100] }
      ]
    }
  ]
}
```

### With text_box (no icon)

```json
{
  "resources": {
    "@group": { "icon": "aws:bedrock", "desc": "AI Models" },
    "@model_a": { "desc": "Claude 4 Sonnet" },
    "@model_b": { "desc": "Claude 3.5 Haiku" }
  },
  "nodes": [
    {
      "id": "@group",
      "type": "group",
      "label": "AI Models",
      "position": [50, 50],
      "size": [300, 150],
      "children": [
        { "id": "@model_a", "type": "text_box", "label": "Claude 4", "sublabel": "Sonnet", "parentId": "@group", "position": [50, 50] },
        { "id": "@model_b", "type": "text_box", "label": "Claude 3.5", "sublabel": "Haiku", "parentId": "@group", "position": [150, 50] }
      ]
    }
  ]
}
```
