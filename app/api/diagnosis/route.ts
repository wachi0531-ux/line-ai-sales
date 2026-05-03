import { NextRequest, NextResponse } from 'next/server';
import { diagnosisSchema, getDiagnosisType } from '@/lib/diagnosis';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = diagnosisSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const diagnosisType = getDiagnosisType(parsed.data);
  const { data, error } = await supabaseServer
    .from('diagnosis_leads')
    .insert({ ...parsed.data, diagnosis_type: diagnosisType })
    .select('id, diagnosis_type')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
