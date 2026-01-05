# gospelo-architect

**あなたが説明する。AI がデザインする。図が現れる。**

システムアーキテクチャ図を作成する新しいパラダイム：人間が意図を伝え、AI エージェントがデザインとレイアウトを担当します。手動でドラッグしたり、ピクセル単位で調整したりする必要はありません。欲しいものを説明するだけで、あとは AI にお任せください。

AI エージェント時代のために構築されています。従来の図作成ツールでは、人間が手動でアイコンを配置し線を引く必要がありましたが、gospelo-architect は AI エージェントが自律的に動作できるようにゼロから設計されています。JSON 定義を読み取り、プロフェッショナルな図を生成し、人間のフィードバックに基づいて反復的に改善します。

## なぜ gospelo-architect なのか？

- **AI ネイティブ設計**: AI エージェントが読み書き・修正できる JSON 形式の定義
- **反復的ワークフロー**: 自然言語で変更を説明し、AI が図を更新
- **プロフェッショナルな出力**: 1,500 以上のクラウドアイコンを備えた本番環境対応の SVG と HTML
- **必要に応じて微調整**: 必要な場合はビジュアルエディタで精密な調整が可能

## 特徴

- **依存関係ゼロ**: 外部ランタイム依存関係のない純粋な TypeScript
- **複数の出力フォーマット**: SVG、HTML、Markdown+SVG ZIP、メタデータ付き JSON
- **増分編集**: プログラムによる図の修正のための流暢なビルダー API
- **クラウドアイコン**: AWS、Azure、Google Cloud、Tech Stack アイコン（1,500 以上）をビルトインサポート
- **リッチツールチップ**: ホバーでリソース ID、アイコン名、ライセンス、説明を表示
- **CLI ツール**: フル機能のコマンドラインインターフェース

## 出力フォーマット

gospelo-architect は様々なユースケースに対応した複数の出力フォーマットをサポートしています：

| フォーマット           | コマンド    | 説明                                                                                   |
| ---------------------- | ----------- | -------------------------------------------------------------------------------------- |
| **HTML**               | `html`      | ホバーツールチップと Shift+ドラッグ複数選択対応のインタラクティブ HTML（CDN アイコン） |
| **SVG**                | `svg`       | CDN アイコン参照のクリーンな SVG                                                       |
| **SVG（埋め込み）**    | `svg-embed` | Base64 埋め込みアイコンの SVG（オフライン対応）                                        |
| **プレビュー HTML**    | `preview`   | オフライン表示用の Base64 埋め込みアイコン HTML                                        |
| **Markdown ZIP**       | `markdown`  | Markdown + 埋め込み SVG を含む ZIP                                                     |
| **JSON（エンリッチ）** | `enrich`    | オリジナル JSON + 計算されたメタデータ（位置、サイズ）                                 |
| **JSON（メタのみ）**   | `meta`      | AI 消費用のメタデータのみ                                                              |

## インストール

```bash
# Bunを使用
bun add gospelo-architect

# npmを使用
npm install gospelo-architect
```

## クイックスタート

AI に欲しいものを説明するだけです：

```
API Gateway、Lambda、DynamoDB を使った AWS アーキテクチャ図を作成して
```

```
静的アセット用の S3 バケットを図に追加して
```

```
Lambda 関数と S3 バケットを接続して
```

```
A4 横向き印刷用に HTML をエクスポートして
```

AI が JSON 定義、配置、接続、レンダリングなど、すべての技術的な詳細を処理します。

## 図定義

JSON スキーマの詳細は [Gospelo Model 1.0 仕様](docs/specs/ja/1.0/GOSPELO_MODEL.md) を参照してください。

## こんなことができます

### 図の作成

```
API Gateway、Lambda、DynamoDB を使ったサーバーレス REST API を作成して
```

```
ALB、EC2、RDS を使った典型的な Web アプリ構成を作成して
```

```
CloudFront と S3 を使った静的サイトホスティング構成を作成して
```

```
ECS Fargate、ALB、RDS Aurora を使ったコンテナアプリ構成を設計して
```

```
新しくCognito 認証付きの API Gateway と Lambda 構成を作成して
```

```
新しくSQS と Lambda を使った非同期メッセージ処理構成を作成して
```

```
新しくEventBridge と Step Functions を使ったワークフロー構成を設計して
```

```
新しくElastiCache Redis を使ったキャッシング構成を作成して
```

```
新しくS3、Glue、Athena を使ったデータレイク構成を作成して
```

```
新しくKinesis と Lambda を使ったストリーミングデータ処理構成を作成して
```

### 図の編集

```
API とデータベースの間にキャッシュレイヤーを追加して
```

```
レガシーサービスを図から削除して
```

```
Lambda 関数を API Gateway の下に移動して
```

### エクスポート

```
A4 用紙印刷用に HTML をエクスポートして
```

```
ドキュメント用に SVG ファイルを生成して
```

```
プレゼンテーション用に 4K バージョンを作成して
```

CLI コマンドの詳細は [CLI リファレンス](docs/references/ja/CLI_REFERENCE.md) を参照してください。

## 印刷・エクスポートオプション

様々なサイズで図をエクスポートできます：

| 用途               | プロンプト例                             |
| ------------------ | ---------------------------------------- |
| オフィス印刷       | 「A4 横向き印刷用にエクスポートして」    |
| プレゼンテーション | 「会議用に A3 バージョンを作成して」     |
| 大型ディスプレイ   | 「モニター用に 4K バージョンを生成して」 |
| ポスター           | 「印刷用に B2 縦向きでエクスポートして」 |

### 高解像度ディスプレイ対応

MacBook や iPhone の Retina ディスプレイ、4K/8K モニターなど、どんな高解像度画面でも**くっきり鮮明**に表示されます。拡大してもぼやけません。

詳細は [印刷設定リファレンス](docs/references/ja/PRINT_SETTINGS.md) を参照してください。

## 反復的な編集

AI は自然な言葉での反復的な編集をサポートしています：

```
Lambda と DynamoDB の間に Redis キャッシュを追加して
```

```
Lambda のラベルを「注文処理」に変更して
```

```
新しいキャッシュを両方のサービスに双方向矢印で接続して
```

プログラムによる編集については [CLI リファレンス](docs/references/ja/CLI_REFERENCE.md) を参照してください。

## アイコンリファレンス

<a href="https://architect.gospelo.dev/icons/v1/"><img src="https://architect.gospelo.dev/icons/v1/og-image.png" alt="" onerror="this.style.display='none'"></a>

アイコンは`provider:name`形式を使用します（例：`aws:lambda`、`azure:functions`、`gcp:cloud_run`、`heroicons:star`）。

AWS、Azure、Google Cloud、Tech Stack、Heroicons、Lucide プロバイダー全体で 3,500 以上のアイコンが利用可能です。

全アイコンを閲覧: [GOSPELO ICONS](https://architect.gospelo.dev/icons/v1/)

## ノードタイプ

| タイプ             | 説明                                   |
| ------------------ | -------------------------------------- |
| `icon`             | ラベル付きの単一アイコン（デフォルト） |
| `group`            | 子ノードのコンテナ                     |
| `composite`        | 単一ノード内の複数アイコン             |
| `text_box`         | テキストのみのノード（アイコン不要）   |
| `person`           | 人物アイコン                           |
| `person_pc_mobile` | PC とモバイルを持つ人物                |
| `pc_mobile`        | PC とモバイルデバイス                  |
| `pc`               | PC デバイス                            |

## 接続タイプ

| タイプ | 説明                         |
| ------ | ---------------------------- |
| `data` | データフロー（矢印付き実線） |
| `auth` | 認証フロー（破線）           |

## Web Claude のセットアップ

Web Claude で gospelo-architect を使用するには、以下のドメインを**機能 > 追加の許可ドメイン**に追加してください：

```
raw.githubusercontent.com
cdn.jsdelivr.net
architect.gospelo.dev
w3.org
```

## エージェントスキル（Claude）

gospelo-architect は Claude Agent Skill として使用できます。事前構築されたスキルパッケージは`.github/skills/gospelo-architect/`にあります。

### スキル ZIP のビルド

```bash
# Agent Skills ZIPを生成
bun run build:skill
# または
npm run build:skill
```

**出力**: `dist/skills/gospelo-architect-skill.zip`（約 7KB）

**内容**:

- `SKILL.md` - スキル定義（ルートに配置）
- `references/` - CLI リファレンス、Builder API、スキーマドキュメント

### スキル ZIP 構造

```
gospelo-architect-skill.zip
├── SKILL.md              # スキル定義（ルート）
└── references/
    ├── builder-api.md    # DiagramBuilder APIリファレンス
    ├── cli-reference.md  # CLIコマンドリファレンス
    └── schema.md         # TypeScript型とJSONサンプル
```

### スキル ZIP ライセンス

生成された`gospelo-architect-skill.zip`はメインパッケージと同じ MIT ライセンスでライセンスされています。以下のことが自由にできます：

- Claude プロジェクトでスキルを使用
- スキル定義を修正
- スキルを再配布（帰属表示付き）

## ライセンス

[MIT](https://github.com/gospelo-dev/architect-skill/blob/main/LICENSE.md)

## リポジトリ

https://github.com/gospelo-dev/architect-skill
