# Gospelo Architect

**あなたが説明する。AI がデザインする。図が現れる。**

システムアーキテクチャ図を作成する新しいパラダイム：人間が意図を伝え、AI エージェントがデザインとレイアウトを担当します。手動でドラッグしたり、ピクセル単位で調整したりする必要はありません。欲しいものを説明するだけで、あとは AI にお任せください。

AI エージェント時代のために構築されています。従来の図作成ツールでは、人間が手動でアイコンを配置し線を引く必要がありましたが、gospelo-architect は AI エージェントが自律的に動作できるようにゼロから設計されています。JSON 定義を読み取り、プロフェッショナルな図を生成し、人間のフィードバックに基づいて反復的に改善します。

## なぜ Gospelo Architect なのか？

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

| ID  | 難易度 | 構成                           | 例                                       | プロンプト例                                                                                                                                                                                                              |
| :-: | :----: | ------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  1  |   ★    | サーバーレス REST API          | EC サイト API、モバイル BFF              | `API Gateway から複数の Lambda（ユーザー API、注文 API、商品 API）にルーティングし、それぞれ DynamoDB にアクセス、CloudWatch Logs でログ収集する構成を作成して`                                                           |
|  2  |   ★    | 典型的な Web アプリ            | 社内ポータル、CMS                        | `ALB から複数の EC2 に分散、RDS（プライマリ・リードレプリカ）と ElastiCache に接続、CloudWatch でメトリクス監視する構成を作成して`                                                                                        |
|  3  |   ★    | コンテナアプリ                 | SaaS バックエンド、API サーバー          | `ALB から ECS Fargate の複数タスクに分散、RDS Aurora と Secrets Manager に接続、CloudWatch Container Insights で監視する構成を設計して`                                                                                   |
|  4  |   ★★   | 認証付き API                   | 会員制サービス、マイページ               | `Cognito で認証後、API Gateway から複数の Lambda にルーティング、DynamoDB と S3 にアクセス、CloudWatch でログ・メトリクス収集する構成を作成して`                                                                          |
|  5  |   ★★   | 非同期メッセージ処理           | 注文処理、通知配信                       | `API Gateway → Lambda → SNS → 複数の SQS キューにファンアウト、各キューを別々の Lambda で処理、DLQ でエラー処理、CloudWatch でキュー監視する構成を作成して`                                                               |
|  6  |   ★★   | ワークフロー                   | 承認フロー、バッチ処理                   | `EventBridge から Step Functions を起動、並列で複数の Lambda を実行、成功時は DynamoDB に保存・SNS で通知、失敗時は SQS に退避する構成を設計して`                                                                         |
|  7  |   ★★   | キャッシング                   | 商品検索、ランキング表示                 | `API Gateway → Lambda → ElastiCache（キャッシュヒット時は即返却）、キャッシュミス時は RDS から取得して ElastiCache に書き込み、CloudWatch でヒット率監視する構成を作成して`                                               |
|  8  |   ★★   | データレイク                   | ログ分析、BI ダッシュボード              | `S3 にデータ投入 → Glue Crawler でカタログ化 → Athena と QuickSight の両方からクエリ、Glue ETL で別の S3 に変換出力、CloudWatch でジョブ監視する構成を作成して`                                                           |
|  9  |   ★★   | ストリーミング処理             | クリックストリーム分析、リアルタイム集計 | `Kinesis Data Streams → Lambda で変換 → DynamoDB と S3 の両方に出力、Kinesis Data Analytics で集計、CloudWatch でストリーム監視・SNS でアラート通知する構成を作成して`                                                    |
| 10  |   ★★   | CI/CD パイプライン             | 自動デプロイ、継続的デリバリー           | `CodeCommit → CodeBuild（並列でテスト・ビルド・セキュリティスキャン）→ ECR にプッシュ → CodePipeline で承認後 ECS にデプロイ、失敗時は SNS 通知する構成を設計して`                                                        |
| 11  |  ★★★   | リアルタイム IoT 分析          | スマート工場、車両テレマティクス         | `IoT Core → Kinesis Data Streams → Lambda で変換、Timestream と S3 の両方に保存、Grafana でリアルタイム可視化、CloudWatch でデバイス監視・SNS で異常アラートする構成を作成して`                                           |
| 12  |  ★★★   | マルチリージョン災害対策       | グローバル EC、金融システム              | `Route 53 で複数リージョンにルーティング、各リージョンに CloudFront → ALB → ECS Fargate、Aurora Global Database でレプリケーション、CloudWatch でヘルスチェック・SNS でフェイルオーバー通知する構成を作成して`            |
| 13  |  ★★★   | マイクロサービス＋イベント駆動 | EC サイト全体、予約システム              | `API Gateway → 複数の Lambda マイクロサービス、各サービスが DynamoDB に書き込み → DynamoDB Streams → EventBridge → 別のサービスに連携、SQS で非同期処理、X-Ray でトレーシングする構成を設計して`                          |
| 14  |  ★★★   | ゼロトラストセキュリティ       | AI チャットボット、社内 LLM              | `WAF → CloudFront → Cognito で認証 → API Gateway → VPC 内の Lambda、Secrets Manager から認証情報取得、VPC Endpoint 経由で Bedrock と DynamoDB にアクセス、CloudTrail で監査ログする構成を作成して`                        |
| 15  |  ★★★   | イベントソーシング＋ CQRS      | 在庫管理、取引履歴                       | `API Gateway から書き込み用 Lambda → Kinesis → イベント保存 Lambda → DynamoDB、DynamoDB Streams → 読み取りモデル更新 Lambda → ElastiCache、別の API Gateway から読み取り専用 Lambda でキャッシュクエリする構成を設計して` |
| 16  |  ★★★   | 分岐する ML パイプライン       | レコメンド、感情分析                     | `S3 アップロード → Lambda で前処理 → Step Functions で SageMaker 学習と Comprehend 分析を並列実行、結果を S3 に集約、Athena で両方の出力をクエリ、CloudWatch でパイプライン監視・SNS で完了通知する構成を作成して`        |

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
