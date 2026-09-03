# マイナポータル 自己情報取得API 連携

妊婦であることの確認を、自治体が保有する**妊婦健診情報**で行うための実装。画像を受け取らずに済むので、氏名・住所を預からずに確認できる。方式の比較は [verification.md](./verification.md)。

---

## いまの状態

| | 状態 |
|---|---|
| 画面遷移・state 管理・PKCE・トークン交換・判定ロジック | **実装済み**（本番と同じ経路） |
| 外部との実通信 | **モック**（`MYNA_MODE=mock`） |
| 本番接続 | 利用申請の承認待ち。承認後 `MYNA_MODE=live` で切り替わる |

**モックは「同意ボタンを押したら成功する」だけのものではない。** 認可画面の代わりに `/verify/myna/consent` を出し、そこで選んだシナリオが認可コードに乗って本番と同じ経路を流れる。自治体未対応・記録なし・健診が古い・予定日のずれ、といった分岐を実装を触らずに画面から確認できる。

```
ok            健診の記録あり・予定日も一致        → 確認済みになる
due_shifted   記録の分娩予定日が登録とずれている  → 確認済み＋登録の予定日を記録に合わせて更新
unsupported   自治体が連携に未対応                → 母子健康手帳の経路へ誘導
no_data       健診の記録が見つからない            → 反映待ちの案内
stale         直近の健診が半年以上前              → 最新の健診が反映されてから、と案内
```

## コードの地図

```
src/lib/myna/
  client.ts    MynaPortalClient の interface と、mock / live の切り替え
  live.ts      本番実装。★差し替えが必要なのはここだけ
  mock.ts      申請中に開発するためのモック
  session.ts   state と PKCE の code_verifier をサーバー側に保持（1回だけ使える）
  decide.ts    取得した情報から通す／通さないを決める純粋関数
  decide.test.ts  その単体テスト（npm test）
  link.ts      begin / complete の2関数。画面から呼ぶのはこれだけ
  types.ts     取り込む情報を最小に絞った型

src/app/verify/myna/
  page.tsx            何を受け取るかの説明と「マイナポータルへ進む」
  consent/page.tsx    モック時だけ出る擬似同意画面（live では 404）
  callback/route.ts   戻り先。state 検証 → 取得 → 判定 → 反映
```

処理の流れ：

```
利用者                    マタマッチ                     マイナポータル
  │  「進む」               │                                  │
  ├───────────────────────>│ state と code_verifier を保存      │
  │<── 認可URLへリダイレクト ┤                                  │
  ├────────────────────────┼─────────────────────────────────>│ 同意 + カード読み取り
  │<───────────────────────┼── code & state でコールバック ────┤
  │                        │ state を消費（再利用は弾く）        │
  │                        ├── code + verifier → token ──────>│
  │                        ├── 妊婦健診情報を「最新情報指定」で ─>│
  │                        │   decideFromSelfInfo() で判定      │
  │<── 結果を表示 ──────────┤   通れば verified + 予定日を同期    │
```

## 承認後にやること

### 1. 環境変数

```bash
MYNA_MODE="live"
APP_ORIGIN="https://<本番ドメイン>"   # 認可サーバーに登録する戻り先と完全一致させる
MYNA_AUTHORIZE_URL="..."
MYNA_TOKEN_URL="..."
MYNA_SELFINFO_URL="..."
MYNA_CLIENT_ID="..."
MYNA_CLIENT_SECRET="..."
MYNA_SCOPE="..."
```

`APP_ORIGIN` を設定しない場合はリクエストのホストから戻り先を組み立てる（開発用）。**本番では必ず設定する** — 認可サーバーに登録した redirect_uri と1文字でも違うと弾かれる。

### 2. レスポンスの項目名

`src/lib/myna/live.ts` 冒頭の `FIELD` 定数を、仕様書に書かれた中間標準レイアウトの項目名に置き換える。

```ts
const FIELD = {
  checkupList: "ninpuKenshinList",      // ← 仕様書の項目名に
  examinedOn: "jushinYmd",
  gestationalWeeks: "ninshinShusu",
  expectedBirthDate: "bunbenYoteiYmd",
  unsupportedCode: "NOT_SUPPORTED_MUNICIPALITY",
};
```

**ここの値は推測で置いてある。** 仕様書を入手するまで確定できないため、1箇所にまとめて差し替えやすくしてある。`parseMaternityResponse()` は日付が `20260901` でも `2026-09-01` でも解釈できるようにしてあり、単体テストもある。

### 3. 認可フローの細部

いまは PKCE（S256）つきの標準的な認可コードフローとして実装している。仕様書のフローが異なる場合は `live.ts` の `buildAuthorizeUrl` / `exchangeCode` を合わせる。**`link.ts` と `decide.ts` は触らなくてよい。**

## 利用申請の手続き

デジタル庁の公開情報によると、おおむね次の順で進む。**開発より先に着手すべき**（審査と接続試験に時間がかかる）。

| # | 段階 | 内容 |
|---|---|---|
| 1 | 利用検討 | マイナポータルAPI仕様公開サイトから、利用ガイドライン・利用規約・仕様書一式を入手する（仕様書取得フォーム） |
| 2 | 事前打合せの申込 | 申請様式一式をダウンロードし、必要書類を作成して申し込む |
| 3 | 事前打合せ | 事業者・デジタル庁・マイナポータル運営主体で実施 |
| 4 | 審査 | 申請内容の確認 |
| 5 | 開発 | ここは先行して進められる（本リポジトリの現状） |
| 6 | 接続試験 | **テスト用マイナンバーカードが必要。J-LIS へ貸与申請する** |
| 7 | 本番動作確認 | 開始予定日の**3週間前まで**に本番環境の利用申請を提出 |
| 8 | サービス提供前確認 | |

### 申請中に開発を進めたい場合

ポケットサインが「PocketSign MynaConnect」という、マイナポータルAPIとの接続を仲介する開発プラットフォームを提供している。**利用申請中でも本番と同じ仕様で開発できる**と説明されている。NEC もマイナポータルAPI連携サービスを提供している。自前で認可フローを持たずに済むなら、`live.ts` をそれらの SDK 呼び出しに置き換える形になる。

## 押さえておくべき制約

1. **全国はカバーできない。** 母子保健（妊婦健診）情報連携に対応した **PMH 事業実施自治体**に住んでいる利用者しか取得できない。だから母子健康手帳の経路を必ず併存させる。未対応だったときに「エラー」ではなく「方法2をどうぞ」と案内する導線は実装済み。
2. **健診の記録には反映のタイムラグがある。** 受診直後は記録が出てこないことがあるので、`no_data` は失敗ではなく「反映待ちかもしれない」と伝えている。
3. **取り込む項目は増やさない。** 受診日と分娩予定日だけを正規化し、健診結果の中身は保存しない（`types.ts`）。同意画面でもそう説明しているので、あとから項目を増やすときは同意文面も一緒に直すこと。
4. **確認は永続ではない。** 出産予定日＋8週で失効する。

## 実装で踏んだ落とし穴（同じ形の事故を避けるために）

- **`request.url` は使えない。** Route Handler の `request.url` はサーバー内部のアドレス（`localhost:PORT`）を返すことがあり、そこへリダイレクトすると Cookie が送られずセッションが切れる。リバースプロキシ配下でも同じことが起きる。オリジンの決め方は `src/lib/origin.ts` に一本化した。
- **`next/link` は GET を先に実行してしまう。** コールバックのような「開いたら状態が変わる」URL を `<Link>` にすると、プリフェッチが state を消費して本番の遷移が「すでに完了しています」で落ちる。素の `<a>` を使う。

## 出典

- [自己情報取得API（マイナポータル）](https://myna.go.jp/html/api/selfinfo/index.html) ／ [同（デジタル庁 開発者向け）](https://developers.digital.go.jp/documents/mynaportal-api/specification/selfinfo/)
- [自己情報取得API 利用ガイドライン（PDF）](https://myna.go.jp/html/api/pdf/api_guideline.pdf)
- [取得情報一覧（自己情報取得API）](https://developers.digital.go.jp/documents/mynaportal-api/related-contents/self-infomation-list/)
- [自己情報取得APIで妊婦健診・乳幼児健診の情報を取得できるか（FAQ）](https://faq.myna.go.jp/faq/show/4474?category_id=133&site_domain=api) ／ [母子保健（妊婦健診）情報連携で取得できる情報（FAQ）](https://faq.myna.go.jp/faq/show/10625?category_id=359&site_domain=api)
- [自己情報取得API（e-Gov APIカタログ）](https://api-catalog.e-gov.go.jp/info/ja/apicatalog/view/39)
- [PocketSign MynaConnect（PR TIMES）](https://prtimes.jp/main/html/rd/p/000000076.000110743.html) ／ [マイナポータルAPI連携サービス（NEC）](https://jpn.nec.com/fintech/myna_portal_api/index.html)
