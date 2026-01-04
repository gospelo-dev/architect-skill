# gospelo-architect

**あなたが説明する。AIがデザインする。ダイアグラムが現れる。**

システムアーキテクチャ図を作成する新しいパラダイム：人間が意図を伝え、AIエージェントがデザインとレイアウトを担当。手動でのドラッグや細かい調整は不要 - 欲しいものを説明するだけで、あとはAIにお任せ。

AIエージェント時代のために構築されています。従来のダイアグラムツールは人間が手動でアイコンを配置し線を引く必要がありますが、gospelo-architectはAIエージェントが自律的に操作できるよう一から設計されています - JSON定義を読み取り、プロフェッショナルなダイアグラムを生成し、人間のフィードバックに基づいて改善します。

## gospelo-architectを選ぶ理由

- **AI ネイティブ設計**: AIエージェントが読み書き・修正できるJSON形式の定義
- **反復的ワークフロー**: 自然言語で変更を説明すると、AIがダイアグラムを更新
- **プロフェッショナルな出力**: 1,500以上のクラウドアイコンを使用した本番対応のSVGとHTML
- **必要に応じた微調整**: 正確な調整が必要な場合はビジュアルエディタも利用可能

## 機能

- **依存関係ゼロ**: 外部ランタイム依存のない純粋なTypeScript
- **複数の出力形式**: SVG、スタンドアロンHTML、SVG埋め込みマークダウン、メタデータ付きエンリッチJSON
- **インクリメンタル編集**: プログラムによるダイアグラム修正のためのフルエントビルダーAPI
- **クラウドアイコン**: AWS、Azure、Google Cloud、Tech Stackアイコンの組み込みサポート（1,500以上のアイコン）
- **CLIツール**: フル機能のコマンドラインインターフェース

## インストール

```bash
# Bunを使用
bun add gospelo-architect

# npmを使用
npm install gospelo-architect
```

## クイックスタート

### CLIの使用

```bash
# ダイアグラムをHTMLにレンダリング
gospelo-architect render diagram.json output.html

# SVGのみにレンダリング
gospelo-architect svg diagram.json output.svg

# AI利用のためのメタデータを追加
gospelo-architect enrich diagram.json enriched.json

# メタデータのみを出力
gospelo-architect meta diagram.json --pretty
```

### プログラムからの使用

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

// HTMLにレンダリング
const html = renderShareable(diagram, { width: 800, height: 600 });

// SVGにレンダリング
const svg = renderSvg(diagram);

// メタデータでエンリッチ
const enriched = enrichDiagram(diagram);
```

## ダイアグラム定義形式

ダイアグラムはJSON形式で定義します：

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

## CLIコマンド

### レンダリングコマンド

| コマンド | 説明 |
| -------- | ---- |
| `render <input.json> [output.html]` | ダイアグラムをスタンドアロンHTMLにレンダリング |
| `svg <input.json> [output.svg]` | ダイアグラムをSVGのみにレンダリング |
| `enrich <input.json> [output.json]` | ダイアグラムJSONに計算されたメタデータを追加 |
| `meta <input.json>` | メタデータのみを出力（JSONを標準出力へ） |
| `preview <input.json>` | SVGを生成しAI閲覧用のファイルパスを出力 |

### 編集コマンド

| コマンド | 説明 |
| -------- | ---- |
| `eval <input.json> '<expr>' [output.json]` | ビルダー 'b' を使ってJS式を評価 |
| `edit <input.json> <patch.json> [output.json]` | ダイアグラムにパッチを適用 |
| `add-node <input.json> <node.json> [output.json]` | JSONからノードを追加 |
| `remove-node <input.json> <node-id> [output.json]` | IDでノードを削除 |
| `move-node <input.json> <node-id> <x> <y> [output]` | ノードを指定位置に移動 |
| `add-connection <input.json> <from> <to> [output]` | コネクションを追加 |

### オプション

| オプション | 説明 |
| ---------- | ---- |
| `--width <number>` | ダイアグラムの幅（デフォルト: 800） |
| `--height <number>` | ダイアグラムの高さ（デフォルト: 600） |
| `--pretty` | JSON出力を整形 |
| `--in-place` | 入力ファイルを直接変更 |

## ビルダーによるインクリメンタル編集

`eval` コマンドはダイアグラム修正のためのフルエントビルダーAPIを提供します：

```bash
# 新しいノードを追加
bun bin/cli.ts eval diagram.json 'b.addNode({id:"new",icon:"aws:lambda",label:"New",position:[400,300]})'

# 複数の操作を連鎖
bun bin/cli.ts eval diagram.json 'b.removeNode("old").addConnection({from:"a",to:"b"})'

# ノードを移動・更新
bun bin/cli.ts eval diagram.json 'b.moveNode("lambda",500,400).setNodeLabel("lambda","Updated")' --pretty
```

### ビルダーメソッド

| メソッド | 説明 |
| -------- | ---- |
| `addNode(node)` | 新しいノードを追加 |
| `removeNode(id)` | IDでノードを削除 |
| `moveNode(id, x, y)` または `moveNode(id, [x, y])` | ノードを指定位置に移動 |
| `setNodeLabel(id, label)` | ノードのラベルを更新 |
| `addConnection({from, to, ...})` | コネクションを追加 |
| `removeConnection(from, to)` | コネクションを削除 |
| `applyPatch(patch)` | 複数の変更を一度に適用 |
| `build()` | 変更されたダイアグラムを取得 |

## アイコンリファレンス

アイコンは `provider:name` 形式を使用します（例：`aws:lambda`、`azure:functions`、`gcp:cloud_run`、`tech:python`）。

AWS、Azure、Google Cloud、Tech Stackプロバイダー全体で1,500以上のアイコンが利用可能です。

アイコンの参照と検索については[アイコンカタログ](docs/references/ICON_CATALOG.md)をご覧ください。

### 一般的なアイコン

**AWS**: `aws:lambda`, `aws:ec2`, `aws:s3`, `aws:rds`, `aws:dynamodb`, `aws:api_gateway`, `aws:cloudfront`, `aws:cognito`, `aws:sqs`, `aws:sns`

**Azure**: `azure:virtual_machines`, `azure:app_service`, `azure:functions`, `azure:blob_storage`, `azure:cosmos_db`, `azure:sql_database`

**Google Cloud**: `gcp:cloud_run`, `gcp:cloud_functions`, `gcp:compute_engine`, `gcp:cloud_storage`

**Tech Stack**: `tech:python`, `tech:typescript`, `tech:react`, `tech:docker`, `tech:kubernetes`

## ノードタイプ

| タイプ | 説明 |
| ------ | ---- |
| `icon` | ラベル付きの単一アイコン（デフォルト） |
| `group` | 子ノードのコンテナ |
| `composite` | 単一ノード内の複数アイコン |
| `text_box` | テキストのみのノード |
| `person` | 人物アイコン |
| `person_pc_mobile` | PCとモバイルを持つ人物 |
| `pc_mobile` | PCとモバイルデバイス |
| `pc` | PCデバイス |

## コネクションタイプ

| タイプ | 説明 |
| ------ | ---- |
| `data` | データフロー（矢印付き実線） |
| `auth` | 認証フロー（破線） |

## APIリファレンス

### コア関数

```typescript
// 共有可能なHTMLにレンダリング（アイコンはCDNから取得）
renderShareable(diagram: DiagramDefinition, options?: RenderOptions): string

// SVGのみにレンダリング
renderSvg(diagram: DiagramDefinition, options?: RenderOptions): string

// ダイアグラムに計算されたメタデータを追加
enrichDiagram(diagram: unknown, options?: RenderOptions): object

// AI利用のためのメタデータを生成
generateMeta(diagram: unknown, options?: RenderOptions): DiagramMeta

// インクリメンタル編集用のビルダーを作成
createBuilder(diagram: DiagramDefinition): DiagramBuilder
```

### レンダリングオプション

```typescript
interface RenderOptions {
  width?: number; // デフォルト: 1200
  height?: number; // デフォルト: 800
  iconSize?: number; // デフォルト: 48
  fontSize?: number; // デフォルト: 11
  embedCss?: boolean; // デフォルト: true
  externalIcons?: boolean; // デフォルト: true
}
```

## Web Claude互換性

Web Claudeで使用する場合、AIのファイルプレビュー機能を使用してダイアグラムをレンダリングおよび表示できます：

1. `preview` コマンドを使用してSVGを一時的な場所に生成
2. AIがSVGファイルを読み取って表示

```bash
gospelo-architect preview diagram.json
# 出力: Preview SVG generated: /tmp/diagram_preview_xxx.svg
```

### 必要なドメイン

Web Claudeでgospelo-architectを使用するには、以下のドメインを **Capabilities > Additional allowed domains** に追加してください：

```
raw.githubusercontent.com
cdn.jsdelivr.net
architect.gospelo.dev
w3.org
```

| ドメイン | 用途 |
|----------|------|
| `raw.githubusercontent.com` | AWSおよびGoogle CloudアイコンSVG |
| `cdn.jsdelivr.net` | AzureおよびTech StackアイコンSVG |
| `architect.gospelo.dev` | アイコンカタログCDN（メタデータ） |
| `w3.org` | SVG名前空間定義 |

## Agent Skills (Claude)

gospelo-architectはClaude Agent Skillとして使用できます。ビルド済みのスキルパッケージは `.github/skills/gospelo-architect/` にあります。

### スキルZIPのビルド

```bash
# Agent Skills用ZIPを生成
bun run build:skill
# または
npm run build:skill
```

**出力**: `dist/skills/gospelo-architect-skill.zip` (~7KB)

**内容**:
- `SKILL.md` - スキル定義（ルートに配置）
- `references/` - CLIリファレンス、Builder API、スキーマドキュメント

### スキルZIPの構造

```
gospelo-architect-skill.zip
├── SKILL.md              # スキル定義（ルート）
└── references/
    ├── builder-api.md    # DiagramBuilder APIリファレンス
    ├── cli-reference.md  # CLIコマンドリファレンス
    └── schema.md         # TypeScript型定義 & JSON例
```

### スキルZIPのライセンス

生成される `gospelo-architect-skill.zip` は、メインパッケージと同じMITライセンスの下で提供されます。以下のことが可能です：
- Claudeプロジェクトでのスキル使用
- スキル定義の変更
- スキルの再配布（帰属表示付き）

## ライセンス

[MIT](https://github.com/gospelo-dev/architect-skill/blob/main/LICENSE.md)

## リポジトリ

https://github.com/gospelo-dev/architect-skill

---

**注意**: 本ドキュメントは参考のための日本語訳です。正式な仕様は英語版 [README.md](README.md) を参照してください。
