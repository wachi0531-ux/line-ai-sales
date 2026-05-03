# ミニUTAGE風 自動化システム（フェーズ1）

AI活用無料診断の導線（LP → 診断フォーム → 診断結果 → Supabase保存）と、回答を確認できる管理画面を実装しています。

## 技術構成
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase
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

3. Supabaseテーブル作成
   - `supabase/schema.sql` をSQL Editorで実行

4. 開発サーバー起動
   ```bash
   npm run dev
   ```

## 画面
- `/` : LPページ
- `/diagnosis` : 診断フォーム
- `/diagnosis/result` : 診断結果ページ
- `/admin` : 管理画面

## 将来拡張しやすい設計ポイント
- 診断ロジックは `lib/diagnosis.ts` に分離
- 保存APIは `app/api/diagnosis/route.ts` として独立
- 今後、LINE配信・メール配信・決済連携をAPI追加で拡張可能
