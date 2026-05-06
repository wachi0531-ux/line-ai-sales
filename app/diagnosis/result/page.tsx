import Link from 'next/link';
import { diagnosisContents } from '@/lib/diagnosis';
import { getSupabaseServer } from '@/lib/supabase-server';
import { DiagnosisType } from '@/types/diagnosis';

type LeadResult = {
  name: string;
  problem: string;
  consultation_interest: string;
  line_message_status: 'sent' | 'skipped' | 'failed' | null;
};

export default async function ResultPage({ searchParams }: { searchParams: { id?: string; type?: DiagnosisType } }) {
  const type = (searchParams.type || 'C') as DiagnosisType;
  const content = diagnosisContents[type];
  const supabase = getSupabaseServer();

  let lead: LeadResult | null = null;
  if (searchParams.id && supabase) {
    const { data } = await supabase
      .from('diagnosis_leads')
      .select('name, problem, consultation_interest, line_message_status')
      .eq('id', searchParams.id)
      .single();
    lead = data;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="rounded-xl border border-slate-200 p-8 shadow-sm">
        <h1 className="text-2xl font-bold">診断結果</h1>
        <p className="mt-4 text-slate-700">{lead?.name ? `${lead.name}さんの結果です。` : 'あなたの結果です。'}</p>
        <p className="mt-6 rounded bg-blue-50 p-3 font-semibold text-brand-600">{content.title}</p>
        <LineStatus status={lead?.line_message_status} />
        <Section title="現在の課題" body={content.issue} />
        <Section title="おすすめのAI活用方法" body={content.aiUsage} />
        <div className="mt-6">
          <h2 className="font-semibold">次にやるべき3ステップ</h2>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-slate-700">
            {content.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        <Link href="/diagnosis" className="mt-8 inline-block rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-500">
          個別相談に進む（仮）
        </Link>
      </div>
    </main>
  );
}

function LineStatus({ status }: { status?: 'sent' | 'skipped' | 'failed' | null }) {
  const message = {
    sent: '診断結果をLINEにも送信しました。',
    skipped: 'LINEユーザーIDまたはトークン未設定のため、LINE送信はスキップされました。',
    failed: 'LINE送信に失敗しました。管理画面でエラー内容を確認してください。'
  }[status || 'skipped'];

  return <p className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">{message}</p>;
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-6">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-slate-700">{body}</p>
    </div>
  );
}
