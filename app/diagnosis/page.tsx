'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const problems = ['集客', '売上', '作業時間', '顧客管理', 'SNS発信'] as const;
const aiExperiences = ['ある', '少しある', 'ない'] as const;
const automationInterests = ['LINE配信', 'メール配信', 'SNS投稿', '顧客管理', '決済後の案内'] as const;
const consultationInterests = ['ある', '少しある', '今は情報だけ欲しい'] as const;

export default function DiagnosisPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError('');
    const payload = Object.fromEntries(formData.entries());

    const res = await fetch('/api/diagnosis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      setError('送信に失敗しました。入力内容を確認して再度お試しください。');
      setLoading(false);
      return;
    }

    const data = await res.json();
    router.push(`/diagnosis/result?id=${data.id}&type=${data.diagnosis_type}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm font-semibold text-brand-600">AI活用無料診断</p>
      <h1 className="mt-2 text-2xl font-bold">無料診断フォーム</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        入力は3分ほどです。LINEユーザーIDを入力すると、診断完了後に結果をLINEにも自動送信します。
      </p>
      <form action={handleSubmit} className="mt-6 space-y-6 rounded-xl border border-slate-200 p-6 shadow-sm">
        <input name="name" required placeholder="名前" className="w-full rounded border p-3" />
        <input name="email" type="email" required placeholder="メールアドレス" className="w-full rounded border p-3" />

        <Select name="problem" label="今一番困っていること" options={problems} />
        <Select name="ai_experience" label="AIを使ったことはありますか？" options={aiExperiences} />
        <Select name="automation_interest" label="自動化したいこと" options={automationInterests} />
        <Select name="consultation_interest" label="個別相談に興味はありますか？" options={consultationInterests} />

        <label className="block">
          <span className="mb-2 block text-sm font-medium">LINEユーザーID（任意）</span>
          <input
            name="line_user_id"
            placeholder="例：Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full rounded border p-3"
          />
          <span className="mt-2 block text-xs leading-5 text-slate-500">
            フェーズ2ではテスト用入力欄です。後ほどLIFFやWebhookで自動取得できる形に拡張できます。
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button disabled={loading} className="w-full rounded-lg bg-brand-600 py-3 font-semibold text-white hover:bg-brand-500 disabled:opacity-60">
          {loading ? '送信中...' : '診断結果を見る'}
        </button>
      </form>
    </main>
  );
}

function Select({ name, label, options }: { name: string; label: string; options: readonly string[] }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <select name={name} required className="w-full rounded border p-3">
        <option value="">選択してください</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
