# gospelo-architect

**あなたが指示する。AI が設計する。ダイアグラムが生まれる。**

システムアーキテクチャ図を作成する新しいパラダイム：人間は意図を伝え、AI エージェントが設計とレイアウトを担当します。手作業でのドラッグ＆ドロップもピクセル単位の調整も不要 - 欲しいものを説明するだけで、あとは AI にお任せ。

AI エージェント時代のために設計されました。従来のダイアグラムツールは人間がアイコンを手動で配置し線を引く必要がありましたが、gospelo-architect は最初から AI エージェントが自律的に操作できるよう設計されています - JSON 定義を読み取り、プロフェッショナルなダイアグラムを生成し、人間のフィードバックに基づいて反復的に改善します。

## なぜ gospelo-architect？

- **AI ネイティブ設計**: AI エージェントが読み書き・編集できる JSON ベースの定義
- **反復的ワークフロー**: 自然言語で変更を指示し、AI がダイアグラムを更新
- **プロフェッショナルな出力**: 1,500 以上のクラウドアイコンを含む本番品質の SVG と HTML
- **細かい調整も可能**: 必要に応じてビジュアルエディターで微調整

## 特徴

- **ゼロ依存**: 外部ランタイム依存なしの純粋な TypeScript
- **複数の出力形式**: SVG、スタンドアロン HTML、メタデータ付き JSON
- **段階的編集**: プログラマティックなダイアグラム変更のための Fluent Builder API（メソッドチェーン）
- **クラウドアイコン**: AWS、Azure、Google Cloud、Tech Stack アイコンの組み込みサポート（1,500 以上）
- **CLI ツール**: フル機能のコマンドラインインターフェース

## インストール

```bash
# Bunを使用
bun add gospelo-architect

# npmを使用
npm install gospelo-architect
```

## クイックスタート

### CLI 使用例

```bash
# ダイアグラムをHTMLにレンダリング
gospelo-architect render diagram.json output.html

# SVGのみにレンダリング
gospelo-architect svg diagram.json output.svg

# AI用メタデータを追加
gospelo-architect enrich diagram.json enriched.json

# メタデータのみ出力
gospelo-architect meta diagram.json --pretty
```

### プログラマティック使用

```typescript
import { renderShareable, renderSvg, enrichDiagram } from "gospelo-architect";

const diagram = {
  title: "マイアーキテクチャ",
  nodes: [
    { id: "lambda", icon: "aws:lambda", label: "関数", position: [100, 100] },
    {
      id: "db",
      icon: "aws:dynamodb",
      label: "データベース",
      position: [300, 100],
    },
  ],
  connections: [{ from: "lambda", to: "db", type: "data" }],
};

// HTMLにレンダリング
const html = renderShareable(diagram, { width: 800, height: 600 });

// SVGにレンダリング
const svg = renderSvg(diagram);

// メタデータを追加
const enriched = enrichDiagram(diagram);
```

## ダイアグラム定義形式

ダイアグラムは JSON 形式で定義されます:

```json
{
  "title": "システムアーキテクチャ",
  "subtitle": "本番環境",
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
      "label": "バックエンドサービス",
      "position": [100, 200],
      "size": [400, 300],
      "children": [
        { "id": "lambda", "icon": "aws:lambda", "label": "関数" },
        { "id": "db", "icon": "aws:dynamodb", "label": "データベース" }
      ]
    }
  ],
  "connections": [
    { "from": "api", "to": "lambda", "type": "data" },
    { "from": "lambda", "to": "db", "type": "data", "bidirectional": true }
  ]
}
```

## CLI コマンド

### レンダリングコマンド

| コマンド                            | 説明                                      |
| ----------------------------------- | ----------------------------------------- |
| `render <input.json> [output.html]` | スタンドアロン HTML にレンダリング        |
| `svg <input.json> [output.svg]`     | SVG のみにレンダリング                    |
| `enrich <input.json> [output.json]` | 計算済みメタデータを JSON に追加          |
| `meta <input.json>`                 | メタデータのみ出力（JSON 形式で標準出力） |
| `preview <input.json>`              | AI 表示用に SVG を生成しパスを出力        |

### 編集コマンド

| コマンド                                            | 説明                       |
| --------------------------------------------------- | -------------------------- |
| `eval <input.json> '<式>' [output.json]`            | ビルダー'b'で JS 式を評価  |
| `edit <input.json> <patch.json> [output.json]`      | パッチをダイアグラムに適用 |
| `add-node <input.json> <node.json> [output.json]`   | JSON からノードを追加      |
| `remove-node <input.json> <node-id> [output.json]`  | ID でノードを削除          |
| `move-node <input.json> <node-id> <x> <y> [output]` | ノードを位置に移動         |
| `add-connection <input.json> <from> <to> [output]`  | 接続を追加                 |

### オプション

| オプション        | 説明                                |
| ----------------- | ----------------------------------- |
| `--width <数値>`  | ダイアグラム幅（デフォルト: 800）   |
| `--height <数値>` | ダイアグラム高さ（デフォルト: 600） |
| `--pretty`        | JSON 出力を整形                     |
| `--in-place`      | 入力ファイルを直接変更              |

## Builder による段階的編集

`eval`コマンドはダイアグラム変更のための Fluent Builder API を提供します:

```bash
# 新しいノードを追加
bun bin/cli.ts eval diagram.json 'b.addNode({id:"new",icon:"aws:lambda",label:"新規",position:[400,300]})'

# 複数の操作をチェーン
bun bin/cli.ts eval diagram.json 'b.removeNode("old").addConnection({from:"a",to:"b"})'

# ノードの移動と更新
bun bin/cli.ts eval diagram.json 'b.moveNode("lambda",500,400).setNodeLabel("lambda","更新済み")' --pretty
```

### Builder メソッド

| メソッド                                           | 説明                       |
| -------------------------------------------------- | -------------------------- |
| `addNode(node)`                                    | 新しいノードを追加         |
| `removeNode(id)`                                   | ID でノードを削除          |
| `moveNode(id, x, y)` または `moveNode(id, [x, y])` | ノードを位置に移動         |
| `setNodeLabel(id, label)`                          | ノードラベルを更新         |
| `addConnection({from, to, ...})`                   | 接続を追加                 |
| `removeConnection(from, to)`                       | 接続を削除                 |
| `applyPatch(patch)`                                | 複数の変更を一度に適用     |
| `build()`                                          | 変更後のダイアグラムを取得 |

## アイコンリファレンス

アイコンは`provider:name`形式を使用します（例: `aws:lambda`, `azure:functions`, `gcp:cloud_run`, `tech:python`）。

AWS、Azure、Google Cloud、Tech Stack の各プロバイダーで 1,500 以上のアイコンが利用可能です。

アイコンの検索と閲覧については[アイコンカタログ](ICON_CATALOG.md)を参照してください。

### よく使うアイコン

**AWS**: `aws:lambda`, `aws:ec2`, `aws:s3`, `aws:rds`, `aws:dynamodb`, `aws:api_gateway`, `aws:cloudfront`, `aws:cognito`, `aws:sqs`, `aws:sns`

**Azure**: `azure:virtual_machines`, `azure:app_service`, `azure:functions`, `azure:blob_storage`, `azure:cosmos_db`, `azure:sql_database`

**Google Cloud**: `gcp:cloud_run`, `gcp:cloud_functions`, `gcp:compute_engine`, `gcp:cloud_storage`

**Tech Stack**: `tech:python`, `tech:typescript`, `tech:react`, `tech:docker`, `tech:kubernetes`

## ノードタイプ

| タイプ             | 説明                                 |
| ------------------ | ------------------------------------ |
| `icon`             | ラベル付き単一アイコン（デフォルト） |
| `group`            | 子ノードのコンテナ                   |
| `composite`        | 単一ノード内の複数アイコン           |
| `text_box`         | テキストのみのノード                 |
| `person`           | 人物アイコン                         |
| `person_pc_mobile` | PC・モバイル付き人物                 |
| `pc_mobile`        | PC とモバイルデバイス                |
| `pc`               | PC デバイス                          |

## 接続タイプ

| タイプ | 説明                         |
| ------ | ---------------------------- |
| `data` | データフロー（矢印付き実線） |
| `auth` | 認証フロー（破線）           |

## API リファレンス

### コア関数

```typescript
// 共有可能なHTMLにレンダリング（アイコンはCDNから取得）
renderShareable(diagram: DiagramDefinition, options?: RenderOptions): string

// SVGのみにレンダリング
renderSvg(diagram: DiagramDefinition, options?: RenderOptions): string

// 計算済みメタデータをダイアグラムに追加
enrichDiagram(diagram: unknown, options?: RenderOptions): object

// AI用メタデータを生成
generateMeta(diagram: unknown, options?: RenderOptions): DiagramMeta

// 段階的編集用ビルダーを作成
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

## Web Claude 互換性

Web Claude で使用する場合、AI のファイルプレビュー機能を使用してダイアグラムをレンダリングおよび表示できます:

1. `preview`コマンドを使用して一時的な場所に SVG を生成
2. AI が SVG ファイルを読み取り表示

```bash
gospelo-architect preview diagram.json
# 出力: Preview SVG generated: /tmp/diagram_preview_xxx.svg
```

## ライセンス

[MIT](https://github.com/gorosun/gospelo-architect/blob/main/LICENSE.md)

## リポジトリ

https://github.com/gorosun/gospelo-architect
