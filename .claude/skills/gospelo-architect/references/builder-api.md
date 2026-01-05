# DiagramBuilder API Reference

Methods available in the `eval` command. `b` is a DiagramBuilder instance.

## Node Operations

| Method | Description |
| ------ | ----------- |
| `addNode({id, icon, label, position, ...})` | Add a node |
| `insertAbove(refNodeId, nodeInput, offsetY?)` | Add node above reference node (default: Y-100) |
| `insertBelow(refNodeId, nodeInput, offsetY?)` | Add node below reference node (default: Y+100) |
| `insertLeft(refNodeId, nodeInput, offsetX?)` | Add node to the left of reference node (default: X-150) |
| `insertRight(refNodeId, nodeInput, offsetX?)` | Add node to the right of reference node (default: X+150) |
| `removeNode(id)` | Remove node and related connections |
| `updateNode(id, {label, icon, ...})` | Update node |
| `moveNode(id, [x, y])` | Move node |
| `setNodeLabel(id, label, sublabel?)` | Change label |
| `setNodeIcon(id, icon)` | Change icon |

## Alignment Operations

| Method | Description |
| ------ | ----------- |
| `alignTop(refNodeId, nodeIds[])` | Align Y-coordinates of multiple nodes to reference node |
| `alignLeft(refNodeId, nodeIds[])` | Align X-coordinates of multiple nodes to reference node |
| `distributeHorizontally(nodeIds[], spacing?)` | Distribute nodes horizontally with equal spacing (default: 150px) |
| `distributeVertically(nodeIds[], spacing?)` | Distribute nodes vertically with equal spacing (default: 100px) |

## Connection Operations

| Method | Description |
| ------ | ----------- |
| `addConnection({from, to, type?, color?})` | Add connection |
| `removeConnection(from, to)` | Remove connection |
| `updateConnection(from, to, {...})` | Update connection |

## Group/Composite Child Nodes

Child nodes of groups (`type: "group"`) or composites (`type: "composite"`) are automatically positioned based on the `layout` property.

| Layout | Description |
| ------ | ----------- |
| `horizontal` | Auto-arrange child nodes horizontally (default) |
| `vertical` | Auto-arrange child nodes vertically |

### Relative Positioning of Child Nodes

Specify `position` on child nodes to position them relative to the parent node.

```json
{
  "id": "ai_models",
  "type": "group",
  "position": [720, 100],
  "size": [280, 180],
  "children": [
    {"id": "bedrock", "icon": "aws:bedrock", "position": [0, 0]},
    {"id": "model1", "type": "text_box", "position": [100, 50]}
  ]
}
```

- `position: [0, 0]` = top-left corner of parent group
- You can mix auto-layout and manual positioning

## Metadata Operations

| Method | Description |
| ------ | ----------- |
| `setTitle(title)` | Set title |
| `setSubtitle(subtitle)` | Set subtitle |
| `setBackground({type, ...})` | Set background |

## Examples

```bash
# Add a node
bun bin/cli.ts eval diagram.json 'b.addNode({id:"lambda",icon:"aws:lambda",label:"Lambda",position:[400,300]})'

# Add node to the right of reference node
bun bin/cli.ts eval diagram.json 'b.insertRight("api",{id:"lambda",icon:"aws:lambda",label:"Lambda"})'

# Move node
bun bin/cli.ts eval diagram.json 'b.moveNode("lambda",[500,400])'

# Chain multiple operations
bun bin/cli.ts eval diagram.json 'b.addNode({id:"a",icon:"aws:s3"}).addConnection({from:"api",to:"a"})'

# Change label
bun bin/cli.ts eval diagram.json 'b.setNodeLabel("lambda","New Label","New Sublabel")'

# Align Y-coordinates of nodes
bun bin/cli.ts eval diagram.json 'b.alignTop("api",["lambda","db","s3"])'

# Align X-coordinates of nodes
bun bin/cli.ts eval diagram.json 'b.alignLeft("api",["waf","cloudfront"])'

# Distribute nodes horizontally with equal spacing
bun bin/cli.ts eval diagram.json 'b.distributeHorizontally(["api","lambda","db"],200)'
```
