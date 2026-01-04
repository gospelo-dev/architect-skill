---
name: gospelo-diagramjs
description: Generate and edit system architecture diagrams from JSON definitions. Supports incremental editing with eval command. Outputs HTML, SVG, or enriched JSON. Use when asked to create, modify, or visualize AWS/Azure/GCP architecture diagrams.
allowed-tools: Read, Bash(bun:*)
---

# System Diagram Generator Skill

JSON定義からシステムアーキテクチャ図を生成・編集するスキルです。AWS、Azure、GCP、その他テックスタックのアイコンをサポートしています。

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

Agent Skill向けのフラグスタイルコマンドです。`--diagram` オプションで対象ファイルを指定します。

```bash
# ダイアグラムの構造を確認
gospelo-architect --open --diagram system.json

# HTML/SVG出力
gospelo-architect --output html --diagram system.json
gospelo-architect --output svg --diagram system.json

# 出力先ディレクトリを指定（ディレクトリは自動作成）
gospelo-architect --output html --diagram system.json --output-dir ./output

# ノード追加（基準ノードの上/下に配置）
gospelo-architect --insert-above api_gateway --node '{"id":"waf","icon":"aws:waf","label":"WAF"}' --diagram system.json
gospelo-architect --insert-below lambda --node '{"id":"db","icon":"aws:dynamodb","label":"DynamoDB"}' --diagram system.json

# ノード更新
gospelo-architect --update-node lambda --node '{"label":"Updated Lambda","sublabel":"Python 3.12"}' --diagram system.json

# ノード削除
gospelo-architect --remove-node old_node --diagram system.json
```

## Eval Command (Advanced)

最も柔軟な方法は `eval` コマンドです。`b` はDiagramBuilderインスタンスとして使えます。

```bash
# ノードを追加
bun bin/cli.ts eval diagram.json 'b.addNode({id:"lambda",icon:"aws:lambda",label:"Lambda",position:[400,300]})'

# ノードを移動
bun bin/cli.ts eval diagram.json 'b.moveNode("lambda",[500,400])'

# 複数操作をチェーン
bun bin/cli.ts eval diagram.json 'b.addNode({...}).addConnection({from:"a",to:"b"}).removeNode("old")'

# ラベル変更
bun bin/cli.ts eval diagram.json 'b.setNodeLabel("lambda","New Label","New Sublabel")'
```

## CLI Commands

### Flag-style Commands (for Agent Skills)

```bash
# ダイアグラム構造を表示
gospelo-architect --open --diagram <file.json>

# HTML/SVG出力
gospelo-architect --output html --diagram <file.json>
gospelo-architect --output svg --diagram <file.json>

# ノード操作（基準ノードの上/下に自動配置）
gospelo-architect --insert-above <ref-node-id> --node '<json>' --diagram <file.json>
gospelo-architect --insert-below <ref-node-id> --node '<json>' --diagram <file.json>
gospelo-architect --update-node <node-id> --node '<json>' --diagram <file.json>
gospelo-architect --remove-node <node-id> --diagram <file.json>
```

### Traditional Render Commands

```bash
# メタデータ付きJSONを生成
bun bin/cli.ts enrich diagram.json output.json --pretty

# スタンドアロンHTMLを生成
bun bin/cli.ts render diagram.json output.html

# SVGファイルを生成
bun bin/cli.ts svg diagram.json output.svg

# メタデータのみを表示
bun bin/cli.ts meta diagram.json --pretty
```

### Traditional Edit Commands

```bash
# eval - 最も柔軟（JS式を実行）
bun bin/cli.ts eval <input.json> '<expression>' [output.json]

# 個別コマンド
bun bin/cli.ts add-node <input.json> '<node-json>' [output.json]
bun bin/cli.ts remove-node <input.json> <node-id> [output.json]
bun bin/cli.ts move-node <input.json> <node-id> <x> <y> [output.json]
bun bin/cli.ts add-connection <input.json> <from> <to> [output.json]
bun bin/cli.ts remove-connection <input.json> <from> <to> [output.json]
bun bin/cli.ts edit <input.json> <patch.json> [output.json]
```

## DiagramBuilder Methods

`eval`コマンドで使えるメソッド:

| Method | Description |
| ------ | ----------- |
| `addNode({id, icon, label, position, ...})` | ノードを追加 |
| `insertAbove(refNodeId, nodeInput, offsetY?)` | 基準ノードの上にノードを追加 |
| `insertBelow(refNodeId, nodeInput, offsetY?)` | 基準ノードの下にノードを追加 |
| `insertLeft(refNodeId, nodeInput, offsetX?)` | 基準ノードの左にノードを追加 |
| `insertRight(refNodeId, nodeInput, offsetX?)` | 基準ノードの右にノードを追加 |
| `removeNode(id)` | ノードと関連接続を削除 |
| `updateNode(id, {label, icon, ...})` | ノードを更新 |
| `moveNode(id, [x, y])` | ノードを移動 |
| `setNodeLabel(id, label, sublabel?)` | ラベルを変更 |
| `setNodeIcon(id, icon)` | アイコンを変更 |
| `addConnection({from, to, type?, color?})` | 接続を追加 |
| `removeConnection(from, to)` | 接続を削除 |
| `updateConnection(from, to, {...})` | 接続を更新 |
| `setTitle(title)` | タイトルを設定 |
| `setSubtitle(subtitle)` | サブタイトルを設定 |

## Options

| Option             | Description                          |
| ------------------ | ------------------------------------ |
| `--width <number>` | Diagram width (default: 800)         |
| `--height <number>`| Diagram height (default: 600)        |
| `--pretty`         | Pretty-print JSON output             |
| `--in-place`       | Modify input file in place           |
| `--help`           | Show help                            |

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
# 空のダイアグラムを作成
echo '{"title":"New Diagram","nodes":[],"connections":[]}' > diagram.json

# ノードを追加
bun bin/cli.ts eval diagram.json 'b.addNode({id:"api",icon:"aws:api_gateway",label:"API Gateway",position:[200,150]})' diagram.json --in-place
bun bin/cli.ts eval diagram.json 'b.addNode({id:"lambda",icon:"aws:lambda",label:"Lambda",position:[400,150]})' diagram.json --in-place
bun bin/cli.ts eval diagram.json 'b.addNode({id:"db",icon:"aws:dynamodb",label:"DynamoDB",position:[600,150]})' diagram.json --in-place

# 接続を追加
bun bin/cli.ts eval diagram.json 'b.addConnection({from:"api",to:"lambda"}).addConnection({from:"lambda",to:"db"})' diagram.json --in-place

# HTMLにレンダリング
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
# プレビュー用SVGを生成（tempディレクトリに出力）
bun bin/cli.ts preview diagram.json

# 出力例: Preview SVG generated: /tmp/diagram_preview_diagram_1234567890.svg
# → Read toolでSVGファイルを読み取り、内容を確認
```

### Web Claude

Web版Claudeでは「Presented file」機能でHTMLをプレビュー表示できます：

```bash
# HTMLを生成して /tmp に出力
bun bin/cli.ts render diagram.json /tmp/diagram.html

# または直接Bunスクリプトで
bun -e '
import { renderStandalone } from "./src/index.ts";
import { readFileSync } from "fs";

const diagram = JSON.parse(readFileSync("diagram.json", "utf-8"));
const html = renderStandalone(diagram);
await Bun.write("/tmp/diagram.html", html);
console.log("Created: /tmp/diagram.html");
'
```

生成されたHTMLファイルを「Presented file」として表示すると、ダイアグラムをビジュアルで確認できます。
