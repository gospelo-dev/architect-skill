# CLI リファレンス

gospelo-architect のコマンドラインインターフェース完全リファレンス。

## 使用方法

```bash
bun bin/cli.ts <command> [options]
```

## レンダリングコマンド

| コマンド | 説明 |
|---------|------|
| `html <input.json> [output.html]` | スタンドアロン HTML へレンダリング |
| `svg <input.json> [output.svg]` | SVG へレンダリング（CDN アイコン） |
| `svg-embed <input.json> [output.svg]` | Base64 埋め込みアイコン付き SVG へレンダリング |
| `preview <input.json> [output.html]` | 埋め込みアイコン付きプレビュー HTML を生成 |
| `markdown <input.json> [output.zip]` | Markdown + 埋め込み SVG の ZIP を生成 |
| `enrich <input.json> [output.json]` | 計算されたメタデータを追加 |
| `meta <input.json>` | メタデータのみ出力（JSON） |

### 例

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

## 編集コマンド

| コマンド | 説明 |
|---------|------|
| `eval <input.json> '<expr>' [output.json]` | ビルダー 'b' で JS 式を評価 |
| `edit <input.json> <patch.json> [output.json]` | パッチを適用 |
| `add-node <input.json> <node.json> [output.json]` | JSON からノードを追加 |
| `remove-node <input.json> <node-id> [output.json]` | ID でノードを削除 |
| `move-node <input.json> <node-id> <x> <y> [output]` | ノードを移動 |
| `add-connection <input.json> <from> <to> [output]` | 接続を追加 |
| `remove-connection <input.json> <from> <to> [output]` | 接続を削除 |

### 例

```bash
# 新しいノードを追加
bun bin/cli.ts eval diagram.json 'b.addNode({id:"@new",icon:"aws:lambda",label:"New",position:[400,300]})'

# 複数の操作をチェーン
bun bin/cli.ts eval diagram.json 'b.removeNode("@old").addConnection({from:"@a",to:"@b"})'

# ノードを移動して更新
bun bin/cli.ts eval diagram.json 'b.moveNode("@lambda",500,400).setNodeLabel("@lambda","Updated")' --pretty

# 個別コマンドでノードを追加
bun bin/cli.ts add-node diagram.json '{"id":"@cache","icon":"aws:elasticache","label":"Cache","position":[400,300]}'

# ノードを削除
bun bin/cli.ts remove-node diagram.json @old_node

# ノードを移動
bun bin/cli.ts move-node diagram.json @lambda 500 400

# 接続を追加
bun bin/cli.ts add-connection diagram.json @api @lambda
```

## オプション

| オプション | 説明 |
|-----------|------|
| `--width <number>` | 図の幅（デフォルト: 1280） |
| `--height <number>` | 図の高さ（デフォルト: 720） |
| `--paper <size>` | 印刷用の用紙/画面サイズを指定 |
| `--pretty` | JSON 出力を整形 |
| `--in-place` | 入力ファイルを直接変更 |

## 印刷設定

`--paper` オプションで印刷に最適化された出力を生成できます。

### 利用可能なサイズ

**用紙サイズ**: `a1-landscape`, `a1-portrait`, `a2-landscape`, `a2-portrait`, `a3-landscape`, `a3-portrait`, `a4-landscape`, `a4-portrait`, `b1-landscape`, `b1-portrait`, `b2-landscape`, `b2-portrait`, `b3-landscape`, `b3-portrait`, `b4-landscape`, `b4-portrait`

**画面サイズ**: `hd-landscape`, `hd-portrait`, `fhd-landscape`, `fhd-portrait`, `4k-landscape`, `4k-portrait`, `8k-landscape`, `8k-portrait`

### 例

```bash
# A4横向き（オフィス印刷向け）
bun bin/cli.ts html diagram.json output.html --paper a4-landscape

# 4K横向き（大型ディスプレイ向け）
bun bin/cli.ts html diagram.json output.html --paper 4k-landscape

# B2縦向き（ポスター向け）
bun bin/cli.ts html diagram.json output.html --paper b2-portrait
```

詳細は[印刷設定リファレンス](PRINT_SETTINGS.md)を参照してください。

## ビルダーメソッド

`eval` コマンドの式で使用可能なメソッド：

| メソッド | 説明 |
|---------|------|
| `addNode(node)` | 新しいノードを追加 |
| `removeNode(id)` | ID でノードを削除 |
| `moveNode(id, x, y)` または `moveNode(id, [x, y])` | ノードを移動 |
| `setNodeLabel(id, label)` | ノードラベルを更新 |
| `addConnection({from, to, ...})` | 接続を追加 |
| `removeConnection(from, to)` | 接続を削除 |
| `applyPatch(patch)` | 複数の変更を一度に適用 |
| `build()` | 修正された図を取得 |

## Web Claude 互換性

Web Claude で使用する場合、プレビュー SVG を生成します：

```bash
bun bin/cli.ts preview diagram.json
# 出力: Preview SVG generated: /tmp/diagram_preview_xxx.svg
```

### 必要なドメイン

以下のドメインを**機能 > 追加の許可ドメイン**に追加してください：

```
raw.githubusercontent.com
cdn.jsdelivr.net
architect.gospelo.dev
w3.org
```

| ドメイン | 用途 |
|---------|------|
| `raw.githubusercontent.com` | AWS と Google Cloud のアイコン SVG |
| `cdn.jsdelivr.net` | Azure と Tech Stack のアイコン SVG |
| `architect.gospelo.dev` | アイコンカタログ CDN（メタデータ） |
| `w3.org` | SVG 名前空間定義 |
