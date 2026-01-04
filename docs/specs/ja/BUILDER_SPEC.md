# ビルダー仕様

このドキュメントでは、fluent ダイアグラム操作用の DiagramBuilder API について説明します。

## 概要

`DiagramBuilder` クラス（`src/core/builder.ts`）は、ダイアグラムを段階的に作成・修正するための fluent インターフェースを提供します。

## 初期化

```typescript
import { DiagramBuilder, createBuilder } from 'gospelo-architect';

// 新規作成
const builder = new DiagramBuilder();

// 既存のダイアグラムから
const builder = new DiagramBuilder(existingDiagram);

// JSON 文字列から
const builder = new DiagramBuilder(jsonString);

// ファクトリ関数を使用
const builder = createBuilder(base);
```

## API リファレンス

### メタデータ操作

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

### ノード操作

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

ノードとそのノードへの/からの接続をすべて削除します。

```typescript
builder.removeNode('@old_node');
```

#### hasNode(id: string): boolean

```typescript
if (builder.hasNode('@lambda')) {
  // ノードが存在する
}
```

#### getNode(id: string): Node | undefined

```typescript
const node = builder.getNode('@lambda');
console.log(node?.label);
```

### 位置指定挿入操作

#### insertAbove(refNodeId: string, input: NodeInput, offsetY?: number)

基準ノードの上（Y 方向）にノードを挿入します。

```typescript
builder.insertAbove('@lambda', { id: '@new', icon: 'aws:s3' });
// デフォルトオフセット: 100px
```

#### insertBelow(refNodeId: string, input: NodeInput, offsetY?: number)

```typescript
builder.insertBelow('@lambda', { id: '@new', icon: 'aws:s3' }, 150);
```

#### insertLeft(refNodeId: string, input: NodeInput, offsetX?: number)

```typescript
builder.insertLeft('@lambda', { id: '@new', icon: 'aws:s3' });
// デフォルトオフセット: 150px
```

#### insertRight(refNodeId: string, input: NodeInput, offsetX?: number)

```typescript
builder.insertRight('@lambda', { id: '@new', icon: 'aws:s3' });
```

### 整列操作

#### alignTop(refNodeId: string, nodeIds: string[])

ノードを基準ノードの Y 位置（上端）に揃えます。

```typescript
builder.alignTop('@ref', ['@node1', '@node2']);
```

#### alignLeft(refNodeId: string, nodeIds: string[])

ノードを基準ノードの X 位置（左端）に揃えます。

```typescript
builder.alignLeft('@ref', ['@node1', '@node2']);
```

#### alignCenterY(refNodeId: string, nodeIds: string[])

ノードを基準ノードの垂直中央に揃えます。

```typescript
builder.alignCenterY('@ref', ['@node1', '@node2']);
```

#### alignCenterX(refNodeId: string, nodeIds: string[])

ノードを基準ノードの水平中央に揃えます。

```typescript
builder.alignCenterX('@ref', ['@node1', '@node2']);
```

### 分布操作

#### distributeHorizontally(nodeIds: string[], spacing?: number)

ノードを等間隔で水平に分布させます。

```typescript
builder.distributeHorizontally(['@a', '@b', '@c'], 150);
// デフォルトスペーシング: 150px
```

#### distributeVertically(nodeIds: string[], spacing?: number)

ノードを等間隔で垂直に分布させます。

```typescript
builder.distributeVertically(['@a', '@b', '@c'], 100);
// デフォルトスペーシング: 100px
```

### 接続操作

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
  // 接続が存在する
}
```

#### getConnection(from: string, to: string): Connection | undefined

```typescript
const conn = builder.getConnection('@api', '@lambda');
console.log(conn?.label);
```

### バッチ操作

#### applyPatch(patch: DiagramPatch)

複数の操作を一度に適用します：

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

**実行順序：**
1. ノードを追加
2. ノードを更新
3. 接続を追加
4. 接続を更新
5. 接続を削除
6. ノードを削除
7. メタデータを更新（title、subtitle、background、colors）

### ビルド操作

#### build(): DiagramDefinition & { render?: RenderOptions }

オプションのレンダーメタデータを含むダイアグラムを返します。

```typescript
const diagram = builder.build();
```

#### toJSON(pretty?: boolean): string

ダイアグラムを JSON 文字列として返します。

```typescript
const json = builder.toJSON(true); // 整形出力
```

## 型定義

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

## エラーハンドリング

| 操作               | エラー条件               | エラーメッセージ                        |
| ------------------ | ------------------------ | --------------------------------------- |
| updateNode         | ノードが見つからない     | `Node not found: {id}`                  |
| removeNode         | ノードが見つからない     | `Node not found: {id}`                  |
| insertAbove/Below  | 基準が見つからない       | `Reference node not found: {id}`        |
| insertLeft/Right   | 基準が見つからない       | `Reference node not found: {id}`        |
| alignTop/Left      | 基準が見つからない       | `Reference node not found: {id}`        |
| alignCenterY/X     | 基準が見つからない       | `Reference node not found: {id}`        |
| addConnection      | ソースが見つからない     | `Source node not found: {from}`         |
| addConnection      | ターゲットが見つからない | `Target node not found: {to}`           |
| updateConnection   | 接続が見つからない       | `Connection not found: {from} -> {to}`  |
| removeConnection   | 接続が見つからない       | `Connection not found: {from} -> {to}`  |

## 使用例

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
