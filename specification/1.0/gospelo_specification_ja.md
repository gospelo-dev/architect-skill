# gospelo™ 仕様書 1.0

## 編集者

- Gorosun

## 概要

gospelo は、視覚的なダイアグラム、フローチャート、シーケンス図、その他の構造化された視覚表現を記述するための JSON ベースのフォーマットです。このフォーマットは以下の特徴を持つように設計されています：

- **AI ネイティブ**: AI エージェントが容易に読み書き可能
- **拡張可能**: 互換性を損なわずに任意の拡張をサポート
- **プラットフォーム非依存**: 異なるプラットフォームやツールでレンダリング可能
- **人間可読**: デバッグや手動編集のための明確な JSON 構造

## 本文書の状態

これは gospelo の初期 1.0 仕様です。

## 目次

1. [はじめに](#1-はじめに)
2. [設計目標](#2-設計目標)
3. [ファイル拡張子と MIME タイプ](#3-ファイル拡張子と-mime-タイプ)
4. [JSON 構造](#4-json-構造)
5. [Asset](#5-asset)
6. [Documents](#6-documents)
7. [Nodes](#7-nodes)
8. [Connections](#8-connections)
9. [Extensions](#9-extensions)
10. [スキーマリファレンス](#10-スキーマリファレンス)
11. [付録 A: 完全なスキーマ](#付録-a-完全なスキーマ)
12. [付録 B: 拡張レジストリ](#付録-b-拡張レジストリ)

---

## 1. はじめに

### 1.1 動機

現代のソフトウェア開発では、視覚的なダイアグラムへの依存度が高まっています：
- システムアーキテクチャのドキュメント
- API フローの視覚化
- Infrastructure as Diagrams
- シーケンス図と状態図

gospelo は、AI エージェントが生成、修正、解釈できる標準化されたフォーマットを提供しながら、人間可読かつバージョン管理に適した形式を維持します。

### 1.2 スコープ

本仕様書は以下を定義します：
- gospelo ドキュメントの JSON 構造
- コアドキュメントタイプ（diagram、flowchart、sequence）
- カスタム機能のための拡張メカニズム
- バリデーションルールと制約

### 1.3 表記規則

本文書における「しなければならない（MUST）」「してはならない（MUST NOT）」「要求される（REQUIRED）」「することになる（SHALL）」「することはない（SHALL NOT）」「すべきである（SHOULD）」「すべきでない（SHOULD NOT）」「推奨される（RECOMMENDED）」「してもよい（MAY）」「選択できる（OPTIONAL）」は [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt) に従って解釈されます。

---

## 2. 設計目標

### 2.1 AI ネイティブ設計

gospelo は AI エージェントが以下を行えるように設計されています：
- 自然言語から完全なダイアグラムを生成
- 既存のダイアグラムを段階的に修正
- 構造化データを通じてダイアグラムの意味を理解

### 2.2 拡張性

- すべてのオブジェクトは `extensions` と `extras` プロパティをサポート
- 拡張は互換性を損なわずに新しい機能を追加可能
- ベンダー固有の拡張は標準拡張と並行してサポート

### 2.3 最小限のコア

コア仕様は必須機能のみを定義します：
- 基本ノードタイプ（icon、group、text）
- 接続タイプ
- レイアウトヒント

高度な機能（アニメーション、インタラクティブ性、カスタムレンダラー）は拡張を通じて提供されます。

---

## 3. ファイル拡張子と MIME タイプ

### 3.1 ファイル拡張子

| 拡張子 | 説明 |
|--------|------|
| `.gospelo` | gospelo JSON ドキュメント |
| `.gospelo.json` | 代替 JSON 拡張子 |

### 3.2 MIME タイプ

| MIME タイプ | 説明 |
|-------------|------|
| `application/gospelo+json` | gospelo JSON ドキュメント |

---

## 4. JSON 構造

### 4.1 概要

gospelo ドキュメントは以下の構造を持つ JSON オブジェクトです：

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

### 4.2 ルートプロパティ

| プロパティ | 型 | 必須 | 説明 |
|------------|------|------|------|
| `asset` | object | **はい** | gospelo ドキュメントのメタデータ |
| `extensionsUsed` | string[] | いいえ | このドキュメントで使用される拡張の名前 |
| `extensionsRequired` | string[] | いいえ | このドキュメントの読み込みに必要な拡張の名前 |
| `documents` | object[] | いいえ | ドキュメント定義の配列 |
| `extensions` | object | いいえ | 拡張固有のデータ |
| `extras` | any | いいえ | アプリケーション固有のデータ |

### 4.3 プロパティ命名規則

正規のプロパティ命名規則は **camelCase** です。

ただし、実装は利便性のために **snake_case** を代替入力形式として受け入れてもよい（MAY）です（例：`borderColor` の代わりに `border_color`）。両方の形式がサポートされる場合、実装は内部的に snake_case を camelCase に変換すべきです（SHOULD）。

| 正規 (camelCase) | 代替 (snake_case) |
|-----------------|-------------------|
| `borderColor` | `border_color` |
| `startColor` | `start_color` |
| `endColor` | `end_color` |
| `labelPosition` | `label_position` |
| `parentId` | `parent_id` |
| `fromSide` | `from_side` |
| `toSide` | `to_side` |
| `groupIcon` | `group_icon` |
| `iconSize` | `icon_size` |
| `fontSize` | `font_size` |

---

## 5. Asset

### 5.1 概要

`asset` プロパティは gospelo ドキュメントのメタデータを含みます。

```json
{
  "asset": {
    "version": "1.0",
    "generator": "gospelo-architect@0.1.0",
    "copyright": "© 2025 Example Corp",
    "minVersion": "1.0"
  }
}
```

### 5.2 プロパティ

| プロパティ | 型 | 必須 | 説明 |
|------------|------|------|------|
| `version` | string | **はい** | gospelo 仕様バージョン（例："1.0"） |
| `generator` | string | いいえ | このドキュメントを生成したツール |
| `copyright` | string | いいえ | コンテンツ帰属のための著作権メッセージ |
| `minVersion` | string | いいえ | 必要な最小 gospelo バージョン |
| `extensions` | object | いいえ | 拡張固有のデータ |
| `extras` | any | いいえ | アプリケーション固有のデータ |

### 5.3 バージョン形式

バージョン文字列は `<major>.<minor>` のパターンに従わなければなりません（MUST）：
- `major`: メジャーバージョン番号（整数）
- `minor`: マイナーバージョン番号（整数）

例：`"1.0"`、`"2.1"`

---

## 6. Documents

### 6.1 概要

`documents` 配列は1つ以上の視覚ドキュメント定義を含みます。各ドキュメントはその構造を決定する `type` を持ちます。

```json
{
  "documents": [
    {
      "type": "diagram",
      "title": "システムアーキテクチャ",
      "nodes": [ ... ],
      "connections": [ ... ]
    }
  ]
}
```

### 6.2 ドキュメントタイプ

| タイプ | 説明 |
|--------|------|
| `diagram` | 汎用のノードと接続のダイアグラム |
| `flowchart` | 判断ノードとフローロジックを持つフローチャート |
| `sequence` | アクターとメッセージを持つシーケンス図 |

### 6.3 共通ドキュメントプロパティ

すべてのドキュメントタイプは以下のプロパティを共有します：

| プロパティ | 型 | 必須 | 説明 |
|------------|------|------|------|
| `type` | string | **はい** | ドキュメントタイプ識別子 |
| `title` | string | いいえ | ドキュメントタイトル |
| `subtitle` | string | いいえ | ドキュメントサブタイトル |
| `background` | Background | いいえ | 背景設定 |
| `metadata` | object | いいえ | カスタムメタデータ |
| `extensions` | object | いいえ | 拡張固有のデータ |
| `extras` | any | いいえ | アプリケーション固有のデータ |

### 6.4 Diagram ドキュメント

`diagram` タイプはノードと接続のダイアグラムを定義します：

```json
{
  "type": "diagram",
  "title": "AWS アーキテクチャ",
  "nodes": [
    {
      "id": "lambda",
      "type": "icon",
      "icon": "aws:lambda",
      "label": "Lambda Function"
    }
  ],
  "connections": [
    {
      "from": "api",
      "to": "lambda"
    }
  ]
}
```

#### 6.4.1 Diagram プロパティ

| プロパティ | 型 | 必須 | 説明 |
|------------|------|------|------|
| `type` | `"diagram"` | **はい** | ドキュメントタイプ |
| `nodes` | Node[] | **はい** | ノード定義の配列 |
| `connections` | Connection[] | いいえ | 接続定義の配列 |
| `colors` | ColorMap | いいえ | 名前付きカラー定義 |
| `render` | RenderOptions | いいえ | レンダリングヒント |

### 6.5 Flowchart ドキュメント

`flowchart` タイプはフロー固有のセマンティクスを持つダイアグラムを拡張します：

```json
{
  "type": "flowchart",
  "title": "ユーザー登録フロー",
  "nodes": [
    {
      "id": "start",
      "type": "terminal",
      "label": "開始"
    },
    {
      "id": "check",
      "type": "decision",
      "label": "有効？"
    }
  ],
  "flows": [
    {
      "from": "start",
      "to": "check"
    },
    {
      "from": "check",
      "to": "success",
      "condition": "yes"
    }
  ]
}
```

### 6.6 Sequence ドキュメント

`sequence` タイプはアクター間の相互作用を定義します：

```json
{
  "type": "sequence",
  "title": "ログインシーケンス",
  "actors": [
    { "id": "user", "label": "ユーザー" },
    { "id": "api", "label": "API サーバー" }
  ],
  "messages": [
    {
      "from": "user",
      "to": "api",
      "label": "POST /login"
    }
  ]
}
```

---

## 7. Nodes

### 7.1 概要

ノードはダイアグラムの基本的な構成要素です。

### 7.2 共通ノードプロパティ

| プロパティ | 型 | 必須 | 説明 |
|------------|------|------|------|
| `id` | string | **はい** | ドキュメント内で一意の識別子 |
| `type` | NodeType | いいえ | ノードタイプ（デフォルト：`"icon"`） |
| `label` | string | いいえ | プライマリラベルテキスト |
| `sublabel` | string | いいえ | セカンダリラベルテキスト |
| `position` | [number, number] | いいえ | [x, y] 位置 |
| `size` | [number, number] | いいえ | [width, height] サイズ |
| `parentId` | string | いいえ | 親ノード ID（グループの子ノードに必須） |
| `borderColor` | string | いいえ | ボーダーの色（16進コードまたはカラー名） |
| `extensions` | object | いいえ | 拡張固有のデータ |
| `extras` | any | いいえ | アプリケーション固有のデータ |

### 7.3 ノードタイプ

#### 7.3.1 Icon ノード

```json
{
  "id": "lambda",
  "type": "icon",
  "icon": "aws:lambda",
  "label": "Lambda"
}
```

| プロパティ | 型 | 説明 |
|------------|------|------|
| `icon` | string | アイコン識別子（例：`"aws:lambda"`） |

#### 7.3.2 Group ノード

```json
{
  "id": "vpc",
  "type": "group",
  "label": "VPC",
  "borderColor": "blue",
  "layout": "horizontal",
  "labelPosition": "top-center",
  "children": [
    { "id": "subnet1", "type": "icon", "icon": "aws:subnet", "parentId": "vpc" }
  ]
}
```

| プロパティ | 型 | 説明 |
|------------|------|------|
| `children` | Node[] | 子ノード（各子は `parentId` にこのグループの `id` を設定すべき） |
| `layout` | `"horizontal"` \| `"vertical"` | 子のレイアウト方向 |
| `labelPosition` | LabelPosition | ラベルの配置 |
| `borderColor` | string | ボーダーの色（16進コードまたは `colors` マップのカラー名） |
| `groupIcon` | string | グループヘッダーのオプションアイコン |

**注意**: グループ内の子ノードは、適切な階層表現のために親グループの `id` を参照する `parentId` を指定すべきです（SHOULD）。

#### 7.3.3 Composite ノード

```json
{
  "id": "server",
  "type": "composite",
  "label": "アプリケーションサーバー",
  "icons": [
    { "id": "java", "icon": "tech:java" },
    { "id": "spring", "icon": "tech:spring" }
  ]
}
```

| プロパティ | 型 | 説明 |
|------------|------|------|
| `icons` | IconRef[] | アイコン参照の配列 |

#### 7.3.4 Text Box ノード

```json
{
  "id": "note1",
  "type": "text_box",
  "label": "重要な注記",
  "sublabel": "このコンポーネントは認証を処理します"
}
```

#### 7.3.5 Label ノード

```json
{
  "id": "title",
  "type": "label",
  "label": "本番環境"
}
```

#### 7.3.6 Person ノード

```json
{
  "id": "user",
  "type": "person",
  "label": "エンドユーザー"
}
```

利用可能な person タイプ：`person`、`person_pc_mobile`、`pc_mobile`、`pc`

---

## 8. Connections

### 8.1 概要

接続はノード間の関係を定義します。

```json
{
  "from": "api",
  "to": "database",
  "type": "data",
  "label": "SQL クエリ"
}
```

### 8.2 接続プロパティ

| プロパティ | 型 | 必須 | 説明 |
|------------|------|------|------|
| `from` | string | **はい** | ソースノード ID |
| `to` | string | **はい** | ターゲットノード ID |
| `type` | ConnectionType | いいえ | 接続タイプ |
| `label` | string | いいえ | 接続ラベル |
| `style` | ConnectionStyle | いいえ | 線のスタイル |
| `color` | string | いいえ | 線の色 |
| `width` | number | いいえ | 線の幅 |
| `bidirectional` | boolean | いいえ | 双方向接続 |
| `fromSide` | AnchorSide | いいえ | 出口側 |
| `toSide` | AnchorSide | いいえ | 入口側 |
| `extensions` | object | いいえ | 拡張固有のデータ |
| `extras` | any | いいえ | アプリケーション固有のデータ |

### 8.3 接続タイプ

| タイプ | 説明 |
|--------|------|
| `data` | データフロー接続 |
| `auth` | 認証/認可フロー |
| `flow` | 一般的な制御フロー |

### 8.4 接続スタイル

| スタイル | 説明 |
|----------|------|
| `solid` | 実線 |
| `dashed` | 破線 |
| `dotted` | 点線 |
| `orthogonal` | 直角パス |
| `curved` | 曲線パス |

---

## 9. Extensions

### 9.1 概要

gospelo はコア仕様を超えた機能を追加するための拡張をサポートします。

### 9.2 拡張の命名規則

拡張は以下の命名規則に従います：

| プレフィックス | 説明 | 例 |
|----------------|------|-----|
| `GOSPELO_` | 公式拡張 | `GOSPELO_animation` |
| `EXT_` | マルチベンダー拡張 | `EXT_interactive` |
| `<VENDOR>_` | ベンダー固有 | `ACME_custom_nodes` |

### 9.3 拡張の使用

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

### 9.4 Extensions vs Extras

| 機能 | Extensions | Extras |
|------|------------|--------|
| 目的 | 標準化された機能 | アプリケーション固有のデータ |
| スキーマ | 拡張仕様で定義 | 任意の有効な JSON |
| 相互運用性 | クロスツールサポートが期待される | ツール固有 |

### 9.5 フォールバック動作

ローダーが不明な拡張に遭遇した場合：
- `extensionsRequired` に含まれる場合：読み込みに失敗しなければならない（MUST）
- `extensionsUsed` のみに含まれる場合：無視して続行すべきである（SHOULD）

---

## 10. スキーマリファレンス

### 10.1 型定義

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

### 10.2 オブジェクトスキーマ

#### Background
```json
{
  "type": "gradient",
  "startColor": "#ffffff",
  "endColor": "#f0f0f0",
  "direction": "south"
}
```

#### IconRef
```json
{
  "id": "icon1",
  "icon": "aws:lambda",
  "label": "オプションラベル"
}
```

#### RenderOptions
```json
{
  "width": 1200,
  "height": 800,
  "iconSize": 48,
  "fontSize": 11
}
```

#### ColorMap
```json
{
  "primary": "#0073BB",
  "secondary": "#FF9900"
}
```

---

## 付録 A: 完全なスキーマ

gospelo 1.0 の完全な JSON スキーマは以下で利用可能です：
- [gospelo.schema.json](./schema/gospelo.schema.json)

---

## 付録 B: 拡張レジストリ

### 公式拡張 (GOSPELO_)

| 拡張 | ステータス | 説明 |
|------|----------|------|
| `GOSPELO_animation` | ドラフト | ノードの入場/退場アニメーション |
| `GOSPELO_interactive` | ドラフト | クリックハンドラーとツールチップ |
| `GOSPELO_themes` | ドラフト | 定義済みビジュアルテーマ |

### マルチベンダー拡張 (EXT_)

| 拡張 | ステータス | 説明 |
|------|----------|------|
| `EXT_custom_icons` | 提案 | カスタムアイコン定義 |

---

## ライセンス

本仕様書は [Creative Commons Attribution 4.0 International License (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/) の下でライセンスされています。

あなたは以下の自由を持ちます：
- **共有** — いかなる媒体や形式でも資料をコピーおよび再配布できます
- **翻案** — 商用を含むいかなる目的でも、資料をリミックス、変形、および二次的著作物を作成できます

以下の条件の下で：
- **表示** — 適切なクレジットを表示し、ライセンスへのリンクを提供し、変更があった場合はその旨を示す必要があります。

---

## 謝辞

- gospelo プロジェクトへのすべての貢献者

---

**gospelo™** は gospelo プロジェクトの商標です。
