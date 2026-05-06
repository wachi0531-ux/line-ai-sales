import { NextRequest, NextResponse } from 'next/server';
import { createStripeCheckoutSession } from '@/lib/stripe';
import { getSupabaseServer } from '@/lib/supabase-server';

function resultRedirect(origin: string, leadId: string, diagnosisType: string, message: string) {
  const url = new URL('/diagnosis/result', origin);
  url.searchParams.set('id', leadId);
  url.searchParams.set('type', diagnosisType);
  url.searchParams.set('payment_error', message);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const leadId = String(formData.get('lead_id') || '');
  const diagnosisType = String(formData.get('diagnosis_type') || 'C');
  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  if (!leadId) {
    return resultRedirect(origin, leadId, diagnosisType, '診断IDが見つかりませんでした。');
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return resultRedirect(origin, leadId, diagnosisType, 'Supabaseの環境変数が未設定です。');
  }

  const { data: lead, error } = await supabase
    .from('diagnosis_leads')
    .select('name, email, diagnosis_type')
    .eq('id', leadId)
    .single();

  if (error || !lead) {
    return resultRedirect(origin, leadId, diagnosisType, '診断データが見つかりませんでした。');
  }

  try {
    const session = await createStripeCheckoutSession({
      leadId,
      diagnosisType: lead.diagnosis_type || diagnosisType,
      customerEmail: lead.email,
      customerName: lead.name,
      successUrl: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/diagnosis/result?id=${leadId}&type=${lead.diagnosis_type || diagnosisType}&payment=cancelled`
    });

    await supabase
      .from('diagnosis_leads')
      .update({
        stripe_checkout_session_id: session.id,
        payment_status: session.payment_status || 'checkout_created'
      })
      .eq('id', leadId);

    if (!session.url) {
      return resultRedirect(origin, leadId, lead.diagnosis_type || diagnosisType, 'Stripe決済URLを作成できませんでした。');
    }

    return NextResponse.redirect(session.url, { status: 303 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stripe決済の開始に失敗しました。';
    return resultRedirect(origin, leadId, lead.diagnosis_type || diagnosisType, message);
  }
}
