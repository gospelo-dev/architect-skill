# Builder Specification

This document describes the DiagramBuilder API for fluent diagram manipulation.

## Overview

The `DiagramBuilder` class (`src/core/builder.ts`) provides a fluent interface for creating and modifying diagrams incrementally.

## Initialization

```typescript
import { DiagramBuilder, createBuilder } from 'gospelo-architect';

// From scratch
const builder = new DiagramBuilder();

// From existing diagram
const builder = new DiagramBuilder(existingDiagram);

// From JSON string
const builder = new DiagramBuilder(jsonString);

// Using factory function
const builder = createBuilder(base);
```

## API Reference

### Metadata Operations

#### setTitle(title: string)

```typescript
builder.setTitle('My Diagram');
```

#### setSubtitle(subtitle: string)

```typescript
builder.setSubtitle('Version 1.0');
```

#### setBackground(background: Background)

```typescript
builder.setBackground({
  type: 'gradient',
  startColor: '#ffffff',
  endColor: '#f0f0f0',
  direction: 'south'
});
```

#### setColor(name: string, value: string)

```typescript
builder.setColor('primary', '#0073BB');
```

#### setRender(render: Partial<RenderOptions>)

```typescript
builder.setRender({ width: 1200, height: 800 });
```

#### getRender(): RenderOptions | undefined

```typescript
const render = builder.getRender();
console.log(render?.width); // 1200
```

### Node Operations

#### addNode(input: NodeInput)

```typescript
builder.addNode({
  id: '@lambda',
  icon: 'aws:lambda',
  label: 'Lambda Function',
  position: [100, 100]
});
```

#### addNodes(inputs: NodeInput[])

```typescript
builder.addNodes([
  { id: '@api', icon: 'aws:api_gateway', position: [100, 100] },
  { id: '@lambda', icon: 'aws:lambda', position: [300, 100] }
]);
```

#### updateNode(id: string, update: NodeUpdate)

```typescript
builder.updateNode('@lambda', {
  label: 'Updated Lambda',
  sublabel: 'Python 3.9'
});
```

#### moveNode(id: string, position: [number, number])

```typescript
builder.moveNode('@lambda', [500, 300]);
```

#### resizeNode(id: string, size: [number, number])

```typescript
builder.resizeNode('@lambda', [80, 80]);
```

#### setNodeIcon(id: string, icon: string)

```typescript
builder.setNodeIcon('@lambda', 'aws:dynamodb');
```

#### setNodeLabel(id: string, label: string, sublabel?: string)

```typescript
builder.setNodeLabel('@lambda', 'My Lambda', 'v1.0');
```

#### removeNode(id: string)

Removes the node and all connections to/from it.

```typescript
builder.removeNode('@old_node');
```

#### hasNode(id: string): boolean

```typescript
if (builder.hasNode('@lambda')) {
  // Node exists
}
```

#### getNode(id: string): Node | undefined

```typescript
const node = builder.getNode('@lambda');
console.log(node?.label);
```

### Positional Insert Operations

#### insertAbove(refNodeId: string, input: NodeInput, offsetY?: number)

Insert a node above (Y-direction) a reference node.

```typescript
builder.insertAbove('@lambda', { id: '@new', icon: 'aws:s3' });
// Default offset: 100px
```

#### insertBelow(refNodeId: string, input: NodeInput, offsetY?: number)

```typescript
builder.insertBelow('@lambda', { id: '@new', icon: 'aws:s3' }, 150);
```

#### insertLeft(refNodeId: string, input: NodeInput, offsetX?: number)

```typescript
builder.insertLeft('@lambda', { id: '@new', icon: 'aws:s3' });
// Default offset: 150px
```

#### insertRight(refNodeId: string, input: NodeInput, offsetX?: number)

```typescript
builder.insertRight('@lambda', { id: '@new', icon: 'aws:s3' });
```

### Alignment Operations

#### alignTop(refNodeId: string, nodeIds: string[])

Align nodes to match the Y position (top) of a reference node.

```typescript
builder.alignTop('@ref', ['@node1', '@node2']);
```

#### alignLeft(refNodeId: string, nodeIds: string[])

Align nodes to match the X position (left) of a reference node.

```typescript
builder.alignLeft('@ref', ['@node1', '@node2']);
```

#### alignCenterY(refNodeId: string, nodeIds: string[])

Align nodes to match the vertical center of a reference node.

```typescript
builder.alignCenterY('@ref', ['@node1', '@node2']);
```

#### alignCenterX(refNodeId: string, nodeIds: string[])

Align nodes to match the horizontal center of a reference node.

```typescript
builder.alignCenterX('@ref', ['@node1', '@node2']);
```

### Distribution Operations

#### distributeHorizontally(nodeIds: string[], spacing?: number)

Distribute nodes with equal horizontal spacing.

```typescript
builder.distributeHorizontally(['@a', '@b', '@c'], 150);
// Default spacing: 150px
```

#### distributeVertically(nodeIds: string[], spacing?: number)

Distribute nodes with equal vertical spacing.

```typescript
builder.distributeVertically(['@a', '@b', '@c'], 100);
// Default spacing: 100px
```

### Connection Operations

#### addConnection(input: ConnectionInput)

```typescript
builder.addConnection({
  from: '@api',
  to: '@lambda',
  type: 'data',
  label: 'HTTP Request'
});
```

#### addConnections(inputs: ConnectionInput[])

```typescript
builder.addConnections([
  { from: '@api', to: '@lambda' },
  { from: '@lambda', to: '@db' }
]);
```

#### updateConnection(from: string, to: string, update: ConnectionUpdate)

```typescript
builder.updateConnection('@api', '@lambda', {
  label: 'Updated Label',
  style: 'dashed'
});
```

#### removeConnection(from: string, to: string)

```typescript
builder.removeConnection('@api', '@lambda');
```

#### hasConnection(from: string, to: string): boolean

```typescript
if (builder.hasConnection('@api', '@lambda')) {
  // Connection exists
}
```

#### getConnection(from: string, to: string): Connection | undefined

```typescript
const conn = builder.getConnection('@api', '@lambda');
console.log(conn?.label);
```

### Batch Operations

#### applyPatch(patch: DiagramPatch)

Apply multiple operations at once:

```typescript
builder.applyPatch({
  title: 'Updated Diagram',
  addNodes: [
    { id: '@new', icon: 'aws:s3', position: [100, 100] }
  ],
  updateNodes: [
    { id: '@existing', label: 'Updated Label' }
  ],
  removeNodes: ['@old'],
  addConnections: [
    { from: '@new', to: '@existing' }
  ],
  updateConnections: [
    { from: '@a', to: '@b', label: 'Updated' }
  ],
  removeConnections: [
    { from: '@old', to: '@existing' }
  ]
});
```

**Execution Order:**
1. Add nodes
2. Update nodes
3. Add connections
4. Update connections
5. Remove connections
6. Remove nodes
7. Update metadata (title, subtitle, background, colors)

### Build Operations

#### build(): DiagramDefinition & { render?: RenderOptions }

Returns the diagram with optional render metadata.

```typescript
const diagram = builder.build();
```

#### toJSON(pretty?: boolean): string

Returns the diagram as a JSON string.

```typescript
const json = builder.toJSON(true); // Pretty printed
```

## Type Definitions

### NodeInput

```typescript
interface NodeInput {
  id: string;
  type?: NodeType;
  icon?: string;
  label?: string;
  sublabel?: string;
  position?: [number, number];
  size?: [number, number];
  borderColor?: string;
  layout?: LayoutDirection;
  labelPosition?: LabelPosition;
  groupIcon?: string;
  children?: NodeInput[];
  icons?: { id: string; icon: string; label?: string }[];
}
```

### ConnectionInput

```typescript
interface ConnectionInput {
  from: string;
  to: string;
  type?: ConnectionType;
  width?: number;
  color?: string;
  style?: 'solid' | 'dashed' | 'dotted';
  bidirectional?: boolean;
  label?: string;
  fromSide?: AnchorSide;
  toSide?: AnchorSide;
}
```

### DiagramPatch

```typescript
interface DiagramPatch {
  title?: string;
  subtitle?: string;
  background?: Background;
  colors?: Record<string, string>;
  addNodes?: NodeInput[];
  updateNodes?: (NodeUpdate & { id: string })[];
  removeNodes?: string[];
  addConnections?: ConnectionInput[];
  updateConnections?: (ConnectionUpdate & { from: string; to: string })[];
  removeConnections?: { from: string; to: string }[];
}
```

## Error Handling

| Operation          | Error Condition          | Error Message                           |
| ------------------ | ------------------------ | --------------------------------------- |
| updateNode         | Node not found           | `Node not found: {id}`                  |
| removeNode         | Node not found           | `Node not found: {id}`                  |
| insertAbove/Below  | Reference not found      | `Reference node not found: {id}`        |
| insertLeft/Right   | Reference not found      | `Reference node not found: {id}`        |
| alignTop/Left      | Reference not found      | `Reference node not found: {id}`        |
| alignCenterY/X     | Reference not found      | `Reference node not found: {id}`        |
| addConnection      | Source not found         | `Source node not found: {from}`         |
| addConnection      | Target not found         | `Target node not found: {to}`           |
| updateConnection   | Connection not found     | `Connection not found: {from} -> {to}`  |
| removeConnection   | Connection not found     | `Connection not found: {from} -> {to}`  |

## Usage Example

```typescript
import { createBuilder } from 'gospelo-architect';

const builder = createBuilder()
  .setTitle('AWS Architecture')
  .setRender({ width: 1200, height: 800 })
  .addNode({ id: '@api', icon: 'aws:api_gateway', label: 'API Gateway', position: [100, 200] })
  .addNode({ id: '@lambda', icon: 'aws:lambda', label: 'Lambda', position: [300, 200] })
  .addNode({ id: '@db', icon: 'aws:dynamodb', label: 'DynamoDB', position: [500, 200] })
  .addConnections([
    { from: '@api', to: '@lambda', label: 'Invoke' },
    { from: '@lambda', to: '@db', label: 'Query' }
  ])
  .alignCenterY('@api', ['@lambda', '@db'])
  .distributeHorizontally(['@api', '@lambda', '@db'], 200);

const diagram = builder.build();
console.log(builder.toJSON(true));
```
