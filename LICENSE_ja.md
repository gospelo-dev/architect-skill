# MIT ライセンス

Copyright (c) 2025 NoStudio LLC

以下に定める条件に従い、本ソフトウェアおよび関連文書のファイル（以下「ソフトウェア」）の複製を取得するすべての人に対し、ソフトウェアを無制限に扱うことを無償で許可します。これには、ソフトウェアの複製を使用、複写、変更、結合、掲載、頒布、サブライセンス、および/または販売する権利、およびソフトウェアを提供する相手に同じことを許可する権利も無制限に含まれます。

上記の著作権表示および本許諾表示を、ソフトウェアのすべての複製または重要な部分に記載するものとします。

ソフトウェアは「現状のまま」で、明示であるか暗黙であるかを問わず、何らの保証もなく提供されます。ここでいう保証とは、商品性、特定の目的への適合性、および権利非侵害についての保証も含みますが、それに限定されるものではありません。作者または著作権者は、契約行為、不法行為、またはそれ以外であろうと、ソフトウェアに起因または関連し、あるいはソフトウェアの使用またはその他の扱いによって生じる一切の請求、損害、その他の義務について何らの責任も負わないものとします。

---

## サードパーティアイコンの帰属表示

本ソフトウェアは、以下のソースから CDN URL 経由でアイコンを参照しています。
アイコン自体は本ソフトウェアと共に再配布されていません。

### AWS Architecture Icons

- **ソース**: https://github.com/AwesomeLogos/aws-icons
- **オリジナル**: https://aws.amazon.com/architecture/icons/
- **ライセンス**: Apache License 2.0
- **著作権**: Amazon Web Services, Inc.

### Azure Icons

- **ソース**: https://github.com/benc-uk/icon-collection
- **オリジナル**: https://learn.microsoft.com/en-us/azure/architecture/icons/
- **ライセンス**: MIT License
- **著作権**: Ben Coleman

### Google Cloud Icons

- **ソース**: https://github.com/AwesomeLogos/google-cloud-icons
- **オリジナル**: https://cloud.google.com/icons
- **ライセンス**: Apache License 2.0
- **著作権**: Google LLC

### Simple Icons (Tech Stack)

- **ソース**: https://github.com/simple-icons/simple-icons
- **ウェブサイト**: https://simpleicons.org/
- **ライセンス**: CC0 1.0 Universal (パブリックドメイン)
- **著作権**: Simple Icons Collaborators

### NoStudio Icons

- **ライセンス**: All Rights Reserved（無断複製・転載を禁ず）
- **著作権**: Gorosun (NoStudio LLC)

NoStudio Icons は gospelo-architect のために作成されたオリジナルアイコンです。これらのアイコンは以下の行為が禁止されています：
- gospelo-architect パッケージから分離してコピーまたは抽出すること
- 改変または二次的著作物の作成
- 独立した再配布
- gospelo-architect パッケージ外での使用

---

## アイコンカタログデータの制限

アイコンカタログデータは gospelo CDN (architect.gospelo.dev) から配信されており、上記の MIT ライセンスの対象**ではありません**。

**All Rights Reserved（無断複製・転載を禁ず）** - Copyright (c) 2025 Gorosun (NoStudio LLC)

アイコンカタログデータ（CDN から配信される JSON ファイル）は以下の行為が禁止されています：
- 再配布目的でのダウンロードおよびキャッシュ
- gospelo-architect ツール外での使用目的でのコピーまたは抽出
- 改変または二次的著作物の作成
- 競合するアイコンカタログサービスの作成に使用すること
- gospelo-architect または gospelo-architect-editor 以外のツールからのアクセス

**許可される使用：**
- gospelo-architect パッケージを意図された目的（ダイアグラム生成）で使用すること
- gospelo-architect-editor でのダイアグラム作成
- 通常の動作中の一時的なクライアント側キャッシュ

この制限はカタログのデータ構造と編纂物に適用され、アイコン自体（上記に記載された各所有者の財産）には適用されません。

---

## プレビュー HTML 出力の制限

`preview` コマンドは、内部レビュー目的で Base64 埋め込みアイコンを含む HTML ファイルを生成します。

**内部使用のみ**

- プレビュー HTML ファイルは、内部レビューおよび AI 支援編集ワークフロー用です
- プレビュー HTML ファイルの再配布は厳禁です
- 配布には、CDN からアイコンを読み込む標準の `render` コマンドを使用してください

この制限が存在する理由：
- プレビューファイルはアイコンデータを直接埋め込むため、サードパーティアイコンのライセンスと抵触する可能性があります
- サードパーティアイコンには、帰属表示を要求したりバンドルを禁止する特定の再配布条件があります

---

## ユーザー生成コンテンツ

gospelo-architect、gospelo-architect-editor、または関連ツールを使用する際、ユーザーは独自のコンテンツを作成することができます。

**所有権：**
- ユーザーがアップロードしたアイコンおよびユーザーが作成したカタログは、各ユーザーの所有物です
- ユーザーが作成したダイアグラムおよびドキュメント（AI を利用して生成したものを含む）は、各ユーザーの所有物です
- ユーザーが作成した Gospelo モデルファイル（.gospelo、.gospelo.json）（AI を利用して生成したものを含む）は、各ユーザーの所有物です
- NoStudio LLC はユーザー生成コンテンツに対していかなる所有権も主張しません

**ユーザーの責任：**
- ユーザーは、追加するアイコンやコンテンツを使用、アップロード、配布する権利を有していることを確認する責任を単独で負います
- ユーザーは、アップロードしたコンテンツに起因する著作権侵害、商標権侵害、その他の法的問題について責任を負います
- NoStudio LLC は、ユーザー生成コンテンツに関連するいかなる請求、損害、紛争についても責任を負いません

**免責事項：**
- NoStudio LLC はツールを「現状のまま」で提供し、ユーザー生成コンテンツに関していかなる保証も行いません
- ユーザーは、ツールの使用に起因する請求から NoStudio LLC を免責し、損害を与えないことに同意します

---

## cli-ext.sh の追加ライセンス

`cli-ext.sh` スクリプトは、Puppeteer を使用した HTML から画像/PDF への変換機能を提供します。
この機能を使用すると、以下の追加ソフトウェアが自動的にダウンロードされ使用されます：

### Puppeteer

- **ウェブサイト**: https://pptr.dev/
- **ソース**: https://github.com/puppeteer/puppeteer
- **ライセンス**: Apache License 2.0
- **著作権**: Google Inc.

### Chromium

Puppeteer はヘッドレスブラウザレンダリング用に、互換性のある Chromium のバージョンを自動的にダウンロードします。

- **ウェブサイト**: https://www.chromium.org/
- **ソース**: https://chromium.googlesource.com/chromium/src
- **ライセンス**: BSD スタイルライセンス（コンポーネントにより異なる）
- **著作権**: The Chromium Authors

**注記**: Chromium には以下を含む様々なオープンソースライセンスのコンポーネントが含まれています：
- BSD 3-Clause License
- MIT License
- Apache License 2.0
- LGPL（一部メディアコーデック、有効な場合）

Chromium のライセンス一覧については以下を参照してください：
https://source.chromium.org/chromium/chromium/src/+/main:LICENSE

**重要**: `cli-ext.sh` を使用する際は、本プロジェクトの MIT ライセンスに加えて、Puppeteer および Chromium のライセンスにも準拠する必要があります。

### 画像/PDF 出力の制限

`cli-ext.sh` のコマンド（`html2png`、`html2jpg`、`html2pdf`）は、HTML 入力から画像および PDF ファイルを生成します。これらの出力の配布権は、ソース HTML によって異なります：

**`preview` コマンドから生成した場合（Base64 埋め込みアイコン）：**
- **内部使用のみ** - プレビュー HTML と同じ制限が適用されます
- 再配布は厳禁です
- 生成された画像/PDF には埋め込みアイコンデータが含まれており、サードパーティアイコンのライセンスと抵触する可能性があります

**`html`/`svg` コマンドから生成した場合（CDN 参照アイコン）：**
- サードパーティアイコンのライセンス準拠を条件に、配布が許可されます
- ユーザーは各アイコンのライセンス（AWS、Azure、GCP 等）に準拠する必要があります
- 商用利用の場合、各アイコンの商標ガイドラインを確認してください

**ユーザーの責任：**
- ユーザーは、生成した画像/PDF がすべての適用されるライセンスに準拠していることを確認する責任を単独で負います
- NoStudio LLC は、生成物の配布に起因するライセンス違反について責任を負いません

---

## 使用上の注意

- アイコンは実行時に CDN（jsDelivr、GitHub Raw）から動的に読み込まれます
- 本ソフトウェアはアイコンファイルをバンドルまたは再配布しません
- ユーザーはアイコンの使用時に各ライセンスを遵守してください
- 商用利用の場合、各アイコンの商標ガイドラインを確認してください

---

**注意**: 本ドキュメントは参考のための日本語訳です。法的には英語版 (LICENSE.md) が正式な文書となります。
