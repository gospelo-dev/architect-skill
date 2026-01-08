# Gospelo Model Specification 1.0

## Editors

- Gorosun (NoStudio LLC)

## Abstract

gospelo is a JSON-based format for describing visual diagrams, flowcharts, sequence diagrams, and other structured visual representations. The format is designed to be:

- **AI-native**: Easily read and written by AI agents
- **Extensible**: Support arbitrary extensions without breaking compatibility
- **Platform-agnostic**: Renderable across different platforms and tools
- **Human-readable**: Clear JSON structure for debugging and manual editing

## Status of this Document

This is the 1.0 specification of gospelo.

## Table of Contents

1. [Introduction](#1-introduction)
2. [Design Goals](#2-design-goals)
3. [File Extensions and MIME Types](#3-file-extensions-and-mime-types)
4. [JSON Structure](#4-json-structure)
5. [Asset](#5-asset)
6. [Documents](#6-documents)
7. [Resources](#7-resources)
8. [Nodes](#8-nodes)
9. [Connections](#9-connections)
10. [Extensions](#10-extensions)
11. [Schema Reference](#11-schema-reference)

---

## 1. Introduction

### 1.1 Motivation

Modern software development increasingly relies on visual diagrams for:

- System architecture documentation
- API flow visualization
- Infrastructure as diagrams
- Sequence and state diagrams

gospelo provides a standardized format that AI agents can generate, modify, and interpret, while remaining human-readable and version-control friendly.

### 1.2 Scope

This specification defines:

- The JSON structure for gospelo documents
- Core document types (diagram, flowchart, sequence)
- Resource mechanism for reusable icon definitions
- Extension mechanism for custom functionality
- Validation rules and constraints

### 1.3 Conventions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

---

## 2. Design Goals

### 2.1 AI-Native Design

gospelo is designed for AI agents to:

- Generate complete diagrams from natural language
- Incrementally modify existing diagrams
- Understand diagram semantics through structured data

### 2.2 Extensibility

- All objects support `extensions` and `extras` properties
- Extensions can add new capabilities without breaking compatibility
- Vendor-specific extensions are supported alongside standard extensions

### 2.3 Minimal Core

The core specification defines only essential features:

- Basic node types (icon, group, text)
- Connection types
- Layout hints
- Resource definitions

Advanced features (animations, interactivity, custom renderers) are provided through extensions.

---

## 3. File Extensions and MIME Types

### 3.1 File Extensions

| Extension       | Description                |
| --------------- | -------------------------- |
| `.gospelo`      | gospelo JSON document      |
| `.gospelo.json` | Alternative JSON extension |

### 3.2 MIME Types

| MIME Type                  | Description           |
| -------------------------- | --------------------- |
| `application/gospelo+json` | gospelo JSON document |

---

## 4. JSON Structure

### 4.1 Overview

A gospelo document is a JSON object with the following structure:

```json
{
  "asset": { ... },
  "extensionsUsed": [ ... ],
  "extensionsRequired": [ ... ],
  "documents": [ ... ],
  "extensions": { ... },
  "extras": { ... }
}
```

### 4.2 Root Properties

| Property             | Type     | Required | Description                                        |
| -------------------- | -------- | -------- | -------------------------------------------------- |
| `asset`              | object   | **Yes**  | Metadata about the gospelo document                |
| `extensionsUsed`     | string[] | No       | Names of extensions used in this document          |
| `extensionsRequired` | string[] | No       | Names of extensions required to load this document |
| `documents`          | object[] | No       | Array of document definitions                      |
| `extensions`         | object   | No       | Extension-specific data                            |
| `extras`             | any      | No       | Application-specific data                          |

### 4.3 Property Naming

The canonical property naming convention is **camelCase**.

However, implementations MAY accept **snake_case** as an alternative input format for convenience (e.g., `border_color` instead of `borderColor`). When both formats are supported, the implementation SHOULD convert snake_case to camelCase internally.

| Canonical (camelCase) | Alternative (snake_case) |
| --------------------- | ------------------------ |
| `borderColor`         | `border_color`           |
| `startColor`          | `start_color`            |
| `endColor`            | `end_color`              |
| `labelPosition`       | `label_position`         |
| `parentId`            | `parent_id`              |
| `fromSide`            | `from_side`              |
| `toSide`              | `to_side`                |
| `groupIcon`           | `group_icon`             |
| `iconSize`            | `icon_size`              |
| `fontSize`            | `font_size`              |

---

## 5. Asset

### 5.1 Overview

The `asset` property contains metadata about the gospelo document.

```json
{
  "asset": {
    "version": "1.0",
    "generator": "gospelo-architect@0.1.0",
    "copyright": "2025 Example Corp",
    "minVersion": "1.0"
  }
}
```

### 5.2 Properties

| Property     | Type   | Required | Description                                 |
| ------------ | ------ | -------- | ------------------------------------------- |
| `version`    | string | **Yes**  | gospelo specification version (e.g., "1.0") |
| `generator`  | string | No       | Tool that generated this document           |
| `copyright`  | string | No       | Copyright message for content attribution   |
| `minVersion` | string | No       | Minimum gospelo version required            |
| `extensions` | object | No       | Extension-specific data                     |
| `extras`     | any    | No       | Application-specific data                   |

### 5.3 Version Format

The version string MUST follow the pattern `<major>.<minor>`:

- `major`: Major version number (integer)
- `minor`: Minor version number (integer)

Example: `"1.0"`, `"2.1"`

---

## 6. Documents

### 6.1 Overview

The `documents` array contains one or more visual document definitions. Each document has a `type` that determines its structure.

```json
{
  "documents": [
    {
      "type": "diagram",
      "title": "System Architecture",
      "resources": { ... },
      "nodes": [ ... ],
      "connections": [ ... ]
    }
  ]
}
```

### 6.2 Document Types

| Type        | Description                                  |
| ----------- | -------------------------------------------- |
| `diagram`   | General-purpose node-and-connection diagram  |
| `flowchart` | Flowchart with decision nodes and flow logic |
| `sequence`  | Sequence diagram with actors and messages    |

### 6.3 Common Document Properties

All document types share these properties:

| Property     | Type       | Required | Description               |
| ------------ | ---------- | -------- | ------------------------- |
| `type`       | string     | **Yes**  | Document type identifier  |
| `title`      | string     | No       | Document title            |
| `subtitle`   | string     | No       | Document subtitle         |
| `background` | Background | No       | Background configuration  |
| `metadata`   | object     | No       | Custom metadata           |
| `extensions` | object     | No       | Extension-specific data   |
| `extras`     | any        | No       | Application-specific data |

### 6.4 Diagram Document

The `diagram` type defines a node-and-connection diagram:

```json
{
  "type": "diagram",
  "title": "AWS Architecture",
  "resources": {
    "@api": { "icon": "aws:api_gateway", "desc": "REST API endpoint" },
    "@lambda": { "icon": "aws:lambda", "desc": "Business logic" }
  },
  "nodes": [
    { "id": "@api", "label": "API Gateway", "position": [100, 100] },
    { "id": "@lambda", "label": "Lambda", "position": [300, 100] }
  ],
  "connections": [{ "from": "@api", "to": "@lambda" }]
}
```

#### 6.4.1 Diagram Properties

| Property      | Type          | Required | Description                                         |
| ------------- | ------------- | -------- | --------------------------------------------------- |
| `type`        | `"diagram"`   | **Yes**  | Document type                                       |
| `resources`   | ResourceMap   | No       | Reusable resource definitions                       |
| `nodes`       | Node[]        | **Yes**  | Array of node definitions                           |
| `connections` | Connection[]  | No       | Array of connection definitions                     |
| `colors`      | ColorMap      | No       | Named color definitions                             |
| `render`      | RenderOptions | No       | Rendering hints (width, height, iconSize, fontSize) |

---

## 7. Resources

### 7.1 Overview

Resources provide a mechanism for defining reusable icon and metadata definitions that can be referenced by node IDs. This promotes consistency and reduces duplication.

```json
{
  "resources": {
    "@api": { "icon": "aws:api_gateway", "desc": "Main API endpoint" },
    "@lambda": { "icon": "aws:lambda", "desc": "Business logic handler" },
    "@db": { "icon": "aws:dynamodb", "desc": "Data storage" }
  }
}
```

### 7.2 Resource Properties

| Property | Type   | Required | Description                            |
| -------- | ------ | -------- | -------------------------------------- |
| `icon`   | string | No       | Icon identifier (e.g., `"aws:lambda"`) |
| `desc`   | string | No       | Description of the resource's role     |

**Note**: The `icon` property is optional. Resources without icons are used for composite nodes or other non-icon node types that still need to be tracked as resources.

### 7.3 ID Convention

Resource IDs MUST start with `@` prefix for unique identification by AI:

```json
{
  "resources": {
    "@api": { "icon": "aws:api_gateway" },
    "@db": { "icon": "aws:dynamodb" }
  },
  "nodes": [
    { "id": "@api", "label": "API Gateway" },
    { "id": "@db", "label": "Database" }
  ]
}
```

### 7.4 Icon Resolution

When rendering a node, icons are resolved in this order:

1. Node's explicit `icon` property (highest priority)
2. Resource's `icon` property (if node ID matches a resource key)
3. `undefined` (no icon)

```json
{
  "resources": {
    "@api": { "icon": "aws:api_gateway" }
  },
  "nodes": [{ "id": "@api", "icon": "aws:lambda" }]
}
```

Result: Node uses `aws:lambda` (explicit) instead of `aws:api_gateway` (resource).

### 7.5 Validation Rules

- **All nodes MUST have a corresponding resource entry** (for unique identification)
- Each resource ID MUST be used by at most one node
- Resource `icon` is required for icon-type nodes, optional for text_box/group/label nodes

---

## 8. Nodes

### 8.1 Overview

Nodes are the fundamental building blocks of diagrams.

### 8.2 Common Node Properties

| Property      | Type             | Required | Description                                                  |
| ------------- | ---------------- | -------- | ------------------------------------------------------------ |
| `id`          | string           | **Yes**  | Unique identifier (MUST start with `@` and match a resource) |
| `type`        | NodeType         | No       | Node type (default: `"icon"`)                                |
| `label`       | string           | No       | Primary label text                                           |
| `sublabel`    | string           | No       | Secondary label text                                         |
| `position`    | [number, number] | No       | [x, y] position                                              |
| `size`        | [number, number] | No       | [width, height] size                                         |
| `parentId`    | string           | No       | Parent node ID (required for children of group nodes)        |
| `borderColor` | string           | No       | Border color (hex code or color name)                        |
| `extensions`  | object           | No       | Extension-specific data                                      |
| `extras`      | any              | No       | Application-specific data                                    |

### 8.3 Node Types

#### 8.3.1 Icon Node

```json
{
  "id": "@lambda",
  "type": "icon",
  "icon": "aws:lambda",
  "label": "Lambda"
}
```

| Property | Type   | Description                            |
| -------- | ------ | -------------------------------------- |
| `icon`   | string | Icon identifier (e.g., `"aws:lambda"`) |

#### 8.3.2 Group Node

```json
{
  "id": "vpc",
  "type": "group",
  "label": "VPC",
  "borderColor": "blue",
  "layout": "horizontal",
  "labelPosition": "top-center",
  "children": [{ "id": "@subnet1", "icon": "aws:subnet", "parentId": "vpc" }]
}
```

| Property        | Type                           | Description                                                      |
| --------------- | ------------------------------ | ---------------------------------------------------------------- |
| `children`      | Node[]                         | Child nodes (each MUST have `parentId` set to this group's `id`) |
| `layout`        | `"horizontal"` \| `"vertical"` | Child layout direction                                           |
| `labelPosition` | LabelPosition                  | Label placement                                                  |
| `borderColor`   | string                         | Border color (hex code or color name from `colors` map)          |
| `groupIcon`     | string                         | Optional icon for the group header                               |

**Note**: Child nodes within a group MUST specify `parentId` referencing the parent group's `id`.

#### 8.3.3 Composite Node

```json
{
  "id": "server",
  "type": "composite",
  "label": "Application Server",
  "icons": [
    { "id": "java", "icon": "tech:java" },
    { "id": "spring", "icon": "tech:spring" }
  ]
}
```

| Property | Type      | Description              |
| -------- | --------- | ------------------------ |
| `icons`  | IconRef[] | Array of icon references |

#### 8.3.4 Text Box Node

```json
{
  "id": "note1",
  "type": "text_box",
  "label": "Important Note",
  "sublabel": "This component handles authentication"
}
```

#### 8.3.5 Label Node

```json
{
  "id": "title",
  "type": "label",
  "label": "Production Environment"
}
```

#### 8.3.6 Person Nodes

```json
{
  "id": "user",
  "type": "person",
  "label": "End User"
}
```

Available person types: `person`, `person_pc_mobile`, `pc_mobile`, `pc`

---

## 9. Connections

### 9.1 Overview

Connections define relationships between nodes.

```json
{
  "from": "@api",
  "to": "@database",
  "type": "data",
  "label": "SQL Queries"
}
```

### 9.2 Connection Properties

| Property        | Type            | Required | Default        | Description               |
| --------------- | --------------- | -------- | -------------- | ------------------------- |
| `from`          | string          | **Yes**  | -              | Source node ID            |
| `to`            | string          | **Yes**  | -              | Target node ID            |
| `type`          | ConnectionType  | No       | `"data"`       | Connection type           |
| `label`         | string          | No       | `""`           | Connection label          |
| `style`         | ConnectionStyle | No       | `"orthogonal"` | Line style                |
| `color`         | string          | No       | -              | Line color                |
| `width`         | number          | No       | `2`            | Line width                |
| `bidirectional` | boolean         | No       | `false`        | Two-way connection        |
| `fromSide`      | AnchorSide      | No       | auto           | Exit side                 |
| `toSide`        | AnchorSide      | No       | auto           | Entry side                |
| `extensions`    | object          | No       | -              | Extension-specific data   |
| `extras`        | any             | No       | -              | Application-specific data |

### 9.3 Connection Types

| Type   | Description                       |
| ------ | --------------------------------- |
| `data` | Data flow connection              |
| `auth` | Authentication/authorization flow |
| `flow` | General control flow              |

### 9.4 Connection Styles

| Style        | Description       |
| ------------ | ----------------- |
| `solid`      | Solid line        |
| `dashed`     | Dashed line       |
| `dotted`     | Dotted line       |
| `orthogonal` | Right-angle paths |
| `curved`     | Curved paths      |

---

## 10. Extensions

### 10.1 Overview

gospelo supports extensions for adding functionality beyond the core specification.

### 10.2 Extension Naming

Extensions follow this naming convention:

| Prefix      | Description             | Example             |
| ----------- | ----------------------- | ------------------- |
| `GOSPELO_`  | Official extensions     | `GOSPELO_animation` |
| `EXT_`      | Multi-vendor extensions | `EXT_interactive`   |
| `<VENDOR>_` | Vendor-specific         | `ACME_custom_nodes` |

### 10.3 Using Extensions

```json
{
  "asset": { "version": "1.0" },
  "extensionsUsed": ["GOSPELO_animation", "EXT_interactive"],
  "extensionsRequired": ["GOSPELO_animation"],
  "documents": [
    {
      "type": "diagram",
      "nodes": [
        {
          "id": "node1",
          "extensions": {
            "GOSPELO_animation": {
              "entrance": "fadeIn",
              "duration": 500
            }
          }
        }
      ]
    }
  ]
}
```

### 10.4 Extensions vs Extras

| Feature          | Extensions                  | Extras                    |
| ---------------- | --------------------------- | ------------------------- |
| Purpose          | Standardized functionality  | Application-specific data |
| Schema           | Defined by extension spec   | Any valid JSON            |
| Interoperability | Cross-tool support expected | Tool-specific             |

### 10.5 Fallback Behavior

When a loader encounters an unknown extension:

- If in `extensionsRequired`: MUST fail to load
- If only in `extensionsUsed`: SHOULD ignore and continue

---

## 11. Schema Reference

### 11.1 Type Definitions

#### NodeType

```
"icon" | "group" | "composite" | "text_box" | "label" |
"person" | "person_pc_mobile" | "pc_mobile" | "pc"
```

#### ConnectionType

```
"data" | "auth" | "flow"
```

#### ConnectionStyle

```
"solid" | "dashed" | "dotted" | "orthogonal" | "curved"
```

#### AnchorSide

```
"top" | "bottom" | "left" | "right"
```

#### LabelPosition

```
"top-center" | "top-left" | "inside-top-left"
```

#### LayoutDirection

```
"horizontal" | "vertical"
```

#### BackgroundType

```
"white" | "solid" | "gradient"
```

#### GradientDirection

```
"south" | "east" | "north" | "west"
```

### 11.2 Object Schemas

#### Background

For `type: "white"`:

```json
{
  "type": "white"
}
```

For `type: "solid"`:

```json
{
  "type": "solid",
  "color": "#f5f5f5"
}
```

For `type: "gradient"`:

```json
{
  "type": "gradient",
  "startColor": "#ffffff",
  "endColor": "#f0f0f0",
  "direction": "south"
}
```

| Property     | Type              | Required | Description                                |
| ------------ | ----------------- | -------- | ------------------------------------------ |
| `type`       | BackgroundType    | **Yes**  | Background type                            |
| `color`      | string            | No       | Solid color (for `solid` type)             |
| `startColor` | string            | No       | Gradient start color (for `gradient` type) |
| `endColor`   | string            | No       | Gradient end color (for `gradient` type)   |
| `direction`  | GradientDirection | No       | Gradient direction (default: `"south"`)    |

#### Resource

```json
{
  "icon": "aws:lambda",
  "desc": "Business logic handler"
}
```

| Property | Type   | Required | Description                 |
| -------- | ------ | -------- | --------------------------- |
| `icon`   | string | **Yes**  | Icon identifier             |
| `desc`   | string | No       | Description of the resource |

#### IconRef

```json
{
  "id": "icon1",
  "icon": "aws:lambda",
  "label": "Optional Label"
}
```

#### RenderOptions

Rendering hints for the document.

```json
{
  "width": 1280,
  "height": 720,
  "iconSize": 48,
  "fontSize": 11
}
```

| Property   | Type   | Default | Description                 |
| ---------- | ------ | ------- | --------------------------- |
| `width`    | number | 1280    | Canvas width in pixels      |
| `height`   | number | 720     | Canvas height in pixels     |
| `iconSize` | number | 48      | Default icon size in pixels |
| `fontSize` | number | 11      | Default font size in pixels |

#### ColorMap

```json
{
  "primary": "#0073BB",
  "secondary": "#FF9900"
}
```

### 11.3 Default Colors

The following colors are provided by default:

| Name     | Value     |
| -------- | --------- |
| `blue`   | `#0073BB` |
| `orange` | `#FF9900` |
| `dark`   | `#232F3E` |
| `gray`   | `#666666` |

---

## License

This specification is licensed under the [Creative Commons Attribution 4.0 International License (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

You are free to:

- **Share** - copy and redistribute the material in any medium or format
- **Adapt** - remix, transform, and build upon the material for any purpose, even commercially

Under the following terms:

- **Attribution** - You must give appropriate credit, provide a link to the license, and indicate if changes were made.

---

## Acknowledgments

- All contributors to the gospelo project

---

**gospelo** is a trademark of the gospelo project.
