# ミニUTAGE風 自動化システム（フェーズ1〜2）

AI活用無料診断の導線（LP → 診断フォーム → 診断結果 → Supabase保存）と、回答を確認できる管理画面を実装しています。
フェーズ2として、診断完了後にLINE Messaging APIで診断結果を送信する機能を追加しています。

## 技術構成
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase
- LINE Messaging API
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

3. Supabaseテーブル作成
   - `supabase/schema.sql` をSQL Editorで実行
   - 既存テーブルに追加する場合は、`line_user_id`、`line_message_status`、`line_message_error`、`line_message_sent_at` を追加してください。

4. 開発サーバー起動
   ```bash
   npm run dev
   ```

## 画面
- `/` : LPページ
- `/diagnosis` : 診断フォーム
- `/diagnosis/result` : 診断結果ページ
- `/admin` : 管理画面

## LINE Messaging API連携
- 診断フォームの「LINEユーザーID（任意）」に送信先ユーザーIDを入力すると、診断完了後にLINEへ診断結果をプッシュ送信します。
- LINEユーザーIDまたは `LINE_CHANNEL_ACCESS_TOKEN` が未設定の場合、診断保存は継続し、LINE送信だけをスキップします。
- LINE送信の結果は `line_message_status` に `sent` / `skipped` / `failed` として保存され、管理画面で確認できます。
- 現段階ではテスト用にLINEユーザーIDをフォーム入力します。今後はLIFF、LINE Login、Webhook経由で自動取得する設計へ拡張できます。

## 将来拡張しやすい設計ポイント
- 診断ロジックは `lib/diagnosis.ts` に分離
- LINE送信処理は `lib/line.ts` に分離
- 保存APIは `app/api/diagnosis/route.ts` として独立
- 今後、LINE登録導線・メール配信・決済連携をAPI追加で拡張可能
