# gospelo-architect

**あなたが説明する。AIがデザインする。図が現れる。**

システムアーキテクチャ図を作成する新しいパラダイム：人間が意図を伝え、AIエージェントがデザインとレイアウトを担当します。手動でドラッグしたり、ピクセル単位で調整したりする必要はありません。欲しいものを説明するだけで、あとはAIにお任せください。

AIエージェント時代のために構築されています。従来の図作成ツールでは、人間が手動でアイコンを配置し線を引く必要がありましたが、gospelo-architectはAIエージェントが自律的に動作できるようにゼロから設計されています。JSON定義を読み取り、プロフェッショナルな図を生成し、人間のフィードバックに基づいて反復的に改善します。

## なぜ gospelo-architect なのか？

- **AIネイティブ設計**: AIエージェントが読み書き・修正できるJSON形式の定義
- **反復的ワークフロー**: 自然言語で変更を説明し、AIが図を更新
- **プロフェッショナルな出力**: 1,500以上のクラウドアイコンを備えた本番環境対応のSVGとHTML
- **必要に応じて微調整**: 必要な場合はビジュアルエディタで精密な調整が可能

## 特徴

- **依存関係ゼロ**: 外部ランタイム依存関係のない純粋なTypeScript
- **複数の出力フォーマット**: SVG、HTML、Markdown+SVG ZIP、メタデータ付きJSON
- **増分編集**: プログラムによる図の修正のための流暢なビルダーAPI
- **クラウドアイコン**: AWS、Azure、Google Cloud、Tech Stackアイコン（1,500以上）をビルトインサポート
- **リッチツールチップ**: ホバーでリソースID、アイコン名、ライセンス、説明を表示
- **CLIツール**: フル機能のコマンドラインインターフェース

## 出力フォーマット

gospelo-architectは様々なユースケースに対応した複数の出力フォーマットをサポートしています：

| フォーマット | コマンド | 説明 |
|------------|---------|------|
| **HTML** | `html` | ホバーツールチップとShift+ドラッグ複数選択対応のインタラクティブHTML（CDNアイコン） |
| **SVG** | `svg` | CDNアイコン参照のクリーンなSVG |
| **SVG（埋め込み）** | `svg-embed` | Base64埋め込みアイコンのSVG（オフライン対応） |
| **プレビューHTML** | `preview` | オフライン表示用のBase64埋め込みアイコンHTML |
| **Markdown ZIP** | `markdown` | Markdown + 埋め込みSVGを含むZIP |
| **JSON（エンリッチ）** | `enrich` | オリジナルJSON + 計算されたメタデータ（位置、サイズ） |
| **JSON（メタのみ）** | `meta` | AI消費用のメタデータのみ |

## インストール

```bash
# Bunを使用
bun add gospelo-architect

# npmを使用
npm install gospelo-architect
```

## クイックスタート

### CLI使用方法

```bash
# HTMLへレンダリング
bun bin/cli.ts html diagram.json output.html

# SVGへレンダリング（CDNアイコン）
bun bin/cli.ts svg diagram.json output.svg

# 埋め込みアイコン付きSVGへレンダリング（オフライン対応）
bun bin/cli.ts svg-embed diagram.json output.svg

# Markdown + SVG ZIPバンドルを生成
bun bin/cli.ts markdown diagram.json output.zip

# AI消費用のメタデータを追加
bun bin/cli.ts enrich diagram.json enriched.json

# メタデータのみ出力
bun bin/cli.ts meta diagram.json --pretty
```

### プログラム的な使用

```typescript
import { renderStandalone, renderSvg, renderSvgEmbed, enrichDiagram } from "gospelo-architect";

const diagram = {
  title: "マイアーキテクチャ",
  resources: {
    "@lambda": { icon: "aws:lambda", desc: "処理関数" },
    "@db": { icon: "aws:dynamodb", desc: "データストレージ" }
  },
  nodes: [
    { id: "@lambda", label: "Function", position: [100, 100] },
    { id: "@db", label: "Database", position: [300, 100] }
  ],
  connections: [{ from: "@lambda", to: "@db", type: "data" }]
};

// HTMLへレンダリング
const html = renderStandalone(diagram, { width: 800, height: 600 });

// SVGへレンダリング
const svg = renderSvg(diagram);

// 埋め込みアイコン付きSVGへレンダリング
const embeddedSvg = await renderSvgEmbed(diagram);

// メタデータを追加
const enriched = enrichDiagram(diagram);
```

## 図定義フォーマット

すべてのノードは`@`プレフィックス付きの対応するリソースエントリが必要です：

```json
{
  "title": "システムアーキテクチャ",
  "subtitle": "本番環境",
  "resources": {
    "@api": { "icon": "aws:api_gateway", "desc": "APIエンドポイント" },
    "@backend": { "desc": "バックエンドサービスグループ" },
    "@lambda": { "icon": "aws:lambda", "desc": "処理関数" },
    "@db": { "icon": "aws:dynamodb", "desc": "データストレージ" }
  },
  "background": {
    "type": "gradient",
    "startColor": "#f5f5f5",
    "endColor": "#ffffff",
    "direction": "south"
  },
  "nodes": [
    {
      "id": "@api",
      "label": "API Gateway",
      "position": [200, 100]
    },
    {
      "id": "@backend",
      "type": "group",
      "label": "Backend Services",
      "position": [100, 200],
      "size": [400, 300],
      "children": [
        { "id": "@lambda", "label": "Function", "parentId": "@backend" },
        { "id": "@db", "label": "Database", "parentId": "@backend" }
      ]
    }
  ],
  "connections": [
    { "from": "@api", "to": "@lambda", "type": "data" },
    { "from": "@lambda", "to": "@db", "type": "data", "bidirectional": true }
  ]
}
```

## CLIコマンド

### レンダリングコマンド

| コマンド | 説明 |
|---------|------|
| `html <input.json> [output.html]` | スタンドアロンHTMLへレンダリング |
| `svg <input.json> [output.svg]` | SVGへレンダリング（CDNアイコン） |
| `svg-embed <input.json> [output.svg]` | Base64埋め込みアイコン付きSVGへレンダリング |
| `preview <input.json> [output.html]` | 埋め込みアイコン付きプレビューHTMLを生成 |
| `markdown <input.json> [output.zip]` | Markdown + 埋め込みSVGのZIPを生成 |
| `enrich <input.json> [output.json]` | 計算されたメタデータを追加 |
| `meta <input.json>` | メタデータのみ出力（JSON） |

### 編集コマンド

| コマンド | 説明 |
|---------|------|
| `eval <input.json> '<expr>' [output.json]` | ビルダー'b'でJS式を評価 |
| `edit <input.json> <patch.json> [output.json]` | パッチを適用 |
| `add-node <input.json> <node.json> [output.json]` | JSONからノードを追加 |
| `remove-node <input.json> <node-id> [output.json]` | IDでノードを削除 |
| `move-node <input.json> <node-id> <x> <y> [output]` | ノードを移動 |
| `add-connection <input.json> <from> <to> [output]` | 接続を追加 |

### オプション

| オプション | 説明 |
|-----------|------|
| `--width <number>` | 図の幅（デフォルト: 800） |
| `--height <number>` | 図の高さ（デフォルト: 600） |
| `--pretty` | JSON出力を整形 |
| `--in-place` | 入力ファイルを直接変更 |

## ビルダーによる増分編集

`eval`コマンドは図の修正のための流暢なビルダーAPIを提供します：

```bash
# 新しいノードを追加
bun bin/cli.ts eval diagram.json 'b.addNode({id:"@new",icon:"aws:lambda",label:"New",position:[400,300]})'

# 複数の操作をチェーン
bun bin/cli.ts eval diagram.json 'b.removeNode("@old").addConnection({from:"@a",to:"@b"})'

# ノードを移動して更新
bun bin/cli.ts eval diagram.json 'b.moveNode("@lambda",500,400).setNodeLabel("@lambda","Updated")' --pretty
```

### ビルダーメソッド

| メソッド | 説明 |
|---------|------|
| `addNode(node)` | 新しいノードを追加 |
| `removeNode(id)` | IDでノードを削除 |
| `moveNode(id, x, y)` または `moveNode(id, [x, y])` | ノードを移動 |
| `setNodeLabel(id, label)` | ノードラベルを更新 |
| `addConnection({from, to, ...})` | 接続を追加 |
| `removeConnection(from, to)` | 接続を削除 |
| `applyPatch(patch)` | 複数の変更を一度に適用 |
| `build()` | 修正された図を取得 |

## アイコンリファレンス

アイコンは`provider:name`形式を使用します（例：`aws:lambda`、`azure:functions`、`gcp:cloud_run`、`tech:python`）。

AWS、Azure、Google Cloud、Tech Stackプロバイダー全体で1,500以上のアイコンが利用可能です。

アイコンの閲覧と検索については[アイコンカタログ](docs/references/ICON_CATALOG.md)を参照してください。

### よく使うアイコン

**AWS**: `aws:lambda`, `aws:ec2`, `aws:s3`, `aws:rds`, `aws:dynamodb`, `aws:api_gateway`, `aws:cloudfront`, `aws:cognito`, `aws:sqs`, `aws:sns`

**Azure**: `azure:virtual_machines`, `azure:app_service`, `azure:functions`, `azure:blob_storage`, `azure:cosmos_db`, `azure:sql_database`

**Google Cloud**: `gcp:cloud_run`, `gcp:cloud_functions`, `gcp:compute_engine`, `gcp:cloud_storage`

**Tech Stack**: `tech:python`, `tech:typescript`, `tech:react`, `tech:docker`, `tech:kubernetes`

## ノードタイプ

| タイプ | 説明 |
|-------|------|
| `icon` | ラベル付きの単一アイコン（デフォルト） |
| `group` | 子ノードのコンテナ |
| `composite` | 単一ノード内の複数アイコン |
| `text_box` | テキストのみのノード（アイコン不要） |
| `person` | 人物アイコン |
| `person_pc_mobile` | PCとモバイルを持つ人物 |
| `pc_mobile` | PCとモバイルデバイス |
| `pc` | PCデバイス |

## 接続タイプ

| タイプ | 説明 |
|-------|------|
| `data` | データフロー（矢印付き実線） |
| `auth` | 認証フロー（破線） |

## APIリファレンス

### コア関数

```typescript
// スタンドアロンHTMLへレンダリング（アイコンはCDNが必要）
renderStandalone(diagram: DiagramDefinition, options?: RenderOptions): string

// SVGのみへレンダリング（CDNアイコン）
renderSvg(diagram: DiagramDefinition, options?: RenderOptions): string

// Base64埋め込みアイコン付きSVGへレンダリング（非同期）
renderSvgEmbed(diagram: DiagramDefinition, options?: RenderOptions): Promise<string>

// 計算されたメタデータを追加
enrichDiagram(diagram: unknown, options?: RenderOptions): object

// AI消費用のメタデータを生成
generateMeta(diagram: unknown, options?: RenderOptions): DiagramMeta

// 増分編集用のビルダーを作成
createBuilder(diagram: DiagramDefinition): DiagramBuilder
```

### レンダリングオプション

```typescript
interface RenderOptions {
  width?: number;        // デフォルト: 1200
  height?: number;       // デフォルト: 800
  iconSize?: number;     // デフォルト: 48
  fontSize?: number;     // デフォルト: 11
  embedCss?: boolean;    // デフォルト: true
  externalIcons?: boolean; // デフォルト: true
}
```

## Web Claude互換性

Web Claudeで使用する場合、AIのファイルプレビュー機能を使用して図をレンダリングおよび表示できます：

1. `preview`コマンドを使用して一時的な場所にSVGを生成
2. AIがSVGファイルを読み取り表示可能

```bash
bun bin/cli.ts preview diagram.json
# 出力: Preview SVG generated: /tmp/diagram_preview_xxx.svg
```

### 必要なドメイン

Web Claudeでgospelo-architectを使用するには、以下のドメインを**機能 > 追加の許可ドメイン**に追加してください：

```
raw.githubusercontent.com
cdn.jsdelivr.net
architect.gospelo.dev
w3.org
```

| ドメイン | 用途 |
|---------|------|
| `raw.githubusercontent.com` | AWSとGoogle CloudのアイコンSVG |
| `cdn.jsdelivr.net` | AzureとTech StackのアイコンSVG |
| `architect.gospelo.dev` | アイコンカタログCDN（メタデータ） |
| `w3.org` | SVG名前空間定義 |

## エージェントスキル（Claude）

gospelo-architectはClaude Agent Skillとして使用できます。事前構築されたスキルパッケージは`.github/skills/gospelo-architect/`にあります。

### スキルZIPのビルド

```bash
# Agent Skills ZIPを生成
bun run build:skill
# または
npm run build:skill
```

**出力**: `dist/skills/gospelo-architect-skill.zip`（約7KB）

**内容**:
- `SKILL.md` - スキル定義（ルートに配置）
- `references/` - CLIリファレンス、Builder API、スキーマドキュメント

### スキルZIP構造

```
gospelo-architect-skill.zip
├── SKILL.md              # スキル定義（ルート）
└── references/
    ├── builder-api.md    # DiagramBuilder APIリファレンス
    ├── cli-reference.md  # CLIコマンドリファレンス
    └── schema.md         # TypeScript型とJSONサンプル
```

### スキルZIPライセンス

生成された`gospelo-architect-skill.zip`はメインパッケージと同じMITライセンスでライセンスされています。以下のことが自由にできます：
- Claudeプロジェクトでスキルを使用
- スキル定義を修正
- スキルを再配布（帰属表示付き）

## ライセンス

[MIT](https://github.com/gospelo-dev/architect-skill/blob/main/LICENSE.md)

## リポジトリ

https://github.com/gospelo-dev/architect-skill
