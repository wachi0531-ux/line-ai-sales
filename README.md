# ミニUTAGE風 自動化システム（フェーズ1〜3）

AI活用無料診断の導線（LP → 診断フォーム → 診断結果 → Supabase保存）と、回答を確認できる管理画面を実装しています。
フェーズ2としてLINE Messaging API送信、フェーズ3としてStripe決済と会員ページURLの自動表示・保存を追加しています。

## 技術構成
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase
- LINE Messaging API
- Stripe Checkout Sessions API
- Vercel対応

## セットアップ
1. 依存関係をインストール
   ```bash
   npm install
   ```
2. 環境変数を設定
   ```bash
   cp .env.example .env.local
   ```
   `.env.local` に以下を設定してください。
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`（任意。設定するとRLSの影響を受けにくくなります）
   - `LINE_CHANNEL_ACCESS_TOKEN`（LINE Messaging APIのチャネルアクセストークン）
   - `STRIPE_SECRET_KEY`（Stripeのシークレットキー）
   - `STRIPE_PRICE_ID`（Stripeで作成した商品価格ID。例：`price_...`）
   - `NEXT_PUBLIC_APP_URL`（ローカルは `http://localhost:3000`、本番はVercel URL）
   - `MEMBER_PAGE_URL`（決済完了後に表示・保存する会員ページURL）

3. Supabaseテーブル作成
   - `supabase/schema.sql` をSQL Editorで実行
   - 既存テーブルに追加する場合は、以下のカラムを追加してください。
     - LINE用：`line_user_id`、`line_message_status`、`line_message_error`、`line_message_sent_at`
     - Stripe用：`stripe_checkout_session_id`、`stripe_payment_intent_id`、`payment_status`、`payment_completed_at`、`member_page_url`

4. 開発サーバー起動
   ```bash
   npm run dev
   ```

## 画面
- `/` : LPページ
- `/diagnosis` : 診断フォーム
- `/diagnosis/result` : 診断結果ページ・Stripe決済CTA
- `/payment/success` : Stripe決済完了後の会員ページURL表示
- `/admin` : 管理画面

## LINE Messaging API連携
- 診断フォームの「LINEユーザーID（任意）」に送信先ユーザーIDを入力すると、診断完了後にLINEへ診断結果をプッシュ送信します。
- LINEユーザーIDまたは `LINE_CHANNEL_ACCESS_TOKEN` が未設定の場合、診断保存は継続し、LINE送信だけをスキップします。
- LINE送信の結果は `line_message_status` に `sent` / `skipped` / `failed` として保存され、管理画面で確認できます。
- 現段階ではテスト用にLINEユーザーIDをフォーム入力します。今後はLIFF、LINE Login、Webhook経由で自動取得する設計へ拡張できます。

## Stripe決済連携
- 診断結果ページの「Stripeで決済して会員ページを受け取る」ボタンからStripe Checkoutへ遷移します。
- Checkout Sessionには診断回答IDを `metadata[diagnosis_lead_id]` として保存するため、決済完了後に顧客情報へ紐づけできます。
- 決済完了後、`/payment/success?session_id=...` でStripeのCheckout Sessionを確認します。
- `payment_status` が `paid` の場合、`MEMBER_PAGE_URL` を画面に自動表示し、Supabaseの `member_page_url` に保存します。
- Stripe Webhookはまだ実装していません。フェーズ3ではリダイレクト後の確認で保存し、今後 `checkout.session.completed` Webhookでより確実に保存する設計へ拡張できます。

## 将来拡張しやすい設計ポイント
- 診断ロジックは `lib/diagnosis.ts` に分離
- LINE送信処理は `lib/line.ts` に分離
- Stripe連携処理は `lib/stripe.ts` に分離
- 保存APIは `app/api/diagnosis/route.ts` として独立
- 今後、LINE登録導線・メール配信・決済Webhook・会員認証をAPI追加で拡張可能
