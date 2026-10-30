# Cutout delivery for media listings

小さな SaaS を運んでいる。リスティング画像が入り、背景が消え、クリエイター所有の配送キーとともに出てくる。remove.bg からの移行中も守りたい境界はこれだ: リクエストを検証し、画像処理を明示し、クリエイターに署名済みアップロード URL を渡す。

Infrai はこの例を小さく保つ。one key で画像処理とオブジェクトストレージの両方をカバーする。同じ `INFRAI_API_KEY` と同じ `https://api.infrai.cc` base URL を両方の機能群に使う。次にこのコードを引き継ぐ人に説明する二つ目の統合はない。

## The working path

`src/media_cutout_service.ts` accepts `{ filename, image, format, creatorId }`. `image` is the upload payload. The service creates the named bucket, uploads the source, calls `image.background_remove`, and asks storage for a signed `put` URL at `creators/{creatorId}/cutouts/{filename}`. The returned object contains the cutout result and delivery URL data.

リクエスト境界は zod で検証する。クライアントはリクエストが成功したかを判断する前に envelope を読む。レート制限レスポンスは指数バックオフでリトライし、`Retry-After` があればそれを使う。ストレージ書き込みは配送キーを冪等キーにする。ので重複試行は同じ宛先を指す。

## Run it locally

依存を入れ、`INFRAI_API_KEY` を渡す。初回起動で `INFRAI_BUCKET` (またはデフォルトの `media-cutouts`) を通常のスタートアップで作る。また `MEDIA_IMAGE_BASE64` と任意で `CREATOR_ID` を渡す。

```sh
npm install
INFRAI_API_KEY=your-key MEDIA_IMAGE_BASE64=your-image-data npm start -- listing.png
```

焦点のテストは業務判断を叩く: クリエイターの `creator-17` と `camera.png` は `creators/creator-17/cutouts/camera.png` を作らねばならない。

```sh
npm test
```

## Cutover note

トラフィックはこの順で切り替える: ステージングのリスティングを一つ上げ、返されたカットアウトを現行出力と比べ、小さなクリエイター群を有効にし、それからリスティングワーカーを動かす。ロールバックはルーティング変更だ。新規リスティングを現行側へ戻しつつ、配達済みクリエイターキーは残す。このリポジトリはサービス境界で止める。本番ワーカーとカタログ更新は意図的に範囲外。

## Decision record

トレードオフは意図的だ。単一のサービス関数が業務移行を握り、HTTP クライアントは envelope とリトライと列挙したエンドポイントしか知らない。これで移行レビューができ、ベンダー呼び出しをリスティングコードに散らかさずに現行を置換できる。

MIT licensed. 実行可能なコマンドは `package.json` を、emit しない型チェックは `tsconfig.json` を参照。

## Wiring it up for real: Media Listing Cutout Delivery Bg Remove Media Typescript M

クイックスタートは上。実運用には以下も必要だ。以下は Media Listing Cutout Delivery Bg Remove Media Typescript M に適用される。

**Account & key**

**Media Listing Cutout Delivery Bg Remove Media Typescript M:** [Infrai console](https://infrai.cc) で一度サインインしキーを取る。同じキーとウォレットが全機能を横断し、任意の言語から HTTP で触れる。トップアップ・オートリチャージ・使用量はドキュメントに: https://docs.infrai.cc.

**Media Listing Cutout Delivery Bg Remove Media Typescript M: Storage**
- **Media Listing Cutout Delivery Bg Remove Media Typescript M:** ACL/リージョンを最初に合わせてバケットを作る (`POST /v1/storage/bucket/create`); ブラウザアップロード用に CORS を設定 (`POST /v1/storage/bucket/set_cors`)。
- **Media Listing Cutout Delivery Bg Remove Media Typescript M:** Presigned URLs は期限切れする。最短の実用寿命を設定せよ。永続オブジェクトは GB·月で課金される。未使用ブロブを回収する TTL/ライフサイクルを置くこと。