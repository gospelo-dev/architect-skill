# Gospelo モデル仕様 1.0

## 編集者

- Gorosun (NoStudio LLC)

## 概要

gospelo は、視覚的なダイアグラム、フローチャート、シーケンス図、その他の構造化された視覚表現を記述するための JSON ベースのフォーマットです。このフォーマットは以下の特徴を持つように設計されています:

- **AI ネイティブ**: AI エージェントが容易に読み書き可能
- **拡張可能**: 互換性を損なわずに任意の拡張をサポート
- **プラットフォーム非依存**: 異なるプラットフォームやツールでレンダリング可能
- **人間が読みやすい**: デバッグや手動編集のための明確な JSON 構造

## 本ドキュメントのステータス

これは gospelo の 1.0 仕様です。

## 目次

1. [はじめに](#1-はじめに)
2. [設計目標](#2-設計目標)
3. [ファイル拡張子と MIME タイプ](#3-ファイル拡張子と-mime-タイプ)
4. [JSON 構造](#4-json-構造)
5. [Asset](#5-asset)
6. [Documents](#6-documents)
7. [Resources](#7-resources)
8. [Nodes](#8-nodes)
9. [Connections](#9-connections)
10. [Extensions](#10-extensions)
11. [スキーマリファレンス](#11-スキーマリファレンス)

---

## 1. はじめに

### 1.1 背景

現代のソフトウェア開発では、視覚的なダイアグラムへの依存が高まっています:

- システムアーキテクチャのドキュメント
- API フローの可視化
- ダイアグラムとしてのインフラストラクチャ
- シーケンス図と状態図

gospelo は、AI エージェントが生成、修正、解釈できる標準化されたフォーマットを提供しつつ、人間が読みやすくバージョン管理に適した形式を維持します。

### 1.2 スコープ

この仕様では以下を定義します:

- gospelo ドキュメントの JSON 構造
- コアドキュメントタイプ（diagram、flowchart、sequence）
- 再利用可能なアイコン定義のための Resources メカニズム
- カスタム機能のための Extension メカニズム
- バリデーションルールと制約

### 1.3 表記規則

本ドキュメントにおける「MUST」「MUST NOT」「REQUIRED」「SHALL」「SHALL NOT」「SHOULD」「SHOULD NOT」「RECOMMENDED」「MAY」「OPTIONAL」というキーワードは、[RFC 2119](https://www.ietf.org/rfc/rfc2119.txt) に記載されている通りに解釈されるものとします。

---

## 2. 設計目標

### 2.1 AI ネイティブ設計

gospelo は AI エージェントが以下を行えるように設計されています:

- 自然言語から完全なダイアグラムを生成
- 既存のダイアグラムを段階的に修正
- 構造化されたデータを通じてダイアグラムのセマンティクスを理解

### 2.2 拡張性

- すべてのオブジェクトが `extensions` と `extras` プロパティをサポート
- 拡張機能は互換性を損なわずに新しい機能を追加可能
- ベンダー固有の拡張機能を標準の拡張機能と並行してサポート

### 2.3 最小限のコア

コア仕様では必須機能のみを定義:

- 基本的なノードタイプ（icon、group、text）
- 接続タイプ
- レイアウトヒント
- リソース定義

高度な機能（アニメーション、インタラクティビティ、カスタムレンダラー）は拡張機能を通じて提供されます。

---

## 3. ファイル拡張子と MIME タイプ

### 3.1 ファイル拡張子

| 拡張子          | 説明                         |
| --------------- | ---------------------------- |
| `.gospelo`      | gospelo JSON ドキュメント    |
| `.gospelo.json` | 代替の JSON 拡張子           |

### 3.2 MIME タイプ

| MIME タイプ                | 説明                      |
| -------------------------- | ------------------------- |
| `application/gospelo+json` | gospelo JSON ドキュメント |

---

## 4. JSON 構造

### 4.1 概要

gospelo ドキュメントは以下の構造を持つ JSON オブジェクトです:

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

| プロパティ           | 型       | 必須     | 説明                                           |
| -------------------- | -------- | -------- | ---------------------------------------------- |
| `asset`              | object   | **Yes**  | gospelo ドキュメントに関するメタデータ         |
| `extensionsUsed`     | string[] | No       | このドキュメントで使用される拡張機能の名前     |
| `extensionsRequired` | string[] | No       | このドキュメントの読み込みに必要な拡張機能の名前 |
| `documents`          | object[] | No       | ドキュメント定義の配列                         |
| `extensions`         | object   | No       | 拡張機能固有のデータ                           |
| `extras`             | any      | No       | アプリケーション固有のデータ                   |

### 4.3 プロパティの命名規則

正規のプロパティ命名規則は **camelCase** です。

ただし、実装では利便性のために **snake_case** を代替入力形式として受け入れてもよい（MAY）です（例: `borderColor` の代わりに `border_color`）。両方の形式がサポートされる場合、実装は内部的に snake_case を camelCase に変換すべき（SHOULD）です。

| 正規（camelCase）     | 代替（snake_case）       |
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

### 5.1 概要

`asset` プロパティには gospelo ドキュメントに関するメタデータが含まれます。

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

### 5.2 プロパティ

| プロパティ   | 型     | 必須    | 説明                                         |
| ------------ | ------ | ------- | -------------------------------------------- |
| `version`    | string | **Yes** | gospelo 仕様バージョン（例: "1.0"）          |
| `generator`  | string | No      | このドキュメントを生成したツール             |
| `copyright`  | string | No      | コンテンツ帰属のための著作権メッセージ       |
| `minVersion` | string | No      | 必要な最小 gospelo バージョン                |
| `extensions` | object | No      | 拡張機能固有のデータ                         |
| `extras`     | any    | No      | アプリケーション固有のデータ                 |

### 5.3 バージョン形式

バージョン文字列は `<major>.<minor>` のパターンに従わなければなりません（MUST）:

- `major`: メジャーバージョン番号（整数）
- `minor`: マイナーバージョン番号（整数）

例: `"1.0"`, `"2.1"`

---

## 6. Documents

### 6.1 概要

`documents` 配列には、1 つ以上の視覚的なドキュメント定義が含まれます。各ドキュメントには、その構造を決定する `type` があります。

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

### 6.2 ドキュメントタイプ

| タイプ      | 説明                                       |
| ----------- | ------------------------------------------ |
| `diagram`   | 汎用のノードと接続のダイアグラム           |
| `flowchart` | 判断ノードとフローロジックを持つフローチャート |
| `sequence`  | アクターとメッセージを持つシーケンス図     |

### 6.3 共通ドキュメントプロパティ

すべてのドキュメントタイプは以下のプロパティを共有します:

| プロパティ   | 型         | 必須    | 説明                           |
| ------------ | ---------- | ------- | ------------------------------ |
| `type`       | string     | **Yes** | ドキュメントタイプ識別子       |
| `title`      | string     | No      | ドキュメントタイトル           |
| `subtitle`   | string     | No      | ドキュメントサブタイトル       |
| `background` | Background | No      | 背景設定                       |
| `metadata`   | object     | No      | カスタムメタデータ             |
| `extensions` | object     | No      | 拡張機能固有のデータ           |
| `extras`     | any        | No      | アプリケーション固有のデータ   |

### 6.4 Diagram ドキュメント

`diagram` タイプはノードと接続のダイアグラムを定義します:

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

#### 6.4.1 Diagram プロパティ

| プロパティ    | 型            | 必須    | 説明                                            |
| ------------- | ------------- | ------- | ----------------------------------------------- |
| `type`        | `"diagram"`   | **Yes** | ドキュメントタイプ                              |
| `resources`   | ResourceMap   | No      | 再利用可能なリソース定義                        |
| `nodes`       | Node[]        | **Yes** | ノード定義の配列                                |
| `connections` | Connection[]  | No      | 接続定義の配列                                  |
| `colors`      | ColorMap      | No      | 名前付きカラー定義                              |
| `render`      | RenderOptions | No      | レンダリングヒント（width、height、iconSize、fontSize） |

---

## 7. Resources

### 7.1 概要

Resources は、ノード ID で参照できる再利用可能なアイコンとメタデータ定義を作成するメカニズムを提供します。これにより一貫性が促進され、重複が削減されます。

```json
{
  "resources": {
    "@api": { "icon": "aws:api_gateway", "desc": "Main API endpoint" },
    "@lambda": { "icon": "aws:lambda", "desc": "Business logic handler" },
    "@db": { "icon": "aws:dynamodb", "desc": "Data storage" }
  }
}
```

### 7.2 Resource プロパティ

| プロパティ | 型     | 必須 | 説明                                   |
| ---------- | ------ | ---- | -------------------------------------- |
| `icon`     | string | No   | アイコン識別子（例: `"aws:lambda"`）   |
| `desc`     | string | No   | リソースの役割の説明                   |

**注**: `icon` プロパティはオプションです。アイコンなしのリソースは、composite ノードや text_box など、アイコンを持たないがリソースとして追跡が必要なノードタイプに使用されます。

### 7.3 ID 規則

リソース ID は AI による一意識別のために `@` プレフィックスで始めなければなりません（MUST）:

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

### 7.4 アイコン解決

ノードをレンダリングする際、アイコンは以下の順序で解決されます:

1. ノードの明示的な `icon` プロパティ（最優先）
2. リソースの `icon` プロパティ（ノード ID がリソースキーと一致する場合）
3. `undefined`（アイコンなし）

```json
{
  "resources": {
    "@api": { "icon": "aws:api_gateway" }
  },
  "nodes": [{ "id": "@api", "icon": "aws:lambda" }]
}
```

結果: ノードは `aws:api_gateway`（リソース）ではなく `aws:lambda`（明示的）を使用します。

### 7.5 バリデーションルール

- **すべてのノードは対応するリソースエントリを持たなければなりません（MUST）**（一意識別のため）
- 各リソース ID は最大で 1 つのノードで使用されなければなりません（MUST）
- リソースの `icon` は icon タイプのノードには必須、text_box/group/label ノードにはオプションです

---

## 8. Nodes

### 8.1 概要

ノードはダイアグラムの基本的な構成要素です。

### 8.2 共通ノードプロパティ

| プロパティ    | 型               | 必須    | 説明                                                          |
| ------------- | ---------------- | ------- | ------------------------------------------------------------- |
| `id`          | string           | **Yes** | 一意識別子（`@` で始まりリソースと一致する必要あり（MUST））  |
| `type`        | NodeType         | No      | ノードタイプ（デフォルト: `"icon"`）                          |
| `label`       | string           | No      | メインラベルテキスト                                          |
| `sublabel`    | string           | No      | サブラベルテキスト                                            |
| `position`    | [number, number] | No      | [x, y] 位置                                                   |
| `size`        | [number, number] | No      | [width, height] サイズ                                        |
| `parentId`    | string           | No      | 親ノード ID（グループノードの子には必須）                     |
| `borderColor` | string           | No      | ボーダーカラー（16 進コードまたはカラー名）                   |
| `extensions`  | object           | No      | 拡張機能固有のデータ                                          |
| `extras`      | any              | No      | アプリケーション固有のデータ                                  |

### 8.3 ノードタイプ

#### 8.3.1 Icon ノード

```json
{
  "id": "@lambda",
  "type": "icon",
  "icon": "aws:lambda",
  "label": "Lambda"
}
```

| プロパティ | 型     | 説明                                   |
| ---------- | ------ | -------------------------------------- |
| `icon`     | string | アイコン識別子（例: `"aws:lambda"`）   |

#### 8.3.2 Group ノード

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

| プロパティ      | 型                             | 説明                                                            |
| --------------- | ------------------------------ | --------------------------------------------------------------- |
| `children`      | Node[]                         | 子ノード（各ノードはこのグループの `id` を参照する `parentId` を持つ必要がある） |
| `layout`        | `"horizontal"` \| `"vertical"` | 子のレイアウト方向                                              |
| `labelPosition` | LabelPosition                  | ラベル配置                                                      |
| `borderColor`   | string                         | ボーダーカラー（16 進コードまたは `colors` マップのカラー名）   |
| `groupIcon`     | string                         | グループヘッダーのオプションアイコン                            |

**注意**: グループ内の子ノードは、親グループの `id` を参照する `parentId` を指定しなければなりません（MUST）。

#### 8.3.3 Composite ノード

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

| プロパティ | 型        | 説明                     |
| ---------- | --------- | ------------------------ |
| `icons`    | IconRef[] | アイコン参照の配列       |

#### 8.3.4 Text Box ノード

```json
{
  "id": "note1",
  "type": "text_box",
  "label": "Important Note",
  "sublabel": "This component handles authentication"
}
```

#### 8.3.5 Label ノード

```json
{
  "id": "title",
  "type": "label",
  "label": "Production Environment"
}
```

#### 8.3.6 Person ノード

```json
{
  "id": "user",
  "type": "person",
  "label": "End User"
}
```

利用可能な person タイプ: `person`, `person_pc_mobile`, `pc_mobile`, `pc`

---

## 9. Connections

### 9.1 概要

接続はノード間の関係を定義します。

```json
{
  "from": "@api",
  "to": "@database",
  "type": "data",
  "label": "SQL Queries"
}
```

### 9.2 Connection プロパティ

| プロパティ      | 型              | 必須    | デフォルト     | 説明                         |
| --------------- | --------------- | ------- | -------------- | ---------------------------- |
| `from`          | string          | **Yes** | -              | ソースノード ID              |
| `to`            | string          | **Yes** | -              | ターゲットノード ID          |
| `type`          | ConnectionType  | No      | `"data"`       | 接続タイプ                   |
| `label`         | string          | No      | `""`           | 接続ラベル                   |
| `style`         | ConnectionStyle | No      | `"orthogonal"` | 線スタイル                   |
| `color`         | string          | No      | -              | 線の色                       |
| `width`         | number          | No      | `2`            | 線の幅                       |
| `bidirectional` | boolean         | No      | `false`        | 双方向接続                   |
| `fromSide`      | AnchorSide      | No      | auto           | 出口側                       |
| `toSide`        | AnchorSide      | No      | auto           | 入口側                       |
| `extensions`    | object          | No      | -              | 拡張機能固有のデータ         |
| `extras`        | any             | No      | -              | アプリケーション固有のデータ |

### 9.3 接続タイプ

| タイプ | 説明                   |
| ------ | ---------------------- |
| `data` | データフロー接続       |
| `auth` | 認証/認可フロー        |
| `flow` | 一般的な制御フロー     |

### 9.4 接続スタイル

| スタイル     | 説明           |
| ------------ | -------------- |
| `solid`      | 実線           |
| `dashed`     | 破線           |
| `dotted`     | 点線           |
| `orthogonal` | 直角パス       |
| `curved`     | 曲線パス       |

---

## 10. Extensions

### 10.1 概要

gospelo はコア仕様を超えた機能を追加するための拡張機能をサポートしています。

### 10.2 拡張機能の命名

拡張機能は以下の命名規則に従います:

| プレフィックス | 説明                 | 例                  |
| -------------- | -------------------- | ------------------- |
| `GOSPELO_`     | 公式拡張機能         | `GOSPELO_animation` |
| `EXT_`         | マルチベンダー拡張機能 | `EXT_interactive`   |
| `<VENDOR>_`    | ベンダー固有         | `ACME_custom_nodes` |

### 10.3 拡張機能の使用

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

### 10.4 Extensions と Extras の比較

| 特徴             | Extensions                | Extras                     |
| ---------------- | ------------------------- | -------------------------- |
| 目的             | 標準化された機能          | アプリケーション固有のデータ |
| スキーマ         | 拡張機能仕様で定義        | 任意の有効な JSON          |
| 相互運用性       | クロスツールサポートを期待 | ツール固有               |

### 10.5 フォールバック動作

ローダーが未知の拡張機能に遭遇した場合:

- `extensionsRequired` にある場合: 読み込みに失敗しなければなりません（MUST）
- `extensionsUsed` のみにある場合: 無視して続行すべき（SHOULD）

---

## 11. スキーマリファレンス

### 11.1 型定義

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

### 11.2 オブジェクトスキーマ

#### Background

`type: "white"` の場合:

```json
{
  "type": "white"
}
```

`type: "solid"` の場合:

```json
{
  "type": "solid",
  "color": "#f5f5f5"
}
```

`type: "gradient"` の場合:

```json
{
  "type": "gradient",
  "startColor": "#ffffff",
  "endColor": "#f0f0f0",
  "direction": "south"
}
```

| プロパティ   | 型                | 必須    | 説明                                         |
| ------------ | ----------------- | ------- | -------------------------------------------- |
| `type`       | BackgroundType    | **Yes** | 背景タイプ                                   |
| `color`      | string            | No      | 単色（`solid` タイプの場合）                 |
| `startColor` | string            | No      | グラデーション開始色（`gradient` タイプの場合） |
| `endColor`   | string            | No      | グラデーション終了色（`gradient` タイプの場合） |
| `direction`  | GradientDirection | No      | グラデーション方向（デフォルト: `"south"`）  |

#### Resource

```json
{
  "icon": "aws:lambda",
  "desc": "Business logic handler"
}
```

| プロパティ | 型     | 必須    | 説明               |
| ---------- | ------ | ------- | ------------------ |
| `icon`     | string | **Yes** | アイコン識別子     |
| `desc`     | string | No      | リソースの説明     |

#### IconRef

```json
{
  "id": "icon1",
  "icon": "aws:lambda",
  "label": "Optional Label"
}
```

#### RenderOptions

ドキュメントのレンダリングヒント。

```json
{
  "width": 1200,
  "height": 800,
  "iconSize": 48,
  "fontSize": 11
}
```

| プロパティ | 型     | デフォルト | 説明                           |
| ---------- | ------ | ---------- | ------------------------------ |
| `width`    | number | 1200       | キャンバス幅（ピクセル）       |
| `height`   | number | 800        | キャンバス高さ（ピクセル）     |
| `iconSize` | number | 48         | デフォルトアイコンサイズ（ピクセル） |
| `fontSize` | number | 11         | デフォルトフォントサイズ（ピクセル） |

#### ColorMap

```json
{
  "primary": "#0073BB",
  "secondary": "#FF9900"
}
```

### 11.3 デフォルトカラー

以下のカラーがデフォルトで提供されます:

| 名前     | 値        |
| -------- | --------- |
| `blue`   | `#0073BB` |
| `orange` | `#FF9900` |
| `dark`   | `#232F3E` |
| `gray`   | `#666666` |

---

## ライセンス

この仕様は [クリエイティブ・コモンズ 表示 4.0 国際ライセンス（CC BY 4.0）](https://creativecommons.org/licenses/by/4.0/deed.ja) の下でライセンスされています。

あなたは以下の条件に従う限り、自由に:

- **共有** - いかなる媒体やフォーマットでも資料をコピーし、再配布することができます
- **翻案** - いかなる目的でも、資料をリミックスし、変換し、それに基づいて構築することができます（営利目的も含む）

以下の条件に従う必要があります:

- **表示** - 適切なクレジットを表示し、ライセンスへのリンクを提供し、変更が加えられたかどうかを示す必要があります。

---

## 謝辞

- gospelo プロジェクトへのすべての貢献者

---

**gospelo** は gospelo プロジェクトの商標です。
