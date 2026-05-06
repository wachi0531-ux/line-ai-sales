import Link from 'next/link';
import { diagnosisContents } from '@/lib/diagnosis';
import { getSupabaseServer } from '@/lib/supabase-server';
import { DiagnosisType } from '@/types/diagnosis';

type LeadResult = {
  name: string;
  problem: string;
  consultation_interest: string;
  line_message_status: 'sent' | 'skipped' | 'failed' | null;
  payment_status: string | null;
  member_page_url: string | null;
};

type ResultSearchParams = {
  id?: string;
  type?: DiagnosisType;
  payment?: string;
  payment_error?: string;
};

export default async function ResultPage({ searchParams }: { searchParams: ResultSearchParams }) {
  const type = (searchParams.type || 'C') as DiagnosisType;
  const content = diagnosisContents[type];
  const supabase = getSupabaseServer();

  let lead: LeadResult | null = null;
  if (searchParams.id && supabase) {
    const { data } = await supabase
      .from('diagnosis_leads')
      .select('name, problem, consultation_interest, line_message_status, payment_status, member_page_url')
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
        <PaymentNotice payment={searchParams.payment} paymentError={searchParams.payment_error} />
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
        <PaymentCta leadId={searchParams.id} diagnosisType={type} paymentStatus={lead?.payment_status} memberPageUrl={lead?.member_page_url} />
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

function PaymentNotice({ payment, paymentError }: { payment?: string; paymentError?: string }) {
  if (paymentError) {
    return <p className="mt-4 rounded border border-red-100 bg-red-50 p-3 text-sm text-red-700">決済を開始できませんでした：{paymentError}</p>;
  }
  if (payment === 'cancelled') {
    return <p className="mt-4 rounded border border-amber-100 bg-amber-50 p-3 text-sm text-amber-700">Stripe決済はキャンセルされました。必要な場合は下のボタンから再開できます。</p>;
  }
  return null;
}

function PaymentCta({
  leadId,
  diagnosisType,
  paymentStatus,
  memberPageUrl
}: {
  leadId?: string;
  diagnosisType: DiagnosisType;
  paymentStatus?: string | null;
  memberPageUrl?: string | null;
}) {
  if (paymentStatus === 'paid' && memberPageUrl) {
    return (
      <a href={memberPageUrl} className="mt-8 inline-block rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-500">
        会員ページを開く
      </a>
    );
  }

  if (!leadId) {
    return (
      <Link href="/diagnosis" className="mt-8 inline-block rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-500">
        個別相談に進む（仮）
      </Link>
    );
  }

  return (
    <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-5">
      <h2 className="font-semibold">個別相談・会員ページへ進む</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Stripe決済が完了すると、会員ページURLを自動で表示し、顧客情報にも保存します。
      </p>
      <form action="/api/stripe/checkout" method="post">
        <input type="hidden" name="lead_id" value={leadId} />
        <input type="hidden" name="diagnosis_type" value={diagnosisType} />
        <button className="mt-4 rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-500">
          Stripeで決済して会員ページを受け取る
        </button>
      </form>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-6">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-slate-700">{body}</p>
    </div>
  );
}
