import { supabaseServer } from '@/lib/supabase-server';

export default async function AdminPage() {
  const { data } = await supabaseServer
    .from('diagnosis_leads')
    .select('name, email, problem, diagnosis_type, consultation_interest, created_at')
    .order('created_at', { ascending: false });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold">診断回答 管理画面</h1>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {['名前', 'メールアドレス', '悩み', '診断タイプ', '個別相談への興味', '登録日時'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.map((row, i) => (
              <tr key={i} className="border-t">
                <td className="px-4 py-3">{row.name}</td>
                <td className="px-4 py-3">{row.email}</td>
                <td className="px-4 py-3">{row.problem}</td>
                <td className="px-4 py-3">{row.diagnosis_type}</td>
                <td className="px-4 py-3">{row.consultation_interest}</td>
                <td className="px-4 py-3">{new Date(row.created_at).toLocaleString('ja-JP')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
