import { NextRequest, NextResponse } from 'next/server';
import { diagnosisSchema, getDiagnosisType } from '@/lib/diagnosis';
import { sendLineDiagnosisResult } from '@/lib/line';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase environment variables are missing.' }, { status: 500 });
  }

  const json = await req.json();
  const parsed = diagnosisSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const diagnosisType = getDiagnosisType(parsed.data);
  const { data, error } = await supabase
    .from('diagnosis_leads')
    .insert({ ...parsed.data, line_user_id: parsed.data.line_user_id || null, diagnosis_type: diagnosisType })
    .select('id, diagnosis_type')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const lineDelivery = await sendLineDiagnosisResult(parsed.data, diagnosisType);
  await supabase
    .from('diagnosis_leads')
    .update({
      line_message_status: lineDelivery.status,
      line_message_error: lineDelivery.message || null,
      line_message_sent_at: lineDelivery.status === 'sent' ? new Date().toISOString() : null
    })
    .eq('id', data.id);

  return NextResponse.json({ ...data, line_delivery_status: lineDelivery.status });
}
