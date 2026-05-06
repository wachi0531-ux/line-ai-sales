import Link from 'next/link';
import { getMemberPageUrl, retrieveStripeCheckoutSession } from '@/lib/stripe';
import { getSupabaseServer } from '@/lib/supabase-server';

type PaymentView = {
  status: 'paid' | 'pending' | 'error';
  title: string;
  message: string;
  memberPageUrl?: string;
};

export default async function PaymentSuccessPage({ searchParams }: { searchParams: { session_id?: string } }) {
  const view = await resolvePaymentView(searchParams.session_id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="rounded-xl border border-slate-200 p-8 shadow-sm">
        <p className="text-sm font-semibold text-brand-600">Stripe決済</p>
        <h1 className="mt-2 text-2xl font-bold">{view.title}</h1>
        <p className="mt-4 leading-7 text-slate-700">{view.message}</p>

        {view.memberPageUrl && (
          <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-5">
            <h2 className="font-semibold text-slate-900">会員ページURL</h2>
            <p className="mt-2 break-all text-brand-600">{view.memberPageUrl}</p>
            <a
              href={view.memberPageUrl}
              className="mt-4 inline-block rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-500"
            >
              会員ページを開く
            </a>
          </div>
        )}

        <Link href="/" className="mt-8 inline-block text-sm font-semibold text-brand-600 hover:underline">
          トップページへ戻る
        </Link>
      </div>
    </main>
  );
}

async function resolvePaymentView(sessionId?: string): Promise<PaymentView> {
  if (!sessionId) {
    return {
      status: 'error',
      title: '決済情報を確認できませんでした',
      message: 'StripeのセッションIDが見つかりません。もう一度診断結果ページから決済を開始してください。'
    };
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return {
      status: 'error',
      title: '保存設定が未完了です',
      message: 'Supabaseの環境変数が未設定のため、決済完了情報を保存できませんでした。'
    };
  }

  try {
    const session = await retrieveStripeCheckoutSession(sessionId);
    const leadId = session.metadata?.diagnosis_lead_id;

    if (!leadId) {
      return {
        status: 'error',
        title: '診断データと紐づけできませんでした',
        message: 'Stripeセッションに診断IDが含まれていません。管理者へお問い合わせください。'
      };
    }

    if (session.payment_status !== 'paid') {
      await supabase
        .from('diagnosis_leads')
        .update({
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent || null,
          payment_status: session.payment_status || session.status || 'pending'
        })
        .eq('id', leadId);

      return {
        status: 'pending',
        title: '決済確認中です',
        message: '決済がまだ完了していません。完了後にこのページを再読み込みすると、会員ページURLが表示されます。'
      };
    }

    const memberPageUrl = getMemberPageUrl();
    if (!memberPageUrl) {
      await supabase
        .from('diagnosis_leads')
        .update({
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent || null,
          payment_status: 'paid',
          payment_completed_at: new Date().toISOString()
        })
        .eq('id', leadId);

      return {
        status: 'error',
        title: '決済は完了しました',
        message: 'MEMBER_PAGE_URL が未設定のため、会員ページURLを表示・保存できませんでした。環境変数を設定してください。'
      };
    }

    await supabase
      .from('diagnosis_leads')
      .update({
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent || null,
        payment_status: 'paid',
        payment_completed_at: new Date().toISOString(),
        member_page_url: memberPageUrl
      })
      .eq('id', leadId);

    return {
      status: 'paid',
      title: '決済が完了しました',
      message: 'ありがとうございます。以下の会員ページURLを保存しました。ブックマークしてご利用ください。',
      memberPageUrl
    };
  } catch (error) {
    return {
      status: 'error',
      title: '決済確認に失敗しました',
      message: error instanceof Error ? error.message : 'Stripe決済情報の確認中に不明なエラーが発生しました。'
    };
  }
}
