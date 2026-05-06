import { getSupabaseServer } from '@/lib/supabase-server';

type LeadRow = {
  name: string;
  email: string;
  problem: string;
  diagnosis_type: string;
  consultation_interest: string;
  line_message_status: string | null;
  line_message_error: string | null;
  payment_status: string | null;
  member_page_url: string | null;
  created_at: string;
};

export default async function AdminPage() {
  const supabase = getSupabaseServer();
  const { data, error } = supabase
    ? await supabase
        .from('diagnosis_leads')
        .select('name, email, problem, diagnosis_type, consultation_interest, line_message_status, line_message_error, payment_status, member_page_url, created_at')
        .order('created_at', { ascending: false })
    : { data: null, error: { message: 'Supabase environment variables are missing.' } };

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold">診断回答 管理画面</h1>
      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error.message}</p>}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {['名前', 'メールアドレス', '悩み', '診断タイプ', '個別相談への興味', 'LINE送信', '決済', '会員ページ', '登録日時'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data as LeadRow[] | null)?.map((row, i) => (
              <tr key={i} className="border-t">
                <td className="px-4 py-3">{row.name}</td>
                <td className="px-4 py-3">{row.email}</td>
                <td className="px-4 py-3">{row.problem}</td>
                <td className="px-4 py-3">{row.diagnosis_type}</td>
                <td className="px-4 py-3">{row.consultation_interest}</td>
                <td className="px-4 py-3">
                  <span title={row.line_message_error || undefined}>{row.line_message_status || '未実行'}</span>
                </td>
                <td className="px-4 py-3">{row.payment_status || '未決済'}</td>
                <td className="max-w-64 truncate px-4 py-3">
                  {row.member_page_url ? (
                    <a href={row.member_page_url} className="text-brand-600 hover:underline">
                      {row.member_page_url}
                    </a>
                  ) : (
                    '未発行'
                  )}
                </td>
                <td className="px-4 py-3">{new Date(row.created_at).toLocaleString('ja-JP')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
