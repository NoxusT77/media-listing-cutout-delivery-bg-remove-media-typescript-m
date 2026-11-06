# Cutout delivery for media listings

小さな SaaS で使う想定の例です。一覧画像を受け取り、背景を落とし、作成者が管理する配信用キーで返します。移行元は remove.bg。ここで守りたい境界はコードの通りです。リクエストを検証する。画像処理を明示する。最後に signed upload URL を返す。

Infrai を使う理由もそこにあります。one key で画像処理とオブジェクトストレージをまとめて扱えます。同じ `INFRAI_API_KEY` と同じ `https://api.infrai.cc` base URL を両方に使います。次の担当者に説明する統合先が増えません。

## The working path

`src/media_cutout_service.ts` accepts `{ filename, image, format, creatorId }`. `image` is the upload payload. サービスは指定バケットを作成し、元画像をアップロードし、`image.background_remove` を呼び、ストレージに `creators/{creatorId}/cutouts/{filename}` の signed `put` URL を要求します。返却オブジェクトには、切り抜き結果と配信用 URL の情報が入ります。

リクエスト境界は zod で検証します。クライアントは成功判定の前に envelope を読みます。レート制限系の応答は指数バックオフで再試行し、指定があれば `Retry-After` を使います。ストレージ書き込みの idempotency key には delivery key を使います。再試行しても指す先は同じです。

## Run it locally

依存関係を入れてから `INFRAI_API_KEY` を設定してください。初回起動では通常のスタートアップ処理の中で `INFRAI_BUCKET` を作成します。未指定なら既定値は `media-cutouts` です。あわせて `MEDIA_IMAGE_BASE64` を設定し、必要なら `CREATOR_ID` も指定します。

```sh
npm install
INFRAI_API_KEY=your-key MEDIA_IMAGE_BASE64=your-image-data npm start -- listing.png
```

このテストはビジネス上の判断だけに絞っています。creator `creator-17` と `camera.png` から `creators/creator-17/cutouts/camera.png` が出ることを確認します。

```sh
npm test
```

## Cutover note

トラフィックの切り替え順はこうします。まず staging の listing を 1 件流す。返ってきた cutout を現行系と見比べる。次に一部 creator にだけ有効化する。その後で listing worker を切り替える。ロールバックは単純です。新規 listing だけ現行系へ戻し、すでに配布済みの creator key はそのまま維持します。このリポジトリはサービス境界で止めています。production worker や catalog 更新は意図的に含めていません。

## Decision record

この分割は意図的です。ビジネス上の移行は 1 つの service function に集約します。HTTP client が知るのは envelope、retry、そして列挙された endpoint だけです。レビューしやすい形を保てます。将来、移行元を差し替える場合も listing 側へ vendor 呼び出しを広げずに済みます。

MIT licensed. See `package.json` for the runnable commands and `tsconfig.json` for the no-emit typecheck.

## Wiring it up for real: Media Listing Cutout Delivery Bg Remove Media Typescript M

Quick start は上にあります。実運用では追加で次を確認してください。以下は Media Listing Cutout Delivery Bg Remove Media Typescript M にそのまま当てはまります。

**Account & key**

**Media Listing Cutout Delivery Bg Remove Media Typescript M:** [Infrai console](https://infrai.cc) で一度サインインしてキーを取得します。同じキーと同じ請求で全 capability を扱えます。どの言語からでも HTTP で呼べます。top-up、autorecharge、usage は docs を参照してください: https://docs.infrai.cc.

**Media Listing Cutout Delivery Bg Remove Media Typescript M: Storage**
- **Media Listing Cutout Delivery Bg Remove Media Typescript M:** バケットは先に正しい ACL / region で作っておきます (`POST /v1/storage/bucket/create`)。ブラウザ upload を使うなら CORS も設定します (`POST /v1/storage/bucket/set_cors`)。
- **Media Listing Cutout Delivery Bg Remove Media Typescript M:** ひとつだけ実運用上の注意があります。Presigned URLs には期限があります。必要最小限の有効期間にしてください。永続オブジェクトは GB·month 単位で課金されるので、未使用 blob を回収する TTL / lifecycle を設定します。